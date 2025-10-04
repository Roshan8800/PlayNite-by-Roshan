/**
 * @fileOverview Navigation middleware types and interfaces
 */

import { NextRequest, NextResponse } from 'next/server';
import { NavigationContext, NavigationError, NavigationState } from './index';

export interface NavigationMiddlewareConfig {
  enableRouteProtection: boolean;
  enablePerformanceMonitoring: boolean;
  enableAnalyticsTracking: boolean;
  enableContextEnhancement: boolean;
  enableErrorHandling: boolean;
  enableRedirectOptimization: boolean;
}

export interface MiddlewareContext {
  request: NextRequest;
  response?: NextResponse;
  navigationState?: NavigationState;
  context: NavigationContext;
  startTime: number;
}

export interface RouteProtectionRule {
  route: string;
  pattern: string;
  requiresAuth: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
  customValidator?: (context: MiddlewareContext) => Promise<boolean>;
}

export interface PerformanceMonitoringRule {
  route: string;
  pattern: string;
  maxLoadTime: number;
  maxBundleSize: number;
  enablePrefetching: boolean;
  cacheStrategy?: 'memory' | 'disk' | 'network';
}

export interface AnalyticsTrackingRule {
  route: string;
  pattern: string;
  trackPageView: boolean;
  trackPerformance: boolean;
  trackUserEngagement: boolean;
  customMetrics?: string[];
}

export interface ContextEnhancementRule {
  route: string;
  pattern: string;
  contextProviders: ContextProvider[];
  cacheContext: boolean;
  contextTTL: number;
}

export interface ContextProvider {
  name: string;
  provider: (request: NextRequest) => Promise<Partial<NavigationContext>>;
  priority: number;
  cacheable: boolean;
}

export interface ErrorHandlingRule {
  route: string;
  pattern: string;
  fallbackRoute?: string;
  showErrorPage: boolean;
  logError: boolean;
  notifyOnError: boolean;
}

export interface RedirectOptimizationRule {
  fromRoute: string;
  toRoute: string;
  condition?: (context: MiddlewareContext) => boolean;
  preserveQuery?: boolean;
  preserveFragment?: boolean;
  statusCode: 301 | 302 | 308;
}

export interface MiddlewareResult {
  shouldContinue: boolean;
  response?: NextResponse;
  error?: NavigationError;
  metadata?: Record<string, any>;
  performanceMetrics?: {
    processingTime: number;
    memoryUsage?: number;
    cacheHits?: number;
  };
}