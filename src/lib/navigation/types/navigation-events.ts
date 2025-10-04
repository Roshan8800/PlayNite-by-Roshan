/**
 * @fileOverview Navigation event types and interfaces
 */

import { NavigationContext, NavigationEvent, NavigationError } from './index';

export interface NavigationEventHandler {
  (event: NavigationEvent): Promise<void> | void;
}

export interface NavigationEventEmitter {
  on(eventType: string, handler: NavigationEventHandler): void;
  off(eventType: string, handler: NavigationEventHandler): void;
  emit(event: NavigationEvent): Promise<void>;
}

export interface RouteChangeEvent extends NavigationEvent {
  type: 'route_change';
  fromRoute: string;
  toRoute: string;
  navigationType: 'push' | 'replace' | 'back' | 'forward';
  trigger: 'user' | 'programmatic' | 'browser';
}

export interface RoutePrefetchEvent extends NavigationEvent {
  type: 'route_prefetch';
  routes: string[];
  strategy: 'hover' | 'viewport' | 'intent' | 'context';
  confidence: number;
}

export interface RouteErrorEvent extends NavigationEvent {
  type: 'route_error';
  error: NavigationError;
  retryCount: number;
  fallbackRoute?: string;
}

export interface NavigationIntentEvent extends NavigationEvent {
  type: 'navigation_intent';
  intent: string;
  confidence: number;
  context: NavigationContext;
  suggestedRoutes: string[];
}

export interface ContextChangeEvent extends NavigationEvent {
  type: 'context_change';
  previousContext: NavigationContext;
  newContext: NavigationContext;
  changedFields: string[];
}

export interface PerformanceEvent extends NavigationEvent {
  type: 'performance';
  metric: 'load_time' | 'bundle_size' | 'cache_hit' | 'prefetch_accuracy';
  value: number;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface UserEngagementEvent extends NavigationEvent {
  type: 'user_engagement';
  engagementType: 'scroll' | 'click' | 'hover' | 'focus' | 'time_spent';
  element: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface NavigationFlowEvent extends NavigationEvent {
  type: 'flow_event';
  flowId: string;
  stepId: string;
  action: 'enter' | 'exit' | 'complete' | 'abandon' | 'error';
  flowProgress: number;
  timeInFlow: number;
}