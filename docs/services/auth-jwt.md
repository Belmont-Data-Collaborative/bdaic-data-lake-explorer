# JWT Authentication Service

The JWT Authentication Service provides secure, stateless authentication for the Data Lake Explorer application with role-based access control and session management.

## Table of Contents

- [Overview](#overview)
- [JWT Implementation](#jwt-implementation)
- [Authentication Flow](#authentication-flow)
- [Role-Based Access Control](#role-based-access-control)
- [Session Management](#session-management)
- [Security Features](#security-features)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The authentication system provides:
- **JWT-based Authentication**: Stateless token-based security
- **Role-Based Access Control**: Admin and User permission levels
- **Session Management**: Secure session handling and expiration
- **Password Security**: Secure password hashing (implementation details vary)
- **Account Control**: Admin-managed user creation and activation

## JWT Implementation

### Token Structure
**JWT Components:**
- **Header**: Algorithm and token type
- **Payload**: User information and permissions
- **Signature**: Cryptographic signature for verification

**Payload Contents:**
```json
{
  "userId": 123,
  "username": "user@example.com",
  "role": "admin",
  "iat": 1643723400,
  "exp": 1643809800
}
```

### Token Lifecycle
**Token Generation:**
- Issued upon successful login
- Includes user ID, username, and role
- Signed with JWT_SECRET environment variable
- Default expiration: 24 hours

**Token Validation:**
- Signature verification on each request
- Expiration time checking
- Role-based permission validation
- User active status verification

## Authentication Flow

### User Login Process
1. **Credential Submission**: Username and password provided
2. **Password Verification**: Secure password comparison with stored hash
3. **Account Status Check**: Verify user is active
4. **Token Generation**: Create JWT with user information
5. **Response**: Return token and user details

### Request Authentication
1. **Token Extraction**: Get JWT from Authorization header
2. **Token Validation**: Verify signature and expiration
3. **User Loading**: Retrieve current user information
4. **Permission Check**: Validate role-based access
5. **Request Processing**: Continue with authenticated context

### Registration Control
**Admin-Only Registration (verified in server/routes.ts):**
- User registration completely disabled (`/api/auth/register` returns 403)
- Only administrators can create accounts via `/api/admin/users`
- New users start with zero folder permissions
- AI features disabled by default (`isAiEnabled: false`)

## Role-Based Access Control

### User Roles

**Admin Role (verified in server/routes.ts):**
- **Full Dataset Access**: All datasets and folders
- **User Management**: `/api/admin/users` - create, modify, delete accounts
- **AI Feature Control**: `/api/admin/users/:id/ai-enabled` - toggle AI per user
- **Dataset Refresh**: `/api/datasets/refresh` - trigger S3 refresh
- **Folder Management**: `/api/admin/users-folder-access` - manage permissions
- **AI Features**: All AI capabilities enabled by default

**User Role:**
- **Limited Access**: Only assigned folders and datasets
- **Data Operations**: Download samples and full datasets
- **Conditional AI**: AI features only if enabled by admin
- **Personal Settings**: Change password, view activity
- **No Admin Functions**: Cannot modify system or other users

### Permission Hierarchy
```typescript
const permissions = {
  admin: {
    canAccessAllFolders: true,
    canManageUsers: true,
    canRefreshDatasets: true,
    aiEnabled: true
    // Additional capabilities: see server/routes.ts for specific endpoints
  },
  user: {
    canAccessAllFolders: false,
    canManageUsers: false,
    canRefreshDatasets: false,
    aiEnabled: false // Must be explicitly enabled by admin
  }
};
```

## Session Management

### Session Security
**Token Storage:**
- Authorization header with Bearer token format
- Client-side storage (implementation varies)
- Manual token handling required

**Note**: Cookie-based storage, automatic refresh, active session tracking, and concurrent login management are not currently implemented.

### Security Headers
**Authentication Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Security Response Headers** (if configured):
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

**Note**: Security headers implementation may vary. Check server configuration.

## Security Features

### Password Security
**Current Implementation:**
- Password hashing (implementation-dependent; verify in server/middleware/auth.ts)
- Password hash storage only
- No plaintext password retention

**Password Policies:**
- Minimum 8 characters recommended
- Admin-controlled password resets
- Secure password generation

**Implementation**: Check `server/middleware/auth.ts` and related authentication modules for specific implementation details.

### Token Security
**JWT Security Measures:**
- Cryptographic signature verification
- Short expiration times (24 hours default)
- Secure secret key management
- Algorithm specification (HS256)

**Secret Management:**
```env
# Strong JWT secret required
JWT_SECRET=your_cryptographically_secure_secret_key_here
```

### Account Security
**Current Account Controls:**
- **Active Status**: Immediate login prevention for inactive accounts
- **Role Assignment**: Controlled permission escalation

**Planned Features:**
- **Audit Logging**: Track authentication events
- **Failed Login Monitoring**: Detect potential attacks

## Configuration

### Environment Variables
```env
# Authentication Configuration
JWT_SECRET=your_secure_jwt_secret_key

# Note: Additional security configurations may be available
# Check server configuration for specific implementation details
```

### Middleware Configuration
**Authentication Middleware:**
```typescript
// Apply to all protected routes
app.use('/api', authenticateToken);

// Role-based protection
app.use('/api/admin', requireAdmin);
```

**Permission Checks:**
```typescript
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

## Troubleshooting

### Common Authentication Issues

#### Invalid Token Errors
```bash
Error: Invalid token / Token expired
```
**Solutions:**
- Check JWT_SECRET is consistent across restarts
- Verify token hasn't expired
- Ensure Authorization header format is correct
- Check for token corruption during transmission

#### Permission Denied
```bash
Error: Insufficient permissions
```
**Solutions:**
- Verify user role assignments
- Check folder access permissions
- Confirm account is active
- Review permission hierarchy

#### Login Failures
```bash
Error: Invalid credentials
```
**Solutions:**
- Verify username and password accuracy
- Check account active status
- Confirm password hasn't been reset
- Check authentication implementation in server code

### Security Considerations

**Token Security:**
- Never log JWT tokens
- Use HTTPS for all token transmission
- Implement proper token storage on client
- Regular secret key rotation

**Session Security:**
- Monitor for unusual login patterns
- Implement session timeout policies
- Track concurrent sessions
- Audit authentication events

### Performance Optimization

**Token Validation:**
- Cache user information to reduce database queries
- Optimize JWT verification for high-traffic
- Implement token refresh strategies
- Use efficient middleware ordering

**Database Optimization:**
- Index user lookup fields
- Optimize permission queries
- Cache role assignments
- Minimize authentication overhead

---

**Related Documentation:**
- [Admin Guide - User Management](../guides/AdminGuide.md#user-management) - User administration
- [Security Guide](../SECURITY.md) - Comprehensive security architecture
- [API Documentation](../API.md) - Authentication endpoints