# Shared Modules Documentation

## Overview

The shared modules (`shared/schema.ts` and `shared/validation.ts`) form the foundation of type safety and data validation across the entire Data Lake Explorer application. They provide consistent type definitions, database schemas, and validation rules that are used by both frontend and backend components.

## Architecture Principles

- **Type Safety**: All data structures are strongly typed using TypeScript and Zod
- **Single Source of Truth**: Schema definitions are centralized and shared between frontend/backend
- **Validation at Boundaries**: Input validation occurs at API boundaries and form submissions
- **Database-First Design**: Database schemas drive the application's type system
- **Compile-Time Safety**: TypeScript ensures type consistency across the entire application

---

## Schema Definition (`shared/schema.ts`)

### Overview

The schema module defines the complete database structure using Drizzle ORM and generates TypeScript types for type-safe database operations. It serves as the central source of truth for all data structures in the application.

### Core Dependencies

```typescript
import { pgTable, text, serial, integer, boolean, jsonb, timestamp, bigint, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
```

### Database Tables

#### 1. Datasets Table

The core table storing dataset metadata and information.

```typescript
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
  // Performance indexes for common query patterns
  topLevelFolderIdx: index("idx_datasets_top_level_folder").on(table.topLevelFolder),
  formatIdx: index("idx_datasets_format").on(table.format),
  statusIdx: index("idx_datasets_status").on(table.status),
  folderFormatIdx: index("idx_datasets_folder_format").on(table.topLevelFolder, table.format),
  nameIdx: index("idx_datasets_name").on(table.name),
  sourceIdx: index("idx_datasets_source").on(table.source),
  lastModifiedIdx: index("idx_datasets_last_modified").on(table.lastModified),
  sizeBytesIdx: index("idx_datasets_size_bytes").on(table.sizeBytes),
}));
```

**Key Features:**
- **JSONB Fields**: `metadata` and `insights` store complex structured data
- **Download Tracking**: Separate counters for different download types
- **Performance Optimization**: Comprehensive indexing strategy for fast queries
- **Flexible Status**: Status field allows for dataset lifecycle management

#### 2. Users Table

Manages user accounts, authentication, and permissions.

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // 'user', 'admin'
  isActive: boolean("is_active").notNull().default(true),
  isAiEnabled: boolean("is_ai_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (table) => ({
  usernameIdx: index("idx_users_username").on(table.username),
  emailIdx: index("idx_users_email").on(table.email),
  roleIdx: index("idx_users_role").on(table.role),
  isActiveIdx: index("idx_users_is_active").on(table.isActive),
}));
```

**Key Features:**
- **Role-Based Access**: Supports user and admin roles
- **AI Feature Toggle**: Per-user AI feature control
- **Account Management**: Active/inactive status for user management
- **Audit Trail**: Creation, update, and last login timestamps

#### 3. AWS Configuration Table

Stores AWS S3 connection settings and status.

```typescript
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
  isActiveIdx: index("idx_aws_config_is_active").on(table.isActive),
  isConnectedIdx: index("idx_aws_config_is_connected").on(table.isConnected),
}));
```

#### 4. User Folder Access Table

Manages granular folder-level permissions for users.

```typescript
export const userFolderAccess = pgTable("user_folder_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  folderName: text("folder_name").notNull(),
  canAccess: boolean("can_access").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  userIdIdx: index("idx_user_folder_access_user_id").on(table.userId),
  folderNameIdx: index("idx_user_folder_access_folder_name").on(table.folderName),
  userFolderIdx: index("idx_user_folder_access_user_folder").on(table.userId, table.folderName),
  uniqueUserFolder: index("unique_user_folder").on(table.userId, table.folderName),
}));
```

**Key Features:**
- **Foreign Key Relationships**: Links to users table with cascade deletion
- **Granular Permissions**: Per-folder access control
- **Audit Trail**: Tracks who created the access rule
- **Unique Constraints**: Prevents duplicate access records

#### 5. AI Feature Management Tables

##### Folder AI Settings
```typescript
export const folderAiSettings = pgTable("folder_ai_settings", {
  id: serial("id").primaryKey(),
  folderName: text("folder_name").notNull().unique(),
  isAiEnabled: boolean("is_ai_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
});
```

##### AI Usage Logging
```typescript
export const aiUsageLog = pgTable("ai_usage_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  datasetId: integer("dataset_id").references(() => datasets.id, { onDelete: "set null" }),
  usageType: text("usage_type").notNull(), // 'ask_ai', 'generate_insights', 'multi_chat'
  query: text("query"), // The user's question/prompt
  responseReceived: boolean("response_received").notNull().default(false),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});
```

#### 6. Supporting Tables

##### Downloads Tracking
```typescript
export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  downloadType: text("download_type").notNull(), // 'sample', 'full', 'metadata'
  downloadedAt: timestamp("downloaded_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});
```

##### System Refresh Logging
```typescript
export const refreshLog = pgTable("refresh_log", {
  id: serial("id").primaryKey(),
  lastRefreshTime: timestamp("last_refresh_time").notNull().defaultNow(),
  datasetsCount: integer("datasets_count").notNull().default(0),
});
```

##### Authentication Configuration
```typescript
export const authConfig = pgTable("auth_config", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Type Generation with Drizzle-Zod

#### Insert Schemas

The application uses `createInsertSchema` from `drizzle-zod` to automatically generate Zod validation schemas from Drizzle table definitions:

```typescript
// Example: Dataset insert schema
export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true, // Auto-generated, omit from inserts
});

// Example: User insert schema
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,    // Auto-generated timestamps
  updatedAt: true,
  lastLoginAt: true,
});
```

#### Custom Schemas

For complex operations, custom Zod schemas are defined:

```typescript
// User registration with password confirmation
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

// Update operations with optional fields
export const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.boolean().optional(),
});
```

#### Complex Data Schemas

For JSONB fields, detailed Zod schemas define the structure:

```typescript
// Dataset metadata structure
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
  // YAML metadata support
  title: z.string().optional(),
  description: z.string().optional(),
  license: z.string().optional(),
  version: z.string().optional(),
  yamlMetadata: z.record(z.any()).optional(),
  // Enhanced fields
  completenessScore: z.number().optional(),
  fileSizeBytes: z.number().optional(),
  intendedUseCase: z.string().optional(),
  targetAudiences: z.array(z.string()).optional(),
});

// Dataset insights structure
export const datasetInsights = z.object({
  summary: z.string(),
  patterns: z.array(z.string()),
  useCases: z.array(z.string()),
});
```

### TypeScript Type Exports

All database operations use strongly-typed interfaces:

```typescript
// Select types (for reading from database)
export type Dataset = typeof datasets.$inferSelect;
export type User = typeof users.$inferSelect;
export type AwsConfig = typeof awsConfig.$inferSelect;

// Insert types (for writing to database)
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;

// Complex data types
export type DatasetMetadata = z.infer<typeof datasetMetadata>;
export type DatasetInsights = z.infer<typeof datasetInsights>;
```

---

## Validation System (`shared/validation.ts`)

### Overview

The validation module provides comprehensive input validation using Zod schemas. It handles form validation, API request validation, and data integrity checks across the application.

### Base Validation Schemas

#### Password Validation
```typescript
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters');
```

#### AWS-Specific Validation
```typescript
export const bucketNameSchema = z.string()
  .min(3, 'Bucket name must be at least 3 characters')
  .max(63, 'Bucket name must be less than 63 characters')
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 'Invalid bucket name format');

export const awsRegionSchema = z.string()
  .min(2, 'Region must be specified')
  .regex(/^[a-z0-9-]+$/, 'Invalid AWS region format');
```

### Authentication Schemas

#### Login and Registration
```typescript
export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

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
```

#### Password Management
```typescript
export const setPasswordSchema = z.object({
  currentPassword: passwordSchema.optional(),
  newPassword: passwordSchema
});
```

### AWS Configuration Schemas

```typescript
export const awsConfigInsertSchema = createInsertSchema(awsConfig, {
  bucketName: bucketNameSchema,
  region: awsRegionSchema,
  name: z.string().min(1, 'Configuration name is required').max(100, 'Name too long')
}).omit({ id: true, createdAt: true, lastConnected: true });

export const awsConfigUpdateSchema = awsConfigInsertSchema.partial();

export const testAwsConnectionSchema = z.object({
  bucketName: bucketNameSchema,
  region: awsRegionSchema
});
```

### Dataset Operation Schemas

#### Query Parameters
```typescript
export const datasetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(50),
  folder: z.string().optional(),
  search: z.string().optional(),
  format: z.string().optional()
});
```

#### AI Chat Integration
```typescript
export const datasetChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).default([]),
  enableVisualization: z.boolean().default(false)
});
```

#### Bulk Operations
```typescript
export const bulkInsightsSchema = z.object({
  datasetIds: z.array(z.number().int().positive()).optional(),
  forceRegenerate: z.boolean().default(false)
});
```

### Form Validation Schemas

#### Frontend Form Validation
```typescript
export const datasetSearchFormSchema = z.object({
  searchTerm: z.string().max(500, 'Search term too long'),
  formatFilter: z.string().optional(),
  folderFilter: z.string().optional()
});

export const aiChatFormSchema = z.object({
  message: z.string()
    .min(1, 'Please enter a message')
    .max(2000, 'Message must be less than 2000 characters')
    .trim(),
  includeContext: z.boolean().default(true),
  enableVisualization: z.boolean().default(false)
});
```

### API Response Schemas

#### Error Response Structure
```typescript
export const apiErrorSchema = z.object({
  message: z.string(),
  errors: z.array(z.string()).optional(),
  code: z.string().optional()
});
```

#### Paginated Response Pattern
```typescript
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    totalCount: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative()
  });
```

#### Statistics API Response
```typescript
export const statsResponseSchema = z.object({
  totalDatasets: z.number().int().nonnegative(),
  totalSize: z.string(),
  dataSources: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
  lastRefreshTime: z.string().datetime().optional(),
  totalCommunityDataPoints: z.number().int().nonnegative()
});
```

### Validation Utility Functions

#### Generic Validation Helper
```typescript
export function validateRequest<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed']
    };
  }
}
```

#### Express.js Middleware Factory
```typescript
export function createApiValidator<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const validation = validateRequest(schema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    req.validatedBody = validation.data;
    next();
  };
}
```

---

## Usage Patterns

### Frontend Usage

#### Type-Safe API Calls
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dataset, InsertDataset, DatasetQuery } from '@/shared/schema';
import { datasetQuerySchema } from '@/shared/validation';

// Type-safe query with validation
const { data, isLoading } = useQuery<Dataset[]>({
  queryKey: ['/api/datasets', queryParams],
  enabled: !!queryParams
});

// Type-safe mutation
const createDataset = useMutation<Dataset, Error, InsertDataset>({
  mutationFn: (data) => apiRequest('/api/datasets', { method: 'POST', body: data }),
});
```

#### Form Validation with React Hook Form
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { aiChatFormSchema, AiChatForm } from '@/shared/validation';

const form = useForm<AiChatForm>({
  resolver: zodResolver(aiChatFormSchema),
  defaultValues: {
    message: '',
    includeContext: true,
    enableVisualization: false
  }
});
```

### Backend Usage

#### Express Route with Validation
```typescript
import { createApiValidator } from '@/shared/validation';
import { insertDatasetSchema, InsertDataset } from '@/shared/schema';

app.post('/api/datasets', 
  createApiValidator(insertDatasetSchema),
  async (req, res) => {
    const datasetData: InsertDataset = req.validatedBody;
    // Type-safe database operation
    const result = await storage.createDataset(datasetData);
    res.json(result);
  }
);
```

#### Database Operations with Type Safety
```typescript
import { Dataset, InsertDataset, UpdateDataset } from '@/shared/schema';

class DatasetStorage {
  async getDatasets(query: DatasetQuery): Promise<Dataset[]> {
    // Drizzle ORM operations with full type safety
    return await db.select().from(datasets)
      .where(query.folder ? eq(datasets.topLevelFolder, query.folder) : undefined)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
  }

  async createDataset(data: InsertDataset): Promise<Dataset> {
    const [result] = await db.insert(datasets).values(data).returning();
    return result;
  }
}
```

---

## Type Safety Architecture

### Compile-Time Guarantees

1. **Database Schema Consistency**: Drizzle ORM ensures database schema matches TypeScript types
2. **API Contract Enforcement**: Zod schemas validate all inputs at runtime
3. **Frontend-Backend Type Alignment**: Shared types ensure consistency across layers
4. **Form Validation**: React Hook Form with Zod resolvers provide type-safe form handling

### Runtime Validation

1. **Input Sanitization**: All external inputs are validated using Zod schemas
2. **Error Reporting**: Validation errors provide detailed, user-friendly messages
3. **Type Coercion**: Automatic type conversion where appropriate (e.g., string to number for query params)
4. **Custom Validation Rules**: Complex business logic validation using Zod refinements

### Development Benefits

1. **Autocomplete**: Full IDE support for all data structures
2. **Refactoring Safety**: Type system catches breaking changes at compile time
3. **Documentation**: Types serve as living documentation of data structures
4. **Testing**: Type-safe mocking and test data generation

---

## Best Practices

### Schema Design

1. **Normalize Data**: Use foreign keys and relationships appropriately
2. **Index Strategy**: Create indexes for common query patterns
3. **JSONB Usage**: Use for flexible, structured data that doesn't need normalization
4. **Migration Safety**: Always use Drizzle's migration system, never manual SQL

### Validation Patterns

1. **Validate Early**: Validate inputs at system boundaries
2. **Meaningful Errors**: Provide clear, actionable error messages
3. **Type Coercion**: Use `z.coerce` for automatic type conversion when safe
4. **Business Logic**: Use Zod refinements for complex validation rules

### Type Safety

1. **Strict Mode**: Always use TypeScript strict mode
2. **No Any Types**: Avoid `any` types; use proper type definitions
3. **Inference**: Let TypeScript infer types where possible
4. **Union Types**: Use discriminated unions for polymorphic data

---

## Future Considerations

### Planned Enhancements

1. **Database Migrations**: Automated migration system with Drizzle Kit
2. **Performance Monitoring**: Database query performance tracking
3. **Data Validation**: Enhanced JSONB schema validation
4. **Audit Logging**: Comprehensive audit trail for all data changes

### Scalability Considerations

1. **Index Optimization**: Regular index performance analysis
2. **Query Optimization**: Monitor and optimize common query patterns
3. **Schema Evolution**: Planned approach for schema changes
4. **Data Archival**: Strategy for managing large dataset volumes