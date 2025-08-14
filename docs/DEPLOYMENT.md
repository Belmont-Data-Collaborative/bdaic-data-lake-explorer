# Deployment Guide
## Data Lake Explorer - Production Deployment Instructions

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Replit Deployment (Recommended)](#replit-deployment-recommended)
5. [Manual Deployment](#manual-deployment)
6. [Database Setup](#database-setup)
7. [Security Configuration](#security-configuration)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Deployment Overview

### Supported Platforms

Data Lake Explorer supports deployment on multiple platforms:

- **Replit** (Recommended): Zero-configuration deployment with built-in database
- **Vercel**: Serverless deployment with external database
- **Heroku**: Container-based deployment
- **AWS/GCP/Azure**: Cloud platform deployment
- **Docker**: Containerized deployment

### Architecture Requirements

- **Node.js Runtime**: Version 20 or higher
- **PostgreSQL Database**: Version 14 or higher
- **Memory**: Minimum 512MB RAM, recommended 1GB+
- **Storage**: 10GB+ for dataset caching and logs

---

## Prerequisites

### Required Services

1. **Database**: PostgreSQL instance (Neon, AWS RDS, etc.)
2. **AWS Account**: S3 bucket access for data lake
3. **OpenAI Account**: API key for AI features
4. **Domain** (Optional): Custom domain for production

### Required Credentials

- AWS Access Key ID and Secret Access Key
- OpenAI API Key
- Database connection string
- JWT secret key

---

## Environment Configuration

### Core Environment Variables

Create a `.env` file or configure environment variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
POSTGRES_PRISMA_URL=postgresql://username:password@host:port/database
POSTGRES_URL_NON_POOLING=postgresql://username:password@host:port/database

# Authentication
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket_name

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
NODE_ENV=production
PORT=5000

# Security (Optional)
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Security Environment Variables

```env
# Additional Security Configuration
SESSION_SECRET=your_session_secret_key
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=24h
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
```

---

## Replit Deployment (Recommended)

### Step 1: Fork or Import Project

1. Click **"Fork"** or **"Import from GitHub"** in Replit
2. Configure the project settings:
   - **Language**: Node.js
   - **Run Command**: `npm run dev`

### Step 2: Configure Secrets

In Replit Secrets (Tools → Secrets), add all environment variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
OPENAI_API_KEY=sk-...
```

### Step 3: Database Setup

Replit automatically provisions a PostgreSQL database:

1. Run database migration:
   ```bash
   npm run db:push
   ```

2. Verify database connection:
   ```bash
   npm run db:studio
   ```

### Step 4: Deploy Application

1. Click **"Deploy"** in Replit
2. Choose deployment settings:
   - **Autoscale**: Enabled
   - **Always On**: Enabled for production
3. Configure custom domain (optional)

### Step 5: Create Admin User

After deployment, create an admin user through the database:

```sql
INSERT INTO users (username, email, password_hash, role, is_active, is_ai_enabled, created_at)
VALUES (
  'admin',
  'admin@yourdomain.com',
  '$2b$12$...', -- bcrypt hash of password
  'admin',
  true,
  true,
  NOW()
);
```

---

## Manual Deployment

### Step 1: Server Setup

Prepare your server environment:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash dataexplorer
sudo su - dataexplorer
```

### Step 2: Application Deployment

```bash
# Clone repository
git clone <repository-url> data-lake-explorer
cd data-lake-explorer

# Install dependencies
npm ci --production

# Build application
npm run build

# Copy environment file
cp .env.example .env
nano .env  # Configure your variables
```

### Step 3: Database Migration

```bash
# Run database migrations
npm run db:push

# Verify database setup
npm run db:studio
```

### Step 4: Process Management

Create PM2 ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'data-lake-explorer',
    script: 'npm',
    args: 'start',
    cwd: '/home/dataexplorer/data-lake-explorer',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log'
  }]
};
```

Start application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 5: Reverse Proxy Setup

Configure Nginx reverse proxy:

```nginx
# /etc/nginx/sites-available/data-lake-explorer
server {
    listen 80;
    server_name your-domain.com;
    
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
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/data-lake-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Certificate

Install SSL certificate with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Database Setup

### PostgreSQL Configuration

**Performance Optimization**:

```sql
-- Database optimizations for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

**Security Configuration**:

```sql
-- Create application user
CREATE USER dataexplorer WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE data_lake_explorer TO dataexplorer;
GRANT USAGE ON SCHEMA public TO dataexplorer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dataexplorer;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dataexplorer;
```

### Database Backup Strategy

**Automated Backups**:

```bash
#!/bin/bash
# backup-database.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="data_lake_explorer_$DATE.sql"

pg_dump $DATABASE_URL > /backups/$BACKUP_FILE
gzip /backups/$BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp /backups/$BACKUP_FILE.gz s3://your-backup-bucket/database/

# Keep only last 7 days of backups
find /backups -name "data_lake_explorer_*.sql.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /home/dataexplorer/scripts/backup-database.sh
```

---

## Security Configuration

### SSL/TLS Configuration

**Nginx SSL Settings**:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Application Security

**Security Headers** (automatically configured in Express):
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

---

## Post-Deployment Verification

### Health Checks

**Application Health**:
```bash
# Check application status
curl -f https://your-domain.com/api/health

# Check database connection
curl -f https://your-domain.com/api/health/database

# Check AWS S3 connection
curl -f https://your-domain.com/api/health/aws
```

**Expected Responses**:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-14T10:00:00.000Z",
  "services": {
    "database": "connected",
    "aws": "connected",
    "cache": "active"
  }
}
```

### Performance Testing

**Load Testing with curl**:
```bash
# Test authentication endpoint
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
    https://your-domain.com/api/auth/login
done

# Test dataset endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  -w "%{http_code} %{time_total}s\n" \
  https://your-domain.com/api/datasets
```

### Initial Admin Setup

1. **Create Admin Account**:
   ```sql
   INSERT INTO users (username, email, password_hash, role, is_active, is_ai_enabled)
   VALUES ('admin', 'admin@yourdomain.com', '$2b$12$...', 'admin', true, true);
   ```

2. **Configure AWS Settings**:
   - Access admin panel at `/admin`
   - Configure AWS S3 bucket settings
   - Test S3 connection

3. **Perform Initial Refresh**:
   - Trigger dataset refresh from S3
   - Verify dataset loading and metadata extraction

---

## Monitoring and Maintenance

### Application Monitoring

**PM2 Monitoring**:
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs data-lake-explorer --lines 100

# Application metrics
pm2 show data-lake-explorer
```

**Log Management**:
```bash
# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

### Database Monitoring

**PostgreSQL Performance**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('data_lake_explorer'));

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Maintenance Schedule

**Daily Tasks**:
- Monitor application logs for errors
- Check database connection counts
- Verify S3 connectivity

**Weekly Tasks**:
- Review user activity and access patterns
- Check disk space and cleanup old logs
- Update system packages and dependencies

**Monthly Tasks**:
- Full database backup verification
- Security audit of user permissions
- Performance optimization review
- Update SSL certificates (if needed)

---

## Troubleshooting

### Common Issues

**Application Won't Start**:
1. Check environment variables
2. Verify database connectivity
3. Check port availability
4. Review application logs

**Database Connection Issues**:
1. Verify DATABASE_URL format
2. Check database server status
3. Verify network connectivity
4. Check connection limits

**S3 Access Issues**:
1. Verify AWS credentials
2. Check bucket permissions
3. Test AWS SDK connectivity
4. Review CORS configuration

### Performance Issues

**Slow Queries**:
1. Enable database query logging
2. Identify slow queries in logs
3. Add appropriate indexes
4. Consider query optimization

**High Memory Usage**:
1. Monitor memory usage with PM2
2. Check for memory leaks
3. Optimize data processing
4. Consider increasing server memory

---

## Support and Updates

### Update Procedure

1. **Backup Database**: Always backup before updates
2. **Test in Staging**: Deploy to staging environment first
3. **Update Dependencies**: `npm update`
4. **Run Migrations**: `npm run db:push`
5. **Deploy**: Deploy to production
6. **Verify**: Run health checks and functionality tests

### Getting Support

- **Documentation**: Check `/docs/` directory
- **Health Endpoint**: Monitor `/api/health`
- **Logs**: Check application and database logs
- **GitHub Issues**: Report bugs or request features

---

*Document Version: 1.0*  
*Last Updated: August 2025*  
*Deployment Guide for Data Lake Explorer*