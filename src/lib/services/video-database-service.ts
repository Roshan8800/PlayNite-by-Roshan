import fs from 'fs';
import path from 'path';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';

export interface VideoMetadata {
  // Core video information
  embedUrl: string;
  title: string;
  duration: number;
  viewCount: number;
  likes: number;
  dislikes: number;
  commentCount?: number;

  // Visual assets
  primaryThumbnail: string;
  thumbnailSequence: string[];
  secondaryThumbnail?: string;
  secondaryThumbnailSequence?: string[];

  // Content classification
  tags: string[];
  categories: string[];
  performers: string[];

  // Source information
  source: string;

  // Metadata
  uploadedDate?: string;
  videoId?: string;
  rating?: number;
  isHD?: boolean;
  isVR?: boolean;
}

export interface VideoDatabaseStats {
  totalVideos: number;
  totalSize: number;
  sources: string[];
  categories: string[];
  performers: string[];
  dateRange: {
    earliest: string;
    latest: string;
  };
  averageDuration: number;
  totalViews: number;
}

export interface VideoQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  source?: string;
  performer?: string;
  minDuration?: number;
  maxDuration?: number;
  minViews?: number;
  sortBy?: 'date' | 'views' | 'duration' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
  isHD?: boolean;
  isVR?: boolean;
}

export class VideoDatabaseService {
  private csvFilePath: string;
  private cache = new Map<string, VideoMetadata[]>();
  private statsCache: VideoDatabaseStats | null = null;

  constructor(csvFilePath?: string) {
    this.csvFilePath = csvFilePath || path.join(process.cwd(), 'pornhub-database', 'pornhub.com-db.csv');
  }

  /**
   * Parse a single CSV line into VideoMetadata
   */
  parseCSVLine(line: string): VideoMetadata | null {
    try {
      const fields = line.split('|');

      if (fields.length < 13) {
        console.warn('Skipping malformed line:', line.substring(0, 100) + '...');
        return null;
      }

      const [
        embedUrl,
        primaryThumbnail,
        thumbnailSequenceStr,
        title,
        tagsStr,
        categoriesStr,
        performersStr,
        durationStr,
        viewCountStr,
        likesStr,
        dislikesStr,
        secondaryThumbnail,
        secondaryThumbnailSequenceStr,
        commentCountStr = '0'
      ] = fields;

      // Parse sequences
      const thumbnailSequence = thumbnailSequenceStr
        .split(';')
        .filter(url => url.trim().length > 0);

      const secondaryThumbnailSequence = secondaryThumbnailSequenceStr
        ? secondaryThumbnailSequenceStr.split(';').filter(url => url.trim().length > 0)
        : undefined;

      // Parse arrays
      const tags = tagsStr.split(';').filter(tag => tag.trim().length > 0);
      const categories = categoriesStr.split(';').filter(cat => cat.trim().length > 0);
      const performers = performersStr.split(';').filter(perf => perf.trim().length > 0);

      // Extract source from tags
      const source = this.extractSource(tags);

      // Extract video ID from embed URL
      const videoId = this.extractVideoId(embedUrl);

      // Extract upload date from thumbnail URL
      const uploadedDate = this.extractUploadDate(primaryThumbnail);

      return {
        embedUrl: embedUrl.trim(),
        title: title.trim(),
        duration: parseInt(durationStr, 10) || 0,
        viewCount: parseInt(viewCountStr, 10) || 0,
        likes: parseInt(likesStr, 10) || 0,
        dislikes: parseInt(dislikesStr, 10) || 0,
        commentCount: parseInt(commentCountStr, 10) || 0,
        primaryThumbnail: primaryThumbnail.trim(),
        thumbnailSequence,
        secondaryThumbnail: secondaryThumbnail?.trim(),
        secondaryThumbnailSequence,
        tags,
        categories,
        performers,
        source,
        uploadedDate,
        videoId,
        rating: this.calculateRating(parseInt(likesStr, 10) || 0, parseInt(dislikesStr, 10) || 0),
        isHD: this.detectHDQuality(tags, categories),
        isVR: this.detectVRContent(tags, title)
      };
    } catch (error) {
      console.error('Error parsing CSV line:', error);
      return null;
    }
  }

  /**
   * Query videos with advanced filtering and pagination
   */
  async queryVideos(query: VideoQuery = {}): Promise<{
    videos: VideoMetadata[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      source = '',
      performer = '',
      minDuration,
      maxDuration,
      minViews,
      sortBy = 'views',
      sortOrder = 'desc',
      tags = [],
      isHD,
      isVR
    } = query;

    const cacheKey = JSON.stringify(query);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return this.paginateResults(cached, page, limit);
    }

    try {
      console.log(`Querying videos with: ${JSON.stringify(query)}`);

      if (!fs.existsSync(this.csvFilePath)) {
        console.log('CSV file not found, returning empty results');
        return { videos: [], total: 0, page, totalPages: 0, hasMore: false };
      }

      // Read and parse CSV file
      const csvContent = fs.readFileSync(this.csvFilePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim().length > 0);

      console.log(`Processing ${lines.length} lines from CSV`);

      const allVideos: VideoMetadata[] = [];

      // Process lines in batches for memory efficiency
      const batchSize = 10000;
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);

        for (const line of batch) {
          const video = this.parseCSVLine(line);
          if (video) {
            allVideos.push(video);
          }
        }

        // Progress logging
        if ((i / batchSize) % 10 === 0) {
          console.log(`Processed ${Math.min(i + batchSize, lines.length)}/${lines.length} lines`);
        }
      }

      console.log(`Parsed ${allVideos.length} videos from CSV`);

      // Apply filters
      let filteredVideos = allVideos.filter(video => {
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch =
            video.title.toLowerCase().includes(searchLower) ||
            video.performers.some(p => p.toLowerCase().includes(searchLower)) ||
            video.categories.some(c => c.toLowerCase().includes(searchLower)) ||
            video.tags.some(t => t.toLowerCase().includes(searchLower));

          if (!matchesSearch) return false;
        }

        // Category filter
        if (category && !video.categories.includes(category)) {
          return false;
        }

        // Source filter
        if (source && video.source !== source) {
          return false;
        }

        // Performer filter
        if (performer && !video.performers.includes(performer)) {
          return false;
        }

        // Duration filters
        if (minDuration && video.duration < minDuration) return false;
        if (maxDuration && video.duration > maxDuration) return false;

        // Views filter
        if (minViews && video.viewCount < minViews) return false;

        // Quality filters
        if (isHD !== undefined && video.isHD !== isHD) return false;
        if (isVR !== undefined && video.isVR !== isVR) return false;

        // Tags filter
        if (tags.length > 0 && !tags.some(tag => video.tags.includes(tag))) {
          return false;
        }

        return true;
      });

      console.log(`Filtered to ${filteredVideos.length} videos`);

      // Apply sorting
      filteredVideos.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'date':
            aValue = a.uploadedDate ? new Date(a.uploadedDate).getTime() : 0;
            bValue = b.uploadedDate ? new Date(b.uploadedDate).getTime() : 0;
            break;
          case 'views':
            aValue = a.viewCount;
            bValue = b.viewCount;
            break;
          case 'duration':
            aValue = a.duration;
            bValue = b.duration;
            break;
          case 'rating':
            aValue = a.rating || 0;
            bValue = b.rating || 0;
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          default:
            aValue = a.viewCount;
            bValue = b.viewCount;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Cache results
      this.cache.set(cacheKey, filteredVideos);

      return this.paginateResults(filteredVideos, page, limit);

    } catch (error) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'video-database-service',
        action: 'queryVideos',
        metadata: { query, csvFilePath: this.csvFilePath }
      });

      throw new Error(`Failed to query videos: ${error}`);
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<VideoDatabaseStats> {
    if (this.statsCache) {
      return this.statsCache;
    }

    try {
      console.log('Calculating database statistics...');

      if (!fs.existsSync(this.csvFilePath)) {
        throw new Error('CSV file not found');
      }

      const csvContent = fs.readFileSync(this.csvFilePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim().length > 0);

      const stats: VideoDatabaseStats = {
        totalVideos: 0,
        totalSize: fs.statSync(this.csvFilePath).size,
        sources: [],
        categories: [],
        performers: [],
        dateRange: { earliest: '', latest: '' },
        averageDuration: 0,
        totalViews: 0
      };

      const sourceSet = new Set<string>();
      const categorySet = new Set<string>();
      const performerSet = new Set<string>();
      const dates: string[] = [];
      let totalDuration = 0;
      let totalViews = 0;

      // Sample-based statistics for large files
      const sampleSize = Math.min(50000, lines.length);
      const step = Math.floor(lines.length / sampleSize);

      for (let i = 0; i < lines.length; i += step) {
        const video = this.parseCSVLine(lines[i]);
        if (!video) continue;

        stats.totalVideos++;
        totalDuration += video.duration;
        totalViews += video.viewCount;

        sourceSet.add(video.source);
        video.categories.forEach(cat => categorySet.add(cat));
        video.performers.forEach(perf => performerSet.add(perf));

        if (video.uploadedDate) {
          dates.push(video.uploadedDate);
        }
      }

      stats.sources = Array.from(sourceSet).sort();
      stats.categories = Array.from(categorySet).sort();
      stats.performers = Array.from(performerSet).sort();
      stats.averageDuration = totalDuration / stats.totalVideos;

      if (dates.length > 0) {
        dates.sort();
        stats.dateRange = {
          earliest: dates[0],
          latest: dates[dates.length - 1]
        };
      }

      this.statsCache = stats;
      console.log(`Database stats calculated: ${stats.totalVideos} videos, ${stats.sources.length} sources`);

      return stats;

    } catch (error) {
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'video-database-service',
        action: 'getDatabaseStats',
        metadata: { csvFilePath: this.csvFilePath }
      });

      throw new Error(`Failed to get database stats: ${error}`);
    }
  }

  /**
   * Get available filter options
   */
  async getFilterOptions() {
    const stats = await this.getDatabaseStats();

    return {
      sources: stats.sources,
      categories: stats.categories,
      performers: stats.performers.slice(0, 100), // Limit for UI
      dateRange: stats.dateRange
    };
  }

  // Helper methods
  private extractSource(tags: string[]): string {
    const sourceTags = tags.filter(tag =>
      tag.includes('.com') ||
      ['brazzers', 'realitykings', 'bangbros', 'naughtyamerica', 'pornpros'].includes(tag.toLowerCase())
    );

    return sourceTags.length > 0 ? sourceTags[0] : 'Unknown';
  }

  private extractVideoId(embedUrl: string): string {
    const match = embedUrl.match(/embed\/([a-f0-9]+)/);
    return match ? match[1] : '';
  }

  private extractUploadDate(thumbnailUrl: string): string | undefined {
    const match = thumbnailUrl.match(/\/videos\/(\d{4})(\d{2})(\d{2})\//);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return undefined;
  }

  private calculateRating(likes: number, dislikes: number): number {
    const total = likes + dislikes;
    if (total === 0) return 0;
    return (likes / total) * 100;
  }

  private detectHDQuality(tags: string[], categories: string[]): boolean {
    return tags.some(tag =>
      tag.toLowerCase().includes('hd') ||
      tag.toLowerCase().includes('1080p') ||
      tag.toLowerCase().includes('720p')
    ) || categories.some(cat => cat.toLowerCase().includes('hd'));
  }

  private detectVRContent(tags: string[], title: string): boolean {
    return tags.some(tag =>
      tag.toLowerCase().includes('vr') ||
      tag.toLowerCase().includes('virtual reality')
    ) || title.toLowerCase().includes('vr');
  }

  private paginateResults(videos: VideoMetadata[], page: number, limit: number) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVideos = videos.slice(startIndex, endIndex);

    return {
      videos: paginatedVideos,
      total: videos.length,
      page,
      totalPages: Math.ceil(videos.length / limit),
      hasMore: endIndex < videos.length
    };
  }
}

// Export singleton instance
export const videoDatabaseService = new VideoDatabaseService();