# Deployment Guide

## Overview

This guide covers deploying the Data Lake Explorer application to production environments.

## Prerequisites

- Node.js 20+
- PostgreSQL database
- AWS S3 bucket access
- OpenAI API key
- Domain name (optional)

## Environment Setup

### Production Environment Variables

Create a `.env.production` file:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
JWT_SECRET=your_secure_jwt_secret_here

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Application
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your_session_secret
```

## Deployment Options

### 1. Replit Deployment (Recommended)

#### Steps:
1. Ensure your project is ready for deployment
2. Click the "Deploy" button in the Replit interface
3. Configure environment variables in Replit Secrets
4. The application will be available at `https://your-repl-name.your-username.replit.app`

#### Required Secrets in Replit:
- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### 2. Docker Deployment

#### Dockerfile:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
```

#### Docker Compose:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=datalake
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 3. Cloud Platform Deployment

#### Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name

# Set environment variables
heroku config:set DATABASE_URL=your_database_url
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set OPENAI_API_KEY=your_openai_key

# Deploy
git push heroku main
```

#### AWS EC2
1. Launch an EC2 instance
2. Install Node.js and PostgreSQL
3. Clone your repository
4. Set up environment variables
5. Use PM2 for process management

## Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Create Database:
```sql
CREATE DATABASE datalake;
CREATE USER datalake_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE datalake TO datalake_user;
```

### Database Migration

Run database migrations:
```bash
npm run db:push
```

### Initial Data Setup

Create an admin user:
```bash
npm run seed:admin
```

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

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
    }
}
```

## Process Management

### PM2 Configuration

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'data-lake-explorer',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Monitoring and Logging

### Application Monitoring

The application includes built-in performance monitoring:
- Query execution times
- Cache hit rates
- Memory usage
- Error tracking

Access monitoring at: `/api/performance/stats`

### Log Management

Configure log rotation:
```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/datalake
```

```
/var/log/datalake/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload data-lake-explorer
    endscript
}
```

## Backup Strategy

### Database Backups

Automated backup script:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="datalake"

mkdir -p $BACKUP_DIR

pg_dump $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

### File System Backups

For uploaded files and cache:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf /backups/files_$TIMESTAMP.tar.gz /app/uploads /app/cache

# Keep only last 7 days
find /backups -name "files_*.tar.gz" -mtime +7 -delete
```

## Security Considerations

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Security Headers

Add to Nginx configuration:
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Rate Limiting

Application includes built-in rate limiting:
- 100 requests per minute for data endpoints
- 10 requests per minute for AI endpoints
- 5 requests per minute for authentication

## Performance Optimization

### Database Optimization

Create indexes:
```sql
CREATE INDEX idx_datasets_folder ON datasets(top_level_folder);
CREATE INDEX idx_datasets_created_at ON datasets(created_at);
CREATE INDEX idx_user_folder_access_user_id ON user_folder_access(user_id);
```

### Caching Strategy

- Redis for session storage (optional)
- In-memory caching for frequently accessed data
- CDN for static assets

### Resource Allocation

Recommended server specifications:
- **Small deployment**: 2 CPU, 4GB RAM, 20GB SSD
- **Medium deployment**: 4 CPU, 8GB RAM, 50GB SSD  
- **Large deployment**: 8 CPU, 16GB RAM, 100GB SSD

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000
# Kill the process
sudo kill -9 <PID>
```

#### Database Connection Issues
1. Check PostgreSQL service status
2. Verify DATABASE_URL format
3. Ensure database exists and user has permissions

#### SSL Certificate Issues
1. Check certificate expiration
2. Verify domain DNS settings
3. Restart Nginx after certificate renewal

### Health Checks

The application provides health check endpoints:
- `/api/health` - Basic health check
- `/api/health/db` - Database connectivity
- `/api/health/cache` - Cache status
- `/api/health/aws` - AWS S3 connectivity

## Maintenance

### Regular Tasks

1. **Weekly**: Check application logs
2. **Monthly**: Review database performance
3. **Quarterly**: Update dependencies
4. **As needed**: Security patches

### Update Process

1. Backup database and files
2. Pull latest changes
3. Run database migrations
4. Restart application
5. Verify functionality