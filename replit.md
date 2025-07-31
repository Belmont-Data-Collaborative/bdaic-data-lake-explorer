# Data Lake Explorer

## Overview

Data Lake Explorer is a full-stack web application for exploring AWS S3 data lakes. It provides AI-powered insights and conversational dataset analysis, offering an intuitive interface for browsing, metadata viewing, and leveraging AI to understand data patterns and use cases. The project aims to provide comprehensive data lake management with a focus on user experience and AI-driven data exploration, enabling users to efficiently extract value from large datasets.

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
- **Database**: PostgreSQL for dataset metadata, AWS configurations, authentication, and download tracking. Schema includes `datasets`, `aws_config`, `auth_config`, and `refresh_log`.
- **Data Flow**: User authentication, AWS configuration, S3 bucket scanning for dataset discovery, persistence to PostgreSQL, AI analysis, and user interaction through filtering, search, and conversational AI.
- **Deployment**: Designed for Node.js platforms, with static frontend builds served alongside the Express API.

### Feature Specifications:
- **Smart Dataset Discovery**: Scans S3 buckets, extracts metadata (including comprehensive YAML metadata), and persists information.
- **AI-Powered Analytics**: Generates insights (summary, patterns, use cases) and provides conversational analysis via OpenAI.
- **Enterprise Authentication**: JWT-based with bcrypt hashing, role-based access control, user management (admin only), and secure token handling.
- **Advanced Filtering & Search**: Comprehensive filtering by folder, format, size, and search queries.
- **Hierarchical Tag Filtering**: Filters folders and datasets based on tags, with persistence across navigation.
- **Download Tracking**: Monitors dataset usage with separate counts for sample, full, and metadata downloads.
- **Data Sampling**: Intelligent sampling strategies for AI analysis of large datasets.
- **AWS Configuration Management**: Allows testing, creation, and activation of multiple S3 configurations with automatic dataset refresh.
- **Accessibility Compliance**: WCAG AA compliant with ARIA labels, keyboard navigation, and semantic HTML.
- **Performance Monitoring**: Internal system for tracking and optimizing application performance.

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