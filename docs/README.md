# Data Lake Explorer Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

Data Lake Explorer is a comprehensive web application for managing and analyzing AWS S3 data lakes. It provides AI-powered insights, role-based access control, and intuitive data exploration capabilities.

### Key Features

- **AI-Powered Analytics**: Generate insights and patterns using OpenAI GPT-4o
- **Role-Based Access Control**: Admin, Editor, and Viewer permissions
- **Hierarchical Tag Filtering**: Advanced filtering system for datasets and folders
- **Data Sampling**: Intelligent sampling for large dataset analysis
- **Real-time Statistics**: Dynamic stats calculation with caching optimization
- **Accessibility Compliance**: WCAG AA compliant interface
- **Performance Monitoring**: Built-in performance tracking and optimization

## Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Cloud Storage**: AWS S3 integration
- **AI Services**: OpenAI API (GPT-4o)
- **UI Components**: shadcn/ui + Tailwind CSS + Radix UI

### System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│  Express API    │────│   PostgreSQL    │
│                 │    │                 │    │                 │
│ - TanStack Query│    │ - JWT Auth      │    │ - User Data     │
│ - Wouter Router │    │ - S3 Integration│    │ - Dataset Meta  │
│ - Form Handling │    │ - OpenAI API    │    │ - Access Control│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │    AWS S3       │
                       │                 │
                       │ - Data Storage  │
                       │ - File Metadata │
                       └─────────────────┘
```

## Installation & Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- AWS S3 access
- OpenAI API key

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
```

### Installation Steps

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up the database: `npm run db:push`
4. Start development server: `npm run dev`

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string", 
  "password": "string",
  "role": "admin" | "editor" | "user"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "role": "string"
  }
}
```

#### POST `/api/auth/login`
Authenticate user credentials.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

### Data Endpoints

#### GET `/api/stats`
Get comprehensive statistics for authenticated users.

**Response:**
```json
{
  "totalDatasets": "number",
  "totalSize": "string",
  "dataSources": "number", 
  "lastUpdated": "string",
  "lastRefreshTime": "string",
  "totalCommunityDataPoints": "number"
}
```

#### GET `/api/datasets`
Retrieve datasets with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `folder`: Filter by folder name
- `search`: Search query

#### GET `/api/user/accessible-folders`
Get folders accessible to the current user.

### Admin Endpoints

#### GET `/api/admin/users`
Get all users (admin only).

#### POST `/api/admin/refresh`
Trigger dataset refresh from S3 (admin only).

## Authentication

The application uses JWT-based authentication with role-based access control:

- **Admin**: Full access to all data and admin functions
- **Editor**: Can modify data within assigned folders
- **User**: Read-only access to assigned folders

### Folder Access Control

Users are assigned specific folders they can access. The system filters:
- Dataset queries based on folder permissions
- Statistics calculations to show only accessible data
- Download capabilities restricted to permitted folders

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### datasets
```sql
CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  s3_key VARCHAR(1000) NOT NULL,
  size_bytes BIGINT,
  top_level_folder VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### user_folder_access
```sql
CREATE TABLE user_folder_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  folder_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Optimization

### Caching Strategy

The application implements a multi-layered caching system:

1. **In-Memory Cache**: Fast access to frequently used data
2. **Database Indexing**: Optimized queries with strategic indexes
3. **Response Compression**: Gzip compression for large responses
4. **Browser Caching**: Appropriate cache headers for static resources

### Cache Warming

Critical data is pre-computed and cached:

```javascript
// Cache entries with TTL
const cacheOps = [
  ['datasets-all', datasets, 300000], // 5 minutes
  ['folders', folders, 3600000], // 1 hour
  ['precomputed-stats', stats, 1800000], // 30 minutes
];
```

### Performance Monitoring

Built-in monitoring tracks:
- Query execution times
- Cache hit rates
- Memory usage
- Response times

## Troubleshooting

### Common Issues

#### Cache Issues
If stats show incorrect values:
1. Check server logs for cache warnings
2. Invalidate cache: `POST /api/cache/invalidate`
3. Restart the application

#### Database Connection
For connection errors:
1. Verify DATABASE_URL format
2. Check PostgreSQL service status
3. Ensure database exists and user has permissions

#### AWS S3 Access
For S3 integration issues:
1. Verify AWS credentials
2. Check bucket permissions
3. Confirm region settings

### Performance Issues

If the application is slow:
1. Check database query performance
2. Monitor cache hit rates
3. Review server resource usage
4. Consider database indexing optimization

### Authentication Problems

For login/access issues:
1. Verify JWT_SECRET is set
2. Check token expiration
3. Confirm user role assignments
4. Review folder access permissions