// Streaming CSV parser for handling large database files efficiently
import fs from 'fs';
import { PornhubDataParser, PornhubVideoMetadata, PlayNiteContentStructure } from './pornhub-data-parser';

export interface CSVParseOptions {
  batchSize?: number;
  maxRecords?: number;
  search?: string;
  category?: string;
  source?: string;
}

export class CSVStreamParser {
  private parser: PornhubDataParser;

  constructor() {
    this.parser = new PornhubDataParser({
      batchSize: 1000,
      maxRecords: Infinity,
      includeSecondaryThumbnails: true
    });
  }

  /**
   * Parse large CSV file with streaming for memory efficiency
   */
  async *parseLargeCSVFile(filePath: string, options: CSVParseOptions = {}): AsyncGenerator<PornhubVideoMetadata[], void, unknown> {
    const { batchSize = 1000, maxRecords = Infinity, search = '', category = 'all', source = 'all' } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found at: ${filePath}`);
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let remainder = '';
    let batch: PornhubVideoMetadata[] = [];
    let recordCount = 0;

    return new Promise((resolve, reject) => {
      fileStream.on('data', (chunk: string | Buffer) => {
        const chunkStr = chunk.toString();
        const lines = (remainder + chunkStr).split('\n');
        remainder = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() && recordCount < maxRecords) {
            const parsed = this.parser.parseLine(line);
            if (parsed && this.matchesFilters(parsed, search, category, source)) {
              batch.push(parsed);
              recordCount++;

              if (batch.length >= batchSize) {
                yield batch.splice(0); // Yield and clear the batch
              }
            }
          }
        }
      });

      fileStream.on('end', () => {
        if (batch.length > 0) {
          yield batch;
        }
        resolve();
      });

      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if video matches the filter criteria
   */
  private matchesFilters(video: PornhubVideoMetadata, search: string, category: string, sourceFilter: string): boolean {
    // If no filters specified, include all
    if (!search && category === 'all' && sourceFilter === 'all') {
      return true;
    }

    // Check search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = video.title.toLowerCase().includes(searchLower) ||
                           video.performers.some(p => p.toLowerCase().includes(searchLower)) ||
                           video.categories.some(c => c.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Check category filter
    if (category !== 'all' && !video.categories.includes(category)) {
      return false;
    }

    // Check source filter
    if (sourceFilter !== 'all' && video.source !== sourceFilter) {
      return false;
    }

    return true;
  }

  /**
   * Get total count of records in CSV file
   */
  async getRecordCount(filePath: string): Promise<number> {
    if (!fs.existsSync(filePath)) {
      return 0;
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let count = 0;
    let remainder = '';

    return new Promise((resolve, reject) => {
      fileStream.on('data', (chunk: string | Buffer) => {
        const chunkStr = chunk.toString();
        const lines = (remainder + chunkStr).split('\n');
        remainder = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            count++;
          }
        }
      });

      fileStream.on('end', () => {
        resolve(count);
      });

      fileStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse CSV and return paginated results
   */
  async parseWithPagination(
    filePath: string,
    page: number = 1,
    limit: number = 20,
    filters: { search?: string; category?: string; source?: string } = {}
  ): Promise<PlayNiteContentStructure> {
    const allVideos: PornhubVideoMetadata[] = [];
    const offset = (page - 1) * limit;

    try {
      for await (const batch of this.parseLargeCSVFile(filePath, {
        ...filters,
        maxRecords: offset + limit
      })) {
        allVideos.push(...batch);
      }

      const paginatedVideos = allVideos.slice(offset, offset + limit);
      const totalCount = await this.getRecordCount(filePath);

      return this.parser.transformForPlayNite(paginatedVideos);
    } catch (error) {
      console.error('Error parsing CSV with pagination:', error);
      return {
        videos: [],
        metadata: {
          totalCount: 0,
          sources: [],
          categories: [],
          performers: [],
          processedAt: new Date().toISOString(),
          dataVersion: '1.0.0'
        }
      };
    }
  }
}
