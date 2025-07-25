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
      
      // Check if this is a specific query that needs progressive scanning
      const needsProgressiveScan = this.requiresFullDatasetAccess(query);
      
      if (needsProgressiveScan) {
        console.log('Starting progressive scan for specific entity:', query);
        // Use progressive scanning to find the requested data
        const result = await this.progressiveScan(dataset, query, maxRows);
        return result;
      } else {
        // For general queries, use standard sampling
        const sampleSize = Math.min(10000, maxRows * 10);
        console.log(`Using standard sample size: ${sampleSize}`);
        
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
      }
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

  private async progressiveScan(
    dataset: Dataset,
    query: QueryFilter,
    maxRows: number
  ): Promise<RAGQueryResult> {
    console.log(`Progressive scan starting for query:`, query);

    // Convert query filter to search criteria format for AWS service
    const searchCriteria: any = {};
    
    // Map our query fields to the column names in the dataset
    // We'll create multiple variations to handle different column naming conventions
    if (query.state) {
      searchCriteria['state'] = query.state;
    }
    
    if (query.county) {
      searchCriteria['county'] = query.county;
    }
    
    if (query.measure) {
      searchCriteria['measure'] = query.measure;
    }
    
    if (query.year) {
      searchCriteria['year'] = query.year;
    }

    // Use the new progressive scanning method
    // For county-specific queries, request more matches to ensure we find the county
    const matchesToFind = query.county ? Math.max(5000, maxRows) : maxRows;
    
    const matchedData = await this.awsService.getSampleDataWithProgression(
      this.bucketName,
      dataset.source,
      searchCriteria,
      matchesToFind
    );

    if (!matchedData || matchedData.length === 0) {
      console.log('No matches found in progressive scan, returning general sample');
      // If no matches found after scanning, return a general sample
      const generalSample = await this.awsService.getSampleData(
        this.bucketName,
        dataset.source,
        maxRows
      );
      return {
        data: generalSample || [],
        matchedFilters: [],
        totalMatches: 0,
        query
      };
    }

    console.log(`Progressive scan found ${matchedData.length} matching rows`);
    
    // Analyze which filters were actually matched
    const matchedFilters = this.analyzeMatchedFilters(matchedData, query);
    
    // If we have room, add some context rows
    if (matchedData.length < maxRows) {
      const remainingSpace = maxRows - matchedData.length;
      const contextData = await this.awsService.getSampleData(
        this.bucketName,
        dataset.source,
        remainingSpace
      );
      if (contextData && contextData.length > 0) {
        matchedData.push(...contextData);
        console.log(`Added ${contextData.length} context rows`);
      }
    }

    return {
      data: matchedData.slice(0, maxRows),
      matchedFilters,
      totalMatches: matchedData.length,
      query
    };
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

    // Enhanced county extraction with more precise patterns
    const countyPatterns = [
      // Direct "CountyName County" pattern
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+County\b/i,
      // "County" + county name
      /\bcounty(?:\s+of)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
      // Preposition + county name + "county"
      /\b(?:in|for|from|about|regarding)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:county|County)\b/i,
      // "Show me" + county pattern
      /\bshow\s+me\s+(?:data\s+(?:for|from|about)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:county|County)\b/i,
      // County name without "County" when followed by state context
      /\b(?:data\s+for|information\s+about|tell\s+me\s+about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:in\s+[A-Z]{2}|in\s+\w+)\b/i
    ];
    
    let detectedCounty = null;
    for (const pattern of countyPatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        let countyName = match[1].trim();
        // Clean up common noise words
        countyName = countyName.replace(/^(for|in|from|about|data|information)\s+/i, '');
        countyName = countyName.replace(/\s+(data|information|county)$/i, '');
        
        // Validate county name (should be proper case, real county names)
        if (this.isValidCountyName(countyName)) {
          detectedCounty = countyName;
          console.log(`Detected county: ${detectedCounty} using pattern`);
          break;
        }
      }
    }
    
    // Special case handling for common misparses
    if (!detectedCounty) {
      const specialCases = {
        'eagle': 'Eagle',
        'hale': 'Hale', 
        'jefferson': 'Jefferson',
        'madison': 'Madison',
        'mobile': 'Mobile'
      };
      
      for (const [keyword, county] of Object.entries(specialCases)) {
        if (lowerQuestion.includes(keyword) && (lowerQuestion.includes('county') || query.state)) {
          detectedCounty = county;
          console.log(`Detected county via special case: ${detectedCounty}`);
          break;
        }
      }
    }
    
    if (detectedCounty) {
      query.county = detectedCounty;
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

  private isValidCountyName(name: string): boolean {
    // Basic validation for county names - should be capitalized, reasonable length
    if (name.length < 2 || name.length > 30) return false;
    if (!/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(name)) return false;
    
    // Filter out common noise words that might be captured
    const noiseWords = ['Data', 'Information', 'County', 'State', 'Tell', 'Show', 'Give', 'About'];
    return !noiseWords.includes(name);
  }

  private requiresFullDatasetAccess(query: QueryFilter): boolean {
    // If asking for specific county, state, or measure, we need more data
    return !!(query.county || query.state || query.measure || query.year);
  }
}