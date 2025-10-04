// Notification Personalization Engine - Intelligent notification management and personalization
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
  PersonalizationRule,
  PersonalizationCondition,
  PersonalizationAction,
  UserProfile,
  UserBehavior,
  ResponsePattern,
  NotificationChannel,
  EnhancedNotification,
} from './types';
import type {
  Notification as NotificationType,
  NotificationPreferences,
} from '../types/social';
import { SocialError } from '../types/social';

export class NotificationPersonalizationEngine {
  private static instance: NotificationPersonalizationEngine;
  private rulesCache: Map<string, PersonalizationRule[]> = new Map();
  private userProfilesCache: Map<string, UserProfile> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: Map<string, number> = new Map();

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): NotificationPersonalizationEngine {
    if (!NotificationPersonalizationEngine.instance) {
      NotificationPersonalizationEngine.instance = new NotificationPersonalizationEngine();
    }
    return NotificationPersonalizationEngine.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeEngine(): Promise<void> {
    try {
      // Load active personalization rules
      await this.loadPersonalizationRules();

      // Setup periodic cache refresh
      setInterval(() => {
        this.refreshCache();
      }, this.cacheTimeout);

      console.log('Notification Personalization Engine initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Personalization Engine:', error);
    }
  }

  private async loadPersonalizationRules(): Promise<void> {
    try {
      const rulesQuery = query(
        collection(db, 'personalizationRules'),
        where('isActive', '==', true),
        orderBy('priority', 'desc')
      );

      const querySnapshot = await getDocs(rulesQuery);
      const rulesByType: Map<string, PersonalizationRule[]> = new Map();

      querySnapshot.docs.forEach(doc => {
        const rule = { id: doc.id, ...doc.data() } as PersonalizationRule;

        if (!rulesByType.has(rule.name)) {
          rulesByType.set(rule.name, []);
        }
        rulesByType.get(rule.name)!.push(rule);
      });

      this.rulesCache = rulesByType;
    } catch (error) {
      console.error('Failed to load personalization rules:', error);
    }
  }

  private refreshCache(): void {
    this.userProfilesCache.clear();
    this.lastCacheUpdate.clear();
    this.loadPersonalizationRules();
  }

  // ==================== RULE MANAGEMENT ====================

  async createPersonalizationRule(
    name: string,
    description: string,
    notificationType: NotificationType['type'],
    conditions: PersonalizationCondition[],
    actions: PersonalizationAction[],
    priority: number = 50
  ): Promise<PersonalizationRule> {
    try {
      const rule: Omit<PersonalizationRule, 'id'> = {
        name,
        description,
        conditions,
        actions,
        priority,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ruleRef = await addDoc(collection(db, 'personalizationRules'), rule);
      const newRule = { id: ruleRef.id, ...rule };

      // Update cache
      if (!this.rulesCache.has(notificationType)) {
        this.rulesCache.set(notificationType, []);
      }
      this.rulesCache.get(notificationType)!.push(newRule);

      return newRule;
    } catch (error) {
      throw new SocialError({
        message: 'Failed to create personalization rule',
        code: 'PERSONALIZATION_RULE_CREATE_FAILED',
        statusCode: 500,
        details: error as Record<string, any>,
      });
    }
  }

  async updatePersonalizationRule(
    ruleId: string,
    updates: Partial<PersonalizationRule>
  ): Promise<PersonalizationRule> {
    try {
      const ruleRef = doc(db, 'personalizationRules', ruleId);
      const ruleDoc = await getDoc(ruleRef);

      if (!ruleDoc.exists()) {
        throw new SocialError({
          message: 'Personalization rule not found',
          code: 'PERSONALIZATION_RULE_NOT_FOUND',
          statusCode: 404,
        });
      }

      const updatedRule = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(ruleRef, updatedRule);

      // Refresh cache
      await this.loadPersonalizationRules();

      return { id: ruleId, ...ruleDoc.data(), ...updatedRule } as PersonalizationRule;
    } catch (error) {
      throw error;
    }
  }

  async deletePersonalizationRule(ruleId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'personalizationRules', ruleId));

      // Refresh cache
      await this.loadPersonalizationRules();
    } catch (error) {
      throw new SocialError({
        message: 'Failed to delete personalization rule',
        code: 'PERSONALIZATION_RULE_DELETE_FAILED',
        statusCode: 500,
        details: error as Record<string, any>,
      });
    }
  }

  async getPersonalizationRules(
    notificationType?: NotificationType['type']
  ): Promise<PersonalizationRule[]> {
    try {
      if (notificationType) {
        return this.rulesCache.get(notificationType) || [];
      }

      const allRules: PersonalizationRule[] = [];
      this.rulesCache.forEach(rules => {
        allRules.push(...rules);
      });

      return allRules;
    } catch (error) {
      console.error('Failed to get personalization rules:', error);
      return [];
    }
  }

  // ==================== USER PROFILE MANAGEMENT ====================

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      if (this.userProfilesCache.has(userId)) {
        const lastUpdate = this.lastCacheUpdate.get(userId) || 0;
        if (Date.now() - lastUpdate < this.cacheTimeout) {
          return this.userProfilesCache.get(userId)!;
        }
      }

      // Get user preferences
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();

      // Get user behavior data
      const behavior = await this.calculateUserBehavior(userId);

      // Get user segments
      const segments = await this.getUserSegments(userId);

      const profile: UserProfile = {
        userId,
        preferences: userData.notificationPreferences || this.getDefaultPreferences(),
        behavior,
        segments,
        lastUpdated: new Date().toISOString(),
      };

      // Update cache
      this.userProfilesCache.set(userId, profile);
      this.lastCacheUpdate.set(userId, Date.now());

      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  private async calculateUserBehavior(userId: string): Promise<UserBehavior> {
    try {
      // Get user's notification history for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('createdAt', '>=', thirtyDaysAgo),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notifications = querySnapshot.docs.map(doc => doc.data());

      // Get tracking events
      const eventsQuery = query(
        collection(db, 'notificationEvents'),
        where('notificationId', 'in', notifications.map(n => n.id)),
        orderBy('timestamp', 'desc')
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => doc.data());

      // Calculate engagement metrics
      const totalSent = notifications.length;
      const totalOpened = events.filter(e => e.event === 'viewed').length;
      const totalClicked = events.filter(e => e.event === 'clicked').length;

      const engagementRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

      // Calculate preferred channels
      const channelStats = this.calculateChannelStats(notifications, events);
      const preferredChannels = this.getPreferredChannels(channelStats);

      // Calculate optimal times
      const optimalTimes = this.calculateOptimalTimes(events);

      // Calculate response patterns
      const responsePatterns = this.calculateResponsePatterns(notifications, events);

      // Determine activity level
      const activityLevel = this.determineActivityLevel(totalSent, engagementRate);

      return {
        engagementRate,
        preferredChannels,
        optimalTimes,
        responsePatterns,
        activityLevel,
        lastActive: notifications[0]?.createdAt || new Date().toISOString(),
        sessionCount: 0, // Would need session tracking
        avgSessionDuration: 0, // Would need session tracking
      };
    } catch (error) {
      console.error('Failed to calculate user behavior:', error);
      return this.getDefaultUserBehavior();
    }
  }

  private calculateChannelStats(notifications: any[], events: any[]): Record<NotificationChannel, any> {
    const stats: Record<string, any> = {
      inApp: { sent: 0, opened: 0, clicked: 0 },
      push: { sent: 0, opened: 0, clicked: 0 },
      email: { sent: 0, opened: 0, clicked: 0 },
      sms: { sent: 0, opened: 0, clicked: 0 },
      webhook: { sent: 0, opened: 0, clicked: 0 },
    };

    notifications.forEach(notification => {
      Object.keys(notification.channels).forEach(channel => {
        if (notification.channels[channel]) {
          stats[channel].sent++;
        }
      });
    });

    events.forEach(event => {
      const channel = event.metadata?.channel;
      if (channel && stats[channel]) {
        if (event.event === 'viewed') {
          stats[channel].opened++;
        } else if (event.event === 'clicked') {
          stats[channel].clicked++;
        }
      }
    });

    return stats;
  }

  private getPreferredChannels(channelStats: Record<string, any>): NotificationChannel[] {
    return Object.entries(channelStats)
      .map(([channel, stats]: [string, any]) => ({
        channel: channel as NotificationChannel,
        engagementRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .map(item => item.channel);
  }

  private calculateOptimalTimes(events: any[]): string[] {
    try {
      const hourlyStats: Record<number, { opened: number; clicked: number }> = {};

      events.forEach(event => {
        if (event.event === 'viewed' || event.event === 'clicked') {
          const hour = new Date(event.timestamp).getHours();
          if (!hourlyStats[hour]) {
            hourlyStats[hour] = { opened: 0, clicked: 0 };
          }
          if (event.event === 'viewed') {
            hourlyStats[hour].opened++;
          } else {
            hourlyStats[hour].clicked++;
          }
        }
      });

      // Get top 3 hours with highest engagement
      return Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour: parseInt(hour),
          score: stats.opened * 0.7 + stats.clicked * 1.0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => `${item.hour.toString().padStart(2, '0')}:00`);
    } catch (error) {
      console.error('Failed to calculate optimal times:', error);
      return ['12:00', '19:00'];
    }
  }

  private calculateResponsePatterns(notifications: any[], events: any[]): ResponsePattern[] {
    const patterns: ResponsePattern[] = [];

    Object.keys(notifications[0]?.channels || {}).forEach(channel => {
      const channelNotifications = notifications.filter(n => n.channels[channel]);
      const channelEvents = events.filter(e => e.metadata?.channel === channel);

      const sent = channelNotifications.length;
      const opened = channelEvents.filter(e => e.event === 'viewed').length;
      const clicked = channelEvents.filter(e => e.event === 'clicked').length;

      if (sent > 0) {
        patterns.push({
          channel: channel as NotificationChannel,
          avgResponseTime: 0, // Would need more detailed timing data
          openRate: (opened / sent) * 100,
          clickRate: (clicked / sent) * 100,
          dismissRate: 0, // Would need dismiss events
        });
      }
    });

    return patterns;
  }

  private determineActivityLevel(totalSent: number, engagementRate: number): 'low' | 'medium' | 'high' {
    if (totalSent < 10 || engagementRate < 20) return 'low';
    if (totalSent < 50 || engagementRate < 60) return 'medium';
    return 'high';
  }

  private async getUserSegments(userId: string): Promise<string[]> {
    try {
      // Get user segments from Firestore
      const userSegmentsQuery = query(
        collection(db, 'userSegments'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(userSegmentsQuery);
      return querySnapshot.docs.map(doc => doc.data().segmentName);
    } catch (error) {
      console.error('Failed to get user segments:', error);
      return [];
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      userId: '',
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
  }

  private getDefaultUserBehavior(): UserBehavior {
    return {
      engagementRate: 0,
      preferredChannels: ['inApp', 'push'],
      optimalTimes: ['12:00', '19:00'],
      responsePatterns: [],
      activityLevel: 'medium',
      lastActive: new Date().toISOString(),
      sessionCount: 0,
      avgSessionDuration: 0,
    };
  }

  // ==================== NOTIFICATION PERSONALIZATION ====================

  async personalizeNotification(
    notification: EnhancedNotification,
    userProfile?: UserProfile
  ): Promise<EnhancedNotification> {
    try {
      const profile = userProfile || await this.getUserProfile(notification.userId);
      if (!profile) {
        return notification;
      }

      // Get applicable personalization rules
      const rules = this.rulesCache.get(notification.type) || [];

      // Apply personalization rules
      let personalizedNotification = { ...notification };

      for (const rule of rules) {
        const shouldApply = await this.evaluateRuleConditions(rule, profile);
        if (shouldApply) {
          personalizedNotification = await this.applyRuleActions(rule, personalizedNotification, profile);
        }
      }

      // Apply intelligent defaults based on user behavior
      personalizedNotification = await this.applyIntelligentDefaults(personalizedNotification, profile);

      return personalizedNotification;
    } catch (error) {
      console.error('Failed to personalize notification:', error);
      return notification;
    }
  }

  private async evaluateRuleConditions(
    rule: PersonalizationRule,
    profile: UserProfile
  ): Promise<boolean> {
    try {
      for (const condition of rule.conditions) {
        const fieldValue = this.getNestedFieldValue(profile, condition.field);
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
      console.error('Failed to evaluate rule conditions:', error);
      return false;
    }
  }

  private getNestedFieldValue(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
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

  private async applyRuleActions(
    rule: PersonalizationRule,
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<EnhancedNotification> {
    let modifiedNotification = { ...notification };

    for (const action of rule.actions) {
      switch (action.type) {
        case 'modify_content':
          modifiedNotification = this.applyContentModification(modifiedNotification, action.parameters);
          break;
        case 'modify_channel':
          modifiedNotification = this.applyChannelModification(modifiedNotification, action.parameters, profile);
          break;
        case 'modify_schedule':
          modifiedNotification = this.applyScheduleModification(modifiedNotification, action.parameters, profile);
          break;
        case 'modify_priority':
          modifiedNotification = this.applyPriorityModification(modifiedNotification, action.parameters);
          break;
        case 'skip_notification':
          if (this.shouldSkipNotification(action.parameters, profile)) {
            modifiedNotification.channels = {
              inApp: false,
              push: false,
              email: false,
            };
          }
          break;
      }
    }

    return modifiedNotification;
  }

  private applyContentModification(
    notification: EnhancedNotification,
    parameters: Record<string, any>
  ): EnhancedNotification {
    const modified = { ...notification };

    if (parameters.titleTemplate) {
      modified.title = this.applyTemplateVariables(parameters.titleTemplate, {
        userName: 'User', // Would get from user data
        ...parameters.variables,
      });
    }

    if (parameters.messageTemplate) {
      modified.message = this.applyTemplateVariables(parameters.messageTemplate, {
        userName: 'User', // Would get from user data
        ...parameters.variables,
      });
    }

    if (parameters.imageUrl) {
      modified.imageUrl = parameters.imageUrl;
    }

    return modified;
  }

  private applyChannelModification(
    notification: EnhancedNotification,
    parameters: Record<string, any>,
    profile: UserProfile
  ): EnhancedNotification {
    const modified = { ...notification };

    if (parameters.preferredChannels && profile.behavior.preferredChannels.length > 0) {
      // Enable only preferred channels
      const preferredChannels = profile.behavior.preferredChannels;
      modified.channels = {
        inApp: preferredChannels.includes('inApp') ? notification.channels.inApp : false,
        push: preferredChannels.includes('push') ? notification.channels.push : false,
        email: preferredChannels.includes('email') ? notification.channels.email : false,
      };
    }

    return modified;
  }

  private applyScheduleModification(
    notification: EnhancedNotification,
    parameters: Record<string, any>,
    profile: UserProfile
  ): EnhancedNotification {
    const modified = { ...notification };

    if (parameters.useOptimalTime && profile.behavior.optimalTimes.length > 0) {
      modified.optimalSendTime = profile.behavior.optimalTimes[0];
      modified.scheduledFor = this.calculateScheduledTime(profile.behavior.optimalTimes[0]);
    }

    return modified;
  }

  private applyPriorityModification(
    notification: EnhancedNotification,
    parameters: Record<string, any>
  ): EnhancedNotification {
    const modified = { ...notification };

    if (parameters.priority) {
      modified.priority = parameters.priority;
    }

    return modified;
  }

  private shouldSkipNotification(parameters: Record<string, any>, profile: UserProfile): boolean {
    // Implement skip logic based on parameters and profile
    if (parameters.skipIfLowEngagement && profile.behavior.engagementRate < 20) {
      return true;
    }

    if (parameters.skipIfInactive && profile.behavior.activityLevel === 'low') {
      return true;
    }

    return false;
  }

  private applyTemplateVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  private calculateScheduledTime(optimalTime: string): string {
    const [hours, minutes] = optimalTime.split(':').map(Number);
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.toISOString();
  }

  private async applyIntelligentDefaults(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<EnhancedNotification> {
    let modified = { ...notification };

    // Apply intelligent channel selection if no channels are enabled
    if (!Object.values(modified.channels).some(enabled => enabled)) {
      const preferredChannels = profile.behavior.preferredChannels.slice(0, 2); // Top 2
      modified.channels = {
        inApp: preferredChannels.includes('inApp'),
        push: preferredChannels.includes('push'),
        email: preferredChannels.includes('email'),
      };
    }

    // Apply intelligent timing if no specific time is set
    if (!modified.scheduledFor && profile.behavior.optimalTimes.length > 0) {
      modified.optimalSendTime = profile.behavior.optimalTimes[0];
      modified.scheduledFor = this.calculateScheduledTime(profile.behavior.optimalTimes[0]);
    }

    // Apply intelligent priority based on user engagement
    if (modified.priority === 'normal' && profile.behavior.engagementRate > 80) {
      modified.priority = 'high';
    }

    return modified;
  }

  // ==================== BATCH PERSONALIZATION ====================

  async personalizeNotificationsBatch(
    notifications: EnhancedNotification[],
    userProfiles?: Map<string, UserProfile>
  ): Promise<EnhancedNotification[]> {
    try {
      const personalizedNotifications: EnhancedNotification[] = [];

      for (const notification of notifications) {
        const profile = userProfiles?.get(notification.userId) || await this.getUserProfile(notification.userId);
        const personalized = await this.personalizeNotification(notification, profile || undefined);
        personalizedNotifications.push(personalized);
      }

      return personalizedNotifications;
    } catch (error) {
      console.error('Failed to personalize notifications batch:', error);
      return notifications;
    }
  }

  // ==================== ANALYTICS AND OPTIMIZATION ====================

  async getPersonalizationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<{
    totalRules: number;
    activeRules: number;
    rulesByType: Record<string, number>;
    effectiveness: Record<string, number>;
  }> {
    try {
      const rules = await this.getPersonalizationRules();
      const activeRules = rules.filter(rule => rule.isActive);

      // Calculate rules by type
      const rulesByType: Record<string, number> = {};
      rules.forEach(rule => {
        rulesByType[rule.name] = (rulesByType[rule.name] || 0) + 1;
      });

      // Calculate effectiveness (would need tracking data)
      const effectiveness: Record<string, number> = {};

      return {
        totalRules: rules.length,
        activeRules: activeRules.length,
        rulesByType,
        effectiveness,
      };
    } catch (error) {
      console.error('Failed to get personalization analytics:', error);
      return {
        totalRules: 0,
        activeRules: 0,
        rulesByType: {},
        effectiveness: {},
      };
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  clearCache(): void {
    this.rulesCache.clear();
    this.userProfilesCache.clear();
    this.lastCacheUpdate.clear();
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    this.clearCache();
  }
}

// Export singleton instance
export const notificationPersonalizationEngine = NotificationPersonalizationEngine.getInstance();