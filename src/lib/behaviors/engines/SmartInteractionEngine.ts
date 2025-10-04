/**
 * @fileOverview Smart Interaction Engine for intelligent UI behaviors and contextual actions
 *
 * The SmartInteractionEngine provides intelligent UI behaviors, contextual actions,
 * and adaptive user experiences based on user behavior patterns and context.
 */

import {
  UserBehavior,
  SmartAction,
  ActionTrigger,
  ActionCondition,
  SmartInteractionContext,
  BehaviorAPIResponse,
  BehaviorError,
  InteractionPattern,
  PatternTrend,
  AdaptiveUIState,
  UIAdaptationTrigger,
  AdaptiveElement,
  UIAdaptation,
  AdaptationCondition
} from '../types';

export interface SmartInteractionConfig {
  enableContextualActions: boolean;
  enableAdaptiveUI: boolean;
  enableSmartSuggestions: boolean;
  enableAutomation: boolean;
  maxActionsPerSession: number;
  actionCooldownMs: number;
  contextWindowSize: number;
}

export class SmartInteractionEngine {
  private config: SmartInteractionConfig;
  private activeActions: Map<string, SmartAction> = new Map();
  private interactionHistory: Map<string, UserBehavior[]> = new Map();
  private adaptiveStates: Map<string, AdaptiveUIState> = new Map();
  private actionCache: Map<string, { lastTriggered: Date; count: number }> = new Map();

  constructor(config: Partial<SmartInteractionConfig> = {}) {
    this.config = {
      enableContextualActions: true,
      enableAdaptiveUI: true,
      enableSmartSuggestions: true,
      enableAutomation: true,
      maxActionsPerSession: 50,
      actionCooldownMs: 30000, // 30 seconds
      contextWindowSize: 100,
      ...config
    };
  }

  /**
   * Process a user interaction and trigger contextual actions
   */
  async processInteraction(
    behavior: UserBehavior,
    context: SmartInteractionContext
  ): Promise<BehaviorAPIResponse<SmartAction[]>> {
    try {
      // Store interaction in history
      this.addToInteractionHistory(behavior);

      // Analyze interaction patterns
      const patterns = await this.analyzeInteractionPatterns(context);

      // Generate contextual actions
      const actions = await this.generateContextualActions(behavior, context, patterns);

      // Apply UI adaptations if enabled
      if (this.config.enableAdaptiveUI) {
        await this.applyAdaptiveUI(behavior, context);
      }

      return {
        success: true,
        data: actions,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId: behavior.userId, context: 'processInteraction' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Register a smart action with triggers and conditions
   */
  registerAction(action: SmartAction): void {
    this.activeActions.set(action.actionId, action);
  }

  /**
   * Unregister a smart action
   */
  unregisterAction(actionId: string): void {
    this.activeActions.delete(actionId);
  }

  /**
   * Get active actions for a user context
   */
  getActiveActions(context: SmartInteractionContext): SmartAction[] {
    const activeActions: SmartAction[] = [];

    for (const action of this.activeActions.values()) {
      if (this.shouldTriggerAction(action, context)) {
        activeActions.push(action);
      }
    }

    return activeActions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update adaptive UI state based on user behavior
   */
  async updateAdaptiveUI(
    userId: string,
    adaptations: AdaptiveElement[]
  ): Promise<BehaviorAPIResponse<AdaptiveUIState>> {
    try {
      const currentState = this.adaptiveStates.get(userId) || {
        userId,
        currentLayout: {
          layout: 'grid',
          theme: 'auto',
          animations: true,
          autoPlay: false,
          sidebarCollapsed: false,
          fontSize: 'medium',
          density: 'comfortable'
        },
        adaptiveElements: [],
        lastUpdated: new Date(),
        triggers: []
      };

      // Apply adaptations based on conditions
      const updatedElements = this.applyAdaptations(currentState.adaptiveElements, adaptations);

      const newState: AdaptiveUIState = {
        ...currentState,
        adaptiveElements: updatedElements,
        lastUpdated: new Date()
      };

      this.adaptiveStates.set(userId, newState);

      return {
        success: true,
        data: newState,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { userId, context: 'updateAdaptiveUI' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get personalized interaction suggestions
   */
  async getInteractionSuggestions(
    context: SmartInteractionContext
  ): Promise<BehaviorAPIResponse<string[]>> {
    try {
      const suggestions: string[] = [];
      const userHistory = this.interactionHistory.get(context.userId || 'anonymous') || [];

      // Analyze recent behavior patterns
      const recentPatterns = await this.analyzeRecentPatterns(userHistory);

      // Generate suggestions based on patterns
      for (const pattern of recentPatterns) {
        const patternSuggestions = this.generatePatternBasedSuggestions(pattern, context);
        suggestions.push(...patternSuggestions);
      }

      // Limit suggestions and remove duplicates
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);

      return {
        success: true,
        data: uniqueSuggestions,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createBehaviorError(error, { context: 'getInteractionSuggestions' }),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Clear interaction history for a user
   */
  clearUserHistory(userId: string): void {
    this.interactionHistory.delete(userId);
    this.adaptiveStates.delete(userId);
  }

  /**
   * Get interaction statistics for analytics
   */
  getInteractionStats(userId?: string): {
    totalInteractions: number;
    activeActions: number;
    adaptiveStates: number;
    averageSessionLength: number;
  } {
    const totalInteractions = userId
      ? (this.interactionHistory.get(userId) || []).length
      : Array.from(this.interactionHistory.values()).reduce((sum, history) => sum + history.length, 0);

    return {
      totalInteractions,
      activeActions: this.activeActions.size,
      adaptiveStates: this.adaptiveStates.size,
      averageSessionLength: this.calculateAverageSessionLength()
    };
  }

  // Private helper methods

  private addToInteractionHistory(behavior: UserBehavior): void {
    const userId = behavior.userId;
    const history = this.interactionHistory.get(userId) || [];

    // Maintain context window size
    if (history.length >= this.config.contextWindowSize) {
      history.shift(); // Remove oldest interaction
    }

    history.push(behavior);
    this.interactionHistory.set(userId, history);
  }

  private async analyzeInteractionPatterns(context: SmartInteractionContext): Promise<InteractionPattern[]> {
    const userHistory = this.interactionHistory.get(context.userId || 'anonymous') || [];
    const patterns: InteractionPattern[] = [];

    // Group interactions by type and analyze frequency
    const typeGroups = new Map<string, UserBehavior[]>();
    userHistory.forEach(behavior => {
      const type = behavior.action;
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(behavior);
    });

    // Generate patterns for frequent interaction types
    for (const [type, behaviors] of typeGroups.entries()) {
      if (behaviors.length >= 3) { // Minimum threshold for pattern recognition
        const pattern = this.createInteractionPattern(type, behaviors, context);
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private createInteractionPattern(
    type: string,
    behaviors: UserBehavior[],
    context: SmartInteractionContext
  ): InteractionPattern {
    const now = new Date();
    const recentBehaviors = behaviors.filter(b =>
      now.getTime() - b.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return {
      patternId: `pattern_${type}_${Date.now()}`,
      userId: context.userId || 'anonymous',
      patternType: this.categorizePatternType(type),
      frequency: recentBehaviors.length / 24, // Per hour rate
      confidence: Math.min(recentBehaviors.length / 10, 1), // Confidence based on frequency
      context: {
        currentPage: context.currentPage,
        deviceType: context.environment.deviceType,
        timeOfDay: now.getHours()
      },
      lastSeen: now,
      trends: this.calculateTrends(behaviors)
    };
  }

  private categorizePatternType(action: string): 'navigation' | 'engagement' | 'preference' | 'social' {
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

  private calculateTrends(behaviors: UserBehavior[]): PatternTrend[] {
    const trends: PatternTrend[] = [];
    const now = new Date();
    const lastWeek = behaviors.filter(b =>
      now.getTime() - b.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    );

    if (lastWeek.length > 0) {
      const thisWeekCount = behaviors.filter(b =>
        now.getTime() - b.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length;

      const lastWeekCount = lastWeek.length - thisWeekCount;
      const changeRate = lastWeekCount > 0 ? (thisWeekCount - lastWeekCount) / lastWeekCount : 0;

      trends.push({
        metric: 'frequency',
        direction: changeRate > 0.1 ? 'increasing' : changeRate < -0.1 ? 'decreasing' : 'stable',
        changeRate,
        timeframe: 'weekly'
      });
    }

    return trends;
  }

  private async generateContextualActions(
    behavior: UserBehavior,
    context: SmartInteractionContext,
    patterns: InteractionPattern[]
  ): Promise<SmartAction[]> {
    const actions: SmartAction[] = [];

    for (const action of this.activeActions.values()) {
      if (this.shouldTriggerAction(action, context) && this.checkRateLimit(action.actionId)) {
        // Check if action conditions are met
        if (this.evaluateConditions(action.conditions, { behavior, context, patterns })) {
          actions.push(action);
          this.updateActionCache(action.actionId);
        }
      }
    }

    return actions.slice(0, this.config.maxActionsPerSession);
  }

  private shouldTriggerAction(action: SmartAction, context: SmartInteractionContext): boolean {
    const trigger = action.trigger;

    // Check if trigger event matches current context
    if (trigger.event !== context.currentPage && trigger.event !== '*') {
      return false;
    }

    // Check trigger conditions
    for (const [key, value] of Object.entries(trigger.conditions)) {
      const contextValue = (context as any)[key];
      if (contextValue !== value) {
        return false;
      }
    }

    return true;
  }

  private evaluateConditions(
    conditions: ActionCondition[],
    data: { behavior: UserBehavior; context: SmartInteractionContext; patterns: InteractionPattern[] }
  ): boolean {
    return conditions.every(condition => {
      const { field, operator, value } = condition;
      let fieldValue: any;

      // Extract field value from available data
      if (field.startsWith('behavior.')) {
        fieldValue = (data.behavior as any)[field.substring(9)];
      } else if (field.startsWith('context.')) {
        fieldValue = (data.context as any)[field.substring(8)];
      } else if (field.startsWith('patterns.')) {
        fieldValue = data.patterns.map(p => (p as any)[field.substring(9)]);
      }

      return this.evaluateCondition(fieldValue, operator, value);
    });
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'contains':
        return Array.isArray(fieldValue) && fieldValue.includes(expectedValue);
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      case 'not_exists':
        return fieldValue === null || fieldValue === undefined;
      default:
        return false;
    }
  }

  private checkRateLimit(actionId: string): boolean {
    const cache = this.actionCache.get(actionId);
    if (!cache) return true;

    const timeSinceLastTrigger = Date.now() - cache.lastTriggered.getTime();
    return timeSinceLastTrigger >= this.config.actionCooldownMs;
  }

  private updateActionCache(actionId: string): void {
    const existing = this.actionCache.get(actionId);
    if (existing) {
      existing.count++;
      existing.lastTriggered = new Date();
    } else {
      this.actionCache.set(actionId, { lastTriggered: new Date(), count: 1 });
    }
  }

  private async applyAdaptiveUI(behavior: UserBehavior, context: SmartInteractionContext): Promise<void> {
    if (!context.userId) return;

    const adaptations = this.generateUIAdaptations(behavior, context);
    if (adaptations.length > 0) {
      await this.updateAdaptiveUI(context.userId, adaptations);
    }
  }

  private generateUIAdaptations(behavior: UserBehavior, context: SmartInteractionContext): AdaptiveElement[] {
    const adaptations: AdaptiveElement[] = [];

    // Example: If user frequently scrolls quickly, suggest compact layout
    if (behavior.action === 'scroll' && context.environment.deviceType === 'mobile') {
      adaptations.push({
        elementId: 'main-layout',
        elementType: 'layout',
        adaptations: [{
          property: 'density',
          value: 'compact',
          trigger: 'scroll_behavior',
          confidence: 0.8
        }],
        conditions: [{
          field: 'context.environment.deviceType',
          operator: 'equals',
          value: 'mobile'
        }],
        priority: 1
      });
    }

    return adaptations;
  }

  private applyAdaptations(
    currentElements: AdaptiveElement[],
    newAdaptations: AdaptiveElement[]
  ): AdaptiveElement[] {
    const updated = [...currentElements];

    for (const adaptation of newAdaptations) {
      const existingIndex = updated.findIndex(el => el.elementId === adaptation.elementId);

      if (existingIndex >= 0) {
        // Merge adaptations
        updated[existingIndex] = {
          ...updated[existingIndex],
          adaptations: [...updated[existingIndex].adaptations, ...adaptation.adaptations]
        };
      } else {
        updated.push(adaptation);
      }
    }

    return updated;
  }

  private async analyzeRecentPatterns(history: UserBehavior[]): Promise<InteractionPattern[]> {
    // Analyze patterns in recent history (last 50 interactions)
    const recent = history.slice(-50);
    return await this.analyzeInteractionPatterns({
      userId: history[0]?.userId || 'anonymous',
      sessionId: history[0]?.sessionId || 'unknown',
      currentPage: 'unknown',
      userAgent: '',
      timestamp: new Date(),
      interactions: recent,
      environment: {
        screenSize: 'unknown',
        deviceType: 'unknown',
        browser: 'unknown',
        platform: 'unknown'
      }
    } as SmartInteractionContext);
  }

  private generatePatternBasedSuggestions(pattern: InteractionPattern, context: SmartInteractionContext): string[] {
    const suggestions: string[] = [];

    switch (pattern.patternType) {
      case 'navigation':
        if (pattern.frequency > 5) { // High navigation frequency
          suggestions.push('Consider using search for faster navigation');
          suggestions.push('Check out keyboard shortcuts for quicker browsing');
        }
        break;
      case 'social':
        if (pattern.frequency > 3) {
          suggestions.push('Explore trending content in your favorite categories');
          suggestions.push('Connect with users who share your interests');
        }
        break;
      case 'engagement':
        if (pattern.confidence > 0.7) {
          suggestions.push('Continue watching related content');
          suggestions.push('Rate this content to improve recommendations');
        }
        break;
    }

    return suggestions;
  }

  private calculateAverageSessionLength(): number {
    const sessions = new Map<string, UserBehavior[]>();

    // Group interactions by session
    for (const history of this.interactionHistory.values()) {
      for (const behavior of history) {
        if (!sessions.has(behavior.sessionId)) {
          sessions.set(behavior.sessionId, []);
        }
        sessions.get(behavior.sessionId)!.push(behavior);
      }
    }

    // Calculate average session length
    const sessionLengths = Array.from(sessions.values()).map(behaviors =>
      behaviors.length > 0 ?
        behaviors[behaviors.length - 1].timestamp.getTime() - behaviors[0].timestamp.getTime() :
        0
    );

    return sessionLengths.length > 0 ?
      sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length / (1000 * 60) : // Convert to minutes
      0;
  }

  private createBehaviorError(error: any, context?: Record<string, any>): BehaviorError {
    return {
      name: error.name || 'BehaviorError',
      message: error.message || 'Unknown behavior error',
      code: error.code || 'UNKNOWN_ERROR',
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
export const smartInteractionEngine = new SmartInteractionEngine();