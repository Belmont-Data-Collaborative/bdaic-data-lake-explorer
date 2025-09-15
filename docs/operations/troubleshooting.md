# Data Lake Explorer - Troubleshooting Guide

*Last Updated: September 15, 2025*

A comprehensive troubleshooting guide for diagnosing and resolving issues in the Data Lake Explorer application.

---

## Table of Contents

1. [Quick Diagnostic Overview](#quick-diagnostic-overview)
2. [Database Issues](#database-issues)
3. [Authentication & Authorization](#authentication--authorization)
4. [AWS S3 Integration Issues](#aws-s3-integration-issues)
5. [AI Features Troubleshooting](#ai-features-troubleshooting)
6. [Performance Issues](#performance-issues)
7. [Development Issues](#development-issues)
8. [Deployment Issues](#deployment-issues)
9. [User Management Issues](#user-management-issues)
10. [Data Lake Issues](#data-lake-issues)
11. [Log Analysis Strategies](#log-analysis-strategies)
12. [Emergency Procedures](#emergency-procedures)
13. [Escalation Procedures](#escalation-procedures)

---

## Quick Diagnostic Overview

### Health Check Commands

Run these commands to quickly assess system health:

```bash
# 1. Check application status
curl -f http://localhost:5000/api/health
# Expected: {"status": "healthy", "timestamp": "..."}

# 2. Check database connectivity
npm run db:push --dry-run
# Should complete without errors

# 3. Check AWS connectivity (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/admin/aws-config
# Should return current AWS configuration

# 4. Check AI services
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/datasets/1/insights
# Should return insights or appropriate error

# 5. Check performance metrics
curl http://localhost:5000/api/performance/stats
# Should return performance statistics
```

### System Overview

The Data Lake Explorer architecture includes:
- **Frontend**: React + TypeScript with TanStack Query
- **Backend**: Express.js + TypeScript with Drizzle ORM
- **Database**: PostgreSQL with comprehensive indexing
- **Authentication**: JWT-based with role-based access control
- **Cloud Storage**: AWS S3 for data lake operations
- **AI Services**: OpenAI GPT-4o for insights and semantic search
- **Caching**: Multi-layered in-memory caching system

### Common Error Patterns

| Error Type | Quick Fix | Section |
|------------|-----------|---------|
| `503 Service Unavailable` | Check database connection | [Database Issues](#database-issues) |
| `401 Unauthorized` | Verify JWT token validity | [Authentication](#authentication--authorization) |
| `403 Folder Access Denied` | Check user folder permissions | [User Management](#user-management-issues) |
| `S3 Access Denied` | Verify AWS credentials | [AWS S3 Integration](#aws-s3-integration-issues) |
| `OpenAI API Error` | Check API key and quota | [AI Features](#ai-features-troubleshooting) |
| `High Memory Usage` | Review cache configuration | [Performance Issues](#performance-issues) |

---

## Database Issues

### Connection Problems

#### Symptoms
- Application won't start
- `503 Service Unavailable` errors
- Database timeout messages in logs

#### Diagnostic Commands
```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT NOW();"

# Check connection pool status
node -e "
const { db } = require('./server/db');
db.execute('SELECT 1').then(() => console.log('✅ Connected')).catch(err => console.error('❌ Failed:', err.message));
"

# Verify database exists and has correct schema
npm run db:push --dry-run
```

#### Common Solutions

**1. Connection String Issues**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database

# For Neon database, ensure sslmode is included
# postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/database?sslmode=require
```

**2. Network Connectivity**
```bash
# Test host connectivity
nslookup your-database-host.com
ping your-database-host.com

# Test port connectivity
telnet your-database-host.com 5432
```

**3. Authentication Issues**
```bash
# Test credentials directly
psql "postgresql://username:password@host:port/database" -c "\l"

# For connection refused errors
sudo systemctl status postgresql  # Local PostgreSQL
```

### Migration and Schema Issues

#### Symptoms
- Schema validation errors
- Missing tables or columns
- `relation does not exist` errors

#### Diagnostic Commands
```bash
# Check current schema
npm run db:push --dry-run

# Force schema deployment (CAUTION: May cause data loss)
npm run db:push --force

# Check table structure
psql "$DATABASE_URL" -c "\d+ datasets"
psql "$DATABASE_URL" -c "\d+ users"
psql "$DATABASE_URL" -c "\d+ user_folder_access"
```

#### Solutions

**1. Schema Mismatch**
```sql
-- Check existing schema
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- Common fixes for missing tables
-- Run: npm run db:push --force
```

**2. Index Issues**
```sql
-- Check existing indexes
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';

-- Recreate missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datasets_top_level_folder 
ON datasets(top_level_folder);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datasets_name 
ON datasets USING gin(to_tsvector('english', name));
```

### Performance Issues

#### Symptoms
- Slow database queries (>2 seconds)
- High CPU usage on database server
- Application timeouts

#### Diagnostic Commands
```bash
# Check slow queries
psql "$DATABASE_URL" -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"

# Check database size and growth
psql "$DATABASE_URL" -c "
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public';"

# Monitor active connections
psql "$DATABASE_URL" -c "
SELECT count(*), state 
FROM pg_stat_activity 
GROUP BY state;"
```

#### Solutions

**1. Query Optimization**
```sql
-- Analyze slow query patterns
EXPLAIN ANALYZE SELECT * FROM datasets WHERE top_level_folder = 'folder_name';

-- Update table statistics
ANALYZE datasets;
ANALYZE users;
ANALYZE user_folder_access;
```

**2. Connection Pool Tuning**
```javascript
// server/db.ts - Optimize connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Increase max connections
  min: 5,                     // Maintain minimum connections
  idle_timeout: 30000,        // 30s idle timeout
  connect_timeout: 10000,     // 10s connect timeout
});
```

---

## Authentication & Authorization

### JWT Token Issues

#### Symptoms
- `401 Unauthorized` on API calls
- Token expired errors
- Invalid token signature errors

#### Diagnostic Commands
```bash
# Decode JWT token (without verification)
node -e "
const token = 'YOUR_JWT_TOKEN';
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
console.log('Token payload:', payload);
console.log('Expires:', new Date(payload.exp * 1000));
"

# Test token validity
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/auth/verify

# Check JWT secret configuration
node -e "
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
"
```

#### Solutions

**1. Expired Tokens**
```javascript
// Client-side: Check token expiration
const token = localStorage.getItem('authToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const isExpired = Date.now() >= payload.exp * 1000;
  if (isExpired) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
}
```

**2. Invalid JWT Secret**
```bash
# Generate new JWT secret
openssl rand -base64 64

# Update environment variable
echo "JWT_SECRET=your_new_secret_here" >> .env
```

**3. CORS Issues**
```javascript
// server/index.ts - Fix CORS for authentication
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Login Failures

#### Symptoms
- Incorrect password errors for valid credentials
- Account locked/disabled messages
- Authentication endpoint failures

#### Diagnostic Commands
```bash
# Check user account status
psql "$DATABASE_URL" -c "
SELECT username, email, role, is_active, is_ai_enabled, created_at 
FROM users 
WHERE username = 'your_username';"

# Test password hash
node -e "
const bcrypt = require('bcrypt');
const password = 'test_password';
const hash = 'hash_from_database';
bcrypt.compare(password, hash, (err, result) => {
  console.log('Password valid:', result);
});
"
```

#### Solutions

**1. Account Activation**
```sql
-- Activate user account
UPDATE users 
SET is_active = true 
WHERE username = 'username';
```

**2. Password Reset**
```bash
# Generate new password hash
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('new_password', 12, (err, hash) => {
  console.log('UPDATE users SET password_hash = \\'' + hash + '\\' WHERE username = \\'username\\';');
});
"
```

### Role-Based Access Control

#### Symptoms
- `403 Forbidden` errors for authorized users
- Users cannot access expected features
- Admin features not available

#### Diagnostic Commands
```bash
# Check user roles and permissions
psql "$DATABASE_URL" -c "
SELECT u.username, u.role, u.is_ai_enabled, 
       array_agg(ufa.folder_name) as accessible_folders
FROM users u
LEFT JOIN user_folder_access ufa ON u.id = ufa.user_id AND ufa.can_access = true
WHERE u.username = 'your_username'
GROUP BY u.id, u.username, u.role, u.is_ai_enabled;"
```

#### Solutions

**1. Role Assignment**
```sql
-- Promote user to admin
UPDATE users SET role = 'admin' WHERE username = 'username';

-- Enable AI features for user
UPDATE users SET is_ai_enabled = true WHERE username = 'username';
```

**2. Folder Access Management**
```sql
-- Grant folder access
INSERT INTO user_folder_access (user_id, folder_name, can_access, created_by)
SELECT u.id, 'folder_name', true, 1
FROM users u WHERE u.username = 'username';
```

---

## AWS S3 Integration Issues

### Connection and Authentication

#### Symptoms
- `Access Denied` errors
- `Invalid credentials` messages
- S3 bucket list failures

#### Diagnostic Commands
```bash
# Test AWS CLI access
aws s3 ls s3://your-bucket-name --region us-east-1

# Test programmatic access
node -e "
const { AwsS3Service } = require('./server/lib/aws');
const aws = new AwsS3Service(process.env.AWS_REGION);
aws.testConnection(process.env.AWS_S3_BUCKET)
  .then(result => console.log('Connection test:', result))
  .catch(err => console.error('Connection failed:', err));
"

# Check environment variables
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:0:10}..."
echo "AWS_REGION: $AWS_REGION"
echo "AWS_S3_BUCKET: $AWS_S3_BUCKET"
```

#### Solutions

**1. Credential Issues**
```bash
# Verify IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name your-user-name

# Test bucket access
aws s3api head-bucket --bucket your-bucket-name
```

**2. Required IAM Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### Dataset Discovery Issues

#### Symptoms
- Empty dataset lists
- Incomplete metadata extraction
- Refresh operations failing

#### Diagnostic Commands
```bash
# Test bucket listing
aws s3 ls s3://your-bucket-name --recursive | head -20

# Test dataset refresh
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/refresh-datasets

# Check dataset count
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_datasets FROM datasets;"
```

#### Solutions

**1. Bucket Structure Issues**
```bash
# Check recommended folder structure
aws s3 ls s3://your-bucket-name/ --delimiter=/

# Verify file formats
aws s3 ls s3://your-bucket-name/ --recursive | grep -E '\.(csv|json|parquet|yaml)$'
```

**2. Metadata Extraction Problems**
```javascript
// Debug metadata extraction
node -e "
const { AwsS3Service } = require('./server/lib/aws');
const aws = new AwsS3Service();
aws.listDatasets('your-bucket-name')
  .then(datasets => {
    console.log('Found datasets:', datasets.length);
    datasets.slice(0, 3).forEach(d => {
      console.log('Sample dataset:', {
        name: d.name,
        format: d.format,
        size: d.size,
        metadata: Object.keys(d.metadata)
      });
    });
  })
  .catch(console.error);
"
```

### Presigned URL Issues

#### Symptoms
- Download links not working
- `SignatureDoesNotMatch` errors
- Expired URL errors

#### Solutions

**1. URL Generation**
```javascript
// Check presigned URL generation
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Test URL generation (in server/lib/aws.ts)
const command = new GetObjectCommand({
  Bucket: 'your-bucket',
  Key: 'path/to/file.csv'
});

const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
console.log('Generated URL:', url);
```

---

## AI Features Troubleshooting

### OpenAI API Issues

#### Symptoms
- AI chat responses failing
- Insight generation errors
- Rate limit exceeded messages

#### Diagnostic Commands
```bash
# Test OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models | jq '.data[0].id'

# Check API usage
node -e "
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.models.list()
  .then(models => console.log('Available models:', models.data.length))
  .catch(err => console.error('API Error:', err.message));
"

# Test insight generation for dataset
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/datasets/1/generate-insights
```

#### Solutions

**1. API Key Issues**
```bash
# Verify API key format
echo $OPENAI_API_KEY | cut -c1-10
# Should start with "sk-"

# Test with curl
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "test"}], "max_tokens": 10}' \
  https://api.openai.com/v1/chat/completions
```

**2. Rate Limiting**
```javascript
// server/lib/openai.ts - Add rate limiting
class RateLimitedOpenAI {
  private lastRequest = 0;
  private readonly minInterval = 1000; // 1 second between requests
  
  async makeRequest(fn) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
    return await fn();
  }
}
```

### Embedding and Context Issues

#### Symptoms
- Semantic search not working
- Context retrieval failures
- Embedding generation errors

#### Diagnostic Commands
```bash
# Check embedding service
node -e "
const { embeddingRetriever } = require('./server/lib/embedding-context');
embeddingRetriever.retrieveContext('test query', ['dataset1'])
  .then(context => console.log('Context retrieved:', context.length))
  .catch(err => console.error('Embedding error:', err));
"

# Test intelligent sampling
node -e "
const { intelligentDataSampler } = require('./server/lib/intelligent-data-sampler');
// Test with a known dataset
"
```

#### Solutions

**1. Context Configuration**
```javascript
// Check embedding configuration in server/lib/embedding-context.ts
const config = {
  maxContextLength: 8000,
  chunkOverlap: 200,
  minChunkSize: 500,
  embeddingModel: 'text-embedding-ada-002'
};
```

### Chat Feature Issues

#### Symptoms
- Chat responses incomplete
- Conversation history lost
- Markdown rendering problems

#### Solutions

**1. Chat History Management**
```javascript
// Verify conversation history in localStorage
console.log('Chat history:', localStorage.getItem('chatHistory'));

// Clear corrupted history
localStorage.removeItem('chatHistory');
```

**2. Streaming Response Issues**
```javascript
// Check streaming implementation in dataset-chat.tsx
const handleStreamingResponse = async (response) => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader available');
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      // Process chunk
    }
  } finally {
    reader.releaseLock();
  }
};
```

---

## Performance Issues

### Memory Issues

#### Symptoms
- High memory usage (>1GB)
- Memory leaks over time
- Application crashes with OOM errors

#### Diagnostic Commands
```bash
# Monitor memory usage
node -e "
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB',
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB'
  });
}, 5000);
"

# Check cache size
curl http://localhost:5000/api/performance/stats | jq '.cache'

# Force garbage collection (if --expose-gc flag is used)
node --expose-gc -e "
console.log('Before GC:', process.memoryUsage());
global.gc();
console.log('After GC:', process.memoryUsage());
"
```

#### Solutions

**1. Cache Optimization**
```javascript
// server/routes.ts - Implement cache size limits
const MAX_CACHE_SIZE = 1000;
const cache = new Map();

function setCache(key, data, ttl) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now(), ttl });
}
```

**2. Memory Leak Detection**
```javascript
// Add to server/index.ts
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const usage = process.memoryUsage();
    if (usage.heapUsed > 512 * 1024 * 1024) { // 512MB threshold
      console.warn('🚨 High memory usage:', Math.round(usage.heapUsed / 1024 / 1024) + 'MB');
    }
  }, 60000); // Check every minute
}
```

### Slow Query Performance

#### Symptoms
- API responses > 5 seconds
- Database timeout errors
- High CPU usage

#### Diagnostic Commands
```bash
# Check slow queries
curl http://localhost:5000/api/performance/stats | jq '.slowQueries'

# Monitor database performance
psql "$DATABASE_URL" -c "
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

#### Solutions

**1. Query Optimization**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datasets_performance 
ON datasets(status, top_level_folder, format, last_modified DESC);

-- Optimize folder access queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folder_access_user_lookup 
ON user_folder_access(user_id, folder_name) WHERE can_access = true;
```

**2. Caching Strategy**
```javascript
// Implement query result caching
async function getCachedDatasets(filters) {
  const cacheKey = `datasets-${JSON.stringify(filters)}`;
  const cached = getCached(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const datasets = await storage.getDatasets(filters);
  setCache(cacheKey, datasets, 300000); // 5 minutes
  
  return datasets;
}
```

### Cache Performance

#### Symptoms
- Low cache hit rates (<70%)
- Frequent cache misses
- Slow initial page loads

#### Solutions

**1. Cache Warming Optimization**
```javascript
// Enhanced cache warming strategy
async function intelligentCacheWarming() {
  try {
    // Prioritize most accessed endpoints
    const criticalData = await Promise.all([
      storage.getDatasets(), // Most frequent
      storage.getLastRefreshTime(), // Displayed on all pages
      computeQuickStats(), // Dashboard stats
    ]);
    
    // Cache with different TTLs based on data volatility
    setCache('datasets-all', criticalData[0], 300000); // 5 min
    setCache('last-refresh', criticalData[1], 1800000); // 30 min
    setCache('quick-stats', criticalData[2], 600000); // 10 min
    
    console.log('✅ Critical cache warmed');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}

// Warm cache more frequently during peak hours
const warmingInterval = isBusinessHours() ? 5 * 60 * 1000 : 10 * 60 * 1000;
setInterval(intelligentCacheWarming, warmingInterval);
```

---

## Development Issues

### Build and TypeScript Errors

#### Symptoms
- Build failures
- TypeScript compilation errors
- Module resolution failures

#### Diagnostic Commands
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check build process
npm run build

# Verify package versions
npm ls typescript @types/node @types/react

# Check for dependency conflicts
npm ls --depth=0 | grep -E "WARN|ERROR"
```

#### Solutions

**1. Type Conflicts**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update TypeScript and type definitions
npm update typescript @types/node @types/react @types/express
```

**2. Module Resolution**
```javascript
// vite.config.ts - Verify path aliases
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
```

### Hot Module Replacement Issues

#### Symptoms
- Changes not reflecting in browser
- HMR connection failures
- Page not auto-refreshing

#### Solutions

**1. Vite Configuration**
```javascript
// vite.config.ts - HMR configuration
export default defineConfig({
  server: {
    hmr: {
      port: 5001, // Use different port for HMR
      host: 'localhost'
    },
    watch: {
      usePolling: true, // For file systems that don't support native watching
      interval: 1000
    }
  }
});
```

### Dependency Issues

#### Symptoms
- Package installation failures
- Version conflicts
- Missing peer dependencies

#### Solutions

**1. Clean Installation**
```bash
# Complete clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check for outdated packages
npm outdated

# Audit and fix vulnerabilities
npm audit
npm audit fix
```

---

## Deployment Issues

### Environment Configuration

#### Symptoms
- Application won't start in production
- Missing environment variables
- Configuration validation errors

#### Diagnostic Commands
```bash
# Check all required environment variables
node -e "
const required = [
  'DATABASE_URL', 'JWT_SECRET', 'AWS_ACCESS_KEY_ID', 
  'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'
];
const optional = ['OPENAI_API_KEY', 'CORS_ORIGIN', 'PORT'];

required.forEach(key => {
  console.log(key + ':', process.env[key] ? '✅ Set' : '❌ Missing');
});

optional.forEach(key => {
  console.log(key + ':', process.env[key] ? '✅ Set' : '⚠️ Optional');
});
"

# Test production build
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

#### Solutions

**1. Environment File Setup**
```bash
# Create production environment file
cp .env.example .env.production

# Set proper permissions
chmod 600 .env.production

# Validate JWT secret strength
node -e "
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}
console.log('✅ JWT_SECRET is valid');
"
```

### SSL and HTTPS Issues

#### Symptoms
- Mixed content warnings
- SSL certificate errors
- HTTPS redirect loops

#### Solutions

**1. Nginx Configuration**
```nginx
# /etc/nginx/sites-available/data-lake-explorer
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Migration in Production

#### Symptoms
- Schema deployment failures
- Data loss warnings
- Migration rollback needs

#### Solutions

**1. Safe Migration Strategy**
```bash
# 1. Backup database first
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration in staging
NODE_ENV=staging npm run db:push --dry-run

# 3. Apply migration with monitoring
NODE_ENV=production npm run db:push

# 4. Verify migration success
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM datasets;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## User Management Issues

### Account Creation Problems

#### Symptoms
- Admin cannot create new users
- User registration attempts fail
- Email validation errors

#### Diagnostic Commands
```bash
# Check user creation permissions
curl -X POST -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass","role":"user"}' \
  http://localhost:5000/api/admin/users

# Verify admin user exists
psql "$DATABASE_URL" -c "
SELECT username, role, is_active 
FROM users 
WHERE role = 'admin';"
```

#### Solutions

**1. Create Initial Admin User**
```bash
# Generate admin user with proper password hash
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('secure_admin_password', 12, (err, hash) => {
  console.log('Run this SQL:');
  console.log('INSERT INTO users (username, email, password_hash, role, is_active, is_ai_enabled)');
  console.log('VALUES (\\'admin\\', \\'admin@yourdomain.com\\', \\''+hash+'\\', \\'admin\\', true, true);');
});
"
```

### Folder Access Issues

#### Symptoms
- Users cannot see expected datasets
- `403 Folder Access Denied` errors
- Folder permissions not working

#### Diagnostic Commands
```bash
# Check user folder access
psql "$DATABASE_URL" -c "
SELECT u.username, u.role, ufa.folder_name, ufa.can_access
FROM users u
LEFT JOIN user_folder_access ufa ON u.id = ufa.user_id
WHERE u.username = 'username'
ORDER BY ufa.folder_name;"

# Check which folders exist in datasets
psql "$DATABASE_URL" -c "
SELECT DISTINCT top_level_folder, COUNT(*) as dataset_count
FROM datasets 
WHERE top_level_folder IS NOT NULL
GROUP BY top_level_folder
ORDER BY dataset_count DESC;"
```

#### Solutions

**1. Grant Folder Access**
```sql
-- Grant access to specific folder
INSERT INTO user_folder_access (user_id, folder_name, can_access, created_by)
SELECT u.id, 'cdc_places', true, 1
FROM users u 
WHERE u.username = 'username';

-- Grant access to all folders for admin users
INSERT INTO user_folder_access (user_id, folder_name, can_access, created_by)
SELECT u.id, d.top_level_folder, true, 1
FROM users u
CROSS JOIN (SELECT DISTINCT top_level_folder FROM datasets WHERE top_level_folder IS NOT NULL) d
WHERE u.role = 'admin' AND u.username = 'admin_username';
```

### AI Feature Access

#### Symptoms
- AI features disabled for users
- Chat not working for authorized users
- Insights generation failing

#### Solutions

**1. Enable AI Features**
```sql
-- Enable AI for specific user
UPDATE users SET is_ai_enabled = true WHERE username = 'username';

-- Enable AI for all admin users
UPDATE users SET is_ai_enabled = true WHERE role = 'admin';

-- Check current AI settings
SELECT username, role, is_ai_enabled FROM users;
```

---

## Data Lake Issues

### Dataset Discovery Problems

#### Symptoms
- Empty dataset list
- Missing datasets from S3
- Metadata extraction failures

#### Diagnostic Commands
```bash
# Check S3 bucket contents
aws s3 ls s3://your-bucket-name/ --recursive | head -20

# Test dataset refresh manually
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/refresh-datasets

# Check dataset count in database
psql "$DATABASE_URL" -c "
SELECT 
  status,
  COUNT(*) as count,
  MIN(last_modified) as oldest,
  MAX(last_modified) as newest
FROM datasets 
GROUP BY status;"
```

#### Solutions

**1. Manual Dataset Refresh**
```bash
# Force complete refresh
node -e "
const { storage } = require('./server/storage');
const { AwsS3Service } = require('./server/lib/aws');

async function refreshDatasets() {
  try {
    const aws = new AwsS3Service(process.env.AWS_REGION);
    const datasets = await aws.listDatasets(process.env.AWS_S3_BUCKET);
    
    console.log('Found', datasets.length, 'datasets in S3');
    
    for (const dataset of datasets) {
      await storage.upsertDataset(dataset);
    }
    
    console.log('✅ Datasets refreshed successfully');
  } catch (error) {
    console.error('❌ Refresh failed:', error);
  }
}

refreshDatasets();
"
```

### Download Issues

#### Symptoms
- Download links not working
- Sample generation failures
- Presigned URL errors

#### Solutions

**1. Debug Download Process**
```javascript
// Test sample generation
node -e "
const { intelligentDataSampler } = require('./server/lib/intelligent-data-sampler');

// Replace with actual dataset info
const mockFile = {
  key: 'folder/dataset.csv',
  size: 1000000,
  lastModified: new Date()
};

intelligentDataSampler.generateSample(mockFile, 'csv')
  .then(sample => {
    console.log('Sample generated:', {
      strategy: sample.strategy,
      sampleSize: sample.sampleSize,
      representativeness: sample.representativeness
    });
  })
  .catch(console.error);
"
```

### Metadata Extraction Issues

#### Symptoms
- Missing dataset metadata
- Incorrect file size calculations
- YAML parsing errors

#### Solutions

**1. Debug Metadata Extraction**
```javascript
// Test metadata extraction for specific file
node -e "
const { AwsS3Service } = require('./server/lib/aws');
const aws = new AwsS3Service();

// Test with specific S3 object
aws.extractEnhancedMetadata('your-bucket', [{
  Key: 'path/to/dataset.csv',
  Size: 1000000,
  LastModified: new Date()
}], 'dataset-name')
.then(metadata => {
  console.log('Extracted metadata:', JSON.stringify(metadata, null, 2));
})
.catch(console.error);
"
```

---

## Log Analysis Strategies

### Application Logs

#### Server Logs Location
```bash
# Development logs (console output)
npm run dev 2>&1 | tee logs/app.log

# Production logs (PM2)
pm2 logs data-lake-explorer

# Custom log files
tail -f logs/error.log
tail -f logs/access.log
```

#### Key Log Patterns to Monitor

**1. Error Patterns**
```bash
# Database connection errors
grep -i "database\|connection\|pool" logs/app.log

# Authentication failures
grep -i "unauthorized\|forbidden\|jwt\|token" logs/app.log

# AWS S3 errors
grep -i "s3\|aws\|access denied" logs/app.log

# OpenAI API errors
grep -i "openai\|rate limit\|api key" logs/app.log

# Performance issues
grep -i "slow\|timeout\|memory\|cache" logs/app.log
```

**2. Success Patterns**
```bash
# Successful operations
grep "✅\|Cache warmed\|Database connected" logs/app.log

# User activity
grep "User.*authenticated\|Login successful" logs/app.log

# Dataset operations
grep "datasets refreshed\|insights generated" logs/app.log
```

### Database Query Logs

#### Enable Query Logging
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 2000; -- Log queries > 2 seconds
ALTER SYSTEM SET log_statement = 'all'; -- Log all statements (use carefully)
SELECT pg_reload_conf();
```

#### Analyze Query Performance
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time / calls as avg_time_ms,
  rows / calls as avg_rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 20;
```

### Frontend Error Tracking

#### Browser Console Errors
```javascript
// Add global error handler in main.tsx
window.addEventListener('error', (event) => {
  console.error('Global error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  
  // Send to monitoring service if available
  if (window.analytics) {
    window.analytics.track('JavaScript Error', {
      message: event.message,
      filename: event.filename,
      line: event.lineno
    });
  }
});

// React Error Boundary logging
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error, resetErrorBoundary}) {
  console.error('React Error Boundary caught:', error);
  
  return (
    <div role="alert" className="p-4 border border-red-500 rounded">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
```

### Performance Monitoring

#### Response Time Analysis
```bash
# Parse access logs for slow requests
awk '$7 > 2000 {print $1, $2, $7 "ms", $3}' logs/access.log | sort -nr -k3

# Monitor API endpoint performance
grep "API.*ms" logs/app.log | awk '{print $3, $4}' | sort | uniq -c | sort -nr
```

#### Memory Usage Tracking
```bash
# Monitor memory trends
grep "Memory usage:" logs/app.log | tail -50

# Check for memory leaks
grep -E "(heap|memory|gc)" logs/app.log | tail -20
```

---

## Emergency Procedures

### Application Down

#### Immediate Actions
1. **Check Application Status**
   ```bash
   curl -f http://localhost:5000/api/health
   pm2 status
   ```

2. **Restart Application**
   ```bash
   pm2 restart data-lake-explorer
   # or for development
   npm run dev
   ```

3. **Check Critical Dependencies**
   ```bash
   # Database connectivity
   psql "$DATABASE_URL" -c "SELECT NOW();"
   
   # AWS S3 access
   aws s3 ls s3://your-bucket-name --region us-east-1
   ```

### Database Emergency

#### Database Connection Lost
```bash
# 1. Check database server status
systemctl status postgresql  # For local DB
nslookup your-db-host.com    # For remote DB

# 2. Test connection
psql "$DATABASE_URL" -c "\l"

# 3. Restart application with new connection
pm2 restart data-lake-explorer
```

#### Data Corruption
```bash
# 1. Stop application immediately
pm2 stop data-lake-explorer

# 2. Restore from backup
psql "$DATABASE_URL" < backup_YYYYMMDD_HHMMSS.sql

# 3. Verify data integrity
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM datasets;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"

# 4. Restart application
pm2 start data-lake-explorer
```

### Performance Emergency

#### High Memory Usage
```bash
# 1. Check current memory usage
node -e "console.log(process.memoryUsage())"

# 2. Clear application cache
curl -X POST http://localhost:5000/api/admin/clear-cache

# 3. Force garbage collection (if enabled)
curl -X POST http://localhost:5000/api/admin/gc

# 4. Restart if memory > 1GB
pm2 restart data-lake-explorer
```

#### High CPU Usage
```bash
# 1. Check process CPU usage
top -p $(pgrep -f "data-lake-explorer")

# 2. Check for slow queries
psql "$DATABASE_URL" -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 3. Kill slow queries if necessary
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(PID_FROM_ABOVE);"
```

### Security Incident

#### Suspected Breach
```bash
# 1. Check active sessions
psql "$DATABASE_URL" -c "
SELECT username, COUNT(*) as active_sessions
FROM user_sessions 
WHERE expires_at > NOW()
GROUP BY username;"

# 2. Revoke all JWT tokens (change secret)
# Generate new JWT secret
openssl rand -base64 64
# Update environment variable and restart

# 3. Force user re-authentication
psql "$DATABASE_URL" -c "DELETE FROM user_sessions;"

# 4. Check recent user activity
psql "$DATABASE_URL" -c "
SELECT username, updated_at, last_login_at
FROM users 
ORDER BY last_login_at DESC 
LIMIT 20;"
```

---

## Escalation Procedures

### Issue Severity Classification

#### Severity 1 - Critical (Immediate Response)
- Application completely down
- Data corruption or loss
- Security breach
- Database unavailable

**Response Time**: Immediate  
**Contact**: Senior Developer, System Administrator

#### Severity 2 - High (4-hour Response)
- Significant feature failures
- Performance degradation >80%
- AI services completely down
- Authentication issues affecting multiple users

**Response Time**: 4 hours  
**Contact**: Development Team Lead

#### Severity 3 - Medium (24-hour Response)
- Minor feature issues
- Individual user problems
- Non-critical performance issues
- Documentation updates needed

**Response Time**: 24 hours  
**Contact**: Developer on duty

#### Severity 4 - Low (Best Effort)
- Enhancement requests
- Non-critical bugs
- Cosmetic issues

**Response Time**: Best effort  
**Contact**: Backlog for planning

### Escalation Matrix

| Role | Contact Method | Responsibilities |
|------|----------------|------------------|
| **Developer on Duty** | Slack, Email | First response, basic troubleshooting |
| **Senior Developer** | Phone, Slack | Complex technical issues, code fixes |
| **System Administrator** | Phone, SMS | Infrastructure, database, deployment |
| **Product Owner** | Email, Slack | Feature decisions, user communication |
| **Security Team** | Phone (24/7) | Security incidents, compliance |

### Information to Gather

When escalating, provide:

1. **Issue Summary**
   - Brief description of the problem
   - Affected systems/features
   - Number of users impacted

2. **Technical Details**
   - Error messages and stack traces
   - Browser/environment information
   - Steps to reproduce

3. **Diagnostics Performed**
   - Health check results
   - Log analysis summary
   - Attempted solutions

4. **Current Impact**
   - System availability status
   - User impact assessment
   - Business impact

### Communication Template

```
SEVERITY: [1/2/3/4]
ISSUE: [Brief description]
AFFECTED: [Systems/Users impacted]
STARTED: [Timestamp]

SYMPTOMS:
- [Symptom 1]
- [Symptom 2]

DIAGNOSTICS PERFORMED:
- [Check 1] - [Result]
- [Check 2] - [Result]

ATTEMPTED SOLUTIONS:
- [Solution 1] - [Result]
- [Solution 2] - [Result]

NEXT STEPS:
- [Proposed action]

CONTACT: [Your name and contact info]
```

### Vendor Escalation

For third-party service issues:

#### AWS Support
- **Account**: [Your AWS Account ID]
- **Support Plan**: [Basic/Developer/Business/Enterprise]
- **Contact**: AWS Support Console
- **SLA**: [Based on support plan]

#### OpenAI Support
- **Account**: [Your OpenAI Organization]
- **Contact**: help@openai.com
- **Documentation**: https://platform.openai.com/docs

#### Neon Database
- **Account**: [Your Neon Project ID]
- **Contact**: Neon Support Dashboard
- **Documentation**: https://neon.tech/docs

---

*This troubleshooting guide is a living document. Please update it as new issues are discovered and resolved.*