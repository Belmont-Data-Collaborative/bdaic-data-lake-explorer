import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import YAML from "yaml";
import type { Dataset, InsertDataset, DatasetMetadata } from "@shared/schema";

export class AwsS3Service {
  private s3Client: S3Client;

  constructor(region: string = "us-west-2") {
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }

  async testConnection(bucketName: string): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error("S3 connection test failed:", error);
      return false;
    }
  }

  async listDatasets(bucketName: string): Promise<InsertDataset[]> {
    try {
      const prefix = ""; // Only look at root level
      const datasets = await this.getDatasetFromPrefix(bucketName, prefix);

      // Return all datasets, not just CSV files
      return datasets;
    } catch (error) {
      console.error("Error listing datasets:", error);
      return [];
    }
  }

  private async getDatasetFromPrefix(
    bucketName: string,
    prefix: string,
  ): Promise<InsertDataset[]> {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: 1000,
    });

    const response = await this.s3Client.send(command);
    const datasets: InsertDataset[] = [];

    if (response.Contents) {
      // Group files by common patterns to create logical datasets
      const fileGroups = this.groupFilesByDataset(response.Contents, prefix);

      for (const [datasetName, files] of Array.from(fileGroups.entries())) {
        // Determine the primary format - prioritize CSV if it exists with YAML metadata
        const csvFile = files.find(
          (file: any) =>
            this.getFileFormat(file.Key || "").toLowerCase() === "csv",
        );
        const yamlFile = files.find((file: any) => {
          const ext = file.Key?.split(".").pop()?.toLowerCase();
          return ext === "yaml" || ext === "yml";
        });

        // Skip datasets that are purely YAML files (no CSV or other data files)
        const hasDataFiles = files.some((file: any) => {
          const ext = file.Key?.split(".").pop()?.toLowerCase();
          return ext !== "yaml" && ext !== "yml";
        });
        
        if (!hasDataFiles) {
          console.log(`Skipping YAML-only dataset: ${datasetName}`);
          continue;
        }

        // For size calculation, exclude YAML metadata files if CSV is present
        const dataFiles =
          csvFile && yamlFile
            ? files.filter((file: any) => {
                const ext = file.Key?.split(".").pop()?.toLowerCase();
                return ext !== "yaml" && ext !== "yml";
              })
            : files;

        const totalSize = dataFiles.reduce(
          (sum: number, file: any) => sum + (file.Size || 0),
          0,
        );
        const latestFile = files.reduce((latest: any, file: any) =>
          !latest.LastModified ||
          (file.LastModified && file.LastModified > latest.LastModified)
            ? file
            : latest,
        );

        const primaryFormat = csvFile
          ? "CSV"
          : this.getFileFormat(files[0].Key || "");

        // Extract source and top-level folder from file paths
        const firstFileKey = files[0]?.Key || "";
        const pathParts = firstFileKey.split("/");
        const source =
          pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
        const topLevelFolder = pathParts.length > 1 ? pathParts[0] : null;

        const dataset: InsertDataset = {
          name: datasetName,
          source,
          topLevelFolder,
          format: primaryFormat,
          size: this.formatFileSize(totalSize),
          sizeBytes: totalSize,
          lastModified: latestFile.LastModified || new Date(),
          createdDate:
            files.reduce((earliest: any, file: any) =>
              !earliest.LastModified ||
              (file.LastModified && file.LastModified < earliest.LastModified)
                ? file
                : earliest,
            ).LastModified || new Date(),
          status: "active",
          metadata: await this.extractEnhancedMetadata(
            bucketName,
            files,
            datasetName,
          ),
          insights: null,
        };

        datasets.push(dataset);
      }
    }

    return datasets;
  }

  private async createDatasetFromObject(
    bucketName: string,
    key: string,
    obj: any,
  ): Promise<InsertDataset | null> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const headResponse = await this.s3Client.send(headCommand);
      const size = obj.Size || headResponse.ContentLength || 0;

      const source = key.includes("/")
        ? key.substring(0, key.lastIndexOf("/"))
        : "root";
      const topLevelFolder = source !== "root" ? source.split("/")[0] : null;

      return {
        name: this.extractDatasetName(key),
        source,
        topLevelFolder,
        format: this.getFileFormat(key),
        size: this.formatFileSize(size),
        sizeBytes: size,
        lastModified:
          obj.LastModified || headResponse.LastModified || new Date(),
        createdDate:
          obj.LastModified || headResponse.LastModified || new Date(),
        status: "active",
        metadata: await this.extractEnhancedMetadata(
          bucketName,
          [obj],
          this.extractDatasetName(key),
        ),
        insights: null,
      };
    } catch (error) {
      console.error(`Error getting object details for ${key}:`, error);
      return null;
    }
  }

  private groupFilesByDataset(
    files: any[],
    prefix: string,
  ): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const file of files) {
      if (!file.Key || file.Key.endsWith("/")) continue;

      const fileName = file.Key.replace(prefix, "");
      const extension = fileName.split(".").pop()?.toLowerCase();

      // For YAML metadata files, group them with their corresponding CSV file
      if (extension === "yaml" || extension === "yml") {
        // Find the base name without extension to match with CSV
        const baseName = fileName.replace(/\.(yaml|yml)$/, "");
        const csvKey = files.find((f) => {
          const csvFileName = f.Key?.replace(prefix, "");
          return csvFileName === `${baseName}.csv`;
        });

        if (csvKey) {
          // Group with the CSV file using CSV's dataset name
          const datasetName = this.extractDatasetName(
            csvKey.Key.replace(prefix, ""),
            prefix,
          );
          if (!groups.has(datasetName)) {
            groups.set(datasetName, []);
          }
          groups.get(datasetName)!.push(file);
        } else {
          // If no matching CSV, skip standalone YAML files
          console.log(`Skipping standalone YAML file: ${fileName}`);
          continue;
        }
      } else {
        // For non-YAML files, use existing logic
        const datasetName = this.extractDatasetName(fileName, prefix);
        if (!groups.has(datasetName)) {
          groups.set(datasetName, []);
        }
        groups.get(datasetName)!.push(file);
      }
    }

    return groups;
  }

  // New method to fetch CSV sample data for chart generation
  async getSampleData(bucketName: string, datasetSource: string, maxRows: number = 5): Promise<any[] | null> {
    try {
      // Find CSV file in the dataset source
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: datasetSource,
        MaxKeys: 10,
      });

      const listResponse = await this.s3Client.send(listCommand);
      
      if (!listResponse.Contents) {
        return null;
      }

      // Find the CSV file
      const csvFile = listResponse.Contents.find(obj => 
        obj.Key && obj.Key.toLowerCase().endsWith('.csv')
      );

      if (!csvFile || !csvFile.Key) {
        return null;
      }

      // For larger row requests, download more data
      const bytesToRead = maxRows > 1000 ? 10 * 1024 * 1024 : 32768; // 10MB for large requests, 32KB for small
      
      // Download first part of the CSV file
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: csvFile.Key,
        Range: `bytes=0-${bytesToRead}`,
      });

      const response = await this.s3Client.send(getCommand);
      
      if (!response.Body) {
        return null;
      }

      // Convert stream to string
      const csvContent = await this.streamToString(response.Body);
      
      // Parse CSV content
      return this.parseCSVSample(csvContent, maxRows);
      
    } catch (error) {
      console.error("Error fetching sample data:", error);
      return null;
    }
  }

  // Enhanced method for progressive data scanning
  async getSampleDataWithProgression(
    bucketName: string, 
    datasetSource: string, 
    searchCriteria: any,
    requestedMaxMatches: number = 5000
  ): Promise<any[] | null> {
    try {
      // Find CSV file
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: datasetSource,
        MaxKeys: 10,
      });

      const listResponse = await this.s3Client.send(listCommand);
      
      if (!listResponse.Contents) {
        return null;
      }

      const csvFile = listResponse.Contents.find(obj => 
        obj.Key && obj.Key.toLowerCase().endsWith('.csv')
      );

      if (!csvFile || !csvFile.Key) {
        return null;
      }

      // Get file size
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: csvFile.Key,
      });
      
      const headResponse = await this.s3Client.send(headCommand);
      const fileSize = headResponse.ContentLength || 0;
      
      console.log(`Comprehensive scan of entire file ${csvFile.Key} (${this.formatFileSize(fileSize)}) - scanning ALL chunks to collect ALL matching rows`);
      
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let allMatches: any[] = [];
      let headers: string[] = [];
      let currentOffset = 0;
      
      // Comprehensive scan through entire document to collect ALL matching rows
      const maxChunksForFullScan = Math.ceil(fileSize / chunkSize); // Scan entire file
      
      for (let chunk = 0; chunk < maxChunksForFullScan; chunk++) {
        const endByte = Math.min(currentOffset + chunkSize - 1, fileSize - 1);
        
        console.log(`Scanning chunk ${chunk + 1}/${maxChunksForFullScan}: bytes ${currentOffset}-${endByte} (found ${allMatches.length} matches so far)`);
        
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: csvFile.Key,
          Range: `bytes=${currentOffset}-${endByte}`,
        });

        const response = await this.s3Client.send(getCommand);
        
        if (!response.Body) {
          continue;
        }

        const chunkContent = await this.streamToString(response.Body);
        
        // Parse this chunk - no limit on rows per chunk, collect all matches
        const { rows, lastHeaders } = this.parseCSVChunk(
          chunkContent, 
          headers.length > 0 ? headers : undefined,
          searchCriteria,
          Number.MAX_SAFE_INTEGER // Allow unlimited matches per chunk
        );
        
        if (lastHeaders.length > 0) {
          headers = lastHeaders;
        }
        
        allMatches.push(...rows);
        
        // Update offset for next chunk
        currentOffset = endByte + 1;
        
        // Safety check to prevent excessive memory usage
        if (allMatches.length > 50000) {
          console.log(`Reached safety limit of 50,000 matches after scanning ${chunk + 1} chunks. Stopping to prevent memory issues.`);
          break;
        }
        
        // Log progress for large scans
        if (chunk % 10 === 0 && chunk > 0) {
          console.log(`Progress update: scanned ${chunk} chunks, found ${allMatches.length} matching rows`);
        }
      }
      
      console.log(`Comprehensive scan complete. Found ${allMatches.length} total matching rows from entire ${this.formatFileSize(fileSize)} file`);
      
      // Return all matches found (may exceed requested max for comprehensive analysis)
      return allMatches;
      
    } catch (error) {
      console.error("Error in progressive data scan:", error);
      return null;
    }
  }

  private parseCSVChunk(
    chunkContent: string, 
    existingHeaders?: string[],
    searchCriteria?: any,
    maxRows: number = Number.MAX_SAFE_INTEGER
  ): { rows: any[], lastHeaders: string[] } {
    const lines = chunkContent.split('\n');
    let headers = existingHeaders || [];
    const rows: any[] = [];
    let startLine = 0;
    
    // If we don't have headers yet, parse them from first line
    if (!existingHeaders && lines.length > 0) {
      headers = this.parseCSVLine(lines[0]);
      startLine = 1;
    }
    
    // Parse data rows
    for (let i = startLine; i < lines.length && rows.length < maxRows; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length !== headers.length) continue; // Skip malformed rows
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // If search criteria provided, check if row matches
      if (searchCriteria && Object.keys(searchCriteria).length > 0) {
        let allCriteriaMatch = true;
        
        // Check each search criteria against actual column names in the row
        for (const [searchKey, searchValue] of Object.entries(searchCriteria)) {
          if (!searchValue) continue;
          
          let criterionMatches = false;
          
          // Check if any column in the row matches this search criterion
          for (const [columnName, columnValue] of Object.entries(row)) {
            // Case-insensitive column name partial match
            const colNameLower = columnName.toLowerCase();
            const searchKeyLower = searchKey.toLowerCase();
            
            // Match if column name contains search key or vice versa
            if (colNameLower.includes(searchKeyLower) || searchKeyLower.includes(colNameLower)) {
              // Check if the value matches (case-insensitive partial match)
              const valueLower = String(columnValue).toLowerCase();
              const searchValueLower = String(searchValue).toLowerCase();
              
              if (valueLower.includes(searchValueLower)) {
                criterionMatches = true;
                break;
              }
            }
          }
          
          // All criteria must match
          if (!criterionMatches) {
            allCriteriaMatch = false;
            break;
          }
        }
        
        if (allCriteriaMatch) {
          rows.push(row);
        }
      } else {
        rows.push(row);
      }
    }
    
    return { rows, lastHeaders: headers };
  }

  private async streamToString(stream: any): Promise<string> {
    const chunks: Uint8Array[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  }

  private parseCSVSample(csvContent: string, maxRows: number): any[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return [];
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]);
    const rows: any[] = [];

    // Parse data rows (skip header, limit to maxRows)
    for (let i = 1; i <= Math.min(maxRows, lines.length - 1); i++) {
      if (lines[i] && lines[i].trim()) {
        const values = this.parseCSVLine(lines[i]);
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        rows.push(row);
      }
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private extractDatasetName(key: string, prefix?: string): string {
    const baseName = key.split("/").pop() || key;
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, "");

    // Remove common suffixes that indicate processing or variations
    return nameWithoutExt
      .replace(/_processed$/, "")
      .replace(/_clean$/, "")
      .replace(/_final$/, "")
      .replace(/_v\d+$/, "");
  }

  private getFileFormat(key: string): string {
    const extension = key.split(".").pop()?.toLowerCase() || "";

    const formatMap: { [key: string]: string } = {
      csv: "CSV",
      json: "JSON",
      parquet: "Parquet",
      avro: "Avro",
      orc: "ORC",
      xlsx: "Excel",
      txt: "Text",
      tsv: "TSV",
    };

    return formatMap[extension] || extension.toUpperCase();
  }

  private getCompressionType(key: string): string {
    if (key.includes(".gz")) return "gzip";
    if (key.includes(".bz2")) return "bzip2";
    if (key.includes(".zip")) return "zip";
    return "none";
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  private calculateCompletenessScore(metadata: DatasetMetadata): number {
    // Define the metadata fields we care about for completeness with weights
    const importantFields = [
      { field: "title", weight: 1 },
      { field: "description", weight: 2 }, // Higher weight for description
      { field: "recordCount", weight: 1 },
      { field: "columns", weight: 2 }, // Higher weight for schema information
      { field: "dataSource", weight: 1 },
      { field: "tags", weight: 1 },
      { field: "encoding", weight: 0.5 },
      { field: "delimiter", weight: 0.5 },
      { field: "license", weight: 1 },
      { field: "version", weight: 0.5 },
      { field: "columnCount", weight: 1 },
      { field: "createdDate", weight: 0.5 },
      { field: "lastUpdated", weight: 0.5 },
      { field: "schemaVersion", weight: 0.5 },
      { field: "hasHeader", weight: 0.5 },
      { field: "intendedUseCase", weight: 1.5 }, // Higher weight for usage information
      { field: "targetAudiences", weight: 1 },
    ];

    let filledWeight = 0;
    let totalWeight = 0;

    importantFields.forEach(({ field, weight }) => {
      totalWeight += weight;
      const value = metadata[field as keyof DatasetMetadata];

      let isFieldFilled = false;

      if (field === "columns" && Array.isArray(value) && value.length > 0) {
        isFieldFilled = true;
      } else if (field === "tags" && Array.isArray(value) && value.length > 0) {
        isFieldFilled = true;
      } else if (
        field === "targetAudiences" &&
        Array.isArray(value) &&
        value.length > 0
      ) {
        isFieldFilled = true;
      } else if (
        field === "columnCount" &&
        typeof value === "number" &&
        value > 0
      ) {
        isFieldFilled = true;
      } else if (field === "hasHeader" && typeof value === "boolean") {
        isFieldFilled = true;
      } else if (
        typeof value === "string" &&
        value.trim().length > 0 &&
        value !== "Unknown" &&
        value !== "None"
      ) {
        isFieldFilled = true;
      }

      if (isFieldFilled) {
        filledWeight += weight;
      }
    });

    // Special bonus for YAML metadata presence
    if (metadata.yamlMetadata && typeof metadata.yamlMetadata === "object") {
      filledWeight += 1; // Bonus for having structured YAML metadata
      totalWeight += 1;
    }

    // Calculate percentage and round to nearest integer
    const score = Math.round((filledWeight / totalWeight) * 100);
    return Math.min(100, Math.max(0, score)); // Ensure score is between 0-100
  }

  private estimateRecordCount(sizeBytes: number, format: string): string {
    // Rough estimates based on typical file formats
    const estimatesPerMB: { [key: string]: number } = {
      CSV: 20000,
      JSON: 8000,
      Parquet: 50000,
      Avro: 40000,
    };

    const recordsPerMB = estimatesPerMB[format] || 15000;
    const sizeMB = sizeBytes / (1024 * 1024);
    const estimatedRecords = Math.round(sizeMB * recordsPerMB);

    if (estimatedRecords < 1000) {
      return estimatedRecords.toString();
    } else if (estimatedRecords < 1000000) {
      return (estimatedRecords / 1000).toFixed(1) + "K";
    } else {
      return (estimatedRecords / 1000000).toFixed(1) + "M";
    }
  }

  // Stream sample download directly (avoids Range signing issues with pre-signed URLs)
  async streamSampleDownload(
    bucketName: string,
    source: string,
    datasetName: string,
  ): Promise<{ stream: any; fileName: string; sampleSize: number; totalSize: number; contentType: string } | null> {
    try {
      // Find the first data file (non-YAML) for this dataset
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: source ? `${source}/` : "",
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents) return null;

      // Find a data file that matches the dataset name
      const dataFile = response.Contents.find((file) => {
        if (!file.Key) return false;
        const fileName = file.Key.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const extension = fileName.split(".").pop()?.toLowerCase();

        return (
          baseName === datasetName &&
          extension !== "yaml" &&
          extension !== "yml"
        );
      });

      if (!dataFile?.Key || !dataFile.Size) return null;

      // Calculate 1% of the file size for sample download (much more reasonable)
      const onePercentSize = Math.floor(dataFile.Size * 0.01);
      
      // Ensure minimum viable sample size (at least 1KB for headers + few rows)
      const minSampleSize = 1024; // 1KB minimum
      const maxSampleSize = 10 * 1024 * 1024; // 10MB maximum to prevent huge samples
      
      const sampleSize = Math.max(minSampleSize, Math.min(onePercentSize, maxSampleSize));

      // Ensure end byte doesn't exceed file size (inclusive end index)
      const endByte = Math.min(sampleSize - 1, dataFile.Size - 1);

      console.log(`Streaming sample for ${datasetName}: ${dataFile.Key} (${dataFile.Size} bytes -> ${sampleSize} bytes ~${Math.round((sampleSize / dataFile.Size) * 100)}%) Range: bytes=0-${endByte}`);

      // Get object with Range header for partial download
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: dataFile.Key,
        Range: `bytes=0-${endByte}`, // Proper inclusive end index
      });

      const s3Response = await this.s3Client.send(getObjectCommand);

      if (!s3Response.Body) {
        console.error(`No body in S3 response for ${datasetName}`);
        return null;
      }

      const fileName = `${datasetName}-sample.csv`;

      return {
        stream: s3Response.Body,
        fileName,
        sampleSize,
        totalSize: dataFile.Size,
        contentType: 'text/csv'
      };
    } catch (error) {
      console.error(`Error streaming sample download for ${datasetName}:`, error);
      return null;
    }
  }

  // Generate a pre-signed URL for direct S3 download (bypasses server timeout)
  async generateFullDownloadPresignedUrl(
    bucketName: string,
    source: string,
    datasetName: string,
  ): Promise<{ url: string; fileName: string; size?: number } | null> {
    try {
      // Find the first data file (non-YAML) for this dataset
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: source ? `${source}/` : "",
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents) return null;

      // Find a data file that matches the dataset name
      const dataFile = response.Contents.find((file) => {
        if (!file.Key) return false;
        const fileName = file.Key.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const extension = fileName.split(".").pop()?.toLowerCase();

        return (
          baseName === datasetName &&
          extension !== "yaml" &&
          extension !== "yml"
        );
      });

      if (!dataFile?.Key) {
        console.error(`No data file found for dataset: ${datasetName}`);
        return null;
      }

      console.log(`Generating pre-signed URL for ${datasetName}: ${dataFile.Key} (${dataFile.Size || 'unknown'} bytes)`);

      // Generate pre-signed URL with 1 hour expiration
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: dataFile.Key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
        expiresIn: 3600, // 1 hour
      });

      const fileName = dataFile.Key.split("/").pop() || datasetName;

      return {
        url: presignedUrl,
        fileName,
        ...(dataFile.Size && { size: dataFile.Size })
      };
    } catch (error) {
      console.error(`Error generating pre-signed URL for ${datasetName}:`, error);
      return null;
    }
  }

  async generateSampleDownloadUrl(
    bucketName: string,
    source: string,
    datasetName: string,
  ): Promise<{ key: string; bucketName: string; sampleSize: number } | null> {
    try {
      // Find the first data file (non-YAML) for this dataset
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: source ? `${source}/` : "",
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents) return null;

      // Find a data file that matches the dataset name
      const dataFile = response.Contents.find((file) => {
        if (!file.Key) return false;
        const fileName = file.Key.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const extension = fileName.split(".").pop()?.toLowerCase();

        return (
          baseName === datasetName &&
          extension !== "yaml" &&
          extension !== "yml"
        );
      });

      if (!dataFile?.Key || !dataFile.Size) return null;

      // Calculate 1% of the file size for partial download (much more reasonable)
      const onePercentSize = Math.floor(dataFile.Size * 0.01);
      
      // Ensure minimum viable sample size (at least 1KB for headers + few rows)
      const minSampleSize = 1024; // 1KB minimum
      const maxSampleSize = 10 * 1024 * 1024; // 10MB maximum to prevent huge samples
      
      const sampleSize = Math.max(minSampleSize, Math.min(onePercentSize, maxSampleSize));

      console.log(
        `Generating sample download for ${datasetName}: ${dataFile.Size} bytes -> ${sampleSize} bytes (~${Math.round((sampleSize / dataFile.Size) * 100)}%)`,
      );

      return {
        key: dataFile.Key,
        bucketName,
        sampleSize,
      };
    } catch (error) {
      console.error(`Error generating download URL for ${datasetName}:`, error);
      return null;
    }
  }

  async downloadPartialFile(
    bucketName: string,
    key: string,
    sampleSize: number,
  ): Promise<Buffer | null> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        Range: `bytes=0-${sampleSize - 1}`, // Download only first 10% of the file
      });

      const response = await this.s3Client.send(getObjectCommand);

      if (!response.Body) return null;

      // Convert the stream to buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as any;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`Error downloading partial file ${key}:`, error);
      return null;
    }
  }

  async downloadFullFile(
    bucketName: string,
    source: string,
    datasetName: string,
  ): Promise<{ stream: any; key: string; size?: number } | null> {
    try {
      // Find the first data file (non-YAML) for this dataset
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: source ? `${source}/` : "",
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents) return null;

      // Find a data file that matches the dataset name
      const dataFile = response.Contents.find((file) => {
        if (!file.Key) return false;
        const fileName = file.Key.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const extension = fileName.split(".").pop()?.toLowerCase();

        return (
          baseName === datasetName &&
          extension !== "yaml" &&
          extension !== "yml"
        );
      });

      if (!dataFile?.Key) {
        console.error(`No data file found for dataset: ${datasetName}`);
        return null;
      }

      console.log(`Preparing full file stream for ${datasetName}: ${dataFile.Key}`);

      // Download the complete file
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: dataFile.Key,
      });

      const downloadResponse = await this.s3Client.send(getObjectCommand);

      if (!downloadResponse.Body) return null;

      console.log(`Successfully prepared full file stream: ${dataFile.Size || 'unknown'} bytes`);
      
      return {
        stream: downloadResponse.Body,
        key: dataFile.Key,
        ...(dataFile.Size && { size: dataFile.Size })
      };
    } catch (error) {
      console.error(`Error preparing full file stream for ${datasetName}:`, error);
      return null;
    }
  }

  async downloadMetadataFile(
    bucketName: string,
    source: string,
    datasetName: string,
  ): Promise<{ stream: any; key: string; size?: number } | null> {
    try {
      // Find the YAML metadata file for this dataset
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: source ? `${source}/` : "",
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      if (!response.Contents) return null;

      // Find the YAML metadata file that matches the dataset name
      // First try exact match, then try partial match
      let metadataFile = response.Contents.find((file) => {
        if (!file.Key) return false;
        const fileName = file.Key.split("/").pop() || "";
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const extension = fileName.split(".").pop()?.toLowerCase();

        return (
          baseName === datasetName &&
          (extension === "yaml" || extension === "yml")
        );
      });

      // If exact match not found, try to find any YAML file that contains the dataset name
      if (!metadataFile) {
        metadataFile = response.Contents.find((file) => {
          if (!file.Key) return false;
          const fileName = file.Key.split("/").pop() || "";
          const extension = fileName.split(".").pop()?.toLowerCase();

          return (
            (extension === "yaml" || extension === "yml") &&
            fileName.toLowerCase().includes(datasetName.toLowerCase())
          );
        });
      }

      // If still not found, try to find any YAML file in the same directory
      if (!metadataFile) {
        metadataFile = response.Contents.find((file) => {
          if (!file.Key) return false;
          const extension = file.Key.split(".").pop()?.toLowerCase();
          return extension === "yaml" || extension === "yml";
        });
      }

      console.log(`Available files in ${source}:`, response.Contents?.map(f => f.Key) || []);
      console.log(`Looking for metadata file for dataset: ${datasetName}`);
      console.log(`Found metadata file:`, metadataFile?.Key || "None");

      if (!metadataFile?.Key) {
        console.error(`No metadata file found for dataset: ${datasetName}`);
        return null;
      }

      console.log(`Preparing metadata file stream for ${datasetName}: ${metadataFile.Key}`);

      // Download the metadata file
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: metadataFile.Key,
      });

      const downloadResponse = await this.s3Client.send(getObjectCommand);

      if (!downloadResponse.Body) return null;

      console.log(`Successfully prepared metadata file stream: ${metadataFile.Size || 'unknown'} bytes`);
      
      return {
        stream: downloadResponse.Body,
        key: metadataFile.Key,
        size: metadataFile.Size || undefined
      };
    } catch (error) {
      console.error(`Error preparing metadata file stream for ${datasetName}:`, error);
      return null;
    }
  }

  private async extractEnhancedMetadata(
    bucketName: string,
    files: any[],
    datasetName: string,
  ): Promise<DatasetMetadata> {
    // Calculate total file size (excluding YAML files for data size)
    const dataFiles = files.filter((file: any) => {
      const ext = file.Key?.split(".").pop()?.toLowerCase();
      return ext !== "yaml" && ext !== "yml";
    });
    const totalSizeBytes = dataFiles.reduce(
      (sum: number, file: any) => sum + (file.Size || 0),
      0,
    );

    const baseMetadata: DatasetMetadata = {
      columnCount: 0,
      tags: [],
      dataSource: "",
      recordCount: "",
      license: "",
      description: "",
      compression: this.getCompressionType(files[0]?.Key || ""),
      createdDate: "",
      lastUpdated: "",
      version: "",
      title: datasetName,
      columns: [],
      completenessScore: 0,
      fileSizeBytes: totalSizeBytes,
    };

    // Check for YAML metadata file first
    const yamlFile = files.find((file: any) => {
      const ext = file.Key?.split(".").pop()?.toLowerCase();
      return ext === "yaml" || ext === "yml";
    });

    let finalMetadata = baseMetadata;

    // If YAML exists, use it as the primary metadata source
    if (yamlFile) {
      try {
        const yamlMetadata =
          (await this.parseYamlMetadata(bucketName, yamlFile.Key)) || {};
        finalMetadata = { ...baseMetadata, ...yamlMetadata };
      } catch (error: any) {
        console.log(
          "Could not parse YAML metadata, falling back to CSV analysis:",
          error,
        );
      }
    }

    // Analyze CSV file as fallback if:
    // 1. No YAML file exists, OR
    // 2. YAML has no columns, OR  
    // 3. YAML has missing critical fields (recordCount, columnCount)
    const needsCsvAnalysis = !yamlFile || 
                            !finalMetadata.columns?.length ||
                            !finalMetadata.recordCount || 
                            finalMetadata.recordCount === "" ||
                            finalMetadata.columnCount === 0;
                            
    if (needsCsvAnalysis) {
      const csvFile = files.find(
        (file: any) =>
          this.getFileFormat(file.Key || "").toLowerCase() === "csv",
      );
      if (csvFile) {
        try {
          console.log(`Using CSV analysis fallback for missing fields. Current recordCount: "${finalMetadata.recordCount}", columnCount: ${finalMetadata.columnCount}`);
          const csvMetadata = await this.analyzeCsvFile(
            bucketName,
            csvFile.Key,
          );
          
          // Merge intelligently - prefer CSV values for missing/empty fields
          Object.keys(csvMetadata).forEach(key => {
            const csvValue = csvMetadata[key as keyof DatasetMetadata];
            const currentValue = finalMetadata[key as keyof DatasetMetadata];
            
            // Use CSV value if current value is missing, empty, or zero
            if (csvValue !== undefined && (
                currentValue === undefined || 
                currentValue === "" || 
                currentValue === 0 ||
                (Array.isArray(currentValue) && currentValue.length === 0)
              )) {
              (finalMetadata as any)[key] = csvValue;
            }
          });
          
          console.log(`After CSV analysis - recordCount: "${finalMetadata.recordCount}", columnCount: ${finalMetadata.columnCount}`);
        } catch (error: any) {
          console.log("Could not analyze CSV file:", error);
        }
      }
    }

    // Use YAML completeness score if available, otherwise calculate it
    if (
      finalMetadata.completenessScore === undefined ||
      finalMetadata.completenessScore === 0
    ) {
      finalMetadata.completenessScore =
        this.calculateCompletenessScore(finalMetadata);
    }

    return finalMetadata;
  }

  private async parseYamlMetadata(
    bucketName: string,
    fileKey: string,
  ): Promise<Partial<DatasetMetadata> | null> {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(getObjectCommand);
      const stream = response.Body;

      if (!stream) return null;

      // Convert stream to string
      let yamlContent = "";
      const reader = stream as NodeJS.ReadableStream;

      for await (const chunk of reader) {
        yamlContent += chunk.toString();
      }

      // Parse YAML content
      const parsedYaml = YAML.parse(yamlContent);

      if (!parsedYaml || typeof parsedYaml !== "object") {
        return null;
      }

      // Direct YAML metadata extraction based on specific structure
      const metadata: Partial<DatasetMetadata> = {
        yamlMetadata: parsedYaml, // Store full YAML content for reference
      };

      // Helper function to safely get nested values
      const getNestedValue = (obj: any, path: string): any => {
        return path
          .split(".")
          .reduce((current, key) => current && current[key], obj);
      };

      // Extract completeness score directly from data_quality section
      if (parsedYaml.data_quality?.completeness_score !== undefined) {
        // Convert to percentage if it's a decimal (0.905 -> 90.5%)
        const score = parsedYaml.data_quality.completeness_score;
        metadata.completenessScore =
          typeof score === "number" && score <= 1
            ? Math.round(score * 100)
            : Math.round(Number(score));
      }

      // Extract tags from custom.tags section
      if (parsedYaml.custom?.tags && Array.isArray(parsedYaml.custom.tags)) {
        metadata.tags = parsedYaml.custom.tags.map((tag: any) => String(tag));
      }

      // Extract record count from technical.row_count (overriding any previous value)
      if (parsedYaml.technical?.row_count !== undefined) {
        metadata.recordCount = String(parsedYaml.technical.row_count);
      }

      // Extract data source from source_organization (top level)
      if (parsedYaml.source_organization) {
        metadata.dataSource = String(parsedYaml.source_organization);
      }

      // Extract intended use case from usage.intended_use_case or usage.intended_use_cases
      if (parsedYaml.usage?.intended_use_case) {
        metadata.intendedUseCase = String(parsedYaml.usage.intended_use_case);
      } else if (
        parsedYaml.usage?.intended_use_cases &&
        Array.isArray(parsedYaml.usage.intended_use_cases)
      ) {
        // Join multiple use cases with semicolons
        metadata.intendedUseCase = parsedYaml.usage.intended_use_cases
          .map((useCase: any) => String(useCase))
          .join("; ");
      }

      // Extract target audiences from usage.target_audiences
      if (
        parsedYaml.usage?.target_audiences &&
        Array.isArray(parsedYaml.usage.target_audiences)
      ) {
        metadata.targetAudiences = parsedYaml.usage.target_audiences.map(
          (audience: any) => String(audience),
        );
      }

      // Extract basic metadata fields
      if (parsedYaml.title || parsedYaml.name) {
        metadata.title = String(parsedYaml.title || parsedYaml.name);
      }

      if (parsedYaml.description) {
        metadata.description = String(parsedYaml.description);
      }

      if (parsedYaml.license) {
        metadata.license = String(parsedYaml.license);
      }

      if (parsedYaml.version) {
        metadata.version = String(parsedYaml.version);
      }

      // Extract data source information
      if (parsedYaml.source || parsedYaml.data_source) {
        metadata.dataSource = String(
          parsedYaml.source || parsedYaml.data_source,
        );
      }

      // Extract record count from various possible locations
      if (parsedYaml.record_count !== undefined) {
        metadata.recordCount = String(parsedYaml.record_count);
      } else if (parsedYaml.rows !== undefined) {
        metadata.recordCount = String(parsedYaml.rows);
      } else if (parsedYaml.data_quality?.record_count !== undefined) {
        metadata.recordCount = String(parsedYaml.data_quality.record_count);
      }

      // Extract encoding information
      if (parsedYaml.encoding) {
        metadata.encoding = String(parsedYaml.encoding);
      } else if (parsedYaml.file_info?.encoding) {
        metadata.encoding = String(parsedYaml.file_info.encoding);
      }

      // Extract delimiter information
      if (parsedYaml.delimiter) {
        metadata.delimiter = String(parsedYaml.delimiter);
      } else if (parsedYaml.file_info?.delimiter) {
        metadata.delimiter = String(parsedYaml.file_info.delimiter);
      }

      // Extract compression information
      if (parsedYaml.compression) {
        metadata.compression = String(parsedYaml.compression);
      } else if (parsedYaml.file_info?.compression) {
        metadata.compression = String(parsedYaml.file_info.compression);
      }

      // Extract date information
      if (parsedYaml.created_date || parsedYaml.date_created) {
        metadata.createdDate = String(
          parsedYaml.created_date || parsedYaml.date_created,
        );
      }

      if (parsedYaml.last_updated || parsedYaml.updated_date) {
        metadata.lastUpdated = String(
          parsedYaml.last_updated || parsedYaml.updated_date,
        );
      }

      // Extract variables/column information from variables section
      if (parsedYaml.variables && Array.isArray(parsedYaml.variables)) {
        metadata.columns = parsedYaml.variables.map((variable: any) => {
          // Handle case where variable might be an object or a string
          if (typeof variable === "object" && variable !== null) {
            return {
              name: String(
                variable.variable_name || variable.name || "Unknown",
              ),
              type: String(variable.data_type || variable.type || "string"), // Extract data_type from YAML
              description: variable.description
                ? String(variable.description)
                : undefined,
              sampleValues:
                variable.sample_values || variable.examples
                  ? Array.isArray(variable.sample_values || variable.examples)
                    ? (variable.sample_values || variable.examples).map(
                        (v: any) => String(v),
                      )
                    : [String(variable.sample_values || variable.examples)]
                  : undefined,
            };
          } else {
            // If it's just a string, use it as the name
            return {
              name: String(variable),
              type: "string",
              description: undefined,
              sampleValues: undefined,
            };
          }
        });
        metadata.columnCount = metadata.columns?.length || 0;
      } else if (parsedYaml.schema && Array.isArray(parsedYaml.schema)) {
        metadata.columns = parsedYaml.schema.map((col: any) => {
          if (typeof col === "string") {
            return { name: col, type: "string" };
          } else if (typeof col === "object") {
            return {
              name: String(col.name || col.column_name || col.field),
              type: String(col.type || col.data_type || "string"),
              description: col.description
                ? String(col.description)
                : undefined,
              sampleValues:
                col.sample_values || col.examples
                  ? Array.isArray(col.sample_values || col.examples)
                    ? (col.sample_values || col.examples).map((v: any) =>
                        String(v),
                      )
                    : [String(col.sample_values || col.examples)]
                  : undefined,
            };
          }
          return { name: String(col), type: "string" };
        });
        metadata.columnCount = metadata.columns?.length || 0;
      } else if (parsedYaml.columns && Array.isArray(parsedYaml.columns)) {
        metadata.columns = parsedYaml.columns.map((col: any) => ({
          name: String(col.name || col),
          type: String(col.type || "string"),
          description: col.description ? String(col.description) : undefined,
          sampleValues: col.sample_values
            ? Array.isArray(col.sample_values)
              ? col.sample_values.map((v: any) => String(v))
              : [String(col.sample_values)]
            : undefined,
        }));
        metadata.columnCount = metadata.columns?.length || 0;
      }

      // Extract column count directly if available
      if (parsedYaml.column_count !== undefined) {
        metadata.columnCount = Number(parsedYaml.column_count);
      } else if (parsedYaml.data_quality?.column_count !== undefined) {
        metadata.columnCount = Number(parsedYaml.data_quality.column_count);
      }

      // Extract header information
      if (parsedYaml.has_header !== undefined) {
        metadata.hasHeader = Boolean(parsedYaml.has_header);
      } else if (parsedYaml.file_info?.has_header !== undefined) {
        metadata.hasHeader = Boolean(parsedYaml.file_info.has_header);
      }

      // Extract schema version
      if (parsedYaml.schema_version) {
        metadata.schemaVersion = String(parsedYaml.schema_version);
      } else if (parsedYaml.version) {
        metadata.schemaVersion = String(parsedYaml.version);
      }

      console.log(`Successfully parsed YAML metadata from ${fileKey}:`, {
        fieldsExtracted: Object.keys(metadata).filter(
          (k) => k !== "yamlMetadata",
        ).length,
        hasColumns: !!metadata.columns,
        columnCount: metadata.columnCount || 0,
        hasDescription: !!metadata.description,
        hasTitle: !!metadata.title,
        hasTags: !!metadata.tags,
        hasCompletenessScore: metadata.completenessScore !== undefined,
        completenessScore: metadata.completenessScore,
        extractedFields: Object.keys(metadata).filter(
          (k) =>
            k !== "yamlMetadata" &&
            metadata[k as keyof DatasetMetadata] !== undefined,
        ),
      });

      return metadata;
    } catch (error) {
      console.error(`Error parsing YAML metadata from ${fileKey}:`, error);
      return null;
    }
  }

  private async analyzeCsvFile(
    bucketName: string,
    fileKey: string,
  ): Promise<Partial<DatasetMetadata>> {
    try {
      console.log(`Analyzing CSV file for comprehensive metadata: ${fileKey}`);
      
      // Get file size first for context
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      const headResponse = await this.s3Client.send(headCommand);
      const fileSize = headResponse.ContentLength || 0;
      
      console.log(`File size: ${this.formatFileSize(fileSize)} - performing comprehensive analysis`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(getObjectCommand);
      const stream = response.Body;

      if (!stream) return {};

      // For small files (< 10MB), analyze the full content
      // For larger files, use sampling approach for performance
      const shouldAnalyzeFullFile = fileSize < 10 * 1024 * 1024; // 10MB threshold
      
      let content = "";
      const reader = stream as NodeJS.ReadableStream;
      let bytesRead = 0;
      
      // Determine how much to read based on file size
      const maxBytes = shouldAnalyzeFullFile ? fileSize : (5 * 1024 * 1024); // Full file or 5MB sample
      
      for await (const chunk of reader) {
        content += chunk.toString();
        bytesRead += chunk.length;
        if (bytesRead >= maxBytes) break;
      }

      const lines = content.split("\n").filter((line) => line.trim());
      if (lines.length === 0) return {};

      const headerLine = lines[0];
      if (!headerLine) return {};
      
      const delimiter = this.detectDelimiter(headerLine);
      const headers = headerLine
        .split(delimiter)
        .map((h) => h.trim().replace(/"/g, ""))
        .filter((h) => h.length > 0);

      console.log(`Found ${headers.length} columns in CSV file`);

      // Analyze data rows for comprehensive statistics
      const dataLines = lines.slice(1); // Exclude header
      const totalDataRows = dataLines.length;
      
      // Calculate actual record count
      let actualRecordCount = totalDataRows;
      
      // For large files, estimate total record count based on sample
      if (!shouldAnalyzeFullFile && totalDataRows > 0) {
        const bytesPerRow = bytesRead / totalDataRows;
        const estimatedTotalRows = Math.floor(fileSize / bytesPerRow);
        actualRecordCount = estimatedTotalRows;
        console.log(`Estimated total records from ${totalDataRows} sample rows: ${actualRecordCount}`);
      } else {
        console.log(`Counted actual records: ${actualRecordCount}`);
      }

      // Parse data rows for completeness analysis
      const parsedRows = dataLines
        .slice(0, Math.min(1000, dataLines.length)) // Analyze up to 1000 rows for completeness
        .map((line) =>
          line.split(delimiter).map((cell) => cell.trim().replace(/"/g, ""))
        )
        .filter((row) => row.length === headers.length); // Only include properly formatted rows

      console.log(`Analyzing ${parsedRows.length} rows for completeness score calculation`);

      // Calculate completeness score (percentage of non-empty cells)
      let totalCells = 0;
      let filledCells = 0;

      parsedRows.forEach((row) => {
        row.forEach((cell) => {
          totalCells++;
          if (cell && cell.trim() !== "" && cell.toLowerCase() !== "null" && cell.toLowerCase() !== "na") {
            filledCells++;
          }
        });
      });

      const completenessScore = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
      console.log(`Completeness analysis: ${filledCells}/${totalCells} cells filled = ${completenessScore}%`);

      // Calculate community data points
      const communityDataPoints = Math.round(actualRecordCount * headers.length * (completenessScore / 100));
      console.log(`Community data points: ${actualRecordCount} records × ${headers.length} columns × ${completenessScore}% = ${communityDataPoints}`);

      // Analyze column types using more sample data
      const columnMetadata = headers.map((header, index) => {
        const values = parsedRows
          .map((row) => row[index])
          .filter((val) => val && val !== "" && val.toLowerCase() !== "null");
        
        return {
          name: header,
          dataType: this.inferColumnType(values),
          description: this.generateColumnDescription(header, values.slice(0, 10))
        };
      });

      const tags = this.extractTagsFromHeaders(headers);
      const dataSource = this.inferDataSource(fileKey, headers);

      const metadata: Partial<DatasetMetadata> = {
        recordCount: actualRecordCount.toString(),
        columnCount: headers.length,
        completenessScore: completenessScore,
        columns: columnMetadata,
        tags: tags.length > 0 ? tags : undefined,
        dataSource: dataSource || undefined,
        encoding: "UTF-8", // Assume UTF-8 for CSV files
        delimiter: delimiter,
        hasHeader: true,
        fileSizeBytes: fileSize,
        // Add community data points as a custom field
        ...({ communityDataPoints } as any)
      };

      console.log(`CSV analysis complete. Records: ${actualRecordCount}, Columns: ${headers.length}, Completeness: ${completenessScore}%, Community Points: ${communityDataPoints}`);

      return metadata;
    } catch (error) {
      console.error(`Error analyzing CSV file ${fileKey}:`, error);
      return {};
    }
  }

  private detectDelimiter(headerLine: string): string {
    const delimiters = [",", ";", "\t", "|"];
    const counts = delimiters.map((delim) => ({
      delimiter: delim,
      count: (headerLine.match(new RegExp(`\\${delim}`, "g")) || []).length,
    }));

    const mostCommon = counts.reduce((prev, current) =>
      current.count > prev.count ? current : prev,
    );

    return mostCommon.count > 0 ? mostCommon.delimiter : ",";
  }

  private generateColumnDescription(columnName: string, sampleValues: string[]): string {
    const name = columnName.toLowerCase();
    
    // Generate basic descriptions based on column names and sample data
    if (name.includes('id') || name.includes('fips')) {
      return 'Unique identifier';
    }
    if (name.includes('name') || name.includes('title')) {
      return 'Descriptive name or title';
    }
    if (name.includes('date') || name.includes('time')) {
      return 'Date or timestamp value';
    }
    if (name.includes('count') || name.includes('total') || name.includes('sum')) {
      return 'Numeric count or total';
    }
    if (name.includes('rate') || name.includes('percent') || name.includes('ratio')) {
      return 'Rate, percentage, or ratio value';
    }
    if (name.includes('state') || name.includes('county') || name.includes('city')) {
      return 'Geographic location identifier';
    }
    if (name.includes('population') || name.includes('pop')) {
      return 'Population count or demographic data';
    }
    
    // Analyze sample values for additional context
    if (sampleValues.length > 0) {
      const dataType = this.inferColumnType(sampleValues);
      const uniqueCount = new Set(sampleValues).size;
      
      if (dataType === 'integer' && uniqueCount < 20) {
        return `Categorical numeric value (${uniqueCount} categories)`;
      }
      if (dataType === 'string' && uniqueCount < 10) {
        return `Categorical text value (${uniqueCount} categories)`;
      }
    }
    
    return `Data field: ${columnName}`;
  }

  private inferColumnType(values: string[]): string {
    if (values.length === 0) return "string";

    let numericCount = 0;
    let integerCount = 0;
    let dateCount = 0;

    for (const value of values) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      
      // Check for integer
      if (/^\d+$/.test(trimmed)) {
        numericCount++;
        integerCount++;
      }
      // Check for float
      else if (/^-?\d*\.?\d+$/.test(trimmed)) {
        numericCount++;
      }
      // Check for date
      else if (!isNaN(Date.parse(trimmed)) && (trimmed.includes('-') || trimmed.includes('/') || trimmed.includes('T'))) {
        dateCount++;
      }
    }

    const total = values.length;
    if (numericCount / total > 0.8) {
      return integerCount === numericCount ? "integer" : "float";
    }
    if (dateCount / total > 0.8) return "date";
    return "string";
  }

  private extractTagsFromHeaders(headers: string[]): string[] {
    const tags: string[] = [];

    // Extract domain-specific tags from column names
    const patterns = {
      health: /health|medical|disease|patient|clinical/i,
      demographics: /age|gender|race|ethnicity|population/i,
      geography: /state|county|city|zip|location|address/i,
      economics: /income|cost|price|economic|financial/i,
      education: /school|education|student|grade/i,
      environment: /environment|pollution|air|water|climate/i,
    };

    for (const [tag, pattern] of Object.entries(patterns)) {
      if (headers.some((header) => pattern.test(header))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private inferDataSource(filePath: string, headers: string[]): string {
    const pathLower = filePath.toLowerCase();

    if (pathLower.includes("cdc")) return "CDC";
    if (pathLower.includes("census")) return "US Census";
    if (pathLower.includes("cms")) return "CMS";
    if (pathLower.includes("nih")) return "NIH";
    if (pathLower.includes("usda")) return "USDA";

    // Infer from headers
    const headerText = headers.join(" ").toLowerCase();
    if (headerText.includes("fips")) return "Government";
    if (headerText.includes("patient") || headerText.includes("medical"))
      return "Healthcare";

    return "";
  }

  private extractMetadataFromPath(
    filePath: string,
    datasetName: string,
  ): Partial<DatasetMetadata> {
    const metadata: Partial<DatasetMetadata> = {};

    // Extract year from path
    const yearMatch = filePath.match(/20\d{2}/);
    if (yearMatch) {
      metadata.tags = [`${yearMatch[0]}`];
    }

    // Extract data source from path
    const source = this.inferDataSource(filePath, []);
    if (source) {
      metadata.dataSource = source;
    }

    return metadata;
  }
}

export const createAwsS3Service = (region?: string) => new AwsS3Service(region);
