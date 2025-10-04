import { PornhubDataParser, PlayNiteContentStructure, createSampleData } from './pornhub-data-parser';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Demonstration of parsing Pornhub CSV data for PlayNite CMS
 */
export class PornhubDataDemo {
  private parser: PornhubDataParser;

  constructor() {
    this.parser = new PornhubDataParser({
      batchSize: 500,
      maxRecords: 10000, // Limit for demo purposes
      includeSecondaryThumbnails: true
    });
  }

  /**
   * Process sample data to demonstrate structure
   */
  async processSampleData(): Promise<PlayNiteContentStructure> {
    console.log('Processing sample data...');

    const sampleVideos = createSampleData();
    const playNiteStructure = this.parser.transformForPlayNite(sampleVideos);

    console.log(`Processed ${sampleVideos.length} sample videos`);
    console.log('Available sources:', playNiteStructure.metadata.sources);
    console.log('Available categories:', playNiteStructure.metadata.categories);
    console.log('Available performers:', playNiteStructure.metadata.performers);

    return playNiteStructure;
  }

  /**
   * Process actual CSV file data (first few lines for demo)
   */
  async processCSVData(): Promise<PlayNiteContentStructure> {
    console.log('Processing CSV data from extracted_db/pornhub.com-db.csv...');

    try {
      // Read first 1000 lines for demo (since file is very large)
      const csvPath = path.join(process.cwd(), 'extracted_db/pornhub.com-db.csv');

      if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found at: ${csvPath}`);
      }

      // Use stream to read first chunk for demo
      const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
      let csvContent = '';
      let lineCount = 0;
      const maxLines = 1000;

      return new Promise((resolve, reject) => {
        fileStream.on('data', (chunk: string | Buffer) => {
          const chunkStr = chunk.toString();
          csvContent += chunkStr;
          lineCount += (chunkStr.match(/\n/g) || []).length;

          if (lineCount >= maxLines) {
            fileStream.close();
          }
        });

        fileStream.on('end', async () => {
          try {
            console.log(`Read ${lineCount} lines from CSV file`);

            const allVideos: any[] = [];

            for await (const batch of this.parser.parseCSVInBatches(csvContent)) {
              allVideos.push(...batch);
              console.log(`Processed batch of ${batch.length} videos`);
            }

            const playNiteStructure = this.parser.transformForPlayNite(allVideos);

            console.log(`\n=== PROCESSING SUMMARY ===`);
            console.log(`Total videos processed: ${allVideos.length}`);
            console.log(`Available sources: ${playNiteStructure.metadata.sources.length}`);
            console.log(`Available categories: ${playNiteStructure.metadata.categories.length}`);
            console.log(`Available performers: ${playNiteStructure.metadata.performers.length}`);

            console.log(`\n=== SAMPLE VIDEO DATA ===`);
            if (allVideos.length > 0) {
              const sample = allVideos[0];
              console.log(`Title: ${sample.title}`);
              console.log(`Duration: ${sample.duration}s`);
              console.log(`Views: ${sample.viewCount.toLocaleString()}`);
              console.log(`Source: ${sample.source}`);
              console.log(`Categories: ${sample.categories.slice(0, 3).join(', ')}`);
              console.log(`Performers: ${sample.performers.join(', ')}`);
            }

            resolve(playNiteStructure);
          } catch (error) {
            reject(error);
          }
        });

        fileStream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error processing CSV file:', error);
      throw error;
    }
  }

  /**
   * Generate JSON output for PlayNite CMS
   */
  async generatePlayNiteJSON(structure: PlayNiteContentStructure): Promise<string> {
    const jsonOutput = {
      ...structure,
      metadata: {
        ...structure.metadata,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0.0'
      }
    };

    return JSON.stringify(jsonOutput, null, 2);
  }

  /**
   * Validate data quality
   */
  validateDataQuality(videos: any[]): { valid: number; invalid: number; errors: string[] } {
    const result = {
      valid: 0,
      invalid: 0,
      errors: [] as string[]
    };

    videos.forEach((video, index) => {
      const validation = this.parser.validateVideo(video);
      if (validation.isValid) {
        result.valid++;
      } else {
        result.invalid++;
        result.errors.push(`Video ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return result;
  }

  /**
   * Run complete demo
   */
  async runDemo(): Promise<void> {
    console.log('=== PORNHUB DATA PARSER DEMO ===\n');

    try {
      // Process sample data first
      console.log('1. Processing sample data...');
      const sampleStructure = await this.processSampleData();

      console.log('\n2. Processing actual CSV data...');
      const csvStructure = await this.processCSVData();

      console.log('\n3. Generating PlayNite JSON...');
      const sampleJSON = await this.generatePlayNiteJSON(sampleStructure);
      const csvJSON = await this.generatePlayNiteJSON(csvStructure);

      console.log('\n4. Data quality validation...');
      const sampleQuality = this.validateDataQuality(sampleStructure.videos);
      const csvQuality = this.validateDataQuality(csvStructure.videos);

      console.log('Sample data quality:', sampleQuality);
      console.log('CSV data quality:', csvQuality);

      console.log('\n=== DEMO COMPLETE ===');
      console.log(`Sample JSON size: ${sampleJSON.length} characters`);
      console.log(`CSV JSON size: ${csvJSON.length} characters`);

      // Save sample output for reference
      fs.writeFileSync('pornhub-sample-output.json', sampleJSON);
      console.log('Sample output saved to: pornhub-sample-output.json');

    } catch (error) {
      console.error('Demo failed:', error);
      throw error;
    }
  }
}

// Export utility functions for external use
export async function parsePornhubCSV(filePath?: string): Promise<PlayNiteContentStructure> {
  const demo = new PornhubDataDemo();

  if (filePath) {
    // Custom file path - would need to modify the class to accept custom paths
    throw new Error('Custom file path not yet supported in this demo');
  }

  return await demo.processCSVData();
}

export function createPlayNiteStructure(videos: any[]): PlayNiteContentStructure {
  const parser = new PornhubDataParser();
  return parser.transformForPlayNite(videos);
}