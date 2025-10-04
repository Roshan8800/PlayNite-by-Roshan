import { storageService } from './storage-service';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';
import Debug from 'debug';
const debug = Debug('playnite:video-management-service');

export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  duration: number; // seconds
  resolution: {
    width: number;
    height: number;
  };
  aspectRatio: number;
  frameRate: number;
  bitrate: number; // bps
  fileSize: number; // bytes
  format: string;
  codec: string;
  audioCodec?: string;
  audioBitrate?: number;
  thumbnailUrl: string;
  previewUrl?: string;
  tags: string[];
  category: string;
  uploadDate: string;
  lastModified: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  qualityVariants: VideoQualityVariant[];
  analytics: VideoAnalytics;
}

export interface VideoQualityVariant {
  id: string;
  label: string;
  width: number;
  height: number;
  bitrate: number;
  fileSize: number;
  url: string;
  format: string;
}

export interface VideoAnalytics {
  views: number;
  uniqueViews: number;
  averageWatchTime: number; // seconds
  completionRate: number; // percentage
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  dropOffPoints: { time: number; percentage: number }[];
  geographicDistribution: { [country: string]: number };
  deviceDistribution: { [device: string]: number };
  qualityDistribution: { [quality: string]: number };
  bandwidthDistribution: { [range: string]: number };
}

export interface TranscodingJob {
  id: string;
  videoId: string;
  sourceUrl: string;
  targetFormat: string;
  targetQuality: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface VideoProcessingOptions {
  generateThumbnails?: boolean;
  generatePreview?: boolean;
  extractMetadata?: boolean;
  transcodeQualities?: string[];
  optimizeForStreaming?: boolean;
  addWatermark?: boolean;
  compressAudio?: boolean;
}

export class VideoManagementService {
  private metadataCache = new Map<string, VideoMetadata>();
  private transcodingJobs = new Map<string, TranscodingJob>();
  private processingQueue: string[] = [];
  private isProcessing = false;

  /**
    * Extract comprehensive video metadata
    */
  async extractVideoMetadata(
    videoFile: File | string,
    options: VideoProcessingOptions = {}
  ): Promise<VideoMetadata> {
    const startTime = performance.now();
    const videoId = typeof videoFile === 'string'
      ? this.extractVideoId(videoFile)
      : `temp-${Date.now()}`;

    debug('extractVideoMetadata called:', {
      videoId,
      isFile: typeof videoFile !== 'string',
      fileSize: typeof videoFile === 'object' ? videoFile.size : 'N/A',
      options: Object.keys(options).filter(key => options[key as keyof VideoProcessingOptions])
    });

    logInfo('Video metadata extraction started', {
      component: 'video-management-service',
      operation: 'extractVideoMetadata',
      metadata: {
        videoId,
        isFile: typeof videoFile !== 'string',
        fileSize: typeof videoFile === 'object' ? videoFile.size : 'N/A',
        options: {
          generateThumbnails: options.generateThumbnails,
          generatePreview: options.generatePreview,
          extractMetadata: options.extractMetadata,
          transcodeQualities: options.transcodeQualities?.length || 0,
          optimizeForStreaming: options.optimizeForStreaming,
          addWatermark: options.addWatermark,
          compressAudio: options.compressAudio
        },
        cacheSize: this.metadataCache.size
      }
    });

    // Check cache first
    const cached = this.metadataCache.get(videoId);
    if (cached && !options.extractMetadata) {
      debug('Returning cached metadata');

      logInfo('Video metadata returned from cache', {
        component: 'video-management-service',
        operation: 'extractVideoMetadata',
        metadata: {
          videoId,
          duration: performance.now() - startTime,
          cacheHit: true
        }
      });

      return cached;
    }

    try {
      debug('Performing metadata extraction');
      const metadata = await this.performMetadataExtraction(videoFile);

      debug('Metadata extracted, processing additional options');

      // Generate thumbnail if requested
      if (options.generateThumbnails && typeof videoFile !== 'string') {
        debug('Generating thumbnail');
        metadata.thumbnailUrl = await this.generateThumbnail(videoFile, metadata);
      }

      // Generate preview if requested
      if (options.generatePreview && typeof videoFile !== 'string') {
        debug('Generating preview');
        metadata.previewUrl = await this.generatePreview(videoFile, metadata);
      }

      // Generate quality variants if requested
      if (options.transcodeQualities && options.transcodeQualities.length > 0 && typeof videoFile !== 'string') {
        debug('Generating quality variants');
        metadata.qualityVariants = await this.generateQualityVariants(
          videoFile,
          metadata,
          options.transcodeQualities
        );
      }

      // Initialize analytics
      metadata.analytics = this.initializeAnalytics();

      // Cache the metadata
      this.metadataCache.set(videoId, metadata);

      const duration = performance.now() - startTime;
      logInfo('Video metadata extraction completed successfully', {
        component: 'video-management-service',
        operation: 'extractVideoMetadata',
        metadata: {
          videoId,
          duration,
          resolution: `${metadata.resolution.width}x${metadata.resolution.height}`,
          fileSize: metadata.fileSize,
          format: metadata.format,
          hasThumbnail: !!metadata.thumbnailUrl,
          hasPreview: !!metadata.previewUrl,
          qualityVariantsCount: metadata.qualityVariants.length,
          cacheSize: this.metadataCache.size
        }
      });

      debug('Metadata extraction completed:', {
        videoId,
        duration,
        qualityVariantsCount: metadata.qualityVariants.length
      });

      return metadata;

    } catch (error) {
      const duration = performance.now() - startTime;
      logError(error, {
        category: ErrorCategory.FILE_SYSTEM,
        severity: ErrorSeverity.HIGH,
        component: 'video-management-service',
        action: 'extractVideoMetadata',
        metadata: {
          videoId,
          isFile: typeof videoFile !== 'string',
          fileSize: typeof videoFile === 'object' ? videoFile.size : 'N/A',
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      debug('Metadata extraction failed:', error instanceof Error ? error.message : error);
      throw new Error(`Failed to extract video metadata: ${error}`);
    }
  }

  /**
    * Transcode video to different formats and qualities
    */
  async transcodeVideo(
    videoId: string,
    sourceUrl: string,
    targetFormat: string,
    targetQuality: string,
    options: VideoProcessingOptions = {}
  ): Promise<TranscodingJob> {
    const startTime = performance.now();
    const jobId = `transcode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    debug('transcodeVideo called:', {
      videoId,
      sourceUrl: sourceUrl.substring(0, 50) + '...',
      targetFormat,
      targetQuality,
      jobId,
      queueLength: this.processingQueue.length
    });

    logInfo('Video transcoding job created', {
      component: 'video-management-service',
      operation: 'transcodeVideo',
      metadata: {
        videoId,
        jobId,
        sourceUrl: sourceUrl.substring(0, 50) + '...',
        targetFormat,
        targetQuality,
        queueLength: this.processingQueue.length,
        isProcessing: this.isProcessing,
        options: Object.keys(options).filter(key => options[key as keyof VideoProcessingOptions])
      }
    });

    const job: TranscodingJob = {
      id: jobId,
      videoId,
      sourceUrl,
      targetFormat,
      targetQuality,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString()
    };

    this.transcodingJobs.set(jobId, job);
    this.processingQueue.push(jobId);

    debug('Job added to queue:', {
      jobId,
      queueLength: this.processingQueue.length
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      debug('Starting queue processing');
      this.processQueue();
    }

    const duration = performance.now() - startTime;
    logInfo('Video transcoding job queued successfully', {
      component: 'video-management-service',
      operation: 'transcodeVideo',
      metadata: {
        videoId,
        jobId,
        targetFormat,
        targetQuality,
        duration,
        queuePosition: this.processingQueue.length
      }
    });

    debug('Transcoding job created and queued:', { jobId, duration });
    return job;
  }

  /**
   * Get video metadata by ID
   */
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    return this.metadataCache.get(videoId) || null;
  }

  /**
   * Update video metadata
   */
  async updateVideoMetadata(
    videoId: string,
    updates: Partial<VideoMetadata>
  ): Promise<VideoMetadata | null> {
    const existing = this.metadataCache.get(videoId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      lastModified: new Date().toISOString()
    };

    this.metadataCache.set(videoId, updated);
    return updated;
  }

  /**
   * Delete video and all associated files
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const metadata = this.metadataCache.get(videoId);
      if (!metadata) return false;

      // Delete all quality variants
      for (const variant of metadata.qualityVariants) {
        if (variant.url.startsWith('firebase:')) {
          await storageService.deleteFile(variant.url.replace('firebase:', ''));
        }
      }

      // Delete thumbnail and preview
      if (metadata.thumbnailUrl.startsWith('firebase:')) {
        await storageService.deleteFile(metadata.thumbnailUrl.replace('firebase:', ''));
      }
      if (metadata.previewUrl?.startsWith('firebase:')) {
        await storageService.deleteFile(metadata.previewUrl.replace('firebase:', ''));
      }

      // Remove from cache
      this.metadataCache.delete(videoId);

      return true;
    } catch (error) {
      console.error('Failed to delete video:', error);
      return false;
    }
  }

  /**
   * Get storage optimization suggestions
   */
  async getStorageOptimization(videoId: string): Promise<{
    canOptimize: boolean;
    currentSize: number;
    potentialSavings: number;
    recommendations: string[];
  }> {
    const metadata = this.metadataCache.get(videoId);
    if (!metadata) {
      throw new Error('Video not found');
    }

    const recommendations: string[] = [];
    let potentialSavings = 0;

    // Check for duplicate variants
    const uniqueVariants = new Map<string, VideoQualityVariant>();
    for (const variant of metadata.qualityVariants) {
      const key = `${variant.width}x${variant.height}`;
      if (uniqueVariants.has(key)) {
        potentialSavings += variant.fileSize;
        recommendations.push(`Remove duplicate ${variant.label} variant`);
      } else {
        uniqueVariants.set(key, variant);
      }
    }

    // Check for oversized files
    const maxRecommendedSize = 500 * 1024 * 1024; // 500MB
    if (metadata.fileSize > maxRecommendedSize) {
      const savings = metadata.fileSize - maxRecommendedSize;
      potentialSavings += savings;
      recommendations.push('Compress video file to reduce size');
    }

    // Check for old unused variants
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const variant of metadata.qualityVariants) {
      // Mock logic - in real implementation, check actual usage
      if (Math.random() > 0.8) {
        potentialSavings += variant.fileSize * 0.5;
        recommendations.push(`Archive unused ${variant.label} variant`);
      }
    }

    return {
      canOptimize: recommendations.length > 0,
      currentSize: metadata.fileSize,
      potentialSavings,
      recommendations
    };
  }

  /**
   * Clean up unused video files
   */
  async cleanupUnusedFiles(): Promise<{
    deletedFiles: number;
    freedSpace: number;
  }> {
    let deletedFiles = 0;
    let freedSpace = 0;

    // Mock cleanup logic - in real implementation, check for orphaned files
    for (const [videoId, metadata] of this.metadataCache.entries()) {
      const optimization = await this.getStorageOptimization(videoId);

      if (optimization.canOptimize) {
        // Delete some files based on recommendations
        for (const variant of metadata.qualityVariants) {
          if (Math.random() > 0.7) { // Mock deletion logic
            freedSpace += variant.fileSize;
            deletedFiles++;
          }
        }
      }
    }

    return { deletedFiles, freedSpace };
  }

  /**
   * Get video analytics
   */
  async getVideoAnalytics(videoId: string): Promise<VideoAnalytics | null> {
    const metadata = this.metadataCache.get(videoId);
    return metadata?.analytics || null;
  }

  /**
   * Update video analytics
   */
  async updateVideoAnalytics(
    videoId: string,
    event: 'view' | 'like' | 'comment' | 'share' | 'save',
    data?: any
  ): Promise<void> {
    const metadata = this.metadataCache.get(videoId);
    if (!metadata) return;

    const analytics = metadata.analytics;

    switch (event) {
      case 'view':
        analytics.views++;
        if (data?.unique) {
          analytics.uniqueViews++;
        }
        if (data?.watchTime) {
          analytics.averageWatchTime =
            (analytics.averageWatchTime * (analytics.views - 1) + data.watchTime) / analytics.views;
        }
        break;

      case 'like':
        analytics.likes++;
        break;

      case 'comment':
        analytics.comments++;
        break;

      case 'share':
        analytics.shares++;
        break;

      case 'save':
        analytics.saves++;
        break;
    }

    // Update completion rate if watch time data is available
    if (data?.watchTime && data?.duration) {
      const completionRate = (data.watchTime / data.duration) * 100;
      analytics.completionRate =
        (analytics.completionRate * (analytics.views - 1) + completionRate) / analytics.views;
    }

    metadata.lastModified = new Date().toISOString();
  }

  /**
   * Perform actual metadata extraction
   */
  private async performMetadataExtraction(videoFile: File | string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = typeof videoFile === 'string' ? videoFile : URL.createObjectURL(videoFile);

      video.addEventListener('loadedmetadata', () => {
        const metadata: VideoMetadata = {
          id: typeof videoFile === 'string' ? this.extractVideoId(videoFile) : `temp-${Date.now()}`,
          title: typeof videoFile === 'object' ? videoFile.name : 'Unknown Video',
          duration: video.duration,
          resolution: {
            width: video.videoWidth,
            height: video.videoHeight
          },
          aspectRatio: video.videoWidth / video.videoHeight,
          frameRate: 30, // Would need to extract from video stream
          bitrate: 2000000, // Would need to extract from video stream
          fileSize: typeof videoFile === 'object' ? videoFile.size : 0,
          format: typeof videoFile === 'object' ? videoFile.type : 'unknown',
          codec: 'h264', // Would need to extract from video stream
          thumbnailUrl: '',
          tags: [],
          category: 'general',
          uploadDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          processingStatus: 'completed',
          qualityVariants: [],
          analytics: this.initializeAnalytics()
        };

        URL.revokeObjectURL(url);
        resolve(metadata);
      });

      video.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video for metadata extraction'));
      });

      video.src = url;
    });
  }

  /**
   * Generate thumbnail from video
   */
  private async generateThumbnail(videoFile: File, metadata: VideoMetadata): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const url = URL.createObjectURL(videoFile);

      video.addEventListener('loadeddata', () => {
        // Seek to 10% of duration for thumbnail
        const thumbnailTime = Math.min(1, video.duration * 0.1);
        video.currentTime = thumbnailTime;
      });

      video.addEventListener('seeked', () => {
        canvas.width = 320;
        canvas.height = 240;
        ctx.drawImage(video, 0, 0, 320, 240);

        canvas.toBlob((blob) => {
          const thumbnailUrl = URL.createObjectURL(blob!);
          URL.revokeObjectURL(url);
          resolve(thumbnailUrl);
        }, 'image/jpeg', 0.8);
      });

      video.src = url;
    });
  }

  /**
   * Generate preview video clip
   */
  private async generatePreview(videoFile: File, metadata: VideoMetadata): Promise<string> {
    // Mock preview generation - in real implementation, would create a short clip
    return this.generateThumbnail(videoFile, metadata);
  }

  /**
   * Generate quality variants
   */
  private async generateQualityVariants(
    videoFile: File,
    metadata: VideoMetadata,
    qualities: string[]
  ): Promise<VideoQualityVariant[]> {
    const variants: VideoQualityVariant[] = [];

    for (const quality of qualities) {
      const variant = await this.transcodeToQuality(videoFile, metadata, quality);
      if (variant) {
        variants.push(variant);
      }
    }

    return variants;
  }

  /**
   * Transcode to specific quality
   */
  private async transcodeToQuality(
    videoFile: File,
    metadata: VideoMetadata,
    quality: string
  ): Promise<VideoQualityVariant | null> {
    // Mock transcoding - in real implementation, would use FFmpeg.wasm or server-side transcoding

    const qualitySpecs = {
      '240p': { width: 426, height: 240, bitrate: 400000 },
      '480p': { width: 854, height: 480, bitrate: 800000 },
      '720p': { width: 1280, height: 720, bitrate: 1500000 },
      '1080p': { width: 1920, height: 1080, bitrate: 3000000 }
    };

    const specs = qualitySpecs[quality as keyof typeof qualitySpecs];
    if (!specs) return null;

    // Mock transcoded file
    const mockUrl = URL.createObjectURL(videoFile);

    return {
      id: quality,
      label: `${quality} HD`,
      width: specs.width,
      height: specs.height,
      bitrate: specs.bitrate,
      fileSize: Math.floor(videoFile.size * (specs.bitrate / metadata.bitrate)),
      url: mockUrl,
      format: 'mp4'
    };
  }

  /**
   * Process the transcoding queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const jobId = this.processingQueue.shift()!;
      const job = this.transcodingJobs.get(jobId);

      if (!job || job.status === 'completed' || job.status === 'failed') {
        continue;
      }

      job.status = 'processing';

      try {
        // Mock transcoding process
        await this.performTranscoding(job);

        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date().toISOString();

      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Transcoding failed';
      }
    }

    this.isProcessing = false;
  }

  /**
   * Perform actual transcoding (mock implementation)
   */
  private async performTranscoding(job: TranscodingJob): Promise<void> {
    // Mock progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      job.progress = progress;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Initialize analytics object
   */
  private initializeAnalytics(): VideoAnalytics {
    return {
      views: 0,
      uniqueViews: 0,
      averageWatchTime: 0,
      completionRate: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      dropOffPoints: [],
      geographicDistribution: {},
      deviceDistribution: {},
      qualityDistribution: {},
      bandwidthDistribution: {}
    };
  }

  /**
   * Extract video ID from URL or path
   */
  private extractVideoId(input: string): string {
    const patterns = [
      /\/videos\/([^\/]+)\//,
      /\/([^\/]+\.mp4)/,
      /id=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].replace('.mp4', '');
      }
    }

    return `video-${Date.now()}`;
  }

  /**
   * Get all videos with optional filtering
   */
  getAllVideos(filter?: {
    category?: string;
    processingStatus?: VideoMetadata['processingStatus'];
    minDuration?: number;
    maxDuration?: number;
  }): VideoMetadata[] {
    let videos = Array.from(this.metadataCache.values());

    if (filter) {
      videos = videos.filter(video => {
        if (filter.category && video.category !== filter.category) return false;
        if (filter.processingStatus && video.processingStatus !== filter.processingStatus) return false;
        if (filter.minDuration && video.duration < filter.minDuration) return false;
        if (filter.maxDuration && video.duration > filter.maxDuration) return false;
        return true;
      });
    }

    return videos.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  /**
   * Get transcoding job status
   */
  getTranscodingJob(jobId: string): TranscodingJob | null {
    return this.transcodingJobs.get(jobId) || null;
  }

  /**
   * Get all transcoding jobs
   */
  getAllTranscodingJobs(): TranscodingJob[] {
    return Array.from(this.transcodingJobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Clear all caches and queues
   */
  clearAll(): void {
    this.metadataCache.clear();
    this.transcodingJobs.clear();
    this.processingQueue = [];
    this.isProcessing = false;
  }
}

// Export singleton instance
export const videoManagementService = new VideoManagementService();