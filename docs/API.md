# API Reference

## Base URL
All API endpoints are relative to: `http://localhost:5000/api`

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All responses follow this format:
```json
{
  "data": "...",
  "message": "Success/Error message",
  "errors": [] // Only present on validation errors
}
```

## Endpoints

### Authentication

#### POST `/auth/register`
⚠️ **DISABLED**: User registration has been completely disabled for security. New accounts can only be created by administrators through the admin panel.

**Response:**
```json
{
  "message": "User registration is disabled. Contact an administrator to create an account."
}
```

#### POST `/auth/login`
Authenticate user credentials.

**Request:**
```json
{
  "username": "john_doe",
  "password": "securepassword123"
}
```

**Success Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "isAiEnabled": false
  }
}
```

**Inactive Account Response:**
```json
{
  "message": "Your account is inactive. Please contact the administrator."
}
```

### Statistics

#### GET `/stats`
Get user-specific statistics based on folder access permissions.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "totalDatasets": 132,
  "totalSize": "3 GB",
  "dataSources": 8,
  "lastUpdated": "24m ago",
  "lastRefreshTime": "2025-08-07T16:36:51.302Z",
  "totalCommunityDataPoints": 763132747
}
```

#### GET `/stats/public`
Get public statistics (no authentication required).

**Response:**
```json
{
  "totalDatasets": 266,
  "totalSize": "29 GB", 
  "dataSources": 17,
  "lastUpdated": "Never",
  "lastRefreshTime": null,
  "totalCommunityDataPoints": 5351516165
}
```

### Datasets

#### GET `/datasets`
Retrieve datasets with filtering and pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 10000)
- `folder` (string): Filter by folder name
- `search` (string): Search in dataset names and metadata
- `format` (string): Filter by file format
- `size` (string): Filter by size ("small", "medium", "large")

**Response:**
```json
{
  "datasets": [
    {
      "id": 6724,
      "name": "cdc_places_transform_4ai3-zynv_census_tract_data_2020",
      "s3Key": "cdc_places/cdc_places_transform_4ai3-zynv_census_tract_data_2020.csv",
      "sizeBytes": 12345678,
      "topLevelFolder": "cdc_places",
      "metadata": {
        "recordCount": "1000",
        "columnCount": "25",
        "completenessScore": "95.5",
        "dataSource": "CDC PLACES"
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "totalCount": 266,
  "page": 1,
  "limit": 20,
  "totalPages": 14
}
```

#### GET `/datasets/:id`
Get a specific dataset by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 6724,
  "name": "dataset_name",
  "s3Key": "folder/file.csv",
  "sizeBytes": 12345678,
  "topLevelFolder": "folder_name",
  "metadata": {
    "recordCount": "1000",
    "columnCount": "25",
    "completenessScore": "95.5"
  }
}
```

### Folders

#### GET `/user/accessible-folders`
Get folders accessible to the current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  "cdc_places",
  "census_acs5", 
  "usda_census_agriculture"
]
```

#### GET `/folders/all`
Get all available folders (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  "cdc_places",
  "cdc_svi",
  "census_acs5",
  "usda_census_agriculture"
]
```

### Downloads

#### POST `/datasets/:id/download`
Request download access for a dataset.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "downloadType": "sample" | "full" | "metadata"
}
```

**Response:**
```json
{
  "downloadUrl": "https://presigned-s3-url...",
  "expiresAt": "2025-08-07T18:00:00.000Z"
}
```

### AI Integration

⚠️ **Note**: AI features are only available to users with `isAiEnabled: true`. Contact an administrator to enable AI capabilities for your account.

#### POST `/datasets/:id/chat`
Single dataset AI analysis.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "question": "What patterns do you see in this healthcare data?",
  "enableVisualization": true
}
```

**Response:**
```json
{
  "response": "Based on the healthcare dataset, I can see several interesting patterns...",
  "visualizationData": {
    "chartType": "bar",
    "data": {...},
    "title": "Health Outcomes by County"
  },
  "processingTime": "3.2s"
}
```

#### POST `/datasets/batch-chat`
Multi-dataset AI analysis.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "question": "Compare health outcomes between these datasets",
  "datasetIds": [6724, 6725, 6726],
  "enableVisualization": true
}
```

**Response:**
```json
{
  "response": "Comparing across the three healthcare datasets, here are the key findings...",
  "visualizationData": {
    "chartType": "line",
    "data": {...},
    "title": "Comparative Health Trends"
  },
  "relatedDatasets": [6724, 6725, 6726]
}
```

#### POST `/datasets/:id/generate-insights`
Generate comprehensive AI insights (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "insights": {
    "summary": "Dataset contains health outcome data...",
    "keyPatterns": ["Geographic disparities", "Temporal trends"],
    "potentialUseCases": ["Policy analysis", "Research studies"],
    "dataQualityNotes": "High completeness, minimal outliers"
  },
  "confidence": 0.92
}
```

### Admin Operations

#### GET `/admin/users`
Get all users (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "isActive": true,
    "isAiEnabled": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "lastLoginAt": "2025-08-14T10:00:00.000Z"
  }
]
```

#### POST `/admin/users`
Create a new user (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "securepassword123",
  "role": "user"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 2,
    "username": "new_user",
    "email": "user@example.com",
    "role": "user",
    "isActive": true,
    "isAiEnabled": false
  }
}
```

#### PUT `/admin/users/:id`
Update user information (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "role": "admin",
  "isActive": false
}
```

#### PUT `/admin/users/:id/ai-enabled`
Toggle AI features for a user (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "enabled": true
}
```

#### DELETE `/admin/users/:id`
Delete a user (admin only).

**Headers:** `Authorization: Bearer <token>`

#### GET `/admin/users-folder-access`
Get folder access information for all users (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "userId": 2,
    "username": "user",
    "email": "user@example.com",
    "accessibleFolders": ["cdc_places", "census_acs5"],
    "totalUsage": 15,
    "successfulInteractions": 12
  }
]
```

#### POST `/admin/users/:id/folder-access`
Grant folder access to a user (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "folderNames": ["cdc_places", "census_acs5"]
}
```

#### DELETE `/admin/users/:userId/folder-access/:folderName`
Remove folder access from a user (admin only).

**Headers:** `Authorization: Bearer <token>`

#### POST `/admin/refresh`
Trigger dataset refresh from S3 (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Refresh started",
  "jobId": "refresh_123456",
  "estimatedTime": "5-10 minutes"
}
```

#### POST `/cache/invalidate`
Invalidate application cache (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "pattern": "stats" // Optional: specific cache pattern to invalidate
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Unexpected error |

## Rate Limiting

API endpoints are rate limited:
- Authentication: 5 requests per minute
- Data endpoints: 100 requests per minute
- AI endpoints: 10 requests per minute
- Admin endpoints: 50 requests per minute

## Caching

Responses include cache headers:
- Stats endpoints: 30 minutes
- Folder lists: 1 hour
- Dataset metadata: 5 minutes
- User data: No cache