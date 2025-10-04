/**
 * @fileOverview Contextual Help System for smart tooltips, guidance, and onboarding
 *
 * The ContextualHelpSystem provides intelligent contextual help, tooltips,
 * guidance, and onboarding experiences based on user behavior and context.
 */

import {
  ContextualHelp,
  HelpTrigger,
  HelpContent,
  HelpCondition,
  UserBehavior,
  SmartInteractionContext,
  BehaviorAPIResponse,
  BehaviorError,
  InteractionPattern
} from '../types';

export interface HelpSystemConfig {
  enableSmartTooltips: boolean;
  enableGuidedTours: boolean;
  enableContextualGuidance: boolean;
  enableOnboarding: boolean;
  maxTooltipsPerPage: number;
  tooltipDisplayDelay: number;
  tourAutoStart: boolean;
  helpCacheDuration: number;
}

export interface HelpRequest {
  userId?: string;
  context: SmartInteractionContext;
  triggerElement?: string;
  helpType?: 'tooltip' | 'tour' | 'guidance' | 'onboarding';
  priority?: number;
}

export interface HelpSession {
  sessionId: string;
  userId?: string;
  helpItems: ContextualHelp[];
  currentStep: number;
  isActive: boolean;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export class ContextualHelpSystem {
  private config: HelpSystemConfig;
  private helpRegistry: Map<string, ContextualHelp> = new Map();
  private activeSessions: Map<string, HelpSession> = new Map();
  private helpCache: Map<string, ContextualHelp[]> = new Map();
  private userProgress: Map<string, Set<string>> = new Map(); // Track completed help items

  constructor(config: Partial<HelpSystemConfig> = {}) {
    this.config = {
      enableSmartTooltips: true,
      enableGuidedTours: true,
      enableContextualGuidance: true,
      enableOnboarding: true,
      maxTooltipsPerPage: 5,
      tooltipDisplayDelay: 1000,
      tourAutoStart: false,
      helpCacheDuration: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Register a contextual help item
   */
  registerHelp(help: ContextualHelp): void {
    this.helpRegistry.set(help.helpId, help);
  }

  /**
   * Unregister a contextual help item
   */
  unregisterHelp(helpId: string): void {
    this.helpRegistry.delete(helpId);
  }

  /**
   * Get contextual help for a specific context
   */
  async getContextualHelp(request: HelpRequest): Promise<BehaviorAPIResponse<ContextualHelp[]>> {
    try {
      const cacheKey = this.generateCacheKey(request);

      // Check cache first
      const cached = this.helpCache.get(cacheKey);
      if (cached && this.isCacheValid(cached[0]?.metadata?.timestamp)) {
        return {
          success: true,
          data: cached,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId(),
            cached: true
          }
        };
      }

      // Find relevant help items
      const relevantHelp = await this.findRelevantHelp(request);

      // Filter based on conditions and user progress
      const filteredHelp = await this.filterHelpByConditions(relevantHelp, request);

      // Sort by priority and limit
      const sortedHelp = filteredHelp
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.maxTooltipsPerPage);

      // Cache the results
      this.helpCache.set(cacheKey, sortedHelp);

      return {
        success: true,
        data: sortedHelp,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId(),
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'getContextualHelp' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Start a guided tour or onboarding session
   */
  async startHelpSession(
    userId: string,
    helpType: 'tour' | 'onboarding',
    context: SmartInteractionContext
  ): Promise<BehaviorAPIResponse<HelpSession>> {
    try {
      const sessionId = this.generateSessionId();
      const helpItems = await this.getHelpItemsForSession(helpType, userId, context);

      if (helpItems.length === 0) {
        return {
          success: false,
          error: this.createBehaviorError(new Error('No help items available for session'), { helpType }),
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      const session: HelpSession = {
        sessionId,
        userId,
        helpItems,
        currentStep: 0,
        isActive: true,
        startedAt: new Date(),
        metadata: {
          helpType,
          context: context.currentPage
        }
      };

      this.activeSessions.set(sessionId, session);

      return {
        success: true,
        data: session,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId, helpType, context: 'startHelpSession' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Progress through a help session
   */
  async progressHelpSession(
    sessionId: string,
    action: 'next' | 'previous' | 'complete' | 'skip'
  ): Promise<BehaviorAPIResponse<HelpSession>> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: this.createBehaviorError(new Error('Session not found'), { sessionId }),
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      switch (action) {
        case 'next':
          session.currentStep = Math.min(session.currentStep + 1, session.helpItems.length - 1);
          break;
        case 'previous':
          session.currentStep = Math.max(session.currentStep - 1, 0);
          break;
        case 'complete':
          session.isActive = false;
          session.completedAt = new Date();
          // Mark help items as completed for user
          if (session.userId) {
            this.markHelpCompleted(session.userId, session.helpItems);
          }
          break;
        case 'skip':
          session.isActive = false;
          session.completedAt = new Date();
          break;
      }

      this.activeSessions.set(sessionId, session);

      return {
        success: true,
        data: session,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { sessionId, action, context: 'progressHelpSession' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Check if user should see onboarding
   */
  async shouldShowOnboarding(userId: string, context: SmartInteractionContext): Promise<boolean> {
    if (!this.config.enableOnboarding) return false;

    // Check if user has completed onboarding
    const completedHelp = this.userProgress.get(userId) || new Set();
    const onboardingItems = Array.from(this.helpRegistry.values()).filter(
      help => help.content.type === 'tour' && help.metadata?.isOnboarding
    );

    return onboardingItems.some(item => !completedHelp.has(item.helpId));
  }

  /**
   * Get smart tooltip for an element
   */
  async getSmartTooltip(
    elementId: string,
    context: SmartInteractionContext
  ): Promise<BehaviorAPIResponse<HelpContent | null>> {
    try {
      const helpItems = Array.from(this.helpRegistry.values()).filter(
        help => help.content.type === 'tooltip' &&
                (help.trigger.element === elementId || help.trigger.element === '*')
      );

      if (helpItems.length === 0) {
        return {
          success: true,
          data: null,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      // Check if conditions are met
      const validHelp = await this.filterHelpByConditions(helpItems, {
        context,
        triggerElement: elementId
      });

      if (validHelp.length === 0) {
        return {
          success: true,
          data: null,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      // Return highest priority tooltip
      const tooltip = validHelp.sort((a, b) => b.priority - a.priority)[0];

      return {
        success: true,
        data: tooltip.content,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { elementId, context: 'getSmartTooltip' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Track help interaction for analytics
   */
  async trackHelpInteraction(
    userId: string,
    helpId: string,
    interaction: 'viewed' | 'clicked' | 'dismissed' | 'completed'
  ): Promise<void> {
    // In a real implementation, this would track to analytics service
    console.log(`Help interaction tracked: ${userId} - ${helpId} - ${interaction}`);
  }

  /**
   * Get help system statistics
   */
  getHelpStatistics(): {
    totalHelpItems: number;
    activeSessions: number;
    completionRate: number;
    mostViewedHelp: string[];
  } {
    const totalHelpItems = this.helpRegistry.size;
    const activeSessions = this.activeSessions.size;

    // Calculate completion rate based on user progress
    const totalUsers = this.userProgress.size;
    const completedUsers = Array.from(this.userProgress.values()).filter(
      completed => completed.size > 0
    ).length;
    const completionRate = totalUsers > 0 ? completedUsers / totalUsers : 0;

    // Find most viewed help items (simplified)
    const mostViewedHelp: string[] = [];

    return {
      totalHelpItems,
      activeSessions,
      completionRate,
      mostViewedHelp
    };
  }

  // Private helper methods

  private async findRelevantHelp(request: HelpRequest): Promise<ContextualHelp[]> {
    const relevant: ContextualHelp[] = [];

    for (const help of this.helpRegistry.values()) {
      // Check if trigger matches
      if (this.matchesTrigger(help.trigger, request)) {
        relevant.push(help);
      }
    }

    return relevant;
  }

  private matchesTrigger(trigger: HelpTrigger, request: HelpRequest): boolean {
    // Check event match
    if (trigger.event !== request.context.currentPage && trigger.event !== '*') {
      return false;
    }

    // Check element match
    if (trigger.element && request.triggerElement &&
        trigger.element !== request.triggerElement && trigger.element !== '*') {
      return false;
    }

    // Check context conditions
    if (trigger.context) {
      for (const [key, value] of Object.entries(trigger.context)) {
        const contextValue = (request.context as any)[key];
        if (contextValue !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private async filterHelpByConditions(
    helpItems: ContextualHelp[],
    request: HelpRequest
  ): Promise<ContextualHelp[]> {
    const filtered: ContextualHelp[] = [];

    for (const help of helpItems) {
      const conditionsMet = await this.evaluateHelpConditions(help.conditions, request);

      if (conditionsMet) {
        // Check if user has already completed this help
        if (request.context.userId) {
          const completedHelp = this.userProgress.get(request.context.userId) || new Set();
          if (!completedHelp.has(help.helpId)) {
            filtered.push(help);
          }
        } else {
          filtered.push(help);
        }
      }
    }

    return filtered;
  }

  private async evaluateHelpConditions(
    conditions: HelpCondition[],
    request: HelpRequest
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const { field, operator, value } = condition;
      let fieldValue: any;

      // Extract field value from request
      if (field.startsWith('context.')) {
        fieldValue = (request.context as any)[field.substring(8)];
      } else if (field.startsWith('user.')) {
        // Would need user data service in real implementation
        fieldValue = null;
      } else if (field === 'element') {
        fieldValue = request.triggerElement;
      }

      return this.evaluateCondition(fieldValue, operator, value);
    });
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      default:
        return false;
    }
  }

  private async getHelpItemsForSession(
    helpType: 'tour' | 'onboarding',
    userId: string,
    context: SmartInteractionContext
  ): Promise<ContextualHelp[]> {
    const helpItems: ContextualHelp[] = [];

    for (const help of this.helpRegistry.values()) {
      // Filter by help type and context
      if (help.content.type === helpType || (helpType === 'onboarding' && help.metadata?.isOnboarding)) {
        if (help.trigger.event === context.currentPage || help.trigger.event === '*') {
          // Check if user hasn't completed this help
          const completedHelp = this.userProgress.get(userId) || new Set();
          if (!completedHelp.has(help.helpId)) {
            helpItems.push(help);
          }
        }
      }
    }

    return helpItems.sort((a, b) => a.priority - b.priority);
  }

  private markHelpCompleted(userId: string, helpItems: ContextualHelp[]): void {
    let completed = this.userProgress.get(userId) || new Set();
    helpItems.forEach(item => completed.add(item.helpId));
    this.userProgress.set(userId, completed);
  }

  private generateCacheKey(request: HelpRequest): string {
    return `${request.context.userId || 'anonymous'}_${request.context.currentPage}_${request.triggerElement || 'none'}_${request.helpType || 'all'}`;
  }

  private isCacheValid(timestamp?: Date): boolean {
    if (!timestamp) return false;
    const cacheAge = Date.now() - timestamp.getTime();
    return cacheAge < this.config.helpCacheDuration;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createBehaviorError(error: any, context?: Record<string, any>): BehaviorError {
    return {
      name: error.name || 'HelpSystemError',
      message: error.message || 'Unknown help system error',
      code: error.code || 'HELP_SYSTEM_ERROR',
      context,
      timestamp: new Date(),
      retryable: error.retryable !== false,
      stack: error.stack
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default help items for common scenarios
   */
  initializeDefaultHelp(): void {
    // Upload help
    this.registerHelp({
      helpId: 'upload_help',
      trigger: {
        event: 'upload',
        element: 'upload-button',
        delay: 500
      },
      content: {
        title: 'Upload Content',
        message: 'Click here to upload your videos, images, or other content to share with the community.',
        type: 'tooltip',
        actions: [{
          label: 'Start Upload',
          action: 'click',
          type: 'primary'
        }]
      },
      conditions: [],
      priority: 8,
      isActive: true
    });

    // Navigation help
    this.registerHelp({
      helpId: 'navigation_help',
      trigger: {
        event: '*',
        element: 'nav-menu',
        frequency: 'once'
      },
      content: {
        title: 'Navigation Menu',
        message: 'Use this menu to navigate between different sections of the platform.',
        type: 'tooltip',
        actions: [{
          label: 'Explore',
          action: 'click',
          type: 'primary'
        }]
      },
      conditions: [],
      priority: 5,
      isActive: true
    });

    // Search help
    this.registerHelp({
      helpId: 'search_help',
      trigger: {
        event: '*',
        element: 'search-input'
      },
      content: {
        title: 'Search Content',
        message: 'Search for videos, users, or topics that interest you.',
        type: 'tooltip'
      },
      conditions: [],
      priority: 6,
      isActive: true
    });

    // Social features help
    this.registerHelp({
      helpId: 'social_help',
      trigger: {
        event: 'social',
        element: '*',
        frequency: 'once'
      },
      content: {
        title: 'Social Features',
        message: 'Connect with other users, follow creators, and engage with content through likes, comments, and shares.',
        type: 'tooltip'
      },
      conditions: [],
      priority: 7,
      isActive: true
    });

    // Onboarding tour
    this.registerHelp({
      helpId: 'onboarding_tour',
      trigger: {
        event: 'home',
        element: '*',
        frequency: 'once'
      },
      content: {
        title: 'Welcome to PlayNite!',
        message: 'Let us show you around the platform to help you get started.',
        type: 'tour',
        actions: [{
          label: 'Start Tour',
          action: 'start_tour',
          type: 'primary'
        }, {
          label: 'Skip',
          action: 'skip',
          type: 'secondary'
        }]
      },
      conditions: [],
      priority: 10,
      isActive: true,
      metadata: {
        isOnboarding: true,
        tourSteps: [
          { element: 'nav-menu', title: 'Navigation', message: 'Use this menu to explore different sections' },
          { element: 'search-input', title: 'Search', message: 'Find content and users with our powerful search' },
          { element: 'upload-button', title: 'Upload', message: 'Share your content with the community' },
          { element: 'social-feed', title: 'Social Feed', message: 'Discover trending content and connect with others' }
        ]
      }
    });
  }
}

// Export singleton instance
export const contextualHelpSystem = new ContextualHelpSystem();

// Initialize default help items
contextualHelpSystem.initializeDefaultHelp();