# System Architecture

## Overview

Data Lake Explorer is built with a modern, scalable architecture that separates concerns across frontend, backend, and data layers while maintaining high performance and security standards.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────────────────────────────────────────────────────┤
│ React 18 + TypeScript                                       │
│ ├── TanStack Query (State Management)                       │
│ ├── Wouter (Routing)                                        │
│ ├── shadcn/ui + Tailwind CSS (UI Components)               │
│ ├── React Hook Form + Zod (Form Validation)                │
│ └── Custom Hooks (Business Logic)                          │
└─────────────────────────────────────────────────────────────┘
                                │
                               HTTPS
                                │
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                           │
├─────────────────────────────────────────────────────────────┤
│ Express.js + TypeScript                                     │
│ ├── JWT Authentication Middleware                          │
│ ├── Role-Based Access Control                              │
│ ├── Request Validation (Zod)                               │
│ ├── Response Compression (gzip)                            │
│ ├── Rate Limiting                                          │
│ └── Performance Monitoring                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │   Data Layer    │ │  AI Services    │ │ Cloud Storage   │
        │                 │ │                 │ │                 │
        │ PostgreSQL      │ │ OpenAI API      │ │ AWS S3          │
        │ ├── Users       │ │ ├── GPT-4o      │ │ ├── Datasets    │
        │ ├── Datasets    │ │ ├── Insights    │ │ ├── Metadata    │
        │ ├── Permissions │ │ └── Chat        │ │ └── Samples     │
        │ ├── Cache       │ │                 │ │                 │
        │ └── Monitoring  │ │                 │ │                 │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Core Components

### Frontend Architecture

#### Component Hierarchy
```
App.tsx
├── AuthProvider (Authentication Context)
├── ThemeProvider (Dark/Light Mode)
├── QueryClient (TanStack Query)
└── Router (Wouter)
    ├── Pages/
    │   ├── Home (Dashboard)
    │   ├── Login (Authentication)
    │   ├── Admin (User Management)
    │   └── DatasetDetails
    └── Components/
        ├── Layout (Header, Navigation)
        ├── StatsCards (Statistics Display)
        ├── FolderCard (Dataset Organization)
        ├── DatasetCard (Individual Datasets)
        └── AIChat (Conversational Interface)
```

#### State Management Strategy
- **TanStack Query**: Server state, caching, and synchronization
- **Local State**: Component-specific state with React hooks
- **Context API**: Authentication state and theme management
- **URL State**: Filter parameters and navigation state

### Backend Architecture

#### Service Layer Pattern
```
routes.ts (Controllers)
├── Authentication Service
├── Dataset Service
├── AWS Integration Service
├── AI Analytics Service
├── User Management Service
└── Performance Monitoring Service
    │
    ▼
storage.ts (Data Access Layer)
├── Database Operations (Drizzle ORM)
├── Cache Management
├── Query Optimization
└── Transaction Management
    │
    ▼
PostgreSQL Database
├── Optimized Schema
├── Strategic Indexing
├── Connection Pooling
└── Performance Monitoring
```

### Database Design

#### Schema Architecture
```sql
-- Core Entities
users (authentication, roles)
├── user_folder_access (permissions)
└── user_sessions (session management)

datasets (metadata, content info)
├── dataset_downloads (usage tracking)
└── dataset_insights (AI analysis)

aws_config (S3 configurations)
├── refresh_log (sync history)
└── performance_metrics (monitoring)
```

#### Indexing Strategy
- **Primary Indexes**: All primary keys with auto-increment
- **Search Indexes**: Full-text search on dataset names and metadata
- **Filter Indexes**: Composite indexes for common filter combinations
- **Performance Indexes**: Query execution time tracking

## Security Architecture

### Authentication Flow
```
1. User Login Request
   ↓
2. Credential Validation (bcrypt)
   ↓
3. JWT Token Generation
   ↓
4. Role Assignment & Folder Access
   ↓
5. Session Establishment
   ↓
6. Protected Resource Access
```

### Authorization Layers
- **Route-Level**: JWT token validation middleware
- **Resource-Level**: Role-based access checks
- **Data-Level**: Folder permission filtering
- **API-Level**: Rate limiting and request validation

## Performance Architecture

### Caching Strategy
```
Browser Cache (Static Assets)
    ↓
CDN Cache (Public Resources)
    ↓
Application Cache (In-Memory)
    ├── Dataset Metadata (5 min TTL)
    ├── Folder Lists (1 hour TTL)
    ├── User Permissions (30 min TTL)
    └── Statistics (30 min TTL)
    ↓
Database Cache (Query Results)
    ↓
Storage Layer (PostgreSQL)
```

### Performance Monitoring
- **Request Tracking**: Response time measurement
- **Query Analysis**: Slow query detection and logging
- **Cache Metrics**: Hit rate and efficiency monitoring
- **Resource Usage**: Memory and CPU utilization
- **Error Tracking**: Exception monitoring and alerting

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: JWT tokens eliminate server-side session storage
- **Database Sharding**: Partition datasets by folder or organization
- **Microservices**: Separate AI processing from core application
- **Load Balancing**: Multiple application instances with shared database

### Vertical Scaling
- **Database Optimization**: Enhanced indexing and query optimization
- **Memory Management**: Intelligent caching with memory limits
- **Connection Pooling**: Efficient database connection management
- **Resource Allocation**: CPU and memory optimization

## Integration Architecture

### External Service Integration
```
AWS S3 Integration
├── SDK v3 for optimal performance
├── Presigned URLs for secure access
├── Bucket scanning automation
└── Metadata extraction pipeline

OpenAI Integration
├── GPT-4o for advanced analysis
├── Context management for conversations
├── Rate limiting and error handling
└── Response caching for efficiency
```

### Data Flow Architecture
```
S3 Bucket Scan
    ↓
Metadata Extraction
    ↓
Database Persistence
    ↓
AI Analysis (Optional)
    ↓
User Access (Filtered by Permissions)
    ↓
Real-time Statistics Update
```

## Development Architecture

### Code Organization
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route-specific components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── types/         # TypeScript type definitions
├── server/                 # Backend Express application
│   ├── lib/               # Service implementations
│   ├── middleware/        # Express middleware
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── types/             # Backend type definitions
├── shared/                 # Shared code between client/server
│   ├── schema.ts          # Database schema (Drizzle)
│   └── types.ts           # Shared TypeScript types
└── docs/                   # Project documentation
```

### Build Process
```
Development:
TypeScript Compilation → Vite Hot Module Replacement → Development Server

Production:
TypeScript Compilation → Vite Optimization → Bundle Generation → Deployment
```

## Deployment Architecture

### Infrastructure Components
- **Application Server**: Node.js runtime with Express.js
- **Database Server**: PostgreSQL with connection pooling
- **File Storage**: AWS S3 for dataset storage
- **CDN**: Content delivery for static assets
- **Load Balancer**: Request distribution (production)
- **Monitoring**: Application and infrastructure monitoring

### Environment Configuration
- **Development**: Local PostgreSQL, development S3 bucket
- **Staging**: Shared PostgreSQL, staging S3 bucket
- **Production**: Managed PostgreSQL, production S3 bucket with backups

This architecture provides a solid foundation for scalable, secure, and maintainable data lake exploration with room for future enhancements and growth.