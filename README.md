# Data Lake Explorer

A comprehensive full-stack web application for exploring and analyzing AWS S3 data lakes with AI-powered insights, role-based access control, and intelligent data management capabilities.

## 🚀 Features

### Core Functionality
- **AI-Powered Analytics**: Generate insights, patterns, and use cases using OpenAI GPT-4o
- **AI-Powered Column Search**: Semantic search that finds related columns (e.g., "location" finds "State", "District")
- **Smart Dataset Discovery**: Automated S3 bucket scanning with metadata extraction
- **Hierarchical Tag Filtering**: Advanced filtering system for datasets and folders
- **Optimized Data Sampling**: 1% intelligent sampling (1KB-10MB) for efficient large dataset analysis
- **Real-time Statistics**: Dynamic stats calculation with performance optimization

### Security & Access Control
- **Role-Based Permissions**: Admin and User access levels with granular control
- **JWT Authentication**: Secure token-based authentication system
- **Folder Access Control**: Granular permissions for specific data lake sections
- **AI Feature Control**: Individual user-level AI capability management
- **Inactive Account Protection**: Immediate account deactivation functionality
- **Admin-Only Registration**: Complete control over new user account creation
- **Session Management**: Comprehensive user session handling with security logging

### Performance & Scalability
- **Intelligent Caching**: Multi-layered caching with optimal TTL strategies
- **Database Optimization**: Strategic indexing and query optimization
- **Performance Monitoring**: Built-in metrics and slow query detection
- **Response Compression**: Gzip compression for large data transfers

### User Experience
- **Accessibility Compliance**: WCAG AA compliant interface
- **Responsive Design**: Optimized for all screen sizes
- **Interactive Chat**: AI chat window with markdown support
- **Visual Feedback**: Smooth animations and loading states
- **Smart Search UX**: Real-time search with AI loading indicators and semantic suggestions
- **Download Progress**: Visual feedback for sample downloads and full file processing

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **TanStack Query** for data fetching and caching
- **Wouter** for lightweight routing
- **shadcn/ui** + **Tailwind CSS** for modern UI components
- **React Hook Form** + **Zod** for form validation

### Backend
- **Express.js** with TypeScript for API development
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** for robust data persistence
- **bcrypt** for secure password hashing
- **JWT** for stateless authentication

### External Services
- **AWS S3** for data lake storage and management
- **OpenAI API** for AI-powered analytics and insights
- **Neon Database** for serverless PostgreSQL hosting

## 📋 Prerequisites

- **Node.js** 20 or higher
- **PostgreSQL** database
- **AWS S3** bucket access
- **OpenAI API** key

## ⚡ Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
JWT_SECRET=your_secure_jwt_secret

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket_name

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Application
NODE_ENV=development
PORT=5000
```

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd data-lake-explorer

# Install dependencies
npm install

# Set up the database
npm run db:push

# Start the development server
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 📚 Comprehensive Documentation

Complete documentation ecosystem available in the `docs/` directory with professional-grade guides for all users:

### 🎯 **[Documentation Hub](docs/README.md)** - Central navigation for all documentation

### 👥 User Guides
- **[User Guide](docs/guides/UserGuide.md)** - Complete end-user guide with AI-powered column search, data downloads, and folder navigation
- **[Admin Guide](docs/guides/AdminGuide.md)** - Administrative features: RBAC, user management, AI controls, AWS configuration

### 🔧 Technical Reference
- **[API Documentation](docs/API.md)** - Complete REST API reference with authentication, endpoints, and error handling
- **[Service Documentation](docs/services/)** - Deep technical guides:
  - [AWS S3 Integration](docs/services/aws-s3.md) - S3 operations, dataset discovery, format detection
  - [OpenAI Integration](docs/services/openai.md) - AI analytics, semantic search, GPT-4o integration
  - [JWT Authentication](docs/services/auth-jwt.md) - Security implementation, RBAC, session management
  - [Caching System](docs/services/caching.md) - Multi-layer caching strategies and optimization
  - [Performance Monitoring](docs/services/performance-monitor.md) - Built-in metrics and optimization
  - [Intelligent Data Sampler](docs/services/intelligent-data-sampler.md) - Smart sampling algorithms
- **[Module Documentation](docs/modules/)** - Architecture deep-dive:
  - [Backend Architecture](docs/modules/backend.md) - Express routes, middleware, storage interface
  - [Frontend Components](docs/modules/frontend.md) - React components, hooks, state management
  - [Shared Schema](docs/modules/shared.md) - TypeScript types, Zod validation, database schema
  - [Configuration](docs/modules/configuration.md) - Environment setup, build tools, deployment

### 🚀 Operations & Deployment
- **[Operations Hub](docs/operations/README.md)** - Complete operational documentation:
  - [Deployment Guide](docs/operations/deployment.md) - Production deployment with PM2, Nginx, SSL
  - [Scaling Guide](docs/operations/scaling.md) - Performance optimization, horizontal scaling strategies
  - [Troubleshooting Guide](docs/operations/troubleshooting.md) - Comprehensive diagnostic procedures
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design, data flow, technical decisions
- **[Security Guide](docs/SECURITY.md)** - Security architecture, access control, audit policies

### 🤖 AI Features
- **[AI Context Engineering](Context_Engineering_for_Ask_AI_Feature.md)** - Technical AI implementation details
- **[OpenAI Integration Guide](docs/services/openai.md)** - AI-powered analytics and semantic column search

## 🏗 Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utility functions
│   │   └── hooks/         # Custom React hooks
├── server/                 # Express.js backend
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── lib/               # Server utilities
├── shared/                 # Shared TypeScript types
│   └── schema.ts          # Database schema definitions
├── docs/                   # Project documentation
└── README.md              # This file
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push schema changes to database
npm run db:studio       # Open database studio

# Quality Assurance
npm run type-check      # TypeScript type checking
npm run lint            # Code linting
npm run format          # Code formatting
```

## 🚀 Deployment

### Replit (Recommended)

1. Click the **Deploy** button in Replit
2. Configure environment variables in Replit Secrets
3. Your app will be available at `https://your-repl-name.your-username.replit.app`

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

See the [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions on various deployment platforms.

## 🔐 Security

### Authentication & Authorization
- **JWT-based authentication** with secure token handling and session management
- **Role-based access control** with Admin and User roles
- **Individual AI permissions** controlled at user level
- **Folder-level access control** for granular data lake permissions
- **Admin-only registration** ensuring complete user onboarding control

### Security Features
- **bcrypt password hashing** with secure salt rounds
- **Input validation** using comprehensive Zod schemas
- **Inactive account protection** with immediate login prevention
- **CORS protection** for cross-origin request security
- **Rate limiting** to prevent abuse and ensure fair usage
- **Audit logging** for user actions and administrative changes

## 📊 Performance Features

- **Intelligent caching** with optimized TTL strategies
- **Database indexing** for fast query execution
- **Response compression** for reduced bandwidth
- **Performance monitoring** with built-in metrics
- **Query optimization** with connection pooling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

### Quick Help
- **Documentation**: Comprehensive guides in the [`docs/`](docs/) directory
- **User Guide**: Step-by-step instructions in [`docs/guides/UserGuide.md`](docs/guides/UserGuide.md)
- **Admin Guide**: Administrative features in [`docs/guides/AdminGuide.md`](docs/guides/AdminGuide.md)
- **Health Checks**: Monitor application status at `/api/health`

### Common Issues

#### AI Search Not Working
- Ensure user has AI features enabled (admin setting)
- Check OpenAI API key is valid and has credits
- Verify search term is 3+ characters for AI activation

#### Authentication Problems
- Verify JWT_SECRET is set in environment
- Check if user account is active (admin can reactivate)
- Ensure proper role assignments for folder access

#### Performance Issues
- Monitor cache performance in server logs
- Check database connection and query times
- Verify AWS S3 credentials and region settings

#### Sample Download Issues
- Ensure AWS credentials have S3 read permissions
- Check if dataset files exist in configured bucket
- Verify file format is supported (CSV, JSON, etc.)

### Getting Help
- **Documentation**: Complete troubleshooting guide at [`docs/operations/troubleshooting.md`](docs/operations/troubleshooting.md)
- **Operations Support**: Deployment and scaling guidance at [`docs/operations/`](docs/operations/)
- **User Support**: Step-by-step help in [`docs/guides/UserGuide.md`](docs/guides/UserGuide.md)
- **Admin Support**: Management procedures in [`docs/guides/AdminGuide.md`](docs/guides/AdminGuide.md)
- **Issues**: Report bugs or request features via GitHub Issues
- **Logs**: Check browser console and server logs for detailed error information

## 🔄 Recent Updates (September 2025)

### 📚 Comprehensive Documentation Overhaul
- ✅ **Complete Documentation Ecosystem**: Professional-grade documentation with 7 major areas
- ✅ **User & Admin Guides**: Complete workflows including AI search and RBAC management
- ✅ **Technical Deep-Dive**: Service documentation for AWS S3, OpenAI, JWT, caching, performance monitoring
- ✅ **Module Architecture**: Backend, frontend, shared schema, and configuration documentation
- ✅ **Operations Documentation**: Production deployment, scaling strategies, comprehensive troubleshooting
- ✅ **Navigation System**: Centralized docs hub with cross-references and quick navigation

### 🤖 AI-Powered Enhancements
- ✅ **AI-Powered Column Search**: Semantic column search using OpenAI for intelligent matching
- ✅ **Search UX Improvements**: Loading indicators ("AI is searching...") and real-time feedback
- ✅ **Optimized Sampling**: Reduced sample size from 10% to 1% with intelligent bounds (1KB-10MB)
- ✅ **Enhanced Error Handling**: Comprehensive error handling for AI and S3 operations

### 🚀 Performance & Reliability
- ✅ **S3 Range Request Fix**: Switched from pre-signed URLs to backend streaming for samples
- ✅ **Authentication Improvements**: Enhanced JWT handling and middleware authentication
- ✅ **Column Schema Search**: Both column names and descriptions included in search results
- ✅ **Cache Optimization**: Multi-layered caching with 5.3s warm-up for 294 datasets across 17 folders
- ✅ **Debug Logging**: Comprehensive logging system for troubleshooting AI search functionality

## 🔄 Previous Updates (August 2025)

### Security & Access Control Enhancements
- ✅ **Registration Completely Disabled**: New accounts can only be created by administrators
- ✅ **User-Based AI Control**: AI features (Ask AI, Generate Insights, Multi-dataset Chat) now controlled at individual user level
- ✅ **Inactive Account Restrictions**: Comprehensive login prevention for inactive accounts with custom messaging
- ✅ **Admin-Only Actions**: Restricted Refresh and AI Insights buttons to admin users only
- ✅ **Zero-Access Registration**: New users start with no dataset access, requiring manual permission assignment

### User Interface Improvements
- ✅ **Simplified User Management**: Removed complex folder access and AI settings tabs for cleaner interface
- ✅ **Conditional AI UI**: Dynamic showing/hiding of AI features based on individual user permissions
- ✅ **Enhanced Error Handling**: Better parsing and display of server validation errors
- ✅ **Table Refresh Logic**: Immediate database refresh after user role updates

### Performance & Reliability
- ✅ **Cache-Busting Implementation**: Forced fresh database queries for user management
- ✅ **Server-Side Caching**: Intelligent multi-layered caching with optimized TTL strategies
- ✅ **Community Data Points Fix**: Accurate calculation for admin users across all accessible datasets
- ✅ **Performance Monitoring**: Comprehensive slow query detection and optimization