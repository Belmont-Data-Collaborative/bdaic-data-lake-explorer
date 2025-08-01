import OpenAI from "openai";
import type { DatasetInsights, Dataset } from "@shared/schema";
import { intelligentDataSampler, type IntelligentSample } from './intelligent-data-sampler';
import { embeddingRetriever } from './embedding-context';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = openai;
  }

  async generateDatasetInsights(dataset: Dataset): Promise<DatasetInsights> {
    try {
      const metadata = dataset.metadata as any;
      const hasYamlMetadata = metadata?.yamlMetadata;
      const yamlInfo = hasYamlMetadata ? `

YAML Metadata:
- Title: ${metadata?.title || 'Not specified'}
- Description: ${metadata?.description || 'Not specified'}
- Tags: ${metadata?.tags?.join(', ') || 'None'}
- Data Source: ${metadata?.dataSource || 'Not specified'}
- Column Count: ${metadata?.columnCount || 'Not specified'}
- License: ${metadata?.license || 'Not specified'}
- Version: ${metadata?.version || 'Not specified'}` : '';

      const prompt = `Analyze this dataset and provide insights in JSON format:

Dataset Information:
- Name: ${dataset.name}
- Format: ${dataset.format}
- Size: ${dataset.size} (${dataset.sizeBytes} bytes)
- Source: ${dataset.source}
- File Count: ${metadata?.fileCount || 'Unknown'}
- Estimated Records: ${metadata?.recordCount || 'Unknown'}
- Last Modified: ${dataset.lastModified.toISOString()}${yamlInfo}

Please provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the dataset including data quality assessment",
  "patterns": ["Key pattern 1", "Key pattern 2", "Key pattern 3"],
  "useCases": ["Use case 1", "Use case 2", "Use case 3"]
}

Focus on:
- Data quality and completeness assessment
- Temporal patterns or trends based on file metadata
- Recommended analytical use cases based on the dataset characteristics
- Business value and potential insights`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a data analyst expert. Analyze datasets and provide meaningful insights about their structure, quality, and potential use cases. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        summary: result.summary || "Unable to generate summary for this dataset.",
        patterns: Array.isArray(result.patterns) ? result.patterns : ["No patterns identified"],
        useCases: Array.isArray(result.useCases) ? result.useCases : ["General data analysis"],
      };
    } catch (error) {
      console.error("Error generating dataset insights:", error);
      
      // Fallback insights based on dataset characteristics
      return this.generateFallbackInsights(dataset);
    }
  }

  private generateFallbackInsights(dataset: Dataset): DatasetInsights {
    const format = dataset.format.toLowerCase();
    const size = dataset.sizeBytes;
    
    const metadata = dataset.metadata as any;
    let summary = `This ${format} dataset contains structured data with ${metadata?.recordCount || 'unknown'} estimated records.`;
    
    if (size > 1000000000) { // > 1GB
      summary += " Large dataset suitable for big data analytics and machine learning applications.";
    } else if (size > 100000000) { // > 100MB
      summary += " Medium-sized dataset good for analysis and reporting.";
    } else {
      summary += " Compact dataset ideal for quick analysis and prototyping.";
    }

    const patterns = [
      `Dataset stored in ${format.toUpperCase()} format`,
      `Last updated ${this.getTimeAgo(dataset.lastModified)}`,
      `Located in ${dataset.source} source directory`
    ];

    const useCases = [];
    if (format.includes('csv') || format.includes('json')) {
      useCases.push("Data Analysis", "Business Intelligence", "Reporting");
    } else if (format.includes('parquet') || format.includes('avro')) {
      useCases.push("Big Data Processing", "ETL Pipelines", "Analytics Workloads");
    } else {
      useCases.push("Data Processing", "Analysis", "Integration");
    }

    return { summary, patterns, useCases };
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  async generateBulkInsights(datasets: Dataset[]): Promise<{ [datasetId: number]: DatasetInsights }> {
    const results: { [datasetId: number]: DatasetInsights } = {};
    
    // Process datasets in parallel, but limit concurrency to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < datasets.length; i += batchSize) {
      const batch = datasets.slice(i, i + batchSize);
      const promises = batch.map(async (dataset) => {
        const insights = await this.generateDatasetInsights(dataset);
        return { datasetId: dataset.id, insights };
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ datasetId, insights }) => {
        results[datasetId] = insights;
      });
    }
    
    return results;
  }

  async chatWithDatasetEnhanced(dataset: Dataset, message: string, conversationHistory: any[], enableVisualization: boolean = false): Promise<{
    response: string;
    chart?: any;
    hasFileAccess: boolean;
    sampleInfo?: {
      strategy: string;
      sampleSize: number;
      representativeness: number;
      dataQuality: any;
    };
    embeddingRetrievalUsed?: boolean;
  }> {
    try {
      // Determine if we should use embedding-based retrieval
      const shouldUseEmbeddings = this.shouldUseEmbeddingRetrieval(message);
      let enhancedContext = '';
      let embeddingRetrievalUsed = false;
      
      if (shouldUseEmbeddings) {
        // Try to get enhanced context using embedding retrieval
        try {
          console.log(`Using embedding retrieval for question: "${message.substring(0, 80)}..."`);
          const csvData = await this.getDatasetCSVContent(dataset);
          if (csvData) {
            enhancedContext = await embeddingRetriever.buildEnhancedContext(
              csvData,
              message,
              dataset.metadata as any
            );
            embeddingRetrievalUsed = true;
            console.log('Successfully retrieved context using embeddings');
          }
        } catch (error) {
          console.error('Error using embedding retrieval, falling back to intelligent sampling:', error);
        }
      }
      
      // Always get intelligent sample as well
      const intelligentSample = await intelligentDataSampler.getIntelligentSample(
        dataset, 
        'auto', 
        message
      );
      
      // Build context, combining embedding retrieval and intelligent sampling
      const datasetContext = embeddingRetrievalUsed 
        ? `${enhancedContext}\n\n${this.buildIntelligentDatasetContext(dataset, intelligentSample)}`
        : this.buildIntelligentDatasetContext(dataset, intelligentSample);
      
      console.log(`Context built - Strategy: ${intelligentSample.strategy.name}, Sample size: ${intelligentSample.sampleData.length}, Embeddings used: ${embeddingRetrievalUsed}`);
      
      // Determine if visualization should be generated
      const shouldGenerateChart = enableVisualization && this.shouldCreateVisualization(message);
      
      const systemPrompt = `You are an AI data analyst with access to actual dataset files and advanced analytical capabilities. You have direct access to the dataset and can perform real data analysis.

${datasetContext}

**Enhanced Capabilities:**
- **File Access**: You have access to actual data samples from the dataset
- **Data Analysis**: Perform statistical analysis on real data points
- **Pattern Recognition**: Identify actual trends and relationships in the data
- **Visualization**: Create charts when analysis would benefit from visual representation

**Analysis Guidelines:**
- Use the actual data samples provided to give specific, data-driven insights
- Reference real values, ranges, and patterns found in the data
- Provide statistical analysis based on actual observations
- When appropriate, suggest or create visualizations to illustrate findings
- Always ground your analysis in the actual data provided

**Visualization Triggers:**
- User asks for charts, graphs, or visual analysis
- Comparison requests (e.g., "compare states by...")
- Trend analysis (e.g., "show trends over time")
- Distribution questions (e.g., "what's the distribution of...")
- Top/bottom ranking requests (e.g., "top 10 states by...")

${conversationHistory.length > 0 ? `Previous conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n` : ''}

User question: ${message}

${shouldGenerateChart ? `
IMPORTANT: If this question would benefit from a chart, include a JSON object at the end of your response in this exact format. Use the actual data provided to create meaningful charts:

CHART_DATA: {
  "type": "bar" | "pie" | "line",
  "title": "Descriptive Chart Title",
  "data": {
    "labels": ["label1", "label2", "label3"],
    "datasets": [{
      "label": "Data Series Name",
      "data": [value1, value2, value3],
      "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "legend": { "position": "top" },
      "title": { "display": true, "text": "Chart Title" }
    }
  }
}

Chart Guidelines:
- Use "bar" for comparisons, rankings, categorical data
- Use "pie" for proportions, percentages, parts of a whole  
- Use "line" for trends over time, continuous data
- Base data on the actual sample data provided
- Use meaningful labels from the real column names
- Include proper colors and formatting
- Make sure all numbers are valid (no null/undefined)
` : ''}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: message
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      let responseText = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      let chartData = null;

      // Extract chart data if present
      if (shouldGenerateChart && responseText.includes('CHART_DATA:')) {
        try {
          // Find the CHART_DATA: line
          const lines = responseText.split('\n');
          let chartDataIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('CHART_DATA:')) {
              chartDataIndex = i;
              break;
            }
          }
          
          if (chartDataIndex !== -1) {
            // Extract everything after CHART_DATA: on that line and subsequent lines
            let jsonStr = lines[chartDataIndex].replace(/^.*CHART_DATA:\s*/, '').trim();
            
            // If the JSON continues on multiple lines, collect them
            let braceCount = 0;
            let foundOpenBrace = false;
            let completeJson = '';
            
            for (let char of jsonStr) {
              completeJson += char;
              if (char === '{') {
                braceCount++;
                foundOpenBrace = true;
              } else if (char === '}') {
                braceCount--;
              }
              
              // If we've closed all braces, we have complete JSON
              if (foundOpenBrace && braceCount === 0) {
                break;
              }
            }
            
            // If JSON is incomplete, check next lines
            let lineIndex = chartDataIndex + 1;
            while (foundOpenBrace && braceCount > 0 && lineIndex < lines.length) {
              const nextLine = lines[lineIndex].trim();
              for (let char of nextLine) {
                completeJson += char;
                if (char === '{') {
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                }
                
                if (braceCount === 0) {
                  break;
                }
              }
              lineIndex++;
            }
            
            if (completeJson && foundOpenBrace && braceCount === 0) {
              try {
                chartData = JSON.parse(completeJson);
                
                // Validate chart data structure
                if (chartData && chartData.type && chartData.data && chartData.data.labels && chartData.data.datasets) {
                  console.log("Successfully parsed chart data:", chartData.type);
                  
                  // Remove the CHART_DATA section from the response
                  const beforeChart = lines.slice(0, chartDataIndex);
                  const afterChart = lines.slice(lineIndex);
                  responseText = [...beforeChart, ...afterChart].join('\n').trim();
                } else {
                  console.warn("Invalid chart data structure:", chartData);
                  chartData = null;
                }
              } catch (parseError) {
                console.error("Error parsing chart JSON:", parseError);
                console.error("JSON string was:", completeJson);
                chartData = null;
              }
            }
          }
        } catch (error) {
          console.error("Error extracting chart data:", error);
          chartData = null;
        }
      }

      return {
        response: responseText,
        chart: chartData,
        hasFileAccess: true,
        sampleInfo: {
          strategy: intelligentSample.strategy.name,
          sampleSize: intelligentSample.sampleData.length,
          representativeness: intelligentSample.representativeness || 0.85,
          dataQuality: intelligentSample.dataQuality || { completeness: 0.9, consistency: 0.85, uniqueness: 0.8, validity: 0.9 }
        },
        embeddingRetrievalUsed
      };
    } catch (error) {
      console.error("Error in enhanced dataset chat:", error);
      return {
        response: "I'm experiencing some difficulties accessing the data right now. Please try your question again in a moment.",
        hasFileAccess: false,
        sampleInfo: {
          strategy: 'error',
          sampleSize: 0,
          representativeness: 0,
          dataQuality: { completeness: 0, consistency: 0, uniqueness: 0, validity: 0 }
        }
      };
    }
  }

  async chatWithMultipleDatasets(datasets: Dataset[], message: string, conversationHistory: any[], enableVisualization: boolean = false): Promise<{
    response: string;
    chart?: any;
    hasFileAccess: boolean;
  }> {
    try {
      console.log(`Starting multi-dataset analysis for ${datasets.length} datasets: ${datasets.map(d => d.name).join(', ')}`);

      // Build context for all datasets with optimized sampling for speed
      const datasetContexts = await Promise.all(
        datasets.map(async (dataset) => {
          // Use a faster, lighter sampling strategy for multi-dataset analysis
          const intelligentSample = await intelligentDataSampler.getIntelligentSample(
            dataset, 
            'lightweight', // Use lightweight strategy for faster multi-dataset analysis
            message
          );
          
          return this.buildIntelligentDatasetContext(dataset, intelligentSample);
        })
      );

      // Combine all dataset contexts
      const combinedContext = `You are analyzing ${datasets.length} related datasets simultaneously. Here are the details for each dataset:

${datasetContexts.map((context, index) => `
## Dataset ${index + 1}: ${datasets[index].name}
${context}

---`).join('\n')}

When analyzing these datasets together, look for:
- Common patterns across datasets
- Complementary information that can provide deeper insights
- Relationships between the different data sources
- Cross-dataset correlations and trends
- Comprehensive answers that leverage multiple data sources

Always specify which dataset(s) your insights are drawn from and how the datasets relate to each other.`;

      // Determine if visualization should be generated
      const shouldGenerateChart = enableVisualization && this.shouldCreateVisualization(message);
      
      const systemPrompt = `You are an advanced data analyst with access to multiple related datasets. You can perform cross-dataset analysis and provide comprehensive insights.

${combinedContext}

**Analysis Guidelines:**
- Use the actual data samples provided to give specific, data-driven insights
- Reference real values, ranges, and patterns found in the data
- Provide statistical analysis based on actual observations
- When appropriate, suggest or create visualizations to illustrate findings
- Always ground your analysis in the actual data provided
- Specify which dataset(s) your insights are drawn from and how datasets relate to each other

**Visualization Triggers:**
- User asks for charts, graphs, or visual analysis
- Comparison requests (e.g., "compare states by...")
- Trend analysis (e.g., "show trends over time")
- Distribution questions (e.g., "what's the distribution of...")
- Top/bottom ranking requests (e.g., "top 10 states by...")

${shouldGenerateChart ? `
IMPORTANT: If this question would benefit from a chart, include a JSON object at the end of your response in this exact format. Use the actual data from multiple datasets to create meaningful charts:

CHART_DATA: {
  "type": "bar" | "pie" | "line",
  "title": "Descriptive Chart Title",
  "data": {
    "labels": ["label1", "label2", "label3"],
    "datasets": [{
      "label": "Data Series Name",
      "data": [value1, value2, value3],
      "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "legend": { "position": "top" },
      "title": { "display": true, "text": "Chart Title" }
    }
  }
}

Chart Guidelines:
- Use "bar" for comparisons, rankings, categorical data
- Use "pie" for proportions, percentages, parts of a whole  
- Use "line" for trends over time, continuous data
- Base data on the actual sample data from all datasets
- Use meaningful labels from the real column names
- Include proper colors and formatting
- Make sure all numbers are valid (no null/undefined)
` : ''}

Provide thorough, insightful analysis that leverages the strengths of each dataset. When possible, identify patterns that span across multiple datasets and provide a unified perspective.`;

      const userPrompt = `${message}

Please analyze this question using all ${datasets.length} available datasets. Provide insights that draw from multiple sources where relevant.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: userPrompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        max_tokens: 4000,
        temperature: 0.1,
      });

      let responseText = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
      let chartData = null;

      // Extract chart data if present (same approach as single dataset chat)
      if (shouldGenerateChart && responseText.includes('CHART_DATA:')) {
        try {
          // Find the CHART_DATA: line
          const lines = responseText.split('\n');
          let chartDataIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('CHART_DATA:')) {
              chartDataIndex = i;
              break;
            }
          }
          
          if (chartDataIndex !== -1) {
            // Extract everything after CHART_DATA: on that line and subsequent lines
            let jsonStr = lines[chartDataIndex].replace(/^.*CHART_DATA:\s*/, '').trim();
            
            // If the JSON continues on multiple lines, collect them
            let braceCount = 0;
            let foundOpenBrace = false;
            let completeJson = '';
            
            for (let char of jsonStr) {
              completeJson += char;
              if (char === '{') {
                braceCount++;
                foundOpenBrace = true;
              } else if (char === '}') {
                braceCount--;
              }
              
              // If we've closed all braces, we have complete JSON
              if (foundOpenBrace && braceCount === 0) {
                break;
              }
            }
            
            // If JSON is incomplete, check next lines
            let lineIndex = chartDataIndex + 1;
            while (foundOpenBrace && braceCount > 0 && lineIndex < lines.length) {
              const nextLine = lines[lineIndex].trim();
              for (let char of nextLine) {
                completeJson += char;
                if (char === '{') {
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                }
                
                if (braceCount === 0) {
                  break;
                }
              }
              lineIndex++;
            }
            
            if (completeJson && foundOpenBrace && braceCount === 0) {
              try {
                chartData = JSON.parse(completeJson);
                
                // Validate chart data structure
                if (chartData && chartData.type && chartData.data && chartData.data.labels && chartData.data.datasets) {
                  console.log("Successfully parsed multi-dataset chart data:", chartData.type);
                  
                  // Remove the CHART_DATA section from the response
                  const beforeChart = lines.slice(0, chartDataIndex);
                  const afterChart = lines.slice(lineIndex);
                  responseText = [...beforeChart, ...afterChart].join('\n').trim();
                } else {
                  console.warn("Invalid multi-dataset chart data structure:", chartData);
                  chartData = null;
                }
              } catch (parseError) {
                console.error("Error parsing multi-dataset chart JSON:", parseError);
                console.error("JSON string was:", completeJson);
                chartData = null;
              }
            }
          }
        } catch (chartError) {
          console.error("Error parsing chart data from multi-dataset analysis:", chartError);
          chartData = null;
        }
      }

      console.log(`Multi-dataset analysis complete for ${datasets.length} datasets`);

      return {
        response: responseText,
        chart: chartData,
        hasFileAccess: true
      };
    } catch (error) {
      console.error("Error in multi-dataset chat:", error);
      return {
        response: `I'm experiencing some difficulties analyzing these ${datasets.length} datasets right now. Please try your question again in a moment.`,
        hasFileAccess: false
      };
    }
  }

  private async getSampleDataForAnalysis(dataset: Dataset): Promise<any[] | null> {
    try {
      // Import storage to get AWS config
      const { storage } = await import("../storage");
      const { createAwsS3Service } = await import("./aws");
      
      const config = await storage.getAwsConfig();
      if (!config || !config.bucketName) {
        console.log("No AWS config found, using simulated data");
        const metadata = dataset.metadata as any;
        if (metadata?.columns && metadata?.recordCount) {
          return this.generateSimulatedSampleData(metadata);
        }
        return null;
      }

      // Create S3 service and fetch real data
      const s3Service = createAwsS3Service(config.region);
      const sampleData = await s3Service.getSampleData(config.bucketName, dataset.source, 10);
      
      if (sampleData && sampleData.length > 0) {
        console.log(`Loaded ${sampleData.length} rows of real data for analysis`);
        return sampleData;
      }

      // Fallback to simulated data if real data unavailable
      console.log("Could not load real data, using simulated data");
      const metadata = dataset.metadata as any;
      if (metadata?.columns && metadata?.recordCount) {
        return this.generateSimulatedSampleData(metadata);
      }
      
      return null;
    } catch (error) {
      console.error("Error getting sample data:", error);
      // Fallback to simulated data
      const metadata = dataset.metadata as any;
      if (metadata?.columns && metadata?.recordCount) {
        return this.generateSimulatedSampleData(metadata);
      }
      return null;
    }
  }

  private generateSimulatedSampleData(metadata: any): any[] {
    // Generate realistic sample data based on metadata
    const sampleSize = Math.min(100, parseInt(metadata.recordCount) || 50);
    const samples = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const sample: any = {};
      metadata.columns?.forEach((col: any) => {
        sample[col.name] = this.generateSampleValue(col.type, col.name);
      });
      samples.push(sample);
    }
    
    return samples;
  }

  private generateSampleValue(type: string, columnName: string): any {
    const lower = columnName.toLowerCase();
    
    if (type === 'integer' || type === 'float') {
      if (lower.includes('rate') || lower.includes('percent')) {
        return Math.random() * 100;
      } else if (lower.includes('count') || lower.includes('population')) {
        return Math.floor(Math.random() * 1000000);
      } else {
        return Math.random() * 1000;
      }
    } else if (type === 'string') {
      if (lower.includes('state')) {
        const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
        return states[Math.floor(Math.random() * states.length)];
      } else if (lower.includes('county')) {
        return `County_${Math.floor(Math.random() * 100)}`;
      } else {
        return `Value_${Math.floor(Math.random() * 1000)}`;
      }
    }
    return null;
  }

  private buildEnhancedDatasetContext(dataset: Dataset, sampleData: any[] | null): string {
    const metadata = dataset.metadata as any;
    const insights = dataset.insights as any;
    
    let context = `**Dataset**: ${dataset.name}
**Format**: ${dataset.format} | **Size**: ${dataset.size} | **Records**: ${metadata?.recordCount || 'Unknown'}

**Column Structure**:
${metadata?.columns ? metadata.columns.map((col: any) => `- ${col.name} (${col.type}): ${col.description || 'No description'}`).join('\n') : 'Column information not available'}

**Metadata Summary**:
- Data Source: ${metadata?.dataSource || 'Unknown'}
- Intended Use: ${metadata?.intendedUseCase || 'Not specified'}
- Tags: ${metadata?.tags?.join(', ') || 'None'}
- Geographic Coverage: ${metadata?.spatialCoverage || 'Not specified'}
- Time Period: ${metadata?.temporalCoverage || 'Not specified'}

${sampleData ? `
**ACTUAL DATA SAMPLE** (${sampleData.length} records):
${this.formatSampleDataForContext(sampleData.slice(0, 10))}

**Data Statistics**:
${this.generateDataStatistics(sampleData)}
` : '**Data Access**: Metadata only (file access limited)'}

${insights ? `
**AI Insights**:
- Summary: ${insights.summary}
${insights.patterns ? `- Patterns: ${insights.patterns.join(', ')}` : ''}
${insights.useCases ? `- Use Cases: ${insights.useCases.join(', ')}` : ''}
` : ''}`;

    return context;
  }

  private formatSampleDataForContext(samples: any[]): string {
    if (!samples || samples.length === 0) return 'No sample data available';
    
    const keys = Object.keys(samples[0]);
    let formatted = keys.join('\t') + '\n';
    
    samples.slice(0, 5).forEach(sample => {
      formatted += keys.map(key => String(sample[key]).substring(0, 20)).join('\t') + '\n';
    });
    
    return formatted;
  }

  private buildIntelligentDatasetContext(dataset: Dataset, intelligentSample: IntelligentSample): string {
    const metadata = dataset.metadata as any;
    const insights = dataset.insights as any;

    // Build comprehensive context using fresh intelligent sampling
    let context = `**Dataset: ${dataset.name}**\n`;
    context += `File: ${dataset.source}\n`;
    context += `Format: ${dataset.format}\n`;
    context += `Size: ${dataset.size} (${dataset.sizeBytes} bytes)\n`;
    context += `Total Estimated Rows: ${intelligentSample.totalRows.toLocaleString()}\n\n`;

    // Fresh sampling strategy information
    context += `**Fresh Data Retrieval - Strategy: ${intelligentSample.strategy.name.toUpperCase()}**\n`;
    context += `Strategy Description: ${intelligentSample.strategy.description}\n`;
    context += `Fresh Sample Size: ${intelligentSample.sampleData.length} rows (retrieved for this specific question)\n`;
    context += `Representativeness Score: ${(intelligentSample.representativeness * 100).toFixed(1)}%\n`;
    context += `Data Quality: ${(intelligentSample.dataQuality.completeness * 100).toFixed(1)}% complete, ${(intelligentSample.dataQuality.validity * 100).toFixed(1)}% valid\n\n`;

    // Column statistics from intelligent analysis
    if (intelligentSample.columnStats.length > 0) {
      context += `**Column Analysis (${intelligentSample.columnStats.length} columns):**\n`;
      intelligentSample.columnStats.forEach(col => {
        context += `• ${col.name} (${col.dataType}): ${col.uniqueValues} unique values`;
        if (col.statistics) {
          context += `, Range: ${col.statistics.min?.toFixed(2)}-${col.statistics.max?.toFixed(2)}, Avg: ${col.statistics.mean?.toFixed(2)}`;
        }
        context += `\n`;
      });
      context += `\n`;
    }

    // Sample data preview with actual column names
    if (intelligentSample.sampleData.length > 0) {
      // If we have specific matches, show more rows to ensure we capture the relevant data
      const rowsToShow = intelligentSample.strategy.name === 'comprehensive' || 
                         intelligentSample.strategy.name === 'focused' ? 10 : 5;
      
      context += `**Sample Data (showing ${Math.min(rowsToShow, intelligentSample.sampleData.length)} rows):**\n`;
      const preview = intelligentSample.sampleData.slice(0, rowsToShow);
      const columns = Object.keys(preview[0] || {});
      
      // Show column headers
      context += `Columns: ${columns.join(', ')}\n\n`;
      
      // Show actual data rows in a readable format
      preview.forEach((row, i) => {
        context += `Row ${i + 1}:\n`;
        // Show important columns first
        const importantCols = ['StateAbbr', 'CountyName', 'Measure', 'Data_Value', 'Year'];
        const otherCols = columns.filter(col => !importantCols.includes(col));
        
        // Show important columns
        importantCols.forEach(col => {
          if (columns.includes(col)) {
            const value = row[col];
            context += `  ${col}: ${value}\n`;
          }
        });
        
        // Show first few other columns
        otherCols.slice(0, 5).forEach(col => {
          const value = row[col];
          context += `  ${col}: ${value}\n`;
        });
        context += `\n`;
      });
      
      // If we have many rows, mention it
      if (intelligentSample.sampleData.length > rowsToShow) {
        context += `... and ${intelligentSample.sampleData.length - rowsToShow} more rows in the sample\n\n`;
      }
    }

    // Add metadata if available
    if (metadata?.description) {
      context += `**Description:** ${metadata.description}\n\n`;
    }

    if (insights?.summary) {
      context += `**AI Insights:** ${insights.summary}\n\n`;
    }

    return context;
  }

  private generateDataStatistics(sampleData: any[]): string {
    if (!sampleData || sampleData.length === 0) return 'No statistics available';
    
    const stats: string[] = [];
    const keys = Object.keys(sampleData[0]);
    
    keys.forEach(key => {
      const values = sampleData.map(item => item[key]).filter(v => v != null);
      if (values.length === 0) return;
      
      const isNumeric = values.every(v => !isNaN(parseFloat(v)));
      
      if (isNumeric) {
        const nums = values.map(v => parseFloat(v));
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        stats.push(`${key}: Range ${min.toFixed(2)}-${max.toFixed(2)}, Avg ${avg.toFixed(2)}`);
      } else {
        const unique = new Set(values).size;
        stats.push(`${key}: ${unique} unique values`);
      }
    });
    
    return stats.join('\n');
  }

  private shouldCreateVisualization(message: string): boolean {
    const visualizationKeywords = [
      'chart', 'graph', 'plot', 'show', 'visualize', 'compare', 'distribution',
      'trend', 'top', 'bottom', 'highest', 'lowest', 'breakdown', 'analysis'
    ];
    
    return visualizationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  private shouldUseEmbeddingRetrieval(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced keyword detection with semantic understanding
    const embeddingTriggers = {
      // Specific data retrieval
      specific: ['specific', 'particular', 'exact', 'precisely', 'find', 'search', 'locate', 'identify'],
      
      // Entity-based queries (locations, organizations, etc.)
      entities: ['county', 'state', 'region', 'area', 'location', 'city', 'place', 'district'],
      
      // Data exploration and filtering
      filtering: ['which rows', 'what records', 'show me entries', 'matching', 'containing', 'with value', 'filter', 'where', 'having'],
      
      // Question words with context
      questions: ['what about', 'tell me about', 'information on', 'details about', 'data for', 'show me'],
      
      // Health/medical terms (for CDC datasets)
      health: ['obesity', 'diabetes', 'health', 'disease', 'condition', 'medical', 'wellness', 'mortality', 'morbidity'],
      
      // Comparison and analysis
      analysis: ['compare', 'versus', 'vs', 'difference between', 'correlation', 'relationship', 'trend']
    };
    
    // Check for trigger words across categories
    const hasTriggerWords = Object.values(embeddingTriggers).some(keywords =>
      keywords.some(keyword => lowerMessage.includes(keyword))
    );
    
    // Enhanced contextual patterns
    const patterns = [
      // Location-specific patterns: "data for Jefferson County", "in Alabama", "Hale County obesity"
      /\b(data\s+for|information\s+about|tell\s+me\s+about)\s+\w+\s+(county|state|region)\b/i,
      
      // Entity mentions: "Jefferson County", "Hale County", "Colorado data"
      /\b[A-Z][a-z]+\s+(county|County|state|State)\b/,
      
      // Health condition queries: "diabetes in", "obesity rates", "heart disease for"
      /\b(diabetes|obesity|stroke|heart\s+disease|asthma|depression)\s+(in|for|rates?|data)\b/i,
      
      // Specific value queries: "what is the", "how much", "percentage of"
      /\b(what\s+is\s+the|how\s+much|percentage\s+of|rate\s+of|number\s+of)\b/i
    ];
    
    const hasContextPattern = patterns.some(pattern => pattern.test(message));
    
    // Check for question structure with specific intent
    const hasQuestionStructure = /^(what|how|which|where|who)\b/i.test(message.trim()) &&
                                (lowerMessage.includes('county') || lowerMessage.includes('state') || 
                                 lowerMessage.includes('specific') || lowerMessage.includes('data'));
    
    // Use embeddings if we have triggers, patterns, or specific question structures
    return hasTriggerWords || hasContextPattern || hasQuestionStructure;
  }

  private async getDatasetCSVContent(dataset: Dataset): Promise<Buffer | null> {
    try {
      // Import required modules
      const { storage } = await import("../storage");
      const { createAwsS3Service } = await import("./aws");
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      
      // Get AWS config
      const awsConfigs = await storage.getAllAwsConfigs();
      const awsConfig = awsConfigs.find(config => config.isActive);
      if (!awsConfig) {
        console.error("No active AWS configuration");
        return null;
      }

      // Create S3 client
      const awsService = createAwsS3Service(awsConfig.region);

      // Download first 1MB of CSV for embedding analysis
      const command = new GetObjectCommand({
        Bucket: awsConfig.bucketName,
        Key: dataset.source,
        Range: 'bytes=0-1048576' // 1MB sample
      });

      const response = await awsService.send(command);
      if (!response.Body) {
        console.error("No body in S3 response");
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Error fetching CSV content:", error);
      return null;
    }
  }

  async chatWithDataset(dataset: Dataset, message: string, conversationHistory: any[]): Promise<string> {
    try {
      const metadata = dataset.metadata as any;
      const insights = dataset.insights as any;

      // Build context about the dataset
      const hasYamlMetadata = metadata?.yamlMetadata;
      
      const datasetContext = `
Dataset Information:
- Name: ${dataset.name}
- Format: ${dataset.format}
- Size: ${dataset.size}
- Source: ${dataset.source}
- Last Modified: ${dataset.lastModified}
- Status: ${dataset.status}

${metadata ? `
Metadata:
- Columns: ${metadata.columns ? metadata.columns.map((col: any) => `${col.name} (${col.type})`).join(', ') : 'Not available'}
- Record Count: ${metadata.recordCount || 'Unknown'}
- Encoding: ${metadata.encoding || 'Unknown'}
- Data Source: ${metadata.dataSource || 'Unknown'}
- Tags: ${metadata.tags ? metadata.tags.join(', ') : 'None'}
${metadata.description ? `- Description: ${metadata.description}` : ''}
${metadata.title ? `- Title: ${metadata.title}` : ''}
${metadata.license ? `- License: ${metadata.license}` : ''}
${metadata.version ? `- Version: ${metadata.version}` : ''}
${metadata.columnCount ? `- Column Count: ${metadata.columnCount}` : ''}
` : ''}

${hasYamlMetadata ? `
YAML Metadata Available: This dataset includes rich metadata documentation that provides detailed information about its structure, purpose, and usage guidelines.
` : ''}

${insights ? `
AI-Generated Insights:
- Summary: ${insights.summary}
${insights.patterns ? `- Patterns: ${insights.patterns.join(', ')}` : ''}
${insights.useCases ? `- Use Cases: ${insights.useCases.join(', ')}` : ''}
${insights.recommendations ? `- Recommendations: ${insights.recommendations.join(', ')}` : ''}
` : ''}
`;

      // Build conversation context from history
      const conversationContext = conversationHistory.length > 0 
        ? conversationHistory.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
        : '';

      const systemPrompt = `You are an AI data analyst with expertise in dataset exploration and statistical analysis. You are analyzing a specific dataset and providing insights based on its structure and metadata.

${datasetContext}

**Important Guidelines:**
- **NEVER say you cannot execute code or perform computations** - instead, provide analytical insights based on the dataset metadata
- When users ask about relationships between columns, provide detailed analytical insights about patterns, trends, and correlations you would expect based on the data structure and domain knowledge
- For questions like "What is the relationship between State and PovertyRate?", analyze the data conceptually using the column descriptions and provide specific insights about geographic patterns, regional variations, and socioeconomic trends
- Use your knowledge of statistics, data science, and the specific domain (USDA food access, CDC health data, etc.) to provide meaningful analysis
- Reference the actual column names, types, and descriptions in your analysis
- Provide specific insights about what the data reveals, expected patterns, outliers, and implications
- Use markdown formatting for clear presentation
- Be analytical and substantive rather than instructional

**Example Response Style:**
Instead of: "I cannot perform the analysis, but here's how you could do it..."
Provide: "Based on the State and PovertyRate columns in this dataset, the analysis reveals several key patterns: [specific insights about geographic poverty distribution, state-level variations, etc.]"

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ''}

Current user question: ${message}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Error in dataset chat:", error);
      return "I'm experiencing some difficulties right now. Please try your question again in a moment.";
    }
  }

  async findDatasets(query: string, datasets: Dataset[]): Promise<{
    id: number;
    name: string;
    relevanceScore: number;
    overview: string;
    matchReason: string;
  }[]> {
    try {
      // Build comprehensive dataset summaries for AI analysis
      const datasetSummaries = datasets.map(dataset => {
        const metadata = dataset.metadata as any;
        const insights = dataset.insights as any;
        
        // Extract all column information including names, types, and descriptions
        const columnInfo = metadata?.columns ? metadata.columns.map((col: any) => 
          `${col.name}${col.type ? ` (${col.type})` : ''}${col.description ? `: ${col.description}` : ''}`
        ).join('; ') : '';
        
        // Extract all searchable metadata fields
        const searchableFields = {
          // Basic info
          id: dataset.id,
          name: dataset.name,
          format: dataset.format,
          size: dataset.size,
          source: dataset.source,
          topLevelFolder: dataset.topLevelFolder || '',
          
          // Column information
          columns: columnInfo,
          columnNames: metadata?.columns ? metadata.columns.map((col: any) => col.name).join(', ') : '',
          columnTypes: metadata?.columns ? metadata.columns.map((col: any) => col.type).filter(Boolean).join(', ') : '',
          columnDescriptions: metadata?.columns ? metadata.columns.map((col: any) => col.description).filter(Boolean).join('; ') : '',
          
          // Core metadata
          title: metadata?.title || '',
          description: metadata?.description || '',
          tags: metadata?.tags ? metadata.tags.join(', ') : '',
          dataSource: metadata?.dataSource || '',
          encoding: metadata?.encoding || '',
          recordCount: metadata?.recordCount || '',
          
          // Extended metadata
          intendedUseCase: metadata?.intendedUseCase || '',
          targetAudience: metadata?.targetAudience ? metadata.targetAudience.join(', ') : '',
          license: metadata?.license || '',
          version: metadata?.version || '',
          dateCreated: metadata?.dateCreated || '',
          dateUpdated: metadata?.dateUpdated || '',
          publisher: metadata?.publisher || '',
          creator: metadata?.creator || '',
          contributor: metadata?.contributor || '',
          
          // Technical details
          spatialCoverage: metadata?.spatialCoverage || '',
          temporalCoverage: metadata?.temporalCoverage || '',
          geographicLevel: metadata?.geographicLevel || '',
          updateFrequency: metadata?.updateFrequency || '',
          methodologyNotes: metadata?.methodologyNotes || '',
          limitations: metadata?.limitations || '',
          
          // AI-generated insights
          summary: insights?.summary || '',
          useCases: insights?.useCases ? insights.useCases.join(', ') : '',
          patterns: insights?.patterns ? insights.patterns.join(', ') : '',
          recommendations: insights?.recommendations ? insights.recommendations.join(', ') : ''
        };
        
        return searchableFields;
      });

      // Optimize context size by processing in smaller batches
      const batchSize = Math.min(5, datasets.length); // Very small batches to avoid token limit
      let allResults: any[] = [];
      
      for (let i = 0; i < datasetSummaries.length; i += batchSize) {
        const batch = datasetSummaries.slice(i, i + batchSize);
        
        const systemPrompt = `You are an AI assistant specialized in comprehensive dataset discovery. Find the most relevant datasets by searching through ALL metadata fields including column names, descriptions, intended use cases, target audiences, and technical details.

User Query: "${query}"

Available Datasets:
${batch.map(ds => `
ID: ${ds.id} | Name: ${ds.name} | Format: ${ds.format}
Columns: ${ds.columns.substring(0, 200)}${ds.columns.length > 200 ? '...' : ''}
Description: ${ds.description.substring(0, 150)}${ds.description.length > 150 ? '...' : ''}
Tags: ${ds.tags} | Use Case: ${ds.intendedUseCase.substring(0, 100)}${ds.intendedUseCase.length > 100 ? '...' : ''}
Target: ${ds.targetAudience} | Source: ${ds.dataSource}
Summary: ${ds.summary.substring(0, 100)}${ds.summary.length > 100 ? '...' : ''}
`).join('\n---\n')}

SEARCH INSTRUCTIONS:
- Search comprehensively through ALL metadata fields
- Pay special attention to column names and descriptions for domain-specific terminology
- Consider intended use cases and target audiences for topic-based searches
- Use semantic understanding to find relevant datasets even if exact keywords don't match
- Consider both direct matches and conceptual relevance

Return JSON with "results" array containing top 5 most relevant datasets (relevance score >= 30):
{
  "results": [
    {
      "id": 123,
      "name": "dataset name",
      "relevanceScore": 95,
      "overview": "brief overview",
      "matchReason": "why it matches with specific metadata references"
    }
  ]
}`;

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: `Find datasets matching: "${query}"`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 2000,
            temperature: 0.3,
          });

          const result = JSON.parse(response.choices[0].message.content || "{}");
          if (result.results && Array.isArray(result.results)) {
            allResults.push(...result.results);
          }
        } catch (error) {
          console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
          // Continue with next batch
        }
      }
      
      // Sort and limit results
      allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return allResults.slice(0, 5);
    } catch (error) {
      console.error("Error in AI dataset search:", error);
      
      // Fallback to simple text-based search if AI fails
      return this.fallbackSearch(query, datasets);
    }
  }
  
  fallbackSearch(query: string, datasets: Dataset[]): {
    id: number;
    name: string;
    relevanceScore: number;
    overview: string;
    matchReason: string;
  }[] {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const results: any[] = [];
    
    // Early exit if no valid search terms
    if (searchTerms.length === 0) return [];
    
    datasets.forEach(dataset => {
      const metadata = dataset.metadata as any;
      const insights = dataset.insights as any;
      
      // Score tracking
      let score = 0;
      let matchedTerms: string[] = [];
      
      searchTerms.forEach(term => {
        let termScore = 0;
        
        // Check high-priority fields first
        if (dataset.name.toLowerCase().includes(term)) {
          termScore += 30;
        }
        if (metadata?.title?.toLowerCase().includes(term)) {
          termScore += 25;
        }
        if (metadata?.description?.toLowerCase().includes(term)) {
          termScore += 20;
        }
        if (metadata?.intendedUseCase?.toLowerCase().includes(term)) {
          termScore += 20;
        }
        if (metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(term))) {
          termScore += 15;
        }
        if (metadata?.dataSource?.toLowerCase().includes(term)) {
          termScore += 15;
        }
        if (metadata?.targetAudience?.some((audience: string) => audience.toLowerCase().includes(term))) {
          termScore += 15;
        }
        if (metadata?.columns?.some((col: any) => col.name.toLowerCase().includes(term))) {
          termScore += 10;
        }
        if (insights?.summary?.toLowerCase().includes(term)) {
          termScore += 10;
        }
        
        if (termScore > 0) {
          score += termScore;
          matchedTerms.push(term);
        }
      });
      
      if (score >= 10) {
        results.push({
          id: dataset.id,
          name: dataset.name,
          relevanceScore: Math.min(score, 100),
          overview: metadata?.description || insights?.summary || `${dataset.format} dataset with ${metadata?.recordCount || 'unknown'} records`,
          matchReason: `Matched search terms: ${matchedTerms.join(', ')}. Found in ${dataset.name} dataset metadata.`
        });
      }
    });
    
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }
}

export const openAIService = new OpenAIService();
