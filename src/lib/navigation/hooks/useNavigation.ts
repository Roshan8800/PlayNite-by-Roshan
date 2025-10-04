/**
 * @fileOverview React hook for navigation management
 *
 * Provides easy access to navigation functionality in React components
 * with intelligent routing, analytics, and contextual navigation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  NavigationState,
  NavigationContext,
  RouteInfo,
  NavigationAnalytics,
  UseNavigationOptions,
  UseNavigationReturn,
  NavigateOptions
} from '../types';
import { navigationManager } from '../core/NavigationManager';

export function useNavigation(options: UseNavigationOptions = {}): UseNavigationReturn {
  const router = useRouter();
  const pathname = usePathname();
  const [navigationState, setNavigationState] = useState<NavigationState>(navigationManager.getCurrentState());
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<NavigationAnalytics | undefined>();
  const mountedRef = useRef(true);

  const {
    enableTracking = true,
    enablePrefetching = true,
    enableContextualNavigation = true,
    trackPerformance = true,
    trackUserEngagement = true
  } = options;

  // Update state when navigation manager changes
  useEffect(() => {
    const updateState = () => {
      if (mountedRef.current) {
        setNavigationState(navigationManager.getCurrentState());
      }
    };

    // Listen for navigation events
    navigationManager.on('navigation_change', updateState);
    navigationManager.on('context_change', updateState);

    // Initial state update
    updateState();

    return () => {
      mountedRef.current = false;
      navigationManager.off('navigation_change', updateState);
      navigationManager.off('context_change', updateState);
    };
  }, []);

  // Load analytics data
  useEffect(() => {
    if (enableTracking && navigationState.context.userId) {
      const loadAnalytics = async () => {
        try {
          const timeframe = {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date()
          };

          const result = await navigationManager.getNavigationAnalytics(timeframe, navigationState.context.userId);
          if (result.success && result.data && mountedRef.current) {
            setAnalytics(result.data);
          }
        } catch (error) {
          console.error('Failed to load navigation analytics:', error);
        }
      };

      loadAnalytics();
    }
  }, [enableTracking, navigationState.context.userId]);

  // Track route changes for analytics
  useEffect(() => {
    if (enableTracking && pathname) {
      const trackRouteChange = async () => {
        try {
          await navigationManager.navigate(pathname, {
            metadata: {
              source: 'router',
              timestamp: new Date()
            }
          });
        } catch (error) {
          console.error('Failed to track route change:', error);
        }
      };

      trackRouteChange();
    }
  }, [pathname, enableTracking]);

  // Navigation function
  const navigate = useCallback(async (
    route: string,
    navigateOptions: NavigateOptions = {}
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await navigationManager.navigate(route, {
        replace: navigateOptions.replace,
        metadata: {
          ...navigateOptions.metadata,
          source: 'useNavigation',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
        },
        context: navigateOptions.context
      });

      if (result.success) {
        // Use Next.js router for actual navigation
        if (navigateOptions.replace) {
          router.replace(route);
        } else {
          router.push(route);
        }
      } else {
        throw new Error(result.error?.message || 'Navigation failed');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Go back function
  const goBack = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (window.history.length > 1) {
        router.back();
        // Track back navigation
        if (enableTracking) {
          await navigationManager.navigate(navigationState.previousRoute || '/', {
            metadata: {
              navigationType: 'back',
              source: 'useNavigation'
            }
          });
        }
      }
    } catch (error) {
      console.error('Go back error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router, navigationState.previousRoute, enableTracking]);

  // Go forward function
  const goForward = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      router.forward();
    } catch (error) {
      console.error('Go forward error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Refresh function
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      router.refresh();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Update context function
  const updateContext = useCallback(async (context: Partial<NavigationContext>): Promise<void> => {
    try {
      await navigationManager.updateContext(context);
    } catch (error) {
      console.error('Context update error:', error);
    }
  }, []);

  // Update preferences function
  const updatePreferences = useCallback(async (preferences: Partial<NavigationState['preferences']>): Promise<void> => {
    try {
      const newState = {
        ...navigationState,
        preferences: { ...navigationState.preferences, ...preferences }
      };
      setNavigationState(newState);

      // Persist preferences if user is logged in
      if (navigationState.context.userId && typeof window !== 'undefined') {
        localStorage.setItem(
          `navigation_preferences_${navigationState.context.userId}`,
          JSON.stringify(newState.preferences)
        );
      }
    } catch (error) {
      console.error('Preferences update error:', error);
    }
  }, [navigationState]);

  // Get route info function
  const getRouteInfo = useCallback((route: string): RouteInfo | undefined => {
    return navigationManager.getRouteInfo(route);
  }, []);

  // Get recommended routes function
  const getRecommendedRoutes = useCallback((): string[] => {
    // For now, return static recommendations based on current context
    // In a real implementation, this would use the navigation manager
    const recommendations: string[] = [];

    if (navigationState.currentRoute === '/home') {
      recommendations.push('/reels', '/social', '/images');
    } else if (navigationState.currentRoute === '/reels') {
      recommendations.push('/home', '/social', '/stories');
    } else if (navigationState.currentRoute === '/social') {
      recommendations.push('/home', '/reels', '/settings');
    }

    return recommendations;
  }, [navigationState.currentRoute]);

  // Prefetch route function
  const prefetchRoute = useCallback(async (route: string): Promise<void> => {
    if (enablePrefetching) {
      try {
        // Use Next.js router prefetch
        router.prefetch(route);
      } catch (error) {
        console.error('Prefetch error:', error);
      }
    }
  }, [router, enablePrefetching]);

  // Get performance metrics function
  const getPerformanceMetrics = useCallback((): Record<string, number> => {
    const performance = navigationState.performance;
    return {
      averageLoadTime: performance.averageNavigationTime,
      prefetchAccuracy: performance.prefetchAccuracy,
      cacheHitRate: Object.values(performance.cacheHitRates).reduce((a, b) => a + b, 0) / Math.max(Object.values(performance.cacheHitRates).length, 1),
      errorRate: Object.values(performance.errorRates).reduce((a, b) => a + b, 0) / Math.max(Object.values(performance.errorRates).length, 1)
    };
  }, [navigationState.performance]);

  // Check if route is active function
  const isRouteActive = useCallback((route: string): boolean => {
    return navigationState.currentRoute === route;
  }, [navigationState.currentRoute]);

  // Get route metadata function
  const getRouteMetadata = useCallback((route: string): RouteInfo['metadata'] => {
    const routeInfo = navigationManager.getRouteInfo(route);
    return routeInfo?.metadata || {};
  }, []);

  return {
    // Current state
    currentRoute: navigationState.currentRoute,
    previousRoute: navigationState.previousRoute,
    navigationState,

    // Navigation actions
    navigate,
    goBack,
    goForward,
    refresh,

    // Context and preferences
    context: navigationState.context,
    updateContext,
    preferences: navigationState.preferences,
    updatePreferences,

    // Analytics and insights
    analytics,
    getRouteInfo,
    getRecommendedRoutes,

    // Performance
    prefetchRoute,
    getPerformanceMetrics,

    // Utilities
    isRouteActive,
    getRouteMetadata
  };
}

export default useNavigation;