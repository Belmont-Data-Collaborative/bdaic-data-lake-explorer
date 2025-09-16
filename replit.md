# Data Lake Explorer

## Overview
Data Lake Explorer is a full-stack web application designed for secure, scalable, and user-friendly exploration of AWS S3 data lakes. Its primary purpose is to enable organizations to efficiently analyze and extract value from large datasets, integrating AI-powered insights, robust role-based access control, advanced filtering, and intelligent data management, all while maintaining strict security.

## User Preferences
- **Communication Style**: Simple, everyday language
- **Documentation Approach**: Comprehensive, production-ready guides with real-world examples
- **Code Quality**: Type-safe, well-documented, and maintainable code
- **User Experience**: Accessibility-first design with smooth animations and clear feedback

## System Architecture
The application employs a modern full-stack architecture. The frontend is built with React and TypeScript, while the backend utilizes Express.js with TypeScript. PostgreSQL and Drizzle ORM handle data persistence. Key integrations include AWS S3 for data lake operations and OpenAI for AI-powered insights and conversational analysis.

### Core Architectural Decisions:
- **Full-Stack Separation**: Distinct React frontend and Express.js backend with clear API boundaries
- **Type Safety**: Comprehensive TypeScript usage across frontend, backend, and shared schemas
- **ORM-based Database Management**: Drizzle ORM for PostgreSQL with type-safe operations and migrations
- **Cloud-Native Storage**: Direct integration with AWS S3 for data lake operations with intelligent scanning
- **AI-Driven Features**: Central role of OpenAI GPT-4o for data understanding, semantic search, and conversational analysis
- **Authentication**: JWT-based authentication supporting role-based access control (Admin, User) with granular permissions
- **Hierarchical Tag Filtering**: Advanced system for filtering datasets and folders with real-time search
- **Intelligent Data Sampling**: Smart 1% sampling (1KB-10MB bounds) for large datasets to optimize AI analysis
- **Accessibility**: WCAG AA compliance with ARIA labels, semantic HTML, keyboard navigation, and screen reader support
- **Performance Optimization**: Multi-layered caching, strategic database indexing, response compression, and query optimization
- **Documentation-First**: Comprehensive documentation ecosystem with user guides, technical references, and operational procedures

### UI/UX Decisions:
- **Responsive Design**: Single-page application optimized for various screen sizes.
- **Component Library**: shadcn/ui built on Tailwind CSS and Radix UI for consistent, accessible components.
- **Visual Feedback**: Smooth loading animations and skeleton placeholders.
- **Intuitive Navigation**: Tab-based navigation system and folder-first browsing.
- **Interactive Chat**: AI chat window with improved scrolling and markdown support.

### Technical Implementations:
- **Frontend**: React, React Router (Wouter), TanStack Query for state management, React Hook Form with Zod for form handling, Vite for build.
- **Backend**: Express.js for RESTful APIs, AWS SDK v3 for S3 operations, OpenAI API integration.
- **Database**: PostgreSQL for metadata, AWS configurations, user authentication, RBAC, folder permissions, and download tracking.
- **AI Functionality**: User-controlled AI features (Ask AI, Generate Insights, Multi-dataset Chat), enabled by default for admin users.
- **User Management**: User registration is disabled; new accounts are created by administrators with default zero dataset access and disabled AI features.
- **Data Flow**: Authentication with RBAC, AWS configuration, automated S3 scanning, metadata extraction to PostgreSQL, AI analysis, and user interaction via filtering, search, and conversational AI.

### Feature Specifications:
- **Smart Dataset Discovery**: Automated S3 bucket scanning with progressive metadata extraction and format detection
- **AI-Powered Semantic Search**: Intelligent column search using OpenAI GPT-4o that finds related concepts (e.g., "location" finds "State", "District")
- **AI Analytics Suite**: Insights generation, conversational analysis, and multi-dataset chat capabilities
- **Enterprise Authentication**: JWT-based authentication with RBAC, secure password handling, and session management
- **Advanced Filtering & Search**: Multi-dimensional filtering by folder, format, size, tags, with real-time AI-powered search
- **Intelligent Data Sampling**: Context-aware 1% sampling with smart bounds (1KB-10MB) for optimal performance
- **Download Tracking**: Comprehensive usage monitoring for sample, full, and metadata downloads
- **AWS Configuration Management**: Multi-environment S3 configuration with connection testing and region support
- **Granular Access Control**: Folder-level permissions with admin-controlled user access and AI feature toggles
- **Statistics Calculation**: Dual stats system for public overview and user-specific filtered data with real-time updates
- **Multi-Layer Caching**: Intelligent caching with cache warming, optimized TTL strategies, and performance monitoring
- **Production Documentation**: Complete operational guides for deployment, scaling, and troubleshooting

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
- **Express.js**: Web application framework for Node.js with middleware pipeline
- **Drizzle ORM**: TypeScript ORM for PostgreSQL with migration support and type safety
- **Bcrypt**: Library for secure password hashing with salt rounds
- **JSON Web Token (JWT)**: For stateless authentication and session management
- **Date-fns**: For date manipulation and formatting across timezones
- **Esbuild**: Fast JavaScript bundler for backend with TypeScript support
- **Compression**: HTTP response compression for optimized data transfer
- **Performance Monitoring**: Built-in request tracking and optimization metrics

## Current Project Status (September 2025)

### Application Performance
- **Active Datasets**: 294 datasets across 17 folders
- **Cache Performance**: 5.3s cache warm-up time with intelligent preloading
- **AI Search**: Fully operational semantic column search with OpenAI GPT-4o
- **Response Times**: Optimized with multi-layer caching and database indexing

### Documentation Completion
- **User Guides**: Complete workflows for end users and administrators
- **Technical Documentation**: Deep-dive service and module documentation
- **Operations Guides**: Production deployment, scaling, and troubleshooting procedures
- **API Reference**: Comprehensive REST API documentation with authentication details
- **Navigation System**: Centralized documentation hub with cross-references

### Code Quality Status
- **TypeScript Coverage**: 100% TypeScript implementation across frontend and backend
- **Type Safety**: Comprehensive Zod validation and Drizzle ORM integration
- **Minor Issues**: 112 TypeScript diagnostics (unused parameters, optional returns) for future cleanup
- **Production Ready**: Application fully functional with all core features operational

### Recent Achievements
- **AI Search Enhancement**: Semantic column search with loading indicators and real-time feedback
- **Performance Optimization**: Reduced sampling from 10% to 1% with intelligent bounds
- **Documentation Overhaul**: Complete professional-grade documentation ecosystem
- **Authentication Security**: Enhanced JWT handling and role-based access control
- **Caching Strategy**: Multi-layered caching with optimized TTL and cache warming