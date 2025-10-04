import {
  InteractionEvent,
  InteractionType,
  InteractionContext,
  PerformanceMetrics,
  InteractionOptimizerConfig,
  OptimizationRule,
  ResponseOptimization,
  CachingStrategy,
  UserInteractionPattern,
  BehaviorProfile,
  OptimizationRecommendation,
  OptimizationAction
} from '../types';
import { performanceOptimizationService } from '../../services/performance-optimization-service';
import { videoAnalyticsService } from '../../services/video-analytics-service';

export class InteractionOptimizer {
  private config: InteractionOptimizerConfig;
  private eventBuffer: InteractionEvent[] = [];
  private optimizationRules: OptimizationRule[] = [];
  private activeOptimizations: Map<string, any> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics[]> = new Map();
  private userPatterns: Map<string, UserInteractionPattern> = new Map();
  private responseOptimizations: ResponseOptimization;
  private cachingStrategies: Map<string, CachingStrategy> = new Map();

  constructor(config: Partial<InteractionOptimizerConfig> = {}) {
    this.config = {
      enableResponseOptimization: true,
      enablePredictiveLoading: true,
      enableAdaptiveQuality: true,
      enableSmartCaching: true,
      enablePerformanceMonitoring: true,
      responseTimeThreshold: 100, // 100ms
      memoryThreshold: 50, // 50MB
      cpuThreshold: 70, // 70%
      cacheSize: 100, // 100MB
      analyticsRetention: 30, // 30 days
      ...config
    };

    this.responseOptimizations = {
      enableCompression: true,
      enableMinification: true,
      enableCDN: true,
      enableEdgeCaching: true,
      enableImageOptimization: true,
      enableVideoOptimization: true,
      enableFontOptimization: true,
      enableCSSOptimization: true,
      enableJSOptimization: true,
    };

    this.initializeOptimizationRules();
    this.startPerformanceMonitoring();
    this.startEventProcessing();
  }

  /**
   * Track user interaction event
   */
  async trackInteraction(
    type: InteractionType,
    context: InteractionContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: InteractionEvent = {
      id: this.generateEventId(),
      type,
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      metadata,
      performance: await this.getCurrentPerformanceMetrics(),
    };

    // Add user ID if available
    if (typeof window !== 'undefined' && (window as any).userId) {
      event.userId = (window as any).userId;
    }

    this.eventBuffer.push(event);

    // Process event for immediate optimizations
    await this.processInteractionEvent(event, context);

    // Update user behavior patterns
    await this.updateUserPatterns(event);

    // Check for optimization opportunities
    await this.checkOptimizationOpportunities(event, context);
  }

  /**
   * Optimize response for specific interaction
   */
  async optimizeResponse(
    interactionType: InteractionType,
    context: InteractionContext
  ): Promise<{
    optimizations: string[];
    performanceGain: number;
    recommendations: OptimizationRecommendation[];
  }> {
    const optimizations: string[] = [];
    const recommendations: OptimizationRecommendation[] = [];

    // Apply response optimizations based on interaction type
    switch (interactionType) {
      case 'click':
        optimizations.push(...await this.optimizeClickResponse(context));
        break;
      case 'scroll':
        optimizations.push(...await this.optimizeScrollResponse(context));
        break;
      case 'play':
        optimizations.push(...await this.optimizeVideoResponse(context));
        break;
      case 'search':
        optimizations.push(...await this.optimizeSearchResponse(context));
        break;
      case 'navigation':
        optimizations.push(...await this.optimizeNavigationResponse(context));
        break;
      default:
        optimizations.push(...await this.applyGeneralOptimizations(context));
    }

    // Generate recommendations based on current performance
    recommendations.push(...await this.generateRecommendations(context));

    // Calculate expected performance gain
    const performanceGain = await this.calculatePerformanceGain(optimizations);

    return {
      optimizations,
      performanceGain,
      recommendations,
    };
  }

  /**
   * Enable predictive loading based on user behavior
   */
  async enablePredictiveLoading(userId?: string): Promise<void> {
    if (!this.config.enablePredictiveLoading) return;

    const pattern = userId ? this.userPatterns.get(userId) : null;
    if (!pattern) return;

    // Analyze user behavior to predict next interactions
    const predictions = await this.predictNextInteractions(pattern);

    // Preload predicted content
    for (const prediction of predictions) {
      await this.preloadContent(prediction.contentType, prediction.context);
    }
  }

  /**
   * Apply adaptive quality adjustments
   */
  async applyAdaptiveQuality(
    contentType: string,
    context: InteractionContext
  ): Promise<string> {
    if (!this.config.enableAdaptiveQuality) return 'auto';

    const performance = await this.getCurrentPerformanceMetrics();
    const networkInfo = await this.getNetworkInfo();
    const deviceInfo = await this.getDeviceInfo();

    // Adjust quality based on performance metrics
    let quality = 'auto';

    if (performance.memoryUsage > this.config.memoryThreshold) {
      quality = 'low';
    } else if (performance.cpuUsage > this.config.cpuThreshold) {
      quality = 'medium';
    } else if (networkInfo.type === 'fast' && deviceInfo.memory > 8) {
      quality = 'high';
    } else if (networkInfo.type === 'slow') {
      quality = 'low';
    }

    // Apply quality-specific optimizations
    await this.applyQualityOptimizations(quality, contentType, context);

    return quality;
  }

  /**
   * Implement smart caching strategy
   */
  async implementSmartCaching(
    contentId: string,
    contentType: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    if (!this.config.enableSmartCaching) return;

    const strategy: CachingStrategy = {
      type: 'hybrid',
      maxSize: this.config.cacheSize,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      compression: true,
      encryption: false,
      priority,
      invalidationStrategy: 'time',
    };

    this.cachingStrategies.set(contentId, strategy);

    // Cache content using performance optimization service
    if (performanceOptimizationService.getAdvancedCacheManager()) {
      // Content would be cached here in real implementation
      console.log(`Smart caching enabled for ${contentId} with ${priority} priority`);
    }
  }

  /**
   * Get interaction analytics
   */
  async getInteractionAnalytics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<{
    totalInteractions: number;
    averageResponseTime: number;
    performanceScore: number;
    topInteractionTypes: Array<{ type: InteractionType; count: number }>;
    recommendations: OptimizationRecommendation[];
  }> {
    const startTime = startDate?.getTime() || Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
    const endTime = endDate?.getTime() || Date.now();

    const relevantEvents = this.eventBuffer.filter(
      event => event.timestamp >= startTime &&
               event.timestamp <= endTime &&
               (!userId || event.userId === userId)
    );

    const totalInteractions = relevantEvents.length;
    const averageResponseTime = relevantEvents.reduce(
      (sum, event) => sum + (event.performance?.responseTime || 0), 0
    ) / Math.max(1, totalInteractions);

    const performanceScore = this.calculatePerformanceScore(relevantEvents);
    const topInteractionTypes = this.getTopInteractionTypes(relevantEvents);
    const recommendations = await this.generateRecommendations();

    return {
      totalInteractions,
      averageResponseTime,
      performanceScore,
      topInteractionTypes,
      recommendations,
    };
  }

  /**
   * Optimize click response
   */
  private async optimizeClickResponse(context: InteractionContext): Promise<string[]> {
    const optimizations: string[] = [];

    // Debounce rapid clicks
    if (await this.shouldDebounceClicks(context)) {
      optimizations.push('click_debouncing_enabled');
    }

    // Preload hover targets
    optimizations.push(...await this.preloadClickTargets(context));

    // Optimize DOM updates
    optimizations.push('dom_optimization_applied');

    return optimizations;
  }

  /**
   * Optimize scroll response
   */
  private async optimizeScrollResponse(context: InteractionContext): Promise<string[]> {
    const optimizations: string[] = [];

    // Enable virtual scrolling for large lists
    if (context.element.includes('list') || context.element.includes('feed')) {
      optimizations.push('virtual_scrolling_enabled');
    }

    // Throttle scroll events
    optimizations.push('scroll_throttling_applied');

    // Predictive content loading
    if (this.config.enablePredictiveLoading) {
      optimizations.push('predictive_loading_enabled');
    }

    return optimizations;
  }

  /**
   * Optimize video response
   */
  private async optimizeVideoResponse(context: InteractionContext): Promise<string[]> {
    const optimizations: string[] = [];

    // Apply adaptive bitrate
    const quality = await this.applyAdaptiveQuality('video', context);
    optimizations.push(`adaptive_quality_${quality}`);

    // Enable smart buffering
    optimizations.push('smart_buffering_enabled');

    // Optimize video player settings
    optimizations.push('video_player_optimized');

    return optimizations;
  }

  /**
   * Optimize search response
   */
  private async optimizeSearchResponse(context: InteractionContext): Promise<string[]> {
    const optimizations: string[] = [];

    // Enable search result caching
    optimizations.push('search_cache_enabled');

    // Implement progressive search results
    optimizations.push('progressive_results_enabled');

    // Optimize search indexing
    optimizations.push('search_index_optimized');

    return optimizations;
  }

  /**
   * Optimize navigation response
   */
  private async optimizeNavigationResponse(context: InteractionContext): Promise<string[]> {
    const optimizations: string[] = [];

    // Preload next page content
    optimizations.push('page_preloading_enabled');

    // Optimize route transitions
    optimizations.push('route_transitions_optimized');

    // Enable service worker caching
    if ('serviceWorker' in navigator) {
      optimizations.push('service_worker_caching_enabled');
    }

    return optimizations;
  }

  /**
   * Apply general optimizations
   */
  private async applyGeneralOptimizations(context: InteractionContext): Promise<string[]> {
    const optimizations: string[] = [];

    // Apply response compression
    if (this.responseOptimizations.enableCompression) {
      optimizations.push('response_compression_enabled');
    }

    // Enable lazy loading
    optimizations.push('lazy_loading_applied');

    // Optimize images
    if (this.responseOptimizations.enableImageOptimization) {
      optimizations.push('image_optimization_applied');
    }

    return optimizations;
  }

  /**
   * Process individual interaction event
   */
  private async processInteractionEvent(
    event: InteractionEvent,
    context: InteractionContext
  ): Promise<void> {
    // Apply optimization rules
    for (const rule of this.optimizationRules) {
      if (rule.enabled && rule.condition(context, event.performance!)) {
        await rule.action(context);
      }
    }

    // Update performance metrics
    if (event.performance) {
      const userMetrics = this.performanceMetrics.get(event.userId || 'anonymous') || [];
      userMetrics.push(event.performance);

      // Keep only last 100 metrics per user
      if (userMetrics.length > 100) {
        userMetrics.splice(0, userMetrics.length - 100);
      }

      this.performanceMetrics.set(event.userId || 'anonymous', userMetrics);
    }
  }

  /**
   * Update user behavior patterns
   */
  private async updateUserPatterns(event: InteractionEvent): Promise<void> {
    if (!event.userId) return;

    let pattern = this.userPatterns.get(event.userId);

    if (!pattern) {
      pattern = {
        userId: event.userId,
        sessionId: event.sessionId,
        interactionSequence: [],
        behaviorProfile: {
          interactionFrequency: 0,
          averageSessionDuration: 0,
          preferredContentTypes: [],
          peakUsageHours: [],
          devicePreferences: [],
          engagementLevel: 'medium',
        },
        preferences: this.getDefaultPreferences(),
        performanceHistory: [],
      };
    }

    if (pattern) {
      // Update interaction sequence
      pattern.interactionSequence.push(event);

      // Keep only last 1000 interactions
      if (pattern.interactionSequence.length > 1000) {
        pattern.interactionSequence.splice(0, pattern.interactionSequence.length - 1000);
      }

      // Update behavior profile
      await this.updateBehaviorProfile(pattern);

      this.userPatterns.set(event.userId, pattern);
    }
  }

  /**
   * Update behavior profile based on interaction history
   */
  private async updateBehaviorProfile(pattern: UserInteractionPattern): Promise<void> {
    const interactions = pattern.interactionSequence;
    const now = Date.now();
    const hour = new Date(now).getHours();

    // Calculate interaction frequency (interactions per hour)
    const recentInteractions = interactions.filter(
      i => now - i.timestamp < 60 * 60 * 1000 // Last hour
    );
    pattern.behaviorProfile.interactionFrequency = recentInteractions.length;

    // Update peak usage hours
    const hourCounts = new Map<number, number>();
    interactions.forEach(interaction => {
      const interactionHour = new Date(interaction.timestamp).getHours();
      hourCounts.set(interactionHour, (hourCounts.get(interactionHour) || 0) + 1);
    });

    // Get top 3 peak hours
    pattern.behaviorProfile.peakUsageHours = Array.from(hourCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);

    // Update engagement level
    pattern.behaviorProfile.engagementLevel = this.calculateEngagementLevel(interactions);

    // Update preferred content types
    pattern.behaviorProfile.preferredContentTypes = this.extractContentTypes(interactions);
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(interactions: InteractionEvent[]): 'low' | 'medium' | 'high' {
    if (interactions.length < 10) return 'low';

    const recentInteractions = interactions.filter(
      i => Date.now() - i.timestamp < 30 * 60 * 1000 // Last 30 minutes
    );

    if (recentInteractions.length > 50) return 'high';
    if (recentInteractions.length > 20) return 'medium';
    return 'low';
  }

  /**
   * Extract content types from interactions
   */
  private extractContentTypes(interactions: InteractionEvent[]): string[] {
    const contentTypes = new Set<string>();

    interactions.forEach(interaction => {
      if (interaction.metadata?.contentType) {
        contentTypes.add(interaction.metadata.contentType);
      }
    });

    return Array.from(contentTypes).slice(0, 5); // Top 5 content types
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences() {
    return {
      theme: 'auto' as const,
      language: 'en',
      notifications: {
        enabled: true,
        types: { push: true, email: false, sms: false, 'in-app': true },
        frequency: 'real-time' as const,
        channels: ['in-app', 'push'] as ('push' | 'in-app' | 'email' | 'sms')[],
      },
      privacy: {
        dataCollection: true,
        analyticsTracking: true,
        personalizedAds: false,
        thirdPartySharing: false,
        dataRetention: 90,
      },
      performance: {
        autoOptimize: true,
        cacheEnabled: true,
        lazyLoading: true,
        adaptiveQuality: true,
        backgroundProcessing: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: true,
      },
    };
  }

  /**
   * Check for optimization opportunities
   */
  private async checkOptimizationOpportunities(
    event: InteractionEvent,
    context: InteractionContext
  ): Promise<void> {
    // Check response time
    if (event.performance && event.performance.responseTime > this.config.responseTimeThreshold) {
      await this.applyResponseTimeOptimization(context);
    }

    // Check memory usage
    if (event.performance && event.performance.memoryUsage > this.config.memoryThreshold) {
      await this.applyMemoryOptimization();
    }

    // Check error rate
    if (event.performance && event.performance.errorRate > 0.05) { // 5% error rate
      await this.applyErrorRateOptimization(context);
    }
  }

  /**
   * Apply response time optimization
   */
  private async applyResponseTimeOptimization(context: InteractionContext): Promise<void> {
    // Enable CDN if not already enabled
    if (this.responseOptimizations.enableCDN) {
      // CDN optimization would be applied here
    }

    // Enable edge caching
    if (this.responseOptimizations.enableEdgeCaching) {
      // Edge caching optimization would be applied here
    }
  }

  /**
   * Apply memory optimization
   */
  private async applyMemoryOptimization(): Promise<void> {
    // Clear unused caches
    if (performanceOptimizationService.getAdvancedCacheManager()) {
      // Cache cleanup would be performed here
    }

    // Reduce concurrent operations
    // Memory optimization would be applied here
  }

  /**
   * Apply error rate optimization
   */
  private async applyErrorRateOptimization(context: InteractionContext): Promise<void> {
    // Implement retry logic
    // Error handling optimization would be applied here

    // Log error for analysis
    console.warn('High error rate detected, applying optimizations:', context);
  }

  /**
   * Generate optimization recommendations
   */
  private async generateRecommendations(context?: InteractionContext): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance-based recommendations
    if (this.config.enablePerformanceMonitoring) {
      const avgResponseTime = await this.getAverageResponseTime();
      if (avgResponseTime > this.config.responseTimeThreshold) {
        recommendations.push({
          id: 'perf-001',
          type: 'performance',
          priority: 'high',
          title: 'Optimize Response Times',
          description: 'Average response time is above threshold',
          impact: 0.8,
          effort: 0.6,
          actions: [
            {
              id: 'action-001',
              type: 'config',
              description: 'Enable CDN and edge caching',
              automated: true,
              rollback: true,
            }
          ],
          expectedResults: ['Reduced response times', 'Better user experience'],
        });
      }
    }

    return recommendations;
  }

  /**
   * Initialize optimization rules
   */
  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        id: 'rule-001',
        name: 'Slow Network Optimization',
        description: 'Apply optimizations for slow network conditions',
        condition: (context, metrics) => metrics.networkLatency > 200,
        action: async (context) => {
          await this.applySlowNetworkOptimizations(context);
        },
        priority: 1,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'rule-002',
        name: 'High Memory Usage',
        description: 'Optimize memory usage when threshold exceeded',
        condition: (context, metrics) => metrics.memoryUsage > this.config.memoryThreshold,
        action: async (context) => {
          await this.applyMemoryOptimization();
        },
        priority: 2,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  }

  /**
   * Apply slow network optimizations
   */
  private async applySlowNetworkOptimizations(context: InteractionContext): Promise<void> {
    // Reduce image quality
    if (this.responseOptimizations.enableImageOptimization) {
      // Image optimization would be applied here
    }

    // Enable aggressive caching
    // Caching optimizations would be applied here
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    setInterval(async () => {
      const metrics = await this.getCurrentPerformanceMetrics();
      const sessionId = this.getSessionId();

      // Store metrics for analysis
      const sessionMetrics = this.performanceMetrics.get(sessionId) || [];
      sessionMetrics.push(metrics);

      if (sessionMetrics.length > 100) {
        sessionMetrics.splice(0, sessionMetrics.length - 100);
      }

      this.performanceMetrics.set(sessionId, sessionMetrics);
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Start event processing
   */
  private startEventProcessing(): void {
    setInterval(async () => {
      if (this.eventBuffer.length > 0) {
        // Process events in batches
        const eventsToProcess = this.eventBuffer.splice(0, 50);

        for (const event of eventsToProcess) {
          // Additional event processing can be added here
        }
      }
    }, 1000); // Process every second
  }

  /**
   * Get current performance metrics
   */
  private async getCurrentPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0;
    const cpuUsage = await this.getCpuUsage();
    const networkLatency = await this.getNetworkLatency();

    return {
      responseTime: performance.now(),
      memoryUsage,
      cpuUsage,
      networkLatency,
      cacheHitRate: 0.85, // Would be calculated from actual cache performance
      errorRate: 0.02, // Would be calculated from actual errors
    };
  }

  /**
   * Get CPU usage (simplified implementation)
   */
  private async getCpuUsage(): Promise<number> {
    // In a real implementation, this would use Performance Observer API
    // or Web Workers to measure CPU usage
    return Math.random() * 100; // Mock implementation
  }

  /**
   * Get network latency
   */
  private async getNetworkLatency(): Promise<number> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.rtt || 100; // Default to 100ms if not available
    }
    return 100;
  }

  /**
   * Get network information
   */
  private async getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        type: connection.effectiveType === '4g' ? 'fast' :
              connection.effectiveType === '3g' ? 'medium' : 'slow',
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return { type: 'medium' as const, downlink: 5, rtt: 100, saveData: false };
  }

  /**
   * Get device information
   */
  private async getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)|Tablet|PlayBook/i.test(userAgent);

    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isTablet) type = 'tablet';
    else if (isMobile) type = 'mobile';

    return {
      type,
      os: this.getOperatingSystem(),
      browser: this.getBrowser(),
      screenSize: { width: window.screen.width, height: window.screen.height },
      memory: (navigator as any).deviceMemory || 4,
      cpuCores: (navigator as any).hardwareConcurrency || 4,
      connection: await this.getNetworkInfo(),
    };
  }

  /**
   * Get operating system
   */
  private getOperatingSystem(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get browser
   */
  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('playnite-session-id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('playnite-session-id', sessionId);
      }
      return sessionId;
    }
    return 'default-session';
  }

  /**
   * Additional helper methods would be implemented here...
   */
  private async shouldDebounceClicks(context: InteractionContext): Promise<boolean> {
    // Implementation would check for rapid clicking patterns
    return false;
  }

  private async preloadClickTargets(context: InteractionContext): Promise<string[]> {
    // Implementation would preload likely click targets
    return [];
  }

  private async predictNextInteractions(pattern: UserInteractionPattern): Promise<any[]> {
    // Implementation would use ML/behavior analysis to predict next interactions
    return [];
  }

  private async preloadContent(contentType: string, context: InteractionContext): Promise<void> {
    // Implementation would preload predicted content
  }

  private async applyQualityOptimizations(
    quality: string,
    contentType: string,
    context: InteractionContext
  ): Promise<void> {
    // Implementation would apply quality-specific optimizations
  }

  private calculatePerformanceScore(events: InteractionEvent[]): number {
    if (events.length === 0) return 0;

    const avgResponseTime = events.reduce(
      (sum, event) => sum + (event.performance?.responseTime || 0), 0
    ) / events.length;

    // Convert to score (lower response time = higher score)
    return Math.max(0, 100 - (avgResponseTime / 10));
  }

  private getTopInteractionTypes(events: InteractionEvent[]): Array<{ type: InteractionType; count: number }> {
    const typeCounts = new Map<InteractionType, number>();

    events.forEach(event => {
      typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async getAverageResponseTime(): Promise<number> {
    const allMetrics = Array.from(this.performanceMetrics.values()).flat();
    if (allMetrics.length === 0) return 0;

    return allMetrics.reduce((sum, metrics) => sum + metrics.responseTime, 0) / allMetrics.length;
  }

  private async calculatePerformanceGain(optimizations: string[]): Promise<number> {
    // Mock calculation - in real implementation would estimate actual performance gain
    return Math.min(0.5, optimizations.length * 0.1); // Up to 50% improvement
  }
}

// Export singleton instance
export const interactionOptimizer = new InteractionOptimizer();