# Data Lake Explorer

A high-performance, comprehensive full-stack web application for exploring AWS S3 data lakes with AI-powered insights, conversational dataset analysis, and advanced performance optimizations. Built with React, Express.js, PostgreSQL, and OpenAI integration.

## Features

### 🗂️ Dataset Management
- **Multi-configuration AWS S3 integration** with persistent storage
- **Automatic dataset discovery** from S3 buckets with metadata extraction
- **Advanced filtering and search** by name, format, folder, and data source
- **Top-level folder filtering** for organized bucket navigation (e.g., cdc_places, cdc_svi, cdc_wonder)
- **Real-time statistics** showing total datasets, size, and data sources
- **Intelligent dataset ordering** maintaining S3 bucket structure

### 🤖 AI-Powered Analysis
- **AI-generated insights** for datasets including summaries, patterns, and use cases
- **Conversational AI assistant** for interactive dataset exploration
- **Contextual responses** based on dataset metadata and column schemas
- **Bulk insights generation** for multiple datasets
- **Find Dataset feature** with topic-based search using natural language queries

### 📊 Data Exploration
- **Interactive column explorer** with search and pagination
- **Comprehensive metadata visualization** including data types, encoding, and record counts
- **YAML metadata integration** for enhanced dataset documentation
- **Completeness scoring** with visual progress indicators
- **Sample file download** using AWS presigned URLs
- **Smart tagging** based on content analysis
- **Dynamic time formatting** for last updated timestamps

### 🔧 Configuration Management
- **Multiple AWS configuration support** with easy switching
- **Session persistence** across page refreshes
- **PostgreSQL database** for reliable configuration storage
- **Connection testing** and validation

### 🔐 Security & Authentication
- **Password-based authentication** protecting access to the data lake
- **Secure password storage** using bcrypt hashing
- **Session management** with localStorage persistence
- **Easy password management** through the login interface

## Technology Stack

### Frontend
- **React 18** with TypeScript and strict mode
- **TanStack Query** for data fetching and intelligent caching
- **Tailwind CSS** with shadcn/ui components and WCAG AA compliance
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation
- **Comprehensive error boundaries** for graceful failure handling
- **Custom hooks** for dataset filtering, API mutations, and loading states

### Backend
- **Express.js** with TypeScript and performance monitoring
- **PostgreSQL** with Drizzle ORM and comprehensive indexing
- **AWS SDK v3** for S3 integration with presigned URLs
- **OpenAI API** for AI features and conversational analysis
- **Neon Database** for serverless PostgreSQL hosting
- **Advanced compression** with gzip optimization and intelligent caching
- **Performance monitoring** with response time tracking and slow query detection

### Infrastructure
- **Vite** for development and optimized building
- **Node.js 20** runtime with ES modules
- **Environment-based configuration** with secure credential management
- **Database indexing** for optimal query performance
- **API response compression** and intelligent cache headers

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database (or Neon account)
- AWS account with S3 access
- OpenAI API account

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# PostgreSQL (if using separate configuration)
PGHOST=your_pg_host
PGPORT=5432
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd data-lake-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run db:push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:5000](http://localhost:5000) in your browser

## Usage

### Authentication

The application requires a password to access the data lake:

1. **Login Access**
   - A secure password is automatically configured for the application
   - Enter the password on the login page to access the application

2. **Session Management**
   - Once logged in, you'll stay authenticated across browser sessions
   - Click "Logout" in the header to securely exit the application

3. **Password Management**
   - Use "Change Password" on the login page to set a custom password
   - Current password verification is required for security when changing passwords

### Initial Setup

1. **Configure AWS Connection**
   - Click on the "AWS Configuration" panel
   - Enter your S3 bucket name and AWS region
   - Test the connection to verify access

2. **Refresh Datasets**
   - Click "Refresh Datasets" to scan your S3 bucket
   - The system will automatically extract metadata and organize datasets

### Exploring Datasets

1. **Browse Datasets**
   - Use search filters to find specific datasets
   - Filter by format (CSV, JSON, Parquet, etc.)
   - Filter by top-level folder for organized navigation
   - View dataset statistics and metadata with completeness scores

2. **Generate AI Insights**
   - Click "Generate Insights" on any dataset
   - AI will analyze structure and suggest use cases
   - View patterns, recommendations, and summaries

3. **Find Datasets by Topic**
   - Click "Find Dataset" to open AI-powered search
   - Enter natural language queries like "food insecurity rates" or "climate data"
   - AI analyzes all datasets and returns relevance-scored matches with explanations
   - Click on results to automatically open dataset details

4. **Chat with Datasets**
   - Click "Ask AI" to open conversational interface
   - Ask questions about data structure, analysis approaches, or insights
   - AI has full context of dataset metadata and previous insights

5. **Download Samples**
   - Click "Download Sample" to get example files
   - Uses secure AWS presigned URLs for direct access

### Configuration Management

1. **Multiple Configurations**
   - Create different configurations for various environments (Production, Development, Testing)
   - **One-click configuration switching** with clear visual indicators showing active configuration
   - **Enhanced UI** with connection status indicators and active state badges
   - Configurations persist across sessions with PostgreSQL storage

2. **Active Configuration Management**
   - Only one configuration can be active at a time
   - **Visual status indicators** (blue dot and badge) show which configuration is currently in use
   - **"Use This" buttons** allow instant switching between configurations
   - Active configurations cannot be deleted for safety

3. **Session Management**
   - All settings saved to PostgreSQL database
   - Automatic reconnection on page refresh
   - Configuration history and last-used timestamps maintained

## API Endpoints

### Datasets
- `GET /api/datasets` - List all datasets (ordered by source path)
- `GET /api/datasets/:id` - Get specific dataset
- `POST /api/datasets/refresh` - Refresh dataset list from S3
- `POST /api/datasets/bulk-insights` - Generate AI insights for all datasets
- `POST /api/datasets/:id/insights` - Generate AI insights for specific dataset
- `POST /api/datasets/:id/chat` - Chat with dataset AI
- `GET /api/datasets/:id/download-sample` - Get sample download URL
- `POST /api/datasets/search` - AI-powered dataset search by topic

### Configuration
- `GET /api/aws-config` - Get active AWS configuration
- `GET /api/aws-configs` - List all configurations
- `POST /api/aws-configs` - Create new configuration
- `PUT /api/aws-configs/:id` - Update configuration
- `DELETE /api/aws-configs/:id` - Delete configuration
- `POST /api/aws-configs/:id/activate` - Set active configuration

### Statistics
- `GET /api/stats` - Get dataset statistics (5-minute cache)
- `GET /api/folders` - Get list of top-level folders (10-minute cache)
- `GET /api/folders/community-data-points` - Get community data calculations
- `GET /api/datasets/quick-stats` - Get quick dataset statistics (1-minute cache)

### Performance Monitoring
- `GET /api/performance/stats` - Get performance metrics and statistics
- `GET /api/performance/db-status` - Get database optimization status and recommendations

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/set-password` - Set or change password
- `GET /api/auth/status` - Check authentication status

### Documentation
- `GET /api/docs/markdown` - Get API documentation from replit.md

## Database Schema & Optimizations

### Datasets Table (Optimized with Indexes)
- `id` - Primary key
- `name` - Dataset name (indexed for fast search)
- `source` - Source directory path (indexed for filtering)
- `topLevelFolder` - Top-level folder for filtering (indexed)
- `format` - File format (CSV, JSON, etc.) (indexed)
- `size` - Human-readable file size
- `sizeBytes` - File size in bytes (BIGINT, indexed for sorting)
- `lastModified` - Last modification date (indexed for date sorting)
- `createdDate` - Creation date
- `status` - Dataset status (indexed for filtering)
- `metadata` - JSON metadata (columns, encoding, completeness score, etc.)
- `insights` - AI-generated insights (JSON)

**Performance Indexes:**
- Single column indexes on: `top_level_folder`, `format`, `status`, `name`, `source`, `lastModified`, `sizeBytes`
- Composite index on: `(top_level_folder, format)` for common filtering patterns

### AWS Config Table (Optimized)
- `id` - Primary key
- `name` - Configuration name
- `bucketName` - S3 bucket name
- `region` - AWS region
- `isConnected` - Connection status (indexed)
- `lastConnected` - Last connection timestamp
- `isActive` - Active configuration flag (indexed)
- `createdAt` - Creation timestamp

**Performance Indexes:**
- Single column indexes on: `isActive`, `isConnected`

### Auth Config Table
- `id` - Primary key
- `hashedPassword` - Bcrypt hashed password
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Refresh Log Table (Optimized)
- `id` - Primary key
- `lastRefreshTime` - Timestamp of refresh operation (indexed)
- `datasetsCount` - Number of datasets refreshed

**Performance Indexes:**
- Single column index on: `lastRefreshTime` for finding recent refreshes

## Performance Features

### Database Optimizations
- **Comprehensive Indexing**: All frequently queried columns have dedicated indexes
- **Composite Indexes**: Optimized for common query patterns (folder + format filtering)
- **Query Performance**: Significant improvement in dataset filtering and search operations
- **Slow Query Detection**: Automatic logging of queries taking over 2 seconds

### API Response Optimizations
- **Enhanced Compression**: Gzip compression with 1KB threshold and level 9 compression
- **Intelligent Caching**: Variable TTL based on endpoint type:
  - Statistics: 5-minute cache
  - Folder lists: 10-minute cache
  - Dataset queries: 1-minute cache
  - AWS config: 1-minute private cache
- **Compression Hints**: Content-encoding hints for large responses
- **Cache Invalidation**: Automatic cache clearing on data refresh

### Performance Monitoring
- **Real-time Metrics**: Response time tracking, cache hit rates, and request counting
- **Slow Query Alerts**: Automatic detection and logging of performance issues
- **Performance Endpoints**: `/api/performance/stats` and `/api/performance/db-status`
- **Optimization Recommendations**: Automatic suggestions based on performance data

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── lib/                # Services (AWS, OpenAI)
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema
└── components.json         # shadcn/ui configuration
```

### Scripts
- `npm run dev` - Start development server with performance monitoring
- `npm run build` - Build for production with optimizations
- `npm run db:push` - Push database schema changes and create indexes
- `npm run db:studio` - Open Drizzle Studio for database management

### Performance Monitoring
Access performance insights at:
- `/api/performance/stats` - View response times, cache hit rates, and slow queries
- `/api/performance/db-status` - Check database optimization status and recommendations

### Adding New Features

1. **Database Changes**
   - Update `shared/schema.ts`
   - Run `npm run db:push`
   - Update storage interfaces in `server/storage.ts`

2. **API Endpoints**
   - Add routes in `server/routes.ts`
   - Implement validation with Zod schemas
   - Update frontend queries

3. **UI Components**
   - Create components in `client/src/components/`
   - Use shadcn/ui for consistent styling
   - Implement with TanStack Query for data management

## Deployment

### Environment Setup
1. Set up PostgreSQL database
2. Configure AWS credentials
3. Set OpenAI API key
4. Update environment variables

### Build and Deploy
```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Update README.md if needed
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and environment details

---

**Data Lake Explorer** - High-performance, AI-driven data lake exploration with comprehensive optimizations for large-scale datasets.

## Recent Updates (July 2025)

### Performance Optimizations
- ✅ **Database Indexing**: Comprehensive indexes on all frequently queried columns
- ✅ **API Compression**: Enhanced gzip compression with optimized settings
- ✅ **Intelligent Caching**: Variable TTL based on endpoint characteristics
- ✅ **Performance Monitoring**: Real-time tracking and slow query detection
- ✅ **Query Optimization**: Composite indexes for common filtering patterns

### Architecture Improvements
- ✅ **Error Boundaries**: Comprehensive error handling throughout the application
- ✅ **Custom Hooks**: Centralized logic for dataset filtering and API mutations
- ✅ **TypeScript Strict Mode**: Enhanced type safety and development experience
- ✅ **Accessibility**: WCAG AA compliance with proper ARIA labels and keyboard navigation
- ✅ **Loading States**: Centralized loading state management with Zustand