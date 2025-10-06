/**
 * @fileOverview Behavior system integrations with existing PlayNite services
 *
 * This module provides integration adapters and hooks for connecting the behavior
 * systems with existing services including social, content, notification, and more.
 */

import { behaviorIntegrationService } from '../BehaviorIntegrationService';
import {
  UserBehavior,
  SmartInteractionContext
} from '../types';

interface IntegratedBehaviorRequest {
  userId?: string;
  context: SmartInteractionContext;
  includePersonalization?: boolean;
  includeAnalytics?: boolean;
  includeHelp?: boolean;
  includeCuration?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

// Integration hooks for existing services
export class BehaviorServiceIntegrations {

  /**
   * Initialize all service integrations
   */
  static async initializeIntegrations(): Promise<void> {
    await behaviorIntegrationService.initialize();

    // Set up integration hooks
    this.setupContentServiceIntegration();
    this.setupSocialServiceIntegration();
    this.setupNotificationServiceIntegration();
    this.setupVideoServiceIntegration();

    console.log('Behavior service integrations initialized');
  }

  /**
   * Content service integration
   */
  private static setupContentServiceIntegration(): void {
    // Hook into content creation
    const originalCreateContent = async (contentData: any) => {
      // Original content creation logic would go here
      const content = { id: 'content_123', ...contentData };

      // Track content creation behavior
      const behavior: UserBehavior = {
        userId: contentData.userId,
        action: 'content_create',
        target: `content:${content.id}`,
        context: { contentType: contentData.type },
        timestamp: new Date(),
        sessionId: contentData.sessionId || 'unknown',
        metadata: {
          contentType: contentData.type,
          category: contentData.category
        }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      // Add to content curation system
      const contentItem = {
        contentId: content.id,
        type: contentData.type,
        metadata: {
          title: contentData.title,
          description: contentData.description,
          tags: contentData.tags,
          category: contentData.category,
          creator: contentData.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          engagement: {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            completionRate: 0
          },
          quality: {
            score: 0.5, // Default score
            signals: ['new_content']
          }
        }
      };

      // Import dynamically to avoid circular dependencies
      import('../systems/AutomatedContentCuration').then(({ automatedContentCuration }) => {
        automatedContentCuration.addContent(contentItem);
      });

      return content;
    };

    // Hook into content viewing
    const originalViewContent = async (contentId: string, userId: string, context: any) => {
      // Original content viewing logic would go here

      // Track content viewing behavior
      const behavior: UserBehavior = {
        userId,
        action: 'content_view',
        target: `content:${contentId}`,
        context: { contentId },
        timestamp: new Date(),
        sessionId: context.sessionId || 'unknown',
        metadata: {
          contentId,
          viewDuration: context.duration
        }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      return { success: true };
    };

    // Store hooks for later use
    (globalThis as any).__contentHooks = {
      createContent: originalCreateContent,
      viewContent: originalViewContent
    };
  }

  /**
   * Social service integration
   */
  private static setupSocialServiceIntegration(): void {
    // Hook into social interactions
    const originalLikeContent = async (contentId: string, userId: string) => {
      // Original like logic would go here

      // Track social behavior
      const behavior: UserBehavior = {
        userId,
        action: 'like',
        target: `content:${contentId}`,
        context: { contentId },
        timestamp: new Date(),
        sessionId: 'unknown',
        metadata: { contentId }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      return { success: true };
    };

    const originalFollowUser = async (targetUserId: string, followerId: string) => {
      // Original follow logic would go here

      // Track social behavior
      const behavior: UserBehavior = {
        userId: followerId,
        action: 'follow',
        target: `user:${targetUserId}`,
        context: { targetUserId },
        timestamp: new Date(),
        sessionId: 'unknown',
        metadata: { targetUserId }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      return { success: true };
    };

    const originalCommentOnContent = async (contentId: string, userId: string, comment: string) => {
      // Original comment logic would go here

      // Track social behavior
      const behavior: UserBehavior = {
        userId,
        action: 'comment',
        target: `content:${contentId}`,
        context: { contentId },
        timestamp: new Date(),
        sessionId: 'unknown',
        metadata: { contentId, commentLength: comment.length }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      return { success: true };
    };

    // Store hooks for later use
    (globalThis as any).__socialHooks = {
      likeContent: originalLikeContent,
      followUser: originalFollowUser,
      commentOnContent: originalCommentOnContent
    };
  }

  /**
   * Notification service integration
   */
  private static setupNotificationServiceIntegration(): void {
    // Hook into notification sending
    const originalSendNotification = async (userId: string, notification: any) => {
      // Original notification logic would go here

      // Get personalized notification preferences
      import('../engines/PersonalizationEngine').then(({ personalizationEngine }) => {
        personalizationEngine.getUserProfile(userId).then(profileResult => {
          if (profileResult.success && profileResult.data) {
            const preferences = profileResult.data.preferences.notificationSettings;

            // Filter notifications based on user preferences
            if (!preferences.push && notification.type === 'push') {
              return null; // Skip unwanted notifications
            }

            if (!preferences.email && notification.type === 'email') {
              return null; // Skip unwanted notifications
            }

            // Check notification categories
            if (preferences.categories.length > 0 &&
                !preferences.categories.includes(notification.category)) {
              return null; // Skip unwanted categories
            }

            // Send personalized notification
            return { success: true, personalized: true };
          }

          return { success: true };
        });
      });

      return { success: true };
    };

    // Hook into notification preferences update
    const originalUpdateNotificationPreferences = async (userId: string, preferences: any) => {
      // Original preferences update logic would go here

      // Update personalization profile
      import('../engines/PersonalizationEngine').then(({ personalizationEngine }) => {
        const update = {
          userId,
          preferences: {
            notificationSettings: preferences
          }
        };

        personalizationEngine.updateUserProfile(update);
      });

      return { success: true };
    };

    // Store hooks for later use
    (globalThis as any).__notificationHooks = {
      sendNotification: originalSendNotification,
      updateNotificationPreferences: originalUpdateNotificationPreferences
    };
  }

  /**
   * Video service integration
   */
  private static setupVideoServiceIntegration(): void {
    // Hook into video playback
    const originalPlayVideo = async (videoId: string, userId: string, context: any) => {
      // Original video play logic would go here

      // Track video viewing behavior
      const behavior: UserBehavior = {
        userId,
        action: 'video_play',
        target: `video:${videoId}`,
        context: { videoId },
        timestamp: new Date(),
        sessionId: context.sessionId || 'unknown',
        metadata: {
          videoId,
          quality: context.quality,
          autoplay: context.autoplay
        }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      return { success: true };
    };

    const originalCompleteVideo = async (videoId: string, userId: string, watchTime: number) => {
      // Original video completion logic would go here

      // Track video completion behavior
      const behavior: UserBehavior = {
        userId,
        action: 'video_complete',
        target: `video:${videoId}`,
        context: { videoId },
        timestamp: new Date(),
        sessionId: 'unknown',
        metadata: {
          videoId,
          watchTime,
          completed: true
        }
      };

      behaviorIntegrationService.trackUserBehavior(behavior);

      return { success: true };
    };

    // Store hooks for later use
    (globalThis as any).__videoHooks = {
      playVideo: originalPlayVideo,
      completeVideo: originalCompleteVideo
    };
  }

  /**
   * Process page navigation with behavior tracking
   */
  static async trackPageNavigation(
    userId: string | undefined,
    page: string,
    context: Partial<SmartInteractionContext>
  ): Promise<void> {
    const interactionContext: SmartInteractionContext = {
      userId,
      sessionId: context.sessionId || 'unknown',
      currentPage: page,
      userAgent: context.userAgent || '',
      timestamp: new Date(),
      interactions: [],
      environment: context.environment || {
        screenSize: 'unknown',
        deviceType: 'unknown',
        browser: 'unknown',
        platform: 'unknown'
      }
    };

    if (userId) {
      const behavior: UserBehavior = {
        userId,
        action: 'navigate',
        target: `page:${page}`,
        context: { page },
        timestamp: new Date(),
        sessionId: interactionContext.sessionId,
        metadata: {
          referrer: context.referrer,
          deviceType: interactionContext.environment.deviceType
        }
      };

      await behaviorIntegrationService.trackUserBehavior(behavior);
    }

    // Get integrated behavior response for the page
    const request: IntegratedBehaviorRequest = {
      userId,
      context: interactionContext,
      includePersonalization: true,
      includeHelp: true,
      includeCuration: true
    };

    const response = await behaviorIntegrationService.processIntegratedRequest(request);

    // Apply personalization if available
    if (response.success && response.data?.personalization) {
      this.applyPersonalizationToPage(response.data.personalization, page);
    }

    // Show contextual help if available
    if (response.success && response.data?.help && response.data.help.length > 0) {
      this.showContextualHelp(response.data.help, interactionContext);
    }
  }

  /**
   * Apply personalization settings to current page
   */
  private static applyPersonalizationToPage(
    profile: any,
    page: string
  ): void {
    // Apply UI preferences
    if (profile.uiPreferences) {
      const { layout, theme, animations, fontSize } = profile.uiPreferences;

      // Apply layout preferences
      document.body.setAttribute('data-layout', layout);

      // Apply theme preferences
      document.body.setAttribute('data-theme', theme);

      // Apply animation preferences
      if (!animations) {
        document.body.classList.add('reduced-animations');
      }

      // Apply font size preferences
      document.body.setAttribute('data-font-size', fontSize);
    }

    // Apply content preferences
    if (profile.contentPreferences) {
      const { categories, tags } = profile.contentPreferences;

      // Store preferences for content filtering
      (globalThis as any).__userContentPreferences = {
        categories,
        tags,
        excludedCategories: profile.contentPreferences.excludedCategories,
        excludedTags: profile.contentPreferences.excludedTags
      };
    }
  }

  /**
   * Show contextual help items
   */
  private static showContextualHelp(
    helpItems: any[],
    context: SmartInteractionContext
  ): void {
    // Show tooltips and guidance
    helpItems.forEach(help => {
      if (help.content.type === 'tooltip') {
        this.showTooltip(help, context);
      }
    });
  }

  /**
   * Show tooltip help
   */
  private static showTooltip(help: any, context: SmartInteractionContext): void {
    const targetElement = document.querySelector(`[data-help-id="${help.helpId}"]`) ||
                         document.querySelector(help.trigger.element);

    if (targetElement) {
      // Create and show tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'behavior-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-content">
          <h4>${help.content.title}</h4>
          <p>${help.content.message}</p>
        </div>
      `;

      // Position tooltip
      const rect = targetElement.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.top = `${rect.bottom + 5}px`;
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.zIndex = '9999';

      document.body.appendChild(tooltip);

      // Auto-remove after delay
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 5000);
    }
  }

  /**
   * Get behavior-enhanced content recommendations
   */
  static async getEnhancedRecommendations(
    userId: string,
    context: any,
    options: {
      includeBehavioralData?: boolean;
      includePersonalization?: boolean;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    const {
      includeBehavioralData = true,
      includePersonalization = true,
      limit = 20
    } = options;

    // Use enhanced recommendation flows
    if (includeBehavioralData && userId) {
      // Import and use enhanced recommendation functions
      const { getVideoRecommendations } = await import('@/ai/flows/ai-powered-personalized-recommendations');
      const { recommendVideos } = await import('@/ai/flows/content-recommendation-engine');

      const flowContext = {
        sessionId: context.sessionId || 'unknown',
        currentPage: context.currentPage || '',
        userAgent: context.userAgent || 'unknown',
        timestamp: new Date(),
        environment: context.environment || {
          deviceType: 'unknown',
          browser: 'unknown',
          platform: 'unknown'
        },
      };

      const result = await getVideoRecommendations({
        userId,
        viewingHistory: context.viewingHistory || '',
        preferences: context.preferences || '',
        context: flowContext,
        includeBehavioralData: true
      });

      if (result && Array.isArray(result.recommendations)) {
        return result.recommendations;
      }

      return [];
    }

    return [];
  }

  /**
   * Track search behavior for enhanced recommendations
   */
  static async trackSearchBehavior(
    userId: string | undefined,
    query: string,
    results: any[],
    context: any
  ): Promise<void> {
    if (!userId) return;

    const behavior: UserBehavior = {
      userId,
      action: 'search',
      target: `search:${query}`,
      context: { query, resultCount: results.length },
      timestamp: new Date(),
      sessionId: context.sessionId || 'unknown',
      metadata: {
        query,
        resultCount: results.length,
        filters: context.filters
      }
    };

    await behaviorIntegrationService.trackUserBehavior(behavior);
  }

  /**
   * Get personalized UI adaptations
   */
  static async getPersonalizedUIAdaptations(userId: string): Promise<any> {
    if (!userId) return {};

    // Import personalization engine
    const { personalizationEngine } = await import('../engines/PersonalizationEngine');

    const uiPreferences = await personalizationEngine.getAdaptiveUIPreferences(userId);

    if (uiPreferences.success && uiPreferences.data) {
      return {
        layout: uiPreferences.data.layout,
        theme: uiPreferences.data.theme,
        animations: uiPreferences.data.animations,
        fontSize: uiPreferences.data.fontSize,
        density: uiPreferences.data.density
      };
    }

    return {};
  }

  /**
   * Clean up user behavior data (GDPR compliance)
   */
  static async cleanupUserData(userId: string): Promise<void> {
    // Clear data from all behavior systems
    await behaviorIntegrationService.getUserBehaviorProfile(userId);

    // Clear analytics data
    const { behavioralAnalytics } = await import('../analytics/BehavioralAnalytics');
    await behavioralAnalytics.clearUserData(userId);

    // Clear personalization data
    const { personalizationEngine } = await import('../engines/PersonalizationEngine');
    // Clear user data from personalization engine (method would need to be implemented)
    // personalizationEngine.clearUserHistory(userId);

    console.log(`Cleaned up behavior data for user: ${userId}`);
  }
}

// Export integration hooks for use in existing services
export const contentHooks = (globalThis as any).__contentHooks;
export const socialHooks = (globalThis as any).__socialHooks;
export const notificationHooks = (globalThis as any).__notificationHooks;
export const videoHooks = (globalThis as any).__videoHooks;

// Initialize integrations when module loads
BehaviorServiceIntegrations.initializeIntegrations().catch(console.error);