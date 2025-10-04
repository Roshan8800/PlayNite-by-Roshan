'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Loader2, RefreshCw } from 'lucide-react';
import {
  PanelType,
  PanelConfiguration,
  Permission,
  PanelAnalytics,
  PanelSection
} from '../types';
import { panelManager } from '../core/PanelManager';
import { panelSecurityManager } from '../security/PanelSecurityManager';

/**
 * BasePanel Component
 * Provides common functionality for all panel components including
 * permission checking, loading states, and error handling
 */
interface BasePanelProps {
  panelType: PanelType;
  userId: string;
  sessionId?: string;
  children: React.ReactNode;
  className?: string;
  onPermissionDenied?: () => void;
  onError?: (error: Error) => void;
}

interface PanelState {
  isLoading: boolean;
  hasPermission: boolean;
  isEnabled: boolean;
  error: string | null;
  config: PanelConfiguration | null;
  analytics: PanelAnalytics | null;
}

export function BasePanel({
  panelType,
  userId,
  sessionId,
  children,
  className = '',
  onPermissionDenied,
  onError
}: BasePanelProps) {
  const [state, setState] = useState<PanelState>({
    isLoading: true,
    hasPermission: false,
    isEnabled: false,
    error: null,
    config: null,
    analytics: null
  });

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    initializePanel();
  }, [panelType, userId, sessionId]);

  const initializePanel = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Check if panel is enabled
      const isEnabled = panelManager.isPanelEnabled(panelType);
      if (!isEnabled) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isEnabled: false,
          error: 'Panel is currently disabled'
        }));
        return;
      }

      // 2. Validate access permissions
      const accessResult = await panelSecurityManager.validatePanelAccess(userId, panelType, {
        ipAddress: '127.0.0.1', // In real app, get from request
        userAgent: navigator.userAgent,
        sessionId
      });

      if (!accessResult.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasPermission: false,
          error: accessResult.reason
        }));

        if (onPermissionDenied) {
          onPermissionDenied();
        }
        return;
      }

      // 3. Get panel configuration
      const config = panelManager.getPanelConfiguration(panelType);
      if (!config) {
        throw new Error('Panel configuration not found');
      }

      // 4. Open panel session for analytics
      const sessionOpened = panelManager.openPanel(userId, panelType, sessionId);
      if (!sessionOpened) {
        throw new Error('Failed to open panel session');
      }

      // 5. Get initial analytics data
      const analytics = panelManager.getPanelAnalytics(userId, panelType);

      setState({
        isLoading: false,
        hasPermission: true,
        isEnabled: true,
        error: null,
        config,
        analytics: analytics[0] || null
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    initializePanel();
  };

  const handleRefresh = () => {
    initializePanel();
  };

  // Loading state
  if (state.isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{state.error}</span>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry {retryCount > 0 && `(${retryCount}/3)`}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No permission state
  if (!state.hasPermission) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You don't have permission to access this panel.</span>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Check Again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Panel disabled state
  if (!state.isEnabled) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This panel is currently disabled and unavailable.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Render panel with configuration
  return (
    <div className={`panel-container ${className}`}>
      {/* Panel Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {state.config?.title}
              {state.config?.requiredPermissions && state.config.requiredPermissions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {state.config.requiredPermissions.length} permissions
                </Badge>
              )}
            </h1>
            {state.config?.description && (
              <p className="text-muted-foreground mt-2">
                {state.config.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Panel Content */}
      <div className="panel-content">
        {children}
      </div>

      {/* Panel Footer with Analytics Info */}
      {state.analytics && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                Session started: {state.analytics.startTime.toLocaleTimeString()}
              </span>
              {state.analytics.endTime && (
                <span>
                  Duration: {Math.round((state.analytics.endTime.getTime() - state.analytics.startTime.getTime()) / 1000)}s
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Actions: {state.analytics.actions.length}</span>
              <Badge variant="outline" className="text-xs">
                Load: {Math.round(state.analytics.performanceMetrics.loadTime)}ms
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Panel Section Component
 * Renders individual sections within a panel with permission checking
 */
interface PanelSectionProps {
  section: PanelSection;
  userPermissions: Permission[];
  children: React.ReactNode;
  className?: string;
}

export function PanelSectionComponent({
  section,
  userPermissions,
  children,
  className = ''
}: PanelSectionProps) {
  // Check if user has required permissions for this section
  const hasPermission = section.permissions.length === 0 ||
    section.permissions.every(permission => userPermissions.includes(permission));

  if (!hasPermission) {
    return null; // Hide sections user doesn't have access to
  }

  if (!section.isVisible) {
    return null; // Hide invisible sections
  }

  return (
    <div
      className={`panel-section ${section.isCollapsible ? 'collapsible' : ''} ${className}`}
      style={{
        gridColumn: `span ${section.position.width}`,
        gridRow: `span ${section.position.height}`
      }}
    >
      {section.title && (
        <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
      )}
      <div className="section-content">
        {children}
      </div>
    </div>
  );
}

/**
 * Permission Gate Component
 * Conditionally renders content based on user permissions
 */
interface PermissionGateProps {
  permissions: Permission[];
  userPermissions: Permission[];
  requireAll?: boolean; // true = need all permissions, false = need any
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permissions,
  userPermissions,
  requireAll = true,
  fallback = null,
  children
}: PermissionGateProps) {
  const hasAccess = requireAll
    ? permissions.every(p => userPermissions.includes(p))
    : permissions.some(p => userPermissions.includes(p));

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Panel Action Tracker Hook
 * Tracks user actions within panels for analytics
 */
export function usePanelActionTracker(sessionId: string, panelType: PanelType) {
  const trackAction = (action: string, metadata?: Record<string, any>) => {
    panelManager.recordAction(sessionId, action, metadata);
  };

  const trackPerformance = (metric: string, value: number) => {
    trackAction('performance_metric', { metric, value });
  };

  return { trackAction, trackPerformance };
}

export default BasePanel;