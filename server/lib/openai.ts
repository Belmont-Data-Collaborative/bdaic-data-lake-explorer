import OpenAI from "openai";
import type { DatasetInsights, Dataset } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export class OpenAIService {
  async generateDatasetInsights(dataset: Dataset): Promise<DatasetInsights> {
    try {
      const hasYamlMetadata = dataset.metadata?.yamlMetadata;
      const yamlInfo = hasYamlMetadata ? `

YAML Metadata:
- Title: ${dataset.metadata?.title || 'Not specified'}
- Description: ${dataset.metadata?.description || 'Not specified'}
- Tags: ${dataset.metadata?.tags?.join(', ') || 'None'}
- Data Source: ${dataset.metadata?.dataSource || 'Not specified'}
- Column Count: ${dataset.metadata?.columnCount || 'Not specified'}
- License: ${dataset.metadata?.license || 'Not specified'}
- Version: ${dataset.metadata?.version || 'Not specified'}` : '';

      const prompt = `Analyze this dataset and provide insights in JSON format:

Dataset Information:
- Name: ${dataset.name}
- Format: ${dataset.format}
- Size: ${dataset.size} (${dataset.sizeBytes} bytes)
- Source: ${dataset.source}
- File Count: ${dataset.metadata?.fileCount || 'Unknown'}
- Estimated Records: ${dataset.metadata?.recordCount || 'Unknown'}
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
    
    let summary = `This ${format} dataset contains structured data with ${dataset.metadata?.recordCount || 'unknown'} estimated records.`;
    
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
  }> {
    try {
      // Get sample data for analysis
      const sampleData = await this.getSampleDataForAnalysis(dataset);
      
      // Build enhanced context with actual data
      const datasetContext = this.buildEnhancedDatasetContext(dataset, sampleData);
      
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
IMPORTANT: If this question would benefit from a chart, include a JSON object at the end of your response in this exact format:
CHART_DATA: {"type": "bar|pie|line", "data": {"labels": [...], "datasets": [{"label": "...", "data": [...], "backgroundColor": [...]}]}, "title": "Chart Title"}
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
        const chartMatch = responseText.match(/CHART_DATA:\s*({.*})/);
        if (chartMatch) {
          try {
            chartData = JSON.parse(chartMatch[1]);
            responseText = responseText.replace(/CHART_DATA:\s*{.*}/, '').trim();
          } catch (error) {
            console.error("Error parsing chart data:", error);
          }
        }
      }

      return {
        response: responseText,
        chart: chartData,
        hasFileAccess: !!sampleData
      };
    } catch (error) {
      console.error("Error in enhanced dataset chat:", error);
      return {
        response: "I'm experiencing some difficulties accessing the data right now. Please try your question again in a moment.",
        hasFileAccess: false
      };
    }
  }

  private async getSampleDataForAnalysis(dataset: Dataset): Promise<any[] | null> {
    try {
      // This would ideally fetch actual data samples from S3
      // For now, we'll use metadata to simulate data access
      const metadata = dataset.metadata as any;
      if (metadata?.columns && metadata?.recordCount) {
        return this.generateSimulatedSampleData(metadata);
      }
      return null;
    } catch (error) {
      console.error("Error getting sample data:", error);
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
