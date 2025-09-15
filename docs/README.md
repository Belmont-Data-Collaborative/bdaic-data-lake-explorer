# Data Lake Explorer Documentation

Welcome to the comprehensive documentation for Data Lake Explorer - a full-stack application for exploring AWS S3 data lakes with AI-powered insights and role-based access control.

## 📖 Documentation Overview

This documentation is organized into several sections to help you find the information you need quickly:

### 🚀 Getting Started
- **[Quick Start Guide](../README.md#quick-start)** - Get up and running in minutes
- **[Installation & Setup](../README.md#installation)** - Detailed setup instructions
- **[Environment Configuration](../README.md#environment-setup)** - Required environment variables

### 👥 User Guides
- **[User Guide](guides/UserGuide.md)** - Complete guide for end users
  - Dataset browsing and filtering
  - AI-powered column search with semantic matching
  - Sample downloads and data preview
  - AI chat and insights generation
  - Folder navigation and access
- **[Admin Guide](guides/AdminGuide.md)** - Administrative features and system management
  - User management and RBAC
  - AI feature control per user
  - Folder access permissions
  - AWS configuration and monitoring
  - Performance tuning and troubleshooting

### 🔧 Technical Reference

#### API Documentation
- **[API Reference](API.md)** - Complete REST API documentation
- **[Authentication](api-documentation.md)** - JWT auth and security details

#### Service Documentation
- **[AWS S3 Integration](services/aws-s3.md)** - S3 bucket management and data operations
- **[OpenAI Integration](services/openai.md)** - AI analytics and semantic column search
- **[Authentication & JWT](services/auth-jwt.md)** - Security implementation details
- **[Caching System](services/caching.md)** - Multi-layered caching strategies
- **[Performance Monitoring](services/performance-monitor.md)** - Built-in metrics and optimization
- **[Intelligent Data Sampler](services/intelligent-data-sampler.md)** - Smart sampling algorithms

#### Module Documentation
- **[Backend Architecture](modules/backend.md)** - Express routes, middleware, and storage
- **[Frontend Components](modules/frontend.md)** - React components, routing, and state management
- **[Shared Schema](modules/shared-schema.md)** - TypeScript types and Zod validation
- **[Configuration Management](modules/configuration.md)** - Environment and deployment settings

### 🏗️ Architecture & Design
- **[System Architecture](ARCHITECTURE.md)** - High-level system design and components
- **[Database Schema](../shared/schema.ts)** - Data models and relationships
- **[Security Architecture](SECURITY.md)** - Security measures and best practices

### 🚀 Deployment & Operations
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Operations Guide](operations/README.md)** - Monitoring, scaling, and maintenance
- **[Troubleshooting](operations/troubleshooting.md)** - Common issues and solutions

### 🤖 AI Features
- **[AI Context Engineering](../Context_Engineering_for_Ask_AI_Feature.md)** - Technical AI implementation
- **[Column Search AI](services/openai.md#semantic-column-search)** - AI-powered semantic search

## 🔍 Quick Navigation

### By User Type

**End Users:**
1. Start with [User Guide](guides/UserGuide.md)
2. Learn about [AI Features](#ai-features) 
3. Check [Troubleshooting](operations/troubleshooting.md) if needed

**Administrators:**
1. Read [Admin Guide](guides/AdminGuide.md)
2. Review [Security Architecture](SECURITY.md)
3. Follow [Deployment Guide](DEPLOYMENT.md)
4. Set up [Monitoring](operations/README.md)

**Developers:**
1. Understand [System Architecture](ARCHITECTURE.md)
2. Explore [API Documentation](API.md)
3. Review [Module Documentation](#module-documentation)
4. Check [Service Integration](#service-documentation)

### By Feature

| Feature | User Guide | Admin Guide | Technical Docs |
|---------|------------|-------------|----------------|
| AI Column Search | [Search Guide](guides/UserGuide.md#ai-column-search) | [AI Controls](guides/AdminGuide.md#ai-features) | [OpenAI Service](services/openai.md) |
| Authentication | [Login Guide](guides/UserGuide.md#authentication) | [User Management](guides/AdminGuide.md#user-management) | [JWT Service](services/auth-jwt.md) |
| Data Downloads | [Download Guide](guides/UserGuide.md#downloads) | [Permissions](guides/AdminGuide.md#folder-access) | [S3 Service](services/aws-s3.md) |
| Folder Access | [Navigation](guides/UserGuide.md#folders) | [Access Control](guides/AdminGuide.md#rbac) | [Security Docs](SECURITY.md) |

## 🆕 Recent Updates

### September 2025 - AI Search Enhancements
- ✅ AI-powered semantic column search implementation
- ✅ Enhanced user experience with loading indicators
- ✅ Optimized sample downloads (1% with smart bounds)
- ✅ Improved error handling and debugging

### August 2025 - Security & Access Control
- ✅ Admin-only registration and user creation
- ✅ Individual AI feature control per user
- ✅ Enhanced folder-level permissions
- ✅ Performance optimizations and caching

## 🆘 Support & Troubleshooting

### Quick Help
- **Common Issues**: [Troubleshooting Guide](operations/troubleshooting.md)
- **API Errors**: [API Documentation](API.md#error-handling)
- **Performance**: [Performance Guide](services/performance-monitor.md)
- **Security**: [Security Guide](SECURITY.md#troubleshooting)

### Getting Help
- Check the relevant guide above for your use case
- Review error messages in browser console and server logs
- Verify environment configuration and permissions
- Contact administrators for access-related issues

---

## 📝 Documentation Standards

All documentation follows these standards:
- **Clear Navigation**: Each document includes a table of contents
- **Code Examples**: Working examples with proper syntax highlighting
- **Error Scenarios**: Common issues and troubleshooting steps
- **Up-to-Date**: Regular updates reflecting latest features and changes
- **Accessible**: Plain language with technical details where needed

**Last Updated**: September 2025  
**Version**: 2.1.0 (AI Search Enhancement Release)