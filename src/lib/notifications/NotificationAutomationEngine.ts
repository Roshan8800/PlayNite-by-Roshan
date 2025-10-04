// Notification Automation Engine - Smart scheduling and automation
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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  NotificationCampaign,
  NotificationTemplate,
  NotificationVariant,
  CampaignSchedule,
  TriggerEvent,
  DripStep,
  AudienceDefinition,
  CampaignSettings,
  CampaignAnalytics,
  TemplateVariable,
} from './types';
import type {
  Notification as NotificationType,
  NotificationPreferences,
} from '../types/social';
import { SocialError } from '../types/social';

export class NotificationAutomationEngine {
  private static instance: NotificationAutomationEngine;
  private activeCampaigns: Map<string, NotificationCampaign> = new Map();
  private campaignTriggers: Map<string, TriggerEvent[]> = new Map();
  private automationInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, () => void> = new Map();

  private constructor() {
    this.initializeAutomation();
    this.startAutomationProcessor();
  }

  public static getInstance(): NotificationAutomationEngine {
    if (!NotificationAutomationEngine.instance) {
      NotificationAutomationEngine.instance = new NotificationAutomationEngine();
    }
    return NotificationAutomationEngine.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeAutomation(): Promise<void> {
    try {
      // Load active campaigns
      await this.loadActiveCampaigns();

      // Setup event listeners for triggers
      this.setupTriggerListeners();

      console.log('Notification Automation Engine initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Automation Engine:', error);
    }
  }

  private async loadActiveCampaigns(): Promise<void> {
    try {
      const campaignsQuery = query(
        collection(db, 'notificationCampaigns'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(campaignsQuery);
      querySnapshot.docs.forEach(doc => {
        const campaign = { id: doc.id, ...doc.data() } as NotificationCampaign;
        this.activeCampaigns.set(doc.id, campaign);

        if (campaign.schedule.triggerEvents) {
          this.campaignTriggers.set(doc.id, campaign.schedule.triggerEvents);
        }
      });
    } catch (error) {
      console.error('Failed to load active campaigns:', error);
    }
  }

  private setupTriggerListeners(): void {
    // Listen for user events that could trigger campaigns
    const userEventsQuery = query(collection(db, 'userEvents'));
    const unsubscribe = onSnapshot(userEventsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const event = { id: change.doc.id, ...change.doc.data() };
          this.handleTriggerEvent(event);
        }
      });
    });

    this.eventListeners.set('userEvents', unsubscribe);
  }

  private startAutomationProcessor(): void {
    // Process automation tasks every minute
    this.automationInterval = setInterval(() => {
      this.processScheduledCampaigns();
      this.processDripCampaigns();
    }, 60000);
  }

  // ==================== CAMPAIGN MANAGEMENT ====================

  async createCampaign(
    name: string,
    description: string,
    type: NotificationCampaign['type'],
    template: NotificationTemplate,
    schedule: CampaignSchedule,
    audience: AudienceDefinition,
    settings: CampaignSettings
  ): Promise<NotificationCampaign> {
    try {
      const campaign: Omit<NotificationCampaign, 'id'> = {
        name,
        description,
        type,
        status: 'draft',
        targetAudience: audience,
        template,
        schedule,
        settings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const campaignRef = await addDoc(collection(db, 'notificationCampaigns'), campaign);
      const newCampaign = { id: campaignRef.id, ...campaign };

      return newCampaign;
    } catch (error) {
      throw new SocialError({
        message: 'Failed to create notification campaign',
        code: 'CAMPAIGN_CREATE_FAILED',
        statusCode: 500,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : { info: String(error) },
      });
    }
  }

  async startCampaign(campaignId: string): Promise<void> {
    try {
      const campaignRef = doc(db, 'notificationCampaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);

      if (!campaignDoc.exists()) {
        throw new SocialError({
          message: 'Campaign not found',
          code: 'CAMPAIGN_NOT_FOUND',
          statusCode: 404,
        });
      }

      await updateDoc(campaignRef, {
        status: 'active',
        updatedAt: new Date().toISOString(),
      });

      // Load campaign into memory
      const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as NotificationCampaign;
      this.activeCampaigns.set(campaignId, campaign);

      if (campaign.schedule.triggerEvents) {
        this.campaignTriggers.set(campaignId, campaign.schedule.triggerEvents);
      }

      console.log(`Campaign ${campaignId} started`);
    } catch (error) {
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      const campaignRef = doc(db, 'notificationCampaigns', campaignId);
      await updateDoc(campaignRef, {
        status: 'paused',
        updatedAt: new Date().toISOString(),
      });

      // Remove from active campaigns
      this.activeCampaigns.delete(campaignId);
      this.campaignTriggers.delete(campaignId);

      console.log(`Campaign ${campaignId} paused`);
    } catch (error) {
      throw new SocialError({
        message: 'Failed to pause campaign',
        code: 'CAMPAIGN_PAUSE_FAILED',
        statusCode: 500,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : { info: String(error) },
      });
    }
  }

  async stopCampaign(campaignId: string): Promise<void> {
    try {
      const campaignRef = doc(db, 'notificationCampaigns', campaignId);
      await updateDoc(campaignRef, {
        status: 'completed',
        updatedAt: new Date().toISOString(),
      });

      // Remove from active campaigns
      this.activeCampaigns.delete(campaignId);
      this.campaignTriggers.delete(campaignId);

      console.log(`Campaign ${campaignId} stopped`);
    } catch (error) {
      throw new SocialError({
        message: 'Failed to stop campaign',
        code: 'CAMPAIGN_STOP_FAILED',
        statusCode: 500,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : { info: String(error) },
      });
    }
  }

  async getCampaign(campaignId: string): Promise<NotificationCampaign | null> {
    try {
      const campaignDoc = await getDoc(doc(db, 'notificationCampaigns', campaignId));
      if (campaignDoc.exists()) {
        return { id: campaignDoc.id, ...campaignDoc.data() } as NotificationCampaign;
      }
      return null;
    } catch (error) {
      console.error('Failed to get campaign:', error);
      return null;
    }
  }

  async getActiveCampaigns(): Promise<NotificationCampaign[]> {
    return Array.from(this.activeCampaigns.values());
  }

  // ==================== TEMPLATE MANAGEMENT ====================

  async createTemplate(
    name: string,
    type: NotificationType['type'],
    category: NotificationType['category'],
    titleTemplate: string,
    messageTemplate: string,
    variables: TemplateVariable[]
  ): Promise<NotificationTemplate> {
    try {
      const template: Omit<NotificationTemplate, 'id'> = {
        name,
        type,
        category,
        titleTemplate,
        messageTemplate,
        variables,
        defaultChannels: {
          inApp: true,
          push: true,
          email: false,
        },
        defaultPriority: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const templateRef = await addDoc(collection(db, 'notificationTemplates'), template);
      return { id: templateRef.id, ...template };
    } catch (error) {
      throw new SocialError({
        message: 'Failed to create notification template',
        code: 'TEMPLATE_CREATE_FAILED',
        statusCode: 500,
        details: error instanceof Error ? { message: error.message, stack: error.stack } : { info: String(error) },
      });
    }
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const templateDoc = await getDoc(doc(db, 'notificationTemplates', templateId));
      if (templateDoc.exists()) {
        return { id: templateDoc.id, ...templateDoc.data() } as NotificationTemplate;
      }
      return null;
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  }

  async getTemplatesByType(type: NotificationType['type']): Promise<NotificationTemplate[]> {
    try {
      const templatesQuery = query(
        collection(db, 'notificationTemplates'),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(templatesQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationTemplate[];
    } catch (error) {
      console.error('Failed to get templates by type:', error);
      return [];
    }
  }

  // ==================== AUTOMATION PROCESSING ====================

  private async processScheduledCampaigns(): Promise<void> {
    try {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = now.getDay();

      for (const [campaignId, campaign] of this.activeCampaigns.entries()) {
        if (campaign.type !== 'recurring') continue;

        const shouldSend = await this.shouldSendScheduledNotification(campaign, currentTime, currentDay);
        if (shouldSend) {
          await this.executeScheduledCampaign(campaign);
        }
      }
    } catch (error) {
      console.error('Failed to process scheduled campaigns:', error);
    }
  }

  private async shouldSendScheduledNotification(
    campaign: NotificationCampaign,
    currentTime: number,
    currentDay: number
  ): Promise<boolean> {
    try {
      const schedule = campaign.schedule;

      // Check frequency
      if (!schedule.frequency) return false;

      // Check day of week
      if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(currentDay)) {
        return false;
      }

      // Check time of day
      if (schedule.timeOfDay) {
        const [scheduledHour, scheduledMin] = schedule.timeOfDay.split(':').map(Number);
        const scheduledTime = scheduledHour * 60 + scheduledMin;

        // Allow 5-minute window for execution
        return Math.abs(currentTime - scheduledTime) <= 5;
      }

      return false;
    } catch (error) {
      console.error('Failed to check if notification should be sent:', error);
      return false;
    }
  }

  private async executeScheduledCampaign(campaign: NotificationCampaign): Promise<void> {
    try {
      // Get target audience
      const targetUsers = await this.getTargetAudience(campaign.targetAudience);

      // Send notification to each user
      for (const userId of targetUsers) {
        await this.sendCampaignNotification(campaign, userId);
      }

      // Update campaign analytics
      await this.updateCampaignAnalytics(campaign.id, {
        sent: targetUsers.length,
      });

      console.log(`Executed scheduled campaign ${campaign.id} for ${targetUsers.length} users`);
    } catch (error) {
      console.error('Failed to execute scheduled campaign:', error);
    }
  }

  private async processDripCampaigns(): Promise<void> {
    try {
      // Process drip campaign steps
      for (const [campaignId, campaign] of this.activeCampaigns.entries()) {
        if (campaign.type !== 'drip' || !campaign.schedule.steps) continue;

        await this.processDripSteps(campaign);
      }
    } catch (error) {
      console.error('Failed to process drip campaigns:', error);
    }
  }

  private async processDripSteps(campaign: NotificationCampaign): Promise<void> {
    try {
      // Get users who should receive next drip step
      const usersForNextStep = await this.getUsersForNextDripStep(campaign);

      for (const { userId, currentStep } of usersForNextStep) {
        const nextStep = campaign.schedule.steps![currentStep];
        if (nextStep) {
          await this.sendDripStepNotification(campaign, userId, nextStep);
          await this.updateUserDripProgress(campaign.id, userId, currentStep + 1);
        }
      }
    } catch (error) {
      console.error('Failed to process drip steps:', error);
    }
  }

  // ==================== TRIGGER PROCESSING ====================

  private async handleTriggerEvent(event: any): Promise<void> {
    try {
      // Check if any active campaigns should be triggered by this event
      for (const [campaignId, triggers] of this.campaignTriggers.entries()) {
        for (const trigger of triggers) {
          if (this.matchesTrigger(event, trigger)) {
            await this.executeTriggerCampaign(campaignId, event);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle trigger event:', error);
    }
  }

  private matchesTrigger(event: any, trigger: TriggerEvent): boolean {
    // Check if event type matches
    if (event.type !== trigger.type) return false;

    // Check conditions if specified
    if (trigger.conditions) {
      for (const condition of trigger.conditions) {
        const fieldValue = this.getNestedFieldValue(event, condition.field);
        if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private async executeTriggerCampaign(campaignId: string, event: any): Promise<void> {
    try {
      const campaign = this.activeCampaigns.get(campaignId);
      if (!campaign) return;

      // Get target users (could be event.userId or broader audience)
      const targetUsers = await this.getTriggerTargetUsers(campaign, event);

      for (const userId of targetUsers) {
        // Check if user should receive this triggered notification
        const shouldReceive = await this.shouldReceiveTriggeredNotification(campaign, userId, event);
        if (shouldReceive) {
          await this.sendTriggeredNotification(campaign, userId, event);
        }
      }
    } catch (error) {
      console.error('Failed to execute trigger campaign:', error);
    }
  }

  // ==================== NOTIFICATION SENDING ====================

  private async sendCampaignNotification(campaign: NotificationCampaign, userId: string): Promise<void> {
    try {
      // Get user preferences
      const userPreferences = await this.getUserNotificationPreferences(userId);
      if (!userPreferences.globalSettings.enabled) return;

      // Check if user is in target audience
      const isInAudience = await this.isUserInAudience(userId, campaign.targetAudience);
      if (!isInAudience) return;

      // Check rate limits
      const withinLimits = await this.checkRateLimits(userId, campaign.settings);
      if (!withinLimits) return;

      // Generate notification content
      const notificationContent = await this.generateNotificationContent(campaign, userId);

      // Apply personalization
      const personalizedContent = await this.personalizeContent(notificationContent, userId);

      // Send notification
      const notificationResult = await this.sendNotification(userId, personalizedContent, campaign);

      if (notificationResult.success) {
        // Track analytics
        await this.trackCampaignDelivery(campaign.id, userId, 'sent');
      }
    } catch (error) {
      console.error('Failed to send campaign notification:', error);
    }
  }

  private async sendTriggeredNotification(
    campaign: NotificationCampaign,
    userId: string,
    event: any
  ): Promise<void> {
    try {
      // Similar to sendCampaignNotification but with trigger-specific logic
      const notificationContent = await this.generateNotificationContent(campaign, userId, event);
      const personalizedContent = await this.personalizeContent(notificationContent, userId, event);

      const notificationResult = await this.sendNotification(userId, personalizedContent, campaign);

      if (notificationResult.success) {
        await this.trackCampaignDelivery(campaign.id, userId, 'sent');
      }
    } catch (error) {
      console.error('Failed to send triggered notification:', error);
    }
  }

  private async sendDripStepNotification(
    campaign: NotificationCampaign,
    userId: string,
    step: DripStep
  ): Promise<void> {
    try {
      // Check if user meets step conditions
      if (step.conditions) {
        const meetsConditions = await this.evaluateStepConditions(userId, step.conditions);
        if (!meetsConditions) return;
      }

      // Generate step-specific content
      const notificationContent = await this.generateDripStepContent(campaign, step, userId);
      const personalizedContent = await this.personalizeContent(notificationContent, userId);

      const notificationResult = await this.sendNotification(userId, personalizedContent, campaign);

      if (notificationResult.success) {
        await this.trackCampaignDelivery(campaign.id, userId, 'sent');
      }
    } catch (error) {
      console.error('Failed to send drip step notification:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private async getTargetAudience(audience: AudienceDefinition): Promise<string[]> {
    try {
      let userIds: string[] = [];

      // Get users from included segments
      for (const segment of audience.includeSegments) {
        const segmentUsers = await this.getUsersInSegment(segment);
        userIds.push(...segmentUsers);
      }

      // Remove users from excluded segments
      for (const segment of audience.excludeSegments) {
        const excludedUsers = await this.getUsersInSegment(segment);
        userIds = userIds.filter(id => !excludedUsers.includes(id));
      }

      // Apply custom filters if specified
      if (audience.customFilters) {
        userIds = await this.applyCustomFilters(userIds, audience.customFilters);
      }

      return [...new Set(userIds)]; // Remove duplicates
    } catch (error) {
      console.error('Failed to get target audience:', error);
      return [];
    }
  }

  private async getUsersInSegment(segmentName: string): Promise<string[]> {
    try {
      const segmentQuery = query(
        collection(db, 'userSegments'),
        where('segmentName', '==', segmentName)
      );

      const querySnapshot = await getDocs(segmentQuery);
      return querySnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Failed to get users in segment:', error);
      return [];
    }
  }

  private async applyCustomFilters(userIds: string[], filters: any[]): Promise<string[]> {
    // Implementation would apply custom filters to user list
    // For now, return all users
    return userIds;
  }

  private async getTriggerTargetUsers(campaign: NotificationCampaign, event: any): Promise<string[]> {
    // For triggered campaigns, target users could be:
    // 1. The user who triggered the event (event.userId)
    // 2. Users related to the event (e.g., friends, followers)
    // 3. The entire audience if it's a broadcast trigger

    if (event.userId) {
      return [event.userId];
    }

    return await this.getTargetAudience(campaign.targetAudience);
  }

  private async shouldReceiveTriggeredNotification(
    campaign: NotificationCampaign,
    userId: string,
    event: any
  ): Promise<boolean> {
    try {
      // Check user preferences
      const preferences = await this.getUserNotificationPreferences(userId);
      if (!preferences.globalSettings.enabled) return false;

      // Check if user is in target audience
      const isInAudience = await this.isUserInAudience(userId, campaign.targetAudience);
      if (!isInAudience) return false;

      // Check rate limits
      const withinLimits = await this.checkRateLimits(userId, campaign.settings);
      if (!withinLimits) return false;

      // Check if user has already received this trigger recently
      const recentlyReceived = await this.checkRecentTriggerReceipt(userId, campaign.id, event.type);
      if (recentlyReceived) return false;

      return true;
    } catch (error) {
      console.error('Failed to check if user should receive triggered notification:', error);
      return false;
    }
  }

  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.notificationPreferences || this.getDefaultPreferences();
      }
      return this.getDefaultPreferences();
    } catch (error) {
      console.error('Failed to get user notification preferences:', error);
      return this.getDefaultPreferences();
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

  private async checkRateLimits(userId: string, settings: CampaignSettings): Promise<boolean> {
    try {
      if (!settings.maxNotificationsPerDay) return true;

      const today = new Date().toISOString().split('T')[0];
      const dayStart = `${today}T00:00:00.000Z`;
      const dayEnd = `${today}T23:59:59.999Z`;

      const sentQuery = query(
        collection(db, 'campaignDeliveries'),
        where('userId', '==', userId),
        where('timestamp', '>=', dayStart),
        where('timestamp', '<=', dayEnd)
      );

      const querySnapshot = await getDocs(sentQuery);
      return querySnapshot.size < settings.maxNotificationsPerDay;
    } catch (error) {
      console.error('Failed to check rate limits:', error);
      return true; // Allow if we can't check
    }
  }

  private async checkRecentTriggerReceipt(userId: string, campaignId: string, eventType: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const recentQuery = query(
        collection(db, 'campaignDeliveries'),
        where('userId', '==', userId),
        where('campaignId', '==', campaignId),
        where('triggerEvent', '==', eventType),
        where('timestamp', '>=', oneHourAgo)
      );

      const querySnapshot = await getDocs(recentQuery);
      return querySnapshot.size > 0;
    } catch (error) {
      console.error('Failed to check recent trigger receipt:', error);
      return false;
    }
  }

  private async isUserInAudience(userId: string, audience: AudienceDefinition): Promise<boolean> {
    try {
      // Check if user is in included segments
      for (const segment of audience.includeSegments) {
        const segmentUsers = await this.getUsersInSegment(segment);
        if (segmentUsers.includes(userId)) {
          // Check if user is NOT in excluded segments
          for (const excludedSegment of audience.excludeSegments) {
            const excludedUsers = await this.getUsersInSegment(excludedSegment);
            if (excludedUsers.includes(userId)) {
              return false;
            }
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to check if user is in audience:', error);
      return false;
    }
  }

  private async generateNotificationContent(
    campaign: NotificationCampaign,
    userId: string,
    event?: any
  ): Promise<{ title: string; message: string; data?: Record<string, any> }> {
    try {
      const template = campaign.template;

      // Apply template variables
      let title = template.titleTemplate;
      let message = template.messageTemplate;

      // Replace template variables with actual values
      const variables = await this.getTemplateVariables(userId, event);
      title = this.applyTemplateVariables(title, variables);
      message = this.applyTemplateVariables(message, variables);

      return {
        title,
        message,
        data: {
          campaignId: campaign.id,
          templateId: template.id,
          eventType: event?.type,
        },
      };
    } catch (error) {
      console.error('Failed to generate notification content:', error);
      return {
        title: 'Notification',
        message: 'You have a new notification',
      };
    }
  }

  private async getTemplateVariables(userId: string, event?: any): Promise<Record<string, any>> {
    try {
      // Get user data for variable substitution
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};

      return {
        userName: userData.name || 'User',
        userFirstName: (userData.name || 'User').split(' ')[0],
        eventType: event?.type || 'notification',
        timestamp: new Date().toISOString(),
        ...event?.data,
      };
    } catch (error) {
      console.error('Failed to get template variables:', error);
      return {};
    }
  }

  private applyTemplateVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  private async personalizeContent(
    content: { title: string; message: string; data?: Record<string, any> },
    userId: string,
    event?: any
  ): Promise<{ title: string; message: string; data?: Record<string, any> }> {
    // Implementation would apply personalization rules
    // For now, return as-is
    return content;
  }

  private async sendNotification(
    userId: string,
    content: { title: string; message: string; data?: Record<string, any> },
    campaign: NotificationCampaign
  ): Promise<{ success: boolean; notificationId?: string }> {
    try {
      // Use the existing notification service to send the notification
      const notificationService = (await import('../services/notification-service')).notificationService;

      const result = await notificationService.createNotification(
        userId,
        campaign.template.type,
        content.title,
        content.message,
        content.data,
        {
          priority: campaign.template.defaultPriority,
          channels: campaign.template.defaultChannels,
          category: campaign.template.category,
        }
      );

      return {
        success: result.success,
        notificationId: result.data.id,
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false };
    }
  }

  private async trackCampaignDelivery(
    campaignId: string,
    userId: string,
    status: 'sent' | 'delivered' | 'failed'
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'campaignDeliveries'), {
        campaignId,
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track campaign delivery:', error);
    }
  }

  private async updateCampaignAnalytics(campaignId: string, updates: Partial<CampaignAnalytics>): Promise<void> {
    try {
      const campaignRef = doc(db, 'notificationCampaigns', campaignId);
      const campaignDoc = await getDoc(campaignRef);

      if (campaignDoc.exists()) {
        const currentAnalytics = campaignDoc.data().analytics || {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          unsubscribed: 0,
          complaints: 0,
          bounceRate: 0,
        };

        const updatedAnalytics = {
          ...currentAnalytics,
          ...updates,
        };

        await updateDoc(campaignRef, {
          analytics: updatedAnalytics,
        });
      }
    } catch (error) {
      console.error('Failed to update campaign analytics:', error);
    }
  }

  private async getUsersForNextDripStep(campaign: NotificationCampaign): Promise<Array<{ userId: string; currentStep: number }>> {
    try {
      // Get users who are enrolled in this drip campaign
      const enrolledQuery = query(
        collection(db, 'dripEnrollments'),
        where('campaignId', '==', campaign.id),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(enrolledQuery);
      const enrollments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const usersForNextStep: Array<{ userId: string; currentStep: number }> = [];

      for (const enrollment of enrollments) {
        const enrollmentData = enrollment as any;
        const currentStep = enrollmentData.currentStep || 0;
        const nextStep = campaign.schedule.steps![currentStep];

        if (nextStep) {
          // Check if enough time has passed since last step
          const lastStepTime = enrollmentData.lastStepAt ? new Date(enrollmentData.lastStepAt) : new Date();
          const timeSinceLastStep = Date.now() - lastStepTime.getTime();
          const requiredDelay = nextStep.delay * 60 * 1000; // Convert minutes to milliseconds

          if (timeSinceLastStep >= requiredDelay) {
            usersForNextStep.push({
              userId: enrollmentData.userId,
              currentStep,
            });
          }
        }
      }

      return usersForNextStep;
    } catch (error) {
      console.error('Failed to get users for next drip step:', error);
      return [];
    }
  }

  private async updateUserDripProgress(campaignId: string, userId: string, newStep: number): Promise<void> {
    try {
      const enrollmentQuery = query(
        collection(db, 'dripEnrollments'),
        where('campaignId', '==', campaignId),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(enrollmentQuery);
      if (!querySnapshot.empty) {
        const enrollmentDoc = querySnapshot.docs[0];
        await updateDoc(enrollmentDoc.ref, {
          currentStep: newStep,
          lastStepAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to update user drip progress:', error);
    }
  }

  private async evaluateStepConditions(userId: string, conditions: any[]): Promise<boolean> {
    // Implementation would evaluate step-specific conditions
    return true;
  }

  private async generateDripStepContent(
    campaign: NotificationCampaign,
    step: DripStep,
    userId: string
  ): Promise<{ title: string; message: string; data?: Record<string, any> }> {
    // Generate content specific to this drip step
    return {
      title: step.template.titleTemplate,
      message: step.template.messageTemplate,
      data: {
        campaignId: campaign.id,
        stepIndex: campaign.schedule.steps!.indexOf(step),
        dripStep: true,
      },
    };
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

  // ==================== CLEANUP ====================

  destroy(): void {
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
      this.automationInterval = null;
    }

    // Unsubscribe from all listeners
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners.clear();

    // Clear memory
    this.activeCampaigns.clear();
    this.campaignTriggers.clear();
  }
}

// Export singleton instance
export const notificationAutomationEngine = NotificationAutomationEngine.getInstance();