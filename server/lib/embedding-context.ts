import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RetrievalResult {
  question: string;
  retrieved_rows: Array<{
    content: string;
    metadata: Record<string, any>;
    score: number;
  }>;
  prompt: string;
}

export class EmbeddingContextRetriever {
  private pythonScriptPath: string;
  private tempDir: string;

  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'embedding_retriever.py');
    this.tempDir = os.tmpdir();
  }

  /**
   * Retrieve relevant context from a CSV file using embeddings
   */
  async retrieveContext(
    csvData: string | Buffer,
    question: string,
    sampleSize: number = 1000,
    topK: number = 5
  ): Promise<RetrievalResult> {
    try {
      // Write CSV data to temporary file
      const tempCsvPath = path.join(this.tempDir, `temp_${Date.now()}.csv`);
      fs.writeFileSync(tempCsvPath, csvData);

      // Create temporary output file path
      const outputPath = path.join(this.tempDir, `results_${Date.now()}.json`);

      return new Promise((resolve, reject) => {
        // Run Python script with arguments
        const pythonProcess = spawn('python', [
          this.pythonScriptPath,
          tempCsvPath,
          question,
          '--sample-size', sampleSize.toString(),
          '--top-k', topK.toString(),
          '--output', outputPath
        ]);

        let errorOutput = '';

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          // Clean up temp CSV file
          try {
            fs.unlinkSync(tempCsvPath);
          } catch (e) {
            console.error('Error cleaning up temp CSV:', e);
          }

          if (code !== 0) {
            reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
            return;
          }

          // Read results from output file
          try {
            const results = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            fs.unlinkSync(outputPath); // Clean up output file
            resolve(results);
          } catch (e) {
            reject(new Error(`Failed to read results: ${e}`));
          }
        });

        pythonProcess.on('error', (err) => {
          reject(new Error(`Failed to start Python process: ${err.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Embedding context retrieval failed: ${error}`);
    }
  }

  /**
   * Build enhanced context by combining embedding retrieval with metadata
   */
  async buildEnhancedContext(
    csvData: string | Buffer,
    question: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    try {
      // Get embedding-based context
      const retrievalResult = await this.retrieveContext(csvData, question);
      
      // Build enhanced context
      let context = '';
      
      // Add metadata if available
      if (metadata) {
        context += '=== Dataset Information ===\n';
        if (metadata.title) context += `Title: ${metadata.title}\n`;
        if (metadata.description) context += `Description: ${metadata.description}\n`;
        if (metadata.dataSource) context += `Source: ${metadata.dataSource}\n`;
        if (metadata.recordCount) context += `Total Records: ${metadata.recordCount}\n`;
        if (metadata.columnCount) context += `Columns: ${metadata.columnCount}\n`;
        context += '\n';
      }

      // Add retrieved rows
      context += '=== Most Relevant Data ===\n';
      retrievalResult.retrieved_rows.forEach((row, index) => {
        context += `\n--- Row ${index + 1} (Relevance: ${row.score.toFixed(3)}) ---\n`;
        
        // Extract key fields from metadata
        const fields = Object.entries(row.metadata)
          .filter(([key]) => !['source', 'row_index'].includes(key))
          .slice(0, 10); // Limit to 10 fields for context
          
        fields.forEach(([key, value]) => {
          context += `${key}: ${value}\n`;
        });
      });

      return context;
    } catch (error) {
      console.error('Error building enhanced context:', error);
      // Fallback to basic context if embedding retrieval fails
      return this.buildBasicContext(csvData, metadata);
    }
  }

  /**
   * Fallback method for basic context without embeddings
   */
  private buildBasicContext(
    csvData: string | Buffer,
    metadata?: Record<string, any>
  ): string {
    let context = '';
    
    if (metadata) {
      context += 'Dataset Information:\n';
      Object.entries(metadata).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          context += `${key}: ${value}\n`;
        }
      });
    }
    
    // Add first few rows as sample
    const lines = csvData.toString().split('\n').slice(0, 6);
    if (lines.length > 1) {
      context += '\nSample Data:\n';
      context += lines.join('\n');
    }
    
    return context;
  }
}

// Export singleton instance
export const embeddingRetriever = new EmbeddingContextRetriever();