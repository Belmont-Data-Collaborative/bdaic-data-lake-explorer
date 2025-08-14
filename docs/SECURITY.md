# Security Documentation
## Data Lake Explorer - Security Architecture and Best Practices

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Access Control Matrix](#access-control-matrix)
4. [User Management Security](#user-management-security)
5. [AI Feature Security](#ai-feature-security)
6. [Data Protection](#data-protection)
7. [Security Monitoring](#security-monitoring)
8. [Best Practices](#best-practices)

---

## Security Overview

### Core Security Principles

Data Lake Explorer implements a comprehensive security architecture built on these principles:

1. **Zero Trust Access**: No implicit trust, every request is authenticated and authorized
2. **Principle of Least Privilege**: Users receive minimum permissions necessary for their role
3. **Defense in Depth**: Multiple security layers protect against various attack vectors
4. **Granular Control**: Fine-grained permissions for data access and feature usage

### Security Architecture

```
User Request → Authentication → Role Verification → Folder Permissions → AI Permissions → Data Access
```

---

## Authentication & Authorization

### JWT-Based Authentication

**Token Management**:
- JWT tokens with secure signing using `HS256` algorithm
- Token expiration enforced server-side
- Automatic token refresh mechanism
- Secure token storage in HTTP-only cookies (recommended) or localStorage

**Password Security**:
- bcrypt hashing with salt rounds (minimum 10)
- Password complexity requirements enforced
- No plaintext password storage or transmission
- Secure password reset functionality

### Session Management

**Session Security**:
- Secure session cookies with appropriate flags
- Session timeout after inactivity
- Concurrent session management
- Session invalidation on logout

---

## Access Control Matrix

### Role-Based Permissions

| Feature | Admin | User (Active) | User (Inactive) |
|---------|-------|---------------|-----------------|
| Login | ✅ | ✅ | ❌ |
| View Datasets | ✅ | ✅ (folder-based) | ❌ |
| Download Data | ✅ | ✅ (folder-based) | ❌ |
| AI Features | ✅ | ✅ (if enabled) | ❌ |
| User Management | ✅ | ❌ | ❌ |
| System Administration | ✅ | ❌ | ❌ |
| AWS Configuration | ✅ | ❌ | ❌ |
| Data Refresh | ✅ | ❌ | ❌ |

### Folder-Level Access Control

**Implementation**:
- Granular permissions per data lake folder
- Database-enforced access restrictions
- Real-time permission validation
- Audit trail for access changes

**Access Validation Flow**:
```
User Request → JWT Validation → User Active Check → Role Verification → Folder Permission Check → Resource Access
```

---

## User Management Security

### Account Creation Policy

**Admin-Only Registration** (Implemented August 2025):
- Public registration completely disabled
- New accounts created only by administrators
- Default permissions: zero folder access, AI disabled
- Manual permission assignment required

### Account Status Management

**Inactive Account Protection**:
- Immediate login prevention for inactive accounts
- Custom error message: "Your account is inactive. Please contact the administrator"
- Session invalidation for deactivated users
- Audit logging for account status changes

### User Permission Management

**Security Controls**:
- Administrators cannot delete their own accounts
- Permission changes logged with timestamp and actor
- Batch permission operations with transaction rollback
- Validation of permission assignments before application

---

## AI Feature Security

### User-Based AI Control

**Permission Model** (Implemented August 2025):
- AI features controlled at individual user level
- Default setting: AI disabled for new accounts
- Admin override: Administrators always have AI access
- Conditional UI rendering based on permissions

### AI Feature Matrix

| AI Feature | Availability |
|------------|--------------|
| Ask AI (Single Dataset) | User must have `isAiEnabled: true` |
| Multi-Dataset Chat | User must have `isAiEnabled: true` |
| Generate Insights | Admin only |
| AI Usage Statistics | Admin view only |

### Data Sampling Security

**Secure Sampling**:
- No full dataset exposure during AI analysis
- Intelligent sampling preserves privacy
- Metadata-only analysis for sensitive datasets
- Audit logging for AI usage tracking

---

## Data Protection

### AWS S3 Security

**Access Control**:
- Pre-signed URLs for temporary access
- Time-limited download links
- AWS IAM role-based permissions
- S3 bucket policies for access restriction

### Database Security

**PostgreSQL Protection**:
- Encrypted connections (SSL/TLS)
- Parameter sanitization prevents SQL injection
- Connection pooling with secure configurations
- Regular security updates and patches

### Data Transmission

**In-Transit Security**:
- HTTPS enforced for all connections
- TLS 1.2+ for data transmission
- Secure WebSocket connections for real-time features
- CORS policies restrict cross-origin access

---

## Security Monitoring

### Audit Logging

**Logged Events**:
- User authentication attempts (success/failure)
- Permission changes and administrative actions
- Data access and download events
- AI feature usage and analysis requests
- Account creation, modification, and deletion

### Performance Security

**Attack Prevention**:
- Rate limiting on authentication endpoints
- Request throttling for resource-intensive operations
- Connection limits prevent resource exhaustion
- Input validation prevents malformed requests

### Security Monitoring

**Threat Detection**:
- Failed login attempt monitoring
- Unusual access pattern detection
- Resource usage anomaly alerts
- Database query performance monitoring

---

## Best Practices

### For Administrators

**Account Management**:
1. Regularly review user accounts and permissions
2. Deactivate unused accounts promptly
3. Monitor AI usage statistics for anomalies
4. Implement strong password policies
5. Regular security audits of user permissions

**System Security**:
1. Keep all dependencies updated
2. Monitor system logs for security events
3. Regular database backups with encryption
4. Test disaster recovery procedures
5. Document security incidents and responses

### For Developers

**Secure Development**:
1. Input validation on all user inputs
2. Parameterized queries prevent SQL injection
3. Secure error handling (no sensitive data exposure)
4. Regular security testing and code reviews
5. Dependency scanning for vulnerabilities

**API Security**:
1. Authentication required on all sensitive endpoints
2. Authorization checks on every request
3. Rate limiting on public endpoints
4. Secure headers (CSRF, XSS protection)
5. API versioning with backward compatibility

### For Users

**Account Security**:
1. Use strong, unique passwords
2. Report suspicious activity immediately
3. Log out from shared computers
4. Regular password updates
5. Be cautious with data downloads

---

## Security Updates and Compliance

### Recent Security Enhancements (August 2025)

1. **Registration Lockdown**: Complete removal of public registration
2. **Account Deactivation**: Immediate login prevention for inactive users
3. **AI Permission Granularity**: Individual user-level AI feature control
4. **Enhanced Audit Trail**: Comprehensive logging of administrative actions
5. **UI Security**: Conditional rendering based on actual permissions

### Compliance Considerations

**Data Privacy**:
- GDPR compliance for EU users
- Data minimization in AI sampling
- Right to erasure implementation
- Consent management for data processing

**Industry Standards**:
- SOC 2 Type II controls implementation
- NIST Cybersecurity Framework alignment
- OWASP security best practices
- Regular penetration testing

---

## Security Incident Response

### Incident Categories

1. **Authentication Breaches**: Unauthorized access attempts
2. **Data Exposure**: Unintended data access or leakage
3. **System Compromise**: Server or application vulnerabilities
4. **Insider Threats**: Misuse of authorized access

### Response Procedures

1. **Immediate Actions**: Contain threat, preserve evidence
2. **Investigation**: Determine scope and impact
3. **Remediation**: Fix vulnerabilities, restore security
4. **Communication**: Notify stakeholders as appropriate
5. **Follow-up**: Update procedures, implement improvements

---

## Contact Information

For security concerns or to report vulnerabilities:
- **Internal Security Team**: Contact system administrator
- **Emergency Response**: Follow established incident response procedures
- **Security Documentation**: Maintained in `/docs/SECURITY.md`

---

*Document Version: 1.0*  
*Last Updated: August 2025*  
*Classification: Internal Use*