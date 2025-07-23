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
  - Fixed dataset refresh endpoint to require authentication and properly refresh from current AWS bucket configuration
  - Debugged issue where dataset explorer was showing cached data instead of data from bdaic-public-transform bucket
  - Fixed JWT token authentication in frontend API requests for dataset refresh functionality
  - Enhanced apiRequest and queryClient to automatically include Authorization Bearer tokens from localStorage
  - Refresh process now successfully connecting and processing datasets from bdaic-public-transform bucket
  - Large-scale dataset refresh completed successfully with 16 folders discovered from bdaic-public-transform bucket
  - Successfully resolved folder count discrepancy - system now correctly shows all 16 expected folders
  - Dataset count increased from 283 to 256 with proper bucket synchronization and archive folder removal
  - Fixed frontend folder display issue by implementing proper filtering logic to show only folders with datasets
  - Resolved race condition in frontend data loading that was causing empty folder display
  - Forced cache refresh to ensure fresh data loads properly after refresh operations
  - All 16 folders from bdaic-public-transform now correctly displayed: cdc_places, cdc_svi, cdc_wonder, census_acs5, census_acs5_profile, cms_medicare_disparities, county_health_rankings, epa_ejscreen, epa_smart_location, feeding_america, nashville_police_incidents, nashville_traffic_accidents, ndacan, state_specific, usda_census_agriculture, usda_food_access
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

### Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL and Request Format](#base-url-and-request-format)
4. [Rate Limiting and Caching](#rate-limiting-and-caching)
5. [Authentication Endpoints](#authentication-endpoints)
6. [User Management Endpoints](#user-management-endpoints)
7. [AWS Configuration Endpoints](#aws-configuration-endpoints)
8. [Dataset Endpoints](#dataset-endpoints)
9. [Folder and Statistics Endpoints](#folder-and-statistics-endpoints)
10. [Performance Monitoring](#performance-monitoring)
11. [Data Models](#data-models)
12. [Error Handling](#error-handling)
13. [Examples](#examples)

### Overview

The Data Lake Explorer API provides comprehensive access to AWS S3 data lake management, dataset discovery, AI-powered insights, and user authentication. This RESTful API supports JWT-based authentication with role-based access control and features intelligent caching for optimal performance.

**API Version**: v1.0  
**Base URL**: `https://your-domain.replit.app/api`  
**Content Type**: `application/json`

### Authentication

All API requests except public endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Token Acquisition**: Use the `/api/auth/login` endpoint to obtain a JWT token.  
**Token Expiration**: Tokens are valid for 24 hours.  
**Role-Based Access**: Different endpoints require different user roles (admin, editor, viewer).

### Base URL and Request Format

**Production**: `https://your-domain.replit.app/api`  
**Development**: `http://localhost:5000/api`

All requests must include:
- `Content-Type: application/json` header for POST/PUT requests
- `Authorization: Bearer <token>` header for protected endpoints

### Rate Limiting and Caching

- **Rate Limits**: 1000 requests per hour per user
- **Caching Strategy**:
  - Dataset queries: 1-minute cache
  - Statistics: 5-minute cache
  - Folder lists: 10-minute cache
  - Performance data: Real-time, no cache

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Error Responses**:
- `400`: Missing username or password
- `401`: Invalid credentials
- `403`: Account inactive

#### POST /api/auth/register
Register a new user account.

**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "admin" | "editor" | "viewer"
}
```

**Success Response (201)**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "role": "viewer"
  }
}
```

#### GET /api/auth/verify
Verify JWT token validity.

**Headers**: `Authorization: Bearer <token>`

**Success Response (200)**:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### User Management Endpoints

#### GET /api/admin/users
Get all users (admin only).

**Headers**: `Authorization: Bearer <admin-token>`

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "isActive": true,
    "createdAt": "2025-01-15T10:30:00Z",
    "lastLogin": "2025-01-20T14:22:00Z"
  }
]
```

#### PUT /api/admin/users/:id
Update user details (admin only).

**Request Body**:
```json
{
  "role": "admin" | "editor" | "viewer",
  "isActive": true | false
}
```

#### DELETE /api/admin/users/:id
Delete user account (admin only).

**Success Response (200)**:
```json
{
  "message": "User deleted successfully"
}
```

### AWS Configuration Endpoints

#### GET /api/aws-config
Get the active AWS S3 configuration.

**Headers**: `Authorization: Bearer <token>`

**Success Response (200)**:
```json
{
  "id": 1,
  "name": "Production Data Lake",
  "bucketName": "my-data-lake",
  "region": "us-east-1",
  "isConnected": true,
  "isActive": true,
  "lastConnected": "2025-01-20T10:30:00Z",
  "createdAt": "2025-01-15T08:00:00Z"
}
```

#### POST /api/aws-config/test
Test AWS S3 connection.

**Request Body**:
```json
{
  "bucketName": "my-test-bucket",
  "region": "us-west-2"
}
```

**Success Response (200)**:
```json
{
  "connected": true,
  "message": "Successfully connected to S3 bucket"
}
```

#### GET /api/aws-configs
Get all AWS configurations (admin only).

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "name": "Production",
    "bucketName": "prod-bucket",
    "region": "us-east-1",
    "isActive": true,
    "isConnected": true
  },
  {
    "id": 2,
    "name": "Development",
    "bucketName": "dev-bucket",
    "region": "us-west-2",
    "isActive": false,
    "isConnected": false
  }
]
```

#### POST /api/aws-configs/:id/activate
Activate AWS configuration and refresh datasets.

**Success Response (200)**:
```json
{
  "message": "Configuration activated successfully",
  "config": { /* AwsConfig object */ },
  "datasetsRefreshed": 256
}
```

### Dataset Endpoints

#### GET /api/datasets
List datasets with advanced filtering and pagination.

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 10000)
- `folder`: Filter by top-level folder
- `search`: Search in names, sources, descriptions
- `format`: Filter by file format (csv, json, parquet)
- `minSize`: Minimum file size in bytes
- `maxSize`: Maximum file size in bytes

**Example Request**:
```
GET /api/datasets?folder=cdc_places&format=csv&search=health&page=1&limit=20
```

**Success Response (200)**:
```json
{
  "datasets": [
    {
      "id": 1,
      "name": "cdc_places_health_data_2023",
      "source": "cdc_places/2023",
      "topLevelFolder": "cdc_places",
      "format": "csv",
      "size": "45.2 MB",
      "sizeBytes": 47390720,
      "lastModified": "2023-12-15T10:30:00Z",
      "status": "active",
      "metadata": {
        "recordCount": 125000,
        "columnCount": 34,
        "completenessScore": 92,
        "description": "CDC PLACES health outcome data"
      },
      "downloadCounts": {
        "sample": 15,
        "full": 3,
        "metadata": 8
      }
    }
  ],
  "totalCount": 156,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

#### GET /api/datasets/:id
Get detailed dataset information.

**Success Response (200)**:
```json
{
  "id": 1,
  "name": "health_outcomes_2023",
  "source": "cdc_places/2023",
  "topLevelFolder": "cdc_places",
  "format": "csv",
  "size": "45.2 MB",
  "sizeBytes": 47390720,
  "metadata": {
    "title": "CDC PLACES Health Outcomes",
    "description": "Community health indicators and outcomes",
    "recordCount": 125000,
    "columnCount": 34,
    "completenessScore": 92,
    "dataSource": "Centers for Disease Control and Prevention",
    "intendedUseCase": "Public health research and policy analysis",
    "columns": [
      {
        "name": "StateAbbr",
        "dataType": "string",
        "description": "State abbreviation"
      },
      {
        "name": "CountyFIPS",
        "dataType": "string",
        "description": "County FIPS code"
      }
    ],
    "tags": ["health", "cdc", "community", "outcomes"]
  },
  "insights": {
    "summary": "This dataset contains community health outcome indicators...",
    "patterns": [
      "Health outcomes vary significantly by geographic region",
      "Strong correlation between socioeconomic factors and health"
    ],
    "useCases": [
      "Public health policy development",
      "Community health assessment",
      "Research on health disparities"
    ]
  }
}
```

#### POST /api/datasets/refresh
Refresh all datasets from the active S3 configuration.

**Headers**: `Authorization: Bearer <admin-token>`

**Success Response (200)**:
```json
{
  "message": "Datasets refreshed successfully",
  "datasetsProcessed": 256,
  "newDatasets": 12,
  "updatedDatasets": 8,
  "removedDatasets": 3,
  "processingTime": "45.2 seconds"
}
```

#### POST /api/datasets/:id/insights
Generate AI insights for a specific dataset.

**Request Body**:
```json
{
  "regenerate": false
}
```

**Success Response (200)**:
```json
{
  "insights": {
    "summary": "This CDC PLACES dataset provides comprehensive health outcome data...",
    "patterns": [
      "Geographic clustering of health outcomes",
      "Seasonal variations in certain health indicators"
    ],
    "useCases": [
      "Epidemiological research",
      "Health policy planning",
      "Community intervention targeting"
    ],
    "generatedAt": "2025-01-20T15:30:00Z"
  }
}
```

#### GET /api/datasets/:id/download-sample
Download a 10% sample of the dataset.

**Success Response (200)**:
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="dataset_sample.csv"`
- Binary file content (10% of original size)

#### POST /api/datasets/:id/chat
Interactive AI chat about a specific dataset.

**Request Body**:
```json
{
  "message": "What are the key health indicators in this dataset?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Tell me about this dataset"
    },
    {
      "role": "assistant", 
      "content": "This is a CDC PLACES dataset containing..."
    }
  ],
  "enableVisualization": true
}
```

**Success Response (200)**:
```json
{
  "response": "The key health indicators in this dataset include...",
  "conversationHistory": [
    /* Updated conversation history */
  ],
  "visualizations": [
    {
      "type": "bar",
      "title": "Health Outcomes by State",
      "data": {
        "labels": ["Alabama", "Alaska", "Arizona"],
        "datasets": [{
          "label": "Health Score",
          "data": [72, 78, 74],
          "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
        }]
      }
    }
  ]
}
```

### Folder and Statistics Endpoints

#### GET /api/folders
Get list of unique top-level folders.

**Success Response (200)**:
```json
[
  "cdc_places",
  "cdc_svi", 
  "census_acs5",
  "epa_ejscreen",
  "usda_food_access"
]
```

#### GET /api/stats
Get comprehensive application statistics.

**Success Response (200)**:
```json
{
  "totalDatasets": 256,
  "totalSize": "26.8 GB",
  "dataSources": 16,
  "lastUpdated": "2 hours ago",
  "lastRefreshTime": "2025-01-20T13:30:00Z",
  "totalCommunityDataPoints": 15420000,
  "folderBreakdown": [
    {
      "folder": "census_acs5",
      "count": 72,
      "size": "8.2 GB"
    },
    {
      "folder": "cdc_places", 
      "count": 20,
      "size": "2.1 GB"
    }
  ],
  "formatBreakdown": {
    "csv": 240,
    "json": 12,
    "parquet": 4
  }
}
```

### Performance Monitoring

#### GET /api/performance/stats
Get performance metrics and statistics.

**Success Response (200)**:
```json
{
  "averageResponseTime": 245,
  "slowQueries": [
    {
      "query": "GET /api/datasets",
      "averageTime": 1200,
      "count": 45
    }
  ],
  "cacheHitRate": 0.78,
  "databaseConnections": {
    "active": 3,
    "idle": 5,
    "total": 8
  },
  "recommendations": [
    "Consider adding index on datasets.topLevelFolder",
    "Cache frequently accessed folder statistics"
  ]
}
```

### Data Models

#### User
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}
```

#### Dataset
```typescript
interface Dataset {
  id: number;
  name: string;
  source: string;
  topLevelFolder: string;
  format: string;
  size: string;
  sizeBytes: number;
  lastModified: Date;
  createdDate: Date;
  status: string;
  metadata: DatasetMetadata;
  insights?: DatasetInsights;
  downloadCounts?: {
    sample: number;
    full: number;
    metadata: number;
  };
}
```

#### DatasetMetadata
```typescript
interface DatasetMetadata {
  title?: string;
  description?: string;
  recordCount?: number;
  columnCount?: number;
  completenessScore?: number;
  dataSource?: string;
  intendedUseCase?: string;
  targetAudiences?: string[];
  columns?: Column[];
  tags?: string[];
  license?: string;
  version?: string;
}
```

#### Column
```typescript
interface Column {
  name: string;
  dataType: string;
  description?: string;
  nullable?: boolean;
  unique?: boolean;
}
```

### Error Handling

All API endpoints return consistent error responses:

**Error Response Format**:
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ],
  "timestamp": "2025-01-20T15:30:00Z"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `201`: Created successfully
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

### Examples

#### Complete Authentication Flow

1. **Login**:
```bash
curl -X POST https://your-domain.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

2. **Use Token**:
```bash
curl -X GET https://your-domain.replit.app/api/datasets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Search and Filter Datasets

```bash
# Search for health-related datasets in CDC folders
curl -X GET "https://your-domain.replit.app/api/datasets?search=health&folder=cdc_places&format=csv&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### Download Dataset Sample

```bash
curl -X GET https://your-domain.replit.app/api/datasets/123/download-sample \
  -H "Authorization: Bearer <token>" \
  -o dataset_sample.csv
```

#### AI Chat with Dataset

```bash
curl -X POST https://your-domain.replit.app/api/datasets/123/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main health indicators in this dataset?",
    "enableVisualization": true
  }'
```

### Performance Optimizations
- **Database Indexes**: Comprehensive indexing on frequently queried columns including top_level_folder, format, status, name, source, lastModified, and sizeBytes
- **Composite Indexes**: Optimized for common query patterns like folder + format filtering
- **API Compression**: Enhanced gzip compression with 1KB threshold and level 9 compression
- **Intelligent Caching**: Variable TTL based on endpoint type for optimal performance
- **Performance Monitoring**: Real-time tracking of response times, cache hit rates, and slow query detection
- **Optimization Endpoints**: `/api/performance/stats` and `/api/performance/db-status` for monitoring and recommendations

## User Authentication

The application uses JWT-based authentication with role-based access control:

### User Roles
- **Admin**: Full access to all features including AWS configuration, user management, and dataset administration
- **Editor**: Access to dataset exploration and modification capabilities  
- **Viewer**: Read-only access to dataset exploration

### Test Accounts
- **Admin Account**: 
  - Username: `admin`
  - Email: `admin@example.com`
  - Password: `admin`
  - Role: Admin (full system access)

- **User Account**:
  - Username: `user` 
  - Email: `user@example.com`
  - Password: `user`
  - Role: User (dataset exploration access)

### Authentication Features
- JWT token-based authentication with secure password hashing using bcrypt
- Role-based navigation system with different tab access based on user role
- Admin panel for user management with role editing and account status control
- Current user protection prevents admins from deleting or modifying their own accounts
- Automatic token refresh and storage using localStorage
- Secure password validation and user registration system

### Navigation by Role
- **Regular Users**: Dataset Explorer, User Panel (2 tabs)
- **Admin Users**: Dataset Explorer, User Panel, AWS Config, Admin Panel (4 tabs)

## Current AWS Configuration

The application is currently connected to the **bdaic-public-transform** S3 bucket with the following configuration:

### Active Bucket Details
- **Bucket Name**: `bdaic-public-transform`
- **Region**: `us-east-1`
- **Configuration Name**: `BDAIC Data Lake`
- **Status**: Active and Connected
- **Total Datasets**: 256 datasets across 16 folders
- **Total Size**: 26.8 GB

### Data Folders (16 active folders)
1. **cdc_places** - 20 datasets (CDC PLACES health data)
2. **cdc_svi** - 10 datasets (CDC Social Vulnerability Index)
3. **cdc_wonder** - 4 datasets (CDC WONDER mortality data)
4. **census_acs5** - 72 datasets (American Community Survey 5-year estimates)
5. **census_acs5_profile** - 54 datasets (ACS profile data)
6. **cms_medicare_disparities** - 11 datasets (Medicare health disparities)
7. **county_health_rankings** - 2 datasets (Robert Wood Johnson Foundation data)
8. **epa_ejscreen** - 8 datasets (EPA Environmental Justice screening)
9. **epa_smart_location** - 1 dataset (EPA Smart Location Database)
10. **feeding_america** - 4 datasets (Food insecurity data)
11. **nashville_police_incidents** - 12 datasets (Nashville police incident reports)
12. **nashville_traffic_accidents** - 11 datasets (Nashville traffic accident data)
13. **ndacan** - 14 datasets (National Data Archive on Child Abuse and Neglect)
14. **state_specific** - 2 datasets (State-specific datasets)
15. **usda_census_agriculture** - 30 datasets (USDA Census of Agriculture)
16. **usda_food_access** - 1 dataset (USDA Food Access Research Atlas)

### Recent Sync Status
- **Last Refresh**: Successfully completed with all 256 datasets synchronized
- **Archive Folder**: Filtered out (contained 0 datasets)
- **Frontend Display**: All 16 folders correctly displayed with proper dataset counts
- **Folder Navigation**: Confirmed working - users can click folders to view datasets (e.g., cdc_places shows 20 datasets)
- **Data Loading**: Fixed race condition issues and cache invalidation for real-time folder updates

## User Preferences

Preferred communication style: Simple, everyday language.