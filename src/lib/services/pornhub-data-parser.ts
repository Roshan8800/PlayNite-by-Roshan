// TypeScript interfaces for Pornhub video metadata structure
export interface PornhubVideoMetadata {
  // Core video information
  embedUrl: string;
  title: string;
  duration: number; // in seconds
  viewCount: number;
  likes: number;
  dislikes: number;

  // Visual assets
  primaryThumbnail: string;
  thumbnailSequence: string[];
  secondaryThumbnail?: string;
  secondaryThumbnailSequence?: string[];

  // Content classification
  tags: string[]; // Technical/content tags like 'brazzers.com', 'big-tits', etc.
  categories: string[]; // Content categories like 'Big Tits', 'Blowjob', etc.
  performers: string[];

  // Source information
  source: string; // Production company/source (extracted from tags)

  // Metadata
  uploadedDate?: string; // Extracted from thumbnail URL if available
  videoId?: string; // Extracted from embed URL
}

export interface PlayNiteContentStructure {
  videos: PornhubVideoMetadata[];
  metadata: {
    totalCount: number;
    sources: string[];
    categories: string[];
    performers: string[];
    processedAt: string;
    dataVersion: string;
  };
}

// Parser configuration
export interface ParserConfig {
  batchSize?: number;
  maxRecords?: number;
  includeSecondaryThumbnails?: boolean;
}

// Utility function to extract video ID from embed URL
function extractVideoId(embedUrl: string): string {
  const match = embedUrl.match(/embed\/([a-f0-9]+)/);
  return match ? match[1] : '';
}

// Utility function to extract date from thumbnail URL
function extractUploadDate(thumbnailUrl: string): string | undefined {
  const match = thumbnailUrl.match(/\/videos\/(\d{4})(\d{2})(\d{2})\//);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return undefined;
}

// Utility function to extract source from tags
function extractSource(tags: string[]): string {
  // Common production companies/sources
  const sourceTags = tags.filter(tag =>
    tag.includes('.com') ||
    tag === 'brazzers' ||
    tag === 'realitykings' ||
    tag === 'bangbros' ||
    tag === 'naughtyamerica' ||
    tag === 'pornpros'
  );

  return sourceTags.length > 0 ? sourceTags[0] : 'Unknown';
}

// Main parser class for handling large CSV files efficiently
export class PornhubDataParser {
  private config: Required<ParserConfig>;

  constructor(config: ParserConfig = {}) {
    this.config = {
      batchSize: 1000,
      maxRecords: Infinity,
      includeSecondaryThumbnails: true,
      ...config
    };
  }

  /**
   * Parse a single CSV line into structured data
   */
  parseLine(line: string): PornhubVideoMetadata | null {
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
        secondaryThumbnailSequenceStr
      ] = fields;

      // Parse thumbnail sequences
      const thumbnailSequence = thumbnailSequenceStr
        .split(';')
        .filter(url => url.trim().length > 0);

      const secondaryThumbnailSequence = this.config.includeSecondaryThumbnails && secondaryThumbnailSequenceStr
        ? secondaryThumbnailSequenceStr.split(';').filter(url => url.trim().length > 0)
        : undefined;

      // Parse metadata
      const tags = tagsStr.split(';').filter(tag => tag.trim().length > 0);
      const categories = categoriesStr.split(';').filter(cat => cat.trim().length > 0);
      const performers = performersStr.split(';').filter(perf => perf.trim().length > 0);

      return {
        embedUrl: embedUrl.trim(),
        title: title.trim(),
        duration: parseInt(durationStr, 10) || 0,
        viewCount: parseInt(viewCountStr, 10) || 0,
        likes: parseInt(likesStr, 10) || 0,
        dislikes: parseInt(dislikesStr, 10) || 0,
        primaryThumbnail: primaryThumbnail.trim(),
        thumbnailSequence,
        secondaryThumbnail: this.config.includeSecondaryThumbnails ? secondaryThumbnail?.trim() : undefined,
        secondaryThumbnailSequence,
        tags,
        categories,
        performers,
        source: extractSource(tags),
        uploadedDate: extractUploadDate(primaryThumbnail),
        videoId: extractVideoId(embedUrl)
      };
    } catch (error) {
      console.error('Error parsing line:', error);
      return null;
    }
  }

  /**
   * Process CSV data in batches for memory efficiency
   */
  async *parseCSVInBatches(csvContent: string): AsyncGenerator<PornhubVideoMetadata[], void, unknown> {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    const batchSize = this.config.batchSize;

    for (let i = 0; i < Math.min(lines.length, this.config.maxRecords); i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      const parsedBatch: PornhubVideoMetadata[] = [];

      for (const line of batch) {
        const parsed = this.parseLine(line);
        if (parsed) {
          parsedBatch.push(parsed);
        }
      }

      if (parsedBatch.length > 0) {
        yield parsedBatch;
      }
    }
  }

  /**
   * Transform parsed data into PlayNite-optimized structure
   */
  transformForPlayNite(videos: PornhubVideoMetadata[]): PlayNiteContentStructure {
    const sources = [...new Set(videos.map(v => v.source))].sort();
    const categories = [...new Set(videos.flatMap(v => v.categories))].sort();
    const performers = [...new Set(videos.flatMap(v => v.performers))].sort();

    return {
      videos,
      metadata: {
        totalCount: videos.length,
        sources,
        categories,
        performers,
        processedAt: new Date().toISOString(),
        dataVersion: '1.0.0'
      }
    };
  }

  /**
   * Validate parsed video data
   */
  validateVideo(video: PornhubVideoMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!video.embedUrl) errors.push('Missing embed URL');
    if (!video.title) errors.push('Missing title');
    if (!video.primaryThumbnail) errors.push('Missing primary thumbnail');
    if (video.duration <= 0) errors.push('Invalid duration');
    if (video.thumbnailSequence.length === 0) errors.push('Missing thumbnail sequence');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Utility function to create sample data for testing
export function createSampleData(): PornhubVideoMetadata[] {
  return [
    {
      embedUrl: '<iframe src="https://www.pornhub.com/embed/c3dbc9a5d726288d8a4b" frameborder="0" height="481" width="608" scrolling="no"></iframe>',
      title: 'Gen Padova - Cum Bot Brunette Petite Girl Orgasms',
      duration: 185,
      viewCount: 2339242,
      likes: 2986,
      dislikes: 415,
      primaryThumbnail: 'https://ei.phncdn.com/videos/200712/10/65404/original/(m=eaf8GgaaaWavb)(mh=VLBsRAsYYSS6491_)5.jpg',
      thumbnailSequence: [
        'https://ei.phncdn.com/videos/200712/10/65404/original/(m=eaf8GgaaaWavb)(mh=VLBsRAsYYSS6491_)1.jpg',
        'https://ei.phncdn.com/videos/200712/10/65404/original/(m=eaf8GgaaaWavb)(mh=VLBsRAsYYSS6491_)2.jpg',
        'https://ei.phncdn.com/videos/200712/10/65404/original/(m=eaf8GgaaaWavb)(mh=VLBsRAsYYSS6491_)3.jpg',
        'https://ei.phncdn.com/videos/200712/10/65404/original/(m=eaf8GgaaaWavb)(mh=VLBsRAsYYSS6491_)4.jpg',
        'https://ei.phncdn.com/videos/200712/10/65404/original/(m=eaf8GgaaaWavb)(mh=VLBsRAsYYSS6491_)5.jpg'
      ],
      tags: ['cumbots.com', 'machine', 'toys', 'brunette', 'teen', 'orgasm', 'natural-tits'],
      categories: ['Brunette', 'Toys', 'Pornstar', '18-25', 'Exclusive', 'Verified Models', 'Solo Female'],
      performers: ['Gen Padova'],
      source: 'cumbots.com',
      uploadedDate: '2007-12-10',
      videoId: 'c3dbc9a5d726288d8a4b'
    },
    {
      embedUrl: '<iframe src="https://www.pornhub.com/embed/f943adac0381c880e0ad" frameborder="0" height="481" width="608" scrolling="no"></iframe>',
      title: 'Czech whore sucks a dick off and gets titfucked!',
      duration: 1198,
      viewCount: 2426283,
      likes: 928,
      dislikes: 310,
      primaryThumbnail: 'https://ei.phncdn.com/videos/200802/09/76478/original/(m=eaf8GgaaaWavb)(mh=A_rM8VjTRqhkzV12)5.jpg',
      thumbnailSequence: [
        'https://ei.phncdn.com/videos/200802/09/76478/original/(m=eaf8GgaaaWavb)(mh=A_rM8VjTRqhkzV12)1.jpg',
        'https://ei.phncdn.com/videos/200802/09/76478/original/(m=eaf8GgaaaWavb)(mh=A_rM8VjTRqhkzV12)2.jpg',
        'https://ei.phncdn.com/videos/200802/09/76478/original/(m=eaf8GgaaaWavb)(mh=A_rM8VjTRqhkzV12)3.jpg',
        'https://ei.phncdn.com/videos/200802/09/76478/original/(m=eaf8GgaaaWavb)(mh=A_rM8VjTRqhkzV12)4.jpg',
        'https://ei.phncdn.com/videos/200802/09/76478/original/(m=eaf8GgaaaWavb)(mh=A_rM8VjTRqhkzV12)5.jpg'
      ],
      tags: ['brazzers.com', 'big-tits', 'tittyfuck', 'pov', 'blowjob', 'handjob', 'cumshot', 'milf', 'czech'],
      categories: ['Big Tits', 'Blowjob', 'MILF', 'Pornstar', 'POV'],
      performers: ['Mandy May'],
      source: 'brazzers.com',
      uploadedDate: '2008-02-09',
      videoId: 'f943adac0381c880e0ad'
    }
  ];
}