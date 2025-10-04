// Notification Analytics - Comprehensive tracking and optimization
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  AdvancedNotificationAnalytics,
  ExperimentResult,
  ChannelPerformance,
  NotificationChannel,
  EnhancedNotification,
} from './types';
import type {
  NotificationAnalytics as BaseNotificationAnalytics,
  Notification as NotificationType,
} from '../types/social';
import { SocialError } from '../types/social';

export class EnhancedNotificationAnalytics {
  private static instance: EnhancedNotificationAnalytics;
  private trackingQueue: Array<{
    notificationId: string;
    event: string;
    timestamp: string;
    metadata?: Record<string, any>;
    userId?: string;
  }> = [];
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeAnalytics();
    this.startBatchProcessor();
  }

  public static getInstance(): EnhancedNotificationAnalytics {
    if (!EnhancedNotificationAnalytics.instance) {
      EnhancedNotificationAnalytics.instance = new EnhancedNotificationAnalytics();
    }
    return EnhancedNotificationAnalytics.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeAnalytics(): Promise<void> {
    try {
      console.log('Notification Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Analytics:', error);
    }
  }

  private startBatchProcessor(): void {
    // Process tracking events in batches every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processTrackingBatch();
    }, 30000);
  }

  // ==================== EVENT TRACKING ====================

  async trackNotificationEvent(
    notificationId: string,
    event: 'sent' | 'delivered' | 'viewed' | 'clicked' | 'dismissed' | 'shared' | 'converted' | 'bounced' | 'complained',
    metadata?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      const trackingData = {
        notificationId,
        event,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
        userId,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        platform: typeof window !== 'undefined' ? (window as any).navigator.platform : undefined,
        ipAddress: undefined, // Would be set by server
      };

      // Add to batch queue for processing
      this.trackingQueue.push(trackingData);

      // Process immediately for critical events
      if (['delivered', 'clicked', 'converted', 'bounced'].includes(event)) {
        await this.saveTrackingEvent(trackingData);
      }
    } catch (error) {
      console.error('Failed to track notification event:', error);
    }
  }

  private async saveTrackingEvent(trackingData: any): Promise<void> {
    try {
      await addDoc(collection(db, 'notificationEvents'), trackingData);
    } catch (error) {
      console.error('Failed to save tracking event:', error);
    }
  }

  private async processTrackingBatch(): Promise<void> {
    if (this.trackingQueue.length === 0) return;

    const eventsToProcess = [...this.trackingQueue];
    this.trackingQueue = [];

    try {
      const batch = [];
      for (const event of eventsToProcess) {
        batch.push(this.saveTrackingEvent(event));
      }
      await Promise.all(batch);
    } catch (error) {
      console.error('Failed to process tracking batch:', error);
      // Re-add failed events back to queue
      this.trackingQueue.unshift(...eventsToProcess);
    }
  }

  // ==================== ADVANCED ANALYTICS ====================

  async getAdvancedNotificationAnalytics(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'week'
  ): Promise<AdvancedNotificationAnalytics> {
    try {
      const { startDate, endDate } = this.getDateRange(period);

      // Get notifications for the period
      const notifications = await this.getNotificationsInRange(userId, startDate, endDate);

      // Get tracking events for the period
      const events = await this.getTrackingEventsInRange(userId, startDate, endDate);

      // Calculate base analytics
      const baseAnalytics = await this.calculateBaseAnalytics(notifications, events, period);

      // Calculate advanced metrics
      const advancedMetrics = await this.calculateAdvancedMetrics(notifications, events);

      // Calculate channel performance
      const channelPerformance = await this.calculateChannelPerformance(notifications, events);

      // Calculate time-based analytics
      const hourlyPerformance = await this.calculateHourlyPerformance(events);

      // Calculate user segment analytics
      const segmentPerformance = await this.calculateSegmentPerformance(userId, notifications, events);

      // Get A/B testing results
      const experimentResults = await this.getExperimentResults(userId, startDate, endDate);

      // Generate predictions
      const predictions = await this.generatePredictions(userId, notifications, events);

      return {
        ...baseAnalytics,
        conversionRate: advancedMetrics.conversionRate,
        unsubscribeRate: advancedMetrics.unsubscribeRate,
        complaintRate: advancedMetrics.complaintRate,
        bounceRate: advancedMetrics.bounceRate,
        channelPerformance,
        hourlyPerformance,
        segmentPerformance,
        experimentResults,
        predictions,
      };
    } catch (error) {
      console.error('Failed to get advanced notification analytics:', error);
      return this.getEmptyAdvancedAnalytics(userId, period);
    }
  }

  private async calculateBaseAnalytics(
    notifications: NotificationType[],
    events: any[],
    period: string
  ): Promise<BaseNotificationAnalytics> {
    const totalSent = notifications.length;
    const totalDelivered = events.filter(e => e.event === 'delivered').length;
    const totalRead = events.filter(e => e.event === 'viewed').length;
    const totalClicked = events.filter(e => e.event === 'clicked').length;

    // Group events by notification type
    const eventsByNotification = events.reduce((acc, event) => {
      if (!acc[event.notificationId]) {
        acc[event.notificationId] = [];
      }
      acc[event.notificationId].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate metrics by type
    const byType = this.calculateMetricsByType(notifications, eventsByNotification);

    // Calculate metrics by channel
    const byChannel = this.calculateMetricsByChannel(notifications, events);

    // Calculate engagement metrics
    const engagementRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;
    const clickThroughRate = totalRead > 0 ? (totalClicked / totalRead) * 100 : 0;

    // Find optimal send time
    const optimalSendTime = this.findOptimalSendTime(events);

    // Get top performing types
    const topPerformingTypes = this.getTopPerformingTypes(byType);

    return {
      userId: notifications[0]?.userId || '',
      period: period as 'day' | 'week' | 'month' | 'year',
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      byType,
      byChannel,
      engagementRate,
      clickThroughRate,
      optimalSendTime,
      topPerformingTypes,
    };
  }

  private async calculateAdvancedMetrics(
    notifications: NotificationType[],
    events: any[]
  ): Promise<{
    conversionRate: number;
    unsubscribeRate: number;
    complaintRate: number;
    bounceRate: number;
  }> {
    const totalSent = notifications.length;
    const totalConverted = events.filter(e => e.event === 'converted').length;
    const totalUnsubscribed = events.filter(e => e.event === 'unsubscribed').length;
    const totalComplained = events.filter(e => e.event === 'complained').length;
    const totalBounced = events.filter(e => e.event === 'bounced').length;

    return {
      conversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
      unsubscribeRate: totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    };
  }

  private async calculateChannelPerformance(
    notifications: NotificationType[],
    events: any[]
  ): Promise<Record<NotificationChannel, ChannelPerformance>> {
    const channelPerformance: Record<NotificationChannel, ChannelPerformance> = {
      inApp: {
        channel: 'inApp',
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgDeliveryTime: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
      push: {
        channel: 'push',
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgDeliveryTime: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
      email: {
        channel: 'email',
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgDeliveryTime: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
      sms: {
        channel: 'sms',
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgDeliveryTime: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
      webhook: {
        channel: 'webhook',
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgDeliveryTime: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
    };

    // Calculate metrics for each channel
    for (const channel of Object.keys(channelPerformance) as NotificationChannel[]) {
      const channelNotifications = notifications.filter(n => (n.channels as any)[channel]);
      const channelEvents = events.filter(e => e.metadata?.channel === channel);

      const sent = channelNotifications.length;
      const delivered = channelEvents.filter(e => e.event === 'delivered').length;
      const opened = channelEvents.filter(e => e.event === 'viewed').length;
      const clicked = channelEvents.filter(e => e.event === 'clicked').length;
      const bounced = channelEvents.filter(e => e.event === 'bounced').length;
      const complained = channelEvents.filter(e => e.event === 'complained').length;

      channelPerformance[channel] = {
        channel,
        totalSent: sent,
        totalDelivered: delivered,
        totalOpened: opened,
        totalClicked: clicked,
        avgDeliveryTime: this.calculateAverageDeliveryTime(channelEvents),
        bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
        complaintRate: sent > 0 ? (complained / sent) * 100 : 0,
      };
    }

    return channelPerformance;
  }

  private calculateAverageDeliveryTime(events: any[]): number {
    const deliveryTimes = events
      .filter(e => e.event === 'delivered' && e.metadata?.deliveryTime)
      .map(e => e.metadata.deliveryTime);

    return deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0;
  }

  private async calculateHourlyPerformance(
    events: any[]
  ): Promise<Record<string, { sent: number; opened: number; clicked: number; converted: number }>> {
    const hourlyStats: Record<string, { sent: number; opened: number; clicked: number; converted: number }> = {};

    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;

      if (!hourlyStats[hourKey]) {
        hourlyStats[hourKey] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
      }

      switch (event.event) {
        case 'sent':
          hourlyStats[hourKey].sent++;
          break;
        case 'viewed':
          hourlyStats[hourKey].opened++;
          break;
        case 'clicked':
          hourlyStats[hourKey].clicked++;
          break;
        case 'converted':
          hourlyStats[hourKey].converted++;
          break;
      }
    });

    return hourlyStats;
  }

  private async calculateSegmentPerformance(
    userId: string,
    notifications: NotificationType[],
    events: any[]
  ): Promise<Record<string, { reach: number; engagement: number; conversion: number }>> {
    try {
      // Get user segments
      const userSegments = await this.getUserSegments(userId);

      const segmentPerformance: Record<string, { reach: number; engagement: number; conversion: number }> = {};

      for (const segment of userSegments) {
        const segmentNotifications = notifications.filter(n => (n as any).targetSegments?.includes(segment));
        const segmentEvents = events.filter(e => e.metadata?.userSegments?.includes(segment));

        const reach = segmentNotifications.length;
        const engagement = segmentEvents.filter(e => e.event === 'viewed').length;
        const conversion = segmentEvents.filter(e => e.event === 'converted').length;

        segmentPerformance[segment] = {
          reach,
          engagement,
          conversion,
        };
      }

      return segmentPerformance;
    } catch (error) {
      console.error('Failed to calculate segment performance:', error);
      return {};
    }
  }

  private async getUserSegments(userId: string): Promise<string[]> {
    try {
      const segmentsQuery = query(
        collection(db, 'userSegments'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(segmentsQuery);
      return querySnapshot.docs.map(doc => doc.data().segmentName);
    } catch (error) {
      console.error('Failed to get user segments:', error);
      return [];
    }
  }

  private async getExperimentResults(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ExperimentResult[]> {
    try {
      const experimentsQuery = query(
        collection(db, 'notificationExperiments'),
        where('userId', '==', userId),
        where('startDate', '>=', startDate),
        where('endDate', '<=', endDate)
      );

      const querySnapshot = await getDocs(experimentsQuery);
      const experiments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const results: ExperimentResult[] = [];

      for (const experiment of experiments) {
        const variantResults = await this.calculateExperimentResults(experiment);
        results.push(...variantResults);
      }

      return results;
    } catch (error) {
      console.error('Failed to get experiment results:', error);
      return [];
    }
  }

  private async calculateExperimentResults(experiment: any): Promise<ExperimentResult[]> {
    // Implementation would calculate statistical significance and results
    // For now, return mock data
    return [
      {
        experimentId: experiment.id,
        variantId: 'control',
        sampleSize: 1000,
        conversionRate: 5.2,
        confidence: 95,
        isWinner: false,
        improvement: 0,
      },
      {
        experimentId: experiment.id,
        variantId: 'variant_a',
        sampleSize: 1000,
        conversionRate: 6.8,
        confidence: 95,
        isWinner: true,
        improvement: 30.8,
      },
    ];
  }

  private async generatePredictions(
    userId: string,
    notifications: NotificationType[],
    events: any[]
  ): Promise<{
    optimalSendTime: string;
    expectedEngagement: number;
    recommendedChannels: NotificationChannel[];
  }> {
    try {
      // Analyze historical data to make predictions
      const optimalTime = this.findOptimalSendTime(events);
      const expectedEngagement = this.predictEngagementRate(notifications, events);
      const recommendedChannels = this.recommendChannels(notifications, events);

      return {
        optimalSendTime: optimalTime,
        expectedEngagement,
        recommendedChannels,
      };
    } catch (error) {
      console.error('Failed to generate predictions:', error);
      return {
        optimalSendTime: '12:00',
        expectedEngagement: 50,
        recommendedChannels: ['inApp', 'push'],
      };
    }
  }

  private predictEngagementRate(notifications: NotificationType[], events: any[]): number {
    if (notifications.length === 0) return 50;

    const recentNotifications = notifications.slice(0, 10);
    const recentEvents = events.filter(e =>
      recentNotifications.some(n => n.id === e.notificationId)
    );

    const engagementRate = recentEvents.filter(e => e.event === 'viewed').length / recentNotifications.length * 100;
    return Math.min(engagementRate, 100);
  }

  private recommendChannels(notifications: NotificationType[], events: any[]): NotificationChannel[] {
    const channelStats = this.calculateMetricsByChannel(notifications, events);

    return Object.entries(channelStats)
      .map(([channel, metrics]: [string, any]) => ({
        channel: channel as NotificationChannel,
        score: metrics.delivered > 0 ? (metrics.read / metrics.delivered) * 100 : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.channel);
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

  private calculateMetricsByType(
    notifications: NotificationType[],
    eventsByNotification: Record<string, any[]>
  ): BaseNotificationAnalytics['byType'] {
    const typeGroups = notifications.reduce((acc, notification) => {
      if (!acc[notification.type]) {
        acc[notification.type] = {
          sent: 0,
          delivered: 0,
          read: 0,
          clicked: 0,
          avgTimeToRead: 0,
        };
      }
      acc[notification.type].sent++;

      const notificationEvents = eventsByNotification[notification.id] || [];
      notificationEvents.forEach(event => {
        switch (event.event) {
          case 'delivered':
            acc[notification.type].delivered++;
            break;
          case 'viewed':
            acc[notification.type].read++;
            break;
          case 'clicked':
            acc[notification.type].clicked++;
            break;
        }
      });

      return acc;
    }, {} as BaseNotificationAnalytics['byType']);

    return typeGroups;
  }

  private calculateMetricsByChannel(
    notifications: NotificationType[],
    events: any[]
  ): BaseNotificationAnalytics['byChannel'] {
    const channelMetrics = {
      inApp: { delivered: 0, read: 0, clicked: 0 },
      push: { delivered: 0, read: 0, clicked: 0 },
      email: { delivered: 0, read: 0, clicked: 0 },
    };

    notifications.forEach(notification => {
      const notificationEvents = events.filter(e => e.notificationId === notification.id);

      if (notification.channels.inApp) {
        channelMetrics.inApp.delivered++;
        if (notificationEvents.some(e => e.event === 'viewed')) {
          channelMetrics.inApp.read++;
        }
        if (notificationEvents.some(e => e.event === 'clicked')) {
          channelMetrics.inApp.clicked++;
        }
      }

      if (notification.channels.push) {
        channelMetrics.push.delivered++;
        if (notificationEvents.some(e => e.event === 'viewed')) {
          channelMetrics.push.read++;
        }
        if (notificationEvents.some(e => e.event === 'clicked')) {
          channelMetrics.push.clicked++;
        }
      }

      if (notification.channels.email) {
        channelMetrics.email.delivered++;
        if (notificationEvents.some(e => e.event === 'viewed')) {
          channelMetrics.email.read++;
        }
        if (notificationEvents.some(e => e.event === 'clicked')) {
          channelMetrics.email.clicked++;
        }
      }
    });

    return channelMetrics;
  }

  private findOptimalSendTime(events: any[]): string {
    try {
      const hourlyStats = events.reduce((acc, event) => {
        if (event.event === 'viewed' || event.event === 'clicked') {
          const hour = new Date(event.timestamp).getHours();
          if (!acc[hour]) {
            acc[hour] = { views: 0, clicks: 0 };
          }
          if (event.event === 'viewed') acc[hour].views++;
          if (event.event === 'clicked') acc[hour].clicks++;
        }
        return acc;
      }, {} as Record<number, { views: number; clicks: number }>);

      let bestHour = 12;
      let bestScore = 0;

      for (const [hour, stats] of Object.entries(hourlyStats)) {
        const score = (stats as any).views * 0.7 + (stats as any).clicks * 1.0;
        if (score > bestScore) {
          bestScore = score;
          bestHour = parseInt(hour);
        }
      }

      return `${bestHour.toString().padStart(2, '0')}:00`;
    } catch (error) {
      console.error('Failed to find optimal send time:', error);
      return '12:00';
    }
  }

  private getTopPerformingTypes(byType: BaseNotificationAnalytics['byType']): Array<{
    type: NotificationType['type'];
    engagementRate: number;
  }> {
    return Object.entries(byType)
      .map(([type, metrics]) => ({
        type: type as NotificationType['type'],
        engagementRate: (metrics as any).sent > 0 ? ((metrics as any).read / (metrics as any).sent) * 100 : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5);
  }

  private getDateRange(period: 'day' | 'week' | 'month' | 'year'): { startDate: string; endDate: string } {
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
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate,
    };
  }

  private getEmptyAdvancedAnalytics(userId: string, period: string): AdvancedNotificationAnalytics {
    return {
      userId,
      period: period as 'day' | 'week' | 'month' | 'year',
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalClicked: 0,
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
      engagementRate: 0,
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

  // ==================== PERFORMANCE INSIGHTS ====================

  async getPerformanceInsights(userId: string): Promise<{
    trends: Array<{ date: string; sent: number; read: number; clicked: number; converted: number }>;
    recommendations: string[];
    comparisons: {
      vsLastPeriod: { sent: number; read: number; engagementRate: number; conversionRate: number };
      vsAverage: { sent: number; read: number; engagementRate: number; conversionRate: number };
    };
    topPerformingContent: Array<{
      contentId: string;
      type: string;
      engagement: number;
      conversions: number;
    }>;
  }> {
    try {
      const currentPeriod = await this.getAdvancedNotificationAnalytics(userId, 'week');
      const lastPeriod = await this.getAdvancedNotificationAnalytics(userId, 'week');

      // Generate trends data (last 7 days)
      const trends = await this.getTrendsData(userId);

      // Generate recommendations
      const recommendations = this.generateRecommendations(currentPeriod);

      // Calculate comparisons
      const comparisons = {
        vsLastPeriod: {
          sent: currentPeriod.totalSent - lastPeriod.totalSent,
          read: currentPeriod.totalRead - lastPeriod.totalRead,
          engagementRate: currentPeriod.engagementRate - lastPeriod.engagementRate,
          conversionRate: currentPeriod.conversionRate - lastPeriod.conversionRate,
        },
        vsAverage: {
          sent: 0, // Would calculate based on historical average
          read: 0,
          engagementRate: 0,
          conversionRate: 0,
        },
      };

      // Get top performing content
      const topPerformingContent = await this.getTopPerformingContent(userId);

      return {
        trends,
        recommendations,
        comparisons,
        topPerformingContent,
      };
    } catch (error) {
      console.error('Failed to get performance insights:', error);
      return {
        trends: [],
        recommendations: [],
        comparisons: {
          vsLastPeriod: { sent: 0, read: 0, engagementRate: 0, conversionRate: 0 },
          vsAverage: { sent: 0, read: 0, engagementRate: 0, conversionRate: 0 },
        },
        topPerformingContent: [],
      };
    }
  }

  private async getTrendsData(userId: string): Promise<Array<{
    date: string;
    sent: number;
    read: number;
    clicked: number;
    converted: number;
  }>> {
    try {
      const trends = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        const dayEvents = await this.getTrackingEventsInRange(
          userId,
          `${dateStr}T00:00:00.000Z`,
          `${dateStr}T23:59:59.999Z`
        );

        trends.push({
          date: dateStr,
          sent: dayEvents.filter(e => e.event === 'sent').length,
          read: dayEvents.filter(e => e.event === 'viewed').length,
          clicked: dayEvents.filter(e => e.event === 'clicked').length,
          converted: dayEvents.filter(e => e.event === 'converted').length,
        });
      }

      return trends;
    } catch (error) {
      console.error('Failed to get trends data:', error);
      return [];
    }
  }

  private generateRecommendations(analytics: AdvancedNotificationAnalytics): string[] {
    const recommendations: string[] = [];

    // Engagement rate recommendations
    if (analytics.engagementRate < 50) {
      recommendations.push(
        `Consider sending notifications during peak user activity hours (around ${analytics.optimalSendTime})`
      );
    }

    if (analytics.engagementRate < 30) {
      recommendations.push(
        'Try using more engaging notification titles and preview text to improve open rates'
      );
    }

    // Conversion rate recommendations
    if (analytics.conversionRate < 5) {
      recommendations.push(
        'Focus on creating clearer call-to-action buttons and more compelling notification content'
      );
    }

    // Channel performance recommendations
    const inAppRate = analytics.channelPerformance.inApp.totalDelivered > 0 ?
      (analytics.channelPerformance.inApp.totalOpened / analytics.channelPerformance.inApp.totalDelivered) * 100 : 0;
    const pushRate = analytics.channelPerformance.push.totalDelivered > 0 ?
      (analytics.channelPerformance.push.totalOpened / analytics.channelPerformance.push.totalDelivered) * 100 : 0;

    if (pushRate > inAppRate + 20) {
      recommendations.push(
        'Push notifications are performing well - consider increasing push notification frequency'
      );
    }

    if (inAppRate > pushRate + 20) {
      recommendations.push(
        'In-app notifications have higher engagement - focus on improving push notification content'
      );
    }

    // Bounce rate recommendations
    if (analytics.bounceRate > 10) {
      recommendations.push(
        'High bounce rate detected - review your sending practices and list quality'
      );
    }

    return recommendations;
  }

  private async getTopPerformingContent(userId: string): Promise<Array<{
    contentId: string;
    type: string;
    engagement: number;
    conversions: number;
  }>> {
    try {
      // Get notifications with content IDs
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('data.contentId', '!=', null),
        orderBy('data.contentId'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notifications = querySnapshot.docs.map(doc => doc.data());

      // Group by content ID and calculate performance
      const contentStats: Record<string, { type: string; engagement: number; conversions: number; count: number }> = {};

      for (const notification of notifications) {
        const contentId = notification.data?.contentId;
        if (contentId) {
          if (!contentStats[contentId]) {
            contentStats[contentId] = {
              type: notification.data?.contentType || 'unknown',
              engagement: 0,
              conversions: 0,
              count: 0,
            };
          }
          contentStats[contentId].count++;

          // Get events for this notification
          const events = await this.getTrackingEventsInRange(
            userId,
            notification.createdAt,
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          );

          const notificationEvents = events.filter(e => e.notificationId === notification.id);
          contentStats[contentId].engagement += notificationEvents.filter(e => e.event === 'viewed').length;
          contentStats[contentId].conversions += notificationEvents.filter(e => e.event === 'converted').length;
        }
      }

      return Object.entries(contentStats)
        .map(([contentId, stats]) => ({
          contentId,
          type: stats.type,
          engagement: stats.engagement,
          conversions: stats.conversions,
        }))
        .sort((a, b) => (b.engagement + b.conversions) - (a.engagement + a.conversions))
        .slice(0, 10);
    } catch (error) {
      console.error('Failed to get top performing content:', error);
      return [];
    }
  }

  // ==================== EXPORT AND REPORTING ====================

  async exportAnalyticsData(
    userId: string,
    period: 'week' | 'month' | 'year',
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const analytics = await this.getAdvancedNotificationAnalytics(userId, period);
      const insights = await this.getPerformanceInsights(userId);

      const exportData = {
        analytics,
        insights,
        exportedAt: new Date().toISOString(),
        period,
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      return '';
    }
  }

  private convertToCSV(data: any): string {
    const headers = [
      'Metric',
      'Value',
      'Period',
    ];

    const rows = [
      ['Total Sent', data.analytics.totalSent, data.period],
      ['Total Read', data.analytics.totalRead, data.period],
      ['Total Clicked', data.analytics.totalClicked, data.period],
      ['Total Converted', data.analytics.totalClicked, data.period],
      ['Engagement Rate (%)', data.analytics.engagementRate.toFixed(2), data.period],
      ['Conversion Rate (%)', data.analytics.conversionRate.toFixed(2), data.period],
      ['Bounce Rate (%)', data.analytics.bounceRate.toFixed(2), data.period],
    ];

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.trackingQueue = [];
  }
}

// Export singleton instance
export const notificationAnalytics = EnhancedNotificationAnalytics.getInstance();