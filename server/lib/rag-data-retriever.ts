import { AwsS3Service } from './aws';
import { storage } from '../storage';
import type { Dataset } from '@shared/schema';

export interface QueryFilter {
  state?: string;
  county?: string;
  year?: string | number;
  measure?: string;
  category?: string;
  [key: string]: any;
}

export interface RAGQueryResult {
  data: any[];
  matchedFilters: string[];
  totalMatches: number;
  query: QueryFilter;
}

export class RAGDataRetriever {
  private awsService: AwsS3Service;
  private bucketName: string;

  constructor(awsService: AwsS3Service, bucketName: string) {
    this.awsService = awsService;
    this.bucketName = bucketName;
  }

  async queryDatasetWithFilters(
    dataset: Dataset,
    query: QueryFilter,
    maxRows: number = 100
  ): Promise<RAGQueryResult> {
    try {
      console.log(`RAG Query for dataset ${dataset.name} with filters:`, query);
      
      // Check if this is a specific query that needs full dataset access
      const needsFullAccess = this.requiresFullDatasetAccess(query);
      
      // Get appropriate sample size based on query specificity
      const sampleSize = needsFullAccess ? 100000 : Math.min(10000, maxRows * 10);
      console.log(`Using sample size: ${sampleSize} (full access: ${needsFullAccess})`);
      
      const rawData = await this.awsService.getSampleData(
        this.bucketName,
        dataset.source,
        sampleSize
      );

      if (!rawData || rawData.length === 0) {
        return {
          data: [],
          matchedFilters: [],
          totalMatches: 0,
          query
        };
      }

      // Apply filters based on query
      const filteredData = this.applyFilters(rawData, query);
      
      // Analyze which filters were actually matched
      const matchedFilters = this.analyzeMatchedFilters(filteredData, query);
      
      // Limit to requested rows
      const resultData = filteredData.slice(0, maxRows);

      return {
        data: resultData,
        matchedFilters,
        totalMatches: filteredData.length,
        query
      };
    } catch (error) {
      console.error('Error in RAG query:', error);
      return {
        data: [],
        matchedFilters: [],
        totalMatches: 0,
        query
      };
    }
  }

  private applyFilters(data: any[], query: QueryFilter): any[] {
    return data.filter(row => {
      // Check each filter condition
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        
        // Handle different column name variations
        const columnVariations = this.getColumnVariations(key);
        let matched = false;

        for (const columnName of columnVariations) {
          if (row.hasOwnProperty(columnName)) {
            const rowValue = row[columnName];
            
            // Case-insensitive comparison for strings
            if (typeof rowValue === 'string' && typeof value === 'string') {
              if (rowValue.toLowerCase().includes(value.toLowerCase())) {
                matched = true;
                break;
              }
            } else if (rowValue == value) {
              matched = true;
              break;
            }
          }
        }

        if (!matched) return false;
      }
      
      return true;
    });
  }

  private getColumnVariations(key: string): string[] {
    const variations = [key];
    
    // Common variations for CDC data columns
    const mappings: { [key: string]: string[] } = {
      'state': ['StateAbbr', 'stateabbr', 'state_abbr', 'State', 'STATE'],
      'county': ['CountyName', 'countyname', 'county_name', 'County', 'COUNTY'],
      'year': ['Year', 'year', 'YEAR', 'data_year', 'DataYear'],
      'measure': ['Measure', 'measure', 'MEASURE', 'MeasureId', 'measure_id'],
      'category': ['Category', 'category', 'CATEGORY', 'CategoryID'],
      'value': ['Data_Value', 'data_value', 'DataValue', 'VALUE']
    };

    if (mappings[key.toLowerCase()]) {
      variations.push(...mappings[key.toLowerCase()]);
    }

    // Add camelCase and snake_case variations
    variations.push(
      key.charAt(0).toUpperCase() + key.slice(1), // Capitalize
      key.toLowerCase(), // lowercase
      key.toUpperCase(), // UPPERCASE
      key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''), // camelToSnake
      key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) // snake_toCamel
    );

    return [...new Set(variations)];
  }

  private analyzeMatchedFilters(data: any[], query: QueryFilter): string[] {
    const matched: string[] = [];
    
    if (data.length === 0) return matched;

    // Check which filters were actually used
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      
      const columnVariations = this.getColumnVariations(key);
      const sampleRow = data[0];
      
      for (const columnName of columnVariations) {
        if (sampleRow.hasOwnProperty(columnName)) {
          matched.push(`${key} (as ${columnName})`);
          break;
        }
      }
    }

    return matched;
  }

  // Extract contextual information from the user's question
  extractQueryFromQuestion(question: string): QueryFilter {
    const query: QueryFilter = {};
    const lowerQuestion = question.toLowerCase();
    
    // Enhanced state extraction - handles both full names and abbreviations
    const statePatterns = [
      /\b(?:in|for|from|show me)\s+(alabama|al)\b/i,
      /\bhale\s+county/i // Special case: if they mention "hale county", assume Alabama
    ] as RegExp[];
    
    const stateMap: { [key: string]: string } = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
      'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
      'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
      'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
      'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
      'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
      'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
      'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
      'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
      'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
      'wisconsin': 'WI', 'wyoming': 'WY'
    };

    // Check for state mentions
    for (const [stateName, stateCode] of Object.entries(stateMap)) {
      if (lowerQuestion.includes(stateName) || lowerQuestion.includes(stateCode.toLowerCase())) {
        query.state = stateCode;
        console.log(`Detected state: ${stateCode} from "${stateName}"`);
        break;
      }
    }

    // Enhanced county extraction - multiple patterns
    const countyPatterns = [
      /\b(\w+(?:\s+\w+)?)\s+county\b/i,  // "Hale County" or "Jefferson County"
      /\bcounty\s+of\s+(\w+(?:\s+\w+)?)\b/i,  // "County of Jefferson"
      /\bin\s+(\w+(?:\s+\w+)?)\s+county\b/i,   // "in Jefferson County"
      /\bshow\s+me\s+(\w+(?:\s+\w+)?)\s+county\b/i // "show me Hale County"
    ];
    
    for (const pattern of countyPatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        query.county = match[1].trim();
        console.log(`Detected county: ${query.county}`);
        break;
      }
    }

    // Special handling for Hale County (common in Alabama CDC data)
    if (lowerQuestion.includes('hale county') || lowerQuestion.includes('hale')) {
      query.county = 'Hale';
      query.state = 'AL'; // Hale County is in Alabama
      console.log('Special case: Detected Hale County, Alabama');
    }

    // Year extraction
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = question.match(yearPattern);
    if (yearMatch) {
      query.year = yearMatch[1];
    }

    // Health measure extraction (common CDC measures)
    const healthMeasures = [
      'arthritis', 'asthma', 'cancer', 'copd', 'diabetes', 
      'heart disease', 'kidney disease', 'obesity', 'stroke',
      'mental health', 'physical health', 'depression'
    ];
    
    for (const measure of healthMeasures) {
      if (lowerQuestion.includes(measure)) {
        query.measure = measure;
        console.log(`Detected health measure: ${measure}`);
        break;
      }
    }

    console.log('Extracted query:', query);
    return query;
  }

  private requiresFullDatasetAccess(query: QueryFilter): boolean {
    // If asking for specific county, state, or measure, we need more data
    return !!(query.county || query.state || query.measure || query.year);
  }
}