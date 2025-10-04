/**
 * @fileOverview Navigation system exports
 *
 * Main entry point for the intelligent navigation management system.
 * Exports all core components, hooks, utilities, and types.
 */

import type {
  NavigationConfig,
  RouteInfo,
  NavigationError
} from './types';

// Core navigation management
export { NavigationManager, navigationManager } from './core/NavigationManager';
export { RouteOptimizer, routeOptimizer } from './core/RouteOptimizer';

// Analytics and tracking
export { NavigationAnalytics, navigationAnalytics } from './analytics/NavigationAnalytics';

// React hooks
export { useNavigation } from './hooks/useNavigation';
export type { UseNavigationOptions, UseNavigationReturn } from './types/navigation-hooks';

// Components
export { SmartNavigation } from './components/SmartNavigation';

// Types and interfaces
export type {
  // Core types
  NavigationConfig,
  RouteInfo,
  NavigationState,
  NavigationContext,
  NavigationEntry,
  NavigationPreferences,
  NavigationPattern,
  NavigationPerformance,

  // Analytics types
  NavigationAnalytics as INavigationAnalytics,
  NavigationMetrics,
  NavigationInsight,
  NavigationRecommendation,
  NavigationEvent,

  // Optimization types
  RouteOptimization,
  RouteOptimizationStrategy,

  // Flow types
  NavigationFlow,
  NavigationStep,
  FlowCondition,
  NavigationAction,

  // Contextual types
  ContextualNavigation,
  ContextualRecommendation,
  AdaptiveNavigationElement,
  PersonalizedNavigationContent,

  // Error types
  NavigationError,
  NavigationAPIResponse,

  // Integration types
  BehaviorIntegration,
  AuthIntegration,
  PerformanceIntegration,

  // Event types
  RouteChangeEvent,
  RoutePrefetchEvent,
  RouteErrorEvent,
  NavigationIntentEvent,
  ContextChangeEvent,
  PerformanceEvent,
  UserEngagementEvent,
  NavigationFlowEvent,

  // Middleware types
  NavigationMiddlewareConfig,
  MiddlewareContext,
  RouteProtectionRule,
  PerformanceMonitoringRule,
  AnalyticsTrackingRule,
  ContextEnhancementRule,
  ContextProvider,
  ErrorHandlingRule,
  RedirectOptimizationRule,
  MiddlewareResult,

  // Hook types
  UseRouteOptimizerOptions,
  UseRouteOptimizerReturn,
  RouteOptimizationStatus,
  RoutePerformanceMetrics,
  BundleAnalysis,
  OptimizationRecommendation,
  UseNavigationAnalyticsOptions,
  UseNavigationAnalyticsReturn,
  AnomalyDetectionResult,
  TrendAnalysisResult,
  UserJourneyAnalysis,
  NavigationReport,

  // Utility types
  NavigateOptions
} from './types';

// Constants and utilities
export const NAVIGATION_VERSION = '1.0.0';
export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  enableRouteOptimization: true,
  enableNavigationAnalytics: true,
  enableContextualNavigation: true,
  enablePrefetching: true,
  maxPrefetchRoutes: 10,
  analyticsRetentionDays: 90,
  cacheTimeout: 300000,
  performanceThresholds: {
    maxRouteLoadTime: 2000,
    maxBundleSize: 500000,
    minPrefetchScore: 0.6,
  },
};

// Utility functions
export const createNavigationError = (
  type: string,
  message: string,
  route?: string
): NavigationError => ({
  errorId: `${type}_${Date.now()}`,
  type,
  message,
  route,
  timestamp: new Date(),
  severity: 'medium',
  retryable: true
});

export const generateRequestId = (): string => {
  return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Integration helpers
export const initializeNavigationSystem = async (config?: Partial<NavigationConfig>) => {
  try {
    // Initialize the navigation manager with config
    const navManager = new (await import('./core/NavigationManager')).NavigationManager(config);

    // Register default routes
    const defaultRoutes: RouteInfo[] = [
      {
        path: '/home',
        name: 'Home',
        metadata: { title: 'Home', category: 'main', priority: 1 }
      },
      {
        path: '/reels',
        name: 'Reels',
        metadata: { title: 'Video Reels', category: 'content', priority: 2 }
      },
      {
        path: '/social',
        name: 'Social',
        metadata: { title: 'Social Feed', category: 'social', priority: 3 }
      },
      {
        path: '/settings',
        name: 'Settings',
        metadata: { title: 'Settings', category: 'account', priority: 10 }
      }
    ];

    // Register routes
    for (const routeInfo of defaultRoutes) {
      await navManager.registerRoute(routeInfo);
    }

    return navManager;
  } catch (error) {
    console.error('Failed to initialize navigation system:', error);
    throw error;
  }
};

// Export everything for advanced usage
export * from './types';
export * from './core/NavigationManager';
export * from './analytics/NavigationAnalytics';
export * from './hooks/useNavigation';
export * from './components/SmartNavigation';