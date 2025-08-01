import { datasets, awsConfig, authConfig, refreshLog, downloads, users, type Dataset, type InsertDataset, type AwsConfig, type InsertAwsConfig, type AuthConfig, type InsertAuthConfig, type RefreshLog, type InsertRefreshLog, type Download, type InsertDownload, type User, type InsertUser, type UpdateUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export interface IStorage {
  // Dataset operations
  getDatasets(): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  getDatasetByNameAndSource(name: string, source: string): Promise<Dataset | undefined>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(id: number, dataset: Partial<InsertDataset>): Promise<Dataset | undefined>;
  deleteDataset(id: number): Promise<boolean>;
  upsertDataset(dataset: InsertDataset): Promise<Dataset>;
  
  // AWS config operations
  getAwsConfig(): Promise<AwsConfig | undefined>;
  getAllAwsConfigs(): Promise<AwsConfig[]>;
  createAwsConfig(config: InsertAwsConfig): Promise<AwsConfig>;
  updateAwsConfig(id: number, config: Partial<InsertAwsConfig>): Promise<AwsConfig | undefined>;
  deleteAwsConfig(id: number): Promise<boolean>;
  setActiveAwsConfig(id: number): Promise<AwsConfig | undefined>;
  upsertAwsConfig(config: InsertAwsConfig): Promise<AwsConfig>;
  
  // Auth operations
  getAuthConfig(): Promise<AuthConfig | undefined>;
  setPassword(password: string): Promise<AuthConfig>;
  verifyPassword(password: string): Promise<boolean>;
  
  // Refresh tracking operations
  getLastRefreshTime(): Promise<Date | null>;
  logRefresh(datasetsCount: number): Promise<void>;
  
  // Download tracking operations
  recordDownload(datasetId: number, downloadType: 'sample' | 'full' | 'metadata', ipAddress?: string, userAgent?: string): Promise<Download>;
  incrementDownloadCount(datasetId: number, downloadType: 'sample' | 'full' | 'metadata'): Promise<void>;
  getDownloadStats(datasetId: number): Promise<{ sample: number; full: number; metadata: number; total: number }>;
  
  // Raw query method for optimization checks
  query(sql: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getDatasets(): Promise<Dataset[]> {
    return await db.select().from(datasets).orderBy(asc(datasets.source), asc(datasets.name));
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async getDatasetByNameAndSource(name: string, source: string): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets)
      .where(and(eq(datasets.name, name), eq(datasets.source, source)));
    return dataset || undefined;
  }

  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const [dataset] = await db
      .insert(datasets)
      .values({
        ...insertDataset,
        createdDate: insertDataset.createdDate || new Date(),
        lastModified: insertDataset.lastModified || new Date(),
        status: insertDataset.status || "active",
        metadata: insertDataset.metadata || {},
        insights: insertDataset.insights || null,
      })
      .returning();
    return dataset;
  }

  async updateDataset(id: number, updates: Partial<InsertDataset>): Promise<Dataset | undefined> {
    // Only update lastModified if explicitly provided in updates
    // This preserves the original S3 file timestamps when updating other fields like insights
    const updateData = updates.lastModified 
      ? updates 
      : { ...updates };
    
    const [updated] = await db
      .update(datasets)
      .set(updateData)
      .where(eq(datasets.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDataset(id: number): Promise<boolean> {
    const result = await db.delete(datasets).where(eq(datasets.id, id));
    return (result.rowCount || 0) > 0;
  }

  async upsertDataset(datasetData: InsertDataset): Promise<Dataset> {
    // Try to find existing dataset by name and source
    const existing = await this.getDatasetByNameAndSource(datasetData.name, datasetData.source);
    
    if (existing) {
      // Update existing dataset, preserving insights if they exist
      const updates: Partial<InsertDataset> = {
        ...datasetData,
        insights: existing.insights || datasetData.insights, // Keep existing insights
      };
      const updated = await this.updateDataset(existing.id, updates);
      return updated!;
    } else {
      // Create new dataset
      return await this.createDataset(datasetData);
    }
  }

  async getAwsConfig(): Promise<AwsConfig | undefined> {
    const [config] = await db.select().from(awsConfig).where(eq(awsConfig.isActive, true)).limit(1);
    return config || undefined;
  }

  async getAllAwsConfigs(): Promise<AwsConfig[]> {
    return await db.select().from(awsConfig).orderBy(awsConfig.createdAt);
  }

  async createAwsConfig(config: InsertAwsConfig): Promise<AwsConfig> {
    // New configurations are created as inactive by default
    const [newConfig] = await db
      .insert(awsConfig)
      .values({
        ...config,
        name: config.name || "Default",
        region: config.region || "us-west-2",
        isConnected: config.isConnected || false,
        isActive: false, // Always create as inactive
        lastConnected: new Date(),
      })
      .returning();
    return newConfig;
  }

  async updateAwsConfig(id: number, updates: Partial<InsertAwsConfig>): Promise<AwsConfig | undefined> {
    const [updated] = await db
      .update(awsConfig)
      .set({
        ...updates,
        lastConnected: new Date(),
      })
      .where(eq(awsConfig.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAwsConfig(id: number): Promise<boolean> {
    const result = await db.delete(awsConfig).where(eq(awsConfig.id, id));
    return (result.rowCount || 0) > 0;
  }

  async setActiveAwsConfig(id: number): Promise<AwsConfig | undefined> {
    // First, set all configs as inactive
    await db.update(awsConfig).set({ isActive: false });
    
    // Then activate the selected one
    const [updated] = await db
      .update(awsConfig)
      .set({ isActive: true, lastConnected: new Date() })
      .where(eq(awsConfig.id, id))
      .returning();
    return updated || undefined;
  }

  async upsertAwsConfig(config: InsertAwsConfig): Promise<AwsConfig> {
    const existing = await this.getAwsConfig();
    
    if (existing) {
      // Update the existing active configuration
      const [updated] = await db
        .update(awsConfig)
        .set({
          ...config,
          lastConnected: new Date(),
          isActive: true, // Ensure it remains active
        })
        .where(eq(awsConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create the first configuration as active
      const [newConfig] = await db
        .insert(awsConfig)
        .values({
          ...config,
          name: config.name || "Default",
          region: config.region || "us-west-2",
          isConnected: config.isConnected || false,
          isActive: true, // First config should be active
          lastConnected: new Date(),
        })
        .returning();
      return newConfig;
    }
  }

  async getAuthConfig(): Promise<AuthConfig | undefined> {
    const [config] = await db.select().from(authConfig).limit(1);
    return config || undefined;
  }

  async setPassword(password: string): Promise<AuthConfig> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const existing = await this.getAuthConfig();
    
    if (existing) {
      const [updated] = await db
        .update(authConfig)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(authConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(authConfig)
        .values({ passwordHash })
        .returning();
      return created;
    }
  }

  async verifyPassword(password: string): Promise<boolean> {
    const config = await this.getAuthConfig();
    if (!config) {
      return false;
    }
    
    return await bcrypt.compare(password, config.passwordHash);
  }

  async getLastRefreshTime(): Promise<Date | null> {
    const [lastRefresh] = await db
      .select()
      .from(refreshLog)
      .orderBy(desc(refreshLog.lastRefreshTime))
      .limit(1);
    
    return lastRefresh?.lastRefreshTime || null;
  }

  async logRefresh(datasetsCount: number): Promise<void> {
    await db
      .insert(refreshLog)
      .values({
        lastRefreshTime: new Date(),
        datasetsCount,
      });
  }

  // User management methods
  async createUser(userData: InsertUser): Promise<User> {
    // Password should already be hashed by the caller
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt));
  }

  async updateUser(id: number, updates: UpdateUser): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user || !user.isActive) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  generateJWT(user: User): string {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  verifyJWT(token: string): { id: number; username: string; role: string } | null {
    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const decoded = jwt.verify(token, secret) as { id: number; username: string; role: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async recordDownload(datasetId: number, downloadType: 'sample' | 'full' | 'metadata', ipAddress?: string, userAgent?: string): Promise<Download> {
    const [download] = await db
      .insert(downloads)
      .values({
        datasetId,
        downloadType,
        ipAddress,
        userAgent,
      })
      .returning();
    
    // Also increment the counter in the datasets table
    await this.incrementDownloadCount(datasetId, downloadType);
    
    return download;
  }

  async incrementDownloadCount(datasetId: number, downloadType: 'sample' | 'full' | 'metadata'): Promise<void> {
    if (downloadType === 'sample') {
      await db
        .update(datasets)
        .set({ downloadCountSample: sql`${datasets.downloadCountSample} + 1` })
        .where(eq(datasets.id, datasetId));
    } else if (downloadType === 'full') {
      await db
        .update(datasets)
        .set({ downloadCountFull: sql`${datasets.downloadCountFull} + 1` })
        .where(eq(datasets.id, datasetId));
    } else if (downloadType === 'metadata') {
      await db
        .update(datasets)
        .set({ downloadCountMetadata: sql`${datasets.downloadCountMetadata} + 1` })
        .where(eq(datasets.id, datasetId));
    }
  }

  async getDownloadStats(datasetId: number): Promise<{ sample: number; full: number; metadata: number; total: number }> {
    const [dataset] = await db
      .select({
        sample: datasets.downloadCountSample,
        full: datasets.downloadCountFull,
        metadata: datasets.downloadCountMetadata,
      })
      .from(datasets)
      .where(eq(datasets.id, datasetId));
    
    if (!dataset) {
      return { sample: 0, full: 0, metadata: 0, total: 0 };
    }
    
    return {
      sample: dataset.sample,
      full: dataset.full,
      metadata: dataset.metadata,
      total: dataset.sample + dataset.full + dataset.metadata,
    };
  }

  async query(sql: string): Promise<any[]> {
    // Execute raw SQL query for performance monitoring
    const result = await db.execute(sql as any);
    return result.rows || [];
  }
}

export const storage = new DatabaseStorage();
