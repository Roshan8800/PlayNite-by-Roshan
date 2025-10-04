/**
 * @fileOverview Personalization Engine for adaptive user experiences
 * 
 * The PersonalizationEngine creates adaptive experiences based on user preferences,
 * behavior patterns, and contextual data to provide personalized content and UI.
 */

import { 
  PersonalizationProfile,
  UserPreferences,
  ContentPreferences,
  UIPreferences,
  UserBehavior,
  InteractionPattern,
  BehaviorAPIResponse,
  BehaviorError,
  RecommendationContext,
  AdaptiveUIState,
  SmartInteractionContext
} from '../types';

export interface PersonalizationConfig {
  enableContentPersonalization: boolean;
  enableUIPersonalization: boolean;
  enableBehavioralLearning: boolean;
  enableContextualAdaptation: boolean;
  learningRate: number;
  minConfidenceThreshold: number;
  maxProfilesPerUser: number;
  profileUpdateInterval: number;
}

export interface PersonalizationUpdate {
  userId: string;
  preferences?: Partial<UserPreferences>;
  contentPreferences?: Partial<ContentPreferences>;
  uiPreferences?: Partial<UIPreferences>;
  behaviorData?: UserBehavior[];
  context?: SmartInteractionContext;
}

export class PersonalizationEngine {
  private config: PersonalizationConfig;
  private userProfiles: Map<string, PersonalizationProfile> = new Map();
  private behaviorBuffer: Map<string, UserBehavior[]> = new Map();
  private lastProfileUpdate: Map<string, Date> = new Map();

  constructor(config: Partial<PersonalizationConfig> = {}) {
    this.config = {
      enableContentPersonalization: true,
      enableUIPersonalization: true,
      enableBehavioralLearning: true,
      enableContextualAdaptation: true,
      learningRate: 0.1,
      minConfidenceThreshold: 0.6,
      maxProfilesPerUser: 1,
      profileUpdateInterval: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Get or create personalization profile for a user
   */
  async getUserProfile(userId: string): Promise<BehaviorAPIResponse<PersonalizationProfile>> {
    try {
      let profile = this.userProfiles.get(userId);
      
      if (!profile) {
        profile = await this.createDefaultProfile(userId);
        this.userProfiles.set(userId, profile);
      }

      return {
        success: true,
        data: profile,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId, context: 'getUserProfile' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Update user personalization profile with new data
   */
  async updateUserProfile(update: PersonalizationUpdate): Promise<BehaviorAPIResponse<PersonalizationProfile>> {
    try {
      const { userId } = update;
      let profile = this.userProfiles.get(userId);
      
      if (!profile) {
        profile = await this.createDefaultProfile(userId);
      }

      // Check if enough time has passed since last update
      const lastUpdate = this.lastProfileUpdate.get(userId);
      const now = new Date();
      
      if (lastUpdate && (now.getTime() - lastUpdate.getTime()) < this.config.profileUpdateInterval) {
        // Buffer the update for later processing
        this.bufferBehaviorData(update);
        return {
          success: true,
          data: profile,
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      // Apply updates to profile
      const updatedProfile = await this.applyProfileUpdates(profile, update);
      
      // Learn from behavior data if enabled
      if (this.config.enableBehavioralLearning && update.behaviorData) {
        await this.learnFromBehavior(updatedProfile, update.behaviorData);
      }

      this.userProfiles.set(userId, updatedProfile);
      this.lastProfileUpdate.set(userId, now);

      return {
        success: true,
        data: updatedProfile,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId: update.userId, context: 'updateUserProfile' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get personalized content recommendations based on user profile
   */
  async getPersonalizedContent(context: RecommendationContext): Promise<BehaviorAPIResponse<string[]>> {
    try {
      const profile = await this.getUserProfile(context.userId);
      if (!profile.success || !profile.data) {
        return {
          success: false,
          error: this.createBehaviorError(new Error('Profile not found'), { userId: context.userId }),
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      const recommendations = await this.generatePersonalizedRecommendations(
        profile.data,
        context
      );

      return {
        success: true,
        data: recommendations,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId: context.userId, context: 'getPersonalizedContent' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get adaptive UI preferences for a user
   */
  async getAdaptiveUIPreferences(userId: string): Promise<BehaviorAPIResponse<UIPreferences>> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile.success || !profile.data) {
        return {
          success: false,
          error: this.createBehaviorError(new Error('Profile not found'), { userId }),
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      const adaptivePreferences = await this.generateAdaptiveUIPreferences(
        profile.data,
        userId
      );

      return {
        success: true,
        data: adaptivePreferences,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId, context: 'getAdaptiveUIPreferences' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Process buffered behavior data and update profiles
   */
  async processBufferedUpdates(): Promise<void> {
    for (const [userId, behaviors] of this.behaviorBuffer.entries()) {
      if (behaviors.length > 0) {
        const update: PersonalizationUpdate = {
          userId,
          behaviorData: behaviors,
        };

        await this.updateUserProfile(update);
        this.behaviorBuffer.delete(userId);
      }
    }
  }

  /**
   * Get personalization insights for analytics
   */
  getPersonalizationInsights(): {
    totalProfiles: number;
    averageConfidence: number;
    mostCommonPreferences: Record<string, any>;
    adaptationTrends: Record<string, number>;
  } {
    const profiles = Array.from(this.userProfiles.values());
    const totalProfiles = profiles.length;

    const averageConfidence = profiles.length > 0 
      ? profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length 
      : 0;

    const mostCommonPreferences = this.calculateCommonPreferences(profiles);
    const adaptationTrends = this.calculateAdaptationTrends(profiles);

    return {
      totalProfiles,
      averageConfidence,
      mostCommonPreferences,
      adaptationTrends
    };
  }

  // Private helper methods

  private async createDefaultProfile(userId: string): Promise<PersonalizationProfile> {
    return {
      userId,
      preferences: {
        themes: [],
        contentTypes: [],
        interactionStyles: ['default'],
        notificationSettings: {
          push: true,
          email: false,
          sms: false,
          frequency: 'daily',
          categories: []
        },
        accessibility: {
          highContrast: false,
          reducedMotion: false,
          screenReader: false,
          fontSize: 'medium',
          colorBlind: false
        }
      },
      behaviorPatterns: [],
      contentPreferences: {
        categories: [],
        tags: [],
        creators: [],
        excludedCategories: [],
        excludedTags: [],
        qualityPreferences: ['hd']
      },
      uiPreferences: {
        layout: 'grid',
        theme: 'auto',
        animations: true,
        autoPlay: false,
        sidebarCollapsed: false,
        fontSize: 'medium',
        density: 'comfortable'
      },
      lastUpdated: new Date(),
      confidence: 0.5
    };
  }

  private async applyProfileUpdates(
    profile: PersonalizationProfile,
    update: PersonalizationUpdate
  ): Promise<PersonalizationProfile> {
    const updated = { ...profile };

    if (update.preferences) {
      updated.preferences = { ...updated.preferences, ...update.preferences };
    }

    if (update.contentPreferences) {
      updated.contentPreferences = { 
        ...updated.contentPreferences, 
        ...update.contentPreferences 
      };
    }

    if (update.uiPreferences) {
      updated.uiPreferences = { ...updated.uiPreferences, ...update.uiPreferences };
    }

    updated.lastUpdated = new Date();
    
    // Recalculate confidence based on update quality
    updated.confidence = Math.min(updated.confidence + 0.1, 1.0);

    return updated;
  }

  private async learnFromBehavior(
    profile: PersonalizationProfile,
    behaviors: UserBehavior[]
  ): Promise<void> {
    // Analyze behavior patterns and update preferences
    const patterns = this.analyzeBehaviorPatterns(behaviors);

    // Update content preferences based on behavior
    if (this.config.enableContentPersonalization) {
      profile.contentPreferences = await this.updateContentPreferencesFromBehavior(
        profile.contentPreferences,
        behaviors,
        patterns
      );
    }

    // Update UI preferences based on behavior
    if (this.config.enableUIPersonalization) {
      profile.uiPreferences = await this.updateUIPreferencesFromBehavior(
        profile.uiPreferences,
        behaviors,
        patterns
      );
    }

    // Update behavior patterns
    profile.behaviorPatterns = patterns;
  }

  private analyzeBehaviorPatterns(behaviors: UserBehavior[]): InteractionPattern[] {
    const patterns: InteractionPattern[] = [];
    const behaviorGroups = new Map<string, UserBehavior[]>();

    // Group behaviors by action type
    behaviors.forEach(behavior => {
      const action = behavior.action;
      if (!behaviorGroups.has(action)) {
        behaviorGroups.set(action, []);
      }
      behaviorGroups.get(action)!.push(behavior);
    });

    // Create patterns for frequent actions
    for (const [action, actionBehaviors] of behaviorGroups.entries()) {
      if (actionBehaviors.length >= 3) {
        const pattern: InteractionPattern = {
          patternId: `pattern_${action}_${Date.now()}`,
          userId: behaviors[0].userId,
          patternType: this.categorizeActionType(action),
          frequency: actionBehaviors.length / behaviors.length,
          confidence: Math.min(actionBehaviors.length / 10, 1),
          context: actionBehaviors[0].context,
          lastSeen: actionBehaviors[actionBehaviors.length - 1].timestamp,
          trends: []
        };
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private categorizeActionType(action: string): 'navigation' | 'engagement' | 'preference' | 'social' {
    if (['click', 'scroll', 'navigate', 'search'].includes(action)) {
      return 'navigation';
    }
    if (['like', 'comment', 'share', 'follow'].includes(action)) {
      return 'social';
    }
    if (['view', 'watch', 'read'].includes(action)) {
      return 'engagement';
    }
    return 'preference';
  }

  private async updateContentPreferencesFromBehavior(
    preferences: ContentPreferences,
    behaviors: UserBehavior[],
    patterns: InteractionPattern[]
  ): Promise<ContentPreferences> {
    const updated = { ...preferences };

    // Analyze content interactions
    const contentInteractions = behaviors.filter(b => 
      b.target.startsWith('content:') || b.target.startsWith('video:')
    );

    if (contentInteractions.length > 0) {
      // Extract categories and tags from interactions
      const categories = new Set<string>();
      const tags = new Set<string>();

      contentInteractions.forEach(interaction => {
        if (interaction.metadata?.category) {
          categories.add(interaction.metadata.category);
        }
        if (interaction.metadata?.tags) {
          interaction.metadata.tags.forEach((tag: string) => tags.add(tag));
        }
      });

      // Update preferences if confidence is high enough
      if (categories.size > 0 && patterns.some(p => p.confidence > this.config.minConfidenceThreshold)) {
        updated.categories = Array.from(categories);
      }

      if (tags.size > 0 && patterns.some(p => p.confidence > this.config.minConfidenceThreshold)) {
        updated.tags = Array.from(tags);
      }
    }

    return updated;
  }

  private async updateUIPreferencesFromBehavior(
    preferences: UIPreferences,
    behaviors: UserBehavior[],
    patterns: InteractionPattern[]
  ): Promise<UIPreferences> {
    const updated = { ...preferences };

    // Analyze UI interaction patterns
    const uiInteractions = behaviors.filter(b => 
      b.target.startsWith('ui:') || b.target.startsWith('layout:')
    );

    if (uiInteractions.length > 0) {
      // Look for layout preferences
      const layoutInteractions = uiInteractions.filter(b => b.target.includes('layout'));
      if (layoutInteractions.length > 0) {
        const layoutPreference = this.inferLayoutPreference(layoutInteractions);
        if (layoutPreference && patterns.some(p => p.confidence > this.config.minConfidenceThreshold)) {
          updated.layout = layoutPreference;
        }
      }

      // Look for theme preferences
      const themeInteractions = uiInteractions.filter(b => b.target.includes('theme'));
      if (themeInteractions.length > 0) {
        const themePreference = this.inferThemePreference(themeInteractions);
        if (themePreference && patterns.some(p => p.confidence > this.config.minConfidenceThreshold)) {
          updated.theme = themePreference;
        }
      }
    }

    return updated;
  }

  private inferLayoutPreference(interactions: UserBehavior[]): UIPreferences['layout'] | null {
    const layoutCounts = new Map<UIPreferences['layout'], number>();

    interactions.forEach(interaction => {
      if (interaction.metadata?.preferredLayout) {
        const layout = interaction.metadata.preferredLayout as UIPreferences['layout'];
        layoutCounts.set(layout, (layoutCounts.get(layout) || 0) + 1);
      }
    });

    // Return most preferred layout
    let maxCount = 0;
    let preferredLayout: UIPreferences['layout'] | null = null;

    for (const [layout, count] of layoutCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        preferredLayout = layout;
      }
    }

    return preferredLayout;
  }

  private inferThemePreference(interactions: UserBehavior[]): UIPreferences['theme'] | null {
    const themeCounts = new Map<UIPreferences['theme'], number>();

    interactions.forEach(interaction => {
      if (interaction.metadata?.preferredTheme) {
        const theme = interaction.metadata.preferredTheme as UIPreferences['theme'];
        themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
      }
    });

    // Return most preferred theme
    let maxCount = 0;
    let preferredTheme: UIPreferences['theme'] | null = null;

    for (const [theme, count] of themeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        preferredTheme = theme;
      }
    }

    return preferredTheme;
  }

  private async generatePersonalizedRecommendations(
    profile: PersonalizationProfile,
    context: RecommendationContext
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Base recommendations on user preferences
    if (profile.contentPreferences.categories.length > 0) {
      recommendations.push(
        ...profile.contentPreferences.categories.map(cat => `category:${cat}`)
      );
    }

    if (profile.contentPreferences.tags.length > 0) {
      recommendations.push(
        ...profile.contentPreferences.tags.map(tag => `tag:${tag}`)
      );
    }

    // Consider current context
    if (context.currentContent) {
      recommendations.push(`related:${context.currentContent}`);
    }

    // Add trending content if user shows engagement with trending topics
    if (context.trendingTopics && context.trendingTopics.length > 0) {
      const trendingPattern = profile.behaviorPatterns.find(p => 
        p.patternType === 'engagement' && p.confidence > 0.7
      );

      if (trendingPattern) {
        recommendations.push(
          ...context.trendingTopics.map(topic => `trending:${topic}`)
        );
      }
    }

    // Limit and prioritize recommendations
    return recommendations
      .slice(0, 20)
      .sort((a, b) => {
        // Prioritize based on user preferences and context
        const aScore = this.scoreRecommendation(a, profile, context);
        const bScore = this.scoreRecommendation(b, profile, context);
        return bScore - aScore;
      });
  }

  private scoreRecommendation(
    recommendation: string,
    profile: PersonalizationProfile,
    context: RecommendationContext
  ): number {
    let score = 0.5; // Base score

    // Boost score if recommendation matches user preferences
    if (recommendation.startsWith('category:') && 
        profile.contentPreferences.categories.includes(recommendation.substring(9))) {
      score += 0.3;
    }

    if (recommendation.startsWith('tag:') && 
        profile.contentPreferences.tags.includes(recommendation.substring(4))) {
      score += 0.2;
    }

    // Boost score for current context relevance
    if (recommendation.startsWith('related:') && context.currentContent) {
      score += 0.4;
    }

    if (recommendation.startsWith('trending:') && context.trendingTopics?.length > 0) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private async generateAdaptiveUIPreferences(
    profile: PersonalizationProfile,
    userId: string
  ): Promise<UIPreferences> {
    const basePreferences = profile.uiPreferences;

    // Apply contextual adaptations
    if (this.config.enableContextualAdaptation) {
      // Adapt based on time of day
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        // Night time - prefer dark theme and reduced animations
        return {
          ...basePreferences,
          theme: 'dark',
          animations: false,
          fontSize: 'medium'
        };
      }

      // Adapt based on behavior patterns
      const navigationPattern = profile.behaviorPatterns.find(p => p.patternType === 'navigation');
      if (navigationPattern && navigationPattern.frequency > 0.8) {
        // High navigation frequency - prefer compact layout
        return {
          ...basePreferences,
          layout: 'compact',
          density: 'compact'
        };
      }
    }

    return basePreferences;
  }

  private bufferBehaviorData(update: PersonalizationUpdate): void {
    const { userId, behaviorData } = update;
    if (!behaviorData || behaviorData.length === 0) return;

    const existing = this.behaviorBuffer.get(userId) || [];
    this.behaviorBuffer.set(userId, [...existing, ...behaviorData]);
  }

  private calculateCommonPreferences(profiles: PersonalizationProfile[]): Record<string, any> {
    const preferences = {
      themes: new Map<string, number>(),
      contentTypes: new Map<string, number>(),
      layouts: new Map<string, number>(),
      interactionStyles: new Map<string, number>()
    };

    profiles.forEach(profile => {
      profile.preferences.themes.forEach(theme => {
        preferences.themes.set(theme, (preferences.themes.get(theme) || 0) + 1);
      });

      profile.preferences.contentTypes.forEach(type => {
        preferences.contentTypes.set(type, (preferences.contentTypes.get(type) || 0) + 1);
      });

      preferences.layouts.set(
        profile.uiPreferences.layout,
        (preferences.layouts.get(profile.uiPreferences.layout) || 0) + 1
      );

      profile.preferences.interactionStyles.forEach(style => {
        preferences.interactionStyles.set(style, (preferences.interactionStyles.get(style) || 0) + 1);
      });
    });

    // Return top preferences
    return {
      topThemes: Array.from(preferences.themes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      topContentTypes: Array.from(preferences.contentTypes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      topLayouts: Array.from(preferences.layouts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      topInteractionStyles: Array.from(preferences.interactionStyles.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
    };
  }

  private calculateAdaptationTrends(profiles: PersonalizationProfile[]): Record<string, number> {
    const trends: Record<string, number> = {};

    profiles.forEach(profile => {
      // Calculate adaptation frequency based on profile updates
      const updateFrequency = profile.behaviorPatterns.length / Math.max(1, 
        (Date.now() - profile.lastUpdated.getTime()) / (1000 * 60 * 60 * 24) // Per day
      );

      trends[profile.userId] = updateFrequency;
    });

    return trends;
  }

  private createBehaviorError(error: any, context?: Record<string, any>): BehaviorError {
    return {
      name: error.name || 'PersonalizationError',
      message: error.message || 'Unknown personalization error',
      code: error.code || 'PERSONALIZATION_ERROR',
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
export const personalizationEngine = new PersonalizationEngine();
