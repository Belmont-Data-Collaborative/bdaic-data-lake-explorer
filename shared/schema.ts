import { pgTable, text, serial, integer, boolean, jsonb, timestamp, bigint } from "drizzle-orm/pg-core";
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
});

export const awsConfig = pgTable("aws_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Default"),
  bucketName: text("bucket_name").notNull(),
  region: text("region").notNull().default("us-west-2"),
  isConnected: boolean("is_connected").default(false),
  lastConnected: timestamp("last_connected"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const authConfig = pgTable("auth_config", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const refreshLog = pgTable("refresh_log", {
  id: serial("id").primaryKey(),
  lastRefreshTime: timestamp("last_refresh_time").notNull().defaultNow(),
  datasetsCount: integer("datasets_count").notNull().default(0),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
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