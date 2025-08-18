# API Documentation

The Data Lake Explorer provides a comprehensive RESTful API for managing datasets, users, AWS configurations, and AI-powered insights. All API endpoints return JSON responses unless otherwise specified.

## Base URL
All API requests should be made to: `https://your-domain.com/api`

## Authentication
Most endpoints require JWT-based authentication. Include the token in the Authorization header:
```python
headers = {
    "Authorization": "Bearer <your-jwt-token>",
    "Content-Type": "application/json"
}
```

## Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

---

## Public Endpoints (No Authentication Required)

### Statistics

#### GET `/api/stats/public`
Returns public overview statistics for the landing page.

**Response:**
```json
{
  "totalDatasets": 294,
  "totalSize": "29.4 GB",
  "dataSources": 17,
  "lastUpdated": "4d ago",
  "lastRefreshTime": "2025-08-14T18:45:29.268Z",
  "totalCommunityDataPoints": 5441083554
}
```

### Authentication

#### POST `/api/auth/login`
Authenticate with username/password or legacy password.

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### GET `/api/auth/status`
Check if authentication is configured.

#### POST `/api/auth/set-password`
Set or update authentication password.

#### POST `/api/auth/register`
**Note:** Registration is currently disabled. Returns 403 error.

---

## Protected Endpoints (Authentication Required)

### User Verification

#### GET `/api/auth/verify`
Verify and refresh user information from JWT token.

### Statistics

#### GET `/api/stats/private`
Returns user-specific statistics based on folder access permissions.

#### GET `/api/stats`
Returns comprehensive statistics with optional folder filtering.

**Query Parameters:**
- `folder` (string, optional): Filter by specific folder name

### Datasets

#### GET `/api/datasets`
Retrieve datasets with pagination and filtering.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 50): Items per page
- `folder` (string, optional): Filter by folder name
- `search` (string, optional): Search term
- `format` (string, optional): File format filter
- `tag` (string, optional): Tag filter

#### GET `/api/datasets/quick-stats`
Fast endpoint for basic dataset counts and folder information.

#### GET `/api/datasets/:id`
Retrieve detailed information about a specific dataset.

#### POST `/api/datasets/refresh`
**Admin Only** - Refresh all datasets from S3.

#### GET `/api/datasets/:id/download`
Download the full dataset file.

#### GET `/api/datasets/:id/download-sample`
Download a sample of the dataset (first 100 rows).

#### GET `/api/datasets/:id/download-metadata`
Download dataset metadata as JSON.

### AI Features

#### POST `/api/datasets/:id/insights`
Generate AI-powered insights for a specific dataset.

#### POST `/api/ai/multi-dataset-chat`
Interactive chat with multiple datasets using AI.

### User Access Management

#### GET `/api/user/accessible-folders`
Get folders the current user has access to.

#### GET `/api/user/folder-ai-settings`
Get AI settings for user's accessible folders.

---

## Admin-Only Endpoints

### User Management

#### GET `/api/admin/users`
**Admin Only** - Retrieve all users.

#### PUT `/api/admin/users/:id`
**Admin Only** - Update user information.

#### DELETE `/api/admin/users/:id`
**Admin Only** - Delete a user account.

#### POST `/api/admin/users`
**Admin Only** - Create a new user account.

#### PUT `/api/admin/users/:userId/ai-enabled`
**Admin Only** - Enable/disable AI features for a user.

### Folder Access Management

#### GET `/api/admin/folder-access`
**Admin Only** - Get all folder access permissions.

#### POST `/api/admin/folder-access`
**Admin Only** - Grant user access to a folder.

#### DELETE `/api/admin/folder-access/:id`
**Admin Only** - Remove folder access permission.

#### GET `/api/admin/users/:userId/folder-access`
**Admin Only** - Get specific user's folder permissions.

#### PUT `/api/admin/users/:userId/folder-access`
**Admin Only** - Update user's folder permissions.

### AWS Configuration Management

#### GET `/api/aws-config`
Get the currently active AWS S3 configuration.

#### POST `/api/aws-config`
Create or update AWS S3 configuration.

#### GET `/api/aws-configs`
Get all AWS configurations.

#### POST `/api/aws-configs`
Create a new AWS configuration.

#### PUT `/api/aws-configs/:id`
Update an existing AWS configuration.

#### DELETE `/api/aws-configs/:id`
Delete an AWS configuration.

#### POST `/api/aws-configs/:id/activate`
Set a configuration as the active one.

#### POST `/api/aws-config/test`
Test connectivity to an AWS S3 bucket.

### Download Statistics

#### GET `/api/datasets/:id/download-stats`
Get download statistics for a specific dataset.

#### POST `/api/datasets/batch-download-stats`
Get download statistics for multiple datasets.

### Performance Monitoring

#### GET `/api/performance/stats`
Get application performance metrics.

#### GET `/api/performance/db-status`
Check database optimization status.

### Documentation

#### GET `/api/docs/markdown`
Retrieve this API documentation in markdown format.

---

## Error Codes

- **400 Bad Request**: Invalid request parameters or body
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for the requested action
- **404 Not Found**: Requested resource does not exist
- **409 Conflict**: Resource conflict (e.g., duplicate folder access)
- **500 Internal Server Error**: Unexpected server error

## Rate Limiting

API endpoints may be rate-limited to prevent abuse. Current limits:
- **General endpoints**: 100 requests per minute per user
- **AI endpoints**: 10 requests per minute per user
- **Download endpoints**: 20 requests per minute per user

## Data Formats

### Dates
All dates are returned in ISO 8601 format: `2025-08-18T15:30:00Z`

### File Sizes
File sizes are returned as formatted strings (e.g., "1.5 MB", "2.3 GB") in the API responses, but stored as bytes in the database.

### Numbers
Large numbers (like community data points) are returned as integers. Use appropriate formatting on the client side for display purposes.

## Python SDK Example

```python
import requests
import json

class DataLakeAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}'
            })
    
    def login(self, username, password):
        """Authenticate and get JWT token"""
        response = self.session.post(
            f'{self.base_url}/auth/login',
            json={'username': username, 'password': password}
        )
        data = response.json()
        if data.get('success'):
            self.token = data['token']
            self.session.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
        return data
    
    def get_datasets(self, page=1, limit=50, folder=None):
        """Get datasets with pagination"""
        params = {'page': page, 'limit': limit}
        if folder:
            params['folder'] = folder
        
        response = self.session.get(
            f'{self.base_url}/datasets',
            params=params
        )
        return response.json()
    
    def get_stats(self):
        """Get application statistics"""
        response = self.session.get(f'{self.base_url}/stats')
        return response.json()

# Usage example
api = DataLakeAPI('https://your-domain.com/api')
api.login('admin@example.com', 'password123')
datasets = api.get_datasets(page=1, limit=100)
stats = api.get_stats()
```