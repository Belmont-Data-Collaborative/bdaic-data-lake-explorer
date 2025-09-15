# OpenAI Integration Service

The OpenAI Integration Service (`OpenAIService`) provides AI-powered analytics, insights generation, and conversational analysis capabilities for the Data Lake Explorer application using OpenAI's GPT-4o model.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Core Features](#core-features)
- [Dataset Insights](#dataset-insights)
- [AI-Powered Chat](#ai-powered-chat)
- [Semantic Column Search](#semantic-column-search)
- [Multi-Dataset Analysis](#multi-dataset-analysis)
- [Context Building](#context-building)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## Overview

The `OpenAIService` class is located at `server/lib/openai.ts` and serves as the central hub for all AI-powered features in the Data Lake Explorer. It leverages OpenAI's GPT-4o model to provide:

- **Dataset Insights**: Automated analysis and pattern recognition
- **Conversational Analysis**: Interactive Q&A with datasets
- **Semantic Search**: AI-powered column matching and discovery
- **Multi-Dataset Comparison**: Cross-dataset analysis and insights
- **Visualization Recommendations**: Chart and graph suggestions

### Integration Components

- **Intelligent Data Sampler**: Smart data sampling for AI analysis
- **Embedding Retriever**: Context enhancement using embeddings
- **RAG (Retrieval-Augmented Generation)**: Enhanced context building
- **Visualization Engine**: Chart generation based on AI recommendations

## Configuration

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Optional: Alternative environment variable name
OPENAI_API_KEY_ENV_VAR=your_openai_api_key
```

**Important**: If no valid API key is provided, the service falls back to "default_key" which will cause API errors. Ensure a valid OpenAI API key is configured.

### Service Initialization

```typescript
const openaiService = new OpenAIService();

// The service automatically initializes with:
// - GPT-4o model (latest OpenAI model as of May 2024)
// - JSON response formatting for structured outputs
// - Integration with intelligent data sampler
```

### Model Configuration

**Default Model**: `gpt-4o`
- **Release Date**: May 13, 2024
- **Capabilities**: Advanced reasoning, multimodal understanding
- **Context Window**: Large context for comprehensive analysis
- **Response Format**: JSON object for structured outputs

## Core Features

### AI Feature Control

AI features are controlled at the individual user level:

```typescript
// Check if user has AI features enabled
if (user.aiEnabled) {
  // Provide AI functionality
  const insights = await openaiService.generateDatasetInsights(dataset);
} else {
  // Return non-AI alternatives or error message
}
```

**Available AI Features:**
- **Ask AI**: Single dataset conversational analysis
- **Generate Insights**: Automated dataset analysis
- **Multi-dataset Chat**: Cross-dataset comparison and analysis
- **Semantic Column Search**: AI-powered column matching

## Dataset Insights

### Automatic Insights Generation

**Method**: `generateDatasetInsights(dataset: Dataset): Promise<DatasetInsights>`

Generates comprehensive analysis of individual datasets:

```typescript
const insights = await openaiService.generateDatasetInsights(dataset);

console.log("Summary:", insights.summary);
console.log("Patterns:", insights.patterns);
console.log("Use Cases:", insights.useCases);
```

**Analysis Components:**

**1. Summary Generation:**
- Concise 2-3 sentence dataset overview
- Data quality assessment
- Completeness and reliability indicators

**2. Pattern Recognition:**
- Temporal trends based on file metadata
- Data distribution characteristics
- Quality patterns and anomalies

**3. Use Case Recommendations:**
- Analytical applications
- Business value propositions
- Integration possibilities

### YAML Metadata Integration

For datasets with YAML metadata files:

```typescript
// YAML metadata is automatically included in analysis
const yamlInfo = `
YAML Metadata:
- Title: ${metadata?.title || 'Not specified'}
- Description: ${metadata?.description || 'Not specified'}
- Tags: ${metadata?.tags?.join(', ') || 'None'}
- Data Source: ${metadata?.dataSource || 'Not specified'}
- Column Count: ${metadata?.columnCount || 'Not specified'}
- License: ${metadata?.license || 'Not specified'}
- Version: ${metadata?.version || 'Not specified'}
`;
```

### Bulk Insights Processing

**Method**: `generateBulkInsights(datasets: Dataset[]): Promise<{[datasetId: number]: DatasetInsights}>`

Processes multiple datasets efficiently:

```typescript
const bulkInsights = await openaiService.generateBulkInsights(datasets);

// Process results
for (const [datasetId, insights] of Object.entries(bulkInsights)) {
  console.log(`Dataset ${datasetId}:`, insights);
}
```

**Optimization Features:**
- **Batch Processing**: Groups requests to avoid rate limits
- **Parallel Execution**: Processes 3 datasets simultaneously
- **Rate Limiting**: Prevents API quota exhaustion
- **Error Isolation**: Individual dataset failures don't affect batch

## AI-Powered Chat

### Single Dataset Chat

**Method**: `chatWithDatasetEnhanced(dataset, message, conversationHistory, enableVisualization): Promise<ChatResponse>`

Provides interactive Q&A capabilities for individual datasets:

```typescript
const chatResponse = await openaiService.chatWithDatasetEnhanced(
  dataset,
  "What are the main trends in this data?",
  conversationHistory,
  true // Enable visualization
);

console.log("AI Response:", chatResponse.response);
console.log("Has File Access:", chatResponse.hasFileAccess);
if (chatResponse.chart) {
  console.log("Chart Data:", chatResponse.chart);
}
```

**Enhanced Capabilities:**

**1. Context Building:**
- Intelligent data sampling for relevant context
- Embedding-based retrieval for enhanced accuracy
- Metadata integration for comprehensive understanding

**2. File Access:**
- Direct access to actual dataset samples
- Real data analysis capabilities
- Statistical analysis based on observations

**3. Visualization Support:**
- Automatic chart generation when appropriate
- Chart.js compatible data structures
- Multiple visualization types (bar, line, pie, scatter)

### Conversation History

The service maintains conversation context:

```typescript
const conversationHistory = [
  { role: "user", content: "What does this dataset contain?" },
  { role: "assistant", content: "This dataset contains health metrics..." },
  { role: "user", content: "What are the trends over time?" }
];

const response = await openaiService.chatWithDatasetEnhanced(
  dataset,
  "Can you show me a chart of these trends?",
  conversationHistory,
  true
);
```

## Semantic Column Search

### AI-Powered Column Matching

The service provides semantic column search capabilities that find related columns even when names don't exactly match:

**Search Examples:**

| Search Term | Finds Columns | Reasoning |
|-------------|---------------|-----------|
| "location" | State, District, County | Geographic identifiers |
| "income" | Salary, Wages, Earnings | Financial data |
| "health" | BMI, Blood_Pressure | Medical indicators |
| "population" | Residents, People_Count | Population metrics |

### Enhanced Query Processing

**Query Enhancement:**
```typescript
// The service automatically enhances search queries
const enhancedQuery = this.enhanceSearchQuery(originalQuery);

// Example transformations:
// "location" → "location address state county district geographic"
// "income" → "income salary wage earning revenue financial"
// "health" → "health medical condition disease symptoms diagnosis"
```

### Column Description Analysis

The AI analyzes both column names and descriptions:

```typescript
// Searches include:
// 1. Column names (exact and partial matches)
// 2. Column descriptions (semantic understanding)
// 3. Sample data values (context clues)
// 4. Related terminology (AI-enhanced matching)
```

## Multi-Dataset Analysis

### Cross-Dataset Comparison

**Method**: `chatWithMultipleDatasets(datasets, message, conversationHistory, enableVisualization): Promise<ChatResponse>`

Analyzes multiple datasets simultaneously:

```typescript
const multiDatasetResponse = await openaiService.chatWithMultipleDatasets(
  [dataset1, dataset2, dataset3],
  "Compare the health trends across these datasets",
  conversationHistory,
  true
);
```

**Analysis Capabilities:**

**1. Cross-Dataset Patterns:**
- Common trends across data sources
- Complementary information identification
- Relationship analysis between datasets

**2. Comparative Analysis:**
- Side-by-side data comparison
- Correlation identification
- Trend analysis across sources

**3. Comprehensive Insights:**
- Multi-source evidence compilation
- Enhanced accuracy through data triangulation
- Broader context understanding

### Lightweight Processing

For multi-dataset analysis, the service uses optimized sampling:

```typescript
// Uses 'lightweight' strategy for faster processing
const intelligentSample = await intelligentDataSampler.getIntelligentSample(
  dataset, 
  'lightweight', // Faster, lighter sampling
  message
);
```

## Context Building

### Intelligent Context Integration

The service builds comprehensive context through multiple methods:

**1. Embedding-Based Retrieval:**
```typescript
if (shouldUseEmbeddings) {
  const csvData = await this.getDatasetCSVContent(dataset);
  const enhancedContext = await embeddingRetriever.buildEnhancedContext(
    csvData,
    message,
    dataset.metadata
  );
}
```

**2. Intelligent Data Sampling:**
```typescript
const intelligentSample = await intelligentDataSampler.getIntelligentSample(
  dataset, 
  'auto', // Adaptive sampling strategy
  message
);
```

**3. Metadata Integration:**
```typescript
const datasetContext = `
Dataset: ${dataset.name}
Format: ${dataset.format}
Size: ${dataset.size} (${dataset.sizeBytes} bytes)
Source: ${dataset.source}
Records: ${intelligentSample.sampleData.length}
Strategy: ${intelligentSample.strategy.name}
Quality: ${JSON.stringify(intelligentSample.dataQuality)}
`;
```

### Context Optimization

**Adaptive Strategy Selection:**
- **Auto**: Balanced approach for general queries
- **Lightweight**: Fast processing for multi-dataset analysis
- **Deep**: Comprehensive analysis for complex questions

**Context Prioritization:**
- Recent data samples prioritized
- High-quality data emphasized
- Relevant columns highlighted based on query

## Error Handling

### Graceful Degradation

**API Failures:**
```typescript
try {
  const insights = await this.generateDatasetInsights(dataset);
  return insights;
} catch (error) {
  console.error("OpenAI API error:", error);
  // Return fallback insights based on dataset characteristics
  return this.generateFallbackInsights(dataset);
}
```

**Fallback Strategies:**
- **Metadata-Based Insights**: Use dataset metadata for basic insights
- **Template Responses**: Provide generic but helpful responses
- **Error Context**: Include helpful error information for users

### Rate Limit Management

**Batch Processing:**
```typescript
// Process datasets in batches to avoid rate limits
const batchSize = 3;
for (let i = 0; i < datasets.length; i += batchSize) {
  const batch = datasets.slice(i, i + batchSize);
  const promises = batch.map(dataset => this.generateDatasetInsights(dataset));
  await Promise.all(promises);
}
```

**Exponential Backoff:**
- Automatic retry with increasing delays
- Respect OpenAI rate limit headers
- Graceful handling of quota exhaustion

## Performance Optimization

### Response Optimization

**Token Management:**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: messages,
  response_format: { type: "json_object" },
  max_tokens: 800, // Optimized for insights
});
```

**Context Limiting:**
- Intelligent sampling to stay within token limits
- Priority-based context inclusion
- Efficient prompt engineering

### Caching Strategy

**Response Caching:**
- Cache generated insights for datasets
- Cache common query responses
- Invalidate cache when datasets change

**Context Caching:**
- Cache processed dataset samples
- Reuse embedding retrievals
- Cache metadata processing results

## Usage Examples

### Basic Insights Generation

```typescript
// Generate insights for a dataset
const dataset = await storage.getDataset(datasetId);
const insights = await openaiService.generateDatasetInsights(dataset);

return {
  summary: insights.summary,
  patterns: insights.patterns,
  useCases: insights.useCases
};
```

### Interactive Chat

```typescript
// Chat with a dataset
const chatResponse = await openaiService.chatWithDatasetEnhanced(
  dataset,
  "What are the key health indicators in this data?",
  [], // No previous conversation
  false // No visualization needed
);

return {
  message: chatResponse.response,
  hasFileAccess: chatResponse.hasFileAccess,
  sampleInfo: chatResponse.sampleInfo
};
```

### Multi-Dataset Analysis

```typescript
// Compare multiple datasets
const datasets = await storage.getDatasetsByIds([1, 2, 3]);
const comparison = await openaiService.chatWithMultipleDatasets(
  datasets,
  "Compare the demographic trends across these three datasets",
  [],
  true // Enable visualization
);

return {
  analysis: comparison.response,
  chart: comparison.chart,
  hasFileAccess: comparison.hasFileAccess
};
```

## Troubleshooting

### Common Issues

#### API Key Problems
```bash
Error: Invalid API key provided
```
**Solutions:**
- Verify OPENAI_API_KEY environment variable is set
- Check API key is active and has sufficient credits
- Ensure no extra spaces or characters in key

#### Rate Limit Errors
```bash
Error: Rate limit exceeded
```
**Solutions:**
- Implement exponential backoff retry logic
- Reduce batch sizes for bulk operations
- Monitor API usage and implement queuing

#### Context Length Errors
```bash
Error: Maximum context length exceeded
```
**Solutions:**
- Reduce sample data size
- Use lightweight sampling strategy
- Implement intelligent context truncation

### Performance Issues

#### Slow Response Times
**Causes:**
- Large context size
- Complex queries
- Network latency

**Solutions:**
- Optimize prompt engineering
- Use appropriate sampling strategies
- Implement response caching

#### High Token Usage
**Monitoring:**
```typescript
// Track token usage
const response = await openai.chat.completions.create(options);
console.log("Tokens used:", response.usage?.total_tokens);
```

**Optimization:**
- Use max_tokens limits appropriately
- Optimize context building
- Cache frequent responses

### Debugging

**Enable Detailed Logging:**
```typescript
console.log(`Context built - Strategy: ${intelligentSample.strategy.name}`);
console.log(`Sample size: ${intelligentSample.sampleData.length}`);
console.log(`Embeddings used: ${embeddingRetrievalUsed}`);
```

**API Response Monitoring:**
- Log API response times
- Monitor error rates
- Track token consumption patterns

---

**Related Documentation:**
- [Intelligent Data Sampler](intelligent-data-sampler.md) - Smart sampling strategies
- [User Guide - AI Features](../guides/UserGuide.md#ai-features) - User-facing AI capabilities
- [Admin Guide - AI Management](../guides/AdminGuide.md#ai-feature-management) - AI administration

**Last Updated**: September 2025  
**Version**: 2.1.0 (AI Search Enhancement Release)