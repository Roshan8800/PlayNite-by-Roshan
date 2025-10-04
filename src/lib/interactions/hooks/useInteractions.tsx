import { useEffect, useCallback, useRef, useState } from 'react';
import { InteractionType, InteractionContext, PerformanceMetrics } from '../types';
import { interactionsSystem, trackInteraction } from '../index';
import { ContextUtils, PerformanceUtils, ValidationUtils } from '../utils';

/**
 * Configuration options for the useInteractions hook
 */
export interface UseInteractionsConfig {
  /**
   * Enable automatic interaction tracking
   */
  autoTrack?: boolean;

  /**
   * Interaction types to track automatically
   */
  trackTypes?: InteractionType[];

  /**
   * Custom context provider function
   */
  getContext?: () => InteractionContext;

  /**
   * Performance monitoring interval (ms)
   */
  performanceInterval?: number;

  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * Custom metadata to include with all interactions
   */
  defaultMetadata?: Record<string, any>;
}

/**
 * Return type for the useInteractions hook
 */
export interface UseInteractionsReturn {
  /**
   * Track a specific interaction manually
   */
  trackInteraction: (type: InteractionType, metadata?: Record<string, any>) => Promise<void>;

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics: () => Promise<PerformanceMetrics>;

  /**
   * Get interaction analytics for a time period
   */
  getAnalytics: (startDate: Date, endDate: Date) => Promise<any>;

  /**
   * Current performance metrics state
   */
  performanceMetrics: PerformanceMetrics | null;

  /**
   * Whether the interactions system is initialized
   */
  isInitialized: boolean;

  /**
   * System status information
   */
  systemStatus: any;
}

/**
 * React hook for easy integration with the PlayNite Interactions Optimization System
 *
 * @param config - Configuration options for the hook
 * @returns Object with interaction tracking functions and state
 *
 * @example
 * ```tsx
 * const { trackInteraction, performanceMetrics } = useInteractions({
 *   autoTrack: true,
 *   trackTypes: ['click', 'scroll', 'play'],
 *   enablePerformanceMonitoring: true,
 * });
 *
 * // Manual tracking
 * const handleButtonClick = async () => {
 *   await trackInteraction('click', { buttonId: 'submit-btn' });
 * };
 * ```
 */
export function useInteractions(config: UseInteractionsConfig = {}): UseInteractionsReturn {
  const {
    autoTrack = false,
    trackTypes = ['click', 'scroll', 'hover', 'focus'],
    getContext,
    performanceInterval = 5000,
    enablePerformanceMonitoring = false,
    defaultMetadata = {},
  } = config;

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef<InteractionContext | null>(null);

  /**
   * Initialize the interactions system
   */
  const initialize = useCallback(async () => {
    try {
      await interactionsSystem.initialize();
      setIsInitialized(true);

      // Get initial system status
      const status = await interactionsSystem.getSystemStatus();
      setSystemStatus(status);

    } catch (error) {
      console.error('Failed to initialize interactions system:', error);
    }
  }, []);

  /**
   * Track interaction manually
   */
  const trackInteractionManual = useCallback(async (
    type: InteractionType,
    metadata?: Record<string, any>
  ) => {
    if (!ValidationUtils.isValidInteractionType(type)) {
      console.warn(`Invalid interaction type: ${type}`);
      return;
    }

    try {
      const context = getContext ? getContext() : ContextUtils.getCurrentContext();
      contextRef.current = context;

      const mergedMetadata = { ...defaultMetadata, ...metadata };

      await interactionsSystem.trackInteraction(type, context, mergedMetadata);

    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }, [getContext, defaultMetadata]);

  /**
   * Get current performance metrics
   */
  const getPerformanceMetricsCallback = useCallback(async (): Promise<PerformanceMetrics> => {
    try {
      const metrics = {
        responseTime: performance.now(),
        memoryUsage: PerformanceUtils.getMemoryUsage(),
        cpuUsage: 0, // Would need actual CPU monitoring
        networkLatency: PerformanceUtils.getNetworkConditions().rtt,
        cacheHitRate: 0.85, // Mock value
        errorRate: 0.02, // Mock value
      };
      setPerformanceMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        responseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        cacheHitRate: 0,
        errorRate: 0,
      };
    }
  }, []);

  /**
   * Get analytics data
   */
  const getAnalytics = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      return await interactionsSystem.generateOptimizationReport(startDate, endDate);
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return null;
    }
  }, []);

  /**
   * Set up automatic interaction tracking
   */
  const setupAutoTracking = useCallback(() => {
    if (!autoTrack || typeof document === 'undefined') return;

    const handleInteraction = async (event: Event) => {
      const target = event.target as HTMLElement;

      // Determine interaction type based on event
      let interactionType: InteractionType | null = null;

      if (event.type === 'click') interactionType = 'click';
      else if (event.type === 'scroll') interactionType = 'scroll';
      else if (event.type === 'mouseenter') interactionType = 'hover';
      else if (event.type === 'focus') interactionType = 'focus';
      else if (event.type === 'blur') interactionType = 'blur';
      else if (event.type === 'submit' && target.tagName === 'FORM') interactionType = 'submit';

      if (interactionType && trackTypes.includes(interactionType)) {
        const context = ContextUtils.createContextFromEvent(event);
        const metadata = {
          element: target.tagName.toLowerCase(),
          elementId: target.id,
          elementClass: target.className,
          pageX: 'pageX' in event ? (event as MouseEvent).pageX : undefined,
          pageY: 'pageY' in event ? (event as MouseEvent).pageY : undefined,
        };

        await trackInteractionManual(interactionType, metadata);
      }
    };

    // Add event listeners for tracked interaction types
    trackTypes.forEach(type => {
      switch (type) {
        case 'click':
          document.addEventListener('click', handleInteraction, true);
          break;
        case 'scroll':
          document.addEventListener('scroll', handleInteraction, true);
          break;
        case 'hover':
          document.addEventListener('mouseenter', handleInteraction, true);
          break;
        case 'focus':
          document.addEventListener('focus', handleInteraction, true);
          break;
        case 'blur':
          document.addEventListener('blur', handleInteraction, true);
          break;
        case 'submit':
          document.addEventListener('submit', handleInteraction, true);
          break;
      }
    });

    // Return cleanup function
    return () => {
      trackTypes.forEach(type => {
        switch (type) {
          case 'click':
            document.removeEventListener('click', handleInteraction, true);
            break;
          case 'scroll':
            document.removeEventListener('scroll', handleInteraction, true);
            break;
          case 'hover':
            document.removeEventListener('mouseenter', handleInteraction, true);
            break;
          case 'focus':
            document.removeEventListener('focus', handleInteraction, true);
            break;
          case 'blur':
            document.removeEventListener('blur', handleInteraction, true);
            break;
          case 'submit':
            document.removeEventListener('submit', handleInteraction, true);
            break;
        }
      });
    };
  }, [autoTrack, trackTypes, trackInteractionManual]);

  /**
   * Set up performance monitoring
   */
  const setupPerformanceMonitoring = useCallback(() => {
    if (!enablePerformanceMonitoring) return;

    performanceIntervalRef.current = setInterval(async () => {
      await getPerformanceMetricsCallback();
    }, performanceInterval);

    return () => {
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
        performanceIntervalRef.current = null;
      }
    };
  }, [enablePerformanceMonitoring, performanceInterval, getPerformanceMetricsCallback]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * Set up auto tracking and performance monitoring
   */
  useEffect(() => {
    if (!isInitialized) return;

    const cleanupAutoTracking = setupAutoTracking();
    const cleanupPerformanceMonitoring = setupPerformanceMonitoring();

    return () => {
      if (cleanupAutoTracking) {
        cleanupAutoTracking();
      }
      if (cleanupPerformanceMonitoring) {
        cleanupPerformanceMonitoring();
      }
    };
  }, [isInitialized, setupAutoTracking, setupPerformanceMonitoring]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }
    };
  }, []);

  return {
    trackInteraction: trackInteractionManual,
    getPerformanceMetrics: getPerformanceMetricsCallback,
    getAnalytics,
    performanceMetrics,
    isInitialized,
    systemStatus,
  };
}

/**
 * Hook for tracking specific component interactions
 */
export function useComponentInteractions(
  componentName: string,
  config: UseInteractionsConfig = {}
) {
  const interactions = useInteractions({
    ...config,
    getContext: () => ({
      ...ContextUtils.getCurrentContext(),
      component: componentName,
    }),
  });

  const trackComponentInteraction = useCallback(async (
    type: InteractionType,
    metadata?: Record<string, any>
  ) => {
    await interactions.trackInteraction(type, {
      ...metadata,
      componentName,
    });
  }, [interactions, componentName]);

  return {
    ...interactions,
    trackComponentInteraction,
  };
}

/**
 * Hook for tracking form interactions
 */
export function useFormInteractions(formId: string) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interactions = useInteractions({
    autoTrack: true,
    trackTypes: ['focus', 'blur', 'submit'],
  });

  const trackFieldInteraction = useCallback(async (
    fieldName: string,
    type: 'focus' | 'blur',
    value?: any
  ) => {
    await interactions.trackInteraction(type as any, {
      fieldName,
      formId,
      value,
    });

    // Note: 'change' type removed as it's not in InteractionType enum
    // Field value changes would be handled differently
  }, [interactions, formId]);

  const trackFormSubmit = useCallback(async (success: boolean, error?: string) => {
    setIsSubmitting(true);

    await interactions.trackInteraction('submit', {
      formId,
      success,
      error,
      fieldCount: Object.keys(formData).length,
    });

    setIsSubmitting(false);
  }, [interactions, formId, formData]);

  return {
    ...interactions,
    trackFieldInteraction,
    trackFormSubmit,
    formData,
    isSubmitting,
  };
}

/**
 * Hook for tracking video player interactions
 */
export function useVideoInteractions(videoId: string) {
  const interactions = useInteractions({
    autoTrack: true,
    trackTypes: ['play', 'pause'],
  });

  const trackVideoEvent = useCallback(async (
    type: 'play' | 'pause' | 'error',
    currentTime?: number,
    duration?: number,
    metadata?: Record<string, any>
  ) => {
    await interactions.trackInteraction(type as any, {
      videoId,
      currentTime,
      duration,
      ...metadata,
    });
  }, [interactions, videoId]);

  return {
    ...interactions,
    trackVideoEvent,
  };
}

/**
 * Hook for tracking search interactions
 */
export function useSearchInteractions() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const interactions = useInteractions({
    autoTrack: true,
    trackTypes: ['search'],
  });

  const trackSearch = useCallback(async (
    query: string,
    resultsCount?: number,
    metadata?: Record<string, any>
  ) => {
    await interactions.trackInteraction('search', {
      query,
      resultsCount,
      ...metadata,
    });

    // Add to search history
    setSearchHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 searches
  }, [interactions]);

  return {
    ...interactions,
    trackSearch,
    searchHistory,
  };
}

/**
 * Hook for tracking social interactions
 */
export function useSocialInteractions(contentId: string) {
  const interactions = useInteractions({
    autoTrack: true,
    trackTypes: ['like', 'share', 'comment', 'follow'],
  });

  const trackSocialAction = useCallback(async (
    type: 'like' | 'share' | 'comment' | 'follow' | 'unfollow',
    metadata?: Record<string, any>
  ) => {
    await interactions.trackInteraction(type, {
      contentId,
      ...metadata,
    });
  }, [interactions, contentId]);

  return {
    ...interactions,
    trackSocialAction,
  };
}

/**
 * Higher-order component for automatic interaction tracking
 */
export function withInteractions<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  config?: UseInteractionsConfig
) {
  const WrappedComponent = (props: P) => {
    const interactions = useComponentInteractions(
      componentName || Component.displayName || Component.name || 'UnknownComponent',
      config
    );

    return <Component {...props} {...interactions} />;
  };

  WrappedComponent.displayName = `withInteractions(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default useInteractions;