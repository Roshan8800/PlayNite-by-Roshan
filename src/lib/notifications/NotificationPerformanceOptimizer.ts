// Notification Performance Optimizer - Delivery optimization and performance monitoring
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  AdvancedNotificationAnalytics,
  ChannelPerformance,
  NotificationChannel,
  EnhancedNotification,
  DeliveryStrategy,
} from './types';
import type {
  Notification as NotificationType,
} from '../types/social';
import { SocialError } from '../types/social';

export class NotificationPerformanceOptimizer {
  private static instance: NotificationPerformanceOptimizer;
  private optimizationRules: Map<string, any> = new Map();
  private performanceCache: Map<string, any> = new Map();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.initializeOptimizer();
    this.startOptimizationCycle();
  }

  public static getInstance(): NotificationPerformanceOptimizer {
    if (!NotificationPerformanceOptimizer.instance) {
      NotificationPerformanceOptimizer.instance = new NotificationPerformanceOptimizer();
    }
    return NotificationPerformanceOptimizer.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeOptimizer(): Promise<void> {
    try {
      // Load optimization rules
      await this.loadOptimizationRules();

      // Load performance baselines
      await this.loadPerformanceBaselines();

      console.log('Notification Performance Optimizer initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Performance Optimizer:', error);
    }
  }

  private async loadOptimizationRules(): Promise<void> {
    try {
      const rulesQuery = query(
        collection(db, 'notificationOptimizationRules'),
        where('isActive', '==', true),
        orderBy('priority', 'desc')
      );

      const querySnapshot = await getDocs(rulesQuery);
      querySnapshot.docs.forEach(doc => {
        const rule = { id: doc.id, ...doc.data() };
        this.optimizationRules.set(doc.id, rule);
      });
    } catch (error) {
      console.error('Failed to load optimization rules:', error);
    }
  }

  private async loadPerformanceBaselines(): Promise<void> {
    try {
      // Load historical performance data for comparison
      const baselinesQuery = query(
        collection(db, 'notificationPerformanceBaselines'),
        orderBy('createdAt', 'desc'),
        limit(30) // Last 30 days
      );

      const querySnapshot = await getDocs(baselinesQuery);
      const baselines = querySnapshot.docs.map(doc => ({ date: doc.id, ...doc.data() }));

      // Store in cache for quick access
      baselines.forEach(baseline => {
        this.performanceCache.set(`baseline_${baseline.date}`, baseline);
      });
    } catch (error) {
      console.error('Failed to load performance baselines:', error);
    }
  }

  private startOptimizationCycle(): void {
    // Run optimization analysis every hour
    setInterval(() => {
      this.runOptimizationAnalysis();
    }, 60 * 60 * 1000);
  }

  // ==================== PERFORMANCE ANALYSIS ====================

  async analyzePerformance(
    userId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    overallScore: number;
    channelScores: Record<NotificationChannel, number>;
    recommendations: string[];
    optimizations: Array<{
      type: string;
      description: string;
      expectedImprovement: number;
      priority: 'low' | 'medium' | 'high';
    }>;
  }> {
    try {
      // Get current performance data
      const currentPerformance = await this.getCurrentPerformance(userId, period);

      // Calculate performance scores
      const overallScore = this.calculateOverallScore(currentPerformance);
      const channelScores = this.calculateChannelScores(currentPerformance);

      // Generate recommendations
      const recommendations = await this.generatePerformanceRecommendations(currentPerformance);

      // Identify optimization opportunities
      const optimizations = await this.identifyOptimizations(currentPerformance, userId);

      return {
        overallScore,
        channelScores,
        recommendations,
        optimizations,
      };
    } catch (error) {
      console.error('Failed to analyze performance:', error);
      return {
        overallScore: 50,
        channelScores: {
          inApp: 50,
          push: 50,
          email: 50,
          sms: 50,
          webhook: 50,
        },
        recommendations: [],
        optimizations: [],
      };
    }
  }

  private async getCurrentPerformance(
    userId: string,
    period: string
  ): Promise<AdvancedNotificationAnalytics> {
    try {
      // This would typically use the NotificationAnalytics service
      // For now, return mock data structure
      const { startDate, endDate } = this.getDateRange(period as 'day' | 'week' | 'month');

      // Get notifications for the period
      const notifications = await this.getNotificationsInRange(userId, startDate, endDate);

      // Get tracking events for the period
      const events = await this.getTrackingEventsInRange(userId, startDate, endDate);

      return await this.calculatePerformanceMetrics(notifications, events, period, userId);
    } catch (error) {
      console.error('Failed to get current performance:', error);
      throw error;
    }
  }

  private calculateOverallScore(performance: AdvancedNotificationAnalytics): number {
    try {
      let score = 50; // Base score

      // Engagement rate contribution (30%)
      score += (performance.engagementRate / 100) * 30;

      // Conversion rate contribution (25%)
      score += (performance.conversionRate / 100) * 25;

      // Channel performance contribution (20%)
      const avgChannelScore = Object.values(performance.channelPerformance)
        .reduce((acc, channel) => acc + (channel.totalDelivered / Math.max(channel.totalSent, 1)) * 100, 0) /
        Object.values(performance.channelPerformance).length;
      score += (avgChannelScore / 100) * 20;

      // Bounce rate penalty (15%)
      score -= (performance.bounceRate / 100) * 15;

      // Complaint rate penalty (10%)
      score -= (performance.complaintRate / 100) * 10;

      return Math.min(Math.max(score, 0), 100);
    } catch (error) {
      console.error('Failed to calculate overall score:', error);
      return 50;
    }
  }

  private calculateChannelScores(performance: AdvancedNotificationAnalytics): Record<NotificationChannel, number> {
    try {
      const channelScores: Record<NotificationChannel, number> = {
        inApp: 50,
        push: 50,
        email: 50,
        sms: 50,
        webhook: 50,
      };

      Object.entries(performance.channelPerformance).forEach(([channel, metrics]) => {
        let score = 50;

        // Delivery rate (40%)
        const deliveryRate = metrics.totalSent > 0 ? (metrics.totalDelivered / metrics.totalSent) * 100 : 0;
        score += (deliveryRate / 100) * 40;

        // Engagement rate (30%)
        const engagementRate = metrics.totalDelivered > 0 ? (metrics.totalOpened / metrics.totalDelivered) * 100 : 0;
        score += (engagementRate / 100) * 30;

        // Average delivery time (15%)
        const avgTimeScore = Math.max(0, 100 - (metrics.avgDeliveryTime / 1000)); // Penalize slow delivery
        score += (avgTimeScore / 100) * 15;

        // Bounce rate penalty (15%)
        score -= (metrics.bounceRate / 100) * 15;

        channelScores[channel as NotificationChannel] = Math.min(Math.max(score, 0), 100);
      });

      return channelScores;
    } catch (error) {
      console.error('Failed to calculate channel scores:', error);
      return {
        inApp: 50,
        push: 50,
        email: 50,
        sms: 50,
        webhook: 50,
      };
    }
  }

  private async generatePerformanceRecommendations(
    performance: AdvancedNotificationAnalytics
  ): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      // Overall performance recommendations
      if (performance.engagementRate < 50) {
        recommendations.push(
          'Overall engagement is below average. Consider improving notification content and timing.'
        );
      }

      if (performance.conversionRate < 5) {
        recommendations.push(
          'Conversion rate is low. Focus on creating clearer call-to-action buttons and more compelling content.'
        );
      }

      if (performance.bounceRate > 10) {
        recommendations.push(
          'High bounce rate detected. Review your sending practices and ensure list quality.'
        );
      }

      // Channel-specific recommendations
      Object.entries(performance.channelPerformance).forEach(([channel, metrics]) => {
        const deliveryRate = metrics.totalSent > 0 ? (metrics.totalDelivered / metrics.totalSent) * 100 : 0;

        if (deliveryRate < 80) {
          recommendations.push(
            `${channel} delivery rate is ${deliveryRate.toFixed(1)}%. Investigate delivery issues for this channel.`
          );
        }

        if (metrics.avgDeliveryTime > 30000) { // 30 seconds
          recommendations.push(
            `${channel} delivery time is slow (${(metrics.avgDeliveryTime / 1000).toFixed(1)}s). Consider optimizing delivery infrastructure.`
          );
        }
      });

      // Time-based recommendations
      if (performance.hourlyPerformance) {
        const bestHour = this.findBestPerformingHour(performance.hourlyPerformance);
        recommendations.push(
          `Best performing hour is ${bestHour}. Consider scheduling more notifications during this time.`
        );
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to generate performance recommendations:', error);
      return [];
    }
  }

  private async identifyOptimizations(
    performance: AdvancedNotificationAnalytics,
    userId: string
  ): Promise<Array<{
    type: string;
    description: string;
    expectedImprovement: number;
    priority: 'low' | 'medium' | 'high';
  }>> {
    try {
      const optimizations: Array<{
        type: string;
        description: string;
        expectedImprovement: number;
        priority: 'low' | 'medium' | 'high';
      }> = [];

      // Channel optimization opportunities
      const underperformingChannels = Object.entries(performance.channelPerformance)
        .filter(([, metrics]) => {
          const deliveryRate = metrics.totalSent > 0 ? (metrics.totalDelivered / metrics.totalSent) * 100 : 0;
          return deliveryRate < 70;
        })
        .map(([channel]) => channel as NotificationChannel);

      if (underperformingChannels.length > 0) {
        optimizations.push({
          type: 'channel_optimization',
          description: `Optimize delivery for ${underperformingChannels.join(', ')} channels`,
          expectedImprovement: 15,
          priority: 'high',
        });
      }

      // Timing optimization
      if (performance.optimalSendTime === '12:00') {
        optimizations.push({
          type: 'timing_optimization',
          description: 'Analyze user behavior to find optimal send times',
          expectedImprovement: 20,
          priority: 'medium',
        });
      }

      // Content optimization
      if (performance.engagementRate < 40) {
        optimizations.push({
          type: 'content_optimization',
          description: 'Improve notification titles and content for better engagement',
          expectedImprovement: 25,
          priority: 'high',
        });
      }

      // A/B testing opportunities
      if (performance.experimentResults && performance.experimentResults.length === 0) {
        optimizations.push({
          type: 'ab_testing',
          description: 'Implement A/B testing for notification variants',
          expectedImprovement: 10,
          priority: 'medium',
        });
      }

      return optimizations;
    } catch (error) {
      console.error('Failed to identify optimizations:', error);
      return [];
    }
  }

  // ==================== AUTOMATIC OPTIMIZATION ====================

  async runOptimizationAnalysis(): Promise<{
    optimizationsApplied: number;
    improvements: Array<{
      type: string;
      description: string;
      expectedImpact: number;
    }>;
  }> {
    try {
      console.log('Running notification optimization analysis...');

      const improvements: Array<{
        type: string;
        description: string;
        expectedImpact: number;
      }> = [];

      // Analyze channel performance across all users
      const channelOptimizations = await this.optimizeChannelConfigurations();
      improvements.push(...channelOptimizations);

      // Optimize delivery strategies
      const strategyOptimizations = await this.optimizeDeliveryStrategies();
      improvements.push(...strategyOptimizations);

      // Update performance baselines
      await this.updatePerformanceBaselines();

      console.log(`Applied ${improvements.length} optimizations`);

      return {
        optimizationsApplied: improvements.length,
        improvements,
      };
    } catch (error) {
      console.error('Failed to run optimization analysis:', error);
      return {
        optimizationsApplied: 0,
        improvements: [],
      };
    }
  }

  private async optimizeChannelConfigurations(): Promise<Array<{
    type: string;
    description: string;
    expectedImpact: number;
  }>> {
    try {
      const improvements: Array<{
        type: string;
        description: string;
        expectedImpact: number;
      }> = [];

      // Get global channel performance
      const globalPerformance = await this.getGlobalChannelPerformance();

      // Identify underperforming channels
      Object.entries(globalPerformance).forEach(([channel, performance]) => {
        const deliveryRate = performance.totalSent > 0 ? (performance.totalDelivered / performance.totalSent) * 100 : 0;

        if (deliveryRate < 75) {
          // Suggest channel-specific optimizations
          if (performance.avgDeliveryTime > 60000) { // 1 minute
            improvements.push({
              type: 'channel_delivery_time',
              description: `Optimize ${channel} delivery infrastructure to reduce latency`,
              expectedImpact: 10,
            });
          }

          if (performance.bounceRate > 15) {
            improvements.push({
              type: 'channel_bounce_rate',
              description: `Improve ${channel} deliverability and list quality`,
              expectedImpact: 15,
            });
          }
        }
      });

      return improvements;
    } catch (error) {
      console.error('Failed to optimize channel configurations:', error);
      return [];
    }
  }

  private async optimizeDeliveryStrategies(): Promise<Array<{
    type: string;
    description: string;
    expectedImpact: number;
  }>> {
    try {
      const improvements: Array<{
        type: string;
        description: string;
        expectedImpact: number;
      }> = [];

      // Analyze delivery strategy effectiveness
      const strategyAnalysis = await this.analyzeDeliveryStrategies();

      if (strategyAnalysis.primaryChannelFailureRate > 30) {
        improvements.push({
          type: 'delivery_strategy',
          description: 'Improve fallback channel selection based on performance data',
          expectedImpact: 20,
        });
      }

      if (strategyAnalysis.escalationEffectiveness < 50) {
        improvements.push({
          type: 'escalation_rules',
          description: 'Optimize escalation rules for failed deliveries',
          expectedImpact: 12,
        });
      }

      return improvements;
    } catch (error) {
      console.error('Failed to optimize delivery strategies:', error);
      return [];
    }
  }

  // ==================== PREDICTIVE OPTIMIZATION ====================

  async predictOptimalConfiguration(
    userId: string,
    notificationType: NotificationType['type']
  ): Promise<{
    optimalChannels: NotificationChannel[];
    optimalTiming: string;
    optimalPriority: NotificationType['priority'];
    expectedPerformance: {
      deliveryRate: number;
      engagementRate: number;
      conversionRate: number;
    };
    confidence: number;
  }> {
    try {
      // Get user's historical performance for this notification type
      const historicalPerformance = await this.getHistoricalPerformance(userId, notificationType);

      // Predict optimal channels based on performance
      const optimalChannels = this.predictOptimalChannels(historicalPerformance);

      // Predict optimal timing based on user behavior
      const optimalTiming = this.predictOptimalTiming(historicalPerformance);

      // Predict optimal priority based on urgency and type
      const optimalPriority = this.predictOptimalPriority(notificationType, historicalPerformance);

      // Calculate expected performance
      const expectedPerformance = this.calculateExpectedPerformance(
        optimalChannels,
        optimalTiming,
        optimalPriority,
        historicalPerformance
      );

      // Calculate confidence based on data quality
      const confidence = this.calculateOptimizerConfidence(historicalPerformance);

      return {
        optimalChannels,
        optimalTiming,
        optimalPriority,
        expectedPerformance,
        confidence,
      };
    } catch (error) {
      console.error('Failed to predict optimal configuration:', error);
      return this.getDefaultOptimalConfiguration();
    }
  }

  private predictOptimalChannels(historicalPerformance: any): NotificationChannel[] {
    try {
      if (!historicalPerformance.channelPerformance) {
        return ['inApp', 'push'];
      }

      const channelScores = Object.entries(historicalPerformance.channelPerformance)
        .map(([channel, performance]: [string, any]) => ({
          channel: channel as NotificationChannel,
          score: (performance.deliveryRate * 0.4) + (performance.engagementRate * 0.6),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      return channelScores.map(item => item.channel);
    } catch (error) {
      console.error('Failed to predict optimal channels:', error);
      return ['inApp', 'push'];
    }
  }

  private predictOptimalTiming(historicalPerformance: any): string {
    try {
      if (!historicalPerformance.hourlyPerformance) {
        return '12:00';
      }

      const bestHour = Object.entries(historicalPerformance.hourlyPerformance)
        .sort(([, a]: [string, any], [, b]: [string, any]) =>
          (b.engagement || 0) - (a.engagement || 0)
        )[0];

      return bestHour ? `${bestHour[0]}:00` : '12:00';
    } catch (error) {
      console.error('Failed to predict optimal timing:', error);
      return '12:00';
    }
  }

  private predictOptimalPriority(
    notificationType: NotificationType['type'],
    historicalPerformance: any
  ): NotificationType['priority'] {
    try {
      // Base priority on notification type and historical performance
      const basePriority: NotificationType['priority'] = 'normal';

      if (historicalPerformance.urgencyScore > 80) {
        return 'high';
      }

      if (historicalPerformance.urgencyScore > 60) {
        return 'normal';
      }

      return 'low';
    } catch (error) {
      console.error('Failed to predict optimal priority:', error);
      return 'normal';
    }
  }

  private calculateExpectedPerformance(
    channels: NotificationChannel[],
    timing: string,
    priority: NotificationType['priority'],
    historicalPerformance: any
  ): {
    deliveryRate: number;
    engagementRate: number;
    conversionRate: number;
  } {
    try {
      // Base calculations on historical data and optimizations
      const baseDeliveryRate = historicalPerformance.deliveryRate || 85;
      const baseEngagementRate = historicalPerformance.engagementRate || 50;
      const baseConversionRate = historicalPerformance.conversionRate || 5;

      // Apply optimization multipliers
      const channelMultiplier = channels.length > 1 ? 1.1 : 1.0;
      const timingMultiplier = this.getTimingMultiplier(timing);
      const priorityMultiplier = this.getPriorityMultiplier(priority);

      return {
        deliveryRate: Math.min(baseDeliveryRate * channelMultiplier, 100),
        engagementRate: Math.min(baseEngagementRate * timingMultiplier, 100),
        conversionRate: Math.min(baseConversionRate * priorityMultiplier, 100),
      };
    } catch (error) {
      console.error('Failed to calculate expected performance:', error);
      return {
        deliveryRate: 85,
        engagementRate: 50,
        conversionRate: 5,
      };
    }
  }

  private getTimingMultiplier(timing: string): number {
    // Peak hours get slight boost
    const hour = parseInt(timing.split(':')[0]);
    if (hour >= 9 && hour <= 11) return 1.2; // Morning peak
    if (hour >= 17 && hour <= 20) return 1.2; // Evening peak
    return 1.0;
  }

  private getPriorityMultiplier(priority: NotificationType['priority']): number {
    switch (priority) {
      case 'urgent': return 1.5;
      case 'high': return 1.2;
      case 'normal': return 1.0;
      case 'low': return 0.8;
      default: return 1.0;
    }
  }


  // ==================== PERFORMANCE MONITORING ====================

  async monitorPerformanceThresholds(): Promise<{
    alerts: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      metric: string;
      currentValue: number;
      threshold: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const alerts: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        metric: string;
        currentValue: number;
        threshold: number;
      }> = [];

      const recommendations: string[] = [];

      // Check global performance metrics
      const globalPerformance = await this.getGlobalPerformanceMetrics();

      // Delivery rate threshold (should be > 80%)
      if (globalPerformance.deliveryRate < 80) {
        alerts.push({
          type: 'delivery_rate',
          severity: globalPerformance.deliveryRate < 60 ? 'critical' : 'high',
          message: `Global delivery rate is ${globalPerformance.deliveryRate.toFixed(1)}%`,
          metric: 'delivery_rate',
          currentValue: globalPerformance.deliveryRate,
          threshold: 80,
        });
      }

      // Engagement rate threshold (should be > 40%)
      if (globalPerformance.engagementRate < 40) {
        alerts.push({
          type: 'engagement_rate',
          severity: globalPerformance.engagementRate < 20 ? 'critical' : 'medium',
          message: `Global engagement rate is ${globalPerformance.engagementRate.toFixed(1)}%`,
          metric: 'engagement_rate',
          currentValue: globalPerformance.engagementRate,
          threshold: 40,
        });
      }

      // Bounce rate threshold (should be < 10%)
      if (globalPerformance.bounceRate > 10) {
        alerts.push({
          type: 'bounce_rate',
          severity: globalPerformance.bounceRate > 20 ? 'critical' : 'high',
          message: `Global bounce rate is ${globalPerformance.bounceRate.toFixed(1)}%`,
          metric: 'bounce_rate',
          currentValue: globalPerformance.bounceRate,
          threshold: 10,
        });
      }

      // Generate recommendations based on alerts
      alerts.forEach(alert => {
        switch (alert.type) {
          case 'delivery_rate':
            recommendations.push('Review delivery infrastructure and channel configurations');
            break;
          case 'engagement_rate':
            recommendations.push('Improve notification content and timing strategies');
            break;
          case 'bounce_rate':
            recommendations.push('Clean up subscriber lists and improve content quality');
            break;
        }
      });

      return { alerts, recommendations };
    } catch (error) {
      console.error('Failed to monitor performance thresholds:', error);
      return { alerts: [], recommendations: [] };
    }
  }

  // ==================== HELPER METHODS ====================

  private async getNotificationsInRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<NotificationType[]> {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(notificationsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationType[];
    } catch (error) {
      console.error('Failed to get notifications in range:', error);
      return [];
    }
  }

  private async getTrackingEventsInRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const eventsQuery = query(
        collection(db, 'notificationEvents'),
        where('userId', '==', userId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(eventsQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Failed to get tracking events in range:', error);
      return [];
    }
  }

  private async calculatePerformanceMetrics(
    notifications: NotificationType[],
    events: any[],
    period: string,
    userId: string
  ): Promise<AdvancedNotificationAnalytics> {
    // Implementation would calculate comprehensive performance metrics
    // For now, return a basic structure
    return {
      userId,
      period: period as 'day' | 'week' | 'month' | 'year',
      totalSent: notifications.length,
      totalDelivered: events.filter(e => e.event === 'delivered').length,
      totalRead: events.filter(e => e.event === 'viewed').length,
      totalClicked: events.filter(e => e.event === 'clicked').length,
      byType: {
        like: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        comment: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        follow: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        friend_request: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        mention: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        tag: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        share: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        system: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        achievement: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
        milestone: { sent: 0, delivered: 0, read: 0, clicked: 0, avgTimeToRead: 0 },
      },
      byChannel: {
        inApp: { delivered: 0, read: 0, clicked: 0 },
        push: { delivered: 0, read: 0, clicked: 0 },
        email: { delivered: 0, read: 0, clicked: 0 },
      },
      engagementRate: notifications.length > 0 ?
        (events.filter(e => e.event === 'viewed').length / notifications.length) * 100 : 0,
      clickThroughRate: 0,
      optimalSendTime: '12:00',
      topPerformingTypes: [],
      conversionRate: 0,
      unsubscribeRate: 0,
      complaintRate: 0,
      bounceRate: 0,
      channelPerformance: {
        inApp: { channel: 'inApp', totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, avgDeliveryTime: 0, bounceRate: 0, complaintRate: 0 },
        push: { channel: 'push', totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, avgDeliveryTime: 0, bounceRate: 0, complaintRate: 0 },
        email: { channel: 'email', totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, avgDeliveryTime: 0, bounceRate: 0, complaintRate: 0 },
        sms: { channel: 'sms', totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, avgDeliveryTime: 0, bounceRate: 0, complaintRate: 0 },
        webhook: { channel: 'webhook', totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, avgDeliveryTime: 0, bounceRate: 0, complaintRate: 0 },
      },
      hourlyPerformance: {},
      segmentPerformance: {},
      experimentResults: [],
      predictions: {
        optimalSendTime: '12:00',
        expectedEngagement: 50,
        recommendedChannels: ['inApp', 'push'],
      },
    };
  }

  private getDateRange(period: 'day' | 'week' | 'month'): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString();

    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate,
    };
  }

  private findBestPerformingHour(hourlyPerformance: Record<string, any>): string {
    const bestHour = Object.entries(hourlyPerformance)
      .sort(([, a], [, b]) => (b.engagement || 0) - (a.engagement || 0))[0];

    return bestHour ? bestHour[0] : '12:00';
  }

  private async getGlobalChannelPerformance(): Promise<Record<NotificationChannel, any>> {
    // Implementation would get global channel performance across all users
    return {
      inApp: { totalSent: 1000, totalDelivered: 950, avgDeliveryTime: 1000, bounceRate: 5 },
      push: { totalSent: 800, totalDelivered: 720, avgDeliveryTime: 2000, bounceRate: 10 },
      email: { totalSent: 500, totalDelivered: 450, avgDeliveryTime: 5000, bounceRate: 10 },
      sms: { totalSent: 100, totalDelivered: 95, avgDeliveryTime: 3000, bounceRate: 5 },
      webhook: { totalSent: 50, totalDelivered: 48, avgDeliveryTime: 800, bounceRate: 4 },
    };
  }

  private async analyzeDeliveryStrategies(): Promise<{
    primaryChannelFailureRate: number;
    escalationEffectiveness: number;
  }> {
    // Implementation would analyze delivery strategy effectiveness
    return {
      primaryChannelFailureRate: 15,
      escalationEffectiveness: 75,
    };
  }

  private async getGlobalPerformanceMetrics(): Promise<{
    deliveryRate: number;
    engagementRate: number;
    bounceRate: number;
  }> {
    // Implementation would get global performance metrics
    return {
      deliveryRate: 85,
      engagementRate: 45,
      bounceRate: 8,
    };
  }

  private async getHistoricalPerformance(
    userId: string,
    notificationType: NotificationType['type']
  ): Promise<any> {
    // Implementation would get historical performance for user and type
    return {
      deliveryRate: 85,
      engagementRate: 50,
      conversionRate: 5,
      channelPerformance: {},
      hourlyPerformance: {},
      sampleSize: 100,
      daysSinceLastUpdate: 1,
      urgencyScore: 60,
    };
  }

  private calculateOptimizerConfidence(historicalPerformance: any): number {
    // Implementation would calculate confidence based on data quality
    return 75;
  }

  private getDefaultOptimalConfiguration() {
    return {
      optimalChannels: ['inApp', 'push'] as NotificationChannel[],
      optimalTiming: '12:00',
      optimalPriority: 'normal' as NotificationType['priority'],
      expectedPerformance: {
        deliveryRate: 85,
        engagementRate: 50,
        conversionRate: 5,
      },
      confidence: 50,
    };
  }

  private async updatePerformanceBaselines(): Promise<void> {
    try {
      // Calculate and store current performance baselines
      const today = new Date().toISOString().split('T')[0];
      const baseline = {
        date: today,
        metrics: await this.getGlobalPerformanceMetrics(),
        createdAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'notificationPerformanceBaselines', today), baseline);

      // Update cache
      this.performanceCache.set(`baseline_${today}`, baseline);
    } catch (error) {
      console.error('Failed to update performance baselines:', error);
    }
  }

  // ==================== CLEANUP ====================

  clearCache(): void {
    this.optimizationRules.clear();
    this.performanceCache.clear();
  }

  destroy(): void {
    this.clearCache();
  }
}

// Export singleton instance
export const notificationPerformanceOptimizer = NotificationPerformanceOptimizer.getInstance();