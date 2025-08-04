import { pgTable, text, serial, integer, boolean, jsonb, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  topLevelFolder: text("top_level_folder"),
  format: text("format").notNull(),
  size: text("size").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  lastModified: timestamp("last_modified").notNull(),
  createdDate: timestamp("created_date").notNull(),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  insights: jsonb("insights"),
  downloadCountSample: integer("download_count_sample").notNull().default(0),
  downloadCountFull: integer("download_count_full").notNull().default(0),
  downloadCountMetadata: integer("download_count_metadata").notNull().default(0),
}, (table) => ({
  // Index on top_level_folder for fast folder filtering
  topLevelFolderIdx: index("idx_datasets_top_level_folder").on(table.topLevelFolder),
  // Index on format for format filtering
  formatIdx: index("idx_datasets_format").on(table.format),
  // Index on status for active/inactive filtering
  statusIdx: index("idx_datasets_status").on(table.status),
  // Composite index for folder + format filtering (common query pattern)
  folderFormatIdx: index("idx_datasets_folder_format").on(table.topLevelFolder, table.format),
  // Index on name for text search and sorting
  nameIdx: index("idx_datasets_name").on(table.name),
  // Index on source for search and filtering
  sourceIdx: index("idx_datasets_source").on(table.source),
  // Index on lastModified for date sorting
  lastModifiedIdx: index("idx_datasets_last_modified").on(table.lastModified),
  // Index on sizeBytes for size-based sorting and filtering
  sizeBytesIdx: index("idx_datasets_size_bytes").on(table.sizeBytes),
}));

export const awsConfig = pgTable("aws_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Default"),
  bucketName: text("bucket_name").notNull(),
  region: text("region").notNull().default("us-west-2"),
  isConnected: boolean("is_connected").default(false),
  lastConnected: timestamp("last_connected"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Index on isActive for finding active configuration
  isActiveIdx: index("idx_aws_config_is_active").on(table.isActive),
  // Index on isConnected for connection status filtering
  isConnectedIdx: index("idx_aws_config_is_connected").on(table.isConnected),
}));

export const authConfig = pgTable("auth_config", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // 'user', 'admin'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (table) => ({
  // Index on username for fast user lookups
  usernameIdx: index("idx_users_username").on(table.username),
  // Index on email for email-based lookups
  emailIdx: index("idx_users_email").on(table.email),
  // Index on role for role-based queries
  roleIdx: index("idx_users_role").on(table.role),
  // Index on isActive for filtering active users
  isActiveIdx: index("idx_users_is_active").on(table.isActive),
}));

export const refreshLog = pgTable("refresh_log", {
  id: serial("id").primaryKey(),
  lastRefreshTime: timestamp("last_refresh_time").notNull().defaultNow(),
  datasetsCount: integer("datasets_count").notNull().default(0),
}, (table) => ({
  // Index on lastRefreshTime for finding most recent refreshes
  lastRefreshTimeIdx: index("idx_refresh_log_last_refresh_time").on(table.lastRefreshTime),
}));

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  downloadType: text("download_type").notNull(), // 'sample', 'full', 'metadata'
  downloadedAt: timestamp("downloaded_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => ({
  // Index on datasetId for fast lookups by dataset
  datasetIdIdx: index("idx_downloads_dataset_id").on(table.datasetId),
  // Index on downloadType for filtering by type
  downloadTypeIdx: index("idx_downloads_download_type").on(table.downloadType),
  // Index on downloadedAt for date-based queries
  downloadedAtIdx: index("idx_downloads_downloaded_at").on(table.downloadedAt),
  // Composite index for dataset + type queries
  datasetTypeIdx: index("idx_downloads_dataset_type").on(table.datasetId, table.downloadType),
}));

// New roles table for RBAC
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (table) => ({
  // Index on name for fast role lookups
  nameIdx: index("idx_roles_name").on(table.name),
}));

// Many-to-many relationship between roles and datasets
export const roleDatasets = pgTable("role_datasets", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  datasetId: integer("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate role-dataset assignments
  roleDatasetUnique: index("idx_role_dataset_unique").on(table.roleId, table.datasetId),
  // Index on roleId for fast lookups by role
  roleIdIdx: index("idx_role_datasets_role_id").on(table.roleId),
  // Index on datasetId for fast lookups by dataset
  datasetIdIdx: index("idx_role_datasets_dataset_id").on(table.datasetId),
}));

// Many-to-many relationship between users and roles
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
}, (table) => ({
  // Unique constraint to prevent duplicate user-role assignments
  userRoleUnique: index("idx_user_role_unique").on(table.userId, table.roleId),
  // Index on userId for fast lookups by user
  userIdIdx: index("idx_user_roles_user_id").on(table.userId),
  // Index on roleId for fast lookups by role
  roleIdIdx: index("idx_user_roles_role_id").on(table.roleId),
}));

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
});

export const insertDownloadSchema = createInsertSchema(downloads).omit({
  id: true,
  downloadedAt: true,
});

export const insertAwsConfigSchema = createInsertSchema(awsConfig).omit({
  id: true,
  lastConnected: true,
  createdAt: true,
});

export const insertAuthConfigSchema = createInsertSchema(authConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefreshLogSchema = createInsertSchema(refreshLog).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoleDatasetSchema = createInsertSchema(roleDatasets).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

// Registration schema with password confirmation
export const registerUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
  role: z.enum(["admin", "user"]).default("user"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Login schema
export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Update user schema
export const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type AwsConfig = typeof awsConfig.$inferSelect;
export type InsertAwsConfig = z.infer<typeof insertAwsConfigSchema>;
export type AuthConfig = typeof authConfig.$inferSelect;
export type InsertAuthConfig = z.infer<typeof insertAuthConfigSchema>;
export type RefreshLog = typeof refreshLog.$inferSelect;
export type InsertRefreshLog = z.infer<typeof insertRefreshLogSchema>;

export const datasetInsights = z.object({
  summary: z.string(),
  patterns: z.array(z.string()),
  useCases: z.array(z.string()),
});

export const datasetMetadata = z.object({
  recordCount: z.string(),
  schemaVersion: z.string().optional(),
  compression: z.string().optional(),
  columns: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    sampleValues: z.array(z.string()).optional(),
  })).optional(),
  dataSource: z.string().optional(),
  dateAccessed: z.string().optional(),
  lastModifiedDate: z.string().optional(),
  filePath: z.string().optional(),
  encoding: z.string().optional(),
  delimiter: z.string().optional(),
  hasHeader: z.boolean().optional(),
  uniqueValues: z.record(z.number()).optional(),
  tags: z.array(z.string()).optional(),
  // Additional fields for YAML metadata
  title: z.string().optional(),
  description: z.string().optional(),
  license: z.string().optional(),
  version: z.string().optional(),
  createdDate: z.string().optional(),
  lastUpdated: z.string().optional(),
  columnCount: z.number().optional(),
  yamlMetadata: z.record(z.any()).optional(), // Store the full YAML content
  // Enhanced metadata fields
  completenessScore: z.number().optional(), // Percentage of complete data fields
  fileSizeBytes: z.number().optional(), // File size in bytes for detailed metadata view
  // Usage metadata
  intendedUseCase: z.string().optional(),
  targetAudiences: z.array(z.string()).optional(),
});

export type DatasetInsights = z.infer<typeof datasetInsights>;
export type DatasetMetadata = z.infer<typeof datasetMetadata>;
export type Download = typeof downloads.$inferSelect;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type RoleDataset = typeof roleDatasets.$inferSelect;
export type InsertRoleDataset = z.infer<typeof insertRoleDatasetSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;