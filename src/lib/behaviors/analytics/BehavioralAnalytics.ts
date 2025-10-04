/**
 * @fileOverview Behavioral Analytics service for tracking and analyzing user interaction patterns
 *
 * The BehavioralAnalytics service provides comprehensive analytics for user behavior,
 * interaction patterns, and engagement metrics to optimize user experience.
 */

import {
  UserBehavior,
  InteractionPattern,
  BehavioralInsight,
  BehaviorMetrics,
  EngagementMetrics,
  NavigationMetrics,
  SocialMetrics,
  ContentMetrics,
  BehaviorAPIResponse,
  BehaviorError,
  SmartInteractionContext
} from '../types';

export interface AnalyticsConfig {
  enableRealTimeAnalytics: boolean;
  enableBatchProcessing: boolean;
  enableAnomalyDetection: boolean;
  enableTrendAnalysis: boolean;
  dataRetentionDays: number;
  batchSize: number;
  flushInterval: number;
  minSampleSize: number;
}

export interface AnalyticsQuery {
  userId?: string;
  userSegment?: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics?: string[];
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, any>;
}

export class BehavioralAnalytics {
  private config: AnalyticsConfig;
  private behaviorBuffer: UserBehavior[] = [];
  private insightsCache: Map<string, BehavioralInsight[]> = new Map();
  private metricsCache: Map<string, BehaviorMetrics> = new Map();

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableRealTimeAnalytics: true,
      enableBatchProcessing: true,
      enableAnomalyDetection: true,
      enableTrendAnalysis: true,
      dataRetentionDays: 90,
      batchSize: 1000,
      flushInterval: 300000, // 5 minutes
      minSampleSize: 10,
      ...config
    };

    // Start batch processing if enabled
    if (this.config.enableBatchProcessing) {
      this.startBatchProcessing();
    }
  }

  /**
   * Track a user behavior event
   */
  async trackBehavior(behavior: UserBehavior): Promise<BehaviorAPIResponse<void>> {
    try {
      // Add to buffer for batch processing
      this.behaviorBuffer.push(behavior);

      // Process in real-time if enabled
      if (this.config.enableRealTimeAnalytics) {
        await this.processBehaviorRealTime(behavior);
      }

      // Flush buffer if it reaches batch size
      if (this.behaviorBuffer.length >= this.config.batchSize) {
        await this.flushBuffer();
      }

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId: behavior.userId, context: 'trackBehavior' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get comprehensive behavior metrics for a user or segment
   */
  async getBehaviorMetrics(query: AnalyticsQuery): Promise<BehaviorAPIResponse<BehaviorMetrics>> {
    try {
      const cacheKey = this.generateCacheKey(query);

      // Check cache first
      const cached = this.metricsCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timeframe.end)) {
        return {
          success: true,
          data: cached,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId(),
            cached: true
          }
        };
      }

      // Filter behaviors based on query
      const relevantBehaviors = await this.filterBehaviors(query);

      // Calculate metrics
      const metrics = await this.calculateMetrics(relevantBehaviors, query);

      // Cache the results
      this.metricsCache.set(cacheKey, metrics);

      return {
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId(),
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'getBehaviorMetrics' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get behavioral insights and recommendations
   */
  async getBehavioralInsights(query: AnalyticsQuery): Promise<BehaviorAPIResponse<BehavioralInsight[]>> {
    try {
      const cacheKey = `insights_${this.generateCacheKey(query)}`;

      // Check cache first
      const cached = this.insightsCache.get(cacheKey);
      if (cached && this.isCacheValid(query.timeframe.end)) {
        return {
          success: true,
          data: cached,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId(),
            cached: true
          }
        };
      }

      // Filter behaviors for analysis
      const relevantBehaviors = await this.filterBehaviors(query);

      // Generate insights
      const insights = await this.generateInsights(relevantBehaviors, query);

      // Cache the results
      this.insightsCache.set(cacheKey, insights);

      return {
        success: true,
        data: insights,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId(),
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'getBehavioralInsights' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Detect anomalies in user behavior patterns
   */
  async detectAnomalies(query: AnalyticsQuery): Promise<BehaviorAPIResponse<BehavioralInsight[]>> {
    try {
      if (!this.config.enableAnomalyDetection) {
        return {
          success: true,
          data: [],
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      const behaviors = await this.filterBehaviors(query);
      const anomalies = await this.identifyAnomalies(behaviors, query);

      return {
        success: true,
        data: anomalies,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'detectAnomalies' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Analyze behavior trends over time
   */
  async analyzeTrends(query: AnalyticsQuery): Promise<BehaviorAPIResponse<Record<string, any>>> {
    try {
      if (!this.config.enableTrendAnalysis) {
        return {
          success: true,
          data: {},
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      const behaviors = await this.filterBehaviors(query);
      const trends = await this.calculateTrends(behaviors, query);

      return {
        success: true,
        data: trends,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'analyzeTrends' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(timeframe: { start: Date; end: Date }): Promise<BehaviorAPIResponse<{
    overview: Record<string, number>;
    trends: Record<string, any>;
    insights: BehavioralInsight[];
    segments: Record<string, any>;
  }>> {
    try {
      const query: AnalyticsQuery = { timeframe };

      // Get overview metrics
      const overviewResult = await this.getBehaviorMetrics(query);
      const overview = overviewResult.success && overviewResult.data ?
        this.extractOverviewMetrics(overviewResult.data) : {};

      // Get trends
      const trendsResult = await this.analyzeTrends(query);
      const trends = trendsResult.success ? trendsResult.data || {} : {};

      // Get insights
      const insightsResult = await this.getBehavioralInsights(query);
      const insights = insightsResult.success ? insightsResult.data || [] : [];

      // Get user segments
      const segments = await this.analyzeUserSegments(query);

      return {
        success: true,
        data: {
          overview,
          trends,
          insights,
          segments
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'getAnalyticsDashboard' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Clear analytics data for a user (privacy compliance)
   */
  async clearUserData(userId: string): Promise<BehaviorAPIResponse<void>> {
    try {
      // Clear from buffer
      this.behaviorBuffer = this.behaviorBuffer.filter(b => b.userId !== userId);

      // Clear from caches
      for (const [key, metrics] of this.metricsCache.entries()) {
        if (key.includes(userId)) {
          this.metricsCache.delete(key);
        }
      }

      for (const [key, insights] of this.insightsCache.entries()) {
        if (key.includes(userId)) {
          this.insightsCache.delete(key);
        }
      }

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId, context: 'clearUserData' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  // Private helper methods

  private async processBehaviorRealTime(behavior: UserBehavior): Promise<void> {
    // Update real-time metrics
    const query: AnalyticsQuery = {
      userId: behavior.userId,
      timeframe: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      }
    };

    // Invalidate relevant caches
    this.invalidateCaches(query);
  }

  private async flushBuffer(): Promise<void> {
    if (this.behaviorBuffer.length === 0) return;

    const batch = [...this.behaviorBuffer];
    this.behaviorBuffer = [];

    // Process batch in background
    setImmediate(async () => {
      try {
        await this.processBatch(batch);
      } catch (error) {
        console.error('Error processing behavior batch:', error);
      }
    });
  }

  private async processBatch(behaviors: UserBehavior[]): Promise<void> {
    // Group by user for efficient processing
    const userGroups = new Map<string, UserBehavior[]>();
    behaviors.forEach(behavior => {
      const userId = behavior.userId;
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
      }
      userGroups.get(userId)!.push(behavior);
    });

    // Process each user's behaviors
    for (const [userId, userBehaviors] of userGroups.entries()) {
      const query: AnalyticsQuery = {
        userId,
        timeframe: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        }
      };

      // Invalidate caches for this user
      this.invalidateCaches(query);

      // Generate new insights if needed
      await this.generateInsights(userBehaviors, query);
    }
  }

  private async filterBehaviors(query: AnalyticsQuery): Promise<UserBehavior[]> {
    // In a real implementation, this would query a database
    // For now, we'll filter the in-memory buffer
    return this.behaviorBuffer.filter(behavior => {
      // Filter by user
      if (query.userId && behavior.userId !== query.userId) {
        return false;
      }

      // Filter by timeframe
      if (behavior.timestamp < query.timeframe.start || behavior.timestamp > query.timeframe.end) {
        return false;
      }

      // Apply additional filters
      if (query.filters) {
        for (const [key, value] of Object.entries(query.filters)) {
          const behaviorValue = (behavior as any)[key];
          if (behaviorValue !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  private async calculateMetrics(behaviors: UserBehavior[], query: AnalyticsQuery): Promise<BehaviorMetrics> {
    const engagement = this.calculateEngagementMetrics(behaviors);
    const navigation = this.calculateNavigationMetrics(behaviors);
    const social = this.calculateSocialMetrics(behaviors);
    const content = this.calculateContentMetrics(behaviors);

    return {
      userId: query.userId || 'aggregate',
      timeframe: query.timeframe,
      metrics: {
        engagement,
        navigation,
        social,
        content
      },
      insights: []
    };
  }

  private calculateEngagementMetrics(behaviors: UserBehavior[]): EngagementMetrics {
    const engagementBehaviors = behaviors.filter(b =>
      ['view', 'watch', 'read', 'interact'].includes(b.action)
    );

    const totalInteractions = behaviors.length;
    const sessionGroups = new Map<string, UserBehavior[]>();

    // Group by session
    behaviors.forEach(behavior => {
      if (!sessionGroups.has(behavior.sessionId)) {
        sessionGroups.set(behavior.sessionId, []);
      }
      sessionGroups.get(behavior.sessionId)!.push(behavior);
    });

    const sessions = Array.from(sessionGroups.values());
    const averageSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, session) => {
          if (session.length < 2) return sum;
          const duration = session[session.length - 1].timestamp.getTime() - session[0].timestamp.getTime();
          return sum + duration;
        }, 0) / sessions.length / (1000 * 60) // Convert to minutes
      : 0;

    const bounceSessions = sessions.filter(session => session.length === 1).length;
    const bounceRate = sessions.length > 0 ? bounceSessions / sessions.length : 0;

    const completionBehaviors = behaviors.filter(b => b.action === 'complete' || b.metadata?.completed);
    const completionRate = totalInteractions > 0 ? completionBehaviors.length / totalInteractions : 0;

    const interactionRate = totalInteractions / Math.max(sessions.length, 1);

    const firstInteractions = sessions.map(session => session[0]);
    const timeToFirstInteraction = firstInteractions.length > 0
      ? firstInteractions.reduce((sum, behavior) => sum + behavior.timestamp.getTime(), 0) / firstInteractions.length
      : 0;

    return {
      totalInteractions,
      averageSessionDuration,
      bounceRate,
      completionRate,
      interactionRate,
      timeToFirstInteraction
    };
  }

  private calculateNavigationMetrics(behaviors: UserBehavior[]): NavigationMetrics {
    const navigationBehaviors = behaviors.filter(b =>
      ['navigate', 'click', 'scroll', 'search'].includes(b.action)
    );

    const pageViews = new Set(behaviors.map(b => b.target)).size;
    const uniquePages = new Set(behaviors.filter(b => b.target.startsWith('page:')).map(b => b.target)).size;

    const entryPages = behaviors.filter(b => b.metadata?.entryPoint).map(b => b.target);
    const exitPages = behaviors.filter(b => b.metadata?.exitPoint).map(b => b.target);

    const navigationPaths = this.calculateNavigationPaths(behaviors);
    const searchBehaviors = behaviors.filter(b => b.action === 'search');
    const searchUsage = searchBehaviors.length;

    return {
      pageViews,
      uniquePages,
      entryPages,
      exitPages,
      navigationPaths,
      searchUsage
    };
  }

  private calculateNavigationPaths(behaviors: UserBehavior[]): NavigationMetrics['navigationPaths'] {
    const paths: NavigationMetrics['navigationPaths'] = [];
    const pathMap = new Map<string, { to: string; count: number }>();

    // Sort behaviors by timestamp
    const sortedBehaviors = [...behaviors].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedBehaviors.length - 1; i++) {
      const current = sortedBehaviors[i];
      const next = sortedBehaviors[i + 1];

      if (current.sessionId === next.sessionId) {
        const pathKey = `${current.target}->${next.target}`;
        const existing = pathMap.get(pathKey);

        if (existing) {
          existing.count++;
        } else {
          pathMap.set(pathKey, {
            to: next.target,
            count: 1
          });
        }
      }
    }

    return Array.from(pathMap.entries()).map(([from, data]) => ({
      from: from.split('->')[0],
      to: data.to,
      frequency: data.count,
      averageTime: 0 // Would need more sophisticated calculation
    }));
  }

  private calculateSocialMetrics(behaviors: UserBehavior[]): SocialMetrics {
    const socialBehaviors = behaviors.filter(b =>
      ['like', 'comment', 'share', 'follow', 'unfollow'].includes(b.action)
    );

    const likes = behaviors.filter(b => b.action === 'like').length;
    const comments = behaviors.filter(b => b.action === 'comment').length;
    const shares = behaviors.filter(b => b.action === 'share').length;
    const follows = behaviors.filter(b => b.action === 'follow').length;
    const unfollows = behaviors.filter(b => b.action === 'unfollow').length;
    const socialInteractions = socialBehaviors.length;

    return {
      likes,
      comments,
      shares,
      follows,
      unfollows,
      socialInteractions
    };
  }

  private calculateContentMetrics(behaviors: UserBehavior[]): ContentMetrics {
    const contentBehaviors = behaviors.filter(b =>
      b.target.startsWith('content:') || b.target.startsWith('video:')
    );

    const views = behaviors.filter(b => b.action === 'view').length;
    const completions = behaviors.filter(b => b.action === 'complete' || b.metadata?.completed).length;

    const watchTimeBehaviors = behaviors.filter(b => b.metadata?.watchTime);
    const averageWatchTime = watchTimeBehaviors.length > 0
      ? watchTimeBehaviors.reduce((sum, b) => sum + (b.metadata?.watchTime || 0), 0) / watchTimeBehaviors.length
      : 0;

    const contentTypes = new Map<string, number>();
    const categories = new Map<string, number>();
    const creators = new Map<string, number>();

    contentBehaviors.forEach(behavior => {
      if (behavior.metadata?.contentType) {
        contentTypes.set(behavior.metadata.contentType, (contentTypes.get(behavior.metadata.contentType) || 0) + 1);
      }
      if (behavior.metadata?.category) {
        categories.set(behavior.metadata.category, (categories.get(behavior.metadata.category) || 0) + 1);
      }
      if (behavior.metadata?.creator) {
        creators.set(behavior.metadata.creator, (creators.get(behavior.metadata.creator) || 0) + 1);
      }
    });

    return {
      views,
      completions,
      averageWatchTime,
      contentTypes: Object.fromEntries(contentTypes),
      categories: Object.fromEntries(categories),
      creators: Object.fromEntries(creators)
    };
  }

  private async generateInsights(behaviors: UserBehavior[], query: AnalyticsQuery): Promise<BehavioralInsight[]> {
    const insights: BehavioralInsight[] = [];

    if (behaviors.length < this.config.minSampleSize) {
      return insights;
    }

    // Generate engagement insights
    const engagementMetrics = this.calculateEngagementMetrics(behaviors);
    if (engagementMetrics.completionRate > 0.8) {
      insights.push({
        insightId: `high_completion_${Date.now()}`,
        type: 'opportunity',
        userId: query.userId,
        metric: 'completion_rate',
        value: engagementMetrics.completionRate,
        change: 0,
        confidence: 0.9,
        timeframe: 'current',
        description: 'User shows high content completion rate, indicating strong engagement',
        recommendations: ['Continue recommending similar content', 'Increase content difficulty/complexity']
      });
    }

    // Generate social insights
    const socialMetrics = this.calculateSocialMetrics(behaviors);
    if (socialMetrics.socialInteractions > socialMetrics.likes + socialMetrics.comments) {
      insights.push({
        insightId: `social_engagement_${Date.now()}`,
        type: 'trend',
        userId: query.userId,
        metric: 'social_engagement',
        value: socialMetrics.socialInteractions,
        change: 0,
        confidence: 0.8,
        timeframe: 'current',
        description: 'User is highly socially active',
        recommendations: ['Recommend more social features', 'Suggest community interactions']
      });
    }

    // Generate navigation insights
    const navigationMetrics = this.calculateNavigationMetrics(behaviors);
    if (navigationMetrics.bounceRate && navigationMetrics.bounceRate < 0.3) {
      insights.push({
        insightId: `low_bounce_${Date.now()}`,
        type: 'opportunity',
        userId: query.userId,
        metric: 'bounce_rate',
        value: navigationMetrics.bounceRate,
        change: 0,
        confidence: 0.85,
        timeframe: 'current',
        description: 'User has low bounce rate, indicating good content relevance',
        recommendations: ['Maintain current recommendation strategy', 'Test similar content types']
      });
    }

    return insights;
  }

  private async identifyAnomalies(behaviors: UserBehavior[], query: AnalyticsQuery): Promise<BehavioralInsight[]> {
    const anomalies: BehavioralInsight[] = [];

    // Simple anomaly detection based on frequency thresholds
    const actionCounts = new Map<string, number>();
    behaviors.forEach(behavior => {
      actionCounts.set(behavior.action, (actionCounts.get(behavior.action) || 0) + 1);
    });

    const averageFrequency = behaviors.length / Math.max(actionCounts.size, 1);

    for (const [action, count] of actionCounts.entries()) {
      if (count > averageFrequency * 3) { // 3x higher than average
        anomalies.push({
          insightId: `anomaly_${action}_${Date.now()}`,
          type: 'anomaly',
          userId: query.userId,
          metric: action,
          value: count,
          change: count / averageFrequency,
          confidence: 0.7,
          timeframe: 'current',
          description: `Unusual spike in ${action} behavior`,
          recommendations: ['Investigate potential bot activity', 'Check for UI issues causing repetitive actions']
        });
      }
    }

    return anomalies;
  }

  private async calculateTrends(behaviors: UserBehavior[], query: AnalyticsQuery): Promise<Record<string, any>> {
    // Group behaviors by time period
    const timeGroups = new Map<string, UserBehavior[]>();

    behaviors.forEach(behavior => {
      const date = behavior.timestamp;
      const key = this.formatTimeKey(date, query.groupBy || 'day');
      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }
      timeGroups.get(key)!.push(behavior);
    });

    const trends: Record<string, any> = {};

    // Calculate trends for each time period
    for (const [period, periodBehaviors] of timeGroups.entries()) {
      const metrics = this.calculateEngagementMetrics(periodBehaviors);
      trends[period] = {
        interactions: periodBehaviors.length,
        engagement: metrics,
        topActions: this.getTopActions(periodBehaviors)
      };
    }

    return trends;
  }

  private formatTimeKey(date: Date, groupBy: string): string {
    switch (groupBy) {
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth()}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private getTopActions(behaviors: UserBehavior[]): Array<{ action: string; count: number }> {
    const actionCounts = new Map<string, number>();

    behaviors.forEach(behavior => {
      actionCounts.set(behavior.action, (actionCounts.get(behavior.action) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async analyzeUserSegments(query: AnalyticsQuery): Promise<Record<string, any>> {
    // Simple user segmentation based on behavior patterns
    const behaviors = await this.filterBehaviors(query);

    const segments = {
      high_engagement: behaviors.filter(b => ['view', 'watch', 'complete'].includes(b.action)).length,
      social_butterfly: behaviors.filter(b => ['like', 'comment', 'share'].includes(b.action)).length,
      explorer: behaviors.filter(b => ['navigate', 'search'].includes(b.action)).length,
      casual_browser: behaviors.filter(b => b.action === 'click').length
    };

    return segments;
  }

  private extractOverviewMetrics(metrics: BehaviorMetrics): Record<string, number> {
    return {
      totalInteractions: metrics.metrics.engagement.totalInteractions,
      averageSessionDuration: metrics.metrics.engagement.averageSessionDuration,
      bounceRate: metrics.metrics.engagement.bounceRate,
      completionRate: metrics.metrics.engagement.completionRate,
      socialInteractions: metrics.metrics.social.socialInteractions,
      pageViews: metrics.metrics.navigation.pageViews
    };
  }

  private generateCacheKey(query: AnalyticsQuery): string {
    return `${query.userId || 'all'}_${query.timeframe.start.getTime()}_${query.timeframe.end.getTime()}_${query.groupBy || 'none'}`;
  }

  private isCacheValid(timestamp: Date): boolean {
    const cacheAge = Date.now() - timestamp.getTime();
    return cacheAge < this.config.flushInterval;
  }

  private invalidateCaches(query: AnalyticsQuery): void {
    const prefix = `${query.userId || 'all'}_${query.timeframe.start.getTime()}`;
    for (const key of this.metricsCache.keys()) {
      if (key.startsWith(prefix)) {
        this.metricsCache.delete(key);
      }
    }

    for (const key of this.insightsCache.keys()) {
      if (key.includes(prefix)) {
        this.insightsCache.delete(key);
      }
    }
  }

  private startBatchProcessing(): void {
    setInterval(async () => {
      await this.flushBuffer();
    }, this.config.flushInterval);
  }

  private createBehaviorError(error: any, context?: Record<string, any>): BehaviorError {
    return {
      name: error.name || 'AnalyticsError',
      message: error.message || 'Unknown analytics error',
      code: error.code || 'ANALYTICS_ERROR',
      context,
      timestamp: new Date(),
      retryable: error.retryable !== false,
      stack: error.stack
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const behavioralAnalytics = new BehavioralAnalytics();