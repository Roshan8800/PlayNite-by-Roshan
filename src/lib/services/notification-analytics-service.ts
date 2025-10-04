// Notification Analytics Service - Track and analyze notification performance
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
  NotificationAnalytics,
  Notification as NotificationType,
} from '../types/social';

export class NotificationAnalyticsService {
  private static instance: NotificationAnalyticsService;
  private trackingQueue: Array<{
    notificationId: string;
    event: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }> = [];

  private constructor() {
    // Process tracking queue periodically
    setInterval(() => {
      this.processTrackingQueue();
    }, 30000); // Process every 30 seconds
  }

  public static getInstance(): NotificationAnalyticsService {
    if (!NotificationAnalyticsService.instance) {
      NotificationAnalyticsService.instance = new NotificationAnalyticsService();
    }
    return NotificationAnalyticsService.instance;
  }

  // ==================== EVENT TRACKING ====================

  async trackNotificationEvent(
    notificationId: string,
    event: 'sent' | 'delivered' | 'viewed' | 'clicked' | 'dismissed' | 'shared' | 'converted',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const trackingData = {
        notificationId,
        event,
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        platform: typeof window !== 'undefined' ? (window as any).navigator.platform : undefined,
      };

      // Add to tracking queue for batch processing
      this.trackingQueue.push(trackingData);

      // Also save immediately for critical events
      if (['delivered', 'clicked', 'converted'].includes(event)) {
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

  private async processTrackingQueue(): Promise<void> {
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
      console.error('Failed to process tracking queue:', error);
      // Re-add failed events back to queue
      this.trackingQueue.unshift(...eventsToProcess);
    }
  }

  // ==================== ANALYTICS CALCULATIONS ====================

  async getNotificationAnalytics(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'week'
  ): Promise<NotificationAnalytics> {
    try {
      const { startDate, endDate } = this.getDateRange(period);

      // Get notifications for the period
      const notifications = await this.getNotificationsInRange(userId, startDate, endDate);

      // Get tracking events for the period
      const events = await this.getTrackingEventsInRange(userId, startDate, endDate);

      return this.calculateAnalytics(notifications, events, period);
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      return this.getEmptyAnalytics(userId, period);
    }
  }

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
      // Get events by joining with notifications
      const eventsQuery = query(
        collection(db, 'notificationEvents'),
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

  private calculateAnalytics(
    notifications: NotificationType[],
    events: any[],
    period: 'day' | 'week' | 'month' | 'year'
  ): NotificationAnalytics {
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
      period,
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

  private calculateMetricsByType(
    notifications: NotificationType[],
    eventsByNotification: Record<string, any[]>
  ): NotificationAnalytics['byType'] {
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
    }, {} as NotificationAnalytics['byType']);

    // Calculate average time to read for each type
    for (const type of Object.keys(typeGroups)) {
      const readEvents = eventsByNotification[Object.keys(eventsByNotification).find(id => {
        const notification = notifications.find(n => n.id === id);
        return notification?.type === type;
      }) || ''];

      if (readEvents && readEvents.length > 0) {
        const readTimes = readEvents
          .filter((e: any) => e.event === 'viewed')
          .map((e: any) => new Date(e.timestamp).getTime());

        if (readTimes.length > 0) {
          const sentTime = new Date(notifications.find(n => n.type === type)?.createdAt || '').getTime();
          const avgTimeToRead = readTimes.reduce((sum: number, time: number) => sum + (time - sentTime), 0) / readTimes.length;
          typeGroups[type as keyof typeof typeGroups].avgTimeToRead = avgTimeToRead / (1000 * 60); // Convert to minutes
        }
      }
    }

    return typeGroups;
  }

  private calculateMetricsByChannel(
    notifications: NotificationType[],
    events: any[]
  ): NotificationAnalytics['byChannel'] {
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
      // Group events by hour of day
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

      // Find hour with highest engagement
      let bestHour = 12; // Default to noon
      let bestScore = 0;

      for (const [hour, stats] of Object.entries(hourlyStats)) {
        const statsObj = stats as { views: number; clicks: number };
        const score = statsObj.views * 0.7 + statsObj.clicks * 1.0; // Weight clicks higher
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

  private getTopPerformingTypes(byType: NotificationAnalytics['byType']): Array<{
    type: NotificationType['type'];
    engagementRate: number;
  }> {
    return Object.entries(byType)
      .map(([type, metrics]) => ({
        type: type as NotificationType['type'],
        engagementRate: metrics.sent > 0 ? (metrics.read / metrics.sent) * 100 : 0,
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

  private getEmptyAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year'): NotificationAnalytics {
    return {
      userId,
      period,
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
    };
  }

  // ==================== PERFORMANCE INSIGHTS ====================

  async getPerformanceInsights(userId: string): Promise<{
    trends: Array<{ date: string; sent: number; read: number; clicked: number }>;
    recommendations: string[];
    comparisons: {
      vsLastPeriod: { sent: number; read: number; engagementRate: number };
      vsAverage: { sent: number; read: number; engagementRate: number };
    };
  }> {
    try {
      const currentPeriod = await this.getNotificationAnalytics(userId, 'week');
      const lastPeriod = await this.getNotificationAnalytics(userId, 'week');

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
        },
        vsAverage: {
          sent: 0, // Would calculate based on historical average
          read: 0,
          engagementRate: 0,
        },
      };

      return {
        trends,
        recommendations,
        comparisons,
      };
    } catch (error) {
      console.error('Failed to get performance insights:', error);
      return {
        trends: [],
        recommendations: [],
        comparisons: {
          vsLastPeriod: { sent: 0, read: 0, engagementRate: 0 },
          vsAverage: { sent: 0, read: 0, engagementRate: 0 },
        },
      };
    }
  }

  private async getTrendsData(userId: string): Promise<Array<{
    date: string;
    sent: number;
    read: number;
    clicked: number;
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
        });
      }

      return trends;
    } catch (error) {
      console.error('Failed to get trends data:', error);
      return [];
    }
  }

  private generateRecommendations(analytics: NotificationAnalytics): string[] {
    const recommendations: string[] = [];

    // Engagement rate recommendations
    if (analytics.engagementRate < 50) {
      recommendations.push(
        'Consider sending notifications during peak user activity hours (around ' + analytics.optimalSendTime + ')'
      );
    }

    if (analytics.engagementRate < 30) {
      recommendations.push(
        'Try using more engaging notification titles and preview text to improve open rates'
      );
    }

    // Channel performance recommendations
    const inAppRate = analytics.byChannel.inApp.delivered > 0 ?
      (analytics.byChannel.inApp.read / analytics.byChannel.inApp.delivered) * 100 : 0;
    const pushRate = analytics.byChannel.push.delivered > 0 ?
      (analytics.byChannel.push.read / analytics.byChannel.push.delivered) * 100 : 0;

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

    // Type performance recommendations
    const lowPerformingTypes = analytics.topPerformingTypes.filter(t => t.engagementRate < 20);
    if (lowPerformingTypes.length > 0) {
      recommendations.push(
        `Consider reducing frequency of ${lowPerformingTypes.map(t => t.type).join(', ')} notifications or improving their content`
      );
    }

    return recommendations;
  }

  // ==================== REAL-TIME ANALYTICS ====================

  async getRealtimeStats(userId: string): Promise<{
    activeNotifications: number;
    pendingNotifications: number;
    recentActivity: Array<{
      timestamp: string;
      event: string;
      type: string;
    }>;
  }> {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const recentEvents = await this.getTrackingEventsInRange(
        userId,
        lastHour.toISOString(),
        now.toISOString()
      );

      const activeNotifications = await this.getActiveNotificationsCount(userId);
      const pendingNotifications = await this.getPendingNotificationsCount(userId);

      const recentActivity = recentEvents.slice(0, 10).map(event => ({
        timestamp: event.timestamp,
        event: event.event,
        type: event.metadata?.notificationType || 'unknown',
      }));

      return {
        activeNotifications,
        pendingNotifications,
        recentActivity,
      };
    } catch (error) {
      console.error('Failed to get realtime stats:', error);
      return {
        activeNotifications: 0,
        pendingNotifications: 0,
        recentActivity: [],
      };
    }
  }

  private async getActiveNotificationsCount(userId: string): Promise<number> {
    try {
      const activeQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(activeQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Failed to get active notifications count:', error);
      return 0;
    }
  }

  private async getPendingNotificationsCount(userId: string): Promise<number> {
    try {
      const now = new Date().toISOString();
      const pendingQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false),
        where('createdAt', '>=', now)
      );

      const querySnapshot = await getDocs(pendingQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Failed to get pending notifications count:', error);
      return 0;
    }
  }

  // ==================== EXPORT AND REPORTING ====================

  async exportAnalyticsData(
    userId: string,
    period: 'week' | 'month' | 'year',
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const analytics = await this.getNotificationAnalytics(userId, period);
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
    // Convert analytics data to CSV format
    const headers = [
      'Metric',
      'Value',
      'Period',
    ];

    const rows = [
      ['Total Sent', data.analytics.totalSent, data.period],
      ['Total Read', data.analytics.totalRead, data.period],
      ['Total Clicked', data.analytics.totalClicked, data.period],
      ['Engagement Rate (%)', data.analytics.engagementRate.toFixed(2), data.period],
      ['Click Through Rate (%)', data.analytics.clickThroughRate.toFixed(2), data.period],
    ];

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Export singleton instance
export const notificationAnalyticsService = NotificationAnalyticsService.getInstance();