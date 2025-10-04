// Real-Time Notification Hub - Enhanced real-time communication capabilities
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
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  RealTimeEvent,
  WebSocketConnection,
  NotificationQueue,
  EnhancedNotification,
  NotificationChannel,
} from './types';
import type {
  Notification as NotificationType,
  NotificationWebSocketMessage,
} from '../types/social';
import { SocialError } from '../types/social';

export class RealTimeNotificationHub {
  private static instance: RealTimeNotificationHub;
  private activeConnections: Map<string, WebSocketConnection> = new Map();
  private eventQueue: RealTimeEvent[] = [];
  private subscribers: Map<string, Set<string>> = new Map(); // eventType -> Set<connectionId>
  private connectionHeartbeat: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, () => void> = new Map();

  private constructor() {
    this.initializeHub();
    this.startEventProcessor();
    this.startHeartbeatMonitor();
  }

  public static getInstance(): RealTimeNotificationHub {
    if (!RealTimeNotificationHub.instance) {
      RealTimeNotificationHub.instance = new RealTimeNotificationHub();
    }
    return RealTimeNotificationHub.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeHub(): Promise<void> {
    try {
      // Load existing connections from database
      await this.loadExistingConnections();

      // Setup real-time listeners
      this.setupRealtimeListeners();

      console.log('Real-Time Notification Hub initialized');
    } catch (error) {
      console.error('Failed to initialize Real-Time Notification Hub:', error);
    }
  }

  private async loadExistingConnections(): Promise<void> {
    try {
      const connectionsQuery = query(
        collection(db, 'notificationWebSocketConnections'),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(connectionsQuery);
      querySnapshot.docs.forEach(doc => {
        const connection = { connectionId: doc.id, ...doc.data() } as WebSocketConnection;
        this.activeConnections.set(doc.id, connection);
      });
    } catch (error) {
      console.error('Failed to load existing connections:', error);
    }
  }

  private setupRealtimeListeners(): void {
    // Listen for new notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as NotificationType;
          this.broadcastNotificationEvent('notification_created', notification);
        } else if (change.type === 'modified') {
          const notification = { id: change.doc.id, ...change.doc.data() } as NotificationType;
          this.broadcastNotificationEvent('notification_updated', notification);
        }
      });
    });

    this.eventListeners.set('notifications', unsubscribeNotifications);

    // Listen for user activity events
    const userActivityQuery = query(collection(db, 'userActivity'));
    const unsubscribeActivity = onSnapshot(userActivityQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const activity = { id: change.doc.id, ...change.doc.data() };
          this.broadcastActivityEvent(activity);
        }
      });
    });

    this.eventListeners.set('userActivity', unsubscribeActivity);
  }

  private startEventProcessor(): void {
    // Process event queue every 100ms
    setInterval(() => {
      this.processEventQueue();
    }, 100);
  }

  private startHeartbeatMonitor(): void {
    // Check connection health every 30 seconds
    setInterval(() => {
      this.checkConnectionHealth();
    }, 30000);
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async registerConnection(
    userId: string,
    connectionId: string,
    subscriptions: string[] = []
  ): Promise<WebSocketConnection> {
    try {
      const connection: Omit<WebSocketConnection, 'connectionId'> = {
        userId,
        connectedAt: new Date().toISOString(),
        lastPing: new Date().toISOString(),
        subscriptions,
        isActive: true,
      };

      await updateDoc(doc(db, 'notificationWebSocketConnections', connectionId), connection);

      const fullConnection = { connectionId, ...connection };
      this.activeConnections.set(connectionId, fullConnection);

      // Setup subscriptions
      this.setupConnectionSubscriptions(connectionId, subscriptions);

      // Start heartbeat for this connection
      this.startConnectionHeartbeat(connectionId);

      console.log(`WebSocket connection registered: ${connectionId} for user ${userId}`);
      return fullConnection;
    } catch (error) {
      throw new SocialError({
        message: 'Failed to register WebSocket connection',
        code: 'CONNECTION_REGISTER_FAILED',
        statusCode: 500,
        details: error as Record<string, any>,
      });
    }
  }

  async unregisterConnection(connectionId: string): Promise<void> {
    try {
      // Remove from active connections
      const connection = this.activeConnections.get(connectionId);
      if (connection) {
        this.activeConnections.delete(connectionId);

        // Clear heartbeat
        const heartbeat = this.connectionHeartbeat.get(connectionId);
        if (heartbeat) {
          clearInterval(heartbeat);
          this.connectionHeartbeat.delete(connectionId);
        }

        // Remove subscriptions
        this.removeConnectionSubscriptions(connectionId);

        // Update database
        await updateDoc(doc(db, 'notificationWebSocketConnections', connectionId), {
          isActive: false,
          disconnectedAt: new Date().toISOString(),
        });

        console.log(`WebSocket connection unregistered: ${connectionId}`);
      }
    } catch (error) {
      console.error('Failed to unregister connection:', error);
    }
  }

  async updateConnectionSubscriptions(
    connectionId: string,
    subscriptions: string[]
  ): Promise<void> {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection) return;

      // Remove old subscriptions
      this.removeConnectionSubscriptions(connectionId);

      // Setup new subscriptions
      this.setupConnectionSubscriptions(connectionId, subscriptions);

      // Update connection
      connection.subscriptions = subscriptions;
      this.activeConnections.set(connectionId, connection);

      // Update database
      await updateDoc(doc(db, 'notificationWebSocketConnections', connectionId), {
        subscriptions,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update connection subscriptions:', error);
    }
  }

  private setupConnectionSubscriptions(connectionId: string, subscriptions: string[]): void {
    subscriptions.forEach(eventType => {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, new Set());
      }
      this.subscribers.get(eventType)!.add(connectionId);
    });
  }

  private removeConnectionSubscriptions(connectionId: string): void {
    this.subscribers.forEach(subscriberSet => {
      subscriberSet.delete(connectionId);
    });
  }

  private startConnectionHeartbeat(connectionId: string): void {
    const heartbeat = setInterval(() => {
      const connection = this.activeConnections.get(connectionId);
      if (connection) {
        const timeSinceLastPing = Date.now() - new Date(connection.lastPing).getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (timeSinceLastPing > fiveMinutes) {
          // Connection is stale, remove it
          this.unregisterConnection(connectionId);
        }
      }
    }, 60000); // Check every minute

    this.connectionHeartbeat.set(connectionId, heartbeat);
  }

  async heartbeat(connectionId: string): Promise<void> {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (connection) {
        connection.lastPing = new Date().toISOString();
        this.activeConnections.set(connectionId, connection);

        // Update database
        await updateDoc(doc(db, 'notificationWebSocketConnections', connectionId), {
          lastPing: connection.lastPing,
        });
      }
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }

  private checkConnectionHealth(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    this.activeConnections.forEach((connection, connectionId) => {
      const lastPingTime = new Date(connection.lastPing).getTime();
      if (lastPingTime < fiveMinutesAgo) {
        this.unregisterConnection(connectionId);
      }
    });
  }

  // ==================== EVENT BROADCASTING ====================

  async broadcastNotificationEvent(
    eventType: 'notification_created' | 'notification_updated' | 'notification_deleted',
    notification: NotificationType
  ): Promise<void> {
    try {
      const event: RealTimeEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'notification',
        userId: notification.userId,
        data: {
          eventType,
          notification,
        },
        timestamp: new Date().toISOString(),
        priority: this.getNotificationPriority(notification.priority),
        ttl: 300, // 5 minutes TTL
      };

      await this.queueEvent(event);
    } catch (error) {
      console.error('Failed to broadcast notification event:', error);
    }
  }

  async broadcastActivityEvent(activity: any): Promise<void> {
    try {
      const event: RealTimeEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user_activity',
        userId: activity.userId,
        data: activity,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        ttl: 60, // 1 minute TTL for activity events
      };

      await this.queueEvent(event);
    } catch (error) {
      console.error('Failed to broadcast activity event:', error);
    }
  }

  async broadcastSystemEvent(
    eventType: string,
    data: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<void> {
    try {
      const event: RealTimeEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'system_alert',
        data: {
          eventType,
          ...data,
        },
        timestamp: new Date().toISOString(),
        priority,
        ttl: priority === 'urgent' ? 600 : 300, // 10 minutes for urgent, 5 for others
      };

      await this.queueEvent(event);
    } catch (error) {
      console.error('Failed to broadcast system event:', error);
    }
  }

  private async queueEvent(event: RealTimeEvent): Promise<void> {
    try {
      // Add to in-memory queue
      this.eventQueue.push(event);

      // Store in database for persistence
      await addDoc(collection(db, 'realTimeEvents'), event);

      // Trigger immediate processing for high priority events
      if (event.priority === 'urgent' || event.priority === 'high') {
        await this.processEventQueue();
      }
    } catch (error) {
      console.error('Failed to queue event:', error);
    }
  }

  private async processEventQueue(): Promise<void> {
    try {
      if (this.eventQueue.length === 0) return;

      const eventsToProcess = [...this.eventQueue];
      this.eventQueue = [];

      for (const event of eventsToProcess) {
        await this.deliverEvent(event);
      }
    } catch (error) {
      console.error('Failed to process event queue:', error);
    }
  }

  private async deliverEvent(event: RealTimeEvent): Promise<void> {
    try {
      // Check if event has expired
      if (event.ttl) {
        const eventAge = Date.now() - new Date(event.timestamp).getTime();
        if (eventAge > event.ttl * 1000) {
          return; // Event expired
        }
      }

      // Get subscribers for this event type
      const eventTypeSubscribers = this.subscribers.get(event.type) || new Set();

      // Also get subscribers for 'all' events
      const allSubscribers = this.subscribers.get('all') || new Set();

      // Combine subscribers
      const targetConnections = new Set([...eventTypeSubscribers, ...allSubscribers]);

      // Filter by user if event is user-specific
      if (event.userId) {
        // Only send to connections for this specific user
        targetConnections.forEach(connectionId => {
          const connection = this.activeConnections.get(connectionId);
          if (connection && connection.userId !== event.userId) {
            targetConnections.delete(connectionId);
          }
        });
      }

      // Send to all target connections
      for (const connectionId of targetConnections) {
        await this.sendToConnection(connectionId, event);
      }
    } catch (error) {
      console.error('Failed to deliver event:', error);
    }
  }

  private async sendToConnection(connectionId: string, event: RealTimeEvent): Promise<void> {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection || !connection.isActive) {
        return;
      }

      const message: NotificationWebSocketMessage = {
        type: event.type as any,
        data: event.data as any,
        userId: event.userId || '',
        timestamp: event.timestamp,
      };

      // In a real implementation, you would send this via WebSocket
      console.log('Sending real-time message to connection:', connectionId, message);

      // Simulate WebSocket send
      // this.webSocketConnections.get(connectionId)?.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send to connection:', error);
    }
  }

  // ==================== NOTIFICATION STREAMING ====================

  async subscribeToUserNotifications(
    userId: string,
    callback: (notification: NotificationType) => void
  ): Promise<() => void> {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = { id: change.doc.id, ...change.doc.data() } as NotificationType;
            callback(notification);
          } else if (change.type === 'modified') {
            const notification = { id: change.doc.id, ...change.doc.data() } as NotificationType;
            callback(notification);
          }
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to user notifications:', error);
      return () => {};
    }
  }

  async subscribeToNotificationType(
    notificationType: NotificationType['type'],
    callback: (notification: NotificationType) => void
  ): Promise<() => void> {
    try {
      const typeQuery = query(
        collection(db, 'notifications'),
        where('type', '==', notificationType),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(typeQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = { id: change.doc.id, ...change.doc.data() } as NotificationType;
            callback(notification);
          }
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to notification type:', error);
      return () => {};
    }
  }

  async subscribeToGlobalEvents(
    callback: (event: RealTimeEvent) => void
  ): Promise<() => void> {
    try {
      const eventsQuery = query(
        collection(db, 'realTimeEvents'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );

      const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const event = { id: change.doc.id, ...change.doc.data() } as RealTimeEvent;
            callback(event);
          }
        });
      });

      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to global events:', error);
      return () => {};
    }
  }

  // ==================== PRESENCE MANAGEMENT ====================

  async updateUserPresence(
    userId: string,
    status: 'online' | 'away' | 'busy' | 'offline',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'userPresence', userId), {
        status,
        lastSeen: new Date().toISOString(),
        metadata,
      });

      // Broadcast presence update to user's followers/friends
      await this.broadcastPresenceUpdate(userId, status, metadata);
    } catch (error) {
      console.error('Failed to update user presence:', error);
    }
  }

  private async broadcastPresenceUpdate(
    userId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: RealTimeEvent = {
        id: `presence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user_activity',
        userId,
        data: {
          eventType: 'presence_updated',
          status,
          metadata,
        },
        timestamp: new Date().toISOString(),
        priority: 'low',
        ttl: 30, // 30 seconds TTL for presence updates
      };

      await this.queueEvent(event);
    } catch (error) {
      console.error('Failed to broadcast presence update:', error);
    }
  }

  async getUserPresence(userId: string): Promise<{
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen: string;
    metadata?: Record<string, any>;
  } | null> {
    try {
      const presenceDoc = await getDoc(doc(db, 'userPresence', userId));
      if (presenceDoc.exists()) {
        return presenceDoc.data() as any;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user presence:', error);
      return null;
    }
  }

  // ==================== TYPING INDICATORS ====================

  async startTypingIndicator(
    userId: string,
    conversationId: string,
    type: 'notification' | 'comment' | 'message' = 'notification'
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'typingIndicators', `${userId}_${conversationId}`), {
        userId,
        conversationId,
        type,
        startedAt: new Date().toISOString(),
        isTyping: true,
      });

      // Broadcast typing start
      await this.broadcastTypingEvent(userId, conversationId, type, 'typing_start');
    } catch (error) {
      console.error('Failed to start typing indicator:', error);
    }
  }

  async stopTypingIndicator(
    userId: string,
    conversationId: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'typingIndicators', `${userId}_${conversationId}`), {
        stoppedAt: new Date().toISOString(),
        isTyping: false,
      });

      // Broadcast typing stop
      await this.broadcastTypingEvent(userId, conversationId, 'notification', 'typing_stop');
    } catch (error) {
      console.error('Failed to stop typing indicator:', error);
    }
  }

  private async broadcastTypingEvent(
    userId: string,
    conversationId: string,
    type: string,
    eventType: 'typing_start' | 'typing_stop'
  ): Promise<void> {
    try {
      const event: RealTimeEvent = {
        id: `typing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user_activity',
        userId,
        data: {
          eventType,
          conversationId,
          notificationType: type,
        },
        timestamp: new Date().toISOString(),
        priority: 'low',
        ttl: 10, // 10 seconds TTL for typing events
      };

      await this.queueEvent(event);
    } catch (error) {
      console.error('Failed to broadcast typing event:', error);
    }
  }

  // ==================== NOTIFICATION BATCHING ====================

  async sendBatchedNotifications(
    userId: string,
    notifications: NotificationType[],
    batchOptions: {
      maxBatchSize?: number;
      batchDelay?: number; // in milliseconds
      groupByType?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const {
        maxBatchSize = 5,
        batchDelay = 5000,
        groupByType = true,
      } = batchOptions;

      if (notifications.length <= maxBatchSize) {
        // Send all at once
        for (const notification of notifications) {
          await this.broadcastNotificationEvent('notification_created', notification);
        }
      } else {
        // Batch notifications
        const batches = this.createNotificationBatches(notifications, maxBatchSize, groupByType);

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];

          // Send batch
          for (const notification of batch) {
            await this.broadcastNotificationEvent('notification_created', notification);
          }

          // Wait between batches if not the last batch
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        }
      }
    } catch (error) {
      console.error('Failed to send batched notifications:', error);
    }
  }

  private createNotificationBatches(
    notifications: NotificationType[],
    maxBatchSize: number,
    groupByType: boolean
  ): NotificationType[][] {
    if (!groupByType) {
      // Simple batching by size
      const batches: NotificationType[][] = [];
      for (let i = 0; i < notifications.length; i += maxBatchSize) {
        batches.push(notifications.slice(i, i + maxBatchSize));
      }
      return batches;
    }

    // Group by type first, then batch
    const byType: Record<string, NotificationType[]> = {};
    notifications.forEach(notification => {
      if (!byType[notification.type]) {
        byType[notification.type] = [];
      }
      byType[notification.type].push(notification);
    });

    const batches: NotificationType[][] = [];
    Object.values(byType).forEach(typeNotifications => {
      for (let i = 0; i < typeNotifications.length; i += maxBatchSize) {
        batches.push(typeNotifications.slice(i, i + maxBatchSize));
      }
    });

    return batches;
  }

  // ==================== UTILITY METHODS ====================

  private getNotificationPriority(priority: NotificationType['priority']): 'low' | 'normal' | 'high' | 'urgent' {
    switch (priority) {
      case 'urgent': return 'urgent';
      case 'high': return 'high';
      case 'normal': return 'normal';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    connectionsByUser: Record<string, number>;
    eventsInQueue: number;
  }> {
    try {
      const totalConnections = this.activeConnections.size;
      const activeConnections = Array.from(this.activeConnections.values())
        .filter(conn => conn.isActive).length;

      const connectionsByUser: Record<string, number> = {};
      this.activeConnections.forEach(connection => {
        connectionsByUser[connection.userId] = (connectionsByUser[connection.userId] || 0) + 1;
      });

      return {
        totalConnections,
        activeConnections,
        connectionsByUser,
        eventsInQueue: this.eventQueue.length,
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        connectionsByUser: {},
        eventsInQueue: 0,
      };
    }
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    // Clear all intervals
    this.connectionHeartbeat.forEach(heartbeat => clearInterval(heartbeat));
    this.connectionHeartbeat.clear();

    // Unsubscribe from all listeners
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners.clear();

    // Clear all data
    this.activeConnections.clear();
    this.eventQueue = [];
    this.subscribers.clear();
  }
}

// Export singleton instance
export const realTimeNotificationHub = RealTimeNotificationHub.getInstance();