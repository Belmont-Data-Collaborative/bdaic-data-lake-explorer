import { storage } from "../storage";
import { createAwsS3Service } from "./aws";
import { invalidateCache } from "./cache";

export interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRun?: Date;
  nextRun?: Date;
}

class DatasetScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: SchedulerConfig = {
    enabled: false,
    intervalMinutes: 30, // Default: 30 minutes
  };
  private isRefreshing = false;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      // Try to load scheduler config from database
      const savedConfig = await storage.getSchedulerConfig();
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
      
      // Start scheduler if enabled
      if (this.config.enabled) {
        this.start();
      }
    } catch (error) {
      console.warn("Failed to load scheduler config, using defaults:", error);
    }
  }

  async configure(config: Partial<SchedulerConfig>): Promise<SchedulerConfig> {
    const wasEnabled = this.config.enabled;
    
    // Update configuration
    this.config = { ...this.config, ...config };
    
    // Calculate next run time
    if (this.config.enabled) {
      this.config.nextRun = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000);
    } else {
      this.config.nextRun = undefined;
    }

    // Save to database
    await storage.updateSchedulerConfig(this.config);

    // Restart scheduler if needed
    if (wasEnabled && !this.config.enabled) {
      this.stop();
    } else if (this.config.enabled) {
      this.restart();
    }

    console.log(`Scheduler configured: ${this.config.enabled ? 'enabled' : 'disabled'}, interval: ${this.config.intervalMinutes} minutes`);
    
    return { ...this.config };
  }

  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    
    this.intervalId = setInterval(async () => {
      await this.performScheduledRefresh();
    }, intervalMs);

    this.config.nextRun = new Date(Date.now() + intervalMs);
    console.log(`Dataset scheduler started with ${this.config.intervalMinutes} minute interval`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.config.nextRun = undefined;
      console.log("Dataset scheduler stopped");
    }
  }

  restart(): void {
    this.stop();
    if (this.config.enabled) {
      this.start();
    }
  }

  private async performScheduledRefresh(): Promise<void> {
    if (this.isRefreshing) {
      console.log("Scheduler: Refresh already in progress, skipping");
      return;
    }

    console.log("Scheduler: Starting automatic dataset refresh");
    this.isRefreshing = true;
    this.config.lastRun = new Date();

    try {
      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        console.warn("Scheduler: No AWS configuration found, skipping refresh");
        return;
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Test connection first
      const isConnected = await s3Service.testConnection(config.bucketName);
      if (!isConnected) {
        console.error("Scheduler: Cannot connect to S3 bucket");
        return;
      }

      // Perform the refresh operation (same logic as manual refresh)
      const s3Datasets = await s3Service.listDatasets(config.bucketName);
      
      // Track changes for notification
      let newCount = 0;
      let updatedCount = 0;
      
      // Upsert datasets (update existing or create new) to preserve IDs and insights
      const upsertedDatasets = [];
      for (const datasetData of s3Datasets) {
        const existing = await storage.getDatasetByNameAndSource(datasetData.name, datasetData.source);
        
        if (existing) {
          // Check if dataset was actually modified
          if (existing.lastModified.getTime() !== datasetData.lastModified.getTime() ||
              existing.sizeBytes !== datasetData.sizeBytes) {
            updatedCount++;
          }
        } else {
          newCount++;
        }
        
        const dataset = await storage.upsertDataset(datasetData);
        upsertedDatasets.push(dataset);
      }

      // Remove datasets that no longer exist in S3
      const existingDatasets = await storage.getDatasets();
      const s3DatasetNames = new Set(s3Datasets.map(d => `${d.name}|${d.source}`));
      
      let removedCount = 0;
      for (const existing of existingDatasets) {
        const existingKey = `${existing.name}|${existing.source}`;
        if (!s3DatasetNames.has(existingKey)) {
          await storage.deleteDataset(existing.id);
          removedCount++;
        }
      }

      // Log the refresh with detailed stats
      await storage.logRefresh(upsertedDatasets.length, {
        newDatasets: newCount,
        updatedDatasets: updatedCount,
        removedDatasets: removedCount,
        scheduledRefresh: true
      });

      // Clear cache after refresh
      invalidateCache();

      // Update next run time
      this.config.nextRun = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000);
      await storage.updateSchedulerConfig(this.config);

      console.log(`Scheduler: Refresh completed - ${newCount} new, ${updatedCount} updated, ${removedCount} removed datasets`);
      
    } catch (error) {
      console.error("Scheduler: Error during automatic refresh:", error);
      
      // Log the failed refresh
      try {
        await storage.logRefresh(0, {
          error: error instanceof Error ? error.message : 'Unknown error',
          scheduledRefresh: true
        });
      } catch (logError) {
        console.error("Failed to log refresh error:", logError);
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  getStatus(): SchedulerConfig & { isRefreshing: boolean } {
    return {
      ...this.config,
      isRefreshing: this.isRefreshing,
    };
  }

  async triggerManualRefresh(): Promise<{ success: boolean; message: string; stats?: any }> {
    if (this.isRefreshing) {
      return { success: false, message: "Refresh already in progress" };
    }

    try {
      await this.performScheduledRefresh();
      return { success: true, message: "Manual refresh completed successfully" };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Manual refresh failed" 
      };
    }
  }
}

// Singleton instance
export const datasetScheduler = new DatasetScheduler();