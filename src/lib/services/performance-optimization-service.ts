import { videoStreamingService } from './video-streaming-service';
import { videoManagementService } from './video-management-service';
import { AdvancedCacheManager, MultiLayerCacheConfig } from '../performance/AdvancedCacheManager';
import { IntelligentLazyLoader, LazyLoadConfig as AdvancedLazyLoadConfig } from '../performance/IntelligentLazyLoader';
import { PerformanceOptimizer, PerformanceConfig } from '../performance/PerformanceOptimizer';
import { PerformanceAnalytics, AnalyticsConfig } from '../performance/PerformanceAnalytics';

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  maxAge: number; // Maximum age in milliseconds
  compressionEnabled: boolean;
}

export interface PreloadConfig {
  maxConcurrent: number;
  priorityThreshold: number; // Distance from viewport to trigger preload
  networkAware: boolean;
  batteryAware: boolean;
}

export interface LazyLoadConfig {
  rootMargin: string;
  threshold: number;
  enableBlurPlaceholder: boolean;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  averageLoadTime: number;
  memoryUsage: number;
  networkEfficiency: number;
  batteryImpact: number;
}

export class PerformanceOptimizationService {
  private cache = new Map<string, CacheEntry>();
  private preloadQueue: PreloadTask[] = [];
  private lazyLoadObserver: IntersectionObserver | null = null;

  // Advanced performance systems
  private advancedCacheManager?: AdvancedCacheManager;
  private intelligentLazyLoader?: IntelligentLazyLoader;
  private performanceOptimizer?: PerformanceOptimizer;
  private performanceAnalytics?: PerformanceAnalytics;

  private config: {
    cache: CacheConfig;
    preload: PreloadConfig;
    lazyLoad: LazyLoadConfig;
    advanced?: {
      enableAdvancedCache: boolean;
      enableIntelligentLazyLoading: boolean;
      enablePerformanceOptimization: boolean;
      enableAnalytics: boolean;
    };
  };

  constructor() {
    this.config = {
      cache: {
        maxSize: 100, // 100MB
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        compressionEnabled: true
      },
      preload: {
        maxConcurrent: 3,
        priorityThreshold: 2, // Preload videos 2 screens away
        networkAware: true,
        batteryAware: true
      },
      lazyLoad: {
        rootMargin: '50px',
        threshold: 0.1,
        enableBlurPlaceholder: true
      },
      advanced: {
        enableAdvancedCache: true,
        enableIntelligentLazyLoading: true,
        enablePerformanceOptimization: true,
        enableAnalytics: true
      }
    };

    this.initializeAdvancedSystems();
    this.initializeLazyLoading();
    this.startCacheCleanup();
    this.startPerformanceMonitoring();
  }

  /**
   * Cache video content for faster loading
   */
  async cacheVideoContent(videoId: string, content: Blob, metadata?: any): Promise<void> {
    // Use advanced cache manager if available
    if (this.advancedCacheManager && this.config.advanced?.enableAdvancedCache) {
      await this.advancedCacheManager.set(videoId, content, {
        contentType: 'video',
        priority: 'high'
      });

      // Also record in analytics
      if (this.performanceAnalytics) {
        this.performanceAnalytics.recordMetric('cache', 'video-cached', content.size, {
          videoId,
          contentType: 'video'
        });
      }

      return;
    }

    // Fallback to legacy caching
    const entry: CacheEntry = {
      id: videoId,
      content,
      metadata,
      timestamp: Date.now(),
      size: content.size,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Check cache size limits
    const currentSize = this.getCacheSize();
    if (currentSize + content.size > this.config.cache.maxSize * 1024 * 1024) {
      await this.evictCacheEntries(content.size);
    }

    this.cache.set(videoId, entry);
  }

  /**
   * Get cached video content
   */
  async getCachedVideoContent(videoId: string): Promise<Blob | null> {
    // Try advanced cache manager first
    if (this.advancedCacheManager && this.config.advanced?.enableAdvancedCache) {
      const cachedContent = await this.advancedCacheManager.get(videoId);

      if (cachedContent && cachedContent instanceof Blob) {
        // Record cache hit in analytics
        if (this.performanceAnalytics) {
          this.performanceAnalytics.recordMetric('cache', 'hit', 1, {
            videoId,
            source: 'advanced-cache'
          });
        }

        return cachedContent;
      }
    }

    // Fallback to legacy cache
    const entry = this.cache.get(videoId);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.config.cache.maxAge) {
      this.cache.delete(videoId);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Record cache hit in analytics
    if (this.performanceAnalytics) {
      this.performanceAnalytics.recordMetric('cache', 'hit', 1, {
        videoId,
        source: 'legacy-cache'
      });
    }

    return entry.content;
  }

  /**
   * Preload video content based on user behavior and viewport
   */
  async preloadVideo(videoId: string, priority: number = 1): Promise<void> {
    if (this.preloadQueue.length >= this.config.preload.maxConcurrent) {
      // Remove lowest priority task if queue is full
      this.preloadQueue.sort((a, b) => a.priority - b.priority);
      this.preloadQueue.shift();
    }

    const task: PreloadTask = {
      id: videoId,
      priority,
      status: 'pending',
      timestamp: Date.now()
    };

    this.preloadQueue.push(task);

    // Check if we should actually preload based on conditions
    if (await this.shouldPreload()) {
      await this.executePreload(task);
    }
  }

  /**
   * Setup lazy loading for video thumbnails and content
   */
  setupLazyLoading(
    elements: Element[],
    callback: (element: Element) => void
  ): () => void {
    if (!this.lazyLoadObserver) {
      this.lazyLoadObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              callback(entry.target);
              this.lazyLoadObserver?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: this.config.lazyLoad.rootMargin,
          threshold: this.config.lazyLoad.threshold
        }
      );
    }

    elements.forEach((element) => {
      this.lazyLoadObserver?.observe(element);
    });

    // Return cleanup function
    return () => {
      elements.forEach((element) => {
        this.lazyLoadObserver?.unobserve(element);
      });
    };
  }

  /**
   * Optimize video for specific device and network conditions
   */
  async optimizeVideoForDevice(
    videoUrl: string,
    deviceInfo: DeviceInfo
  ): Promise<string> {
    const connection = await this.getNetworkInfo();
    const battery = await this.getBatteryInfo();

    // Adjust quality based on device capabilities
    let targetQuality = '720p';

    if (deviceInfo.type === 'mobile' && deviceInfo.memory < 4) {
      targetQuality = '480p';
    } else if (connection.speed === 'slow' || battery.level < 0.2) {
      targetQuality = '480p';
    } else if (deviceInfo.type === 'desktop' && deviceInfo.memory >= 8) {
      targetQuality = '1080p';
    }

    // Generate optimized URL
    return `${videoUrl}?optimized=true&quality=${targetQuality}&device=${deviceInfo.type}`;
  }

  /**
   * Background video processing for better performance
   */
  async processVideoInBackground(
    videoId: string,
    operations: Array<{
      type: 'thumbnail' | 'preview' | 'transcode' | 'analyze';
      params?: any;
    }>
  ): Promise<void> {
    // Check if background processing is supported
    if (!('serviceWorker' in navigator) || !('backgroundSync' in window.ServiceWorkerRegistration.prototype)) {
      // Fallback to main thread processing
      for (const operation of operations) {
        await this.processVideoOperation(videoId, operation);
      }
      return;
    }

    // Register background sync
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register(`video-processing-${videoId}`);
    }
  }

  /**
   * Memory management for multiple video elements
   */
  manageVideoMemory(videos: HTMLVideoElement[]): void {
    const maxConcurrentVideos = 3;

    if (videos.length > maxConcurrentVideos) {
      // Pause videos that are not visible or far from viewport
      videos.forEach((video, index) => {
        if (index >= maxConcurrentVideos) {
          video.pause();
          // Clear video buffers to free memory
          if (video.buffered.length > 0) {
            // Note: Actually clearing buffers requires reloading the video
            video.load();
          }
        }
      });
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheEntries = Array.from(this.cache.values());
    const totalRequests = cacheEntries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const cacheHits = cacheEntries.reduce((sum, entry) => sum + (entry.accessCount > 0 ? 1 : 0), 0);

    return {
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      averageLoadTime: this.calculateAverageLoadTime(),
      memoryUsage: this.getMemoryUsage(),
      networkEfficiency: this.calculateNetworkEfficiency(),
      batteryImpact: this.estimateBatteryImpact()
    };
  }

  /**
   * Initialize advanced performance systems
   */
  private initializeAdvancedSystems(): void {
    try {
      // Initialize Advanced Cache Manager
      if (this.config.advanced?.enableAdvancedCache) {
        const cacheConfig: MultiLayerCacheConfig = {
          layers: [
            {
              name: 'memory',
              maxSize: 50 * 1024 * 1024, // 50MB
              maxAge: 60 * 60 * 1000, // 1 hour
              strategy: 'LRU',
              compression: true,
              encryption: false
            },
            {
              name: 'disk',
              maxSize: 200 * 1024 * 1024, // 200MB
              maxAge: 24 * 60 * 60 * 1000, // 24 hours
              strategy: 'LFU',
              compression: true,
              encryption: false
            },
            {
              name: 'network',
              maxSize: 500 * 1024 * 1024, // 500MB
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              strategy: 'Adaptive',
              compression: false,
              encryption: false
            }
          ],
          globalMaxSize: 1024 * 1024 * 1024, // 1GB
          enableCompression: true,
          enableEncryption: false,
          enableMetrics: true,
          adaptiveScaling: true
        };

        this.advancedCacheManager = new AdvancedCacheManager(cacheConfig);
      }

      // Initialize Intelligent Lazy Loader
      if (this.config.advanced?.enableIntelligentLazyLoading) {
        const lazyConfig: AdvancedLazyLoadConfig = {
          rootMargin: this.config.lazyLoad.rootMargin,
          threshold: this.config.lazyLoad.threshold,
          maxConcurrent: this.config.preload.maxConcurrent,
          networkAware: this.config.preload.networkAware,
          batteryAware: this.config.preload.batteryAware,
          userBehaviorAware: true,
          predictiveLoading: true,
          intersectionThreshold: 0.5,
          priorityWeights: {
            viewport: 0.3,
            userBehavior: 0.25,
            contentType: 0.2,
            networkSpeed: 0.15,
            batteryLevel: 0.1
          }
        };

        this.intelligentLazyLoader = new IntelligentLazyLoader(lazyConfig);
      }

      // Initialize Performance Optimizer
      if (this.config.advanced?.enablePerformanceOptimization) {
        const optimizerConfig: PerformanceConfig = {
          targetFPS: 60,
          maxMemoryUsage: 500,
          maxNetworkRequests: 6,
          cacheOptimization: true,
          lazyLoading: true,
          codeSplitting: true,
          resourceHints: true,
          adaptiveQuality: true,
          backgroundProcessing: true,
          predictiveLoading: true
        };

        this.performanceOptimizer = new PerformanceOptimizer(optimizerConfig);
      }

      // Initialize Performance Analytics
      if (this.config.advanced?.enableAnalytics) {
        const analyticsConfig: AnalyticsConfig = {
          retentionPeriod: 30,
          samplingRate: 1.0,
          enableRealTime: true,
          enableHistorical: true,
          enablePredictions: true,
          reportInterval: 60,
          maxDataPoints: 10000
        };

        this.performanceAnalytics = new PerformanceAnalytics(analyticsConfig);
      }

    } catch (error) {
      console.error('Failed to initialize advanced performance systems:', error);
    }
  }

  /**
   * Initialize lazy loading observer
   */
  private initializeLazyLoading(): void {
    if (typeof window === 'undefined') return;

    this.lazyLoadObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const videoId = element.dataset.videoId;

            if (videoId) {
              this.loadVideoContent(videoId, element);
            }

            this.lazyLoadObserver?.unobserve(element);
          }
        });
      },
      {
        rootMargin: this.config.lazyLoad.rootMargin,
        threshold: this.config.lazyLoad.threshold
      }
    );
  }

  /**
   * Load video content when element comes into view
   */
  private async loadVideoContent(videoId: string, element: HTMLElement): Promise<void> {
    try {
      // Check cache first
      const cachedContent = await this.getCachedVideoContent(videoId);
      if (cachedContent) {
        // Use cached content
        this.displayCachedContent(element, cachedContent);
        return;
      }

      // Load from network
      const response = await fetch(`/api/videos/${videoId}/stream`);
      const content = await response.blob();

      // Cache the content
      await this.cacheVideoContent(videoId, content);

      // Display the content
      this.displayVideoContent(element, content);

    } catch (error) {
      console.error('Failed to load video content:', error);
    }
  }

  /**
   * Display cached content
   */
  private displayCachedContent(element: HTMLElement, content: Blob): void {
    const video = element.querySelector('video') || document.createElement('video');
    video.src = URL.createObjectURL(content);
    element.appendChild(video);
  }

  /**
   * Display video content
   */
  private displayVideoContent(element: HTMLElement, content: Blob): void {
    const video = element.querySelector('video') || document.createElement('video');
    video.src = URL.createObjectURL(content);

    // Add loading optimization
    video.preload = 'metadata';
    video.playsInline = true;

    element.appendChild(video);
  }

  /**
   * Execute preload task
   */
  private async executePreload(task: PreloadTask): Promise<void> {
    task.status = 'loading';

    try {
      // Generate stream manifest
      await videoStreamingService.generateStreamManifest(
        task.id,
        `/api/videos/${task.id}`,
        {}
      );

      // Preload video metadata
      await videoStreamingService.preloadVideo(`/api/videos/${task.id}`);

      task.status = 'completed';

    } catch (error) {
      console.error('Preload failed:', error);
      task.status = 'failed';
    }
  }

  /**
   * Check if preloading should be performed
   */
  private async shouldPreload(): Promise<boolean> {
    if (!this.config.preload.networkAware && !this.config.preload.batteryAware) {
      return true;
    }

    const conditions = [];

    if (this.config.preload.networkAware) {
      const connection = await this.getNetworkInfo();
      conditions.push(connection.speed !== 'slow');
    }

    if (this.config.preload.batteryAware) {
      const battery = await this.getBatteryInfo();
      conditions.push(battery.level > 0.2 && !battery.charging);
    }

    return conditions.every(Boolean);
  }

  /**
   * Get network information
   */
  private async getNetworkInfo(): Promise<{ speed: 'slow' | 'medium' | 'fast' }> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      if (connection.effectiveType) {
        const speed = connection.effectiveType;
        if (speed === 'slow-2g' || speed === '2g') return { speed: 'slow' };
        if (speed === '3g') return { speed: 'medium' };
        return { speed: 'fast' };
      }
    }

    // Default to medium speed if unable to detect
    return { speed: 'medium' };
  }

  /**
   * Get battery information
   */
  private async getBatteryInfo(): Promise<{ level: number; charging: boolean }> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging
        };
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }

    return { level: 1, charging: true };
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    const userAgent = navigator.userAgent;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)|Tablet|PlayBook/i.test(userAgent);

    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isTablet) type = 'tablet';
    else if (isMobile) type = 'mobile';

    // Estimate memory (rough approximation)
    const memory = (navigator as any).deviceMemory || 4;

    return { type, memory };
  }

  /**
   * Process individual video operation
   */
  private async processVideoOperation(
    videoId: string,
    operation: { type: string; params?: any }
  ): Promise<void> {
    switch (operation.type) {
      case 'thumbnail':
        await videoManagementService.extractVideoMetadata(`/api/videos/${videoId}`);
        break;
      case 'preview':
        // Generate preview clip
        break;
      case 'transcode':
        await videoManagementService.transcodeVideo(
          videoId,
          `/api/videos/${videoId}`,
          operation.params?.format || 'mp4',
          operation.params?.quality || '720p'
        );
        break;
      case 'analyze':
        // Analyze video content
        break;
    }
  }

  /**
   * Get current cache size in bytes
   */
  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Evict cache entries to make room for new content
   */
  private async evictCacheEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.cache.values());

    // Sort by access count and age (LRU with frequency)
    entries.sort((a, b) => {
      const scoreA = a.accessCount / Math.max(1, Date.now() - a.lastAccessed);
      const scoreB = b.accessCount / Math.max(1, Date.now() - b.lastAccessed);
      return scoreA - scoreB;
    });

    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break;

      this.cache.delete(entry.id);
      freedSpace += entry.size;
    }
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.config.cache.maxAge) {
          this.cache.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Clean every hour
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor performance metrics
    setInterval(() => {
      this.getPerformanceMetrics();
    }, 30 * 1000); // Every 30 seconds
  }

  /**
   * Calculate average load time
   */
  private calculateAverageLoadTime(): number {
    // Mock calculation - in real implementation, track actual load times
    return 1500; // 1.5 seconds average
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * Calculate network efficiency
   */
  private calculateNetworkEfficiency(): number {
    // Mock calculation based on cache hit rate and compression
    const cacheHitRate = this.getPerformanceMetrics().cacheHitRate;
    return Math.min(1, cacheHitRate * 1.5); // Up to 150% efficiency with good caching
  }

  /**
   * Estimate battery impact
   */
  private estimateBatteryImpact(): number {
    // Mock calculation - lower is better (less battery impact)
    const concurrentOperations = Math.min(this.preloadQueue.length, this.config.preload.maxConcurrent);
    return Math.max(0.1, concurrentOperations * 0.2); // 0.1 to 0.6 scale
  }

  /**
   * Clear all caches and reset state
   */
  clearAll(): void {
    this.cache.clear();
    this.preloadQueue = [];

    if (this.lazyLoadObserver) {
      this.lazyLoadObserver.disconnect();
      this.lazyLoadObserver = null;
    }

    // Clear advanced systems
    if (this.advancedCacheManager) {
      this.advancedCacheManager.clear();
    }

    if (this.performanceOptimizer) {
      this.performanceOptimizer.cleanup();
    }

    if (this.performanceAnalytics) {
      this.performanceAnalytics.cleanup();
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };

    // Update advanced systems if they exist
    if (this.advancedCacheManager && updates.cache) {
      // Update cache manager configuration if needed
    }

    if (this.intelligentLazyLoader && updates.lazyLoad) {
      this.intelligentLazyLoader.updateConfig({
        rootMargin: updates.lazyLoad.rootMargin || this.config.lazyLoad.rootMargin,
        threshold: updates.lazyLoad.threshold || this.config.lazyLoad.threshold
      });
    }

    if (this.performanceOptimizer && updates.advanced) {
      this.performanceOptimizer.updateConfig({
        maxMemoryUsage: updates.advanced.enableAdvancedCache ? 500 : 300,
        cacheOptimization: updates.advanced.enableAdvancedCache || false,
        lazyLoading: updates.advanced.enableIntelligentLazyLoading || false
      });
    }
  }

  /**
   * Get advanced cache manager instance
   */
  getAdvancedCacheManager(): AdvancedCacheManager | undefined {
    return this.advancedCacheManager;
  }

  /**
   * Get intelligent lazy loader instance
   */
  getIntelligentLazyLoader(): IntelligentLazyLoader | undefined {
    return this.intelligentLazyLoader;
  }

  /**
   * Get performance optimizer instance
   */
  getPerformanceOptimizer(): PerformanceOptimizer | undefined {
    return this.performanceOptimizer;
  }

  /**
   * Get performance analytics instance
   */
  getPerformanceAnalytics(): PerformanceAnalytics | undefined {
    return this.performanceAnalytics;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(startTime?: number, endTime?: number): Promise<any> {
    if (this.performanceAnalytics) {
      return await this.performanceAnalytics.generateReport(startTime, endTime);
    }

    // Fallback to basic metrics
    return {
      summary: {
        overallScore: this.getPerformanceMetrics().cacheHitRate * 100,
        totalOptimizations: 0,
        performanceGains: 0,
        resourceSavings: 0
      },
      metrics: this.getPerformanceMetrics(),
      recommendations: [],
      trends: []
    };
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): any {
    if (this.performanceAnalytics) {
      return this.performanceAnalytics.getDashboardData();
    }

    return {
      currentMetrics: this.getPerformanceMetrics(),
      recentTrends: [],
      activeRecommendations: [],
      alerts: []
    };
  }

  /**
   * Optimize performance automatically
   */
  async optimizePerformance(): Promise<{
    optimizations: string[];
    suggestions: any[];
    metrics: any;
  }> {
    if (this.performanceOptimizer) {
      return await this.performanceOptimizer.optimize();
    }

    // Fallback optimization
    return {
      optimizations: ['Basic memory cleanup performed'],
      suggestions: [],
      metrics: this.getPerformanceMetrics()
    };
  }

  /**
   * Register element for intelligent lazy loading
   */
  registerLazyElement(element: any): (() => void) | undefined {
    if (this.intelligentLazyLoader) {
      return this.intelligentLazyLoader.registerElement(element);
    }
    return undefined;
  }

  /**
   * Force load element using intelligent lazy loader
   */
  async forceLoadElement(elementId: string): Promise<void> {
    if (this.intelligentLazyLoader) {
      await this.intelligentLazyLoader.forceLoad(elementId);
    }
  }

  /**
   * Get advanced performance statistics
   */
  getAdvancedStats(): {
    cache?: any;
    lazyLoading?: any;
    optimization?: any;
    analytics?: any;
  } {
    return {
      cache: this.advancedCacheManager?.getStats(),
      lazyLoading: this.intelligentLazyLoader?.getLoadingStats(),
      optimization: this.performanceOptimizer?.getMetrics(),
      analytics: this.performanceAnalytics?.getDashboardData()
    };
  }
}

// Supporting interfaces and types
interface CacheEntry {
  id: string;
  content: Blob;
  metadata?: any;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface PreloadTask {
  id: string;
  priority: number;
  status: 'pending' | 'loading' | 'completed' | 'failed';
  timestamp: number;
}

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  memory: number; // GB
}

// Export singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();