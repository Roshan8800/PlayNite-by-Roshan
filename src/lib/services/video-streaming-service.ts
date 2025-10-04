import { storageService } from './storage-service';
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';
import Debug from 'debug';
const debug = Debug('playnite:video-streaming-service');

export interface StreamQuality {
  id: string;
  label: string;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  codec: string;
}

export interface StreamManifest {
  id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnailUrl: string;
  qualities: StreamQuality[];
  hlsUrl?: string;
  dashUrl?: string;
  cdnUrl?: string;
  metadata: {
    width: number;
    height: number;
    aspectRatio: number;
    frameRate: number;
    bitrate: number;
    codec: string;
    fileSize: number;
    duration?: number;
  };
}

export interface BandwidthInfo {
  downloadSpeed: number; // Mbps
  latency: number; // ms
  quality: 'slow' | 'medium' | 'fast';
  recommendedQuality: string;
}

export interface StreamingConfig {
  enableHLS: boolean;
  enableDASH: boolean;
  cdnProvider?: 'cloudflare' | 'aws' | 'gcp' | 'azure';
  adaptiveBitrate: boolean;
  preloadStrategy: 'none' | 'metadata' | 'auto';
  maxConcurrentStreams: number;
  bufferSize: number; // seconds
}

export class VideoStreamingService {
  private config: StreamingConfig;
  private bandwidthHistory: BandwidthInfo[] = [];
  private currentBandwidth: BandwidthInfo | null = null;
  private streamCache = new Map<string, StreamManifest>();
  private qualityCache = new Map<string, string>();

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      enableHLS: true,
      enableDASH: true,
      adaptiveBitrate: true,
      preloadStrategy: 'metadata',
      maxConcurrentStreams: 3,
      bufferSize: 30,
      ...config
    };
  }

  /**
    * Generate streaming manifest for a video
    */
  async generateStreamManifest(
    videoId: string,
    videoUrl: string,
    metadata: any
  ): Promise<StreamManifest> {
    const startTime = performance.now();

    debug('generateStreamManifest called:', {
      videoId,
      videoUrl: videoUrl.substring(0, 50) + '...',
      metadataKeys: Object.keys(metadata || {}),
      config: {
        enableHLS: this.config.enableHLS,
        enableDASH: this.config.enableDASH,
        cdnProvider: this.config.cdnProvider
      }
    });

    logInfo('Video stream manifest generation started', {
      component: 'video-streaming-service',
      operation: 'generateStreamManifest',
      metadata: {
        videoId,
        hasVideoUrl: !!videoUrl,
        hasMetadata: !!metadata,
        cacheSize: this.streamCache.size,
        enableHLS: this.config.enableHLS,
        enableDASH: this.config.enableDASH,
        cdnProvider: this.config.cdnProvider
      }
    });

    // Check cache first
    const cached = this.streamCache.get(videoId);
    if (cached) {
      debug('Returning cached manifest');

      logInfo('Video stream manifest returned from cache', {
        component: 'video-streaming-service',
        operation: 'generateStreamManifest',
        metadata: {
          videoId,
          duration: performance.now() - startTime,
          cacheHit: true
        }
      });

      return cached;
    }

    try {
      debug('Extracting video metadata');
      // Extract video metadata
      const videoMetadata = await this.extractVideoMetadata(videoUrl);

      debug('Generating quality variants');
      // Generate quality variants
      const qualities = await this.generateQualityVariants(videoUrl, videoMetadata);

      debug('Generating streaming URLs');
      // Generate streaming URLs
      const hlsUrl = this.config.enableHLS ? await this.generateHLSManifest(videoId, qualities) : undefined;
      const dashUrl = this.config.enableDASH ? await this.generateDASHManifest(videoId, qualities) : undefined;

      debug('Generating CDN URL');
      // Generate CDN URL if configured
      const cdnUrl = this.config.cdnProvider ? await this.generateCDNUrl(videoUrl) : videoUrl;

      const manifest: StreamManifest = {
        id: videoId,
        title: metadata.title || `Video ${videoId}`,
        description: metadata.description,
        duration: videoMetadata.duration || 0,
        thumbnailUrl: metadata.thumbnailUrl || this.generateThumbnailUrl(videoUrl),
        qualities,
        hlsUrl,
        dashUrl,
        cdnUrl,
        metadata: videoMetadata
      };

      debug('Manifest generated successfully:', {
        qualityCount: qualities.length,
        hasHLS: !!hlsUrl,
        hasDASH: !!dashUrl,
        hasCDN: !!cdnUrl
      });

      // Cache the manifest
      this.streamCache.set(videoId, manifest);

      const duration = performance.now() - startTime;
      logInfo('Video stream manifest generated successfully', {
        component: 'video-streaming-service',
        operation: 'generateStreamManifest',
        metadata: {
          videoId,
          qualityCount: qualities.length,
          hasHLS: !!hlsUrl,
          hasDASH: !!dashUrl,
          hasCDN: !!cdnUrl,
          duration,
          cacheSize: this.streamCache.size
        }
      });

      debug('Stream manifest generation completed:', { duration });
      return manifest;

    } catch (error) {
      const duration = performance.now() - startTime;
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'video-streaming-service',
        action: 'generateStreamManifest',
        metadata: {
          videoId,
          videoUrl: videoUrl.substring(0, 50) + '...',
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      debug('Stream manifest generation failed:', error instanceof Error ? error.message : error);
      throw new Error(`Stream manifest generation failed: ${error}`);
    }
  }

  /**
    * Detect current bandwidth and recommend quality
    */
  async detectBandwidth(): Promise<BandwidthInfo> {
    const startTime = performance.now();
    const testFileUrl = 'https://httpbin.org/bytes/1000000'; // 1MB test file

    debug('detectBandwidth called');

    logInfo('Bandwidth detection started', {
      component: 'video-streaming-service',
      operation: 'detectBandwidth',
      metadata: {
        testFileUrl,
        testFileSize: '1MB',
        historyLength: this.bandwidthHistory.length
      }
    });

    try {
      debug('Starting bandwidth test download');
      const response = await fetch(testFileUrl);
      const endTime = performance.now();

      if (!response.ok) {
        throw new Error(`Bandwidth test failed: ${response.status}`);
      }

      const fileSize = 1000000; // 1MB in bytes
      const duration = (endTime - startTime) / 1000; // seconds
      const downloadSpeed = (fileSize * 8) / (duration * 1000000); // Mbps

      debug('Bandwidth test completed:', {
        downloadSpeed,
        duration,
        responseSize: response.headers.get('content-length')
      });

      const bandwidthInfo: BandwidthInfo = {
        downloadSpeed,
        latency: duration * 1000,
        quality: this.classifyConnectionQuality(downloadSpeed),
        recommendedQuality: this.getRecommendedQuality(downloadSpeed)
      };

      debug('Bandwidth info calculated:', bandwidthInfo);

      // Update history
      this.bandwidthHistory.push(bandwidthInfo);
      if (this.bandwidthHistory.length > 10) {
        this.bandwidthHistory.shift(); // Keep only last 10 measurements
      }

      this.currentBandwidth = bandwidthInfo;

      logInfo('Bandwidth detection completed successfully', {
        component: 'video-streaming-service',
        operation: 'detectBandwidth',
        metadata: {
          downloadSpeed,
          latency: bandwidthInfo.latency,
          quality: bandwidthInfo.quality,
          recommendedQuality: bandwidthInfo.recommendedQuality,
          duration: endTime - startTime,
          historyLength: this.bandwidthHistory.length
        }
      });

      debug('Bandwidth detection completed successfully');
      return bandwidthInfo;

    } catch (error) {
      const duration = performance.now() - startTime;
      logError(error, {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        component: 'video-streaming-service',
        action: 'detectBandwidth',
        metadata: {
          testFileUrl,
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          historyLength: this.bandwidthHistory.length
        }
      });

      debug('Bandwidth detection failed:', error instanceof Error ? error.message : error);

      // Return cached bandwidth or default
      if (this.currentBandwidth) {
        debug('Returning cached bandwidth');
        return this.currentBandwidth;
      }

      const defaultBandwidth: BandwidthInfo = {
        downloadSpeed: 5, // Default 5 Mbps
        latency: 100,
        quality: 'medium',
        recommendedQuality: '720p'
      };

      debug('Returning default bandwidth');
      return defaultBandwidth;
    }
  }

  /**
   * Get optimal streaming URL based on current conditions
   */
  async getOptimalStreamUrl(videoId: string, manifest?: StreamManifest): Promise<string> {
    let streamManifest = manifest;

    if (!streamManifest) {
      streamManifest = await this.generateStreamManifest(videoId, '', {});
    }

    if (!streamManifest) {
      throw new Error('Unable to generate stream manifest');
    }

    // Check if adaptive streaming is enabled
    if (this.config.adaptiveBitrate && (streamManifest.hlsUrl || streamManifest.dashUrl)) {
      // Use HLS or DASH for adaptive streaming
      return streamManifest.hlsUrl || streamManifest.dashUrl || streamManifest.cdnUrl || '';
    }

    // Use CDN URL or original URL
    const bandwidth = await this.detectBandwidth();
    const optimalQuality = this.getOptimalQualityForBandwidth(bandwidth, streamManifest.qualities);

    // Return CDN URL with quality parameter if supported
    if (streamManifest.cdnUrl) {
      return `${streamManifest.cdnUrl}?quality=${optimalQuality.id}`;
    }

    return streamManifest.cdnUrl || '';
  }

  /**
   * Generate HLS manifest for adaptive streaming
   */
  private async generateHLSManifest(videoId: string, qualities: StreamQuality[]): Promise<string> {
    // In a real implementation, this would:
    // 1. Transcode video into multiple quality segments
    // 2. Generate HLS playlist files (.m3u8)
    // 3. Upload segments to CDN
    // 4. Return master playlist URL

    const hlsUrl = `/api/streaming/hls/${videoId}/playlist.m3u8`;

    // For demo purposes, return a mock URL
    return `https://cdn.example.com/videos/${videoId}/playlist.m3u8`;
  }

  /**
   * Generate DASH manifest for adaptive streaming
   */
  private async generateDASHManifest(videoId: string, qualities: StreamQuality[]): Promise<string> {
    // Similar to HLS but for DASH format
    const dashUrl = `/api/streaming/dash/${videoId}/manifest.mpd`;

    // For demo purposes, return a mock URL
    return `https://cdn.example.com/videos/${videoId}/manifest.mpd`;
  }

  /**
   * Generate CDN URL with optimization parameters
   */
  private async generateCDNUrl(originalUrl: string): Promise<string> {
    // In a real implementation, this would integrate with CDN providers
    // like Cloudflare, AWS CloudFront, Google Cloud CDN, etc.

    const cdnBaseUrl = this.getCDNBaseUrl();
    const videoId = this.extractVideoId(originalUrl);

    return `${cdnBaseUrl}/videos/${videoId}/optimized.mp4`;
  }

  /**
   * Extract video metadata
   */
  private async extractVideoMetadata(videoUrl: string): Promise<StreamManifest['metadata']> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';

      video.addEventListener('loadedmetadata', () => {
        const metadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: video.videoWidth / video.videoHeight,
          frameRate: 30, // Default, would need to extract from video
          bitrate: 2000000, // Default 2 Mbps, would need to extract from video
          codec: 'h264', // Default, would need to extract from video
          fileSize: 0 // Would need to get from file or server
        };

        resolve(metadata);
      });

      video.addEventListener('error', () => {
        // Return default metadata on error
        resolve({
          width: 1920,
          height: 1080,
          aspectRatio: 16/9,
          frameRate: 30,
          bitrate: 2000000,
          codec: 'h264',
          fileSize: 0
        });
      });

      video.src = videoUrl;
    });
  }

  /**
   * Generate quality variants for adaptive streaming
   */
  private async generateQualityVariants(
    videoUrl: string,
    metadata: StreamManifest['metadata']
  ): Promise<StreamQuality[]> {
    const baseBitrate = metadata.bitrate || 2000000;

    return [
      {
        id: '240p',
        label: '240p',
        width: 426,
        height: 240,
        bitrate: Math.floor(baseBitrate * 0.3),
        fps: 24,
        codec: 'h264'
      },
      {
        id: '480p',
        label: '480p SD',
        width: 854,
        height: 480,
        bitrate: Math.floor(baseBitrate * 0.5),
        fps: 24,
        codec: 'h264'
      },
      {
        id: '720p',
        label: '720p HD',
        width: 1280,
        height: 720,
        bitrate: Math.floor(baseBitrate * 0.8),
        fps: 30,
        codec: 'h264'
      },
      {
        id: '1080p',
        label: '1080p Full HD',
        width: 1920,
        height: 1080,
        bitrate: baseBitrate,
        fps: 30,
        codec: 'h264'
      }
    ];
  }

  /**
   * Classify connection quality based on download speed
   */
  private classifyConnectionQuality(speedMbps: number): 'slow' | 'medium' | 'fast' {
    if (speedMbps < 3) return 'slow';
    if (speedMbps < 10) return 'medium';
    return 'fast';
  }

  /**
   * Get recommended quality based on bandwidth
   */
  private getRecommendedQuality(speedMbps: number): string {
    if (speedMbps < 2) return '240p';
    if (speedMbps < 5) return '480p';
    if (speedMbps < 10) return '720p';
    return '1080p';
  }

  /**
   * Get optimal quality for current bandwidth
   */
  private getOptimalQualityForBandwidth(
    bandwidth: BandwidthInfo,
    qualities: StreamQuality[]
  ): StreamQuality {
    const recommendedId = bandwidth.recommendedQuality;

    return qualities.find(q => q.id === recommendedId) || qualities[qualities.length - 1];
  }

  /**
   * Get CDN base URL based on provider
   */
  private getCDNBaseUrl(): string {
    const cdnUrls = {
      cloudflare: 'https://cdn.cloudflare.com',
      aws: 'https://cdn.aws.example.com',
      gcp: 'https://cdn.gcp.example.com',
      azure: 'https://cdn.azure.example.com'
    };

    return cdnUrls[this.config.cdnProvider || 'cloudflare'];
  }

  /**
   * Extract video ID from URL
   */
  private extractVideoId(url: string): string {
    // Extract video ID from various URL formats
    const patterns = [
      /\/videos\/([^\/]+)\//,
      /\/([^\/]+\.mp4)/,
      /id=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1].replace('.mp4', '');
      }
    }

    return `video-${Date.now()}`;
  }

  /**
   * Generate thumbnail URL
   */
  private generateThumbnailUrl(videoUrl: string): string {
    return storageService.generateThumbnailUrl(videoUrl, 1);
  }

  /**
   * Preload video for better streaming performance
   */
  async preloadVideo(videoUrl: string, quality?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = this.config.preloadStrategy;

      video.addEventListener('canplaythrough', () => {
        resolve();
      });

      video.addEventListener('error', () => {
        reject(new Error('Failed to preload video'));
      });

      // Add quality parameter if specified
      const preloadUrl = quality ? `${videoUrl}?quality=${quality}` : videoUrl;
      video.src = preloadUrl;
    });
  }

  /**
   * Monitor streaming performance
   */
  startPerformanceMonitoring(videoElement: HTMLVideoElement): () => void {
    const metrics = {
      bufferHealth: 0,
      droppedFrames: 0,
      totalFrames: 0,
      bandwidth: 0
    };

    const updateMetrics = () => {
      if (videoElement) {
        metrics.bufferHealth = videoElement.buffered.length > 0 ?
          (videoElement.buffered.end(0) - videoElement.currentTime) : 0;
        metrics.totalFrames++;
      }
    };

    const interval = setInterval(updateMetrics, 1000);

    return () => {
      clearInterval(interval);
      console.log('Streaming metrics:', metrics);
    };
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats(): {
    averageBandwidth: number;
    cacheHitRate: number;
    totalStreams: number;
  } {
    const avgBandwidth = this.bandwidthHistory.length > 0
      ? this.bandwidthHistory.reduce((sum, b) => sum + b.downloadSpeed, 0) / this.bandwidthHistory.length
      : 0;

    const cacheHitRate = this.streamCache.size > 0 ? 0.85 : 0; // Mock cache hit rate

    return {
      averageBandwidth: avgBandwidth,
      cacheHitRate,
      totalStreams: this.streamCache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.streamCache.clear();
    this.qualityCache.clear();
    this.bandwidthHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const videoStreamingService = new VideoStreamingService();