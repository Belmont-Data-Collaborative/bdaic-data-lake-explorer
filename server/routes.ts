import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createAwsS3Service } from "./lib/aws";
import { openAIService } from "./lib/openai";
import { insertAwsConfigSchema, insertDatasetSchema } from "@shared/schema";
import { z } from "zod";

// Simple cache for expensive operations
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCached<T>(key: string, ttl: number = 30000): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any, ttl: number = 30000): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

function invalidateCache(pattern?: string): void {
  if (pattern) {
    const keys = Array.from(cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cache headers and compression hints for API responses
  app.use("/api", (req, res, next) => {
    // Set cache headers for GET requests
    if (req.method === "GET") {
      // Different cache durations based on endpoint
      if (req.path.includes('/stats') || req.path.includes('/quick-stats')) {
        res.set("Cache-Control", "public, max-age=300"); // 5 minutes for stats
      } else if (req.path.includes('/folders') && !req.path.includes('/community-data-points')) {
        res.set("Cache-Control", "public, max-age=600"); // 10 minutes for folder lists
      } else if (req.path.includes('/aws-config')) {
        res.set("Cache-Control", "private, max-age=60"); // 1 minute for config
      } else {
        res.set("Cache-Control", "public, max-age=60"); // 1 minute default
      }
    }
    
    // Add compression hints for large responses
    if (req.path.includes('/datasets') || req.path.includes('/community-data-points')) {
      res.set("Content-Encoding-Hint", "gzip");
    }
    
    next();
  });
  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const isValid = await storage.verifyPassword(password);
      
      if (isValid) {
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Check if there's already a password set
      const existingAuth = await storage.getAuthConfig();
      
      if (existingAuth) {
        // If password exists, verify current password
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        
        const isValidCurrent = await storage.verifyPassword(currentPassword);
        if (!isValidCurrent) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }
      
      await storage.setPassword(newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/auth/status", async (req, res) => {
    try {
      let authConfig = await storage.getAuthConfig();
      
      // If no password exists, create the default password "DataIsGood"
      if (!authConfig) {
        authConfig = await storage.setPassword("DataIsGood");
      }
      
      res.json({ hasPassword: !!authConfig });
    } catch (error) {
      console.error("Error checking auth status:", error);
      res.status(500).json({ message: "Failed to check auth status" });
    }
  });

  // AWS Configuration endpoints
  app.get("/api/aws-config", async (req, res) => {
    try {
      const config = await storage.getAwsConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching AWS config:", error);
      res.status(500).json({ message: "Failed to fetch AWS configuration" });
    }
  });

  app.post("/api/aws-config", async (req, res) => {
    try {
      const validatedConfig = insertAwsConfigSchema.parse(req.body);
      const config = await storage.upsertAwsConfig(validatedConfig);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        console.error("Error saving AWS config:", error);
        res.status(500).json({ message: "Failed to save AWS configuration" });
      }
    }
  });

  // Get all AWS configurations
  app.get("/api/aws-configs", async (req, res) => {
    try {
      const configs = await storage.getAllAwsConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching AWS configs:", error);
      res.status(500).json({ message: "Failed to fetch AWS configurations" });
    }
  });

  // Create new AWS configuration
  app.post("/api/aws-configs", async (req, res) => {
    try {
      const validatedConfig = insertAwsConfigSchema.parse(req.body);
      const config = await storage.createAwsConfig(validatedConfig);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        console.error("Error creating AWS config:", error);
        res.status(500).json({ message: "Failed to create AWS configuration" });
      }
    }
  });

  // Update AWS configuration
  app.put("/api/aws-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedConfig = insertAwsConfigSchema.partial().parse(req.body);
      const config = await storage.updateAwsConfig(id, validatedConfig);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        console.error("Error updating AWS config:", error);
        res.status(500).json({ message: "Failed to update AWS configuration" });
      }
    }
  });

  // Delete AWS configuration
  app.delete("/api/aws-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAwsConfig(id);
      if (!deleted) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json({ message: "Configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting AWS config:", error);
      res.status(500).json({ message: "Failed to delete AWS configuration" });
    }
  });

  // Set active AWS configuration
  app.post("/api/aws-configs/:id/activate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.setActiveAwsConfig(id);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      // Automatically refresh datasets when configuration is activated
      try {
        if (config.bucketName) {
          const s3Service = createAwsS3Service(config.region);
          
          // Test connection first
          const isConnected = await s3Service.testConnection(config.bucketName);
          if (isConnected) {
            // Fetch datasets from S3
            const s3Datasets = await s3Service.listDatasets(config.bucketName);
            
            // Upsert datasets to preserve IDs and insights
            for (const datasetData of s3Datasets) {
              await storage.upsertDataset(datasetData);
            }

            // Remove datasets that no longer exist in S3
            const existingDatasets = await storage.getDatasets();
            const s3DatasetNames = new Set(s3Datasets.map(d => `${d.name}|${d.source}`));
            
            for (const existing of existingDatasets) {
              const existingKey = `${existing.name}|${existing.source}`;
              if (!s3DatasetNames.has(existingKey)) {
                await storage.deleteDataset(existing.id);
              }
            }
          }
        }
      } catch (refreshError) {
        console.warn("Failed to refresh datasets during configuration activation:", refreshError);
        // Don't fail the activation if dataset refresh fails
      }

      res.json(config);
    } catch (error) {
      console.error("Error activating AWS config:", error);
      res.status(500).json({ message: "Failed to activate AWS configuration" });
    }
  });

  app.post("/api/aws-config/test", async (req, res) => {
    try {
      const { bucketName, region } = req.body;
      
      if (!bucketName) {
        return res.status(400).json({ message: "Bucket name is required" });
      }

      const s3Service = createAwsS3Service(region);
      const isConnected = await s3Service.testConnection(bucketName);
      
      if (isConnected) {
        // Update config with successful connection
        await storage.upsertAwsConfig({
          bucketName,
          region: region || "us-west-2",
          isConnected: true,
        });
      }

      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing AWS connection:", error);
      res.status(500).json({ message: "Failed to test AWS connection" });
    }
  });

  // Dataset endpoints with pagination and filtering
  app.get("/api/datasets", async (req, res) => {
    try {
      const { 
        page = "1", 
        limit = "50", 
        folder,
        search,
        format 
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const offset = (pageNum - 1) * limitNum;
      
      console.log(`Request params - page: ${page}, limit: ${limit}`);
      console.log(`Parsed - pageNum: ${pageNum}, limitNum: ${limitNum}`);

      // Cache key for datasets query
      const cacheKey = `datasets-all`;
      let allDatasets = getCached<any[]>(cacheKey);
      
      if (!allDatasets) {
        allDatasets = await storage.getDatasets();
        setCache(cacheKey, allDatasets, 60000); // 1 minute cache
      }
      console.log(`Total datasets from storage: ${allDatasets.length}`);
      
      // Apply filters
      if (folder && folder !== "all") {
        console.log(`Filtering by folder: ${folder}`);
        console.log(`Datasets before filter: ${allDatasets.length}`);
        allDatasets = allDatasets.filter(d => d.topLevelFolder === folder);
        console.log(`Datasets after filter: ${allDatasets.length}`);
        if (allDatasets.length > 0) {
          console.log(`Sample dataset topLevelFolder: ${allDatasets[0].topLevelFolder}`);
          console.log(`Sample dataset names: ${allDatasets.slice(0, 3).map(d => d.name).join(', ')}`);
        }
      } else {
        console.log(`No folder filter applied, returning all ${allDatasets.length} datasets`);
        if (allDatasets.length > 0) {
          console.log(`Sample dataset names: ${allDatasets.slice(0, 3).map(d => d.name).join(', ')}`);
          // Check folder distribution
          const folderCounts = allDatasets.reduce((acc, d) => {
            acc[d.topLevelFolder] = (acc[d.topLevelFolder] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log(`Folder distribution:`, folderCounts);
        }
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        allDatasets = allDatasets.filter(d => 
          d.name.toLowerCase().includes(searchLower) ||
          (d.metadata as any)?.dataSource?.toLowerCase().includes(searchLower)
        );
      }
      
      if (format && format !== "all") {
        allDatasets = allDatasets.filter(d => d.format === format);
      }

      const totalCount = allDatasets.length;
      const paginatedDatasets = allDatasets.slice(offset, offset + limitNum);

      // Add no-cache headers to prevent caching issues
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        datasets: paginatedDatasets,
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      });
    } catch (error) {
      console.error("Error fetching datasets:", error);
      res.status(500).json({ message: "Failed to fetch datasets" });
    }
  });

  // Quick stats endpoint for faster loading
  app.get("/api/datasets/quick-stats", async (req, res) => {
    try {
      const cacheKey = 'quick-stats';
      let stats = getCached<any>(cacheKey);
      
      if (!stats) {
        const datasets = await storage.getDatasets();
        const totalCount = datasets.length;
        const folders = Array.from(new Set(datasets.map(d => d.topLevelFolder).filter(Boolean)));
        
        stats = {
          totalCount,
          folders,
          lastUpdated: new Date().toISOString()
        };
        
        setCache(cacheKey, stats, 60000); // 1 minute cache
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching quick stats:", error);
      res.status(500).json({ message: "Failed to fetch quick stats" });
    }
  });

  app.post("/api/datasets/refresh", async (req, res) => {
    try {
      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found. Please configure S3 settings first." });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Test connection first
      const isConnected = await s3Service.testConnection(config.bucketName);
      if (!isConnected) {
        return res.status(400).json({ message: "Cannot connect to S3 bucket. Please check your AWS configuration." });
      }

      // Fetch datasets from S3
      const s3Datasets = await s3Service.listDatasets(config.bucketName);
      
      // Upsert datasets (update existing or create new) to preserve IDs and insights
      const upsertedDatasets = [];
      for (const datasetData of s3Datasets) {
        const dataset = await storage.upsertDataset(datasetData);
        upsertedDatasets.push(dataset);
      }

      // Remove datasets that no longer exist in S3
      const existingDatasets = await storage.getDatasets();
      const s3DatasetNames = new Set(s3Datasets.map(d => `${d.name}|${d.source}`));
      
      for (const existing of existingDatasets) {
        const existingKey = `${existing.name}|${existing.source}`;
        if (!s3DatasetNames.has(existingKey)) {
          await storage.deleteDataset(existing.id);
        }
      }

      // Log the refresh with timestamp
      await storage.logRefresh(upsertedDatasets.length);

      // Clear cache after refresh
      invalidateCache();

      res.json({ 
        message: `Successfully refreshed ${upsertedDatasets.length} datasets`,
        datasets: upsertedDatasets 
      });
    } catch (error) {
      console.error("Error refreshing datasets:", error);
      res.status(500).json({ message: "Failed to refresh datasets from S3" });
    }
  });

  app.get("/api/datasets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dataset ID" });
      }
      
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      res.json(dataset);
    } catch (error) {
      console.error("Error fetching dataset:", error);
      res.status(500).json({ message: "Failed to fetch dataset" });
    }
  });

  // AI Insights endpoints
  app.post("/api/datasets/:id/insights", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const insights = await openAIService.generateDatasetInsights(dataset);
      
      // Update dataset with insights
      await storage.updateDataset(id, { insights });
      
      res.json({ insights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  // Dataset download endpoint
  app.get("/api/datasets/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }
      
      const awsConfig = await storage.getAwsConfig();
      if (!awsConfig) {
        return res.status(400).json({ error: "AWS configuration not found" });
      }
      
      const awsService = createAwsS3Service(awsConfig.region);
      const downloadUrl = await awsService.generateSampleDownloadUrl(
        awsConfig.bucketName, 
        dataset.source, 
        dataset.name
      );
      
      if (!downloadUrl) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Handle the download object which contains key, bucketName, and sampleSize
      if (typeof downloadUrl === 'object' && downloadUrl !== null) {
        return res.status(501).json({ error: "Direct download not implemented. Use sample download endpoint instead." });
      }
      
      // Redirect to the presigned URL for download
      res.redirect(downloadUrl);
    } catch (error) {
      console.error("Error downloading dataset:", error);
      res.status(500).json({ error: "Failed to download dataset" });
    }
  });

  // Enhanced dataset chat endpoint with file access and visualization
  app.post("/api/datasets/:id/chat", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { message, conversationHistory, enableVisualization } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const dataset = await storage.getDataset(id);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const response = await openAIService.chatWithDatasetEnhanced(
        dataset, 
        message, 
        conversationHistory || [], 
        enableVisualization || false
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error in dataset chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Find datasets by query
  app.post("/api/datasets/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }
      
      console.log('Starting search for:', query);
      const datasets = await storage.getDatasets();
      console.log('Found datasets:', datasets.length);
      
      // Use fallback search primarily with AI search as enhancement
      console.log('Running fallback search...');
      const fallbackResults = openAIService.fallbackSearch(query, datasets);
      console.log('Fallback results:', fallbackResults.length);
      
      // Return results immediately to avoid timeouts
      res.json({ results: fallbackResults });
      
    } catch (error) {
      console.error("Error in dataset search:", error);
      res.status(500).json({ error: "Failed to search datasets" });
    }
  });

  app.post("/api/datasets/bulk-insights", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      
      if (datasets.length === 0) {
        return res.json({ message: "No datasets found" });
      }

      const insights = await openAIService.generateBulkInsights(datasets);
      
      // Update datasets with insights
      const updatePromises = Object.entries(insights).map(([datasetId, datasetInsights]) => 
        storage.updateDataset(parseInt(datasetId), { insights: datasetInsights })
      );
      
      await Promise.all(updatePromises);
      
      res.json({ 
        message: `Generated insights for ${Object.keys(insights).length} datasets`,
        insights 
      });
    } catch (error) {
      console.error("Error generating bulk insights:", error);
      res.status(500).json({ message: "Failed to generate bulk AI insights" });
    }
  });

  // Download sample endpoint
  app.get("/api/datasets/:id/download-sample", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found" });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Get sample file info from the dataset
      const sampleInfo = await s3Service.generateSampleDownloadUrl(config.bucketName, dataset.source, dataset.name);
      
      if (!sampleInfo) {
        return res.status(404).json({ message: "No sample file found for this dataset" });
      }

      // Download the partial file content
      const partialContent = await s3Service.downloadPartialFile(sampleInfo.bucketName, sampleInfo.key, sampleInfo.sampleSize);
      
      if (!partialContent) {
        return res.status(500).json({ message: "Failed to download sample content" });
      }

      // Set appropriate headers for file download
      const fileName = `${dataset.name}-sample.${dataset.format.toLowerCase()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', partialContent.length);
      
      // Send the partial file content
      res.send(partialContent);
    } catch (error) {
      console.error("Error generating download sample:", error);
      res.status(500).json({ message: "Failed to generate sample download" });
    }
  });

  // Download full file endpoint
  app.get("/api/datasets/:id/download-full", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found" });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Get full file stream from S3
      const fileInfo = await s3Service.downloadFullFile(config.bucketName, dataset.source, dataset.name);
      
      if (!fileInfo) {
        return res.status(404).json({ message: "File not found or failed to download" });
      }

      // Set appropriate headers for file download
      const fileName = `${dataset.name}.${dataset.format.toLowerCase()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Set content length if available
      if (fileInfo.size) {
        res.setHeader('Content-Length', fileInfo.size);
      }
      
      // Pipe the stream directly to the response to avoid memory issues
      const stream = fileInfo.stream as any;
      stream.pipe(res);
      
      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error('Stream error during download:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to download full file" });
        }
      });
      
    } catch (error) {
      console.error("Error downloading full file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download full file" });
      }
    }
  });

  // Get community data points calculation
  app.get("/api/community-data-points", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      const results = datasets
        .filter(d => {
          const metadata = d.metadata as any;
          return metadata && 
                 metadata.recordCount && 
                 metadata.columnCount && 
                 metadata.completenessScore;
        })
        .map(d => {
          const metadata = d.metadata as any;
          const recordCount = parseInt(metadata.recordCount);
          const columnCount = metadata.columnCount;
          const completenessScore = metadata.completenessScore / 100.0; // Convert percentage to decimal
          
          return {
            file_name: d.name,
            record_count: recordCount,
            column_count: columnCount,
            completeness_score: completenessScore,
            community_data_points: recordCount * columnCount * completenessScore
          };
        });
      
      res.json(results);
    } catch (error) {
      console.error("Error calculating community data points:", error);
      res.status(500).json({ message: "Failed to calculate community data points" });
    }
  });

  // Get community data points by folder
  app.get("/api/folders/community-data-points", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      const folderTotals = new Map<string, number>();
      
      // Calculate community data points for each dataset and group by folder
      datasets
        .filter(d => {
          const metadata = d.metadata as any;
          return metadata && 
                 metadata.recordCount && 
                 metadata.columnCount && 
                 metadata.completenessScore &&
                 d.topLevelFolder;
        })
        .forEach(d => {
          const metadata = d.metadata as any;
          const recordCount = parseInt(metadata.recordCount);
          const columnCount = metadata.columnCount;
          const completenessScore = metadata.completenessScore / 100.0;
          const communityDataPoints = recordCount * columnCount * completenessScore;
          
          const currentTotal = folderTotals.get(d.topLevelFolder!) || 0;
          folderTotals.set(d.topLevelFolder!, currentTotal + communityDataPoints);
        });
      
      // Format results with folder labels
      const results = Array.from(folderTotals.entries()).map(([folderName, total]) => ({
        folder_label: `${folderName.toUpperCase().replace(/_/g, ' ')}(${Math.round(total).toLocaleString()})`,
        total_community_data_points: Math.round(total)
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error calculating folder community data points:", error);
      res.status(500).json({ message: "Failed to calculate folder community data points" });
    }
  });

  // Get unique top-level folders
  app.get("/api/folders", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      const folders = Array.from(new Set(datasets
        .map(d => d.topLevelFolder)
        .filter(Boolean)))
        .sort();
      
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  // Helper function to extract unique data sources from metadata
  const extractDataSources = (datasets: any[]): Set<string> => {
    const sources = new Set<string>();
    
    for (const dataset of datasets) {
      if (dataset.metadata && dataset.metadata.dataSource) {
        // Split by comma and clean up each source
        const dataSources = dataset.metadata.dataSource
          .split(',')
          .map((source: string) => source.trim())
          .filter((source: string) => source.length > 0);
        
        dataSources.forEach((source: string) => sources.add(source));
      }
    }
    
    return sources;
  };

  // Optimized stats endpoint with caching
  let statsCache: { data: any; timestamp: number } | null = null;
  const STATS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  app.get("/api/stats", async (req, res) => {
    try {
      // Check cache first
      if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_DURATION) {
        return res.json(statsCache.data);
      }

      const datasets = await storage.getDatasets();
      
      const totalSize = datasets.reduce((sum, dataset) => sum + Number(dataset.sizeBytes), 0);
      const uniqueDataSources = extractDataSources(datasets);
      
      // Calculate total community data points across all datasets
      const totalCommunityDataPoints = datasets
        .filter(d => {
          const metadata = d.metadata as any;
          return metadata && 
                 metadata.recordCount && 
                 metadata.columnCount && 
                 metadata.completenessScore;
        })
        .reduce((total, d) => {
          const metadata = d.metadata as any;
          const recordCount = parseInt(metadata.recordCount);
          const columnCount = metadata.columnCount;
          const completenessScore = metadata.completenessScore / 100.0;
          return total + (recordCount * columnCount * completenessScore);
        }, 0);
      
      // Use the last refresh time instead of dataset modification times
      const lastRefreshTime = await storage.getLastRefreshTime();

      const stats = {
        totalDatasets: datasets.length,
        totalSize: formatFileSize(totalSize),
        dataSources: uniqueDataSources.size,
        lastUpdated: lastRefreshTime ? getTimeAgo(lastRefreshTime) : "Never",
        lastRefreshTime: lastRefreshTime ? lastRefreshTime.toISOString() : null,
        totalCommunityDataPoints: Math.round(totalCommunityDataPoints),
      };

      // Cache the results
      statsCache = {
        data: stats,
        timestamp: Date.now()
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Documentation endpoint - serve API docs from replit.md
  app.get("/api/docs/markdown", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Read the replit.md file
      const filePath = path.join(process.cwd(), 'replit.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract only the API Documentation section
      const apiDocsStart = content.indexOf('## API Documentation');
      if (apiDocsStart === -1) {
        return res.status(404).json({ message: "API Documentation section not found" });
      }
      
      // Find the next major section to stop at
      const nextSectionIndex = content.indexOf('\n## ', apiDocsStart + 1);
      const apiDocsContent = nextSectionIndex !== -1 
        ? content.substring(apiDocsStart, nextSectionIndex)
        : content.substring(apiDocsStart);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(apiDocsContent);
    } catch (error) {
      console.error("Error reading API documentation:", error);
      res.status(500).json({ message: "Failed to load API documentation" });
    }
  });

  // Performance monitoring endpoint
  app.get("/api/performance/stats", async (req, res) => {
    try {
      const { performanceMonitor } = await import("./lib/performance-monitor");
      const stats = performanceMonitor.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching performance stats:", error);
      res.status(500).json({ message: "Failed to fetch performance statistics" });
    }
  });

  // Database optimization status endpoint
  app.get("/api/performance/db-status", async (req, res) => {
    try {
      // Check if indexes exist by querying information_schema
      const indexInfo = await storage.query(`
        SELECT 
          indexname,
          tablename,
          schemaname
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('datasets', 'aws_config', 'refresh_log')
        ORDER BY tablename, indexname;
      `);

      const optimizationStatus = {
        indexesCreated: indexInfo.length > 3, // More than just primary keys
        compressionEnabled: true,
        cachingEnabled: true,
        performanceMonitoring: true,
        indexes: indexInfo,
        recommendations: []
      };

      // Add recommendations based on performance data
      const { performanceMonitor } = await import("./lib/performance-monitor");
      const slowQueries = performanceMonitor.getSlowQueries(1000);
      
      if (slowQueries.length > 5) {
        optimizationStatus.recommendations.push("Consider adding more specific indexes for slow queries");
      }

      const cacheHitRate = performanceMonitor.getCacheHitRate();
      if (cacheHitRate < 80) {
        optimizationStatus.recommendations.push("Consider increasing cache TTL for better performance");
      }

      res.json(optimizationStatus);
    } catch (error) {
      console.error("Error checking database optimization status:", error);
      res.status(500).json({ message: "Failed to check optimization status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
