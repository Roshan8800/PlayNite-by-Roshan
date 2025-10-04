// Multi-Channel Delivery Manager - Advanced notification delivery mechanisms
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
  ChannelConfig,
  DeliveryAttempt,
  ChannelPerformance,
  NotificationChannel,
  EnhancedNotification,
  DeliveryStrategy,
  EscalationRule,
} from './types';
import type {
  Notification as NotificationType,
  PushNotificationPayload,
} from '../types/social';
import { SocialError } from '../types/social';

export class MultiChannelDeliveryManager {
  private static instance: MultiChannelDeliveryManager;
  private channelConfigs: Map<NotificationChannel, ChannelConfig> = new Map();
  private deliveryQueue: Map<string, DeliveryAttempt[]> = new Map();
  private rateLimiters: Map<NotificationChannel, { count: number; resetTime: number }> = new Map();

  private constructor() {
    this.initializeDeliveryManager();
    this.startDeliveryProcessor();
  }

  public static getInstance(): MultiChannelDeliveryManager {
    if (!MultiChannelDeliveryManager.instance) {
      MultiChannelDeliveryManager.instance = new MultiChannelDeliveryManager();
    }
    return MultiChannelDeliveryManager.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeDeliveryManager(): Promise<void> {
    try {
      // Load channel configurations
      await this.loadChannelConfigs();

      // Initialize rate limiters
      this.initializeRateLimiters();

      console.log('Multi-Channel Delivery Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Multi-Channel Delivery Manager:', error);
    }
  }

  private async loadChannelConfigs(): Promise<void> {
    try {
      const configsQuery = query(
        collection(db, 'notificationChannelConfigs'),
        where('enabled', '==', true)
      );

      const querySnapshot = await getDocs(configsQuery);
      querySnapshot.docs.forEach(doc => {
        const config = { channel: doc.id as NotificationChannel, ...doc.data() } as ChannelConfig;
        this.channelConfigs.set(config.channel, config);
      });
    } catch (error) {
      console.error('Failed to load channel configs:', error);
    }
  }

  private initializeRateLimiters(): void {
    const channels: NotificationChannel[] = ['inApp', 'push', 'email', 'sms', 'webhook'];

    channels.forEach(channel => {
      this.rateLimiters.set(channel, {
        count: 0,
        resetTime: Date.now() + 60000, // Reset every minute
      });
    });
  }

  private startDeliveryProcessor(): void {
    // Process delivery attempts every 10 seconds
    setInterval(() => {
      this.processDeliveryQueue();
    }, 10000);
  }

  // ==================== CHANNEL CONFIGURATION ====================

  async configureChannel(
    channel: NotificationChannel,
    config: Partial<ChannelConfig>
  ): Promise<ChannelConfig> {
    try {
      const channelConfig: ChannelConfig = {
        channel,
        enabled: config.enabled ?? true,
        priority: config.priority ?? 50,
        rateLimit: config.rateLimit || {
          maxPerHour: 1000,
          maxPerDay: 10000,
        },
        settings: config.settings || {},
      };

      await updateDoc(doc(db, 'notificationChannelConfigs', channel), channelConfig as any);

      // Update cache
      this.channelConfigs.set(channel, channelConfig);

      return channelConfig;
    } catch (error) {
      throw new SocialError({
        message: 'Failed to configure notification channel',
        code: 'CHANNEL_CONFIG_FAILED',
        statusCode: 500,
        details: error as Record<string, any>,
      });
    }
  }

  async getChannelConfig(channel: NotificationChannel): Promise<ChannelConfig | null> {
    try {
      return this.channelConfigs.get(channel) || null;
    } catch (error) {
      console.error('Failed to get channel config:', error);
      return null;
    }
  }

  async getAllChannelConfigs(): Promise<ChannelConfig[]> {
    return Array.from(this.channelConfigs.values());
  }

  // ==================== DELIVERY STRATEGY EXECUTION ====================

  async executeDeliveryStrategy(
    notification: EnhancedNotification,
    strategy: DeliveryStrategy
  ): Promise<{ success: boolean; deliveredChannels: NotificationChannel[]; failedChannels: NotificationChannel[] }> {
    try {
      const deliveredChannels: NotificationChannel[] = [];
      const failedChannels: NotificationChannel[] = [];

      // Try primary channel first
      const primaryResult = await this.deliverToChannel(notification, strategy.primaryChannel);
      if (primaryResult.success) {
        deliveredChannels.push(strategy.primaryChannel);
      } else {
        failedChannels.push(strategy.primaryChannel);

        // Try fallback channels
        for (const channel of strategy.fallbackChannels) {
          const fallbackResult = await this.deliverToChannel(notification, channel);
          if (fallbackResult.success) {
            deliveredChannels.push(channel);
          } else {
            failedChannels.push(channel);
          }
        }
      }

      // Execute escalation rules if needed
      if (failedChannels.length > 0 && strategy.escalationRules) {
        await this.executeEscalationRules(notification, strategy, failedChannels);
      }

      return {
        success: deliveredChannels.length > 0,
        deliveredChannels,
        failedChannels,
      };
    } catch (error) {
      console.error('Failed to execute delivery strategy:', error);
      return {
        success: false,
        deliveredChannels: [],
        failedChannels: strategy.fallbackChannels.concat(strategy.primaryChannel),
      };
    }
  }

  private async deliverToChannel(
    notification: EnhancedNotification,
    channel: NotificationChannel
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if channel is enabled
      const config = this.channelConfigs.get(channel);
      if (!config?.enabled) {
        return { success: false, error: 'Channel not enabled' };
      }

      // Check rate limits
      const withinLimits = await this.checkRateLimit(channel);
      if (!withinLimits) {
        return { success: false, error: 'Rate limit exceeded' };
      }

      // Check if channel is enabled for this notification
      if (!notification.channels[channel as keyof typeof notification.channels]) {
        return { success: false, error: 'Channel not enabled for notification' };
      }

      // Record delivery attempt
      const attemptId = await this.recordDeliveryAttempt(notification.id, channel, 'sent');

      // Execute channel-specific delivery
      const deliveryResult = await this.executeChannelDelivery(notification, channel);

      // Update delivery attempt with result
      await this.updateDeliveryAttempt(attemptId, deliveryResult.success ? 'delivered' : 'failed', deliveryResult.error);

      // Update rate limiter
      this.updateRateLimiter(channel);

      return deliveryResult;
    } catch (error) {
      console.error(`Failed to deliver to ${channel}:`, error);
      return { success: false, error: String(error) };
    }
  }

  private async executeChannelDelivery(
    notification: EnhancedNotification,
    channel: NotificationChannel
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (channel) {
        case 'inApp':
          return await this.deliverInApp(notification);
        case 'push':
          return await this.deliverPush(notification);
        case 'email':
          return await this.deliverEmail(notification);
        case 'sms':
          return await this.deliverSMS(notification);
        case 'webhook':
          return await this.deliverWebhook(notification);
        default:
          return { success: false, error: 'Unknown channel' };
      }
    } catch (error) {
      console.error(`Failed to execute ${channel} delivery:`, error);
      return { success: false, error: String(error) };
    }
  }

  private async deliverInApp(notification: EnhancedNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // In-app notifications are handled by the existing notification service
      // This would typically update the user's notification center
      console.log('Delivering in-app notification:', notification.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async deliverPush(notification: EnhancedNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's FCM token
      const userDoc = await getDoc(doc(db, 'users', notification.userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        return { success: false, error: 'No FCM token available' };
      }

      // Prepare push notification payload
      const payload: PushNotificationPayload = {
        title: notification.title,
        body: notification.message,
        icon: notification.imageUrl || '/favicon.ico',
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...notification.data,
        },
      };

      // Send to FCM (this would typically be done server-side)
      console.log('Sending push notification:', { fcmToken, payload });

      // In a real implementation, you would call your backend API
      // which would then send the notification via FCM

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async deliverEmail(notification: EnhancedNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's email
      const userDoc = await getDoc(doc(db, 'users', notification.userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();
      const email = userData.email;

      if (!email) {
        return { success: false, error: 'No email available' };
      }

      // Prepare email content
      const emailContent = {
        to: email,
        subject: notification.title,
        html: this.generateEmailHTML(notification),
        text: notification.message,
      };

      // Send email (this would typically be done via an email service)
      console.log('Sending email notification:', emailContent);

      // In a real implementation, you would call your email service API

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async deliverSMS(notification: EnhancedNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's phone number
      const userDoc = await getDoc(doc(db, 'users', notification.userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();
      const phoneNumber = userData.phoneNumber;

      if (!phoneNumber) {
        return { success: false, error: 'No phone number available' };
      }

      // Prepare SMS content
      const smsContent = {
        to: phoneNumber,
        body: `${notification.title}: ${notification.message}`,
      };

      // Send SMS (this would typically be done via an SMS service)
      console.log('Sending SMS notification:', smsContent);

      // In a real implementation, you would call your SMS service API

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async deliverWebhook(notification: EnhancedNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // Get webhook configurations
      const webhooksQuery = query(
        collection(db, 'notificationWebhooks'),
        where('enabled', '==', true),
        where('events', 'array-contains', notification.type)
      );

      const querySnapshot = await getDocs(webhooksQuery);
      const webhooks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (webhooks.length === 0) {
        return { success: false, error: 'No webhooks configured' };
      }

      // Send to all configured webhooks
      const webhookResults = await Promise.allSettled(
        webhooks.map(webhook => this.sendToWebhook(webhook, notification))
      );

      const successCount = webhookResults.filter(result => result.status === 'fulfilled').length;
      const hasSuccess = successCount > 0;

      return {
        success: hasSuccess,
        error: hasSuccess ? undefined : 'All webhook deliveries failed',
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async sendToWebhook(webhook: any, notification: EnhancedNotification): Promise<boolean> {
    try {
      const payload = {
        event: 'notification',
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: new Date().toISOString(),
      };

      // Send HTTP request to webhook URL
      console.log('Sending webhook notification:', { url: webhook.url, payload });

      // In a real implementation, you would make an HTTP request to the webhook URL
      // const response = await fetch(webhook.url, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      return true;
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      return false;
    }
  }

  // ==================== ESCALATION RULES ====================

  private async executeEscalationRules(
    notification: EnhancedNotification,
    strategy: DeliveryStrategy,
    failedChannels: NotificationChannel[]
  ): Promise<void> {
    try {
      if (!strategy.escalationRules) return;

      for (const rule of strategy.escalationRules) {
        const shouldEscalate = await this.evaluateEscalationRule(notification, rule, failedChannels);
        if (shouldEscalate) {
          await this.executeEscalationAction(notification, rule);
        }
      }
    } catch (error) {
      console.error('Failed to execute escalation rules:', error);
    }
  }

  private async evaluateEscalationRule(
    notification: EnhancedNotification,
    rule: EscalationRule,
    failedChannels: NotificationChannel[]
  ): Promise<boolean> {
    try {
      // Check if enough time has passed since notification creation
      const timeSinceCreation = Date.now() - new Date(notification.createdAt).getTime();
      const requiredDelay = this.parseDelay(rule.delay || 0);

      if (timeSinceCreation < requiredDelay) {
        return false;
      }

      // Check if condition matches
      switch (rule.condition) {
        case 'not_opened_after_1h':
          return timeSinceCreation >= 60 * 60 * 1000; // 1 hour
        case 'not_opened_after_24h':
          return timeSinceCreation >= 24 * 60 * 60 * 1000; // 24 hours
        case 'primary_channel_failed':
          return failedChannels.includes(notification.deliveryStrategy?.primaryChannel || 'inApp');
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to evaluate escalation rule:', error);
      return false;
    }
  }

  private async executeEscalationAction(
    notification: EnhancedNotification,
    rule: EscalationRule
  ): Promise<void> {
    try {
      switch (rule.action) {
        case 'retry':
          if (rule.channel) {
            await this.deliverToChannel(notification, rule.channel);
          }
          break;
        case 'escalate':
          if (rule.channel) {
            await this.deliverToChannel(notification, rule.channel);
          }
          break;
        case 'abandon':
          // Mark notification as abandoned
          await this.markNotificationAbandoned(notification.id);
          break;
      }
    } catch (error) {
      console.error('Failed to execute escalation action:', error);
    }
  }

  private parseDelay(delay: number): number {
    // Assume delay is in minutes if less than 1000, otherwise milliseconds
    return delay < 1000 ? delay * 60 * 1000 : delay;
  }

  private async markNotificationAbandoned(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        status: 'abandoned',
        abandonedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to mark notification as abandoned:', error);
    }
  }

  // ==================== RATE LIMITING ====================

  private async checkRateLimit(channel: NotificationChannel): Promise<boolean> {
    try {
      const limiter = this.rateLimiters.get(channel);
      if (!limiter) return true;

      const now = Date.now();
      const config = this.channelConfigs.get(channel);

      // Reset counter if time window has passed
      if (now >= limiter.resetTime) {
        limiter.count = 0;
        limiter.resetTime = now + 60000; // Reset every minute
      }

      // Check per-minute limit
      if (config?.rateLimit?.maxPerHour) {
        const maxPerMinute = Math.floor(config.rateLimit.maxPerHour / 60);
        if (limiter.count >= maxPerMinute) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return true; // Allow if we can't check
    }
  }

  private updateRateLimiter(channel: NotificationChannel): void {
    const limiter = this.rateLimiters.get(channel);
    if (limiter) {
      limiter.count++;
    }
  }

  // ==================== DELIVERY TRACKING ====================

  private async recordDeliveryAttempt(
    notificationId: string,
    channel: NotificationChannel,
    status: 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<string> {
    try {
      const attempt: Omit<DeliveryAttempt, 'id'> = {
        notificationId,
        channel,
        status,
        attemptNumber: 1, // Would increment for retries
        sentAt: status === 'sent' ? new Date().toISOString() : undefined,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
        failedAt: status === 'failed' ? new Date().toISOString() : undefined,
        errorMessage,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };

      const attemptRef = await addDoc(collection(db, 'notificationDeliveryAttempts'), attempt);
      return attemptRef.id;
    } catch (error) {
      console.error('Failed to record delivery attempt:', error);
      return '';
    }
  }

  private async updateDeliveryAttempt(
    attemptId: string,
    status: 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'notificationDeliveryAttempts', attemptId), {
        status,
        sentAt: status === 'sent' ? new Date().toISOString() : undefined,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
        failedAt: status === 'failed' ? new Date().toISOString() : undefined,
        errorMessage,
      });
    } catch (error) {
      console.error('Failed to update delivery attempt:', error);
    }
  }

  // ==================== CHANNEL PERFORMANCE ====================

  async getChannelPerformance(
    channel: NotificationChannel,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<ChannelPerformance> {
    try {
      const { startDate, endDate } = this.getDateRange(period);

      const attemptsQuery = query(
        collection(db, 'notificationDeliveryAttempts'),
        where('channel', '==', channel),
        where('sentAt', '>=', startDate),
        where('sentAt', '<=', endDate)
      );

      const querySnapshot = await getDocs(attemptsQuery);
      const attempts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryAttempt[];

      const totalSent = attempts.length;
      const totalDelivered = attempts.filter(a => a.status === 'delivered').length;
      const totalOpened = attempts.filter(a => a.status === 'delivered').length; // Would need open tracking
      const totalClicked = attempts.filter(a => a.status === 'delivered').length; // Would need click tracking

      // Calculate average delivery time
      const deliveryTimes = attempts
        .filter(a => a.sentAt && a.deliveredAt)
        .map(a => new Date(a.deliveredAt!).getTime() - new Date(a.sentAt!).getTime());

      const avgDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        : 0;

      // Calculate bounce rate (failed deliveries)
      const bounced = attempts.filter(a => a.status === 'failed').length;
      const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;

      // Calculate complaint rate (would need complaint tracking)
      const complaintRate = 0;

      return {
        channel,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        avgDeliveryTime,
        bounceRate,
        complaintRate,
      };
    } catch (error) {
      console.error('Failed to get channel performance:', error);
      return {
        channel,
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        avgDeliveryTime: 0,
        bounceRate: 0,
        complaintRate: 0,
      };
    }
  }

  async getAllChannelPerformance(
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<Record<NotificationChannel, ChannelPerformance>> {
    try {
      const channels: NotificationChannel[] = ['inApp', 'push', 'email', 'sms', 'webhook'];
      const performance: Record<string, ChannelPerformance> = {};

      for (const channel of channels) {
        performance[channel] = await this.getChannelPerformance(channel, period);
      }

      return performance as Record<NotificationChannel, ChannelPerformance>;
    } catch (error) {
      console.error('Failed to get all channel performance:', error);
      return {} as Record<NotificationChannel, ChannelPerformance>;
    }
  }

  // ==================== BATCH DELIVERY ====================

  async deliverBatch(
    notifications: EnhancedNotification[],
    strategy?: DeliveryStrategy
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ notificationId: string; success: boolean; channels: NotificationChannel[] }>;
  }> {
    try {
      let successful = 0;
      let failed = 0;
      const results: Array<{ notificationId: string; success: boolean; channels: NotificationChannel[] }> = [];

      for (const notification of notifications) {
        const deliveryStrategy = strategy || notification.deliveryStrategy;
        if (!deliveryStrategy) {
          failed++;
          results.push({
            notificationId: notification.id,
            success: false,
            channels: [],
          });
          continue;
        }

        const result = await this.executeDeliveryStrategy(notification, deliveryStrategy);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        results.push({
          notificationId: notification.id,
          success: result.success,
          channels: result.deliveredChannels,
        });
      }

      return { successful, failed, results };
    } catch (error) {
      console.error('Failed to deliver batch:', error);
      return {
        successful: 0,
        failed: notifications.length,
        results: notifications.map(n => ({ notificationId: n.id, success: false, channels: [] })),
      };
    }
  }

  // ==================== UTILITY METHODS ====================

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

  private generateEmailHTML(notification: EnhancedNotification): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { line-height: 1.6; color: #333; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">View Details</a>` : ''}
            </div>
            <div class="footer">
              <p>You received this notification because you are subscribed to updates.</p>
              <p>To unsubscribe, please update your notification preferences.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // ==================== QUEUE MANAGEMENT ====================

  private async processDeliveryQueue(): Promise<void> {
    try {
      // Process any queued delivery attempts
      // This would handle retries and escalation
      console.log('Processing delivery queue...');
    } catch (error) {
      console.error('Failed to process delivery queue:', error);
    }
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    this.channelConfigs.clear();
    this.deliveryQueue.clear();
    this.rateLimiters.clear();
  }
}

// Export singleton instance
export const multiChannelDeliveryManager = MultiChannelDeliveryManager.getInstance();