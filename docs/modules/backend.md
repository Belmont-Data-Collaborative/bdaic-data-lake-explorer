# Backend Module Documentation

The Data Lake Explorer backend is built with Node.js and TypeScript, utilizing Express.js for the web server framework. This document provides comprehensive coverage of all backend modules, their responsibilities, and architectural relationships.

## Overview

The backend follows a layered architecture pattern with clear separation of concerns:

- **Server Layer**: Core Express server setup and request handling
- **API Layer**: RESTful routes and business logic
- **Data Layer**: Storage interface and database operations  
- **Middleware Layer**: Authentication, authorization, and performance monitoring
- **Service Layer**: External integrations (AWS, OpenAI) and specialized services
- **Development Layer**: Vite integration for development workflow

## Core Server Architecture

### server/index.ts - Main Server Entry Point

**Primary Responsibilities:**
- Express server initialization and configuration
- Middleware registration and request pipeline setup
- HTTP compression optimization
- Static asset serving with cache headers
- Error handling and logging
- Development/production environment switching

**Key Features:**
```typescript
// HTTP compression with optimized settings
app.use(compression({
  threshold: 1024,
  level: 9,
  filter: (req, res) => !req.headers['x-no-compression']
}));

// Cache headers for static assets (1 year)
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
  next();
});
```

**Dependencies:**
- Express.js for web server framework
- compression middleware for response optimization
- Performance monitoring middleware
- Vite integration for development

### server/routes.ts - API Routes and Business Logic

**Primary Responsibilities:**
- RESTful API endpoint definitions
- Request validation using Zod schemas
- Business logic orchestration
- Authentication and authorization enforcement
- Response caching and optimization
- Integration with external services

**Core API Endpoints:**

#### Dataset Management
```typescript
// Example: Get all datasets with caching (illustrative)
app.get("/api/datasets", async (req, res) => {
  const cached = getCached<Dataset[]>('datasets');
  if (cached) return res.json(cached);
  
  const datasets = await storage.getDatasets();
  setCache('datasets', datasets);
  res.json(datasets);
});
```

#### AWS Configuration
```typescript
// Example: AWS configuration with validation (illustrative)
app.post("/api/aws-config", authenticateToken, requireAdmin, async (req, res) => {
  const validation = insertAwsConfigSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ message: "Invalid configuration data" });
  }
  
  const config = await storage.upsertAwsConfig(validation.data);
  res.json(config);
});
```

#### User Management
```typescript
// Example: User creation with role-based access (illustrative)
app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  const validation = adminCreateUserSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ message: "Invalid user data" });
  }
  
  const hashedPassword = await bcrypt.hash(validation.data.password, 10);
  const user = await storage.createUser({
    ...validation.data,
    passwordHash: hashedPassword
  });
  res.json(user);
});
```

**Caching System:**
- In-memory cache with TTL support
- Cache invalidation patterns
- Performance optimization for expensive operations
- Automatic cache warming on startup

**Dependencies:**
- Storage interface for data operations
- AWS S3 service for data retrieval
- OpenAI service for AI insights
- Authentication middleware
- Zod for request validation

### server/storage.ts - Data Access Layer

**Primary Responsibilities:**
- Database abstraction interface (IStorage)
- CRUD operations for all entities
- Complex queries and data aggregation
- JWT token generation and verification (used by middleware)
- Password hashing and verification
- User session management

**Core Storage Interface:**
```typescript
// Actual interface from server/storage.ts (lines 20-96)
export interface IStorage {
  // Dataset operations
  getDatasets(): Promise<Dataset[]>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(id: number, dataset: Partial<InsertDataset>): Promise<Dataset | undefined>;
  upsertDataset(dataset: InsertDataset): Promise<Dataset>;

  // User management with JWT support
  createUser(userData: InsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;
  generateJWT(user: User): string;  // Line 73 - provides JWT logic
  verifyJWT(token: string): { id: number; username: string; role: string } | null; // Line 74 - JWT validation

  // AWS configuration
  getAwsConfig(): Promise<AwsConfig | undefined>;
  upsertAwsConfig(config: InsertAwsConfig): Promise<AwsConfig>;

  // Analytics and tracking
  recordDownload(datasetId: number, downloadType: 'sample' | 'full' | 'metadata'): Promise<Download>;
  getDownloadStats(datasetId: number): Promise<DownloadStats>;
  // ... additional methods (see full interface for complete list)
}
```

**Key Implementation Features:**
- Drizzle ORM integration with PostgreSQL
- Batch operations for performance optimization
- Complex aggregations for analytics
- JWT token generation and validation
- bcrypt password hashing

**Dependencies:**
- Drizzle ORM for database operations
- bcrypt for password hashing
- jsonwebtoken for JWT management
- Shared schema definitions

### server/db.ts - Database Connection

**Primary Responsibilities:**
- PostgreSQL connection setup using Neon serverless
- Drizzle ORM configuration
- WebSocket support for real-time capabilities
- Environment variable validation

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

**Configuration Requirements:**
- `DATABASE_URL` environment variable
- WebSocket support for real-time features

## Middleware System

### server/middleware/auth.ts - Authentication & Authorization

**Primary Responsibilities:**
- JWT token validation and verification using storage interface
- User session management with active user verification
- Role-based access control
- Request authentication middleware
- Authorization enforcement with audit logging

**Core Middleware Functions:**
```typescript
// Actual implementation from server/middleware/auth.ts

// AuthRequest interface extends Express Request
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// JWT token authentication middleware (lines 13-41)
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const decoded = storage.verifyJWT(token); // Uses storage interface
  if (!decoded) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  // Verify user still exists and is active
  const user = await storage.getUserById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(403).json({ message: "User account is inactive" });
  }

  req.user = decoded;
  next();
};

// Role-based authorization factory (lines 44-56)
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
};
```

**Convenience Middlewares:**
```typescript
// Actual convenience middlewares (lines 59-60)
export const requireAdmin = authorizeRole(['admin']);
export const requireUser = authorizeRole(['user', 'admin']); // Both user and admin can access
```

**Security Features:**
- Bearer token extraction and validation
- JWT token verification via storage interface
- User account status verification (active/inactive)
- Role-based permission enforcement
- Comprehensive audit logging with request details
- Dual-layer validation (JWT + database user lookup)

**Integration Pattern:**
- Middleware uses `storage.verifyJWT()` and `storage.getUserById()` methods
- Storage provides JWT logic, middleware enforces security policies
- Authentication state persisted in `req.user` for downstream handlers

## Library Services

### server/lib/aws.ts - AWS S3 Integration Service

**Primary Responsibilities:**
- S3 bucket connection and authentication
- Dataset discovery and metadata extraction
- File format detection and processing
- YAML metadata parsing
- Presigned URL generation
- Progressive data scanning

**Core Service Class:**
```typescript
export class AwsS3Service {
  async testConnection(bucketName: string): Promise<boolean>;
  async listDatasets(bucketName: string): Promise<InsertDataset[]>;
  async getSampleData(bucketName: string, key: string, maxRows?: number): Promise<any[]>;
  async getSampleDataWithProgression(bucketName: string, key: string, searchCriteria: any, maxRows?: number): Promise<any[]>;
  async generateDownloadUrl(bucketName: string, key: string): Promise<string>;
}
```

**Advanced Features:**
- Multi-format support (CSV, JSON, Parquet, etc.)
- YAML metadata integration
- File grouping by dataset patterns
- Size estimation and optimization
- Intelligent data sampling strategies

**Supported Formats:**
- CSV with automatic delimiter detection
- JSON and JSONL
- Parquet files
- YAML metadata files
- Text-based formats

### server/lib/openai.ts - OpenAI Integration Service

**Primary Responsibilities:**
- Dataset insight generation
- AI-powered data analysis
- Chat functionality for data exploration
- Multi-dataset analysis coordination
- Context-aware responses

**Core Service Methods:**
```typescript
export class OpenAIService {
  async generateDatasetInsights(dataset: Dataset): Promise<DatasetInsights>;
  async chatWithDataset(dataset: Dataset, messages: ChatMessage[], sample?: IntelligentSample): Promise<string>;
  async chatWithMultipleDatasets(datasets: Dataset[], messages: ChatMessage[], samples?: IntelligentSample[]): Promise<string>;
}
```

**AI Capabilities:**
- GPT-4o model integration
- JSON-structured responses
- Context-aware analysis
- Fallback insight generation
- Multi-dataset correlation analysis

**Response Structures:**
```typescript
interface DatasetInsights {
  summary: string;
  patterns: string[];
  useCases: string[];
}
```

### server/lib/performance-monitor.ts - Performance Monitoring Service

**Primary Responsibilities:**
- Request performance tracking with metrics retention
- Endpoint response time monitoring and analysis
- Cache hit rate analysis and reporting
- Slow query identification with automatic logging
- System performance metrics aggregation

**Core Implementation:**
```typescript
// Actual implementation from server/lib/performance-monitor.ts

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  statusCode: number;
  responseSize?: number;
  cacheHit?: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  addMetric(metric: PerformanceMetrics): void;
  getSlowQueries(threshold: number = 1000): PerformanceMetrics[];
  getAverageResponseTime(endpoint?: string): number;
  getCacheHitRate(): number;
  getStats(): PerformanceStats;
  private getEndpointStats(): Record<string, EndpointStats>;
}

// Exported singleton and middleware
export const performanceMonitor = new PerformanceMonitor();
export function performanceMiddleware(): Express.Middleware;
```

**Middleware Integration:**
```typescript
// Actual middleware implementation (lines 88-126)
export function performanceMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    let metricsRecorded = false;

    const recordMetrics = () => {
      if (metricsRecorded) return;
      metricsRecorded = true;
      
      const duration = Date.now() - start;
      
      // Only track API endpoints
      if (req.path.startsWith('/api')) {
        performanceMonitor.addMetric({
          endpoint: req.path,
          method: req.method,
          duration,
          timestamp: new Date(),
          statusCode: res.statusCode,
          responseSize,
          cacheHit: res.getHeader('X-Cache-Hit') === 'true'
        });

        // Log slow queries automatically
        if (duration > 2000) {
          console.warn(`Slow query detected: ${req.method} ${req.path} took ${duration}ms`);
        }
      }
    };

    // Multiple event listeners to ensure metric capture
    res.on('finish', recordMetrics);
    res.on('close', recordMetrics);

    next();
  };
}
```

**Metrics Collected:**
- Request/response duration for all API endpoints
- HTTP status codes and methods
- Response payload sizes (when available)
- Cache hit/miss ratios via X-Cache-Hit header
- Request timestamps for temporal analysis
- Automatic memory management (last 1000 metrics retained)

**Performance Insights:**
- Endpoint-specific performance analysis with averages
- Automatic slow query detection (>2000ms threshold)
- Cache effectiveness measurement across requests
- Request pattern analysis with historical data
- Memory-efficient metrics storage with automatic cleanup

**Integration with Server:**
- Registered in `server/index.ts` via `app.use(performanceMiddleware())`
- Provides real-time performance monitoring for production debugging
- Supports performance optimization through data-driven insights

### server/lib/intelligent-data-sampler.ts - Advanced Data Sampling Service

**Primary Responsibilities:**
- Context-aware data sampling
- Multiple sampling strategies
- RAG integration for targeted queries
- Data quality assessment
- Progressive scanning coordination

**Sampling Strategies:**
```typescript
interface DataSampleStrategy {
  name: 'representative' | 'comprehensive' | 'focused' | 'balanced' | 'lightweight';
  maxSizeBytes: number;
  sampleRows: number;
  description: string;
}
```

**Smart Sampling Features:**
- Automatic strategy selection based on dataset size
- Question context-aware sampling
- Statistical representativeness optimization
- Data quality metrics calculation
- Edge case and outlier inclusion

**Sample Analysis:**
```typescript
interface IntelligentSample {
  strategy: DataSampleStrategy;
  sampleData: any[];
  totalRows: number;
  columnStats: ColumnStats[];
  dataQuality: DataQualityMetrics;
  representativeness: number;
}
```

### server/lib/embedding-context.ts - Embedding-Based Context Retrieval

**Primary Responsibilities:**
- Vector embedding generation
- Semantic similarity search
- Context-aware data retrieval
- Python script coordination
- Enhanced prompt generation

**Core Retrieval Methods:**
```typescript
export class EmbeddingContextRetriever {
  async retrieveContext(csvData: string | Buffer, question: string, sampleSize?: number, topK?: number): Promise<RetrievalResult>;
  async buildEnhancedContext(csvData: string | Buffer, question: string, metadata?: Record<string, any>): Promise<string>;
}
```

**Advanced Features:**
- Temporary file management
- Python subprocess coordination
- Semantic search capabilities
- Context enhancement with metadata
- Error handling and cleanup

### server/lib/rag-data-retriever.ts - RAG (Retrieval-Augmented Generation) Service

**Primary Responsibilities:**
- Query-driven data retrieval
- Progressive dataset scanning
- Filter application and analysis
- County/state/temporal query optimization
- Comprehensive data collection

**Core RAG Features:**
```typescript
export class RAGDataRetriever {
  async queryDatasetWithFilters(dataset: Dataset, query: QueryFilter, maxRows?: number): Promise<RAGQueryResult>;
  extractQueryFromQuestion(question: string): QueryFilter;
  private async progressiveScan(dataset: Dataset, query: QueryFilter, maxRows: number): Promise<RAGQueryResult>;
}
```

**Query Intelligence:**
- Natural language query parsing
- State/county name normalization
- Health measure detection
- Temporal pattern recognition
- Geographic entity resolution

**Progressive Scanning:**
- Full dataset traversal for rare entities
- Comprehensive match collection
- Filter effectiveness analysis
- Result completeness optimization

## Development Tools

### server/vite.ts - Development Server Integration

**Primary Responsibilities:**
- Vite development server setup
- Hot module replacement (HMR) configuration
- Static asset serving in production
- Template processing and cache busting
- Development/production environment handling

**Development Features:**
```typescript
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom"
  });
  
  app.use(vite.middlewares);
  // Template processing with cache busting
  template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`)
}
```

**Production Features:**
```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

**Capabilities:**
- Seamless development workflow
- Automatic reloading and HMR
- Production build serving
- Template transformation
- Error handling and logging

## Configuration Requirements

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `AWS_ACCESS_KEY_ID`: AWS credentials (required for S3 access)
- `AWS_SECRET_ACCESS_KEY`: AWS credentials (required for S3 access)
- `OPENAI_API_KEY`: OpenAI API key (required for AI features)
- `JWT_SECRET`: Secret key for JWT token signing
- `NODE_ENV`: Environment setting (development/production)

### External Dependencies
- PostgreSQL database (Neon serverless)
- AWS S3 bucket access
- OpenAI API access
- Python runtime for embedding services
- Required Python packages: numpy, pandas, scikit-learn

## Architecture Relationships

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express App   │────│   Routes API     │────│  Storage Layer  │
│   (index.ts)    │    │   (routes.ts)    │    │  (storage.ts)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │  Auth Middleware │              │
         │              │  (auth.ts)       │              │
         │              └─────────────────┘              │
         │                                                │
         │              ┌─────────────────────────────────┴─┐
         │              │           Services Layer          │
         │              ├─────────────────────────────────────┤
         │              │  AWS S3      OpenAI     Performance │
         │              │  (aws.ts)    (openai.ts) (monitor) │
         │              │                                   │
         │              │  Sampling    Embedding    RAG     │
         │              │  (sampler)   (context)   (rag)    │
         │              └─────────────────────────────────────┘
         │
┌────────┴────────┐    ┌─────────────────┐
│  Database       │    │  Vite Dev       │
│  (db.ts)        │    │  (vite.ts)      │
└─────────────────┘    └─────────────────┘
```

## Performance Considerations

### Caching Strategy
- In-memory cache with TTL
- Automatic cache warming
- Smart invalidation patterns
- Response optimization

### Database Optimization
- Connection pooling
- Batch operations
- Optimized queries
- Index utilization

### Request Optimization
- HTTP compression
- Static asset caching
- Response streaming
- Request pipelining

This comprehensive backend architecture provides robust data management, intelligent AI integration, and scalable performance monitoring while maintaining security and development efficiency.