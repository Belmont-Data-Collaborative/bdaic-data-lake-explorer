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

## User Preferences

Preferred communication style: Simple, everyday language.