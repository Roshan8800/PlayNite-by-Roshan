/**
 * @fileOverview Behavior Integration Service for connecting behavior systems with existing services
 *
 * The BehaviorIntegrationService provides a unified interface for integrating
 * all behavior systems with existing PlayNite services including social,
 * content, notification, and other core services.
 */

import {
  UserBehavior,
  SmartInteractionContext,
  BehaviorAPIResponse,
  BehaviorError,
  PersonalizationProfile,
  InteractionPattern,
  BehavioralInsight,
  ContextualHelp
} from './types';

import { SocialSuggestion } from './systems/AutomatedContentCuration';
import { ContentItem } from './systems/AutomatedContentCuration';

import { smartInteractionEngine, SmartInteractionConfig } from './engines/SmartInteractionEngine';
import { personalizationEngine, PersonalizationConfig, PersonalizationUpdate } from './engines/PersonalizationEngine';
import { behavioralAnalytics, AnalyticsConfig, AnalyticsQuery } from './analytics/BehavioralAnalytics';
import { contextualHelpSystem, HelpSystemConfig, HelpRequest } from './systems/ContextualHelpSystem';
import { automatedContentCuration, CurationConfig } from './systems/AutomatedContentCuration';

export interface BehaviorIntegrationConfig {
  smartInteraction: Partial<SmartInteractionConfig>;
  personalization: Partial<PersonalizationConfig>;
  analytics: Partial<AnalyticsConfig>;
  helpSystem: Partial<HelpSystemConfig>;
  contentCuration: Partial<CurationConfig>;
  enableServiceIntegration: boolean;
  enableEventPublishing: boolean;
  enableDataSync: boolean;
}

export interface IntegratedBehaviorRequest {
  userId?: string;
  context: SmartInteractionContext;
  includePersonalization?: boolean;
  includeAnalytics?: boolean;
  includeHelp?: boolean;
  includeCuration?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export interface IntegratedBehaviorResponse {
  interactions: any[];
  personalization: PersonalizationProfile | null;
  analytics: any;
  help: ContextualHelp[];
  curation: {
    content: ContentItem[];
    suggestions: SocialSuggestion[];
  };
  insights: BehavioralInsight[];
  metadata: {
    timestamp: Date;
    version: string;
    requestId: string;
    processingTime: number;
  };
}

export class BehaviorIntegrationService {
  private config: BehaviorIntegrationConfig;
  private isInitialized = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<BehaviorIntegrationConfig> = {}) {
    this.config = {
      smartInteraction: {},
      personalization: {},
      analytics: {},
      helpSystem: {},
      contentCuration: {},
      enableServiceIntegration: true,
      enableEventPublishing: true,
      enableDataSync: true,
      ...config
    };
  }

  /**
   * Initialize the behavior integration service
   */
  async initialize(): Promise<BehaviorAPIResponse<void>> {
    try {
      // Initialize all behavior engines with configuration
      smartInteractionEngine['config'] = {
        ...smartInteractionEngine['config'],
        ...this.config.smartInteraction
      };

      personalizationEngine['config'] = {
        ...personalizationEngine['config'],
        ...this.config.personalization
      };

      behavioralAnalytics['config'] = {
        ...behavioralAnalytics['config'],
        ...this.config.analytics
      };

      contextualHelpSystem['config'] = {
        ...contextualHelpSystem['config'],
        ...this.config.helpSystem
      };

      automatedContentCuration['config'] = {
        ...automatedContentCuration['config'],
        ...this.config.contentCuration
      };

      this.isInitialized = true;

      // Set up service integrations if enabled
      if (this.config.enableServiceIntegration) {
        await this.setupServiceIntegrations();
      }

      // Set up event publishing if enabled
      if (this.config.enableEventPublishing) {
        this.setupEventPublishing();
      }

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'initialize' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Process integrated behavior request
   */
  async processIntegratedRequest(
    request: IntegratedBehaviorRequest
  ): Promise<BehaviorAPIResponse<IntegratedBehaviorResponse>> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const { userId, context } = request;
      const response: IntegratedBehaviorResponse = {
        interactions: [],
        personalization: null,
        analytics: null,
        help: [],
        curation: {
          content: [],
          suggestions: []
        },
        insights: [],
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId(),
          processingTime: 0
        }
      };

      // Process smart interactions
      if (userId) {
        const behavior: UserBehavior = {
          userId,
          action: 'page_view',
          target: context.currentPage,
          context: {},
          timestamp: new Date(),
          sessionId: context.sessionId,
          metadata: {
            userAgent: context.userAgent,
            deviceType: context.environment.deviceType
          }
        };

        const interactionResult = await smartInteractionEngine.processInteraction(behavior, context);
        if (interactionResult.success) {
          response.interactions = interactionResult.data || [];
        }
      }

      // Get personalization data
      if (request.includePersonalization && userId) {
        const profileResult = await personalizationEngine.getUserProfile(userId);
        if (profileResult.success) {
          response.personalization = profileResult.data || null;
        }
      }

      // Get analytics data
      if (request.includeAnalytics && userId) {
        const query: AnalyticsQuery = {
          userId,
          timeframe: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date()
          }
        };

        const analyticsResult = await behavioralAnalytics.getBehaviorMetrics(query);
        if (analyticsResult.success) {
          response.analytics = analyticsResult.data;
        }

        const insightsResult = await behavioralAnalytics.getBehavioralInsights(query);
        if (insightsResult.success) {
          response.insights = insightsResult.data || [];
        }
      }

      // Get contextual help
      if (request.includeHelp) {
        const helpRequest: HelpRequest = {
          userId,
          context,
          helpType: 'tooltip'
        };

        const helpResult = await contextualHelpSystem.getContextualHelp(helpRequest);
        if (helpResult.success) {
          response.help = helpResult.data || [];
        }
      }

      // Get curated content and suggestions
      if (request.includeCuration && userId) {
        const contentResult = await automatedContentCuration.getCuratedContent(userId, context, 10);
        if (contentResult.success) {
          response.curation.content = contentResult.data || [];
        }

        const suggestionsResult = await automatedContentCuration.getSocialSuggestions(userId, context, 5);
        if (suggestionsResult.success) {
          response.curation.suggestions = suggestionsResult.data || [];
        }
      }

      // Update metadata
      response.metadata.processingTime = Date.now() - startTime;

      // Publish integration event
      if (this.config.enableEventPublishing) {
        this.publishEvent('behavior.integration.completed', {
          userId,
          request,
          response: {
            hasInteractions: response.interactions.length > 0,
            hasPersonalization: !!response.personalization,
            hasAnalytics: !!response.analytics,
            hasHelp: response.help.length > 0,
            hasCuration: response.curation.content.length > 0 || response.curation.suggestions.length > 0
          }
        });
      }

      return {
        success: true,
        data: response,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'processIntegratedRequest' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Track user behavior across all systems
   */
  async trackUserBehavior(behavior: UserBehavior): Promise<void> {
    try {
      // Track in analytics
      await behavioralAnalytics.trackBehavior(behavior);

      // Update personalization if user ID is available
      if (behavior.userId) {
        const update: PersonalizationUpdate = {
          userId: behavior.userId,
          behaviorData: [behavior]
        };

        await personalizationEngine.updateUserProfile(update);
      }

      // Process smart interactions
      const context: SmartInteractionContext = {
        userId: behavior.userId,
        sessionId: behavior.sessionId,
        currentPage: behavior.target.startsWith('page:') ? behavior.target.substring(5) : 'unknown',
        userAgent: behavior.metadata?.userAgent || '',
        timestamp: behavior.timestamp,
        interactions: [behavior],
        environment: {
          screenSize: 'unknown',
          deviceType: behavior.metadata?.deviceType || 'unknown',
          browser: 'unknown',
          platform: 'unknown'
        }
      };

      await smartInteractionEngine.processInteraction(behavior, context);

      // Publish behavior tracking event
      if (this.config.enableEventPublishing) {
        this.publishEvent('behavior.tracked', { behavior, context });
      }
    } catch (error) {
      console.error('Error tracking user behavior:', error);
    }
  }

  /**
   * Get comprehensive user behavior profile
   */
  async getUserBehaviorProfile(userId: string): Promise<BehaviorAPIResponse<{
    profile: PersonalizationProfile | null;
    metrics: any;
    insights: BehavioralInsight[];
    patterns: InteractionPattern[];
  }>> {
    try {
      // Get personalization profile
      const profileResult = await personalizationEngine.getUserProfile(userId);

      // Get behavior metrics
      const query: AnalyticsQuery = {
        userId,
        timeframe: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      };

      const metricsResult = await behavioralAnalytics.getBehaviorMetrics(query);
      const insightsResult = await behavioralAnalytics.getBehavioralInsights(query);

      // Get interaction patterns from smart interaction engine
      const interactionStats = smartInteractionEngine.getInteractionStats(userId);

      return {
        success: true,
        data: {
          profile: profileResult.success ? profileResult.data || null : null,
          metrics: metricsResult.success ? metricsResult.data : null,
          insights: insightsResult.success ? insightsResult.data || [] : [],
          patterns: [] // Would be populated from interaction engine in real implementation
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId, context: 'getUserBehaviorProfile' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Sync behavior data across systems
   */
  async syncBehaviorData(): Promise<BehaviorAPIResponse<void>> {
    try {
      if (!this.config.enableDataSync) {
        return {
          success: true,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      // Process buffered updates in personalization engine
      await personalizationEngine.processBufferedUpdates();

      // Process automated curation
      await automatedContentCuration.processAutomatedCuration();

      // Flush analytics buffer
      await behavioralAnalytics['flushBuffer']?.();

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'syncBehaviorData' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Subscribe to behavior events
   */
  subscribe(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from behavior events
   */
  unsubscribe(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get integration service status
   */
  getStatus(): {
    isInitialized: boolean;
    services: Record<string, boolean>;
    configuration: BehaviorIntegrationConfig;
    statistics: Record<string, any>;
  } {
    return {
      isInitialized: this.isInitialized,
      services: {
        smartInteraction: !!smartInteractionEngine,
        personalization: !!personalizationEngine,
        analytics: !!behavioralAnalytics,
        helpSystem: !!contextualHelpSystem,
        contentCuration: !!automatedContentCuration
      },
      configuration: this.config,
      statistics: {
        interactionStats: smartInteractionEngine.getInteractionStats(),
        personalizationInsights: personalizationEngine.getPersonalizationInsights(),
        helpStatistics: contextualHelpSystem.getHelpStatistics(),
        curationStatistics: automatedContentCuration.getCurationStatistics()
      }
    };
  }

  // Private helper methods

  private async setupServiceIntegrations(): Promise<void> {
    // Integration with existing services would go here
    // For example:
    // - Hook into content service for behavior tracking
    // - Integrate with notification service for personalized notifications
    // - Connect with social service for enhanced social features

    console.log('Service integrations setup completed');
  }

  private setupEventPublishing(): void {
    // Set up event publishing for external services
    // This would integrate with event bus or message queue

    console.log('Event publishing setup completed');
  }

  private publishEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private createBehaviorError(error: any, context?: Record<string, any>): BehaviorError {
    return {
      name: error.name || 'IntegrationError',
      message: error.message || 'Unknown integration error',
      code: error.code || 'INTEGRATION_ERROR',
      context,
      timestamp: new Date(),
      retryable: error.retryable !== false,
      stack: error.stack
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const behaviorIntegrationService = new BehaviorIntegrationService();

// Auto-initialize on import
behaviorIntegrationService.initialize().catch(console.error);