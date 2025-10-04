/**
 * @fileOverview Navigation hooks types and interfaces
 */

import {
  NavigationState,
  NavigationContext,
  RouteInfo,
  NavigationAnalytics,
  NavigationMetrics,
  NavigationInsight,
  NavigationEvent,
  NavigationRecommendation
} from './index';

export interface UseNavigationOptions {
  enableTracking?: boolean;
  enablePrefetching?: boolean;
  enableContextualNavigation?: boolean;
  trackPerformance?: boolean;
  trackUserEngagement?: boolean;
}

export interface UseNavigationReturn {
  // Current state
  currentRoute: string;
  previousRoute?: string;
  navigationState: NavigationState;

  // Navigation actions
  navigate: (route: string, options?: NavigateOptions) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  refresh: () => Promise<void>;

  // Context and preferences
  context: NavigationContext;
  updateContext: (context: Partial<NavigationContext>) => void;
  preferences: NavigationState['preferences'];
  updatePreferences: (preferences: Partial<NavigationState['preferences']>) => void;

  // Analytics and insights
  analytics?: NavigationAnalytics;
  getRouteInfo: (route: string) => RouteInfo | undefined;
  getRecommendedRoutes: () => string[];

  // Performance
  prefetchRoute: (route: string) => Promise<void>;
  getPerformanceMetrics: () => Record<string, number>;

  // Utilities
  isRouteActive: (route: string) => boolean;
  getRouteMetadata: (route: string) => RouteInfo['metadata'];
}

export interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  prefetch?: boolean;
  metadata?: Record<string, any>;
  context?: Partial<NavigationContext>;
}

export interface UseRouteOptimizerOptions {
  enableCodeSplitting?: boolean;
  enableLazyLoading?: boolean;
  enablePrefetching?: boolean;
  maxConcurrentLoads?: number;
  priorityRoutes?: string[];
}

export interface UseRouteOptimizerReturn {
  // Optimization state
  isOptimizing: boolean;
  optimizationProgress: Record<string, number>;

  // Optimization actions
  optimizeRoute: (route: string) => Promise<void>;
  optimizeAllRoutes: () => Promise<void>;
  getOptimizationStatus: (route: string) => RouteOptimizationStatus;

  // Performance metrics
  getPerformanceMetrics: () => RoutePerformanceMetrics;
  getBundleAnalysis: () => BundleAnalysis;

  // Recommendations
  getOptimizationRecommendations: () => OptimizationRecommendation[];
  applyRecommendation: (recommendationId: string) => Promise<void>;
}

export interface RouteOptimizationStatus {
  route: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  optimizations: Array<{
    type: string;
    status: 'pending' | 'applied' | 'failed';
    impact?: {
      loadTime?: number;
      bundleSize?: number;
    };
  }>;
  lastOptimized?: Date;
  nextOptimization?: Date;
}

export interface RoutePerformanceMetrics {
  route: string;
  loadTime: number;
  bundleSize: number;
  cacheHitRate: number;
  errorRate: number;
  userSatisfaction: number;
  performanceScore: number;
}

export interface BundleAnalysis {
  totalSize: number;
  chunkCount: number;
  largestChunk: {
    name: string;
    size: number;
  };
  duplicateCode: Array<{
    code: string;
    size: number;
    occurrences: number;
  }>;
  optimizationOpportunities: Array<{
    type: string;
    potentialSavings: number;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'code_splitting' | 'lazy_loading' | 'prefetching' | 'caching' | 'compression';
  title: string;
  description: string;
  impact: {
    performance: number;
    bundleSize: number;
    userExperience: number;
  };
  effort: 'low' | 'medium' | 'high';
  affectedRoutes: string[];
  implementation: {
    automatic: boolean;
    steps?: string[];
    config?: Record<string, any>;
  };
}

export interface UseNavigationAnalyticsOptions {
  enableRealTimeTracking?: boolean;
  enableHistoricalAnalysis?: boolean;
  enableAnomalyDetection?: boolean;
  enableTrendAnalysis?: boolean;
  retentionDays?: number;
}

export interface UseNavigationAnalyticsReturn {
  // Analytics state
  isTracking: boolean;
  currentMetrics: NavigationMetrics;
  insights: NavigationInsight[];

  // Analytics actions
  trackEvent: (event: NavigationEvent) => Promise<void>;
  getMetrics: (timeframe: { start: Date; end: Date }) => Promise<NavigationMetrics>;
  getInsights: (timeframe: { start: Date; end: Date }) => Promise<NavigationInsight[]>;

  // Analysis
  detectAnomalies: () => Promise<AnomalyDetectionResult>;
  analyzeTrends: () => Promise<TrendAnalysisResult>;
  getUserJourney: (userId: string) => Promise<UserJourneyAnalysis>;

  // Reporting
  generateReport: (timeframe: { start: Date; end: Date }) => Promise<NavigationReport>;
  exportData: (format: 'json' | 'csv' | 'xlsx') => Promise<Blob>;
}

export interface AnomalyDetectionResult {
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedRoutes: string[];
    timestamp: Date;
    confidence: number;
  }>;
  summary: {
    totalAnomalies: number;
    criticalAnomalies: number;
    trends: Record<string, number>;
  };
}

export interface TrendAnalysisResult {
  trends: Array<{
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
    confidence: number;
    affectedRoutes: string[];
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    confidence: number;
    description: string;
  }>;
  predictions: Array<{
    metric: string;
    predictedValue: number;
    confidence: number;
    timeframe: string;
  }>;
}

export interface UserJourneyAnalysis {
  userId: string;
  sessions: Array<{
    sessionId: string;
    startTime: Date;
    endTime: Date;
    routes: string[];
    entryPoint: string;
    exitPoint: string;
    duration: number;
    completedFlows: string[];
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    averageDuration: number;
    successRate: number;
  }>;
  insights: string[];
  recommendations: string[];
}

export interface NavigationReport {
  id: string;
  title: string;
  timeframe: { start: Date; end: Date };
  summary: {
    totalNavigations: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    topRoutes: Array<{ route: string; views: number }>;
  };
  metrics: NavigationMetrics;
  insights: NavigationInsight[];
  recommendations: NavigationRecommendation[];
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'heatmap';
    title: string;
    data: any;
  }>;
}