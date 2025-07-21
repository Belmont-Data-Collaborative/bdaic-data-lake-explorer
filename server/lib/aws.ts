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

      // Filter to only include CSV datasets
      const csvDatasets = datasets.filter(
        (dataset) => dataset.format.toLowerCase() === "csv",
      );

      return csvDatasets;
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
          // If no matching CSV, treat YAML as standalone
          const datasetName = this.extractDatasetName(fileName, prefix);
          if (!groups.has(datasetName)) {
            groups.set(datasetName, []);
          }
          groups.get(datasetName)!.push(file);
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

      // Calculate 10% of the file size for partial download
      const tenPercentSize = Math.floor(dataFile.Size * 0.1);

      console.log(
        `Generating sample download for ${datasetName}: ${dataFile.Size} bytes -> ${tenPercentSize} bytes (10%)`,
      );

      return {
        key: dataFile.Key,
        bucketName,
        sampleSize: tenPercentSize,
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

    // If no YAML or YAML parsing failed, analyze CSV file as fallback
    if (!yamlFile || !finalMetadata.columns?.length) {
      const csvFile = files.find(
        (file: any) =>
          this.getFileFormat(file.Key || "").toLowerCase() === "csv",
      );
      if (csvFile) {
        try {
          const csvMetadata = await this.analyzeCsvFile(
            bucketName,
            csvFile.Key,
          );
          finalMetadata = { ...finalMetadata, ...csvMetadata };
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
        metadata.columnCount = metadata.columns.length;
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
        metadata.columnCount = metadata.columns.length;
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
        metadata.columnCount = metadata.columns.length;
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
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(getObjectCommand);
      const stream = response.Body;

      if (!stream) return {};

      // Read first few lines to analyze headers
      let content = "";
      const reader = stream as NodeJS.ReadableStream;
      let bytesRead = 0;
      const maxBytes = 2048; // Read first 2KB to get headers

      for await (const chunk of reader) {
        content += chunk.toString();
        bytesRead += chunk.length;
        if (bytesRead >= maxBytes) break;
      }

      const lines = content.split("\n").filter((line) => line.trim());
      if (lines.length === 0) return {};

      const headerLine = lines[0];
      const delimiter = this.detectDelimiter(headerLine);
      const headers = headerLine
        .split(delimiter)
        .map((h) => h.trim().replace(/"/g, ""));

      // Analyze a few data rows for type inference
      const dataRows = lines
        .slice(1, Math.min(6, lines.length))
        .map((line) =>
          line.split(delimiter).map((cell) => cell.trim().replace(/"/g, "")),
        );

      const columnMetadata = headers.map((header, index) => {
        const values = dataRows
          .map((row) => row[index])
          .filter((val) => val && val !== "");
        return {
          name: header,
          type: this.inferColumnType(values),
        };
      });

      const tags = this.extractTagsFromHeaders(headers);
      const dataSource = this.inferDataSource(fileKey, headers);

      return {
        columns: columnMetadata,
        tags: tags.length > 0 ? tags : undefined,
        dataSource: dataSource || undefined,
      };
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

  private inferColumnType(values: string[]): string {
    if (values.length === 0) return "text";

    let numericCount = 0;
    let dateCount = 0;

    for (const value of values) {
      if (!isNaN(Number(value))) {
        numericCount++;
      } else if (!isNaN(Date.parse(value))) {
        dateCount++;
      }
    }

    const total = values.length;
    if (numericCount / total > 0.8) return "numeric";
    if (dateCount / total > 0.8) return "date";
    return "text";
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
