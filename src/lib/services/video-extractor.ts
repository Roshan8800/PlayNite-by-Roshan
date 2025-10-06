// Video extraction service for processing large CSV files
import { PornhubDataParser, PornhubVideoMetadata, PlayNiteContentStructure } from './pornhub-data-parser';
import fs from 'fs';
import * as path from 'path';

export interface ExtractionConfig {
  outputPath?: string;
  maxVideos?: number;
  batchSize?: number;
  categories?: string[];
  sources?: string[];
  performers?: string[];
}

export class VideoExtractor {
  private parser: PornhubDataParser;
  private config: Required<ExtractionConfig>;

  constructor(config: ExtractionConfig = {}) {
    this.parser = new PornhubDataParser({
      batchSize: config.batchSize || 1000,
      maxRecords: config.maxVideos || 10000
    });

    this.config = {
      outputPath: config.outputPath || path.join(process.cwd(), 'extracted-videos.json'),
      maxVideos: config.maxVideos || 10000,
      batchSize: config.batchSize || 1000,
      categories: config.categories || [],
      sources: config.sources || [],
      performers: config.performers || []
    };
  }

  /**
   * Extract videos from the large CSV file
   */
  async extractVideos(): Promise<PlayNiteContentStructure> {
    const csvFilePath = path.join(process.cwd(), 'pornhub-database', 'pornhub.com-db.csv');

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found at: ${csvFilePath}`);
    }

    console.log(`Starting extraction from: ${csvFilePath}`);
    console.log(`Max videos: ${this.config.maxVideos}`);

    // Read file in chunks to handle large files
    const fileStream = fs.createReadStream(csvFilePath, { encoding: 'utf8' });
    const chunks: string[] = [];

    return new Promise((resolve, reject) => {
      fileStream.on('data', (chunk: string | Buffer) => {
        chunks.push(chunk.toString());
      });

      fileStream.on('end', async () => {
        try {
          const csvContent = chunks.join('');
          const extractedVideos: PornhubVideoMetadata[] = [];

          console.log('Processing CSV content...');

          // Process in batches
          let processedCount = 0;
          for await (const batch of this.parser.parseCSVInBatches(csvContent)) {
            console.log(`Processing batch of ${batch.length} videos...`);

            for (const video of batch) {
              if (processedCount >= this.config.maxVideos) {
                break;
              }

              // Apply filters if specified
              if (this.shouldIncludeVideo(video)) {
                extractedVideos.push(video);
                processedCount++;
              }
            }

            if (processedCount >= this.config.maxVideos) {
              break;
            }
          }

          const result = this.parser.transformForPlayNite(extractedVideos);

          console.log(`Extraction complete. Extracted ${extractedVideos.length} videos.`);

          // Save to file
          await this.saveToFile(result);

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if video should be included based on filters
   */
  private shouldIncludeVideo(video: PornhubVideoMetadata): boolean {
    // If no filters specified, include all
    if (this.config.categories.length === 0 &&
        this.config.sources.length === 0 &&
        this.config.performers.length === 0) {
      return true;
    }

    // Check category filter
    if (this.config.categories.length > 0) {
      const hasMatchingCategory = video.categories.some(cat =>
        this.config.categories.includes(cat)
      );
      if (!hasMatchingCategory) return false;
    }

    // Check source filter
    if (this.config.sources.length > 0) {
      if (!this.config.sources.includes(video.source)) {
        return false;
      }
    }

    // Check performer filter
    if (this.config.performers.length > 0) {
      const hasMatchingPerformer = video.performers.some(performer =>
        this.config.performers.includes(performer)
      );
      if (!hasMatchingPerformer) return false;
    }

    return true;
  }

  /**
   * Save extracted videos to file
   */
  private async saveToFile(data: PlayNiteContentStructure): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.config.outputPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
      console.log(`Saved extracted videos to: ${this.config.outputPath}`);
    } catch (error) {
      console.error('Error saving to file:', error);
      throw error;
    }
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats(): { maxVideos: number; outputPath: string; filters: ExtractionConfig } {
    return {
      maxVideos: this.config.maxVideos,
      outputPath: this.config.outputPath,
      filters: {
        categories: this.config.categories,
        sources: this.config.sources,
        performers: this.config.performers
      }
    };
  }
}