# AWS S3 Integration Service

The AWS S3 Integration Service (`AwsS3Service`) provides comprehensive functionality for interacting with AWS S3 buckets, managing datasets, and handling file operations within the Data Lake Explorer application.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Core Functionality](#core-functionality)
- [Dataset Operations](#dataset-operations)
- [Download Management](#download-management)
- [Sampling Strategy](#sampling-strategy)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

The `AwsS3Service` class is located at `server/lib/aws.ts` and serves as the primary interface between the Data Lake Explorer application and AWS S3 storage. It handles:

- **Dataset Discovery**: Automatic scanning and cataloging of S3 objects
- **Metadata Extraction**: Processing file information and YAML metadata
- **Download Operations**: Sample downloads, full files, and metadata files
- **Data Sampling**: Intelligent 1% sampling with optimized bounds
- **File Type Detection**: Identifies file types by extension; CSV parsing implemented

### Key Features

- **Smart Dataset Grouping**: Groups related files into logical datasets
- **CSV Data Scanning**: Handles large CSV files with chunked processing (via `getSampleDataWithProgression`)
- **Range Request Support**: Efficient partial file downloads
- **Pre-signed URL Generation**: Direct S3 access for large file downloads
- **Metadata Processing**: YAML metadata file integration

## Configuration

### Environment Variables

The service requires the following environment variables:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_bucket_name
```

**Note**: AWS region is set via constructor parameter (default: "us-west-2"), not environment variable.

### IAM Permissions

The AWS IAM user must have the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetObjectVersion",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### Service Initialization

```typescript
const awsService = new AwsS3Service("us-west-2");

// Test connection
const isConnected = await awsService.testConnection("your-bucket-name");
```

## Core Functionality

### Connection Testing

**Method**: `testConnection(bucketName: string): Promise<boolean>`

Tests connectivity to the specified S3 bucket:

```typescript
// Example usage
const bucketName = process.env.AWS_S3_BUCKET || "";
const connectionValid = await awsService.testConnection(bucketName);

if (connectionValid) {
  console.log("S3 connection successful");
} else {
  console.error("S3 connection failed");
}
```

**What it does:**
- Sends a `ListObjectsV2Command` with `MaxKeys: 1`
- Verifies credentials and bucket accessibility
- Returns boolean result without throwing exceptions

## Dataset Operations

### Dataset Discovery

**Method**: `listDatasets(bucketName: string): Promise<InsertDataset[]>`

Discovers and catalogs all datasets in the S3 bucket:

```typescript
const datasets = await awsService.listDatasets(bucketName);
console.log(`Found ${datasets.length} datasets`);
```

**Discovery Process:**
1. **Bucket Scanning**: Lists all objects in the bucket root
2. **File Grouping**: Groups files by common patterns and names
3. **Format Detection**: Identifies primary file formats (CSV, JSON, etc.)
4. **Metadata Association**: Links YAML metadata files with datasets
5. **Size Calculation**: Computes total dataset sizes (excluding YAML)

**Dataset Grouping Rules:**
- Files with the same base name are grouped together
- YAML files are treated as metadata (excluded from size calculations)
- Datasets with only YAML files are skipped
- Primary format prioritizes CSV when both CSV and YAML exist

### File Format Support

**Detected Formats:**
- **CSV**: Primary data format, preferred for analysis
- **JSON**: JavaScript Object Notation files
- **Parquet**: Detected by extension (no parsing)
- **Avro**: Detected by extension (no parsing)
- **YAML/YML**: Metadata and configuration files

**Note**: Format detection is based on file extensions only. The service streams file bytes but does not parse format-specific structures.

**Format Detection:**
```typescript
private getFileFormat(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'csv': return 'CSV';
    case 'json': return 'JSON';
    case 'parquet': return 'Parquet';
    case 'avro': return 'Avro';
    case 'yaml':
    case 'yml': return 'YAML';
    default: return 'Unknown';
  }
}
```

## Download Management

### Sample Downloads

**Method**: `streamSampleDownload(bucketName, source, datasetName): Promise<SampleDownloadResult>`

Provides optimized 1% sample downloads with intelligent bounds:

```typescript
const sampleResult = await awsService.streamSampleDownload(
  bucketName,
  "cdc_places",
  "health_data_2023"
);

if (sampleResult) {
  console.log(`Sample: ${sampleResult.sampleSize} bytes from ${sampleResult.totalSize} bytes`);
  // Stream the sample data
  sampleResult.stream.pipe(response);
}
```

**Sample Strategy:**
- **Sample Size**: 1% of original file size
- **Minimum Bound**: 1KB (1,024 bytes)
- **Maximum Bound**: 10MB (10,485,760 bytes)
- **Method**: S3 Range requests for efficient partial downloads

**Sample Calculation:**
```typescript
const sampleSize = Math.max(
  1024, // 1KB minimum
  Math.min(
    Math.floor(totalSize * 0.01), // 1% of file
    10485760 // 10MB maximum
  )
);
```

### Full Dataset Downloads

**Method**: `downloadFullFile(bucketName, source, datasetName): Promise<FileStream>`

For smaller files, streams the complete dataset directly:

```typescript
const fullFileResult = await awsService.downloadFullFile(
  bucketName,
  "census_acs5",
  "demographics_2023"
);

if (fullFileResult) {
  response.setHeader('Content-Type', 'application/octet-stream');
  response.setHeader('Content-Disposition', `attachment; filename="${fullFileResult.key}"`);
  fullFileResult.stream.pipe(response);
}
```

**Use Cases:**
- Files smaller than server memory limits
- When streaming is preferred over pre-signed URLs
- Direct server-mediated downloads

### Pre-signed URL Generation

**Method**: `generateFullDownloadPresignedUrl(bucketName, source, datasetName): Promise<PresignedUrlResult>`

For large files, generates direct S3 download URLs:

```typescript
const presignedResult = await awsService.generateFullDownloadPresignedUrl(
  bucketName,
  "large_datasets",
  "big_data_file"
);

if (presignedResult) {
  console.log(`Direct download URL: ${presignedResult.url}`);
  console.log(`File size: ${presignedResult.size} bytes`);
  console.log(`Expires in: 1 hour`);
}
```

**Benefits:**
- **Bypasses Server Limits**: Avoids server timeout and memory constraints
- **Direct Transfer**: Client downloads directly from S3
- **Scalability**: No server resources consumed during download
- **Security**: URLs expire after 1 hour

### Metadata Downloads

**Method**: `downloadMetadataFile(bucketName, source, datasetName): Promise<FileStream>`

Downloads YAML metadata files associated with datasets:

```typescript
const metadataResult = await awsService.downloadMetadataFile(
  bucketName,
  "health_data",
  "mortality_stats"
);

if (metadataResult) {
  // Stream YAML metadata file
  metadataResult.stream.pipe(response);
}
```

**Metadata Search Strategy:**
1. **Exact Match**: `datasetName.yaml` or `datasetName.yml`
2. **Partial Match**: Files containing dataset name with YAML extension
3. **Fallback**: Any YAML file in the same folder

## Sampling Strategy

### CSV Data Sampling

The service provides CSV data sampling capabilities through integration with the intelligent data sampler:

**Method**: `getSampleDataWithProgression(bucketName, datasetSource, searchCriteria, maxMatches): Promise<any[]>`

**CSV Processing Features** (CSV files only):
- **Chunked Processing**: Processes large CSV files in 5MB chunks
- **Memory Efficient**: Handles files larger than available memory
- **Search Criteria**: Filters CSV data based on specific criteria
- **Comprehensive Coverage**: Scans entire CSV file to collect all matching rows

**Limitation**: Only supports CSV format parsing. Other formats are streamed as bytes without parsing.

**Chunk Processing:**
```typescript
const chunkSize = 5 * 1024 * 1024; // 5MB chunks
const maxChunksForFullScan = Math.ceil(fileSize / chunkSize);

for (let chunk = 0; chunk < maxChunksForFullScan; chunk++) {
  const endByte = Math.min(currentOffset + chunkSize - 1, fileSize - 1);
  
  // Process chunk with Range request
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: csvFile.Key,
    Range: `bytes=${currentOffset}-${endByte}`,
  });
}
```

### CSV Parsing and Filtering

**Built-in CSV Parser:**
- **Header Detection**: Automatically identifies CSV headers
- **Row Validation**: Ensures proper column count per row
- **Search Filtering**: Supports multiple search criteria
- **Case-Insensitive Matching**: Flexible column name matching

**Search Criteria Example:**
```typescript
const searchCriteria = {
  state: "Alabama",
  county: "Jefferson",
  category: "Health"
};

const matches = await awsService.getSampleDataWithProgression(
  bucketName,
  datasetSource,
  searchCriteria,
  5000 // max matches
);
```

## Error Handling

### Connection Errors

**Common S3 Connection Issues:**
- **Invalid Credentials**: Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- **Incorrect Region**: Verify AWS_REGION matches bucket location
- **Bucket Permissions**: Ensure IAM user has required S3 permissions
- **Network Issues**: Check connectivity to AWS S3 endpoints

**Error Handling Pattern:**
```typescript
try {
  const datasets = await awsService.listDatasets(bucketName);
  return datasets;
} catch (error) {
  console.error("S3 operation failed:", error);
  // Handle specific error types
  if (error.name === 'NoSuchBucket') {
    throw new Error(`Bucket ${bucketName} does not exist`);
  }
  if (error.name === 'AccessDenied') {
    throw new Error('Insufficient permissions for S3 bucket');
  }
  return [];
}
```

### Download Errors

**File Not Found:**
```typescript
if (!dataFile?.Key) {
  console.error(`No data file found for dataset: ${datasetName}`);
  return null;
}
```

**Range Request Errors:**
- **Invalid Range**: Ensure byte ranges are within file bounds
- **Unsupported Format**: Some file formats don't support range requests
- **Network Timeouts**: Large range requests may timeout

### Recovery Strategies

**Graceful Degradation:**
- Return empty arrays instead of throwing exceptions
- Provide fallback responses for failed operations
- Log errors for debugging while maintaining service availability

## Performance Considerations

### Optimization Strategies

**Batch Processing:**
- Process datasets in batches to avoid rate limits
- Use Promise.all() for parallel operations where safe
- Implement exponential backoff for retry logic

**Memory Management:**
- Stream large files instead of loading into memory
- Use chunked processing for progressive scanning
- Clean up streams and resources properly

**Network Efficiency:**
- Use Range requests to minimize data transfer
- Leverage S3 pre-signed URLs for large downloads
- Implement caching for frequently accessed metadata

### S3 Rate Limiting

**Request Rate Guidelines:**
- **GET/HEAD requests**: 5,500 requests per second per prefix
- **PUT/COPY/POST/DELETE**: 3,500 requests per second per prefix
- **LIST operations**: 100 requests per second

**Best Practices:**
- Distribute requests across multiple prefixes
- Implement exponential backoff for retries
- Use batch operations when possible

## Security

### Credential Management

**Environment Variables:**
- Store credentials in environment variables, never in code
- Use IAM roles when possible instead of access keys
- Rotate access keys regularly

**Least Privilege Principle:**
- Grant only necessary S3 permissions
- Use bucket policies for additional access control
- Monitor access patterns for unusual activity

### Data Security

**In-Transit Security:**
- All S3 communications use HTTPS/TLS encryption
- Pre-signed URLs include security tokens
- Range requests maintain encryption

**Access Control:**
- Folder-level permissions in application layer
- S3 bucket policies for additional security
- IAM policies for fine-grained control

## Troubleshooting

### Common Issues

#### "NoSuchBucket" Error
```bash
Error: The specified bucket does not exist
```
**Solutions:**
- Verify bucket name in AWS_S3_BUCKET environment variable
- Check bucket exists in correct AWS region
- Ensure bucket name follows AWS naming conventions

#### "AccessDenied" Error
```bash
Error: Access Denied
```
**Solutions:**
- Verify IAM user has required permissions
- Check bucket policy allows access
- Ensure credentials are correct and active

#### Sample Download Issues
```bash
Error: Invalid Range header
```
**Solutions:**
- Check file exists and is not empty
- Verify file size calculation is correct
- Ensure file format supports range requests

### Debugging Tools

**Enable Debug Logging:**
```typescript
// Add to service initialization
const awsService = new AwsS3Service(region);
awsService.enableDebugLogging(); // Custom method for detailed logging
```

**Monitor S3 Operations:**
- Use AWS CloudTrail for access logging
- Monitor S3 metrics in CloudWatch
- Check application logs for detailed error information

**Test Connectivity:**
```typescript
// Quick connectivity test
const isWorking = await awsService.testConnection(bucketName);
console.log(`S3 Connection Status: ${isWorking ? 'OK' : 'FAILED'}`);
```

### Performance Monitoring

**Key Metrics:**
- **Request Latency**: Time to complete S3 operations
- **Throughput**: Data transfer rates for downloads
- **Error Rates**: Percentage of failed S3 requests
- **Cost**: Monitor S3 request and bandwidth costs

**Optimization Targets:**
- < 500ms for dataset listing operations
- < 2s for sample download initiation
- > 95% success rate for all S3 operations

---

**Related Documentation:**
- [Intelligent Data Sampler](intelligent-data-sampler.md) - Advanced sampling strategies
- [Performance Monitoring](performance-monitor.md) - System performance tracking
- [Admin Guide](../guides/AdminGuide.md) - AWS configuration management

**Last Updated**: September 2025  
**Version**: 2.1.0 (AI Search Enhancement Release)