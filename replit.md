# Data Lake Explorer

## Overview

Data Lake Explorer is a full-stack web application designed for exploring AWS S3 data lakes with AI-powered insights and conversational dataset analysis. The application provides an intuitive interface for browsing datasets, viewing metadata, and leveraging AI capabilities to understand data patterns and use cases.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

- **Frontend**: React 18 with TypeScript, providing a responsive single-page application
- **Backend**: Express.js API server with TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for schema management and type-safe queries
- **Cloud Storage**: AWS S3 integration for dataset discovery and access
- **AI Integration**: OpenAI API for generating insights and conversational analysis

## Key Components

### Frontend Architecture
- **React Router**: Using Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **API Layer**: Express.js with TypeScript providing RESTful endpoints
- **Database Layer**: Drizzle ORM with PostgreSQL for data persistence
- **AWS Integration**: AWS SDK v3 for S3 bucket operations and presigned URL generation
- **AI Services**: OpenAI integration for dataset analysis and conversational features

### Database Schema
- **datasets**: Stores dataset metadata including name, source, topLevelFolder, format, size, and AI-generated insights
- **aws_config**: Manages multiple AWS S3 configurations with connection status tracking
- **auth_config**: Stores authentication configuration including hashed passwords
- **refresh_log**: Tracks dataset refresh operations with timestamps and counts

## Authentication

Basic password-based authentication protects access to the data lake. A single password is stored securely in the database, and users must authenticate before accessing any data lake features.

## Data Flow

1. **Authentication**: Users enter password on login page before accessing the application
2. **Configuration**: Users configure AWS S3 credentials and bucket information
3. **Discovery**: Application scans S3 buckets to discover datasets and extract metadata
4. **Storage**: Dataset information is persisted in PostgreSQL for efficient querying with folder organization
5. **Analysis**: AI services generate insights about dataset patterns and use cases
6. **Interaction**: Users can explore datasets through filtering, search, folder navigation, and conversational AI

## External Dependencies

### AWS Services
- **S3**: Primary data storage for datasets
- **AWS SDK v3**: Client library for S3 operations
- **Presigned URLs**: Secure access to dataset samples

### AI Services
- **OpenAI API**: GPT-4o model for generating dataset insights and conversational responses

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection Pooling**: @neondatabase/serverless for efficient database connections

### UI/UX Libraries
- **Radix UI**: Headless components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

## Deployment Strategy

The application is designed for deployment on platforms that support Node.js applications:

- **Development**: Vite dev server with Express API backend
- **Production**: Static frontend build served alongside Express API
- **Database**: Serverless PostgreSQL through Neon
- **Environment Variables**: Secure credential management for AWS and OpenAI keys

The build process creates optimized static assets for the frontend while bundling the backend into a single distributable file using esbuild.

## Recent Changes

- July 23, 2025: Moved API documentation from authenticated interface to public landing page and added user panel
  - Removed API documentation tab from authenticated user interface (MainLayout)
  - Added new "API Documentation" tab to public landing page for better accessibility
  - Removed AWS Configuration from authenticated user interface for cleaner user experience
  - Created new User Panel tab displaying frequently visited data sources and downloaded files
  - Updated navigation system to have 2 tabs for regular users (Dataset Explorer, User Panel) and 3 tabs for admins (adds Admin Panel)
  - API documentation now publicly accessible without requiring authentication
  - Enhanced landing page with comprehensive API reference using ReactMarkdown and proper styling
  - Fixed registration page navigation flow with proper prop mapping between login and registration components
  - Installed date-fns package and implemented user activity tracking functionality
  - Enhanced admin panel with user statistics (total users, admin users, active users)
  - Added user management functionality with role editing and delete capabilities
  - Implemented current user protection - admins cannot delete their own account
  - Added visual indicators in user table to highlight current user with "You" badge
  - Enhanced admin panel to show comprehensive user list with creation dates and last login times
  - Added AWS Configuration tab exclusively for admin users with full S3 bucket management
  - Restored AWS configuration interface as admin-only functionality with connection testing and activation
  - Updated navigation system for admins to have 4 tabs: Dataset Explorer, User Panel, AWS Config, Admin Panel
  - Added reload buttons to both Admin Panel and AWS Configuration for independent module refresh
  - Enhanced admin panel authentication with clear error messages and logout functionality
  - Fixed authentication flow issues and provided clear login instructions for JWT-based authentication
  - Made role column directly editable with dropdown selection in admin panel user table
  - Enhanced role selection UI with icons and improved visual feedback
  - Prevented current user from editing their own role for security
  - Made status column directly editable with Active/Inactive dropdown selection
  - Protected current user from changing their own active status
- July 23, 2025: Implemented comprehensive JWT-based user authentication system with role-based access control
  - Created full users table with email, passwordHash, role (admin/user), isActive status, and timestamps
  - Added JWT token authentication with bcrypt password hashing for security
  - Built user registration system with role assignment (admin/user) capabilities
  - Created authentication middleware with token verification and role-based authorization
  - Added comprehensive user management API routes for registration, login, profile, and admin functions
  - Built admin panel component for user oversight with role editing and account management
  - Enhanced landing page with registration support and JWT token-based authentication
  - Integrated authentication system into existing application while maintaining backward compatibility
  - Added user verification endpoints and secure token storage with localStorage
  - Created test accounts: admin (admin/admin) and user (user/user) with proper JWT authentication
  - Fixed authentication schema validation to properly handle password hashing server-side
  - Enhanced main layout to display user information and role-based navigation (admin panel for admin users only)
- July 23, 2025: Implemented comprehensive download tracking system for monitoring dataset usage
  - Added downloads table to PostgreSQL database with foreign key relationships and proper indexing
  - Added download count columns (downloadCountSample, downloadCountFull, downloadCountMetadata) to datasets table
  - Created download tracking API endpoints for recording and retrieving download statistics
  - Enhanced all download endpoints (sample, full, metadata) to record downloads with IP address and user agent
  - Added download statistics display to dataset cards showing breakdown by type (sample/full/metadata) and total count
  - Implemented atomic download count incrementing using Drizzle ORM with SQL expressions
  - Added cache invalidation for download statistics after successful downloads to ensure real-time updates
  - Download statistics are fetched only when dataset cards are expanded for performance optimization
- July 23, 2025: Implemented comprehensive database and API optimization for enhanced performance
  - Added database indexes on frequently queried columns (top_level_folder, format, status, name, source, lastModified, sizeBytes)
  - Created composite indexes for common query patterns (folder + format filtering)
  - Enhanced API response compression with optimized gzip settings and 1KB threshold
  - Implemented intelligent cache headers with varying TTL based on endpoint type (5min for stats, 10min for folders, 1min default)
  - Added performance monitoring system with metrics tracking for response times, cache hit rates, and slow query detection
  - Created performance monitoring endpoints (/api/performance/stats, /api/performance/db-status) for optimization insights
  - Enhanced compression strategy for large JSON responses and dataset endpoints
  - Implemented automatic slow query logging and performance recommendations
- July 23, 2025: Implemented advanced development architecture with error boundaries, custom hooks, and TypeScript strict mode
  - Created comprehensive error boundary system with ErrorBoundaryEnhanced and ErrorBoundaryWrapper components
  - Implemented custom hooks for dataset filtering (use-dataset-filtering.ts), API mutations (use-api-mutations.ts), and loading state management (use-loading-state.ts)
  - Added centralized loading state management using Zustand for global and component-specific loading states
  - Created input validation schemas with Zod for consistent form and API endpoint validation
  - Enabled TypeScript strict mode with enhanced compiler settings for better type safety
  - Added withErrorBoundary HOCs and useErrorHandler hook for comprehensive error handling
  - Implemented specialized hooks for dataset refresh, AI insights generation, and file downloads
  - Enhanced code architecture with separation of concerns and reusable logic extraction
- July 23, 2025: Implemented comprehensive accessibility overhaul with ARIA labels, keyboard navigation, and semantic HTML
  - Enhanced all interactive elements with proper ARIA labels and keyboard navigation support
  - Converted components to use semantic HTML (article, section, nav) for better screen reader navigation
  - Added comprehensive ARIA attributes: aria-expanded, aria-controls, aria-label, aria-describedby
  - Implemented keyboard navigation for folder cards (Enter/Space keys to activate)
  - Enhanced search filters with role="search", role="group", and proper ARIA labeling
  - Added screen reader support with sr-only content and aria-hidden for decorative icons
  - Improved loading states with aria-live="polite" and proper status announcements
  - Added touch-target class for 44px minimum interactive areas on all buttons
  - Enhanced dataset cards with proper semantic structure and ARIA controls
  - Implemented focus management with useFocusTrap and useKeyboardNavigation hooks
  - Created skip links for "Skip to main content" and "Skip to navigation"
  - Enhanced dataset chat modal with role="dialog", aria-modal="true", and focus trapping
  - Added arrow key navigation for main tabs (left/right arrow keys to switch tabs)
  - All decorative icons marked with aria-hidden="true" for screen reader optimization
- July 23, 2025: Implemented WCAG AA color contrast compliance for accessibility
  - Updated all CSS color variables to meet 4.5:1 contrast ratio requirements for text
  - Replaced low-contrast gray colors with semantic design tokens (foreground, muted-foreground, etc.)
  - Added WCAG compliant utility classes for text (text-contrast-high, text-contrast-medium, text-contrast-muted)
  - Created accessible status colors (text-success, text-warning, text-error, text-info) with proper contrast
  - Updated API documentation ReactMarkdown components to use semantic color tokens
  - Enhanced navigation tabs and main layout with accessible color combinations
  - Added touch-target utility class ensuring minimum 44px interactive areas
  - Fixed CSS utility class bug for .bg-accent-700 (was using color instead of background-color)
- July 23, 2025: Implemented comprehensive error boundary system for graceful error handling
  - Created ErrorBoundary component with retry functionality and detailed error information
  - Added error boundaries to all critical components: DatasetList, StatsCards, FolderCard grid, and ConfigurationPanel
  - Wrapped main application with top-level error boundary to catch unhandled errors
  - Enhanced error boundaries with development-specific stack traces and user-friendly error messages
  - Added useErrorHandler hook for manual error reporting and withErrorBoundary HOC for easy component wrapping
  - Error boundaries now prevent component crashes from breaking entire application
- July 23, 2025: Restructured application into tab-based navigation system
  - Created separate AWS Configuration tab with dedicated route /aws-config
  - Built standalone AWS configuration page removing configuration panel from home page
  - Added three-tab navigation: Dataset Explorer, AWS Configuration, and API Documentation
  - Enhanced MainLayout component to handle three-tab system with proper routing
  - Separated concerns for better user experience and cleaner architecture
- July 23, 2025: Added comprehensive API documentation to replit.md
  - Documented all 20+ API endpoints with request/response formats
  - Added detailed data models for Dataset, AwsConfig, DatasetMetadata, and DatasetInsights
  - Included authentication, AWS configuration, dataset, folder, and statistics endpoints
  - Added error response formats and caching strategy documentation
  - Fixed all TypeScript compilation bugs (27 diagnostics resolved)
- July 16, 2025: Fixed download sample to download only 10% of files and made Explore Data button functional
  - Modified AWS service to use server-side partial downloads instead of presigned URLs with range
  - Fixed AWS signature error by implementing server-side range requests and streaming to client
  - Updated frontend to handle blob downloads with proper filename extraction
  - Fixed Explore Data button to open AI chat interface for dataset exploration
  - Download sample now correctly downloads 10% of original file size (e.g., 433MB → 43MB)
- July 15, 2025: Removed pagination and restored full data loading per user request
  - Removed all pagination controls and logic from application
  - Changed to load all datasets (limit: 10000) on main page without pagination
  - Eliminated folder pagination to show all folders at once
  - Removed lazy loading and restored previous full loading behavior
  - Simplified UI by removing pagination navigation controls
  - Fixed broken references to pagination variables causing errors
- July 10, 2025: Cleaned up footer navigation
  - Removed non-functional Documentation, API Reference, and Support buttons from footer
  - Simplified footer to center-aligned logo and version display for cleaner appearance
- July 09, 2025: Fixed data type extraction from YAML metadata files
  - Updated YAML parser to extract actual `data_type` field from variable definitions
  - Column schema now correctly shows data types (float, integer, string, etc.) from YAML files
  - Previously all data types defaulted to "string" regardless of actual type in metadata
- July 09, 2025: Added Markdown support to AI chat interface
  - Integrated react-markdown and remark-gfm for proper formatting of AI responses
  - AI can now use bold, italics, lists, code blocks, and other markdown formatting
  - User messages remain plain text while AI responses render with rich formatting
- July 09, 2025: Fixed dataset ID persistence during refresh operations
  - Modified storage layer to use upsert approach instead of delete/recreate during refresh
  - Dataset IDs now remain stable across refreshes, preventing 404 errors in AI chat feature
  - Preserved existing AI insights when updating dataset metadata from S3
  - Enhanced dataset lookup with name/source combination for stable identification
  - Fixed "Last Updated" date display to remove redundant "Updated on" prefix
- July 08, 2025: Implemented folder-first navigation system
  - Created FolderCard component for visual folder selection instead of dropdown
  - Added dynamic statistics that update based on selected folder vs global view  
  - Implemented back navigation from folder view to folders overview
  - Enhanced user experience with visual folder badges and hover effects
  - Statistics now show folder-specific metrics when inside a folder
- July 08, 2025: Implemented top-level folder filtering system
  - Added dropdown filter for organizing datasets by S3 bucket folders (cdc_places, cdc_svi, cdc_wonder)
  - Created /api/folders endpoint to retrieve available top-level folders
  - Added topLevelFolder field to datasets table schema
  - Fixed dataset ordering to maintain S3 bucket structure sequence
  - Enhanced search filters with folder-based organization for better dataset navigation
- July 07, 2025: Enhanced metadata display layout for better readability
  - Improved spacing and layout for long text fields (data source, intended use case)
  - Changed long fields from horizontal to vertical layout to prevent text overflow
  - Enhanced target audience badges layout with proper wrapping
  - Added better line spacing and readability for metadata section
  - Fixed column schema section to maintain consistent 710px height with scrollbar overflow
  - Removed dynamic card expansion to ensure uniform card sizes across all states
  - Fixed "last updated" time to reflect actual refresh trigger times instead of dataset file modification times
  - Added refresh logging system to track when datasets are refreshed from S3
  - Enhanced stats endpoint to use refresh timestamps for accurate "last updated" display
  - Implemented dynamic time updates that refresh every minute for first hour, hourly for first day, then shows date format
  - Added client-side time formatting that updates automatically without page reload
- July 03, 2025: Comprehensive YAML metadata extraction and enhanced completeness scoring
  - Completely rewrote YAML metadata parser to directly scan for 30+ field variations
  - Enhanced YAML extraction to handle multiple field naming conventions (title/name/dataset_name, etc.)
  - Added comprehensive metadata extraction including columns, schema, dates, encoding, and technical details
  - Implemented weighted completeness scoring system prioritizing critical fields (description, columns)
  - Added visual progress bar for completeness score with color coding (green ≥80%, yellow ≥60%, red <60%)
  - Enhanced metadata section to display file size, record count, and completeness percentage
  - Extended DatasetMetadata schema with completenessScore and fileSizeBytes fields
  - Added detailed logging for YAML parsing success and field extraction tracking
- July 02, 2025: Enhanced AWS configuration management with toggle functionality
  - Fixed multi-active configuration issue where all configs showed as "active"
  - Fixed database schema default value causing new configs to automatically become active
  - Added automatic dataset refresh when configuration changes or switching between configs
  - Implemented automatic dataset refresh when selecting new active configuration
  - Added visual indicators (blue dots, badges) for active configuration state
  - Implemented one-click configuration switching with "Use This" buttons
  - Enhanced UI with better status indicators and connection status display
  - Updated README.md with comprehensive configuration management documentation
- July 03, 2025: Fixed file size display for CSV+YAML dataset entries
  - Resolved issue where datasets with YAML metadata showed YAML file size instead of CSV file size
  - Modified size calculation to exclude YAML metadata files when CSV files are present
  - Ensures displayed file size represents the actual data content, not documentation files
- July 03, 2025: Added comprehensive dataset refresh loading indicators
  - Implemented visual indicators for manual refresh button clicks showing loading state
  - Added auto-refresh loading indicators when switching AWS configurations
  - Created overlay system that shows "Refreshing datasets from S3..." during automatic operations
  - Enhanced refresh button to display different messages for manual vs automatic refresh operations
  - Added loading states to dataset list and stats display during refresh operations
- July 03, 2025: Enhanced YAML metadata prioritization for CSV datasets
  - Modified metadata extraction to use YAML as the primary source when available
  - CSV analysis now only serves as fallback when no YAML metadata exists
  - Ensures YAML-documented datasets display metadata exclusively from YAML files
  - Maintains CSV analysis capabilities for datasets without YAML documentation
- July 02, 2025: Implemented YAML metadata file integration
  - Added support for linking YAML metadata files to their corresponding CSV datasets
  - Enhanced file grouping logic to treat CSV + YAML pairs as unified dataset entries
  - Extended dataset metadata schema to include YAML-specific fields (title, description, license, version)
  - Updated AI services to use YAML metadata for richer insights and chat responses
  - Added visual indicators in UI to show when datasets have YAML documentation
  - Implemented YAML parsing with field mapping to DatasetMetadata structure
- July 02, 2025: Secured authentication system
  - Added current password verification for password changes
  - Removed password display from documentation and UI for security
  - Implemented proper password change flow requiring old password
- July 02, 2025: Initial setup with core features
- January 02, 2025: Added basic authentication with password protection

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Authenticate with the application password.
- **Body**: `{ "password": "string" }`
- **Success**: `{ "success": true }`
- **Error**: `401` Invalid password, `400` Password required

#### POST /api/auth/set-password
Set or change the application password.
- **Body**: `{ "currentPassword": "string", "newPassword": "string" }`
- **Success**: `{ "message": "Password updated successfully" }`
- **Error**: `400` Invalid password length, `401` Current password incorrect

#### GET /api/auth/status
Check if a password is configured.
- **Success**: `{ "hasPassword": boolean }`

### AWS Configuration Endpoints

#### GET /api/aws-config
Get the active AWS S3 configuration.
- **Success**: `AwsConfig` object or `null`

#### POST /api/aws-config
Create or update AWS S3 configuration.
- **Body**: `{ "bucketName": "string", "region": "string", "name": "string" }`
- **Success**: `AwsConfig` object
- **Error**: `400` Validation errors

#### GET /api/aws-configs
Get all AWS configurations.
- **Success**: Array of `AwsConfig` objects

#### POST /api/aws-configs
Create a new AWS configuration.
- **Body**: `{ "bucketName": "string", "region": "string", "name": "string" }`
- **Success**: `AwsConfig` object

#### PUT /api/aws-configs/:id
Update an existing AWS configuration.
- **Body**: Partial `AwsConfig` object
- **Success**: Updated `AwsConfig` object
- **Error**: `404` Configuration not found

#### DELETE /api/aws-configs/:id
Delete an AWS configuration.
- **Success**: `{ "message": "Configuration deleted successfully" }`
- **Error**: `404` Configuration not found

#### POST /api/aws-configs/:id/activate
Set a configuration as active and refresh datasets.
- **Success**: `AwsConfig` object
- **Error**: `404` Configuration not found

#### POST /api/aws-config/test
Test connection to AWS S3 bucket.
- **Body**: `{ "bucketName": "string", "region": "string" }`
- **Success**: `{ "connected": boolean }`

### Dataset Endpoints

#### GET /api/datasets
List datasets with pagination and filtering.
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50, max: 10000)
  - `folder`: Filter by top-level folder
  - `search`: Search in dataset names and sources
  - `format`: Filter by file format
- **Success**: `{ "datasets": Dataset[], "totalCount": number, "page": number, "limit": number, "totalPages": number }`

#### GET /api/datasets/quick-stats
Get quick dataset statistics (cached).
- **Success**: `{ "totalCount": number, "folders": string[], "lastUpdated": string }`

#### POST /api/datasets/refresh
Refresh datasets from S3 (requires active AWS config).
- **Success**: `{ "message": string, "datasets": Dataset[] }`
- **Error**: `400` No AWS configuration

#### GET /api/datasets/:id
Get a specific dataset by ID.
- **Success**: `Dataset` object
- **Error**: `404` Dataset not found

#### POST /api/datasets/:id/insights
Generate AI insights for a dataset.
- **Success**: `{ "insights": DatasetInsights }`
- **Error**: `404` Dataset not found

#### POST /api/datasets/bulk-insights
Generate AI insights for all datasets.
- **Success**: `{ "message": string, "insights": object }`

#### GET /api/datasets/:id/download
Download dataset (redirects to presigned URL).
- **Success**: Redirects to download URL
- **Error**: `404` Dataset/file not found, `501` Not implemented

#### GET /api/datasets/:id/download-sample
Download a 10% sample of the dataset.
- **Success**: Binary file download
- **Error**: `404` Dataset not found

#### POST /api/datasets/:id/chat
Chat with AI about a specific dataset.
- **Body**: `{ "message": "string", "conversationHistory": array, "enableVisualization": boolean }`
- **Success**: `{ "response": "string", "conversationHistory": array }`
- **Error**: `404` Dataset not found

### Folder Endpoints

#### GET /api/folders
Get list of unique top-level folders.
- **Success**: Array of folder names

#### GET /api/folders/community-data-points
Get community data points calculation by folder.
- **Success**: Array of `{ "folder_label": string, "total_community_data_points": number }`

### Statistics Endpoints

#### GET /api/stats
Get comprehensive application statistics (cached 5 minutes).
- **Success**: 
```json
{
  "totalDatasets": number,
  "totalSize": string,
  "dataSources": number,
  "lastUpdated": string,
  "lastRefreshTime": string,
  "totalCommunityDataPoints": number
}
```

#### GET /api/community-data-points
Get detailed community data points for all datasets.
- **Success**: Array of dataset community data point calculations

### Data Models

#### Dataset
```typescript
{
  id: number,
  name: string,
  source: string,
  topLevelFolder: string,
  format: string,
  size: string,
  sizeBytes: number,
  lastModified: Date,
  createdDate: Date,
  status: string,
  metadata: DatasetMetadata,
  insights: DatasetInsights
}
```

#### AwsConfig
```typescript
{
  id: number,
  name: string,
  bucketName: string,
  region: string,
  isConnected: boolean,
  lastConnected: Date,
  isActive: boolean,
  createdAt: Date
}
```

#### DatasetMetadata
Includes fields like `recordCount`, `columnCount`, `completenessScore`, `title`, `description`, `dataSource`, `columns`, `tags`, etc.

#### DatasetInsights
```typescript
{
  summary: string,
  patterns: string[],
  useCases: string[]
}
```

### Error Responses
All endpoints return consistent error format:
```json
{
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

### Caching Strategy
- Dataset queries: 1-minute cache
- Statistics: 5-minute cache
- Quick stats: 1-minute cache
- Folder lists: 10-minute cache
- AWS config: 1-minute private cache
- Automatic cache invalidation on data refresh

### Performance Optimizations
- **Database Indexes**: Comprehensive indexing on frequently queried columns including top_level_folder, format, status, name, source, lastModified, and sizeBytes
- **Composite Indexes**: Optimized for common query patterns like folder + format filtering
- **API Compression**: Enhanced gzip compression with 1KB threshold and level 9 compression
- **Intelligent Caching**: Variable TTL based on endpoint type for optimal performance
- **Performance Monitoring**: Real-time tracking of response times, cache hit rates, and slow query detection
- **Optimization Endpoints**: `/api/performance/stats` and `/api/performance/db-status` for monitoring and recommendations

## User Preferences

Preferred communication style: Simple, everyday language.