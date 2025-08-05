import { 
  datasets, awsConfig, authConfig, refreshLog, downloads, users, roles, roleDatasets, userRoles, roleFolders,
  type Dataset, type InsertDataset, type AwsConfig, type InsertAwsConfig, 
  type AuthConfig, type InsertAuthConfig, type RefreshLog, type InsertRefreshLog, 
  type Download, type InsertDownload, type User, type InsertUser, type UpdateUser,
  type Role, type InsertRole, type RoleDataset, type InsertRoleDataset,
  type UserRole, type InsertUserRole, type RoleFolder, type InsertRoleFolder
} from "@shared/schema";
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
  
  // User management operations
  createUser(userData: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: UpdateUser): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;
  updateLastLogin(userId: number): Promise<void>;
  
  // Role management operations
  createRole(roleData: InsertRole): Promise<Role>;
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  updateRole(id: number, updates: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<boolean>;
  
  // Role-Dataset assignment operations
  assignDatasetToRole(roleId: number, datasetId: number): Promise<RoleDataset>;
  removeDatasetFromRole(roleId: number, datasetId: number): Promise<boolean>;
  getDatasetsForRole(roleId: number): Promise<Dataset[]>;
  getRolesForDataset(datasetId: number): Promise<Role[]>;
  
  // User-Role assignment operations
  assignUserToRole(userId: number, roleId: number, assignedBy: number): Promise<UserRole>;
  removeUserFromRole(userId: number, roleId: number): Promise<boolean>;
  getRolesForUser(userId: number): Promise<Role[]>;
  getUsersForRole(roleId: number): Promise<User[]>;
  
  // Role-Folder assignment operations
  assignFolderToRole(roleId: number, folderName: string): Promise<RoleFolder>;
  removeFolderFromRole(roleId: number, folderName: string): Promise<boolean>;
  getFoldersForRole(roleId: number): Promise<string[]>;
  getRolesForFolder(folderName: string): Promise<Role[]>;
  
  // Access control operations
  userHasAccessToDataset(userId: number, datasetId: number): Promise<boolean>;
  getDatasetsForUser(userId: number): Promise<Dataset[]>;
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
    console.log(`Verifying password for username: "${username}"`);
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      console.log(`User not found for username: "${username}"`);
      return null;
    }
    
    if (!user.isActive) {
      console.log(`User inactive for username: "${username}" (ID: ${user.id})`);
      return null;
    }
    
    console.log(`Found user: ID=${user.id}, username="${user.username}", role="${user.role}"`);
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isValid) {
      console.log(`Password verification SUCCESS for user: ${user.id} (${user.username})`);
      return user;
    } else {
      console.log(`Password verification FAILED for user: ${user.id} (${user.username})`);
      return null;
    }
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  generateJWT(user: User): string {
    // Use a consistent secret - critical for preventing token mismatch
    const secret = process.env.JWT_SECRET || 'data-lake-explorer-jwt-secret-2025-unique-key-abc123';
    const payload = { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    };
    console.log(`JWT generation: Creating token for user:`, payload);
    console.log(`JWT generation: Using secret length: ${secret.length}`);
    const token = jwt.sign(payload, secret, { expiresIn: '24h', algorithm: 'HS256' });
    console.log(`JWT generation: Token created successfully for user ${user.id} (${user.username})`);
    
    // Immediate verification test to ensure consistency
    const testVerify = this.verifyJWT(token);
    if (!testVerify || testVerify.id !== user.id) {
      console.log(`JWT generation: CRITICAL - Token verification failed immediately after creation!`);
      console.log(`JWT generation: Expected user ${user.id}, got ${testVerify?.id || 'null'}`);
    } else {
      console.log(`JWT generation: Token verification test passed`);
    }
    
    return token;
  }

  verifyJWT(token: string): { id: number; username: string; role: string } | null {
    try {
      // Use the same consistent secret
      const secret = process.env.JWT_SECRET || 'data-lake-explorer-jwt-secret-2025-unique-key-abc123';
      console.log(`JWT verification: Using secret length: ${secret.length}`);
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { id: number; username: string; role: string };
      console.log(`JWT verification: Token decoded to user ID=${decoded.id}, username="${decoded.username}", role="${decoded.role}"`);
      return decoded;
    } catch (error) {
      console.log(`JWT verification failed:`, error);
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

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Role management operations
  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(roleData)
      .returning();
    return role;
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);
    return role || undefined;
  }

  async getAllRoles(): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .orderBy(asc(roles.name));
  }

  async updateRole(id: number, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db
      .update(roles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRole(id: number): Promise<boolean> {
    const result = await db
      .delete(roles)
      .where(eq(roles.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Role-Dataset assignment operations
  async assignDatasetToRole(roleId: number, datasetId: number): Promise<RoleDataset> {
    const [assignment] = await db
      .insert(roleDatasets)
      .values({ roleId, datasetId })
      .returning();
    return assignment;
  }

  async removeDatasetFromRole(roleId: number, datasetId: number): Promise<boolean> {
    const result = await db
      .delete(roleDatasets)
      .where(and(
        eq(roleDatasets.roleId, roleId),
        eq(roleDatasets.datasetId, datasetId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async getDatasetsForRole(roleId: number): Promise<Dataset[]> {
    const results = await db
      .select({ dataset: datasets })
      .from(roleDatasets)
      .innerJoin(datasets, eq(roleDatasets.datasetId, datasets.id))
      .where(eq(roleDatasets.roleId, roleId));
    return results.map(r => r.dataset);
  }

  async getRolesForDataset(datasetId: number): Promise<Role[]> {
    const results = await db
      .select({ role: roles })
      .from(roleDatasets)
      .innerJoin(roles, eq(roleDatasets.roleId, roles.id))
      .where(eq(roleDatasets.datasetId, datasetId));
    return results.map(r => r.role);
  }

  // User-Role assignment operations
  async assignUserToRole(userId: number, roleId: number, assignedBy: number): Promise<UserRole> {
    // For single role per user, first remove any existing roles
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    
    // Then insert the new role assignment
    const [assignment] = await db
      .insert(userRoles)
      .values({ userId, roleId, assignedBy })
      .returning();
    return assignment;
  }

  async removeUserFromRole(userId: number, roleId: number): Promise<boolean> {
    const result = await db
      .delete(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async getRolesForUser(userId: number): Promise<Role[]> {
    const results = await db
      .select({ role: roles })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return results.map(r => r.role);
  }

  async getUsersForRole(roleId: number): Promise<User[]> {
    const results = await db
      .select({ user: users })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(eq(userRoles.roleId, roleId));
    return results.map(r => r.user);
  }

  // Role-Folder assignment operations
  async assignFolderToRole(roleId: number, folderName: string): Promise<RoleFolder> {
    const [assignment] = await db
      .insert(roleFolders)
      .values({ roleId, folderName })
      .returning();
    return assignment;
  }

  async removeFolderFromRole(roleId: number, folderName: string): Promise<boolean> {
    const result = await db
      .delete(roleFolders)
      .where(and(
        eq(roleFolders.roleId, roleId),
        eq(roleFolders.folderName, folderName)
      ));
    return (result.rowCount || 0) > 0;
  }

  async getFoldersForRole(roleId: number): Promise<string[]> {
    console.log(`DatabaseStorage.getFoldersForRole called with roleId: ${roleId}`);
    const results = await db
      .select({ folderName: roleFolders.folderName })
      .from(roleFolders)
      .where(eq(roleFolders.roleId, roleId));
    console.log(`Found ${results.length} folders for role ${roleId}:`, results);
    return results.map(r => r.folderName);
  }

  async getRolesForFolder(folderName: string): Promise<Role[]> {
    const results = await db
      .select({ role: roles })
      .from(roleFolders)
      .innerJoin(roles, eq(roleFolders.roleId, roles.id))
      .where(eq(roleFolders.folderName, folderName));
    return results.map(r => r.role);
  }

  // Access control operations
  async userHasAccessToDataset(userId: number, datasetId: number): Promise<boolean> {
    // Check if user is admin - admins have access to all datasets
    const user = await this.getUserById(userId);
    if (user?.role === 'admin') {
      return true;
    }

    // Check if user has access through their roles
    const result = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(userRoles)
      .innerJoin(roleDatasets, eq(userRoles.roleId, roleDatasets.roleId))
      .where(and(
        eq(userRoles.userId, userId),
        eq(roleDatasets.datasetId, datasetId)
      ));
    
    return (result[0]?.count || 0) > 0;
  }

  async getDatasetsForUser(userId: number): Promise<Dataset[]> {
    // Check if user is admin - admins see all datasets
    const user = await this.getUserById(userId);
    console.log(`getDatasetsForUser: user ${userId} has role: ${user?.role}`);
    
    if (user?.role === 'admin') {
      console.log(`Admin user detected - returning all datasets`);
      const allDatasets = await this.getDatasets();
      console.log(`Returning ${allDatasets.length} datasets for admin user`);
      return allDatasets;
    }
    
    console.log(`Regular user detected - applying role-based filtering`);

    // Get datasets through user's roles (both direct dataset assignments and folder-based access)
    const directDatasets = await db
      .selectDistinct({ dataset: datasets })
      .from(userRoles)
      .innerJoin(roleDatasets, eq(userRoles.roleId, roleDatasets.roleId))
      .innerJoin(datasets, eq(roleDatasets.datasetId, datasets.id))
      .where(eq(userRoles.userId, userId));

    const folderDatasets = await db
      .selectDistinct({ dataset: datasets })
      .from(userRoles)
      .innerJoin(roleFolders, eq(userRoles.roleId, roleFolders.roleId))
      .innerJoin(datasets, eq(roleFolders.folderName, datasets.topLevelFolder))
      .where(eq(userRoles.userId, userId));

    // Combine and deduplicate datasets
    const allDatasets = [...directDatasets, ...folderDatasets];
    const uniqueDatasets = allDatasets.filter((dataset, index, self) => 
      index === self.findIndex(d => d.dataset.id === dataset.dataset.id)
    ).map(r => r.dataset);

    // Sort by source and name
    uniqueDatasets.sort((a, b) => {
      if (a.source === b.source) {
        return a.name.localeCompare(b.name);
      }
      return a.source.localeCompare(b.source);
    });
    
    return uniqueDatasets;
  }
}

export const storage = new DatabaseStorage();
