# Data Lake Explorer - Deployment Guide

A comprehensive guide for deploying the Data Lake Explorer application across different environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Database Setup](#database-setup)
6. [AWS Configuration](#aws-configuration)
7. [Security Checklist](#security-checklist)
8. [Verification Steps](#verification-steps)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: Version 20.x or higher
- **npm**: Version 9.x or higher
- **PostgreSQL**: Version 14 or higher
- **AWS Account**: For S3 bucket access
- **OpenAI Account**: For AI features (optional but recommended)

### Platform Dependencies

```bash
# Verify Node.js version
node --version  # Should be >= 20.0.0

# Verify npm version
npm --version   # Should be >= 9.0.0

# Check available memory (minimum 2GB recommended)
free -h
```

### Required Services

1. **PostgreSQL Database**
   - Local: PostgreSQL server running locally
   - Cloud: Neon, AWS RDS, or similar hosted PostgreSQL
   - Connection string format: `postgresql://username:password@host:port/database`

2. **AWS S3 Bucket**
   - S3 bucket for data lake storage
   - IAM user with appropriate permissions
   - Access key and secret key

3. **OpenAI API** (Optional)
   - OpenAI account with API access
   - Valid API key for AI features

---

## Environment Configuration

### Core Environment Variables

Create a `.env` file in the project root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name
# Alternative format for Neon and other cloud providers:
# DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/database_name?sslmode=require

# Authentication & Security
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_long
# Generate a secure secret: openssl rand -base64 32

# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-data-lake-bucket-name

# AI Services (Optional)
OPENAI_API_KEY=sk-...

# Application Configuration
NODE_ENV=development
PORT=5000

# Optional: CORS Configuration
CORS_ORIGIN=https://your-domain.com
```

### Production Environment Variables

For production deployments, add these additional variables:

```env
# Production Database Settings
DATABASE_URL=postgresql://prod_user:secure_password@prod-db-host:5432/data_lake_explorer

# Security Configuration
NODE_ENV=production
JWT_SECRET=your_production_jwt_secret_64_characters_minimum
SESSION_SECRET=your_session_secret_key
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=24h

# SSL/Security Headers
COOKIE_SECURE=true
COOKIE_SAMESITE=strict

# Performance Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Analytics and Monitoring
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=info
```

### Frontend Environment Variables (VITE_ prefixed)

If you need frontend-specific configuration, create these variables:

```env
# Frontend Configuration (accessible in browser)
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_NAME="Data Lake Explorer"
VITE_ENABLE_AI_FEATURES=true
VITE_MAX_UPLOAD_SIZE=10485760
```

### Environment Variable Security

**⚠️ Security Best Practices:**

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for JWT and session keys
3. **Rotate API keys regularly** (quarterly recommended)
4. **Use different credentials** for different environments
5. **Store production secrets** in secure secret management systems

---

## Local Development Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url> data-lake-explorer
cd data-lake-explorer

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 2: Database Setup

```bash
# Start PostgreSQL service (if running locally)
# macOS with Homebrew:
brew services start postgresql

# Ubuntu/Debian:
sudo systemctl start postgresql

# Create database (if needed)
createdb data_lake_explorer

# Set up your DATABASE_URL in .env file
# Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/data_lake_explorer
```

### Step 3: Initialize Database Schema

```bash
# Deploy database schema
npm run db:push

# Verify database connection
npm run check
```

### Step 4: Start Development Server

```bash
# Start the development server
npm run dev

# This will start:
# - Express server on http://localhost:5000
# - Vite frontend build process
# - Hot reload for both frontend and backend changes
```

### Step 5: Create Initial Admin User

After the server is running, create an admin user through the database:

```sql
-- Connect to your database and run this SQL:
INSERT INTO users (username, email, password_hash, role, is_active, is_ai_enabled, created_at, updated_at)
VALUES (
  'admin',
  'admin@yourdomain.com',
  '$2b$10$hash_generated_from_bcrypt', -- Use bcrypt to hash your password
  'admin',
  true,
  true,
  NOW(),
  NOW()
);
```

Or use Node.js to generate the password hash:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your_password', 10, (err, hash) => console.log(hash));"
```

---

## Production Deployment

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash dataexplorer
sudo mkdir -p /var/www/data-lake-explorer
sudo chown dataexplorer:dataexplorer /var/www/data-lake-explorer
```

### Step 2: Application Deployment

```bash
# Switch to application user
sudo su - dataexplorer

# Clone and setup application
cd /var/www/data-lake-explorer
git clone <repository-url> .

# Install production dependencies
npm ci --production=false

# Build the application
npm run build

# Copy production environment file
cp .env.example .env.production
# Edit .env.production with your production values
nano .env.production
```

### Step 3: Database Migration

```bash
# Set environment variables
export NODE_ENV=production
export DATABASE_URL="your_production_database_url"

# Run database migrations
npm run db:push

# Create production admin user
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('your_secure_admin_password', 12, (err, hash) => {
  console.log('INSERT INTO users (username, email, password_hash, role, is_active, is_ai_enabled, created_at, updated_at)');
  console.log('VALUES (');
  console.log('  \\'admin\\',');
  console.log('  \\'admin@yourdomain.com\\',');
  console.log('  \\''+hash+'\\',');
  console.log('  \\'admin\\',');
  console.log('  true,');
  console.log('  true,');
  console.log('  NOW(),');
  console.log('  NOW()');
  console.log(');');
});
"
```

### Step 4: Process Management with PM2

Create PM2 ecosystem configuration:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'data-lake-explorer',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/data-lake-explorer',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions provided by the command above
```

### Step 5: Reverse Proxy Setup (Nginx)

```nginx
# /etc/nginx/sites-available/data-lake-explorer
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
    
    # Main application proxy
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/data-lake-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Database Setup

### Drizzle Schema Deployment

The application uses Drizzle ORM for database operations. The schema includes:

- **Users table**: User management and authentication
- **Datasets table**: Data lake asset catalog
- **AWS Config table**: S3 connection settings
- **User Folder Access table**: Permission management
- **AI Usage Log table**: AI feature usage tracking
- **Downloads table**: Download tracking and analytics

```bash
# Deploy initial schema
npm run db:push

# For production, use force if needed (after backing up)
npm run db:push --force
```

### Database Optimization

```sql
-- Apply these optimizations after schema deployment
-- Run these commands in your PostgreSQL client

-- Optimize for dataset queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datasets_performance 
ON datasets(status, top_level_folder, format, last_modified DESC);

-- Optimize user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth 
ON users(username) WHERE is_active = true;

-- Optimize folder access queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folder_access_user 
ON user_folder_access(user_id, can_access) WHERE can_access = true;

-- Update table statistics
ANALYZE datasets;
ANALYZE users;
ANALYZE user_folder_access;
```

### Database Backup Strategy

```bash
#!/bin/bash
# backup-database.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/data-lake-explorer"
BACKUP_FILE="$BACKUP_DIR/data_lake_explorer_$DATE.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/database/ --region us-east-1

# Keep only last 7 days of local backups
find "$BACKUP_DIR" -name "data_lake_explorer_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_FILE.gz"
```

```bash
# Make backup script executable
chmod +x backup-database.sh

# Add to crontab for daily backups
crontab -e
# Add this line:
# 0 2 * * * /path/to/backup-database.sh >> /var/log/backup.log 2>&1
```

### Initial Admin User Creation

```sql
-- Method 1: Direct SQL insertion
INSERT INTO users (
  username, 
  email, 
  password_hash, 
  role, 
  is_active, 
  is_ai_enabled, 
  created_at, 
  updated_at
) VALUES (
  'admin',
  'admin@yourdomain.com',
  '$2b$12$generated_bcrypt_hash_here',
  'admin',
  true,
  true,
  NOW(),
  NOW()
);
```

```javascript
// Method 2: Node.js script (create-admin.js)
const bcrypt = require('bcrypt');
const { db } = require('./server/db');
const { users } = require('./shared/schema');

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'DataIsGood123!';
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  const [admin] = await db.insert(users).values({
    username,
    email,
    passwordHash,
    role: 'admin',
    isActive: true,
    isAiEnabled: true,
  }).returning();
  
  console.log('Admin user created:', admin.username, admin.email);
  process.exit(0);
}

createAdmin().catch(console.error);
```

```bash
# Run the script
ADMIN_USERNAME=admin ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=YourSecurePassword123! node create-admin.js
```

---

## AWS Configuration

### S3 Bucket Setup

1. **Create S3 Bucket**:

```bash
# Using AWS CLI
aws s3 mb s3://your-data-lake-bucket --region us-east-1

# Set bucket versioning (optional)
aws s3api put-bucket-versioning \
  --bucket your-data-lake-bucket \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket your-data-lake-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

2. **Configure CORS for Web Access**:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["https://your-domain.com", "https://localhost:5000"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

```bash
# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket your-data-lake-bucket \
  --cors-configuration file://cors-config.json
```

### IAM Policy Configuration

Create an IAM policy for the application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetObjectAttributes",
        "s3:ListBucket",
        "s3:ListBucketVersions"
      ],
      "Resource": [
        "arn:aws:s3:::your-data-lake-bucket",
        "arn:aws:s3:::your-data-lake-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:GetBucketVersioning",
        "s3:ListAllMyBuckets"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name DataLakeExplorerPolicy \
  --policy-document file://s3-policy.json

# Create IAM user
aws iam create-user --user-name data-lake-explorer

# Attach policy to user
aws iam attach-user-policy \
  --user-name data-lake-explorer \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/DataLakeExplorerPolicy

# Create access keys
aws iam create-access-key --user-name data-lake-explorer
```

### Regional Considerations

**Recommended regions for optimal performance**:

- **US East (N. Virginia)**: `us-east-1` - Lowest latency for most US users
- **US West (Oregon)**: `us-west-2` - Good for West Coast users
- **Europe (Ireland)**: `eu-west-1` - European users
- **Asia Pacific (Singapore)**: `ap-southeast-1` - Asian users

**Configuration examples**:

```env
# US East deployment
AWS_REGION=us-east-1
AWS_S3_BUCKET=data-lake-us-east-1

# European deployment
AWS_REGION=eu-west-1
AWS_S3_BUCKET=data-lake-eu-west-1
```

### Data Organization in S3

**Recommended bucket structure**:

```
your-data-lake-bucket/
├── cdc_places/
│   ├── 2023_data.csv
│   ├── 2023_data.yaml
│   └── historical/
├── cdc_svi/
│   ├── svi_2020.csv
│   └── svi_2020.yaml
├── environmental/
│   ├── air_quality.csv
│   └── water_quality.csv
└── metadata/
    ├── schemas/
    └── documentation/
```

---

## Security Checklist

### JWT Configuration Security

```env
# ✅ Generate strong JWT secrets (64+ characters)
JWT_SECRET=$(openssl rand -base64 64)

# ✅ Set appropriate expiration
JWT_EXPIRES_IN=24h

# ✅ Production security settings
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
```

### CORS Configuration

```javascript
// In server/index.ts - Configure CORS appropriately
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Environment Variable Security

**✅ Secure practices**:

```bash
# Use environment-specific files
.env.development
.env.production
.env.staging

# Set proper file permissions
chmod 600 .env*

# Use secret management systems in production
export DATABASE_URL=$(aws ssm get-parameter --name "/app/database-url" --with-decryption --query "Parameter.Value" --output text)
```

**❌ Avoid these practices**:

- Committing `.env` files to version control
- Using weak JWT secrets (< 32 characters)
- Sharing the same secrets across environments
- Storing secrets in plain text files

### Database Security

```sql
-- Create dedicated application user
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE data_lake_explorer TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Enable row-level security (optional)
ALTER TABLE user_folder_access ENABLE ROW LEVEL SECURITY;
```

### SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:MozTLS:10m;
ssl_stapling on;
ssl_stapling_verify on;

# Security headers
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com;";
```

---

## Verification Steps

### Health Check Endpoints

The application provides health check endpoints for monitoring:

```bash
# Basic health check
curl -f http://localhost:5000/api/health
# Expected response: {"status": "healthy", "timestamp": "2024-01-01T00:00:00.000Z"}

# Database connectivity check
curl -f http://localhost:5000/api/datasets
# Should return dataset list or empty array

# AWS S3 connectivity check
curl -f -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/admin/aws-config
# Should return AWS configuration status
```

### Connectivity Tests

1. **Database Connection**:

```javascript
// test-db.js
const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

async function testDatabase() {
  try {
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connected successfully:', result[0].current_time);
    
    // Test tables exist
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log('✅ Tables found:', tables.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
```

```bash
node test-db.js
```

2. **AWS S3 Connection**:

```javascript
// test-aws.js
const { AwsS3Service } = require('./server/lib/aws');

async function testAWS() {
  try {
    const aws = new AwsS3Service(process.env.AWS_REGION);
    const bucketName = process.env.AWS_S3_BUCKET;
    
    const isConnected = await aws.testConnection(bucketName);
    if (isConnected) {
      console.log('✅ AWS S3 connected successfully');
      
      const datasets = await aws.listDatasets(bucketName);
      console.log(`✅ Found ${datasets.length} datasets in bucket`);
    } else {
      console.error('❌ AWS S3 connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ AWS S3 test failed:', error.message);
    process.exit(1);
  }
}

testAWS();
```

```bash
node test-aws.js
```

3. **OpenAI API Test** (if enabled):

```javascript
// test-openai.js
const { openAIService } = require('./server/lib/openai');

async function testOpenAI() {
  try {
    const response = await openAIService.generateDatasetInsights("Sample dataset for testing API connectivity");
    console.log('✅ OpenAI API connected successfully');
    console.log('Response length:', response.length);
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error.message);
    if (error.message.includes('401')) {
      console.error('Check your OPENAI_API_KEY');
    }
  }
}

testOpenAI();
```

```bash
node test-openai.js
```

### Initial Data Load

After deployment, trigger an initial data refresh:

```bash
# Login as admin and trigger refresh via API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  http://localhost:5000/api/admin/refresh-datasets

# Or access the admin panel at:
# https://your-domain.com/admin
# Navigate to "Refresh Datasets" and click refresh
```

### Performance Verification

```bash
# Test response times
time curl -s http://localhost:5000/api/datasets > /dev/null
time curl -s http://localhost:5000/api/stats > /dev/null

# Check memory usage
pm2 monit

# Check database performance
psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## Troubleshooting

### Common Deployment Issues

#### 1. Database Connection Failures

**Symptoms**:
- Error: "DATABASE_URL must be set. Did you forget to provision a database?"
- Connection timeouts
- Authentication failures

**Solutions**:

```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should look like: postgresql://username:password@host:port/database

# Test direct connection
psql $DATABASE_URL -c "SELECT version();"

# For Neon or cloud providers, ensure SSL is included:
# postgresql://user:pass@host/db?sslmode=require

# Check firewall rules (for cloud databases)
# Whitelist your server's IP address in database security groups
```

#### 2. Missing Environment Variables

**Symptoms**:
- Error: "JWT_SECRET is required"
- AWS credential errors
- OpenAI API failures

**Solutions**:

```bash
# Create complete .env file checklist
cat > env-checklist.sh << 'EOF'
#!/bin/bash
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_REGION"
  "AWS_S3_BUCKET"
  "OPENAI_API_KEY"
  "NODE_ENV"
  "PORT"
)

echo "Environment Variable Checklist:"
echo "==============================="

for var in "${required_vars[@]}"; do
  if [[ -n "${!var}" ]]; then
    echo "✅ $var is set"
  else
    echo "❌ $var is MISSING"
  fi
done
EOF

chmod +x env-checklist.sh
./env-checklist.sh
```

#### 3. AWS Permission Problems

**Symptoms**:
- "Access Denied" when listing S3 objects
- "InvalidAccessKeyId" errors
- CORS errors in browser

**Solutions**:

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test S3 bucket access
aws s3 ls s3://your-bucket-name/

# Check IAM policy
aws iam get-user-policy --user-name data-lake-explorer --policy-name DataLakeExplorerPolicy

# Test specific S3 operations
aws s3api head-bucket --bucket your-bucket-name
aws s3api get-bucket-cors --bucket your-bucket-name
```

#### 4. Build and Compilation Issues

**Symptoms**:
- TypeScript compilation errors
- Missing dependencies
- Build failures

**Solutions**:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript issues
npm run check

# Build with verbose output
npm run build -- --verbose

# Check Node.js version compatibility
node --version
npm --version
```

#### 5. Port and Networking Issues

**Symptoms**:
- "Port 5000 already in use"
- Connection refused errors
- Proxy errors

**Solutions**:

```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill conflicting processes
sudo kill -9 $(sudo lsof -t -i :5000)

# Use alternative port
PORT=3000 npm run dev

# Check firewall rules
sudo ufw status
# Open port if needed:
sudo ufw allow 5000
```

### Performance Troubleshooting

#### Database Performance Issues

```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check missing indexes
SELECT 
  schemaname, 
  tablename, 
  attname, 
  n_distinct, 
  correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
```

#### Memory and CPU Issues

```bash
# Monitor PM2 processes
pm2 monit

# Check system resources
htop
free -h
df -h

# PM2 memory restart if needed
pm2 restart data-lake-explorer

# Check for memory leaks
pm2 logs data-lake-explorer --lines 100 | grep -i "memory\|heap"
```

### Debugging Tools and Commands

```bash
# Check application logs
pm2 logs data-lake-explorer --lines 50

# Check system logs
sudo journalctl -u nginx -f
sudo journalctl -f | grep data-lake

# Database debugging
export DEBUG=drizzle:*
npm run dev

# Network debugging
curl -v http://localhost:5000/api/health
netstat -tulpn | grep :5000

# SSL certificate check
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Production Monitoring

### Log Management

```bash
# Setup log rotation for PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Health Monitoring

```bash
#!/bin/bash
# health-monitor.sh
HEALTH_URL="https://your-domain.com/api/health"
WEBHOOK_URL="https://your-alert-webhook.com/alert"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    echo "❌ Health check failed with status $response"
    curl -X POST $WEBHOOK_URL \
         -H 'Content-Type: application/json' \
         -d "{\"text\":\"Data Lake Explorer health check failed with status $response\"}"
    exit 1
else
    echo "✅ Health check passed"
fi
```

### Backup Monitoring

```bash
# Monitor backup status
ls -la /var/backups/data-lake-explorer/
aws s3 ls s3://your-backup-bucket/database/ --human-readable
```

---

**Documentation Version**: 1.0  
**Last Updated**: September 2025  
**Deployment Guide for Data Lake Explorer**

For additional support, refer to:
- [Architecture Documentation](../ARCHITECTURE.md)
- [Security Guide](../SECURITY.md) 
- [API Documentation](../api-documentation.md)