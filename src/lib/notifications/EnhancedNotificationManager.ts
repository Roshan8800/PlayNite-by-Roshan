// Enhanced Notification Manager - Advanced notification control and orchestration
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
  startAfter,
  writeBatch,
  Timestamp,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { notificationService } from '../services/notification-service';
import { notificationAnalyticsService } from '../services/notification-analytics-service';
import type {
  EnhancedNotification,
  EnhancedNotificationResponse,
  NotificationDeliveryReport,
  NotificationQueue,
  RealTimeEvent,
  UserContext,
  DeliveryStrategy,
  NotificationChannel,
  EnhancedNotificationMetadata,
} from './types';
import type {
  Notification as NotificationType,
  NotificationFilter,
  NotificationBulkAction,
  SocialApiResponse,
  PaginatedSocialResponse,
} from '../types/social';
import { SocialError } from '../types/social';

export class EnhancedNotificationManager {
  private static instance: EnhancedNotificationManager;
  private notificationQueue: Map<string, NotificationQueue> = new Map();
  private deliveryStrategies: Map<string, DeliveryStrategy> = new Map();
  private userContexts: Map<string, UserContext> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeManager();
    this.startQueueProcessor();
  }

  public static getInstance(): EnhancedNotificationManager {
    if (!EnhancedNotificationManager.instance) {
      EnhancedNotificationManager.instance = new EnhancedNotificationManager();
    }
    return EnhancedNotificationManager.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeManager(): Promise<void> {
    try {
      // Load active delivery strategies
      await this.loadDeliveryStrategies();

      // Load pending notifications from queue
      await this.loadNotificationQueue();

      // Setup real-time listeners
      this.setupRealtimeListeners();

      console.log('Enhanced Notification Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Enhanced Notification Manager:', error);
    }
  }

  private async loadDeliveryStrategies(): Promise<void> {
    try {
      const strategiesQuery = query(
        collection(db, 'notificationDeliveryStrategies'),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(strategiesQuery);
      querySnapshot.docs.forEach(doc => {
        const strategy = doc.data() as DeliveryStrategy;
        this.deliveryStrategies.set(doc.id, strategy);
      });
    } catch (error) {
      console.error('Failed to load delivery strategies:', error);
    }
  }

  private async loadNotificationQueue(): Promise<void> {
    try {
      const queueQuery = query(
        collection(db, 'notificationQueue'),
        where('status', 'in', ['queued', 'processing']),
        orderBy('priority', 'desc'),
        orderBy('scheduledFor', 'asc')
      );

      const querySnapshot = await getDocs(queueQuery);
      querySnapshot.docs.forEach(doc => {
        const queueItem = { id: doc.id, ...doc.data() } as NotificationQueue;
        this.notificationQueue.set(doc.id, queueItem);
      });
    } catch (error) {
      console.error('Failed to load notification queue:', error);
    }
  }

  private setupRealtimeListeners(): void {
    // Listen for user context updates
    const userContextQuery = query(collection(db, 'userContexts'));
    onSnapshot(userContextQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const context = { userId: change.doc.id, ...change.doc.data() } as UserContext;
          this.userContexts.set(change.doc.id, context);
        } else if (change.type === 'removed') {
          this.userContexts.delete(change.doc.id);
        }
      });
    });
  }

  private startQueueProcessor(): void {
    // Process notification queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 30000);
  }

  // ==================== ENHANCED NOTIFICATION CREATION ====================

  async createEnhancedNotification(
    userId: string,
    type: NotificationType['type'],
    title: string,
    message: string,
    options: {
      data?: Record<string, any>;
      priority?: NotificationType['priority'];
      channels?: NotificationType['channels'];
      scheduledFor?: string;
      targetSegments?: string[];
      experimentId?: string;
      variantId?: string;
      metadata?: EnhancedNotificationMetadata;
    } = {}
  ): Promise<EnhancedNotificationResponse<EnhancedNotification>> {
    try {
      // Get user context for personalization
      const userContext = await this.getUserContext(userId);

      // Apply personalization rules
      const personalizedContent = await this.applyPersonalizationRules(userId, {
        title,
        message,
        type,
        userContext,
      });

      // Determine optimal delivery strategy
      const deliveryStrategy = await this.determineDeliveryStrategy(userId, type, options);

      // Calculate optimal send time
      const optimalSendTime = await this.calculateOptimalSendTime(userId, type);

      // Create enhanced notification
      const enhancedNotification: Omit<EnhancedNotification, 'id'> = {
        userId,
        type,
        title: personalizedContent.title,
        message: personalizedContent.message,
        data: options.data || {},
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: options.priority || 'normal',
        category: this.getNotificationCategory(type),
        isGrouped: false,
        channels: options.channels || {
          inApp: true,
          push: true,
          email: false,
        },
        preferences: {
          allowPreview: true,
          allowSound: true,
          allowVibration: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
        },
        // Enhanced properties
        personalizedContent: personalizedContent,
        scheduledFor: options.scheduledFor || optimalSendTime,
        optimalSendTime,
        timezone: (userContext as any)?.timezone || 'UTC',
        targetSegments: options.targetSegments,
        userContext: userContext || undefined,
        experimentId: options.experimentId,
        variantId: options.variantId,
        deliveryStrategy,
        metadata: options.metadata,
      };

      // Add to queue for processing
      const queueItem = await this.addToQueue(enhancedNotification);

      // Create the actual notification
      const notificationResult = await notificationService.createNotification(
        userId,
        type,
        personalizedContent.title,
        personalizedContent.message,
        options.data,
        {
          priority: options.priority,
          channels: options.channels,
          category: this.getNotificationCategory(type),
        }
      );

      if (notificationResult.success) {
        // Update queue item with notification ID
        await this.updateQueueItem(queueItem.id, {
          notificationId: notificationResult.data.id,
          status: 'processing',
        });

        const result: EnhancedNotification = {
          id: notificationResult.data.id,
          ...enhancedNotification,
        };

        return {
          data: result,
          success: true,
          message: 'Enhanced notification created successfully',
          timestamp: new Date().toISOString(),
          metadata: {
            processingTime: Date.now() - new Date(queueItem.createdAt).getTime(),
          } as any,
        };
      }

      throw new Error('Failed to create base notification');
    } catch (error) {
      throw new SocialError({
        message: 'Failed to create enhanced notification',
        code: 'ENHANCED_NOTIFICATION_CREATE_FAILED',
        statusCode: 500,
        details: error as Record<string, any>,
      });
    }
  }

  // ==================== USER CONTEXT MANAGEMENT ====================

  private async getUserContext(userId: string): Promise<UserContext | null> {
    try {
      // Check cache first
      if (this.userContexts.has(userId)) {
        return this.userContexts.get(userId)!;
      }

      // Get from Firestore
      const contextDoc = await getDoc(doc(db, 'userContexts', userId));
      if (contextDoc.exists()) {
        const context = { userId, ...contextDoc.data() } as UserContext;
        this.userContexts.set(userId, context);
        return context;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user context:', error);
      return null;
    }
  }

  async updateUserContext(userId: string, context: Partial<UserContext>): Promise<void> {
    try {
      await updateDoc(doc(db, 'userContexts', userId), {
        ...context,
        lastUpdated: new Date().toISOString(),
      });

      // Update cache
      const currentContext = this.userContexts.get(userId) || { userId };
      this.userContexts.set(userId, { ...currentContext, ...context });
    } catch (error) {
      console.error('Failed to update user context:', error);
    }
  }

  // ==================== PERSONALIZATION ====================

  private async applyPersonalizationRules(
    userId: string,
    content: { title: string; message: string; type: string; userContext: UserContext | null }
  ): Promise<{ title: string; message: string; imageUrl?: string; actionUrl?: string }> {
    try {
      // Get personalization rules for this notification type
      const rulesQuery = query(
        collection(db, 'personalizationRules'),
        where('isActive', '==', true),
        where('notificationType', '==', content.type),
        orderBy('priority', 'desc')
      );

      const rulesSnapshot = await getDocs(rulesQuery);
      const rules = rulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let personalizedTitle = content.title;
      let personalizedMessage = content.message;
      let imageUrl: string | undefined;
      let actionUrl: string | undefined;

      // Apply rules in priority order
      for (const rule of rules) {
        const shouldApply = await this.evaluatePersonalizationRule(rule, userId, content.userContext);
        if (shouldApply) {
          const result = await this.applyPersonalizationAction(rule, {
            title: personalizedTitle,
            message: personalizedMessage,
          });

          personalizedTitle = result.title;
          personalizedMessage = result.message;
          imageUrl = result.imageUrl || imageUrl;
          actionUrl = result.actionUrl || actionUrl;
        }
      }

      return {
        title: personalizedTitle,
        message: personalizedMessage,
        imageUrl,
        actionUrl,
      };
    } catch (error) {
      console.error('Failed to apply personalization rules:', error);
      return {
        title: content.title,
        message: content.message,
      };
    }
  }

  private async evaluatePersonalizationRule(
    rule: any,
    userId: string,
    userContext: UserContext | null
  ): Promise<boolean> {
    try {
      for (const condition of rule.conditions) {
        const fieldValue = this.getFieldValue(condition.field, userId, userContext);
        const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);

        if (condition.logicalOperator === 'OR' && conditionMet) {
          return true;
        } else if (condition.logicalOperator === 'AND' && !conditionMet) {
          return false;
        } else if (!condition.logicalOperator && !conditionMet) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to evaluate personalization rule:', error);
      return false;
    }
  }

  private getFieldValue(field: string, userId: string, userContext: UserContext | null): any {
    const parts = field.split('.');
    if (parts[0] === 'user' && parts[1]) {
      // Get user data from Firestore or context
      return (userContext as any)?.[parts[1]];
    } else if (parts[0] === 'context' && parts[1]) {
      return (userContext as any)?.[parts[1]];
    }
    return null;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'between':
        return Array.isArray(expectedValue) &&
               Number(fieldValue) >= Number(expectedValue[0]) &&
               Number(fieldValue) <= Number(expectedValue[1]);
      default:
        return false;
    }
  }

  private async applyPersonalizationAction(
    rule: any,
    content: { title: string; message: string }
  ): Promise<{ title: string; message: string; imageUrl?: string; actionUrl?: string }> {
    let newTitle = content.title;
    let newMessage = content.message;
    let imageUrl: string | undefined;
    let actionUrl: string | undefined;

    for (const action of rule.actions) {
      switch (action.type) {
        case 'modify_content':
          newTitle = this.applyTemplateVariables(newTitle, action.parameters);
          newMessage = this.applyTemplateVariables(newMessage, action.parameters);
          break;
        case 'modify_channel':
          // Channel modifications would be applied to delivery strategy
          break;
        case 'modify_schedule':
          // Schedule modifications would be applied to timing
          break;
        case 'modify_priority':
          // Priority modifications would be applied to notification
          break;
      }
    }

    return { title: newTitle, message: newMessage, imageUrl, actionUrl };
  }

  private applyTemplateVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  // ==================== DELIVERY STRATEGY ====================

  private async determineDeliveryStrategy(
    userId: string,
    type: NotificationType['type'],
    options: any
  ): Promise<DeliveryStrategy> {
    try {
      // Get user's preferred channels from analytics
      const analytics = await notificationAnalyticsService.getNotificationAnalytics(userId, 'week');
      const preferredChannels = this.getPreferredChannels(analytics);

      // Create delivery strategy based on notification type and user preferences
      const strategy: DeliveryStrategy = {
        primaryChannel: preferredChannels[0] || 'inApp',
        fallbackChannels: preferredChannels.slice(1),
        retryAttempts: 3,
        retryDelay: 5000, // 5 seconds
        escalationRules: [
          {
            condition: 'not_opened_after_1h',
            action: 'retry',
            channel: 'push',
            delay: 3600000, // 1 hour
          },
          {
            condition: 'not_opened_after_24h',
            action: 'escalate',
            channel: 'email',
            delay: 86400000, // 24 hours
          },
        ],
      };

      return strategy;
    } catch (error) {
      console.error('Failed to determine delivery strategy:', error);
      return {
        primaryChannel: 'inApp',
        fallbackChannels: ['push'],
        retryAttempts: 3,
        retryDelay: 5000,
      };
    }
  }

  private getPreferredChannels(analytics: any): NotificationChannel[] {
    const channelPerformance = Object.entries(analytics.byChannel)
      .map(([channel, metrics]: [string, any]) => ({
        channel: channel as NotificationChannel,
        engagementRate: metrics.delivered > 0 ? (metrics.read / metrics.delivered) * 100 : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);

    return channelPerformance.map(cp => cp.channel);
  }

  // ==================== OPTIMAL TIMING ====================

  private async calculateOptimalSendTime(
    userId: string,
    type: NotificationType['type']
  ): Promise<string> {
    try {
      // Get user's historical engagement data
      const analytics = await notificationAnalyticsService.getNotificationAnalytics(userId, 'week');

      // Use the optimal send time from analytics or calculate based on type
      if (analytics.optimalSendTime && analytics.optimalSendTime !== '12:00') {
        return analytics.optimalSendTime;
      }

      // Default optimal times based on notification type
      const defaultTimes: Record<NotificationType['type'], string> = {
        like: '19:00',
        comment: '19:00',
        follow: '12:00',
        friend_request: '12:00',
        mention: '19:00',
        tag: '19:00',
        share: '19:00',
        system: '12:00',
        achievement: '12:00',
        milestone: '12:00',
      };

      return defaultTimes[type] || '12:00';
    } catch (error) {
      console.error('Failed to calculate optimal send time:', error);
      return '12:00';
    }
  }

  // ==================== QUEUE MANAGEMENT ====================

  private async addToQueue(notification: Omit<EnhancedNotification, 'id'>): Promise<NotificationQueue> {
    try {
      const queueItem: Omit<NotificationQueue, 'id'> = {
        notificationId: '', // Will be updated after notification creation
        priority: this.getPriorityScore(notification.priority),
        scheduledFor: notification.scheduledFor || new Date().toISOString(),
        status: 'queued',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const queueRef = await addDoc(collection(db, 'notificationQueue'), queueItem);
      const queueWithId = { id: queueRef.id, ...queueItem };

      this.notificationQueue.set(queueRef.id, queueWithId);
      return queueWithId;
    } catch (error) {
      console.error('Failed to add notification to queue:', error);
      throw error;
    }
  }

  private async updateQueueItem(queueId: string, updates: Partial<NotificationQueue>): Promise<void> {
    try {
      await updateDoc(doc(db, 'notificationQueue', queueId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      const currentItem = this.notificationQueue.get(queueId);
      if (currentItem) {
        this.notificationQueue.set(queueId, { ...currentItem, ...updates });
      }
    } catch (error) {
      console.error('Failed to update queue item:', error);
    }
  }

  private async processNotificationQueue(): Promise<void> {
    try {
      const now = new Date().toISOString();
      const readyItems = Array.from(this.notificationQueue.values())
        .filter(item => item.status === 'queued' && item.scheduledFor <= now)
        .sort((a, b) => b.priority - a.priority);

      for (const item of readyItems.slice(0, 10)) { // Process 10 items at a time
        await this.processQueueItem(item);
      }
    } catch (error) {
      console.error('Failed to process notification queue:', error);
    }
  }

  private async processQueueItem(queueItem: NotificationQueue): Promise<void> {
    try {
      // Update status to processing
      await this.updateQueueItem(queueItem.id, { status: 'processing' });

      // Get notification details
      const notificationDoc = await getDoc(doc(db, 'notifications', queueItem.notificationId));
      if (!notificationDoc.exists()) {
        await this.updateQueueItem(queueItem.id, { status: 'failed' });
        return;
      }

      const notification = { id: notificationDoc.id, ...notificationDoc.data() } as EnhancedNotification;

      // Execute delivery strategy
      const deliveryResult = await this.executeDeliveryStrategy(notification);

      if (deliveryResult.success) {
        await this.updateQueueItem(queueItem.id, { status: 'sent' });
      } else {
        // Handle retry logic
        if (queueItem.attempts < queueItem.maxAttempts) {
          await this.scheduleRetry(queueItem);
        } else {
          await this.updateQueueItem(queueItem.id, { status: 'failed' });
        }
      }
    } catch (error) {
      console.error('Failed to process queue item:', error);
      await this.updateQueueItem(queueItem.id, { status: 'failed' });
    }
  }

  private async executeDeliveryStrategy(notification: EnhancedNotification): Promise<{ success: boolean; channel?: NotificationChannel }> {
    try {
      if (!notification.deliveryStrategy) {
        return { success: false };
      }

      const strategy = notification.deliveryStrategy;

      // Try primary channel first
      const primaryResult = await this.deliverToChannel(notification, strategy.primaryChannel);
      if (primaryResult.success) {
        return { success: true, channel: strategy.primaryChannel };
      }

      // Try fallback channels
      for (const channel of strategy.fallbackChannels) {
        const fallbackResult = await this.deliverToChannel(notification, channel);
        if (fallbackResult.success) {
          return { success: true, channel };
        }
      }

      return { success: false };
    } catch (error) {
      console.error('Failed to execute delivery strategy:', error);
      return { success: false };
    }
  }

  private async deliverToChannel(
    notification: EnhancedNotification,
    channel: NotificationChannel
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if channel is enabled for this notification
      if (!notification.channels[channel as keyof typeof notification.channels]) {
        return { success: false, error: 'Channel not enabled' };
      }

      // Record delivery attempt
      await this.recordDeliveryAttempt(notification.id, channel, 'sent');

      switch (channel) {
        case 'inApp':
          // In-app notifications are handled by the existing service
          break;
        case 'push':
          await this.sendPushNotification(notification);
          break;
        case 'email':
          await this.sendEmailNotification(notification);
          break;
        case 'sms':
          await this.sendSMSNotification(notification);
          break;
        case 'webhook':
          await this.sendWebhookNotification(notification);
          break;
      }

      // Record successful delivery
      await this.recordDeliveryAttempt(notification.id, channel, 'delivered');

      return { success: true };
    } catch (error) {
      console.error(`Failed to deliver to ${channel}:`, error);
      await this.recordDeliveryAttempt(notification.id, channel, 'failed', String(error));
      return { success: false, error: String(error) };
    }
  }

  private async recordDeliveryAttempt(
    notificationId: string,
    channel: NotificationChannel,
    status: 'sent' | 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notificationDeliveryAttempts'), {
        notificationId,
        channel,
        status,
        attemptNumber: 1, // Would increment for retries
        sentAt: status === 'sent' ? new Date().toISOString() : undefined,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined,
        failedAt: status === 'failed' ? new Date().toISOString() : undefined,
        errorMessage,
        metadata: {},
      });
    } catch (error) {
      console.error('Failed to record delivery attempt:', error);
    }
  }

  private async sendPushNotification(notification: EnhancedNotification): Promise<void> {
    // Implementation would integrate with FCM or other push services
    console.log('Sending push notification:', notification.id);
  }

  private async sendEmailNotification(notification: EnhancedNotification): Promise<void> {
    // Implementation would integrate with email service
    console.log('Sending email notification:', notification.id);
  }

  private async sendSMSNotification(notification: EnhancedNotification): Promise<void> {
    // Implementation would integrate with SMS service
    console.log('Sending SMS notification:', notification.id);
  }

  private async sendWebhookNotification(notification: EnhancedNotification): Promise<void> {
    // Implementation would send to configured webhook endpoints
    console.log('Sending webhook notification:', notification.id);
  }

  private async scheduleRetry(queueItem: NotificationQueue): Promise<void> {
    const retryDelay = 5000 * Math.pow(2, queueItem.attempts); // Exponential backoff

    await this.updateQueueItem(queueItem.id, {
      status: 'queued',
      attempts: queueItem.attempts + 1,
      scheduledFor: new Date(Date.now() + retryDelay).toISOString(),
    });
  }

  // ==================== UTILITY METHODS ====================

  private getNotificationCategory(type: NotificationType['type']): NotificationType['category'] {
    switch (type) {
      case 'like':
      case 'comment':
      case 'follow':
      case 'friend_request':
      case 'mention':
      case 'tag':
      case 'share':
        return 'social';
      case 'achievement':
      case 'milestone':
        return 'achievement';
      case 'system':
        return 'system';
      default:
        return 'social';
    }
  }

  private getPriorityScore(priority: NotificationType['priority']): number {
    switch (priority) {
      case 'urgent': return 100;
      case 'high': return 75;
      case 'normal': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  // ==================== ENHANCED NOTIFICATION RETRIEVAL ====================

  async getEnhancedNotifications(
    userId: string,
    filters?: NotificationFilter & { page?: number; limit?: number }
  ): Promise<PaginatedSocialResponse<EnhancedNotification>> {
    try {
      // Get base notifications
      const baseResult = await notificationService.getNotifications(userId, filters);

      // Enhance with additional data
      const enhancedNotifications = await Promise.all(
        baseResult.data.map(async (notification) => {
          const enhanced = notification as EnhancedNotification;

          // Add delivery strategy if not present
          if (!enhanced.deliveryStrategy) {
            enhanced.deliveryStrategy = await this.determineDeliveryStrategy(userId, notification.type, {});
          }

          // Add user context if not present
          if (!enhanced.userContext) {
            enhanced.userContext = await this.getUserContext(userId) || undefined;
          }

          return enhanced;
        })
      );

      return {
        data: enhancedNotifications,
        pagination: baseResult.pagination,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== REAL-TIME EVENT HANDLING ====================

  async publishRealTimeEvent(event: Omit<RealTimeEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const fullEvent: RealTimeEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...event,
      };

      // Store event in Firestore for persistence
      await addDoc(collection(db, 'realTimeEvents'), fullEvent);

      // Broadcast to WebSocket connections
      await this.broadcastToWebSocketConnections(fullEvent);

      console.log('Real-time event published:', fullEvent.id);
    } catch (error) {
      console.error('Failed to publish real-time event:', error);
    }
  }

  private async broadcastToWebSocketConnections(event: RealTimeEvent): Promise<void> {
    // Implementation would broadcast to active WebSocket connections
    // This would integrate with the existing WebSocket system
    console.log('Broadcasting event to WebSocket connections:', event.id);
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.notificationQueue.clear();
    this.deliveryStrategies.clear();
    this.userContexts.clear();
  }
}

// Export singleton instance
export const enhancedNotificationManager = EnhancedNotificationManager.getInstance();