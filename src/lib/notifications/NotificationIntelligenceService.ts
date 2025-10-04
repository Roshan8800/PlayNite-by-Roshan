// Notification Intelligence Service - Smart filtering and personalization
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
  EnhancedNotification,
  UserProfile,
  UserBehavior,
  PersonalizationRule,
  NotificationChannel,
  UserContext,
} from './types';
import type {
  Notification as NotificationType,
  NotificationPreferences,
} from '../types/social';
import { SocialError } from '../types/social';

export class NotificationIntelligenceService {
  private static instance: NotificationIntelligenceService;
  private intelligenceCache: Map<string, any> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    this.initializeIntelligence();
  }

  public static getInstance(): NotificationIntelligenceService {
    if (!NotificationIntelligenceService.instance) {
      NotificationIntelligenceService.instance = new NotificationIntelligenceService();
    }
    return NotificationIntelligenceService.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeIntelligence(): Promise<void> {
    try {
      console.log('Notification Intelligence Service initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Intelligence Service:', error);
    }
  }

  // ==================== SMART FILTERING ====================

  async shouldSendNotification(
    notification: EnhancedNotification,
    userProfile?: UserProfile
  ): Promise<{
    shouldSend: boolean;
    reason?: string;
    confidence: number;
    alternativeChannels?: NotificationChannel[];
  }> {
    try {
      const profile = userProfile || await this.getUserProfile(notification.userId);
      if (!profile) {
        return { shouldSend: false, reason: 'No user profile found', confidence: 0 };
      }

      // Check basic filters
      const basicCheck = await this.performBasicFiltering(notification, profile);
      if (!basicCheck.shouldSend) {
        return basicCheck;
      }

      // Check behavioral filters
      const behavioralCheck = await this.performBehavioralFiltering(notification, profile);
      if (!behavioralCheck.shouldSend) {
        return behavioralCheck;
      }

      // Check contextual filters
      const contextualCheck = await this.performContextualFiltering(notification, profile);
      if (!contextualCheck.shouldSend) {
        return contextualCheck;
      }

      // Calculate overall confidence
      const confidence = await this.calculateDeliveryConfidence(notification, profile);

      // Suggest alternative channels if needed
      const alternativeChannels = await this.suggestAlternativeChannels(notification, profile);

      return {
        shouldSend: true,
        confidence,
        alternativeChannels: alternativeChannels.length > 0 ? alternativeChannels : undefined,
      };
    } catch (error) {
      console.error('Failed to determine if notification should be sent:', error);
      return { shouldSend: false, reason: 'Intelligence check failed', confidence: 0 };
    }
  }

  private async performBasicFiltering(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<{ shouldSend: boolean; reason?: string; confidence: number }> {
    try {
      // Check if user has notifications enabled
      if (!profile.preferences.globalSettings.enabled) {
        return { shouldSend: false, reason: 'Notifications disabled by user', confidence: 100 };
      }

      // Check if this notification type is enabled
      const typePreference = profile.preferences.types[notification.type];
      if (!typePreference?.enabled) {
        return { shouldSend: false, reason: 'Notification type disabled', confidence: 100 };
      }

      // Check quiet hours
      if (this.isInQuietHours(profile.preferences)) {
        if (notification.priority !== 'urgent') {
          return { shouldSend: false, reason: 'Quiet hours active', confidence: 90 };
        }
      }

      // Check if user has muted the sender
      if (profile.preferences.mutedUsers.includes(notification.data?.senderId || '')) {
        return { shouldSend: false, reason: 'Sender is muted', confidence: 100 };
      }

      return { shouldSend: true, confidence: 100 };
    } catch (error) {
      console.error('Failed to perform basic filtering:', error);
      return { shouldSend: false, reason: 'Basic filtering failed', confidence: 0 };
    }
  }

  private async performBehavioralFiltering(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<{ shouldSend: boolean; reason?: string; confidence: number }> {
    try {
      const behavior = profile.behavior;

      // Check user's activity level
      if (behavior.activityLevel === 'low' && notification.priority === 'low') {
        return { shouldSend: false, reason: 'Low activity user, low priority notification', confidence: 80 };
      }

      // Check engagement rate
      if (behavior.engagementRate < 20 && notification.type !== 'system') {
        return { shouldSend: false, reason: 'Low engagement user', confidence: 70 };
      }

      // Check if user typically responds to this type of notification
      const typeResponseRate = await this.getTypeResponseRate(notification.type, profile);
      if (typeResponseRate < 10) {
        return { shouldSend: false, reason: 'Low response rate for this notification type', confidence: 60 };
      }

      return { shouldSend: true, confidence: 85 };
    } catch (error) {
      console.error('Failed to perform behavioral filtering:', error);
      return { shouldSend: true, confidence: 50 };
    }
  }

  private async performContextualFiltering(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<{ shouldSend: boolean; reason?: string; confidence: number }> {
    try {
      const context = notification.userContext;

      // Check if user is currently active
      if (context?.appState === 'background' && notification.priority !== 'urgent') {
        return { shouldSend: false, reason: 'User is not active', confidence: 75 };
      }

      // Check time of day preferences
      if (context?.timeOfDay) {
        const optimalTimes = profile.behavior.optimalTimes;
        if (optimalTimes.length > 0 && !optimalTimes.includes(context.timeOfDay)) {
          return { shouldSend: false, reason: 'Not optimal time of day', confidence: 60 };
        }
      }

      // Check device type preferences
      if (context?.deviceType && !profile.behavior.preferredChannels.some(ch => ch === 'inApp' || ch === 'push')) {
        return { shouldSend: false, reason: 'Non-preferred device type', confidence: 65 };
      }

      return { shouldSend: true, confidence: 90 };
    } catch (error) {
      console.error('Failed to perform contextual filtering:', error);
      return { shouldSend: true, confidence: 50 };
    }
  }

  private async calculateDeliveryConfidence(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<number> {
    try {
      let confidence = 50; // Base confidence

      // Adjust based on user engagement
      confidence += (profile.behavior.engagementRate / 100) * 30;

      // Adjust based on notification type performance
      const typePerformance = await this.getNotificationTypePerformance(notification.type, profile);
      confidence += (typePerformance / 100) * 20;

      // Adjust based on channel performance
      const channelPerformance = await this.getChannelPerformance(notification.channels, profile);
      confidence += (channelPerformance / 100) * 20;

      // Adjust based on timing
      const timingScore = await this.getTimingScore(notification, profile);
      confidence += timingScore * 10;

      return Math.min(confidence, 100);
    } catch (error) {
      console.error('Failed to calculate delivery confidence:', error);
      return 50;
    }
  }

  private async suggestAlternativeChannels(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<NotificationChannel[]> {
    try {
      const alternatives: NotificationChannel[] = [];
      const preferredChannels = profile.behavior.preferredChannels;

      // If current channels are not performing well, suggest alternatives
      for (const channel of preferredChannels) {
        if (!notification.channels[channel as keyof typeof notification.channels]) {
          const performance = await this.getChannelPerformanceForUser(channel, profile);
          if (performance > 50) {
            alternatives.push(channel);
          }
        }
      }

      return alternatives.slice(0, 2); // Return top 2 alternatives
    } catch (error) {
      console.error('Failed to suggest alternative channels:', error);
      return [];
    }
  }

  // ==================== PREDICTIVE ANALYTICS ====================

  async predictNotificationPerformance(
    notification: EnhancedNotification,
    userProfile?: UserProfile
  ): Promise<{
    openRate: number;
    clickRate: number;
    conversionRate: number;
    optimalChannels: NotificationChannel[];
    optimalTiming: string;
    confidence: number;
  }> {
    try {
      const profile = userProfile || await this.getUserProfile(notification.userId);
      if (!profile) {
        return this.getDefaultPrediction();
      }

      // Predict open rate based on historical data
      const openRate = await this.predictOpenRate(notification, profile);

      // Predict click rate based on content and user behavior
      const clickRate = await this.predictClickRate(notification, profile);

      // Predict conversion rate based on notification type and user history
      const conversionRate = await this.predictConversionRate(notification, profile);

      // Determine optimal channels
      const optimalChannels = await this.predictOptimalChannels(notification, profile);

      // Determine optimal timing
      const optimalTiming = await this.predictOptimalTiming(notification, profile);

      // Calculate overall confidence
      const confidence = await this.calculatePredictionConfidence(notification, profile);

      return {
        openRate,
        clickRate,
        conversionRate,
        optimalChannels,
        optimalTiming,
        confidence,
      };
    } catch (error) {
      console.error('Failed to predict notification performance:', error);
      return this.getDefaultPrediction();
    }
  }

  private async predictOpenRate(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<number> {
    try {
      let openRate = profile.behavior.engagementRate;

      // Adjust based on notification type
      const typeAdjustment = await this.getTypePerformanceAdjustment(notification.type, profile);
      openRate += typeAdjustment;

      // Adjust based on priority
      const priorityAdjustment = this.getPriorityAdjustment(notification.priority);
      openRate += priorityAdjustment;

      // Adjust based on sender relationship (if applicable)
      const relationshipAdjustment = await this.getRelationshipAdjustment(notification, profile);
      openRate += relationshipAdjustment;

      return Math.min(Math.max(openRate, 0), 100);
    } catch (error) {
      console.error('Failed to predict open rate:', error);
      return profile.behavior.engagementRate;
    }
  }

  private async predictClickRate(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<number> {
    try {
      let clickRate = profile.behavior.responsePatterns.reduce((acc, pattern) => {
        return acc + pattern.clickRate;
      }, 0) / profile.behavior.responsePatterns.length;

      // Adjust based on content relevance
      const relevanceScore = await this.calculateContentRelevance(notification, profile);
      clickRate += relevanceScore * 20;

      // Adjust based on call-to-action strength
      const ctaStrength = this.calculateCTAStrength(notification);
      clickRate += ctaStrength * 15;

      return Math.min(Math.max(clickRate, 0), 100);
    } catch (error) {
      console.error('Failed to predict click rate:', error);
      return 25; // Default click rate
    }
  }

  private async predictConversionRate(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<number> {
    try {
      // Base conversion rate on user's historical conversion data
      const baseConversionRate = await this.getUserConversionRate(profile);

      // Adjust based on notification type
      const typeMultiplier = this.getTypeConversionMultiplier(notification.type);

      // Adjust based on urgency
      const urgencyMultiplier = this.getUrgencyMultiplier(notification.priority);

      return Math.min(baseConversionRate * typeMultiplier * urgencyMultiplier, 100);
    } catch (error) {
      console.error('Failed to predict conversion rate:', error);
      return 5; // Default conversion rate
    }
  }

  private async predictOptimalChannels(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<NotificationChannel[]> {
    try {
      const channelScores = await Promise.all(
        profile.behavior.preferredChannels.map(async (channel) => {
          const performance = await this.getChannelPerformanceForUser(channel, profile);
          const relevance = await this.getChannelRelevance(channel, notification);
          const availability = await this.getChannelAvailability(channel, profile);

          return {
            channel,
            score: (performance * 0.5) + (relevance * 0.3) + (availability * 0.2),
          };
        })
      );

      return channelScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.channel);
    } catch (error) {
      console.error('Failed to predict optimal channels:', error);
      return profile.behavior.preferredChannels.slice(0, 2);
    }
  }

  private async predictOptimalTiming(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<string> {
    try {
      const context = notification.userContext;
      const currentTime = context?.timeOfDay || this.getCurrentTimeOfDay();

      // If current time is in optimal times, use it
      if (profile.behavior.optimalTimes.includes(currentTime)) {
        return currentTime;
      }

      // Otherwise, find the next optimal time
      const nextOptimalTime = profile.behavior.optimalTimes.find(time =>
        this.isTimeAfterCurrent(time, currentTime)
      );

      return nextOptimalTime || profile.behavior.optimalTimes[0] || '12:00';
    } catch (error) {
      console.error('Failed to predict optimal timing:', error);
      return '12:00';
    }
  }

  private async calculatePredictionConfidence(
    notification: EnhancedNotification,
    profile: UserProfile
  ): Promise<number> {
    try {
      let confidence = 50; // Base confidence

      // More data = higher confidence
      confidence += Math.min(profile.behavior.sessionCount / 10, 30);

      // Recent activity = higher confidence
      const daysSinceLastActive = this.getDaysSinceLastActive(profile.behavior.lastActive);
      confidence += Math.max(0, 20 - daysSinceLastActive);

      // Consistent behavior = higher confidence
      const behaviorConsistency = await this.calculateBehaviorConsistency(profile);
      confidence += behaviorConsistency * 20;

      return Math.min(confidence, 100);
    } catch (error) {
      console.error('Failed to calculate prediction confidence:', error);
      return 50;
    }
  }

  // ==================== CONTENT OPTIMIZATION ====================

  async optimizeNotificationContent(
    notification: EnhancedNotification,
    userProfile?: UserProfile
  ): Promise<{
    optimizedTitle: string;
    optimizedMessage: string;
    optimizedChannels: NotificationChannel[];
    optimizedTiming: string;
    expectedPerformance: {
      openRate: number;
      clickRate: number;
      conversionRate: number;
    };
  }> {
    try {
      const profile = userProfile || await this.getUserProfile(notification.userId);
      if (!profile) {
        return this.getDefaultOptimization(notification);
      }

      // Optimize title
      const optimizedTitle = await this.optimizeTitle(notification.title, profile);

      // Optimize message
      const optimizedMessage = await this.optimizeMessage(notification.message, profile);

      // Optimize channels
      const optimizedChannels = await this.predictOptimalChannels(notification, profile);

      // Optimize timing
      const optimizedTiming = await this.predictOptimalTiming(notification, profile);

      // Predict performance with optimizations
      const performancePrediction = await this.predictNotificationPerformance(
        {
          ...notification,
          title: optimizedTitle,
          message: optimizedMessage,
          channels: this.channelsArrayToObject(optimizedChannels),
        },
        profile
      );

      return {
        optimizedTitle,
        optimizedMessage,
        optimizedChannels,
        optimizedTiming,
        expectedPerformance: {
          openRate: performancePrediction.openRate,
          clickRate: performancePrediction.clickRate,
          conversionRate: performancePrediction.conversionRate,
        },
      };
    } catch (error) {
      console.error('Failed to optimize notification content:', error);
      return this.getDefaultOptimization(notification);
    }
  }

  private async optimizeTitle(title: string, profile: UserProfile): Promise<string> {
    try {
      // Use user's preferred language style
      const languageStyle = await this.detectLanguageStyle(profile);

      // Apply personalization tokens
      let optimizedTitle = this.applyPersonalizationTokens(title, profile);

      // Adjust length based on user preferences
      if (optimizedTitle.length > 50) {
        optimizedTitle = this.shortenTitle(optimizedTitle);
      }

      return optimizedTitle;
    } catch (error) {
      console.error('Failed to optimize title:', error);
      return title;
    }
  }

  private async optimizeMessage(message: string, profile: UserProfile): Promise<string> {
    try {
      // Apply personalization
      let optimizedMessage = this.applyPersonalizationTokens(message, profile);

      // Adjust tone based on user preferences
      optimizedMessage = await this.adjustTone(optimizedMessage, profile);

      // Optimize length
      if (optimizedMessage.length > 150) {
        optimizedMessage = this.shortenMessage(optimizedMessage);
      }

      return optimizedMessage;
    } catch (error) {
      console.error('Failed to optimize message:', error);
      return message;
    }
  }

  // ==================== USER PROFILE MANAGEMENT ====================

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      if (this.intelligenceCache.has(userId)) {
        const cached = this.intelligenceCache.get(userId);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.profile;
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
      this.intelligenceCache.set(userId, {
        profile,
        timestamp: Date.now(),
      });

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

      // Calculate engagement metrics
      const totalSent = notifications.length;
      const engagementRate = totalSent > 0 ?
        (notifications.filter(n => n.isRead).length / totalSent) * 100 : 0;

      // Calculate preferred channels
      const preferredChannels = await this.calculatePreferredChannels(notifications);

      // Calculate optimal times
      const optimalTimes = await this.calculateOptimalTimes(notifications);

      // Calculate response patterns
      const responsePatterns = await this.calculateResponsePatterns(notifications);

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

  private async calculatePreferredChannels(notifications: any[]): Promise<NotificationChannel[]> {
    try {
      const channelStats: Record<NotificationChannel, { sent: number; read: number }> = {
        inApp: { sent: 0, read: 0 },
        push: { sent: 0, read: 0 },
        email: { sent: 0, read: 0 },
        sms: { sent: 0, read: 0 },
        webhook: { sent: 0, read: 0 },
      };

      notifications.forEach(notification => {
        Object.keys(notification.channels).forEach(channel => {
          if (notification.channels[channel]) {
            channelStats[channel as NotificationChannel].sent++;
            if (notification.isRead) {
              channelStats[channel as NotificationChannel].read++;
            }
          }
        });
      });

      return Object.entries(channelStats)
        .map(([channel, stats]) => ({
          channel: channel as NotificationChannel,
          engagementRate: stats.sent > 0 ? (stats.read / stats.sent) * 100 : 0,
        }))
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .map(item => item.channel);
    } catch (error) {
      console.error('Failed to calculate preferred channels:', error);
      return ['inApp', 'push'];
    }
  }

  private async calculateOptimalTimes(notifications: any[]): Promise<string[]> {
    try {
      const hourlyStats: Record<number, number> = {};

      notifications.filter(n => n.isRead).forEach(notification => {
        const hour = new Date(notification.readAt || notification.createdAt).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      });

      return Object.entries(hourlyStats)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([hour]) => `${hour.padStart(2, '0')}:00`);
    } catch (error) {
      console.error('Failed to calculate optimal times:', error);
      return ['12:00', '19:00'];
    }
  }

  private async calculateResponsePatterns(notifications: any[]): Promise<any[]> {
    // Implementation would calculate detailed response patterns
    return [];
  }

  private determineActivityLevel(totalSent: number, engagementRate: number): 'low' | 'medium' | 'high' {
    if (totalSent < 10 || engagementRate < 20) return 'low';
    if (totalSent < 50 || engagementRate < 60) return 'medium';
    return 'high';
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

  // ==================== HELPER METHODS ====================

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

  private async getTypeResponseRate(type: NotificationType['type'], profile: UserProfile): Promise<number> {
    // Implementation would get historical response rate for this notification type
    return 50; // Default
  }

  private async getNotificationTypePerformance(type: NotificationType['type'], profile: UserProfile): Promise<number> {
    // Implementation would get performance metrics for this notification type
    return 50; // Default
  }

  private async getChannelPerformance(channels: any, profile: UserProfile): Promise<number> {
    // Implementation would get performance metrics for enabled channels
    return 50; // Default
  }

  private async getTimingScore(notification: EnhancedNotification, profile: UserProfile): Promise<number> {
    // Implementation would calculate timing appropriateness score
    return 0.5; // Default
  }

  private async getChannelPerformanceForUser(channel: NotificationChannel, profile: UserProfile): Promise<number> {
    // Implementation would get channel performance for specific user
    return 50; // Default
  }

  private async getChannelRelevance(channel: NotificationChannel, notification: EnhancedNotification): Promise<number> {
    // Implementation would calculate channel relevance for notification
    return 50; // Default
  }

  private async getChannelAvailability(channel: NotificationChannel, profile: UserProfile): Promise<number> {
    // Implementation would check if channel is available for user
    return 100; // Default
  }

  private async getTypePerformanceAdjustment(type: NotificationType['type'], profile: UserProfile): Promise<number> {
    // Implementation would get type-specific performance adjustment
    return 0; // Default
  }

  private getPriorityAdjustment(priority: NotificationType['priority']): number {
    switch (priority) {
      case 'urgent': return 20;
      case 'high': return 10;
      case 'normal': return 0;
      case 'low': return -10;
      default: return 0;
    }
  }

  private async getRelationshipAdjustment(notification: EnhancedNotification, profile: UserProfile): Promise<number> {
    // Implementation would adjust based on sender-user relationship
    return 0; // Default
  }

  private async calculateContentRelevance(notification: EnhancedNotification, profile: UserProfile): Promise<number> {
    // Implementation would calculate content relevance score
    return 0.5; // Default
  }

  private calculateCTAStrength(notification: EnhancedNotification): number {
    // Implementation would calculate call-to-action strength
    return notification.actionUrl ? 1.0 : 0.3;
  }

  private async getUserConversionRate(profile: UserProfile): Promise<number> {
    // Implementation would get user's historical conversion rate
    return 5; // Default 5%
  }

  private getTypeConversionMultiplier(type: NotificationType['type']): number {
    // Different notification types have different conversion potential
    switch (type) {
      case 'system': return 1.5;
      case 'achievement': return 1.2;
      case 'like': return 0.8;
      case 'comment': return 0.9;
      default: return 1.0;
    }
  }

  private getUrgencyMultiplier(priority: NotificationType['priority']): number {
    switch (priority) {
      case 'urgent': return 2.0;
      case 'high': return 1.5;
      case 'normal': return 1.0;
      case 'low': return 0.7;
      default: return 1.0;
    }
  }

  private getCurrentTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private isTimeAfterCurrent(time1: string, time2: string): boolean {
    // Implementation would compare times
    return true; // Default
  }

  private async calculateBehaviorConsistency(profile: UserProfile): Promise<number> {
    // Implementation would calculate how consistent user behavior is
    return 0.5; // Default
  }

  private getDaysSinceLastActive(lastActive: string): number {
    return Math.floor((Date.now() - new Date(lastActive).getTime()) / (24 * 60 * 60 * 1000));
  }

  private async detectLanguageStyle(profile: UserProfile): Promise<string> {
    // Implementation would detect user's preferred language style
    return 'formal'; // Default
  }

  private applyPersonalizationTokens(text: string, profile: UserProfile): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      // Implementation would replace personalization tokens
      return match; // Default: no replacement
    });
  }

  private shortenTitle(title: string): string {
    if (title.length <= 50) return title;
    return title.substring(0, 47) + '...';
  }

  private async adjustTone(message: string, profile: UserProfile): Promise<string> {
    // Implementation would adjust message tone based on user preferences
    return message; // Default: no adjustment
  }

  private shortenMessage(message: string): string {
    if (message.length <= 150) return message;
    return message.substring(0, 147) + '...';
  }

  private channelsArrayToObject(channels: NotificationChannel[]): NotificationType['channels'] {
    return {
      inApp: channels.includes('inApp'),
      push: channels.includes('push'),
      email: channels.includes('email'),
    };
  }

  private getDefaultPrediction() {
    return {
      openRate: 50,
      clickRate: 25,
      conversionRate: 5,
      optimalChannels: ['inApp', 'push'] as NotificationChannel[],
      optimalTiming: '12:00',
      confidence: 50,
    };
  }

  private getDefaultOptimization(notification: EnhancedNotification) {
    return {
      optimizedTitle: notification.title,
      optimizedMessage: notification.message,
      optimizedChannels: ['inApp', 'push'] as NotificationChannel[],
      optimizedTiming: '12:00',
      expectedPerformance: {
        openRate: 50,
        clickRate: 25,
        conversionRate: 5,
      },
    };
  }

  // ==================== CLEANUP ====================

  clearCache(): void {
    this.intelligenceCache.clear();
  }

  destroy(): void {
    this.clearCache();
  }
}

// Export singleton instance
export const notificationIntelligenceService = NotificationIntelligenceService.getInstance();