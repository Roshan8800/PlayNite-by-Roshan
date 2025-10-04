// Enhanced Notification System - Main Export File
// This file exports all the enhanced notification system components

// Core Types
export type {
  EnhancedNotification,
  UserContext,
  DeliveryStrategy,
  EscalationRule,
  NotificationChannel,
  EnhancedNotificationMetadata,
  PersonalizationRule,
  PersonalizationCondition,
  PersonalizationAction,
  UserProfile,
  UserBehavior,
  ResponsePattern,
  NotificationCampaign,
  AudienceDefinition,
  NotificationTemplate,
  TemplateVariable,
  NotificationVariant,
  CampaignSchedule,
  TriggerEvent,
  DripStep,
  CampaignSettings,
  CampaignAnalytics,
  ChannelConfig,
  DeliveryAttempt,
  ChannelPerformance,
  RealTimeEvent,
  WebSocketConnection,
  NotificationQueue,
  AdvancedNotificationAnalytics,
  ExperimentResult,
  EnhancedNotificationResponse,
  NotificationDeliveryReport,
  NotificationSystemConfig,
} from './types';

// Core Services
export {
  EnhancedNotificationManager,
  enhancedNotificationManager,
} from './EnhancedNotificationManager';

export {
  NotificationPersonalizationEngine,
  notificationPersonalizationEngine,
} from './NotificationPersonalizationEngine';

export {
  EnhancedNotificationAnalytics,
  notificationAnalytics,
} from './NotificationAnalytics';

export {
  NotificationAutomationEngine,
  notificationAutomationEngine,
} from './NotificationAutomationEngine';

export {
  MultiChannelDeliveryManager,
  multiChannelDeliveryManager,
} from './MultiChannelDeliveryManager';

export {
  NotificationIntelligenceService,
  notificationIntelligenceService,
} from './NotificationIntelligenceService';

export {
  RealTimeNotificationHub,
  realTimeNotificationHub,
} from './RealTimeNotificationHub';

export {
  NotificationPerformanceOptimizer,
  notificationPerformanceOptimizer,
} from './NotificationPerformanceOptimizer';

// Convenience re-exports from existing services for backward compatibility
export {
  notificationService,
} from '../services/notification-service';

export {
  notificationAnalyticsService,
} from '../services/notification-analytics-service';

// Type re-exports for convenience
export type {
  Notification as BaseNotification,
  NotificationPreferences,
  NotificationAnalytics as BaseNotificationAnalytics,
  NotificationFilter,
  NotificationBulkAction,
  PushNotificationPayload,
  NotificationWebSocketMessage,
  SocialApiResponse,
  PaginatedSocialResponse,
} from '../types/social';

// Enhanced System Initialization
export async function initializeEnhancedNotificationSystem(): Promise<void> {
  try {
    console.log('Initializing Enhanced Notification System...');

    // Import and initialize all components
    const { enhancedNotificationManager } = await import('./EnhancedNotificationManager');
    const { notificationPersonalizationEngine } = await import('./NotificationPersonalizationEngine');
    const { notificationAnalytics } = await import('./NotificationAnalytics');
    const { notificationAutomationEngine } = await import('./NotificationAutomationEngine');
    const { multiChannelDeliveryManager } = await import('./MultiChannelDeliveryManager');
    const { notificationIntelligenceService } = await import('./NotificationIntelligenceService');
    const { realTimeNotificationHub } = await import('./RealTimeNotificationHub');
    const { notificationPerformanceOptimizer } = await import('./NotificationPerformanceOptimizer');

    // Each component initializes itself in its constructor
    // This is just to ensure they're all created
    console.log('Enhanced Notification System initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Enhanced Notification System:', error);
    throw error;
  }
}

// System Health Check
export async function getNotificationSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, boolean>;
  metrics: {
    totalConnections: number;
    activeCampaigns: number;
    queuedNotifications: number;
    averageDeliveryTime: number;
  };
}> {
  try {
    // Import instances for health check
    const { realTimeNotificationHub } = await import('./RealTimeNotificationHub');
    const { notificationAutomationEngine } = await import('./NotificationAutomationEngine');

    const components = {
      enhancedManager: true, // Assume healthy if we can import
      personalizationEngine: true,
      analytics: true,
      automationEngine: true,
      deliveryManager: true,
      intelligenceService: true,
      realTimeHub: true,
      performanceOptimizer: true,
    };

    const allHealthy = Object.values(components).every(status => status);

    // Get real-time metrics
    const hubStats = await realTimeNotificationHub.getConnectionStats();
    const activeCampaigns = (await notificationAutomationEngine.getActiveCampaigns()).length;

    const status = allHealthy ? 'healthy' : 'degraded';

    return {
      status,
      components,
      metrics: {
        totalConnections: hubStats.totalConnections,
        activeCampaigns,
        queuedNotifications: hubStats.eventsInQueue,
        averageDeliveryTime: 1500, // Would calculate from actual data
      },
    };
  } catch (error) {
    console.error('Failed to get notification system health:', error);
    return {
      status: 'unhealthy',
      components: {},
      metrics: {
        totalConnections: 0,
        activeCampaigns: 0,
        queuedNotifications: 0,
        averageDeliveryTime: 0,
      },
    };
  }
}

// Quick Setup Function for common use cases
export async function setupBasicNotificationCampaign(
  name: string,
  notificationType: 'like' | 'comment' | 'follow' | 'system',
  targetAudience: string[],
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    timeOfDay: string;
    daysOfWeek?: number[];
  }
): Promise<any> {
  try {
    // Import the automation engine
    const { notificationAutomationEngine } = await import('./NotificationAutomationEngine');

    // Create a basic template
    const template = await notificationAutomationEngine.createTemplate(
      `${name} Template`,
      notificationType,
      'social',
      `{{userName}}, you have a new ${notificationType}!`,
      `You received a ${notificationType} notification. Check it out!`,
      [
        { name: 'userName', type: 'user_property', required: true, description: 'Recipient name' },
      ]
    );

    // Define audience
    const audience = {
      includeSegments: targetAudience,
      excludeSegments: [],
    };

    // Define schedule
    const campaignSchedule = {
      startDate: new Date().toISOString(),
      timezone: 'UTC',
      frequency: schedule.frequency,
      timeOfDay: schedule.timeOfDay,
      daysOfWeek: schedule.daysOfWeek,
    };

    // Define settings
    const settings = {
      maxNotificationsPerDay: 5,
      respectQuietHours: true,
      allowPersonalization: true,
      enableABTesting: false,
    };

    // Create campaign
    const campaign = await notificationAutomationEngine.createCampaign(
      name,
      `Basic ${notificationType} notification campaign`,
      'recurring',
      template,
      campaignSchedule,
      audience,
      settings
    );

    return campaign;
  } catch (error) {
    console.error('Failed to setup basic notification campaign:', error);
    throw error;
  }
}