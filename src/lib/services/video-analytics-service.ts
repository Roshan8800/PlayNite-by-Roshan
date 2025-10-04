import { videoManagementService } from './video-management-service';
import { videoStreamingService } from './video-streaming-service';
import { performanceOptimizationService } from './performance-optimization-service';

export interface VideoEngagementEvent {
  videoId: string;
  userId?: string;
  sessionId: string;
  eventType: 'play' | 'pause' | 'seek' | 'buffer' | 'quality_change' | 'error' | 'complete';
  timestamp: number;
  currentTime: number;
  duration: number;
  quality?: string;
  bandwidth?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceEvent {
  videoId: string;
  sessionId: string;
  timestamp: number;
  metricType: 'load_time' | 'buffer_health' | 'dropped_frames' | 'bandwidth' | 'memory_usage';
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface UserEngagementMetrics {
  videoId: string;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  bounceRate: number;
  engagementScore: number;
  topQualities: Array<{ quality: string; percentage: number }>;
  dropOffPoints: Array<{ time: number; viewers: number }>;
  geographicDistribution: Record<string, number>;
  deviceDistribution: Record<string, number>;
  timeDistribution: Record<string, number>; // Hour of day
}

export interface SystemPerformanceMetrics {
  averageLoadTime: number;
  bufferRatio: number;
  errorRate: number;
  bandwidthUtilization: number;
  cacheEfficiency: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AnalyticsReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalVideos: number;
    totalViews: number;
    totalWatchTime: number;
    averageEngagement: number;
  };
  topVideos: Array<{
    videoId: string;
    title: string;
    views: number;
    engagement: number;
    completionRate: number;
  }>;
  engagementMetrics: UserEngagementMetrics[];
  performanceMetrics: SystemPerformanceMetrics;
  recommendations: string[];
}

export class VideoAnalyticsService {
  private eventBuffer: (VideoEngagementEvent | PerformanceEvent)[] = [];
  private sessionId: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private isEnabled = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicFlush();
  }

  /**
   * Track video engagement event
   */
  trackEngagement(event: Omit<VideoEngagementEvent, 'sessionId' | 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullEvent: VideoEngagementEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.eventBuffer.push(fullEvent);

    // Update video analytics in real-time
    this.updateRealtimeAnalytics(fullEvent);

    // Flush if buffer is full
    if (this.eventBuffer.length >= 100) {
      this.flushEvents();
    }
  }

  /**
   * Track performance metric
   */
  trackPerformance(event: Omit<PerformanceEvent, 'sessionId' | 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullEvent: PerformanceEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.eventBuffer.push(fullEvent);

    // Flush if buffer is full
    if (this.eventBuffer.length >= 100) {
      this.flushEvents();
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    videoIds?: string[]
  ): Promise<AnalyticsReport> {
    try {
      // Get all video IDs if not specified
      const targetVideoIds = videoIds || this.getAllVideoIds();

      // Collect engagement metrics for each video
      const engagementMetrics = await Promise.all(
        targetVideoIds.map(id => this.getVideoEngagementMetrics(id))
      );

      // Calculate system performance metrics
      const performanceMetrics = await this.getSystemPerformanceMetrics();

      // Generate summary statistics
      const summary = this.calculateSummaryMetrics(engagementMetrics);

      // Get top performing videos
      const topVideos = await this.getTopVideos(targetVideoIds, 10);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(engagementMetrics, performanceMetrics);

      return {
        period: { start: startDate, end: endDate },
        summary,
        topVideos,
        engagementMetrics,
        performanceMetrics,
        recommendations
      };

    } catch (error) {
      console.error('Failed to generate analytics report:', error);
      throw new Error(`Report generation failed: ${error}`);
    }
  }

  /**
   * Get real-time engagement metrics for a video
   */
  async getRealtimeMetrics(videoId: string): Promise<{
    activeViewers: number;
    currentWatchTime: number;
    bufferEvents: number;
    errorEvents: number;
  }> {
    // In a real implementation, this would query real-time data
    // For now, return mock data based on recent events

    const recentEvents = this.eventBuffer.filter(
      event => event.videoId === videoId &&
      Date.now() - event.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const engagementEvents = recentEvents.filter(event => 'eventType' in event) as VideoEngagementEvent[];
    const performanceEvents = recentEvents.filter((event): event is PerformanceEvent =>
      'metricType' in event && event.metricType === 'buffer_health'
    );

    const errorEvents = recentEvents.filter((event): event is VideoEngagementEvent =>
      'eventType' in event && event.eventType === 'error'
    );

    return {
      activeViewers: Math.max(1, Math.floor(engagementEvents.length / 10)),
      currentWatchTime: engagementEvents.reduce((sum, event) => sum + event.currentTime, 0) / Math.max(1, engagementEvents.length),
      bufferEvents: performanceEvents.filter(e => e.value < 5).length,
      errorEvents: errorEvents.length
    };
  }

  /**
   * Monitor video performance and quality
   */
  startPerformanceMonitoring(videoElement: HTMLVideoElement, videoId: string): () => void {
    const metrics = {
      loadStartTime: 0,
      bufferEvents: 0,
      droppedFrames: 0,
      bandwidthSamples: [] as number[]
    };

    const handleLoadStart = () => {
      metrics.loadStartTime = Date.now();
    };

    const handleCanPlay = () => {
      const loadTime = Date.now() - metrics.loadStartTime;
      this.trackPerformance({
        videoId,
        metricType: 'load_time',
        value: loadTime,
        unit: 'ms'
      });
    };

    const handleWaiting = () => {
      metrics.bufferEvents++;
      this.trackPerformance({
        videoId,
        metricType: 'buffer_health',
        value: 0,
        unit: 'events'
      });
    };

    const handleTimeUpdate = () => {
      // Track bandwidth estimation
      if (videoElement.buffered.length > 0) {
        const buffered = videoElement.buffered.end(0) - videoElement.currentTime;
        if (buffered > 0) {
          metrics.bandwidthSamples.push(buffered);
        }
      }

      // Track dropped frames (simplified)
      if ('webkitDroppedFrameCount' in videoElement) {
        const droppedFrames = (videoElement as any).webkitDroppedFrameCount;
        if (droppedFrames > metrics.droppedFrames) {
          this.trackPerformance({
            videoId,
            metricType: 'dropped_frames',
            value: droppedFrames - metrics.droppedFrames,
            unit: 'frames'
          });
          metrics.droppedFrames = droppedFrames;
        }
      }
    };

    const handleError = (error: Event) => {
      this.trackEngagement({
        videoId,
        eventType: 'error',
        currentTime: videoElement.currentTime,
        duration: videoElement.duration,
        errorMessage: (error.target as any)?.error?.message || 'Unknown error'
      });
    };

    // Add event listeners
    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('error', handleError);

    // Track quality changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'src') {
          this.trackEngagement({
            videoId,
            eventType: 'quality_change',
            currentTime: videoElement.currentTime,
            duration: videoElement.duration,
            quality: this.extractQualityFromUrl(videoElement.src)
          });
        }
      });
    });

    observer.observe(videoElement, { attributes: true, attributeFilter: ['src'] });

    // Return cleanup function
    return () => {
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('error', handleError);
      observer.disconnect();

      // Final bandwidth calculation
      if (metrics.bandwidthSamples.length > 0) {
        const avgBandwidth = metrics.bandwidthSamples.reduce((a, b) => a + b, 0) / metrics.bandwidthSamples.length;
        this.trackPerformance({
          videoId,
          metricType: 'bandwidth',
          value: avgBandwidth,
          unit: 'seconds'
        });
      }
    };
  }

  /**
   * Get video engagement metrics
   */
  private async getVideoEngagementMetrics(videoId: string): Promise<UserEngagementMetrics> {
    // Get metadata from video management service
    const metadata = await videoManagementService.getVideoMetadata(videoId);
    if (!metadata) {
      throw new Error(`Video ${videoId} not found`);
    }

    // Get recent events for this video
    const recentEvents = this.eventBuffer.filter(
      event => event.videoId === videoId &&
      Date.now() - event.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const engagementEvents = recentEvents.filter(event => 'eventType' in event) as VideoEngagementEvent[];

    // Calculate metrics
    const totalViews = engagementEvents.filter(e => e.eventType === 'play').length;
    const uniqueSessions = new Set(engagementEvents.map(e => e.sessionId)).size;
    const totalWatchTime = engagementEvents.reduce((sum, e) => sum + e.currentTime, 0);
    const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

    // Calculate completion rate
    const completedViews = engagementEvents.filter(e => e.eventType === 'complete').length;
    const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

    // Calculate drop-off points
    const dropOffPoints = this.calculateDropOffPoints(engagementEvents, metadata.duration);

    return {
      videoId,
      totalViews,
      uniqueViewers: uniqueSessions,
      averageWatchTime,
      completionRate,
      bounceRate: this.calculateBounceRate(engagementEvents),
      engagementScore: this.calculateEngagementScore(engagementEvents, metadata.analytics),
      topQualities: this.getTopQualities(engagementEvents),
      dropOffPoints,
      geographicDistribution: metadata.analytics.geographicDistribution,
      deviceDistribution: metadata.analytics.deviceDistribution,
      timeDistribution: this.getTimeDistribution(engagementEvents)
    };
  }

  /**
   * Get system performance metrics
   */
  private async getSystemPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
    const streamingStats = videoStreamingService.getStreamingStats();
    const performanceMetrics = performanceOptimizationService.getPerformanceMetrics();

    return {
      averageLoadTime: performanceMetrics.averageLoadTime,
      bufferRatio: 0.95, // Mock - would calculate from actual buffer events
      errorRate: 0.02, // Mock - would calculate from error events
      bandwidthUtilization: streamingStats.averageBandwidth,
      cacheEfficiency: performanceMetrics.cacheHitRate,
      memoryUsage: performanceMetrics.memoryUsage,
      cpuUsage: 0.15 // Mock - would measure actual CPU usage
    };
  }

  /**
   * Update real-time analytics
   */
  private updateRealtimeAnalytics(event: VideoEngagementEvent): void {
    // Map event types to management service expectations
    const mappedEventType = this.mapEventType(event.eventType);

    if (mappedEventType) {
      // Update video analytics in management service
      videoManagementService.updateVideoAnalytics(
        event.videoId,
        mappedEventType,
        {
          watchTime: event.currentTime,
          duration: event.duration,
          quality: event.quality,
          bandwidth: event.bandwidth
        }
      );
    }
  }

  /**
   * Map analytics event types to management service event types
   */
  private mapEventType(eventType: VideoEngagementEvent['eventType']): 'view' | 'like' | 'comment' | 'share' | 'save' | null {
    switch (eventType) {
      case 'play':
      case 'pause':
      case 'seek':
      case 'complete':
        return 'view';
      case 'error':
        return 'view'; // Map error to view for tracking purposes
      case 'buffer':
      case 'quality_change':
        return null; // Don't map these to management service
      default:
        return null;
    }
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(engagementMetrics: UserEngagementMetrics[]): AnalyticsReport['summary'] {
    const totalViews = engagementMetrics.reduce((sum, m) => sum + m.totalViews, 0);
    const totalWatchTime = engagementMetrics.reduce((sum, m) => sum + (m.averageWatchTime * m.totalViews), 0);
    const averageEngagement = engagementMetrics.reduce((sum, m) => sum + m.engagementScore, 0) / engagementMetrics.length;

    return {
      totalVideos: engagementMetrics.length,
      totalViews,
      totalWatchTime,
      averageEngagement
    };
  }

  /**
   * Get top performing videos
   */
  private async getTopVideos(videoIds: string[], limit: number): Promise<AnalyticsReport['topVideos']> {
    const topVideos = await Promise.all(
      videoIds.map(async (id) => {
        const metadata = await videoManagementService.getVideoMetadata(id);
        const metrics = await this.getVideoEngagementMetrics(id);

        return {
          videoId: id,
          title: metadata?.title || 'Unknown Video',
          views: metrics.totalViews,
          engagement: metrics.engagementScore,
          completionRate: metrics.completionRate
        };
      })
    );

    return topVideos
      .sort((a, b) => (b.views * b.engagement) - (a.views * a.engagement))
      .slice(0, limit);
  }

  /**
   * Generate recommendations based on analytics
   */
  private async generateRecommendations(
    engagementMetrics: UserEngagementMetrics[],
    performanceMetrics: SystemPerformanceMetrics
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Performance-based recommendations
    if (performanceMetrics.averageLoadTime > 3000) {
      recommendations.push('Consider optimizing video encoding for faster load times');
    }

    if (performanceMetrics.errorRate > 0.05) {
      recommendations.push('High error rate detected - check video encoding and CDN configuration');
    }

    if (performanceMetrics.cacheEfficiency < 0.7) {
      recommendations.push('Improve cache hit rate by optimizing preloading strategy');
    }

    // Engagement-based recommendations
    const lowEngagementVideos = engagementMetrics.filter(m => m.engagementScore < 0.5);
    if (lowEngagementVideos.length > 0) {
      recommendations.push(`${lowEngagementVideos.length} videos have low engagement - consider content optimization`);
    }

    const lowCompletionVideos = engagementMetrics.filter(m => m.completionRate < 0.3);
    if (lowCompletionVideos.length > 0) {
      recommendations.push(`${lowCompletionVideos.length} videos have low completion rates - analyze drop-off points`);
    }

    return recommendations;
  }

  /**
   * Calculate drop-off points
   */
  private calculateDropOffPoints(events: VideoEngagementEvent[], duration: number): Array<{ time: number; viewers: number }> {
    const dropOffData = new Map<number, number>();

    // Group events by time segments
    events.forEach(event => {
      const segment = Math.floor(event.currentTime / 10) * 10; // 10-second segments
      dropOffData.set(segment, (dropOffData.get(segment) || 0) + 1);
    });

    // Convert to array and sort by time
    return Array.from(dropOffData.entries())
      .map(([time, viewers]) => ({ time, viewers }))
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Calculate bounce rate
   */
  private calculateBounceRate(events: VideoEngagementEvent[]): number {
    const sessions = new Map<string, VideoEngagementEvent[]>();

    // Group events by session
    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId)!.push(event);
    });

    // Calculate bounce rate (sessions with very short watch time)
    let bouncedSessions = 0;
    sessions.forEach(sessionEvents => {
      const maxWatchTime = Math.max(...sessionEvents.map(e => e.currentTime));
      if (maxWatchTime < 5) { // Less than 5 seconds
        bouncedSessions++;
      }
    });

    return sessions.size > 0 ? (bouncedSessions / sessions.size) * 100 : 0;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(
    events: VideoEngagementEvent[],
    existingAnalytics: any
  ): number {
    const totalInteractions = events.length;
    const averageWatchTime = events.reduce((sum, e) => sum + e.currentTime, 0) / Math.max(1, events.length);
    const completionEvents = events.filter(e => e.eventType === 'complete').length;

    // Weighted score (0-1 scale)
    const watchTimeScore = Math.min(1, averageWatchTime / 60); // Normalize to 1 minute
    const interactionScore = Math.min(1, totalInteractions / 10); // Normalize to 10 interactions
    const completionScore = completionEvents / Math.max(1, events.length);

    return (watchTimeScore * 0.4 + interactionScore * 0.3 + completionScore * 0.3);
  }

  /**
   * Get top quality preferences
   */
  private getTopQualities(events: VideoEngagementEvent[]): Array<{ quality: string; percentage: number }> {
    const qualityCounts = new Map<string, number>();

    events.forEach(event => {
      if (event.quality) {
        qualityCounts.set(event.quality, (qualityCounts.get(event.quality) || 0) + 1);
      }
    });

    const total = qualityCounts.size;
    return Array.from(qualityCounts.entries())
      .map(([quality, count]) => ({
        quality,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Get time distribution
   */
  private getTimeDistribution(events: VideoEngagementEvent[]): Record<string, number> {
    const hourCounts = new Map<string, number>();

    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours().toString();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Object.fromEntries(hourCounts);
  }

  /**
   * Extract quality from video URL
   */
  private extractQualityFromUrl(url: string): string {
    const match = url.match(/quality=(\w+)/);
    return match ? match[1] : 'auto';
  }

  /**
   * Get all video IDs from events
   */
  private getAllVideoIds(): string[] {
    const videoIds = new Set<string>();

    this.eventBuffer.forEach(event => {
      videoIds.add(event.videoId);
    });

    return Array.from(videoIds);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Flush events to storage/API
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // In a real implementation, send to analytics API
      // await fetch('/api/analytics/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: eventsToFlush })
      // });

      console.log(`Flushed ${eventsToFlush.length} analytics events`);

    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Start periodic flush of events
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Enable or disable analytics tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this.eventBuffer = [];
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.eventBuffer.length;
  }
}

// Export singleton instance
export const videoAnalyticsService = new VideoAnalyticsService();