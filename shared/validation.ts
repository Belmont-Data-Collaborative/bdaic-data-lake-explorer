import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { awsConfig } from './schema';

// Base validation schemas
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters');

export const bucketNameSchema = z.string()
  .min(3, 'Bucket name must be at least 3 characters')
  .max(63, 'Bucket name must be less than 63 characters')
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 'Invalid bucket name format');

export const awsRegionSchema = z.string()
  .min(2, 'Region must be specified')
  .regex(/^[a-z0-9-]+$/, 'Invalid AWS region format');

// Authentication schemas
export const loginSchema = z.object({
  password: passwordSchema
});

export const setPasswordSchema = z.object({
  currentPassword: passwordSchema.optional(),
  newPassword: passwordSchema
});

// AWS Configuration schemas
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

// Dataset schemas
export const datasetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(50),
  folder: z.string().optional(),
  search: z.string().optional(),
  format: z.string().optional()
});

export const datasetChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).default([]),
  enableVisualization: z.boolean().default(false)
});

export const bulkInsightsSchema = z.object({
  datasetIds: z.array(z.number().int().positive()).optional(),
  forceRegenerate: z.boolean().default(false)
});

// Form validation schemas with enhanced rules
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

// API Response schemas for type safety
export const apiErrorSchema = z.object({
  message: z.string(),
  errors: z.array(z.string()).optional(),
  code: z.string().optional()
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    totalCount: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative()
  });

export const statsResponseSchema = z.object({
  totalDatasets: z.number().int().nonnegative(),
  totalSize: z.string(),
  dataSources: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
  lastRefreshTime: z.string().datetime().optional(),
  totalCommunityDataPoints: z.number().int().nonnegative()
});

// Export inferred types
export type LoginRequest = z.infer<typeof loginSchema>;
export type SetPasswordRequest = z.infer<typeof setPasswordSchema>;
export type AwsConfigInsert = z.infer<typeof awsConfigInsertSchema>;
export type AwsConfigUpdate = z.infer<typeof awsConfigUpdateSchema>;
export type TestAwsConnectionRequest = z.infer<typeof testAwsConnectionSchema>;
export type DatasetQuery = z.infer<typeof datasetQuerySchema>;
export type DatasetChatRequest = z.infer<typeof datasetChatSchema>;
export type BulkInsightsRequest = z.infer<typeof bulkInsightsSchema>;
export type DatasetSearchForm = z.infer<typeof datasetSearchFormSchema>;
export type AiChatForm = z.infer<typeof aiChatFormSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
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