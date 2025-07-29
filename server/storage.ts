import { datasets, awsConfig, authConfig, refreshLog, downloads, users, roles, roleDatasets, type Dataset, type InsertDataset, type AwsConfig, type InsertAwsConfig, type AuthConfig, type InsertAuthConfig, type RefreshLog, type InsertRefreshLog, type Download, type InsertDownload, type User, type InsertUser, type UpdateUser, type Role, type InsertRole, type RoleDataset, type InsertRoleDataset, type CreateRole, type UpdateRole, type RoleWithDatasets, type UserWithRole } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export interface IStorage {
  // Dataset operations
  getDatasets(): Promise<Dataset[]>;
  getDatasetsForUser(userId: number): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  getDatasetForUser(id: number, userId: number): Promise<Dataset | undefined>;
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
  
  // User operations
  getUserById(id: number): Promise<UserWithRole | undefined>;
  getUserByUsername(username: string): Promise<UserWithRole | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<UserWithRole[]>;
  verifyUserPassword(username: string, password: string): Promise<UserWithRole | null>;
  updateUserLastLogin(id: number): Promise<void>;
  generateJWT(user: User): string;
  verifyJWT(token: string): { id: number; username: string; systemRole: string; customRoleId?: number } | null;
  
  // Role management operations
  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<RoleWithDatasets | undefined>;
  getRoleByName(name: string): Promise<RoleWithDatasets | undefined>;
  createRole(roleData: CreateRole): Promise<Role>;
  updateRole(id: number, updates: UpdateRole): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  assignRoleToUser(userId: number, roleId: number): Promise<void>;
  removeRoleFromUser(userId: number): Promise<void>;
  addDatasetToRole(roleId: number, datasetId: number): Promise<void>;
  removeDatasetFromRole(roleId: number, datasetId: number): Promise<void>;
  getUserAccessibleDatasetIds(userId: number): Promise<number[]>;
  
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

  async getDatasetsForUser(userId: number): Promise<Dataset[]> {
    // Get user with their custom role
    const user = await this.getUserById(userId);
    if (!user) return [];

    // If user is admin, always return all datasets (bypass all role restrictions)
    if (user.systemRole === 'admin') {
      return this.getDatasets();
    }

    // For non-admin users: if they have no custom role, they have full access by default
    if (!user.customRoleId) {
      return this.getDatasets();
    }

    // For non-admin users with custom roles: restrict access to only datasets in their role
    const accessibleDatasets = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        source: datasets.source,
        topLevelFolder: datasets.topLevelFolder,
        format: datasets.format,
        size: datasets.size,
        sizeBytes: datasets.sizeBytes,
        lastModified: datasets.lastModified,
        createdDate: datasets.createdDate,
        status: datasets.status,
        metadata: datasets.metadata,
        insights: datasets.insights,
        downloadCountSample: datasets.downloadCountSample,
        downloadCountFull: datasets.downloadCountFull,
        downloadCountMetadata: datasets.downloadCountMetadata,
      })
      .from(datasets)
      .innerJoin(roleDatasets, eq(datasets.id, roleDatasets.datasetId))
      .where(eq(roleDatasets.roleId, user.customRoleId))
      .orderBy(asc(datasets.source), asc(datasets.name));

    return accessibleDatasets;
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async getDatasetForUser(id: number, userId: number): Promise<Dataset | undefined> {
    // Get user with their custom role
    const user = await this.getUserById(userId);
    if (!user) return undefined;

    // If user is admin, return dataset directly (bypass all role restrictions)
    if (user.systemRole === 'admin') {
      return this.getDataset(id);
    }

    // For non-admin users: if they have no custom role, they have full access
    if (!user.customRoleId) {
      return this.getDataset(id);
    }

    // For non-admin users with custom roles: check if dataset is accessible through their role
    const [accessibleDataset] = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        source: datasets.source,
        topLevelFolder: datasets.topLevelFolder,
        format: datasets.format,
        size: datasets.size,
        sizeBytes: datasets.sizeBytes,
        lastModified: datasets.lastModified,
        createdDate: datasets.createdDate,
        status: datasets.status,
        metadata: datasets.metadata,
        insights: datasets.insights,
        downloadCountSample: datasets.downloadCountSample,
        downloadCountFull: datasets.downloadCountFull,
        downloadCountMetadata: datasets.downloadCountMetadata,
      })
      .from(datasets)
      .innerJoin(roleDatasets, eq(datasets.id, roleDatasets.datasetId))
      .where(and(
        eq(datasets.id, id),
        eq(roleDatasets.roleId, user.customRoleId)
      ));

    return accessibleDataset || undefined;
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
      return updated!;
    } else {
      const [created] = await db
        .insert(authConfig)
        .values({ passwordHash })
        .returning();
      return created!;
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

  async getUserByUsername(username: string): Promise<UserWithRole | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        passwordHash: users.passwordHash,
        systemRole: users.systemRole,
        customRoleId: users.customRoleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
        customRole: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystemRole: roles.isSystemRole,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        }
      })
      .from(users)
      .leftJoin(roles, eq(users.customRoleId, roles.id))
      .where(eq(users.username, username))
      .limit(1);
    
    if (!result) return undefined;
    
    return {
      ...result,
      customRole: result.customRole?.id ? result.customRole : null
    };
  }

  async getUserById(id: number): Promise<UserWithRole | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        passwordHash: users.passwordHash,
        systemRole: users.systemRole,
        customRoleId: users.customRoleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
        customRole: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystemRole: roles.isSystemRole,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        }
      })
      .from(users)
      .leftJoin(roles, eq(users.customRoleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);
    
    if (!result) return undefined;
    
    return {
      ...result,
      customRole: result.customRole?.id ? result.customRole : null
    };
  }

  async getAllUsers(): Promise<UserWithRole[]> {
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        passwordHash: users.passwordHash,
        systemRole: users.systemRole,
        customRoleId: users.customRoleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
        customRole: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystemRole: roles.isSystemRole,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        }
      })
      .from(users)
      .leftJoin(roles, eq(users.customRoleId, roles.id))
      .orderBy(asc(users.createdAt));
    
    return results.map(result => ({
      ...result,
      customRole: result.customRole?.id ? result.customRole : null
    }));
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

  async verifyUserPassword(username: string, password: string): Promise<UserWithRole | null> {
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
        systemRole: user.systemRole,
        customRoleId: user.customRoleId
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  verifyJWT(token: string): { id: number; username: string; systemRole: string; customRoleId?: number } | null {
    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const decoded = jwt.verify(token, secret) as { id: number; username: string; systemRole: string; customRoleId?: number };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Role management methods
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(asc(roles.name));
  }

  async getRole(id: number): Promise<RoleWithDatasets | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) return undefined;

    // Get associated datasets
    const roleDatasetList = await db
      .select({
        dataset: {
          id: datasets.id,
          name: datasets.name,
          source: datasets.source,
          topLevelFolder: datasets.topLevelFolder,
          format: datasets.format,
          size: datasets.size,
          sizeBytes: datasets.sizeBytes,
          lastModified: datasets.lastModified,
          createdDate: datasets.createdDate,
          status: datasets.status,
          metadata: datasets.metadata,
          insights: datasets.insights,
          downloadCountSample: datasets.downloadCountSample,
          downloadCountFull: datasets.downloadCountFull,
          downloadCountMetadata: datasets.downloadCountMetadata,
        }
      })
      .from(roleDatasets)
      .innerJoin(datasets, eq(roleDatasets.datasetId, datasets.id))
      .where(eq(roleDatasets.roleId, id));

    return {
      ...role,
      datasets: roleDatasetList.map(item => item.dataset),
      datasetCount: roleDatasetList.length
    };
  }

  async getRoleByName(name: string): Promise<RoleWithDatasets | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    if (!role) return undefined;

    return this.getRole(role.id);
  }

  async createRole(roleData: CreateRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values({
        name: roleData.name,
        description: roleData.description,
        isSystemRole: false,
      })
      .returning();

    // Add dataset associations if provided
    if (roleData.datasetIds && roleData.datasetIds.length > 0) {
      const roleDatasetValues = roleData.datasetIds.map(datasetId => ({
        roleId: role.id,
        datasetId,
      }));
      await db.insert(roleDatasets).values(roleDatasetValues);
    }

    return role;
  }

  async updateRole(id: number, updates: UpdateRole): Promise<Role | undefined> {
    const [role] = await db
      .update(roles)
      .set({
        name: updates.name,
        description: updates.description,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    if (!role) return undefined;

    // Update dataset associations if provided
    if (updates.datasetIds !== undefined) {
      // Remove existing associations
      await db.delete(roleDatasets).where(eq(roleDatasets.roleId, id));
      
      // Add new associations
      if (updates.datasetIds.length > 0) {
        const roleDatasetValues = updates.datasetIds.map(datasetId => ({
          roleId: id,
          datasetId,
        }));
        await db.insert(roleDatasets).values(roleDatasetValues);
      }
    }

    return role;
  }

  async deleteRole(id: number): Promise<boolean> {
    // Check if role is a system role
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role || role.isSystemRole) {
      return false; // Cannot delete system roles
    }

    // Remove users assigned to this role
    await db
      .update(users)
      .set({ customRoleId: null })
      .where(eq(users.customRoleId, id));

    // Delete the role (cascade will handle role_datasets)
    const result = await db.delete(roles).where(eq(roles.id, id));
    return (result.rowCount || 0) > 0;
  }

  async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        customRoleId: roleId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async removeRoleFromUser(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        customRoleId: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async addDatasetToRole(roleId: number, datasetId: number): Promise<void> {
    await db
      .insert(roleDatasets)
      .values({ roleId, datasetId })
      .onConflictDoNothing();
  }

  async removeDatasetFromRole(roleId: number, datasetId: number): Promise<void> {
    await db
      .delete(roleDatasets)
      .where(and(
        eq(roleDatasets.roleId, roleId),
        eq(roleDatasets.datasetId, datasetId)
      ));
  }

  async getUserAccessibleDatasetIds(userId: number): Promise<number[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];

    // If user is admin, return all dataset IDs (bypass all role restrictions)
    if (user.systemRole === 'admin') {
      const allDatasets = await db.select({ id: datasets.id }).from(datasets);
      return allDatasets.map(d => d.id);
    }

    // For non-admin users: if they have no custom role, return all dataset IDs (full access)
    if (!user.customRoleId) {
      const allDatasets = await db.select({ id: datasets.id }).from(datasets);
      return allDatasets.map(d => d.id);
    }

    // For non-admin users with custom roles: return only accessible dataset IDs
    const accessibleDatasets = await db
      .select({ id: roleDatasets.datasetId })
      .from(roleDatasets)
      .where(eq(roleDatasets.roleId, user.customRoleId));

    return accessibleDatasets.map(d => d.id);
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
