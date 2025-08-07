# Data Lake Explorer

## Overview

Data Lake Explorer is a comprehensive full-stack web application for exploring AWS S3 data lakes with AI-powered insights, role-based access control, and intelligent data management capabilities. The application provides secure, scalable, and user-friendly access to large datasets with advanced filtering, AI-driven analytics, and performance optimization. Built with modern web technologies, it enables organizations to efficiently explore, analyze, and extract value from their data lakes while maintaining strict security and access controls.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a modern full-stack architecture, separating frontend and backend concerns. It uses React 18 with TypeScript for the frontend, an Express.js API with TypeScript for the backend, and PostgreSQL with Drizzle ORM for data persistence. AWS S3 is integrated for data lake discovery and access, while OpenAI API provides AI-powered insights and conversational analysis.

### Core Architectural Decisions:
- **Full-Stack Separation**: Clear division between React frontend and Express.js backend.
- **Type Safety**: Extensive use of TypeScript across both frontend and backend.
- **ORM-based Database Management**: Drizzle ORM for PostgreSQL schema and queries.
- **Cloud-Native Storage**: Direct integration with AWS S3 for data lake operations.
- **AI-Driven Features**: Central role of OpenAI for data understanding and interaction.
- **Authentication**: JWT-based authentication with role-based access control (Admin, Editor, Viewer).
- **Hierarchical Tag Filtering**: Advanced system for filtering datasets and folders based on tags.
- **Data Sampling**: Intelligent data sampling for large datasets to optimize AI analysis.
- **Accessibility**: Comprehensive WCAG AA compliance with ARIA labels, semantic HTML, and keyboard navigation.
- **Performance Optimization**: Focus on caching, database indexing, and response compression for sub-2-second load times.
- **Error Handling**: Robust error boundary system for graceful application recovery.

### UI/UX Decisions:
- **Responsive Design**: Single-page application optimized for various screen sizes.
- **Component Library**: shadcn/ui built on Tailwind CSS and Radix UI for consistent, accessible components.
- **Visual Feedback**: Smooth loading animations, skeleton placeholders, and animated counting effects for statistics.
- **Intuitive Navigation**: Tab-based navigation system and folder-first browsing.
- **Readability**: Enhanced typography, contrast, and layout for improved content readability, especially in API documentation and metadata displays.
- **Interactive Chat**: AI chat window with improved scrolling and markdown support for rich AI responses.

### Technical Implementations:
- **Frontend**: React Router (Wouter), TanStack Query for state management, React Hook Form with Zod for form handling, Vite for build.
- **Backend**: Express.js for RESTful APIs, AWS SDK v3 for S3 operations, OpenAI API integration.
- **Database**: PostgreSQL for comprehensive data management including dataset metadata, AWS configurations, user authentication, role-based access control, folder permissions, download tracking, and performance monitoring. Enhanced schema includes `datasets`, `users`, `user_folder_access`, `aws_config`, `auth_config`, and `refresh_log` with strategic indexing for optimal performance.
- **Data Flow**: User authentication with role-based permissions, AWS configuration management, automated S3 bucket scanning, intelligent metadata extraction and persistence to PostgreSQL, AI-powered analysis and insights generation, user interaction through advanced filtering, search, and conversational AI interfaces.
- **Deployment**: Designed for Node.js platforms, with static frontend builds served alongside the Express API.

### Feature Specifications:
- **Smart Dataset Discovery**: Automated S3 bucket scanning with comprehensive metadata extraction and intelligent organization.
- **AI-Powered Analytics**: Advanced insights generation using OpenAI GPT-4o for data analysis, pattern recognition, and conversational exploration.
- **Enterprise Authentication**: Comprehensive JWT-based authentication with role-based access control (Admin, Editor, User), secure password handling, and session management.
- **Advanced Filtering & Search**: Multi-dimensional filtering by folder, format, size, tags, and intelligent search capabilities.
- **Hierarchical Tag Filtering**: Sophisticated tag-based filtering system with persistence across user sessions and navigation.
- **Download Tracking**: Comprehensive usage monitoring with granular tracking for sample, full, and metadata downloads.
- **Data Sampling**: Intelligent sampling strategies optimized for large dataset analysis and AI processing.
- **AWS Configuration Management**: Multi-environment S3 configuration support with testing, validation, and seamless switching capabilities.
- **Accessibility Compliance**: Full WCAG AA compliance with comprehensive ARIA labels, keyboard navigation, and semantic HTML structure.
- **Performance Monitoring**: Advanced performance tracking with query optimization, cache management, and real-time metrics.
- **Folder Access Control**: Granular permissions system allowing precise control over user access to specific data lake sections.
- **Statistics Calculation**: Dual stats system providing public overview statistics and user-specific filtered data based on folder permissions.
- **Server-Side Caching**: Intelligent multi-layered caching system with optimized TTL strategies for maximum performance.

## External Dependencies

### AWS Services
- **S3**: Primary cloud storage for all datasets.
- **AWS SDK v3**: JavaScript client library for interacting with S3 services.

### AI Services
- **OpenAI API**: Utilized for generating AI insights, conversational analysis (GPT-4o model), and RAG (Retrieval Augmented Generation) capabilities.

### Database
- **PostgreSQL**: Relational database for storing application metadata.
- **Neon Database**: Serverless PostgreSQL hosting solution.
- **@neondatabase/serverless**: Library for efficient serverless database connections.

### UI/UX Libraries
- **React**: Frontend JavaScript library.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: Reusable UI components built on Radix UI and Tailwind CSS.
- **Radix UI**: Low-level UI component library for accessibility and customization.
- **Lucide React**: Icon library.
- **React Hook Form**: Form management library.
- **Zod**: TypeScript-first schema validation library.
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