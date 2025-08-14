# Data Lake Explorer

A comprehensive full-stack web application for exploring and analyzing AWS S3 data lakes with AI-powered insights, role-based access control, and intelligent data management capabilities.

## 🚀 Features

### Core Functionality
- **AI-Powered Analytics**: Generate insights, patterns, and use cases using OpenAI GPT-4o
- **Smart Dataset Discovery**: Automated S3 bucket scanning with metadata extraction
- **Hierarchical Tag Filtering**: Advanced filtering system for datasets and folders
- **Data Sampling**: Intelligent sampling strategies for large dataset analysis
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

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[API Reference](docs/API.md)** - Complete API documentation with authentication and security details
- **[Security Guide](docs/SECURITY.md)** - Security architecture, access control, and best practices
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions for multiple platforms
- **[AI Context Engineering](Context_Engineering_for_Ask_AI_Feature.md)** - Technical documentation for AI features
- **[Architecture Overview](replit.md)** - Detailed system architecture and user preferences

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

## 🆘 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Report bugs or request features via GitHub Issues
- **Health Checks**: Monitor application status at `/api/health`

## 🔄 Recent Updates (August 2025)

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