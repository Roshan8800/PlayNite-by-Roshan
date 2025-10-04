/**
 * @fileOverview Core navigation management system
 *
 * The NavigationManager provides intelligent route handling, contextual navigation,
 * and integration with user behavior and personalization systems.
 */

import {
  NavigationAPIResponse,
  NavigationState,
  NavigationContext,
  RouteInfo,
  NavigationConfig,
  NavigationEntry,
  ContextProvider
} from '../types';
import { NavigationAnalytics } from '../analytics/NavigationAnalytics';
import { RouteOptimizer } from './RouteOptimizer';
import { personalizationEngine } from '../../behaviors/engines/PersonalizationEngine';
import { behavioralAnalytics } from '../../behaviors/analytics/BehavioralAnalytics';

export class NavigationManager {
  private config: NavigationConfig;
  private currentState: NavigationState;
  private routeRegistry: Map<string, RouteInfo> = new Map();
  private navigationHistory: NavigationEntry[] = [];
  private contextProviders: ContextProvider[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  // Core services
  private analytics: NavigationAnalytics;
  private optimizer: RouteOptimizer;

  constructor(config: Partial<NavigationConfig> = {}) {
    this.config = {
      enableRouteOptimization: true,
      enableNavigationAnalytics: true,
      enableContextualNavigation: true,
      enablePrefetching: true,
      maxPrefetchRoutes: 10,
      analyticsRetentionDays: 90,
      cacheTimeout: 300000, // 5 minutes
      performanceThresholds: {
        maxRouteLoadTime: 2000,
        maxBundleSize: 500000,
        minPrefetchScore: 0.6,
      },
      ...config
    };

    // Initialize core services
    this.analytics = new NavigationAnalytics({
      enableRealTimeTracking: this.config.enableNavigationAnalytics,
      enablePerformanceTracking: true,
      enableUserJourneyTracking: true,
      enableAnomalyDetection: true,
      enablePredictiveAnalytics: false,
      dataRetentionDays: this.config.analyticsRetentionDays,
      sampleRate: 1.0,
      maxEventsPerSession: 1000
    });

    this.optimizer = new RouteOptimizer({
      enableCodeSplitting: true,
      enableLazyLoading: true,
      enablePrefetching: this.config.enablePrefetching,
      maxConcurrentLoads: 3,
      priorityRoutes: ['/home', '/reels', '/social']
    });

    // Initialize default state
    this.currentState = this.createDefaultState();

    // Setup default context providers
    this.setupDefaultContextProviders();

    // Start analytics tracking
    if (this.config.enableNavigationAnalytics) {
      this.startAnalyticsTracking();
    }
  }

  /**
   * Register a route in the navigation system
   */
  async registerRoute(routeInfo: RouteInfo): Promise<NavigationAPIResponse<void>> {
    try {
      this.routeRegistry.set(routeInfo.path, routeInfo);

      // Track route registration
      await this.trackEvent({
        eventId: `route_registered_${Date.now()}`,
        type: 'route_registration',
        route: routeInfo.path,
        timestamp: new Date(),
        metadata: {
          name: routeInfo.name,
          requiresAuth: routeInfo.requiresAuth,
          roles: routeInfo.roles,
          category: routeInfo.metadata?.category
        }
      });

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
        error: this.createNavigationError('ROUTE_REGISTRATION_ERROR', error instanceof Error ? error.message : String(error), routeInfo.path),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Navigate to a route with intelligent handling
   */
  async navigate(
    route: string,
    options: {
      replace?: boolean;
      metadata?: Record<string, any>;
      context?: Partial<NavigationContext>;
      triggerPrefetch?: boolean;
    } = {}
  ): Promise<NavigationAPIResponse<void>> {
    try {
      const startTime = Date.now();

      // Get route info
      const routeInfo = this.routeRegistry.get(route);
      if (!routeInfo) {
        throw new Error(`Route not found: ${route}`);
      }

      // Check permissions
      if (routeInfo.requiresAuth || routeInfo.roles) {
        const permissionCheck = await this.checkRoutePermissions(routeInfo);
        if (!permissionCheck.allowed) {
          throw new Error(`Access denied: ${permissionCheck.reason}`);
        }
      }

      // Update context if provided
      if (options.context) {
        this.currentState.context = { ...this.currentState.context, ...options.context };
      }

      // Track navigation start
      const navigationEntry: NavigationEntry = {
        route,
        timestamp: new Date(),
        referrer: this.currentState.currentRoute,
        sessionId: this.currentState.context.sessionId || 'default',
        metadata: options.metadata
      };

      // Update state
      const previousRoute = this.currentState.currentRoute;
      this.currentState.previousRoute = previousRoute;
      this.currentState.currentRoute = route;
      this.navigationHistory.push(navigationEntry);

      // Limit history size
      if (this.navigationHistory.length > 100) {
        this.navigationHistory = this.navigationHistory.slice(-50);
      }

      // Get contextual recommendations
      if (this.config.enableContextualNavigation) {
        await this.updateContextualNavigation(route);
      }

      // Prefetch related routes if enabled
      if (options.triggerPrefetch && this.config.enablePrefetching) {
        await this.prefetchRelatedRoutes(route);
      }

      // Track navigation completion
      const duration = Date.now() - startTime;
      await this.trackEvent({
        eventId: `navigation_${Date.now()}`,
        type: 'route_change',
        route,
        timestamp: new Date(),
        duration,
        metadata: {
          fromRoute: previousRoute,
          navigationType: options.replace ? 'replace' : 'push',
          trigger: 'user',
          ...options.metadata
        },
        context: this.currentState.context
      });

      // Update personalization engine
      if (this.currentState.context.userId) {
        await personalizationEngine.updateUserProfile({
          userId: this.currentState.context.userId,
          behaviorData: [{
            userId: this.currentState.context.userId,
            action: 'navigate',
            target: route,
            timestamp: new Date(),
            sessionId: this.currentState.context.sessionId || 'default',
            context: this.currentState.context
          }]
        });
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
        error: this.createNavigationError('NAVIGATION_ERROR', error instanceof Error ? error.message : String(error), route),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get contextual navigation recommendations
   */
  async getContextualNavigation(userId?: string): Promise<NavigationAPIResponse<any[]>> {
    try {
      if (!this.config.enableContextualNavigation) {
        return {
          success: true,
          data: [],
          metadata: {
            timestamp: new Date(),
            version: '1.0.0',
            requestId: this.generateRequestId()
          }
        };
      }

      const context = userId ? await this.buildContext(userId) : this.currentState.context;
      const recommendations: any[] = [];

      // Get personalization-based recommendations
      if (userId) {
        const profileResult = await personalizationEngine.getUserProfile(userId);
        if (profileResult.success && profileResult.data) {
          const profile = profileResult.data;

          // Add preferred routes
          recommendations.push(
            ...profile.preferences.contentTypes.map(type => ({
              type: 'content_preference',
              route: `/content/${type}`,
              title: `Browse ${type}`,
              confidence: 0.8,
              reason: 'Based on your content preferences'
            }))
          );

          // Add behavior-based recommendations
          profile.behaviorPatterns.forEach(pattern => {
            if (pattern.confidence > 0.7) {
              recommendations.push({
                type: 'behavior_pattern',
                route: pattern.context.currentPage,
                title: 'Continue your journey',
                confidence: pattern.confidence,
                reason: 'Based on your recent activity'
              });
            }
          });
        }
      }

      // Add time-based recommendations
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        recommendations.push({
          type: 'time_based',
          route: '/settings',
          title: 'Night mode settings',
          confidence: 0.6,
          reason: 'Late night browsing detected'
        });
      }

      // Add performance-based recommendations
      const performanceMetrics = this.getPerformanceMetrics();
      if (performanceMetrics.averageLoadTime > this.config.performanceThresholds.maxRouteLoadTime) {
        recommendations.push({
          type: 'performance',
          route: '/settings',
          title: 'Performance settings',
          confidence: 0.9,
          reason: 'Slow loading detected'
        });
      }

      return {
        success: true,
        data: recommendations.slice(0, 5), // Limit to top 5
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createNavigationError('CONTEXTUAL_NAVIGATION_ERROR', error instanceof Error ? error.message : String(error)),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get navigation analytics and insights
   */
  async getNavigationAnalytics(
    timeframe: { start: Date; end: Date },
    userId?: string
  ): Promise<NavigationAPIResponse<any>> {
    try {
      const query = {
        userId,
        timeframe,
        metrics: ['navigation', 'engagement', 'performance']
      };

      const [metricsResult, insightsResult] = await Promise.all([
        this.analytics.getBehaviorMetrics(query),
        this.analytics.getBehavioralInsights(query)
      ]);

      const data = {
        metrics: metricsResult.success ? metricsResult.data : null,
        insights: insightsResult.success ? insightsResult.data : [],
        performance: this.getPerformanceMetrics(),
        recommendations: await this.getOptimizationRecommendations()
      };

      return {
        success: true,
        data,
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createNavigationError('ANALYTICS_ERROR', error instanceof Error ? error.message : String(error)),
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Update navigation context
   */
  async updateContext(context: Partial<NavigationContext>): Promise<void> {
    this.currentState.context = { ...this.currentState.context, ...context };

    // Notify context change listeners
    await this.emitEvent('context_change', {
      previousContext: this.currentState.context,
      newContext: this.currentState.context,
      changedFields: Object.keys(context)
    });
  }

  /**
   * Get current navigation state
   */
  getCurrentState(): NavigationState {
    return { ...this.currentState };
  }

  /**
   * Get route information
   */
  getRouteInfo(route: string): RouteInfo | undefined {
    return this.routeRegistry.get(route);
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(limit?: number): NavigationEntry[] {
    const history = [...this.navigationHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Add event listener
   */
  on(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private helper methods

  private createDefaultState(): NavigationState {
    return {
      currentRoute: '/',
      navigationHistory: [],
      context: {
        deviceType: 'desktop',
        browser: 'unknown',
        timeOfDay: 'morning',
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        isWeekend: [0, 6].includes(new Date().getDay()),
        sessionDuration: 0,
        previousActions: []
      },
      preferences: {
        preferredRoutes: [],
        avoidedRoutes: [],
        navigationPatterns: [],
        uiPreferences: {
          sidebarCollapsed: false,
          theme: 'auto',
          layout: 'default',
          animations: true
        },
        performancePreferences: {
          enablePrefetching: true,
          enableLazyLoading: true,
          maxConcurrentLoads: 3
        }
      },
      performance: {
        routeLoadTimes: new Map(),
        bundleSizes: new Map(),
        cacheHitRates: new Map(),
        prefetchAccuracy: 0,
        averageNavigationTime: 0,
        errorRates: new Map()
      }
    };
  }

  private setupDefaultContextProviders(): void {
    // Device type detection
    this.contextProviders.push({
      name: 'device_detection',
      priority: 1,
      cacheable: true,
      provider: async (request: any) => {
        const userAgent = request.headers.get('user-agent') || '';
        return {
          deviceType: this.detectDeviceType(userAgent),
          browser: this.detectBrowser(userAgent)
        };
      }
    });

    // Time-based context
    this.contextProviders.push({
      name: 'time_context',
      priority: 2,
      cacheable: false,
      provider: async () => {
        const now = new Date();
        const hour = now.getHours();
        return {
          timeOfDay: hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening',
          dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          isWeekend: [0, 6].includes(now.getDay())
        };
      }
    });
  }

  private detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return /ipad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'chrome';
    if (/firefox/i.test(userAgent)) return 'firefox';
    if (/safari/i.test(userAgent)) return 'safari';
    if (/edge/i.test(userAgent)) return 'edge';
    return 'unknown';
  }

  private async checkRoutePermissions(routeInfo: RouteInfo): Promise<{ allowed: boolean; reason?: string }> {
    // This would integrate with the auth system
    // For now, return true if no specific permissions required
    return { allowed: true };
  }

  private async updateContextualNavigation(route: string): Promise<void> {
    // Update context based on current route and user behavior
    const routeInfo = this.routeRegistry.get(route);
    if (routeInfo?.metadata?.category) {
      await this.updateContext({
        currentIntent: routeInfo.metadata.category
      });
    }
  }

  private async prefetchRelatedRoutes(currentRoute: string): Promise<void> {
    // Get related routes based on current route and user patterns
    const relatedRoutes = await this.getRelatedRoutes(currentRoute);

    // Prefetch top related routes
    const routesToPrefetch = relatedRoutes
      .slice(0, this.config.maxPrefetchRoutes)
      .filter(route => this.shouldPrefetchRoute(route));

    for (const route of routesToPrefetch) {
      await this.optimizer.prefetchRoute(route);
    }
  }

  private async getRelatedRoutes(route: string): Promise<string[]> {
    const routeInfo = this.routeRegistry.get(route);
    if (!routeInfo) return [];

    const relatedRoutes: string[] = [];

    // Add routes from same category
    if (routeInfo.metadata?.category) {
      for (const [path, info] of this.routeRegistry.entries()) {
        if (path !== route && info.metadata?.category === routeInfo.metadata?.category) {
          relatedRoutes.push(path);
        }
      }
    }

    // Add frequently visited routes together
    const coOccurrenceRoutes = await this.getCoOccurrenceRoutes(route);
    relatedRoutes.push(...coOccurrenceRoutes);

    return [...new Set(relatedRoutes)];
  }

  private async getCoOccurrenceRoutes(route: string): Promise<string[]> {
    // This would analyze navigation patterns to find routes frequently visited together
    // For now, return empty array
    return [];
  }

  private shouldPrefetchRoute(route: string): boolean {
    const routeInfo = this.routeRegistry.get(route);
    if (!routeInfo) return false;

    // Don't prefetch if route requires auth and user not authenticated
    if (routeInfo.requiresAuth) {
      return false; // Would check auth status here
    }

    // Check performance metrics
    const loadTime = this.currentState.performance.routeLoadTimes.get(route);
    if (loadTime && loadTime > this.config.performanceThresholds.maxRouteLoadTime) {
      return false;
    }

    return true;
  }

  private async buildContext(userId: string): Promise<NavigationContext> {
    // Build comprehensive context for a user
    const baseContext = { ...this.currentState.context };

    // Add user-specific context
    if (userId) {
      const profileResult = await personalizationEngine.getUserProfile(userId);
      if (profileResult.success && profileResult.data) {
        const profile = profileResult.data;
        baseContext.userSegment = profile.preferences.themes[0] || 'general';
      }
    }

    return baseContext;
  }

  private getPerformanceMetrics(): any {
    return {
      averageLoadTime: this.calculateAverageLoadTime(),
      cacheHitRate: this.calculateCacheHitRate(),
      errorRate: this.calculateErrorRate(),
      prefetchAccuracy: this.currentState.performance.prefetchAccuracy
    };
  }

  private calculateAverageLoadTime(): number {
    const loadTimes = Array.from(this.currentState.performance.routeLoadTimes.values());
    return loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;
  }

  private calculateCacheHitRate(): number {
    const hitRates = Array.from(this.currentState.performance.cacheHitRates.values());
    return hitRates.length > 0
      ? hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length
      : 0;
  }

  private calculateErrorRate(): number {
    const errorRates = Array.from(this.currentState.performance.errorRates.values());
    return errorRates.length > 0
      ? errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length
      : 0;
  }

  private async getOptimizationRecommendations(): Promise<any[]> {
    return this.optimizer.getOptimizationRecommendations();
  }

  private async trackEvent(event: any): Promise<void> {
    if (this.config.enableNavigationAnalytics) {
      await this.analytics.trackBehavior({
        userId: this.currentState.context.userId || 'anonymous',
        action: event.type,
        target: event.route,
        timestamp: event.timestamp,
        sessionId: this.currentState.context.sessionId || 'default',
        context: event.context,
        metadata: event.metadata
      });
    }
  }

  private async emitEvent(eventType: string, data: any): Promise<void> {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          await listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      }
    }
  }

  private startAnalyticsTracking(): void {
    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.trackEvent({
          eventId: `visibility_${Date.now()}`,
          type: 'visibility_change',
          route: this.currentState.currentRoute,
          timestamp: new Date(),
          metadata: {
            hidden: document.hidden
          }
        });
      });
    }
  }

  private createNavigationError(type: string, message: string, route?: string): any {
    return {
      errorId: `${type}_${Date.now()}`,
      type,
      message,
      route,
      context: this.currentState.context,
      timestamp: new Date(),
      severity: 'medium',
      retryable: true
    };
  }

  private generateRequestId(): string {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const navigationManager = new NavigationManager();