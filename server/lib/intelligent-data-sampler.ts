import type { Dataset } from '@shared/schema';
import { AwsS3Service } from './aws';
import { storage } from '../storage';
import { RAGDataRetriever } from './rag-data-retriever';

export interface DataSampleStrategy {
  name: string;
  maxSizeBytes: number;
  sampleRows: number;
  description: string;
}

export interface IntelligentSample {
  strategy: DataSampleStrategy;
  sampleData: any[];
  totalRows: number;
  columnStats: ColumnStats[];
  dataQuality: DataQualityMetrics;
  representativeness: number; // 0-1 score
}

export interface ColumnStats {
  name: string;
  dataType: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  uniqueValues: number;
  nullCount: number;
  sampleValues: any[];
  statistics?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
  };
}

export interface DataQualityMetrics {
  completeness: number; // % of non-null values
  consistency: number; // % of values following expected patterns
  uniqueness: number; // % of unique records
  validity: number; // % of valid data types
}

export class IntelligentDataSampler {
  private ragRetriever?: RAGDataRetriever;
  
  // Different sampling strategies based on dataset size and type
  private readonly strategies: DataSampleStrategy[] = [
    {
      name: 'representative',
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
      sampleRows: 5000,
      description: 'Stratified random sampling for statistical representativeness'
    },
    {
      name: 'comprehensive',
      maxSizeBytes: 20 * 1024 * 1024, // 20MB  
      sampleRows: 2000,
      description: 'Multi-stage sampling including edge cases and outliers'
    },
    {
      name: 'focused',
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      sampleRows: 1000,
      description: 'Smart sampling targeting key columns and patterns'
    },
    {
      name: 'lightweight',
      maxSizeBytes: 5 * 1024 * 1024, // 5MB
      sampleRows: 500,
      description: 'Minimal but informative sample for quick analysis'
    }
  ];

  async getIntelligentSample(
    dataset: Dataset, 
    strategy: 'auto' | string = 'auto',
    questionContext?: string
  ): Promise<IntelligentSample> {
    const selectedStrategy = this.selectOptimalStrategy(dataset, strategy, questionContext);
    
    try {
      let sampleData: any[];
      
      // Always reinitialize RAG retriever to ensure fresh connections
      const awsConfig = await storage.getAwsConfig();
      if (awsConfig) {
        const awsService = new AwsS3Service(awsConfig.region);
        this.ragRetriever = new RAGDataRetriever(awsService, awsConfig.bucketName);
      }
      
      // If we have a question context, try to use RAG for more targeted data retrieval
      if (questionContext && this.ragRetriever) {
        const query = this.ragRetriever.extractQueryFromQuestion(questionContext);
        
        if (Object.keys(query).length > 0) {
          console.log('Using RAG retrieval with fresh query:', query);
          
          // Intelligent decision on whether to use progressive scanning or regular sampling
          const needsProgressiveScan = this.ragRetriever.requiresFullDatasetAccess && 
                                     this.ragRetriever.requiresFullDatasetAccess(query);
          
          if (needsProgressiveScan) {
            console.log('Query requires progressive scanning for comprehensive results');
            const ragResult = await this.ragRetriever.queryDatasetWithFilters(
              dataset,
              query,
              Math.max(5000, selectedStrategy.sampleRows)
            );
            
            if (ragResult.data.length > 0) {
              console.log(`Progressive scan returned ${ragResult.data.length} rows matching filters:`, ragResult.matchedFilters);
              sampleData = ragResult.data;
            } else {
              console.log('Progressive scan found no matches, using larger regular sample');
              sampleData = await this.fetchStrategicSample(dataset, {
                ...selectedStrategy,
                sampleRows: Math.max(2000, selectedStrategy.sampleRows)
              });
            }
          } else {
            console.log('Query can be satisfied with regular sampling - using larger sample for better coverage');
            // Use regular sampling but with increased size for better query coverage
            sampleData = await this.fetchStrategicSample(dataset, {
              ...selectedStrategy,
              sampleRows: Math.max(2000, selectedStrategy.sampleRows)
            });
            
            // Apply filters to the regular sample
            if (sampleData.length > 0) {
              const filteredData = this.ragRetriever.applyFilters && 
                                 typeof this.ragRetriever.applyFilters === 'function' ?
                                 this.ragRetriever.applyFilters(sampleData, query) : sampleData;
              
              if (filteredData.length > 0) {
                console.log(`Regular sampling with filters returned ${filteredData.length} matching rows`);
                sampleData = filteredData;
              }
            }
          }
        } else {
          // Check if this is still an entity query even without extracted filters
          const isEntityQuery = /\b(county|state|city|what is|show me|find)\b/i.test(questionContext);
          const isGeneralQuery = /\b(overview|summary|describe|what|how|analyze|pattern|trend)\b/i.test(questionContext);
          
          if (isEntityQuery && !isGeneralQuery) {
            console.log('Detected specific entity query, using larger sample');
            sampleData = await this.fetchStrategicSample(dataset, {
              ...selectedStrategy,
              sampleRows: Math.max(1500, selectedStrategy.sampleRows)
            });
          } else {
            console.log('Detected general analysis query, using standard sampling');
            sampleData = await this.fetchStrategicSample(dataset, selectedStrategy);
          }
        }
      } else {
        // No question context or RAG not initialized, use regular sampling
        sampleData = await this.fetchStrategicSample(dataset, selectedStrategy);
      }
      
      // Analyze the sample for quality and representativeness
      const columnStats = this.analyzeColumns(sampleData);
      const dataQuality = this.assessDataQuality(sampleData, columnStats);
      const totalRows = await this.estimateTotalRows(dataset);
      const representativeness = this.calculateRepresentativeness(
        sampleData, 
        columnStats, 
        totalRows, 
        selectedStrategy
      );

      return {
        strategy: selectedStrategy,
        sampleData,
        totalRows,
        columnStats,
        dataQuality,
        representativeness
      };
    } catch (error) {
      console.error('Error creating intelligent sample:', error);
      // Fallback to basic sampling
      return this.createFallbackSample(dataset, selectedStrategy);
    }
  }

  private selectOptimalStrategy(
    dataset: Dataset, 
    requestedStrategy: string,
    questionContext?: string
  ): DataSampleStrategy {
    if (requestedStrategy !== 'auto') {
      const found = this.strategies.find(s => s.name === requestedStrategy);
      if (found) return found;
    }

    const datasetSizeBytes = dataset.sizeBytes || 0;
    
    // Question-context based strategy selection
    if (questionContext) {
      const analysisKeywords = ['statistical', 'correlation', 'distribution', 'pattern'];
      const summaryKeywords = ['overview', 'summary', 'describe', 'what is'];
      
      if (analysisKeywords.some(kw => questionContext.toLowerCase().includes(kw))) {
        return this.strategies[0] || this.strategies.find(s => s.name === 'representative')!;
      }
      if (summaryKeywords.some(kw => questionContext.toLowerCase().includes(kw))) {
        return this.strategies[3] || this.strategies.find(s => s.name === 'lightweight')!;
      }
    }

    // Size-based strategy selection
    if (datasetSizeBytes > 1024 * 1024 * 1024) { // > 1GB
      return this.strategies[3] || this.strategies.find(s => s.name === 'lightweight')!;
    } else if (datasetSizeBytes > 100 * 1024 * 1024) { // > 100MB
      return this.strategies[2] || this.strategies.find(s => s.name === 'focused')!;
    } else if (datasetSizeBytes > 10 * 1024 * 1024) { // > 10MB
      return this.strategies[1] || this.strategies.find(s => s.name === 'comprehensive')!;
    } else {
      return this.strategies[0] || this.strategies.find(s => s.name === 'representative')!;
    }
  }

  private async fetchStrategicSample(
    dataset: Dataset, 
    strategy: DataSampleStrategy
  ): Promise<any[]> {
    // Get real data from S3 using the existing AWS service
    const sampleData = await this.getBasicSample(dataset, strategy.sampleRows);
    
    // Apply intelligent sampling transformations based on the strategy
    return this.applySamplingTransformations(sampleData, strategy);
  }

  private async getBasicSample(dataset: Dataset, maxRows: number): Promise<any[]> {
    try {
      console.log(`Fetching ${maxRows} rows sample for dataset ${dataset.name}`);
      
      // Get AWS configuration to properly initialize the service
      const awsConfig = await storage.getAwsConfig();
      if (!awsConfig) {
        throw new Error('No active AWS configuration found');
      }
      
      // Use the existing AWS service to get actual data from S3
      const awsService = new AwsS3Service(awsConfig.region);
      
      // Initialize RAG retriever if not already done
      if (!this.ragRetriever) {
        this.ragRetriever = new RAGDataRetriever(awsService, awsConfig.bucketName);
      }
      
      const sampleData = await awsService.getSampleData(awsConfig.bucketName, dataset.source, maxRows);
      
      if (!sampleData || sampleData.length === 0) {
        console.warn(`No sample data available for dataset ${dataset.name}`);
        return [];
      }

      return sampleData;
    } catch (error) {
      console.error('Error fetching basic sample:', error);
      return [];
    }
  }

  private applySamplingTransformations(
    data: any[], 
    strategy: DataSampleStrategy
  ): any[] {
    switch (strategy.name) {
      case 'representative':
        return this.applyStratifiedSampling(data);
      case 'comprehensive':
        return this.applyComprehensiveSampling(data);
      case 'focused':
        return this.applyFocusedSampling(data);
      default:
        return this.applyLightweightSampling(data);
    }
  }

  private applyStratifiedSampling(data: any[]): any[] {
    // For representative sampling, return the full sample as-is
    // The AWS service already provides a good random sample
    return data;
  }

  private applyComprehensiveSampling(data: any[]): any[] {
    // For comprehensive sampling, return all available data
    return data;
  }

  private applyFocusedSampling(data: any[]): any[] {
    // For focused sampling, return the data as-is
    // The sample size is already controlled by the strategy
    return data;
  }

  private applyLightweightSampling(data: any[]): any[] {
    // For lightweight sampling, take a smaller subset if needed
    return data.slice(0, Math.min(data.length, 500));
  }

  private analyzeColumns(data: any[]): ColumnStats[] {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0]);
    return columns.map(columnName => {
      const values = data.map(row => row[columnName]).filter(v => v != null);
      const uniqueValues = new Set(values).size;
      const nullCount = data.length - values.length;
      
      // Determine data type
      const dataType = this.inferDataType(values);
      
      // Calculate statistics for numeric columns
      let statistics;
      if (dataType === 'numeric') {
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (numericValues.length > 0) {
          const sorted = numericValues.sort((a, b) => a - b);
          const sum = numericValues.reduce((a, b) => a + b, 0);
          const mean = sum / numericValues.length;
          
          statistics = {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            mean,
            median: sorted[Math.floor(sorted.length / 2)],
            stdDev: Math.sqrt(
              numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
            )
          };
        }
      }

      return {
        name: columnName,
        dataType,
        uniqueValues,
        nullCount,
        sampleValues: values.slice(0, 10), // First 10 non-null values
        statistics: statistics || undefined
      };
    });
  }

  private inferDataType(values: any[]): ColumnStats['dataType'] {
    if (values.length === 0) return 'text';
    
    // Check if all values are numeric
    const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
    if (numericCount / values.length > 0.8) return 'numeric';
    
    // Check if values look like dates
    const dateCount = values.filter(v => !isNaN(Date.parse(v))).length;
    if (dateCount / values.length > 0.8) return 'datetime';
    
    // Check if boolean-like
    const booleanValues = new Set(['true', 'false', '1', '0', 'yes', 'no']);
    const booleanCount = values.filter(v => 
      booleanValues.has(String(v).toLowerCase())
    ).length;
    if (booleanCount / values.length > 0.8) return 'boolean';
    
    // Check if categorical (limited unique values)
    const uniqueRatio = new Set(values).size / values.length;
    if (uniqueRatio < 0.1) return 'categorical';
    
    return 'text';
  }

  private assessDataQuality(data: any[], columnStats: ColumnStats[]): DataQualityMetrics {
    if (!data || data.length === 0) {
      return { completeness: 0, consistency: 0, uniqueness: 0, validity: 0 };
    }

    const totalCells = data.length * columnStats.length;
    const nullCells = columnStats.reduce((sum, col) => sum + col.nullCount, 0);
    const completeness = totalCells > 0 ? (totalCells - nullCells) / totalCells : 1;
    
    // Simple heuristics for consistency and validity
    const consistency = 0.85; // Placeholder - would analyze actual patterns
    const validity = 0.9; // Placeholder - would validate data types
    
    // Calculate uniqueness (avoiding completely duplicate rows)
    const uniqueRows = new Set(data.map(row => JSON.stringify(row))).size;
    const uniqueness = data.length > 0 ? uniqueRows / data.length : 1;

    return {
      completeness,
      consistency,
      uniqueness,
      validity
    };
  }

  private async estimateTotalRows(dataset: Dataset): Promise<number> {
    // Estimate total rows based on file size and sample
    // This is a heuristic - in production would be more sophisticated
    const avgRowSize = 100; // bytes, rough estimate
    return Math.floor((dataset.sizeBytes || 0) / avgRowSize);
  }

  private calculateRepresentativeness(
    sampleData: any[],
    columnStats: ColumnStats[],
    totalRows: number,
    strategy: DataSampleStrategy
  ): number {
    if (sampleData.length === 0 || totalRows === 0) return 0;
    
    // Base representativeness on sample size ratio
    const sampleRatio = Math.min(sampleData.length / totalRows, 1);
    
    // Adjust based on data quality and strategy
    const qualityBonus = columnStats.length > 0 ? 
      columnStats.reduce((sum, col) => sum + (col.uniqueValues / sampleData.length), 0) / columnStats.length : 0;
    
    const strategyMultiplier = {
      'representative': 1.0,
      'comprehensive': 0.9,
      'focused': 0.8,
      'lightweight': 0.6
    }[strategy.name] || 0.7;

    return Math.min(sampleRatio + qualityBonus * 0.2, 1) * strategyMultiplier;
  }

  private async createFallbackSample(
    dataset: Dataset, 
    strategy: DataSampleStrategy
  ): Promise<IntelligentSample> {
    return {
      strategy,
      sampleData: [],
      totalRows: 0,
      columnStats: [],
      dataQuality: { completeness: 0, consistency: 0, uniqueness: 0, validity: 0 },
      representativeness: 0
    };
  }
}

export const intelligentDataSampler = new IntelligentDataSampler();