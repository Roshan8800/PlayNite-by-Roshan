// Enhanced Notification System Types and Interfaces

import type {
  Notification,
  NotificationPreferences,
  NotificationAnalytics,
  NotificationFilter,
  NotificationBulkAction,
  PushNotificationPayload,
  NotificationWebSocketMessage,
  SocialApiResponse,
  PaginatedSocialResponse,
} from '../types/social';

// ==================== ENHANCED NOTIFICATION TYPES ====================

export interface EnhancedNotification extends Notification {
  // Advanced personalization
  personalizedContent?: {
    title: string;
    message: string;
    imageUrl?: string;
    actionUrl?: string;
  };

  // Smart scheduling
  scheduledFor?: string;
  optimalSendTime?: string;
  timezone?: string;

  // Advanced targeting
  targetSegments?: string[];
  userContext?: UserContext;

  // A/B testing
  experimentId?: string;
  variantId?: string;

  // Advanced analytics
  predictedEngagement?: number;
  confidenceScore?: number;

  // Smart delivery
  deliveryStrategy?: DeliveryStrategy;
  fallbackChannels?: NotificationChannel[];

  // Enhanced metadata
  metadata?: EnhancedNotificationMetadata;
}

export interface UserContext {
  currentActivity?: string;
  location?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  appState?: 'foreground' | 'background' | 'inactive';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;
  sessionDuration?: number;
  recentInteractions?: string[];
}

export interface DeliveryStrategy {
  primaryChannel: NotificationChannel;
  fallbackChannels: NotificationChannel[];
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  escalationRules?: EscalationRule[];
}

export interface EscalationRule {
  condition: string; // e.g., "not_opened_after_1h"
  action: 'retry' | 'escalate' | 'abandon';
  channel?: NotificationChannel;
  delay?: number;
}

export type NotificationChannel = 'inApp' | 'push' | 'email' | 'sms' | 'webhook';

export interface EnhancedNotificationMetadata {
  source?: string;
  campaignId?: string;
  templateId?: string;
  tags?: string[];
  priorityScore?: number;
  businessValue?: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// ==================== PERSONALIZATION ENGINE TYPES ====================

export interface PersonalizationRule {
  id: string;
  name: string;
  description: string;
  conditions: PersonalizationCondition[];
  actions: PersonalizationAction[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizationCondition {
  field: string; // e.g., "user.engagementRate", "context.timeOfDay"
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PersonalizationAction {
  type: 'modify_content' | 'modify_channel' | 'modify_schedule' | 'modify_priority' | 'skip_notification';
  parameters: Record<string, any>;
}

export interface UserProfile {
  userId: string;
  preferences: NotificationPreferences;
  behavior: UserBehavior;
  segments: string[];
  lastUpdated: string;
}

export interface UserBehavior {
  engagementRate: number;
  preferredChannels: NotificationChannel[];
  optimalTimes: string[];
  responsePatterns: ResponsePattern[];
  activityLevel: 'low' | 'medium' | 'high';
  lastActive: string;
  sessionCount: number;
  avgSessionDuration: number;
}

export interface ResponsePattern {
  channel: NotificationChannel;
  avgResponseTime: number; // in minutes
  openRate: number;
  clickRate: number;
  dismissRate: number;
}

// ==================== AUTOMATION ENGINE TYPES ====================

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  type: 'one_time' | 'recurring' | 'triggered' | 'drip';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';

  // Targeting
  targetAudience: AudienceDefinition;
  segments?: string[];

  // Content
  template: NotificationTemplate;
  variants?: NotificationVariant[];

  // Scheduling
  schedule: CampaignSchedule;

  // Analytics
  analytics?: CampaignAnalytics;

  // Settings
  settings: CampaignSettings;

  createdAt: string;
  updatedAt: string;
}

export interface AudienceDefinition {
  includeSegments: string[];
  excludeSegments: string[];
  customFilters?: PersonalizationCondition[];
  estimatedReach?: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: Notification['type'];
  category: Notification['category'];

  // Content templates
  titleTemplate: string;
  messageTemplate: string;
  imageTemplate?: string;

  // Variables for personalization
  variables: TemplateVariable[];

  // Default settings
  defaultChannels: Notification['channels'];
  defaultPriority: Notification['priority'];

  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'user_property';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface NotificationVariant {
  id: string;
  name: string;
  weight: number; // For A/B testing distribution
  template: NotificationTemplate;
  channels: Notification['channels'];
  priority: Notification['priority'];
  isControl: boolean;
}

export interface CampaignSchedule {
  startDate: string;
  endDate?: string;
  timezone: string;

  // For recurring campaigns
  frequency?: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  timeOfDay?: string; // HH:MM format

  // For triggered campaigns
  triggerEvents?: TriggerEvent[];

  // For drip campaigns
  steps?: DripStep[];
}

export interface TriggerEvent {
  type: string; // e.g., 'user_signup', 'purchase_completed'
  delay?: number; // in minutes
  conditions?: PersonalizationCondition[];
}

export interface DripStep {
  delay: number; // in minutes after previous step
  template: NotificationTemplate;
  conditions?: PersonalizationCondition[];
}

export interface CampaignSettings {
  maxNotificationsPerDay?: number;
  respectQuietHours: boolean;
  allowPersonalization: boolean;
  enableABTesting: boolean;
  testPercentage?: number; // 0-100
}

export interface CampaignAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  unsubscribed: number;
  complaints: number;
  bounceRate: number;
}

// ==================== MULTI-CHANNEL DELIVERY TYPES ====================

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  priority: number;
  rateLimit?: {
    maxPerHour: number;
    maxPerDay: number;
  };
  settings: Record<string, any>;
}

export interface DeliveryAttempt {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  attemptNumber: number;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ChannelPerformance {
  channel: NotificationChannel;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  avgDeliveryTime: number; // in milliseconds
  bounceRate: number;
  complaintRate: number;
}

// ==================== REAL-TIME COMMUNICATION TYPES ====================

export interface RealTimeEvent {
  id: string;
  type: 'notification' | 'user_activity' | 'system_alert' | 'campaign_update';
  userId?: string;
  data: Record<string, any>;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ttl?: number; // Time to live in seconds
}

export interface WebSocketConnection {
  userId: string;
  connectionId: string;
  connectedAt: string;
  lastPing: string;
  subscriptions: string[]; // Event types subscribed to
  isActive: boolean;
}

export interface NotificationQueue {
  id: string;
  notificationId: string;
  priority: number;
  scheduledFor: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== ANALYTICS AND OPTIMIZATION TYPES ====================

export interface AdvancedNotificationAnalytics extends NotificationAnalytics {
  // Enhanced metrics
  conversionRate: number;
  unsubscribeRate: number;
  complaintRate: number;
  bounceRate: number;

  // Channel performance
  channelPerformance: Record<NotificationChannel, ChannelPerformance>;

  // Time-based analytics
  hourlyPerformance: Record<string, {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  }>;

  // User segment analytics
  segmentPerformance: Record<string, {
    reach: number;
    engagement: number;
    conversion: number;
  }>;

  // A/B testing results
  experimentResults?: ExperimentResult[];

  // Predictive analytics
  predictions?: {
    optimalSendTime: string;
    expectedEngagement: number;
    recommendedChannels: NotificationChannel[];
  };
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  sampleSize: number;
  conversionRate: number;
  confidence: number;
  isWinner: boolean;
  improvement: number; // percentage improvement over control
}

// ==================== API RESPONSE TYPES ====================

export interface EnhancedNotificationResponse<T> extends SocialApiResponse<T> {
  metadata?: {
    processingTime?: number;
    cached?: boolean;
    version?: string;
  };
}

export interface NotificationDeliveryReport {
  notificationId: string;
  userId: string;
  attempts: DeliveryAttempt[];
  finalStatus: 'delivered' | 'failed' | 'pending';
  totalDeliveryTime?: number;
  cost?: number;
  generatedAt: string;
}

// ==================== CONFIGURATION TYPES ====================

export interface NotificationSystemConfig {
  maxRetries: number;
  defaultRetryDelay: number;
  rateLimits: Record<NotificationChannel, {
    perMinute: number;
    perHour: number;
    perDay: number;
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  personalization: {
    enabled: boolean;
    cacheTimeout: number; // in minutes
    maxRulesPerNotification: number;
  };
  analytics: {
    retentionDays: number;
    enableRealTime: boolean;
    sampleRate: number; // 0-1
  };
}