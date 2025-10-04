// Comprehensive Notification Service
import { logger, logError, logInfo } from '@/lib/logging';
import { ErrorManager } from '@/lib/errors/ErrorManager';
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/types';
import Debug from 'debug';
const debug = Debug('playnite:notification-service');

import { messaging } from '../firebase';
import {
  getToken,
  onMessage,
  deleteToken,
  getMessaging,
} from 'firebase/messaging';
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
import type {
  Notification as NotificationType,
  NotificationPreferences,
  NotificationFilter,
  NotificationBulkAction,
  NotificationAnalytics,
  Achievement,
  Milestone,
  NotificationGroup,
  PushNotificationPayload,
  NotificationWebSocketMessage,
  SocialApiResponse,
  PaginatedSocialResponse,
} from '../types/social';
import { SocialError } from '../types/social';

export class NotificationService {
  private static instance: NotificationService;
  private subscriptions: Map<string, () => void> = new Map();
  private messageListeners: Array<(payload: any) => void> = [];
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {
    this.initializeMessaging();
    this.setupWebSocket();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // ==================== FIREBASE CLOUD MESSAGING ====================

  private async initializeMessaging(): Promise<void> {
    const startTime = performance.now();

    debug('initializeMessaging called');

    logInfo('Firebase messaging initialization started', {
      component: 'notification-service',
      operation: 'initializeMessaging',
      metadata: {
        hasMessaging: !!messaging,
        isServerSide: typeof window === 'undefined'
      }
    });

    if (typeof window === 'undefined' || !messaging) {
      debug('Skipping messaging initialization - server side or no messaging');
      return;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      let token: string | undefined;

      debug('Notification permission result:', permission);

      if (permission === 'granted') {
        // Get FCM token
        token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (token) {
          debug('FCM token obtained successfully');

          logInfo('FCM token obtained successfully', {
            component: 'notification-service',
            operation: 'initializeMessaging',
            metadata: {
              hasToken: true,
              tokenLength: token.length,
              vapidKeyConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
            }
          });

          // Save token to user's document or send to server
          await this.saveFCMToken(token);
        } else {
          logError(new Error('Failed to get FCM token'), {
            category: ErrorCategory.EXTERNAL_API,
            severity: ErrorSeverity.HIGH,
            component: 'notification-service',
            action: 'initializeMessaging',
            metadata: {
              permission: permission,
              vapidKeyConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
            }
          });
        }
      } else {
        debug('Notification permission denied or default');

        logInfo('Notification permission not granted', {
          component: 'notification-service',
          operation: 'initializeMessaging',
          metadata: {
            permission,
            reason: permission === 'denied' ? 'user_denied' : 'default_or_dismissed'
          }
        });
      }

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        debug('Foreground message received:', {
          hasNotification: !!payload.notification,
          dataKeys: Object.keys(payload.data || {})
        });

        logInfo('Foreground message received', {
          component: 'notification-service',
          operation: 'onMessage',
          metadata: {
            title: payload.notification?.title,
            body: payload.notification?.body,
            dataKeys: Object.keys(payload.data || {}),
            timestamp: new Date().toISOString()
          }
        });

        this.handleForegroundMessage(payload);
      });

      const duration = performance.now() - startTime;
      logInfo('Firebase messaging initialization completed', {
        component: 'notification-service',
        operation: 'initializeMessaging',
        metadata: {
          permission,
          hasToken: !!token,
          duration
        }
      });

      debug('Messaging initialization completed successfully');
    } catch (error) {
      const duration = performance.now() - startTime;
      logError(error, {
        category: ErrorCategory.EXTERNAL_API,
        severity: ErrorSeverity.HIGH,
        component: 'notification-service',
        action: 'initializeMessaging',
        metadata: {
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      debug('Messaging initialization failed:', error instanceof Error ? error.message : error);
    }
  }

  private async saveFCMToken(token: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          fcmToken: token,
          lastTokenUpdate: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Failed to save FCM token:', error);
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    // This would typically get the current user from auth context
    // For now, return null - implement based on your auth system
    return null;
  }

  private handleForegroundMessage(payload: any): void {
    // Show in-app notification or update notification center
    this.messageListeners.forEach(listener => listener(payload));

    // Also create a browser notification if permission granted
    if (Notification.permission === 'granted') {
      const { title, body, icon, image } = payload.notification || {};
      new Notification(title || 'New Notification', {
        body: body || 'You have a new notification',
        icon: icon || '/favicon.ico',
        image: image,
        badge: '/favicon.ico',
      });
    }
  }

  // ==================== NOTIFICATION CRUD ====================

  async createNotification(
    userId: string,
    type: NotificationType['type'],
    title: string,
    message: string,
    data: Record<string, any> = {},
    options: Partial<NotificationType> = {}
  ): Promise<SocialApiResponse<NotificationType>> {
    try {
      // Check user preferences before creating notification
      const preferences = await this.getNotificationPreferences(userId);
      if (!preferences.data?.types[type]?.enabled) {
        return {
          data: {} as NotificationType,
          success: false,
          message: 'Notification type disabled by user',
          timestamp: new Date().toISOString(),
        };
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences.data)) {
        // Schedule for later or skip based on priority
        if (options.priority !== 'urgent') {
          return {
            data: {} as NotificationType,
            success: false,
            message: 'Skipped due to quiet hours',
            timestamp: new Date().toISOString(),
          };
        }
      }

      const notificationData: Omit<NotificationType, 'id'> = {
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: options.priority || 'normal',
        category: options.category || this.getNotificationCategory(type),
        isGrouped: options.isGrouped || false,
        channels: options.channels || {
          inApp: true,
          push: true,
          email: false,
        },
        preferences: options.preferences || {
          allowPreview: true,
          allowSound: true,
          allowVibration: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
        },
        ...options,
      };

      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);

      // Send push notification if enabled
      if (notificationData.channels.push) {
        await this.sendPushNotification(userId, {
          title,
          body: message,
          icon: '/favicon.ico',
          data: { ...data, notificationId: notificationRef.id },
        });
      }

      // Check for grouping opportunities
      await this.checkAndGroupNotifications(userId, notificationData as any);

      const result: NotificationType = {
        id: notificationRef.id,
        ...notificationData,
      };

      return {
        data: result,
        success: true,
        message: 'Notification created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new SocialError({
        message: 'Failed to create notification',
        code: 'NOTIFICATION_CREATE_FAILED',
        statusCode: 500,
        details: error,
      });
    }
  }

  async getNotifications(
    userId: string,
    filters?: NotificationFilter & { page?: number; limit?: number }
  ): Promise<PaginatedSocialResponse<NotificationType>> {
    try {
      const constraints = [where('userId', '==', userId)];

      if (filters?.types?.length) {
        constraints.push(where('type', 'in', filters.types));
      }

      if (filters?.categories?.length) {
        constraints.push(where('category', 'in', filters.categories));
      }

      if (filters?.priorities?.length) {
        constraints.push(where('priority', 'in', filters.priorities));
      }

      if (filters?.isRead !== undefined) {
        constraints.push(where('isRead', '==', filters.isRead));
      }

      if (filters?.dateFrom) {
        constraints.push(where('createdAt', '>=', filters.dateFrom));
      }

      if (filters?.dateTo) {
        constraints.push(where('createdAt', '<=', filters.dateTo));
      }

      constraints.push(orderBy('createdAt', 'desc'));

      const limitValue = filters?.limit || 20;
      constraints.push(limit(limitValue));

      const q = query(collection(db, 'notifications'), ...constraints);
      const querySnapshot = await getDocs(q);

      let notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationType[];

      // Apply client-side search filter
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        notifications = notifications.filter(n =>
          n.title.toLowerCase().includes(searchTerm) ||
          n.message.toLowerCase().includes(searchTerm)
        );
      }

      return {
        data: notifications,
        pagination: {
          page: filters?.page || 1,
          limit: limitValue,
          total: notifications.length,
          totalPages: Math.ceil(notifications.length / limitValue),
          hasNext: notifications.length === limitValue,
          hasPrev: (filters?.page || 1) > 1,
        },
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<SocialApiResponse<NotificationType>> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);

      if (!notificationDoc.exists()) {
        throw new SocialError({
          message: 'Notification not found',
          code: 'NOTIFICATION_NOT_FOUND',
          statusCode: 404,
        });
      }

      const notification = notificationDoc.data() as Notification;
      if (notification.userId !== userId) {
        throw new SocialError({
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
          statusCode: 403,
        });
      }

      await updateDoc(notificationRef, {
        isRead: true,
        readAt: new Date().toISOString(),
      });

      const updatedDoc = await getDoc(notificationRef);
      return {
        data: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        } as NotificationType,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<SocialApiResponse<{ count: number }>> {
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(unreadQuery);
      const batch = writeBatch(db);

      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: new Date().toISOString(),
        });
      });

      await batch.commit();

      return {
        data: { count: querySnapshot.size },
        success: true,
        message: `Marked ${querySnapshot.size} notifications as read`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<SocialApiResponse<boolean>> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);

      if (!notificationDoc.exists()) {
        throw new SocialError({
          message: 'Notification not found',
          code: 'NOTIFICATION_NOT_FOUND',
          statusCode: 404,
        });
      }

      const notification = notificationDoc.data() as NotificationType;
      if (notification.userId !== userId) {
        throw new SocialError({
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
          statusCode: 403,
        });
      }

      await deleteDoc(notificationRef);

      return {
        data: true,
        success: true,
        message: 'Notification deleted successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async bulkAction(action: NotificationBulkAction, userId: string): Promise<SocialApiResponse<{ count: number }>> {
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const notificationId of action.notificationIds) {
        const notificationRef = doc(db, 'notifications', notificationId);
        const notificationDoc = await getDoc(notificationRef);

        if (notificationDoc.exists()) {
          const notification = notificationDoc.data() as Notification;
          if (notification.userId === userId) {
            switch (action.action) {
              case 'mark_read':
                batch.update(notificationRef, { isRead: true, readAt: new Date().toISOString() });
                break;
              case 'mark_unread':
                batch.update(notificationRef, { isRead: false, readAt: undefined });
                break;
              case 'delete':
                batch.delete(notificationRef);
                break;
              case 'archive':
                batch.update(notificationRef, { archived: true, archivedAt: new Date().toISOString() });
                break;
              case 'snooze':
                if (action.snoozeUntil) {
                  batch.update(notificationRef, {
                    snoozed: true,
                    snoozeUntil: action.snoozeUntil,
                    snoozedAt: new Date().toISOString()
                  });
                }
                break;
            }
            count++;
          }
        }
      }

      await batch.commit();

      return {
        data: { count },
        success: true,
        message: `Applied ${action.action} to ${count} notifications`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  async getNotificationPreferences(userId: string): Promise<SocialApiResponse<NotificationPreferences>> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new SocialError({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 404,
        });
      }

      const userData = userDoc.data();
      const preferences: NotificationPreferences = userData.notificationPreferences || {
        userId,
        globalSettings: {
          enabled: true,
          soundEnabled: true,
          vibrationEnabled: true,
          previewEnabled: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timezone: 'UTC',
          },
          doNotDisturb: {
            enabled: false,
            start: '00:00',
            end: '00:00',
          },
        },
        types: {
          like: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          comment: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          follow: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          friend_request: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          mention: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          tag: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          share: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: false } },
          system: { enabled: true, sound: 'default', channels: { inApp: true, push: true, email: true } },
          achievement: { enabled: true, sound: 'celebration', channels: { inApp: true, push: true, email: true } },
          milestone: { enabled: true, sound: 'success', channels: { inApp: true, push: true, email: true } },
        },
        mutedUsers: [],
        snoozedUsers: [],
        priorityUsers: [],
        updatedAt: new Date().toISOString(),
      };

      return {
        data: preferences,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<SocialApiResponse<NotificationPreferences>> {
    try {
      const updatedPreferences = {
        ...preferences,
        userId,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'users', userId), {
        notificationPreferences: updatedPreferences,
      });

      return {
        data: updatedPreferences as NotificationPreferences,
        success: true,
        message: 'Notification preferences updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== PUSH NOTIFICATIONS ====================

  async sendPushNotification(userId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      // Get user's FCM token
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) return;

      // Send to FCM server (this would typically be done server-side)
      // For now, we'll just log it
      console.log('Sending push notification:', { fcmToken, payload });

      // In a real implementation, you would call your backend API
      // which would then send the notification via FCM
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  // ==================== WEBSOCKET INTEGRATION ====================

  private setupWebSocket(): void {
    if (typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/notifications`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Notification WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: NotificationWebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Notification WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        this.setupWebSocket();
      }, delay);
    }
  }

  private handleWebSocketMessage(message: NotificationWebSocketMessage): void {
    switch (message.type) {
      case 'notification':
        this.messageListeners.forEach(listener => listener(message.data));
        break;
      case 'notification_read':
        // Handle read status updates
        break;
      case 'notification_group':
        // Handle grouped notifications
        break;
      case 'notification_settings':
        // Handle settings updates
        break;
    }
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

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.globalSettings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.globalSettings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.globalSettings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async checkAndGroupNotifications(userId: string, newNotification: Omit<NotificationType, 'id'>): Promise<void> {
    // Check if similar notifications exist for grouping
    const recentNotificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('type', '==', newNotification.type),
      where('isRead', '==', false),
      where('createdAt', '>=', new Date(Date.now() - 5 * 60 * 1000).toISOString()), // Last 5 minutes
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(recentNotificationsQuery);
    const similarNotifications = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as NotificationType))
      .filter(n => !n.isGrouped && this.areNotificationsSimilar(n, newNotification as any));

    if (similarNotifications.length > 0) {
      // Group notifications
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update existing notifications
      const batch = writeBatch(db);
      similarNotifications.forEach(notification => {
        batch.update(doc(db, 'notifications', notification.id), {
          groupId,
          isGrouped: true,
        });
      });

      // Update new notification
      const newNotificationRef = await addDoc(collection(db, 'notifications'), {
        ...newNotification,
        groupId,
        isGrouped: true,
        groupCount: similarNotifications.length + 1,
      });

      await batch.commit();
    }
  }

  private areNotificationsSimilar(n1: NotificationType, n2: Omit<NotificationType, 'id'>): boolean {
    // Define similarity logic based on notification type
    if (n1.type !== n2.type) return false;

    switch (n1.type) {
      case 'like':
        return n1.data.contentId === n2.data.contentId;
      case 'comment':
        return n1.data.contentId === n2.data.contentId;
      default:
        return false;
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribeToNotifications(userId: string, callback: (notification: NotificationType) => void): () => void {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as NotificationType;
          callback(notification);
        }
      });
    });

    this.subscriptions.set(`notifications-${userId}`, unsubscribe);
    return unsubscribe;
  }

  addMessageListener(listener: (payload: any) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  unsubscribe(subscriptionKey: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionKey);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    this.messageListeners = [];

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();