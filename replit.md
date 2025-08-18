# Data Lake Explorer

## Overview
Data Lake Explorer is a full-stack web application for secure, scalable, and user-friendly exploration of AWS S3 data lakes. It provides AI-powered insights, role-based access control, advanced filtering, and intelligent data management. The project's purpose is to enable organizations to efficiently analyze and extract value from large datasets while maintaining strict security and access controls.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a modern full-stack architecture with a React frontend (TypeScript), an Express.js API backend (TypeScript), and PostgreSQL with Drizzle ORM for data persistence. It integrates directly with AWS S3 for data lake operations and leverages OpenAI for AI-powered insights and conversational analysis.

### Core Architectural Decisions:
- **Full-Stack Separation**: Clear division between React frontend and Express.js backend.
- **Type Safety**: Extensive use of TypeScript across both frontend and backend.
- **ORM-based Database Management**: Drizzle ORM for PostgreSQL schema and queries.
- **Cloud-Native Storage**: Direct integration with AWS S3 for data lake operations.
- **AI-Driven Features**: Central role of OpenAI for data understanding and interaction.
- **Authentication**: JWT-based authentication with role-based access control (Admin, Editor, Viewer).
- **Hierarchical Tag Filtering**: Advanced system for filtering datasets and folders based on tags.
- **Data Sampling**: Intelligent data sampling for large datasets to optimize AI analysis.
- **Accessibility**: WCAG AA compliance with ARIA labels, semantic HTML, and keyboard navigation.
- **Performance Optimization**: Focus on caching, database indexing, and response compression.
- **Error Handling**: Robust error boundary system for graceful application recovery.

### UI/UX Decisions:
- **Responsive Design**: Single-page application optimized for various screen sizes.
- **Component Library**: shadcn/ui built on Tailwind CSS and Radix UI for consistent, accessible components.
- **Visual Feedback**: Smooth loading animations and skeleton placeholders.
- **Intuitive Navigation**: Tab-based navigation system and folder-first browsing.
- **Readability**: Enhanced typography, contrast, and layout.
- **Interactive Chat**: AI chat window with improved scrolling and markdown support.

### Technical Implementations:
- **Frontend**: React, React Router (Wouter), TanStack Query for state management, React Hook Form with Zod for form handling, Vite for build.
- **Backend**: Express.js for RESTful APIs, AWS SDK v3 for S3 operations, OpenAI API integration.
- **Database**: PostgreSQL for dataset metadata, AWS configurations, user authentication, RBAC, folder permissions, download tracking, and performance monitoring.
- **AI Functionality**: AI features (Ask AI, Generate Insights, Multi-dataset Chat) are user-controlled, with admin users having them enabled by default.
- **Registration & User Management**: User registration is disabled; new accounts created by administrators. Default settings include zero dataset access and disabled AI features.
- **Database Refresh Logic**: Comprehensive table refresh mechanism with cache invalidation.
- **Data Flow**: Authentication with RBAC, AWS configuration, automated S3 scanning, metadata extraction to PostgreSQL, AI analysis, and user interaction via filtering, search, and conversational AI.

### Feature Specifications:
- **Smart Dataset Discovery**: Automated S3 bucket scanning with metadata extraction.
- **AI-Powered Analytics**: Insights generation using OpenAI GPT-4o for data analysis and conversational exploration.
- **Enterprise Authentication**: JWT-based authentication with RBAC, secure password handling, and session management.
- **Advanced Filtering & Search**: Multi-dimensional filtering by folder, format, size, tags, and intelligent search.
- **Download Tracking**: Usage monitoring for sample, full, and metadata downloads.
- **AWS Configuration Management**: Multi-environment S3 configuration support.
- **Accessibility Compliance**: Full WCAG AA compliance.
- **Performance Monitoring**: Advanced tracking with query optimization and cache management.
- **Folder Access Control**: Granular permissions for data lake sections.
- **Statistics Calculation**: Dual stats system for public overview and user-specific filtered data.
- **Server-Side Caching**: Multi-layered caching with optimized TTL strategies.

## External Dependencies

### AWS Services
- **S3**: Primary cloud storage for all datasets.
- **AWS SDK v3**: JavaScript client library for S3 services.

### AI Services
- **OpenAI API**: Utilized for AI insights, conversational analysis (GPT-4o), and RAG capabilities.

### Database
- **PostgreSQL**: Relational database for storing application metadata.
- **Neon Database**: Serverless PostgreSQL hosting solution.
- **@neondatabase/serverless**: Library for efficient serverless database connections.

### UI/UX Libraries
- **React**: Frontend JavaScript library.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **Radix UI**: Low-level UI component library for accessibility.
- **Lucide React**: Icon library.
- **React Hook Form**: Form management library.
- **Zod**: TypeScript-first schema validation.
- **TanStack Query**: Data fetching and caching library.
- **Wouter**: Lightweight React router.
- **Vite**: Frontend build tool.
- **React Markdown**: Library for rendering Markdown.
- **Remark GFM**: Plugin for GitHub Flavored Markdown.

### Backend Libraries
- **Express.js**: Web application framework for Node.js.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Bcrypt**: Library for password hashing.
- **JSON Web Token (JWT)**: For secure authentication.
- **Date-fns**: For date manipulation and formatting.
- **Esbuild**: Fast JavaScript bundler for backend.

## API Documentation

The Data Lake Explorer provides a comprehensive RESTful API for managing datasets, users, AWS configurations, and AI-powered insights. All API endpoints return JSON responses unless otherwise specified.

### Base URL
All API requests should be made to: `https://your-domain.com/api`

### Authentication
Most endpoints require JWT-based authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ] // Optional validation errors
}
```

---

## Public Endpoints (No Authentication Required)

### Statistics

#### Get Public Statistics
**GET** `/api/stats/public`

Returns public overview statistics for the landing page.

**Response:**
```json
{
  "totalDatasets": 294,
  "totalSize": "29.4 GB",
  "dataSources": 17,
  "lastUpdated": "4d ago",
  "lastRefreshTime": "2025-08-14T18:45:29.268Z",
  "totalCommunityDataPoints": 5441083554
}
```

### Authentication

#### User Login
**POST** `/api/auth/login`

Authenticate with username/password or legacy password.

**Request Body:**
```json
{
  "username": "user@example.com", // Optional: for user-based auth
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### Check Authentication Status
**GET** `/api/auth/status`

Check if authentication is configured.

#### Set Password
**POST** `/api/auth/set-password`

Set or update authentication password.

#### User Registration
**POST** `/api/auth/register`

**Note:** Registration is currently disabled. Returns 403 error.

---

## Protected Endpoints (Authentication Required)

### User Verification

#### Verify JWT Token
**GET** `/api/auth/verify`

Verify and refresh user information from JWT token.

### Statistics

#### Get Private Statistics
**GET** `/api/stats/private`

Returns user-specific statistics based on folder access permissions.

#### Get General Statistics
**GET** `/api/stats`

Returns comprehensive statistics with optional folder filtering.
**Query Parameters:**
- `folder` (string, optional): Filter by specific folder name

### Datasets

#### List Datasets
**GET** `/api/datasets`

Retrieve datasets with pagination and filtering.
**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 50): Items per page
- `folder` (string, optional): Filter by folder name
- `search` (string, optional): Search term
- `format` (string, optional): File format filter
- `tag` (string, optional): Tag filter

#### Get Quick Dataset Statistics
**GET** `/api/datasets/quick-stats`

Fast endpoint for basic dataset counts and folder information.

#### Get Dataset Details
**GET** `/api/datasets/:id`

Retrieve detailed information about a specific dataset.

#### Refresh Datasets
**POST** `/api/datasets/refresh`

**Admin Only** - Refresh all datasets from S3.

#### Download Dataset
**GET** `/api/datasets/:id/download`

Download the full dataset file.

#### Download Dataset Sample
**GET** `/api/datasets/:id/download-sample`

Download a sample of the dataset (first 100 rows).

#### Download Dataset Metadata
**GET** `/api/datasets/:id/download-metadata`

Download dataset metadata as JSON.

### AI Features

#### Generate Dataset Insights
**POST** `/api/datasets/:id/insights`

Generate AI-powered insights for a specific dataset.

#### Multi-Dataset Chat
**POST** `/api/ai/multi-dataset-chat`

Interactive chat with multiple datasets using AI.

### User Access Management

#### Get Accessible Folders
**GET** `/api/user/accessible-folders`

Get folders the current user has access to.

#### Get User Folder AI Settings
**GET** `/api/user/folder-ai-settings`

Get AI settings for user's accessible folders.

---

## Admin-Only Endpoints

### User Management

#### List All Users
**GET** `/api/admin/users`

**Admin Only** - Retrieve all users.

#### Update User
**PUT** `/api/admin/users/:id`

**Admin Only** - Update user information.

#### Delete User
**DELETE** `/api/admin/users/:id`

**Admin Only** - Delete a user account.

#### Create User
**POST** `/api/admin/users`

**Admin Only** - Create a new user account.

#### Update User AI Settings
**PUT** `/api/admin/users/:userId/ai-enabled`

**Admin Only** - Enable/disable AI features for a user.

### Folder Access Management

#### List Folder Access
**GET** `/api/admin/folder-access`

**Admin Only** - Get all folder access permissions.

#### Grant Folder Access
**POST** `/api/admin/folder-access`

**Admin Only** - Grant user access to a folder.

#### Revoke Folder Access
**DELETE** `/api/admin/folder-access/:id`

**Admin Only** - Remove folder access permission.

#### Get User's Folder Access
**GET** `/api/admin/users/:userId/folder-access`

**Admin Only** - Get specific user's folder permissions.

#### Update User's Folder Access
**PUT** `/api/admin/users/:userId/folder-access`

**Admin Only** - Update user's folder permissions.

### AWS Configuration Management

#### Get Active AWS Configuration
**GET** `/api/aws-config`

Get the currently active AWS S3 configuration.

#### Update AWS Configuration
**POST** `/api/aws-config`

Create or update AWS S3 configuration.

#### List All AWS Configurations
**GET** `/api/aws-configs`

Get all AWS configurations.

#### Create AWS Configuration
**POST** `/api/aws-configs`

Create a new AWS configuration.

#### Update Specific AWS Configuration
**PUT** `/api/aws-configs/:id`

Update an existing AWS configuration.

#### Delete AWS Configuration
**DELETE** `/api/aws-configs/:id`

Delete an AWS configuration.

#### Activate AWS Configuration
**POST** `/api/aws-configs/:id/activate`

Set a configuration as the active one.

#### Test AWS Connection
**POST** `/api/aws-config/test`

Test connectivity to an AWS S3 bucket.

### Download Statistics

#### Get Dataset Download Statistics
**GET** `/api/datasets/:id/download-stats`

Get download statistics for a specific dataset.

#### Get Batch Download Statistics
**POST** `/api/datasets/batch-download-stats`

Get download statistics for multiple datasets.

### Performance Monitoring

#### Get Performance Statistics
**GET** `/api/performance/stats`

Get application performance metrics.

#### Get Database Status
**GET** `/api/performance/db-status`

Check database optimization status.

### Documentation

#### Get API Documentation
**GET** `/api/docs/markdown`

Retrieve this API documentation in markdown format.

---

## Error Codes

- **400 Bad Request**: Invalid request parameters or body
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for the requested action
- **404 Not Found**: Requested resource does not exist
- **409 Conflict**: Resource conflict (e.g., duplicate folder access)
- **500 Internal Server Error**: Unexpected server error

## Rate Limiting

API endpoints may be rate-limited to prevent abuse. Current limits:
- **General endpoints**: 100 requests per minute per user
- **AI endpoints**: 10 requests per minute per user
- **Download endpoints**: 20 requests per minute per user

## Data Formats

### Dates
All dates are returned in ISO 8601 format: `2025-08-18T15:30:00Z`

### File Sizes
File sizes are returned as formatted strings (e.g., "1.5 MB", "2.3 GB") in the API responses, but stored as bytes in the database.

### Numbers
Large numbers (like community data points) are returned as integers. Use appropriate formatting on the client side for display purposes.