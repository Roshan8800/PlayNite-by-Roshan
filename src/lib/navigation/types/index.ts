/**
 * @fileOverview Navigation system types and interfaces
 *
 * Core types for the intelligent navigation management system including
 * route optimization, analytics, and contextual navigation.
 */

export interface NavigationConfig {
  enableRouteOptimization: boolean;
  enableNavigationAnalytics: boolean;
  enableContextualNavigation: boolean;
  enablePrefetching: boolean;
  maxPrefetchRoutes: number;
  analyticsRetentionDays: number;
  cacheTimeout: number;
  performanceThresholds: {
    maxRouteLoadTime: number;
    maxBundleSize: number;
    minPrefetchScore: number;
  };
}

export interface RouteInfo {
  path: string;
  name: string;
  component?: string;
  requiresAuth?: boolean;
  roles?: string[];
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    priority?: number;
    category?: string;
    tags?: string[];
  };
  performance?: {
    bundleSize?: number;
    loadTime?: number;
    cacheStrategy?: 'memory' | 'disk' | 'network';
  };
  analytics?: {
    views?: number;
    uniqueViews?: number;
    bounceRate?: number;
    avgTimeOnPage?: number;
  };
}

export interface NavigationState {
  currentRoute: string;
  previousRoute?: string;
  navigationHistory: NavigationEntry[];
  context: NavigationContext;
  preferences: NavigationPreferences;
  performance: NavigationPerformance;
}

export interface NavigationEntry {
  route: string;
  timestamp: Date;
  duration?: number;
  referrer?: string;
  userAgent?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface NavigationContext {
  userId?: string;
  userSegment?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  location?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  isWeekend: boolean;
  sessionDuration: number;
  sessionId?: string;
  previousActions: string[];
  currentIntent?: string;
}

export interface NavigationPreferences {
  preferredRoutes: string[];
  avoidedRoutes: string[];
  navigationPatterns: NavigationPattern[];
  uiPreferences: {
    sidebarCollapsed?: boolean;
    theme?: string;
    layout?: string;
    animations?: boolean;
  };
  performancePreferences: {
    enablePrefetching?: boolean;
    enableLazyLoading?: boolean;
    maxConcurrentLoads?: number;
  };
}

export interface NavigationPattern {
  patternId: string;
  userId: string;
  patternType: 'sequential' | 'recurring' | 'contextual' | 'intent-based';
  routes: string[];
  frequency: number;
  confidence: number;
  contextTriggers: string[];
  lastSeen: Date;
  trends: Array<{
    timestamp: Date;
    frequency: number;
    confidence: number;
  }>;
}

export interface NavigationPerformance {
  routeLoadTimes: Map<string, number>;
  bundleSizes: Map<string, number>;
  cacheHitRates: Map<string, number>;
  prefetchAccuracy: number;
  averageNavigationTime: number;
  errorRates: Map<string, number>;
}

export interface NavigationAnalytics {
  userId?: string;
  sessionId: string;
  events: NavigationEvent[];
  metrics: NavigationMetrics;
  insights: NavigationInsight[];
  recommendations: NavigationRecommendation[];
}

export interface NavigationEvent {
  eventId: string;
  type: string;
  route: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
  context?: NavigationContext;
}

export interface NavigationMetrics {
  totalNavigations: number;
  uniqueRoutes: number;
  averageSessionLength: number;
  bounceRate: number;
  exitRate: number;
  conversionRate?: number;
  performanceMetrics: {
    averageLoadTime: number;
    averageBundleSize: number;
    cacheHitRate: number;
    prefetchAccuracy: number;
  };
  userEngagement: {
    timeOnPage: number;
    scrollDepth: number;
    interactionRate: number;
  };
}

export interface NavigationInsight {
  insightId: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedRoutes: string[];
  metrics: Record<string, number>;
  confidence: number;
  timestamp: Date;
  recommendations: string[];
}

export interface NavigationRecommendation {
  recommendationId: string;
  type: 'route_optimization' | 'prefetch_strategy' | 'cache_strategy' | 'ui_improvement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expectedImpact: {
    performance?: number;
    userExperience?: number;
    conversion?: number;
  };
  implementationEffort: 'low' | 'medium' | 'high';
  affectedRoutes: string[];
  timestamp: Date;
}

export interface RouteOptimization {
  route: string;
  optimizations: RouteOptimizationStrategy[];
  expectedImprovement: {
    loadTime?: number;
    bundleSize?: number;
    userExperience?: number;
  };
  priority: number;
  implementationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  lastOptimized?: Date;
  nextOptimization?: Date;
}

export interface RouteOptimizationStrategy {
  strategyId: string;
  type: 'code_splitting' | 'lazy_loading' | 'prefetching' | 'caching' | 'compression';
  description: string;
  config: Record<string, any>;
  expectedImpact: {
    loadTime?: number;
    bundleSize?: number;
  };
  dependencies?: string[];
  status?: 'pending' | 'applied' | 'failed';
}

export interface NavigationFlow {
  flowId: string;
  name: string;
  description: string;
  entryPoint: string;
  exitPoints: string[];
  steps: NavigationStep[];
  conditions: FlowCondition[];
  analytics: {
    completionRate?: number;
    averageTime?: number;
    dropOffPoints?: string[];
  };
}

export interface NavigationStep {
  stepId: string;
  route: string;
  order: number;
  conditions?: FlowCondition[];
  actions?: NavigationAction[];
  nextSteps?: string[];
  fallbackStep?: string;
}

export interface FlowCondition {
  conditionId: string;
  type: 'user_role' | 'user_preference' | 'context' | 'performance' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  field: string;
}

export interface NavigationAction {
  actionId: string;
  type: 'redirect' | 'show_modal' | 'track_event' | 'update_context' | 'prefetch_route';
  config: Record<string, any>;
}

export interface ContextualNavigation {
  context: NavigationContext;
  recommendations: ContextualRecommendation[];
  adaptiveElements: AdaptiveNavigationElement[];
  personalizedContent: PersonalizedNavigationContent[];
}

export interface ContextualRecommendation {
  recommendationId: string;
  type: 'route' | 'content' | 'feature' | 'action';
  title: string;
  description: string;
  route?: string;
  confidence: number;
  relevance: number;
  contextTriggers: string[];
  expiresAt?: Date;
}

export interface AdaptiveNavigationElement {
  elementId: string;
  type: 'menu_item' | 'quick_action' | 'suggestion' | 'notification';
  content: {
    title: string;
    description?: string;
    icon?: string;
    route?: string;
  };
  visibility: {
    conditions: FlowCondition[];
    priority: number;
  };
  behavior: {
    animation?: string;
    position?: string;
    style?: Record<string, any>;
  };
}

export interface PersonalizedNavigationContent {
  contentId: string;
  type: 'banner' | 'tooltip' | 'guide' | 'hint';
  content: {
    title: string;
    message: string;
    media?: string;
  };
  targeting: {
    userSegments: string[];
    contextTriggers: string[];
    behaviorPatterns: string[];
  };
  display: {
    frequency: 'once' | 'session' | 'daily' | 'always';
    position: string;
    dismissible: boolean;
  };
}

export interface NavigationError {
  errorId: string;
  type: 'route_not_found' | 'permission_denied' | 'performance_issue' | 'context_error' | 'optimization_error';
  message: string;
  route?: string;
  context?: NavigationContext;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface NavigationAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: NavigationError;
  metadata: {
    timestamp: Date;
    version: string;
    requestId: string;
    cached?: boolean;
    processingTime?: number;
    sampled?: boolean;
    status?: string;
    skipped?: string;
    strategy?: string;
  };
}

// Integration types for existing services
export interface BehaviorIntegration {
  enablePersonalization: boolean;
  enableAnalytics: boolean;
  enableContextualHelp: boolean;
  dataSharing: {
    shareBehaviorData: boolean;
    sharePreferences: boolean;
    shareAnalytics: boolean;
  };
}

export interface AuthIntegration {
  enableProtectedRoutes: boolean;
  enableRoleBasedNavigation: boolean;
  enablePermissionChecking: boolean;
  redirectUnauthorized: string;
}

export interface PerformanceIntegration {
  enableMonitoring: boolean;
  enableOptimization: boolean;
  enableCaching: boolean;
  thresholds: {
    maxLoadTime: number;
    maxErrorRate: number;
    minCacheHitRate: number;
  };
}

// Export all types
export * from './navigation-events';
export * from './navigation-middleware';
export * from './navigation-hooks';