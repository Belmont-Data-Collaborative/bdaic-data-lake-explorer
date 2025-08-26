# Data Lake Explorer

## Overview
Data Lake Explorer is a full-stack web application designed for secure, scalable, and user-friendly exploration of AWS S3 data lakes. Its primary purpose is to enable organizations to efficiently analyze and extract value from large datasets, integrating AI-powered insights, robust role-based access control, advanced filtering, and intelligent data management, all while maintaining strict security.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern full-stack architecture. The frontend is built with React and TypeScript, while the backend utilizes Express.js with TypeScript. PostgreSQL and Drizzle ORM handle data persistence. Key integrations include AWS S3 for data lake operations and OpenAI for AI-powered insights and conversational analysis.

### Core Architectural Decisions:
- **Full-Stack Separation**: Distinct React frontend and Express.js backend.
- **Type Safety**: Comprehensive TypeScript usage across the application.
- **ORM-based Database Management**: Drizzle ORM for PostgreSQL schema and queries.
- **Cloud-Native Storage**: Direct integration with AWS S3 for data lake operations.
- **AI-Driven Features**: Central role of OpenAI for data understanding and interaction.
- **Authentication**: JWT-based authentication supporting role-based access control (Admin, Editor, Viewer).
- **Hierarchical Tag Filtering**: Advanced system for filtering datasets and folders.
- **Data Sampling**: Intelligent data sampling for large datasets to optimize AI analysis.
- **Accessibility**: WCAG AA compliance with ARIA labels, semantic HTML, and keyboard navigation.
- **Performance Optimization**: Focus on caching, database indexing, and response compression.

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
- **Smart Dataset Discovery**: Automated S3 bucket scanning with metadata extraction.
- **AI-Powered Analytics**: Insights generation using OpenAI GPT-4o for data analysis and conversational exploration.
- **Enterprise Authentication**: JWT-based authentication with RBAC and secure password handling.
- **Advanced Filtering & Search**: Multi-dimensional filtering by folder, format, size, tags, and intelligent search.
- **Download Tracking**: Usage monitoring for various download types.
- **AWS Configuration Management**: Multi-environment S3 configuration support.
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