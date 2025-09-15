# Data Lake Explorer - Administrator Guide

This comprehensive guide covers all administrative functions for managing users, configuring access, monitoring performance, and maintaining the Data Lake Explorer system.

## Table of Contents

- [Administrator Overview](#administrator-overview)
- [User Management](#user-management)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [AI Feature Management](#ai-feature-management)
- [Folder Access Control](#folder-access-control)
- [AWS Configuration](#aws-configuration)
- [System Monitoring](#system-monitoring)
- [Performance Management](#performance-management)
- [Security Operations](#security-operations)
- [Data Management](#data-management)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Administrator Overview

### Administrator Responsibilities

As an administrator, you have full control over:

- **User Lifecycle**: Creating, managing, and deactivating user accounts
- **Access Control**: Managing folder permissions and role assignments
- **AI Features**: Enabling/disabling AI capabilities per user
- **Data Sources**: Configuring AWS S3 connections and refreshing datasets
- **System Health**: Monitoring performance, cache management, and troubleshooting
- **Security**: Managing authentication, sessions, and audit logging

### Administrator Dashboard

**Key Metrics Available:**
- Total datasets and data volume
- Active users and their permissions
- System performance indicators
- Recent user activity and downloads
- Cache performance and hit rates

**Quick Actions:**
- Create new user accounts
- Refresh dataset metadata from S3
- Clear system caches
- Generate system reports

## User Management

### Creating New Accounts

**Registration is completely disabled** for regular users. Only administrators can create accounts.

**Create User Process:**
1. Navigate to **User Management** section
2. Click **"Create New User"**
3. Fill required information:
   - **Username**: Unique identifier for login
   - **Email**: Contact email address
   - **Password**: Secure initial password
   - **Role**: Admin or User (see RBAC section)
4. Set initial permissions:
   - **Folder Access**: No folders by default (zero-access approach)
   - **AI Features**: Disabled by default for security

**Default New User Settings:**
- **Role**: User (not Admin)
- **Folder Access**: None (must be explicitly granted)
- **AI Features**: Disabled (must be explicitly enabled)
- **Account Status**: Active

### User Account Management

**Viewing User Information:**
- Complete user list with roles and status
- Last login and activity timestamps
- Folder access permissions summary
- AI feature status per user
- Download activity and statistics

**Account Actions:**
- **Edit User Details**: Update username, email, role
- **Reset Password**: Generate new temporary password
- **Toggle Active Status**: Immediately disable/enable login access
- **Delete Account**: Permanently remove user (use cautiously)

**User Status Indicators:**
- 🟢 **Active**: Can log in and access assigned resources
- 🔴 **Inactive**: Login disabled, no system access
- 👑 **Admin**: Full administrative privileges
- 👤 **User**: Standard user with limited permissions

### Password Management

**Reset User Passwords:**
1. Select user from user management list
2. Click **"Reset Password"**
3. System generates secure temporary password
4. Share new password securely with user
5. User should change password on first login

**Password Security Requirements:**
- Minimum 8 characters
- Mix of letters, numbers, and symbols recommended
- Passwords are hashed using bcrypt with secure salt rounds
- No password history or reuse validation (can be enhanced)

### User Activity Monitoring

**Track User Actions:**
- Login attempts and session activity
- Dataset access and download patterns
- AI feature usage and query frequency
- Folder access attempts and permissions

**Audit Information:**
- **Login History**: Successful and failed login attempts
- **Download Logs**: Sample and full dataset downloads
- **AI Usage**: AI queries and insights generation
- **System Actions**: Cache invalidation, system refreshes

## Role-Based Access Control (RBAC)

### Understanding Roles

**Admin Role:**
- **Full System Access**: All folders, datasets, and system functions
- **User Management**: Create, modify, and delete user accounts
- **System Configuration**: AWS settings, cache management, system refresh
- **AI Features**: All AI capabilities enabled by default
- **Monitoring**: Access to system metrics and performance data
- **Security**: Audit logs, session management, security settings

**User Role:**
- **Limited Access**: Only assigned folders and datasets
- **Data Operations**: Download samples, full datasets, and metadata
- **AI Features**: Only if explicitly enabled by administrator
- **Personal Account**: Can change own password, view own activity
- **No Admin Functions**: Cannot modify other users or system settings

### Role Assignment

**Changing User Roles:**
1. Access user management interface
2. Select target user account
3. Update role field (Admin/User)
4. Confirm role change
5. Changes take effect immediately (user may need to re-login)

**Role Change Implications:**
- **Promote to Admin**: User gains full system access immediately
- **Demote to User**: Admin privileges removed, folder access maintained
- **Session Handling**: Active sessions continue until logout/expiration

### Permission Inheritance

**Admin Permissions:**
- Automatic access to all existing and future folders
- Cannot be restricted by folder access controls
- Bypass most system limitations and filters

**User Permissions:**
- Explicitly granted folder access only
- Cannot access folders not specifically assigned
- Subject to all system limitations and security controls

## AI Feature Management

### Individual AI Control

AI features are controlled at the individual user level, providing granular security and cost management.

**AI Features Available:**
- **Ask AI**: Single dataset questions and analysis
- **Generate Insights**: Automated dataset analysis and pattern recognition
- **Multi-dataset Chat**: Comparative analysis across multiple datasets
- **Column Search**: AI-powered semantic column search

### Enabling AI Features

**Per-User AI Configuration:**
1. Navigate to user management
2. Select specific user account
3. Toggle **"AI Features Enabled"** setting
4. Save changes to apply immediately

**AI Status Indicators:**
- ✅ **AI Enabled**: User has access to all AI features
- ❌ **AI Disabled**: User cannot access any AI features
- 🟡 **Limited**: Future enhancement for granular AI permissions

### AI Usage Monitoring

**Track AI Consumption:**
- Number of AI queries per user
- Token usage and costs (when available)
- Most common query types and patterns
- Performance metrics for AI responses

**Cost Management:**
- Monitor OpenAI API usage and costs
- Set usage alerts and thresholds
- Identify high-usage users and patterns
- Optimize AI feature allocation

### AI Security Considerations

**Data Privacy:**
- Sample data sent to OpenAI for processing
- No full datasets transmitted to external services
- Questions and responses processed according to OpenAI policies
- Consider data sensitivity when enabling AI features

**Access Control:**
- Enable AI only for trusted users
- Monitor AI usage for appropriate business use
- Regularly review AI permissions and usage patterns
- Document AI usage policies for your organization

## Folder Access Control

### Understanding Folder Permissions

Folder access control provides granular permission management for data lake sections.

**Folder Structure:**
- **Top-Level Folders**: Primary data source categorization
- **Nested Organization**: Hierarchical folder structure possible
- **Permission Inheritance**: Folder permissions apply to all contained datasets
- **Dynamic Discovery**: New folders automatically discovered during S3 scans

### Managing Folder Access

**Assigning Folder Permissions:**
1. Access user management interface
2. Select user account
3. Navigate to **"Folder Access"** section
4. Add specific folder names user should access
5. Save changes to apply immediately

**Folder Permission Effects:**
- **Dataset Visibility**: Users only see datasets in permitted folders
- **Download Access**: Can only download from assigned folders
- **Statistics**: User stats only include accessible datasets
- **Search Results**: Search limited to permitted folder contents

### Folder Access Best Practices

**Security-First Approach:**
- **Zero Access Default**: New users start with no folder access
- **Minimum Necessary**: Grant only folders required for user's role
- **Regular Review**: Periodically audit and update folder permissions
- **Documentation**: Document folder contents and access policies

**Organization Strategies:**
- **Department-Based**: Assign folders by organizational department
- **Project-Based**: Grant access based on current projects
- **Data Sensitivity**: Control access based on data classification
- **Temporary Access**: Grant time-limited access for specific projects

### Folder Management

**Adding New Folders:**
- Folders are automatically discovered during S3 scans
- No manual folder creation needed in the system
- Organize data in S3 bucket structure for automatic detection

**Folder Naming Conventions:**
- Use clear, descriptive folder names
- Avoid spaces and special characters when possible
- Consider hierarchical naming (e.g., `department_project_year`)
- Document folder purposes and contents

## AWS Configuration

### S3 Bucket Configuration

**Required AWS Settings:**
- **Access Key ID**: AWS IAM user access key
- **Secret Access Key**: Corresponding secret key
- **Region**: AWS region where bucket is located
- **Bucket Name**: Target S3 bucket containing datasets

**Permission Requirements:**
AWS IAM user needs the following S3 permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### Testing AWS Connection

**Connection Verification:**
1. Navigate to **System Configuration**
2. Click **"Test AWS Connection"**
3. System verifies:
   - Credential validity
   - Bucket accessibility
   - Region configuration
   - Permission levels

**Connection Status Indicators:**
- ✅ **Connected**: All tests passed, system operational
- ⚠️ **Warning**: Connection works but with limited permissions
- ❌ **Failed**: Cannot connect, check configuration
- 🔄 **Testing**: Connection test in progress

### AWS Security Best Practices

**Credential Management:**
- Use dedicated IAM user for Data Lake Explorer
- Rotate access keys regularly
- Use principle of least privilege
- Monitor AWS CloudTrail for access logs

**Network Security:**
- Consider VPC endpoints for private S3 access
- Use bucket policies for additional access control
- Enable S3 server-side encryption
- Monitor unusual access patterns

## System Monitoring

### Performance Metrics

**System Health Dashboard:**
- **Response Times**: API endpoint performance
- **Database Performance**: Query execution times and connection status
- **Cache Performance**: Hit rates and cache effectiveness
- **Memory Usage**: System resource consumption
- **Active Sessions**: Current user count and activity

**Database Monitoring:**
- **Connection Pool**: Active and idle connections
- **Slow Queries**: Queries exceeding performance thresholds
- **Index Usage**: Database index efficiency
- **Lock Contention**: Database locking issues

### Cache Management

**Multi-Layered Caching System:**
- **In-Memory Cache**: Fast access to frequently used data
- **Database Query Cache**: Optimized query result caching
- **Response Compression**: Gzip compression for large responses
- **Browser Caching**: Appropriate cache headers for static resources

**Cache Operations:**
- **View Cache Status**: Current cache usage and hit rates
- **Clear Specific Cache**: Remove specific cached items
- **Invalidate All**: Clear entire cache (use cautiously)
- **Cache Warming**: Pre-populate cache with critical data

**Cache Configuration:**
- **TTL Settings**: Time-to-live for different cache types
- **Size Limits**: Maximum cache size and memory usage
- **Eviction Policies**: How cache handles memory pressure
- **Performance Monitoring**: Track cache effectiveness

### System Refresh Operations

**Dataset Metadata Refresh:**
1. Click **"Refresh Datasets"** (admin-only function)
2. System scans configured S3 bucket
3. Updates dataset metadata and folder structure
4. Refreshes statistics and cache
5. Notifies completion status

**Refresh Operations Include:**
- **New Dataset Discovery**: Find newly added datasets
- **Metadata Updates**: Refresh file sizes, modification dates
- **Folder Structure**: Update folder organization
- **Statistics Recalculation**: Update system-wide statistics
- **Cache Invalidation**: Clear outdated cached data

**Automatic Refresh Scheduling:**
- Configure automatic refresh intervals
- Monitor refresh performance and duration
- Set up alerts for failed refresh operations
- Review refresh logs for issues

## Performance Management

### Database Optimization

**Query Performance:**
- **Index Management**: Ensure proper database indexing
- **Query Optimization**: Monitor and optimize slow queries
- **Connection Pooling**: Configure optimal connection pool settings
- **Statistics Updates**: Keep database statistics current

**Database Maintenance:**
- **Regular Backups**: Ensure consistent backup procedures
- **Vacuum Operations**: PostgreSQL-specific maintenance
- **Index Rebuilding**: Periodic index maintenance
- **Growth Monitoring**: Track database size and growth

### Application Performance

**Response Time Optimization:**
- **API Endpoint Monitoring**: Track response times per endpoint
- **Database Query Analysis**: Identify and optimize slow queries
- **Caching Strategy**: Optimize cache hit rates and TTL settings
- **Resource Utilization**: Monitor CPU, memory, and I/O usage

**Scalability Considerations:**
- **Concurrent User Load**: Monitor system under user load
- **Database Scaling**: Consider read replicas for high load
- **Cache Scaling**: Optimize cache size and distribution
- **CDN Integration**: Consider CDN for static asset delivery

### Performance Troubleshooting

**Common Performance Issues:**
- **Slow Dataset Loading**: Check S3 connection and query optimization
- **High Memory Usage**: Review cache settings and database queries
- **Database Connection Errors**: Check connection pool and database health
- **Cache Misses**: Review cache configuration and warming strategies

**Performance Monitoring Tools:**
- **Built-in Metrics**: Use system dashboard for real-time monitoring
- **Log Analysis**: Review server logs for performance patterns
- **Database Tools**: Use database-specific monitoring tools
- **External Monitoring**: Consider APM tools for comprehensive monitoring

## Security Operations

### Authentication Security

**JWT Token Management:**
- **Token Expiration**: Configure appropriate token lifetime
- **Secret Rotation**: Regularly rotate JWT secrets
- **Token Validation**: Ensure proper token validation
- **Session Security**: Monitor and manage user sessions

**Session Management:**
- **Active Session Monitoring**: View and manage active user sessions
- **Force Logout**: Terminate specific user sessions when needed
- **Session Timeout**: Configure automatic session expiration
- **Multiple Login Prevention**: Control concurrent logins per user

### Access Control Security

**Permission Auditing:**
- **Regular Permission Review**: Audit user permissions quarterly
- **Access Pattern Analysis**: Monitor unusual access patterns
- **Failed Access Attempts**: Track and investigate failed access attempts
- **Privilege Escalation Monitoring**: Watch for unauthorized privilege attempts

**Security Logging:**
- **Authentication Events**: Log all login attempts and outcomes
- **Authorization Events**: Track permission changes and access grants
- **Data Access Logs**: Monitor dataset downloads and views
- **Administrative Actions**: Log all admin configuration changes

### Data Security

**Encryption and Protection:**
- **Data in Transit**: HTTPS encryption for all communications
- **Data at Rest**: S3 server-side encryption for stored datasets
- **Database Encryption**: PostgreSQL encryption for sensitive data
- **Password Security**: bcrypt hashing with secure salt rounds

**Data Access Control:**
- **Folder-Level Permissions**: Granular access control per folder
- **Download Tracking**: Monitor all dataset downloads
- **Sample Data Security**: Control what data is accessible via samples
- **AI Data Security**: Monitor data sent to external AI services

## Data Management

### Dataset Lifecycle

**Data Discovery:**
- **Automated S3 Scanning**: Regular discovery of new datasets
- **Metadata Extraction**: Automatic metadata capture
- **Format Detection**: Automatic file format identification
- **Quality Assessment**: Basic data quality checks

**Data Organization:**
- **Folder Structure**: Organize data by source, department, or project
- **Naming Conventions**: Establish consistent dataset naming
- **Metadata Standards**: Maintain consistent metadata quality
- **Version Control**: Track dataset versions and changes

### Data Quality Management

**Quality Monitoring:**
- **Schema Validation**: Ensure data schema consistency
- **Format Compliance**: Verify file format integrity
- **Size Monitoring**: Track dataset size changes
- **Access Pattern Analysis**: Monitor usage patterns for quality insights

**Data Governance:**
- **Classification Standards**: Classify data by sensitivity level
- **Retention Policies**: Establish data retention and archival policies
- **Access Documentation**: Document folder contents and purposes
- **Compliance Monitoring**: Ensure regulatory compliance where applicable

### Backup and Recovery

**Backup Strategy:**
- **Database Backups**: Regular PostgreSQL backups
- **Configuration Backups**: Backup system configuration
- **User Data Exports**: Export user and permission data
- **Documentation Backups**: Maintain current documentation copies

**Recovery Procedures:**
- **Database Recovery**: Restore from database backups
- **Configuration Recovery**: Restore system settings
- **User Account Recovery**: Restore user accounts and permissions
- **Disaster Recovery**: Plan for complete system recovery

## Troubleshooting

### Common Administrative Issues

#### User Access Problems

**Users Cannot Login:**
1. Verify account is active in user management
2. Check password accuracy (consider reset)
3. Verify JWT_SECRET is configured correctly
4. Check database connectivity
5. Review authentication logs for errors

**Users Cannot See Datasets:**
1. Verify folder permissions are correctly assigned
2. Check if datasets exist in assigned folders
3. Confirm AWS S3 connection is working
4. Trigger dataset refresh to update metadata
5. Clear cache and retry

#### System Performance Issues

**Slow Response Times:**
1. Check database query performance
2. Review cache hit rates and configuration
3. Monitor server resource usage (CPU, memory)
4. Analyze network connectivity to S3
5. Review recent configuration changes

**High Memory Usage:**
1. Check cache size and configuration
2. Monitor database connection pool usage
3. Review active user sessions
4. Check for memory leaks in logs
5. Consider cache eviction policy adjustment

#### Data Synchronization Issues

**Datasets Not Updating:**
1. Verify AWS credentials and permissions
2. Check S3 bucket accessibility
3. Review last successful refresh timestamp
4. Manually trigger dataset refresh
5. Check refresh operation logs for errors

**Missing Datasets:**
1. Verify files exist in S3 bucket
2. Check folder structure and naming
3. Confirm file formats are supported
4. Review S3 permissions and access
5. Check refresh operation completion

### Error Diagnosis

**Log Analysis:**
- **Server Logs**: Check application logs for error messages
- **Database Logs**: Review PostgreSQL logs for query issues
- **Browser Console**: Examine client-side errors
- **Network Logs**: Analyze network requests and responses

**Error Categories:**
- **Authentication Errors**: JWT, session, and login issues
- **Authorization Errors**: Permission and access control issues
- **Data Errors**: S3, database, and data format issues
- **Performance Errors**: Timeout, memory, and resource issues

### System Recovery

**Emergency Procedures:**
1. **Service Restart**: Restart application server
2. **Cache Clear**: Clear all caches to reset state
3. **Database Connection Reset**: Reset database connections
4. **AWS Configuration Check**: Verify AWS settings
5. **User Session Reset**: Clear all user sessions

**Recovery Verification:**
- Test basic functionality (login, dataset viewing)
- Verify AWS S3 connectivity
- Check database operations
- Confirm cache performance
- Test AI features (if applicable)

## Best Practices

### User Management Best Practices

**Account Creation:**
- Use descriptive usernames (avoid generic names)
- Set strong initial passwords
- Start with minimal permissions (zero-access approach)
- Document user roles and responsibilities
- Regularly review and update permissions

**Permission Management:**
- Follow principle of least privilege
- Document permission decisions and rationale
- Regular permission audits (quarterly recommended)
- Use consistent permission patterns across similar users
- Monitor permission usage and access patterns

### Security Best Practices

**Authentication Security:**
- Enforce strong password policies
- Rotate JWT secrets regularly
- Monitor failed login attempts
- Use secure password reset procedures
- Log all authentication events

**Access Control Security:**
- Regular permission reviews and updates
- Monitor access patterns for anomalies
- Document security procedures and policies
- Train users on security best practices
- Implement incident response procedures

### Performance Best Practices

**System Optimization:**
- Regular cache performance review
- Database maintenance and optimization
- Monitor resource usage trends
- Plan for scaling before performance issues
- Document performance baselines

**Data Management:**
- Consistent folder organization
- Regular dataset metadata refresh
- Monitor data quality and integrity
- Plan for data growth and storage
- Document data management procedures

### Operational Best Practices

**Regular Maintenance:**
- Weekly system health checks
- Monthly permission audits
- Quarterly security reviews
- Regular backup verification
- Documentation updates

**Change Management:**
- Document all configuration changes
- Test changes in development environment
- Plan rollback procedures
- Communicate changes to users
- Monitor system after changes

---

**Administrator Resources:**
- **System Health Dashboard**: Monitor real-time system metrics
- **User Activity Reports**: Track user engagement and usage
- **Performance Analytics**: Database and cache performance data
- **Security Audit Logs**: Authentication and authorization events
- **Documentation**: Keep this guide updated with system changes

**Support Escalation:**
For technical issues beyond this guide, contact:
- Database administrators for PostgreSQL issues
- AWS support for S3 connectivity problems
- Application developers for feature issues
- Security team for access control problems

**Last Updated**: September 2025  
**Version**: 2.1.0 (AI Search Enhancement Release)