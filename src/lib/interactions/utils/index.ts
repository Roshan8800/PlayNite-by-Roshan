// Utility functions and helpers for the PlayNite Interactions Optimization System

import { InteractionContext, PerformanceMetrics, InteractionType, DeviceInfo, NetworkInfo } from '../types';

/**
 * Performance measurement utilities
 */
export const PerformanceUtils = {
  /**
   * Measure execution time of a function
   */
  measureExecutionTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  /**
   * Monitor memory usage
   */
  getMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  },

  /**
   * Monitor network conditions
   */
  getNetworkConditions: (): NetworkInfo => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        type: connection.effectiveType === '4g' ? 'fast' :
              connection.effectiveType === '3g' ? 'medium' : 'slow',
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return { type: 'medium', downlink: 5, rtt: 100, saveData: false };
  },

  /**
   * Get device information
   */
  getDeviceInfo: (): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)|Tablet|PlayBook/i.test(userAgent);

    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (isTablet) type = 'tablet';
    else if (isMobile) type = 'mobile';

    return {
      type,
      os: getOperatingSystem(),
      browser: getBrowser(),
      screenSize: { width: window.screen.width, height: window.screen.height },
      memory: (navigator as any).deviceMemory || 4,
      cpuCores: (navigator as any).hardwareConcurrency || 4,
      connection: PerformanceUtils.getNetworkConditions(),
    };
  },

  /**
   * Check if performance optimization is beneficial
   */
  shouldOptimize: (metrics: PerformanceMetrics): boolean => {
    return (
      metrics.memoryUsage > 50 ||
      metrics.responseTime > 200 ||
      metrics.networkLatency > 150 ||
      metrics.errorRate > 0.05
    );
  },
};

/**
 * Context utilities
 */
export const ContextUtils = {
  /**
   * Create interaction context from DOM event
   */
  createContextFromEvent: (event: Event): InteractionContext => {
    const target = event.target as HTMLElement;

    return {
      page: window.location.pathname,
      component: getComponentName(target),
      element: target.tagName.toLowerCase(),
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: Date.now(),
      referrer: document.referrer,
      utm: getUTMParameters(),
    };
  },

  /**
   * Get current context
   */
  getCurrentContext: (): InteractionContext => {
    return {
      page: window.location.pathname,
      component: getCurrentComponent(),
      element: getCurrentElement(),
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: Date.now(),
      referrer: document.referrer,
      utm: getUTMParameters(),
    };
  },

  /**
   * Check if context indicates mobile device
   */
  isMobileContext: (context: InteractionContext): boolean => {
    return context.viewport.width < 768;
  },

  /**
   * Check if context indicates slow connection
   */
  isSlowConnection: (context: InteractionContext): boolean => {
    return PerformanceUtils.getNetworkConditions().type === 'slow';
  },
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate interaction type
   */
  isValidInteractionType: (type: string): type is InteractionType => {
    const validTypes: InteractionType[] = [
      'click', 'scroll', 'hover', 'focus', 'blur', 'submit', 'search',
      'play', 'pause', 'share', 'like', 'comment', 'follow', 'unfollow',
      'bookmark', 'report', 'settings_change', 'navigation', 'error',
      'load', 'unload'
    ];
    return validTypes.includes(type as InteractionType);
  },

  /**
   * Validate performance metrics
   */
  isValidPerformanceMetrics: (metrics: any): metrics is PerformanceMetrics => {
    return (
      typeof metrics === 'object' &&
      typeof metrics.responseTime === 'number' &&
      typeof metrics.memoryUsage === 'number' &&
      typeof metrics.cpuUsage === 'number' &&
      typeof metrics.networkLatency === 'number' &&
      typeof metrics.cacheHitRate === 'number' &&
      typeof metrics.errorRate === 'number'
    );
  },

  /**
   * Validate interaction context
   */
  isValidInteractionContext: (context: any): context is InteractionContext => {
    return (
      typeof context === 'object' &&
      typeof context.page === 'string' &&
      typeof context.component === 'string' &&
      typeof context.element === 'string' &&
      typeof context.userAgent === 'string' &&
      typeof context.viewport === 'object' &&
      typeof context.timestamp === 'number'
    );
  },
};

/**
 * Data transformation utilities
 */
export const DataUtils = {
  /**
   * Transform interaction data for analytics
   */
  transformForAnalytics: (event: any) => {
    return {
      type: event.type,
      timestamp: event.timestamp,
      context: event.context,
      performance: event.performance,
      metadata: event.metadata,
    };
  },

  /**
   * Transform performance metrics for storage
   */
  transformMetricsForStorage: (metrics: PerformanceMetrics) => {
    return {
      response_time: metrics.responseTime,
      memory_usage: metrics.memoryUsage,
      cpu_usage: metrics.cpuUsage,
      network_latency: metrics.networkLatency,
      cache_hit_rate: metrics.cacheHitRate,
      error_rate: metrics.errorRate,
      recorded_at: Date.now(),
    };
  },

  /**
   * Transform analytics data for export
   */
  transformForExport: (data: any) => {
    return {
      ...data,
      exported_at: new Date().toISOString(),
      version: '1.0.0',
    };
  },
};

/**
 * Cache utilities
 */
export const CacheUtils = {
  /**
   * Generate cache key from interaction data
   */
  generateCacheKey: (type: InteractionType, context: InteractionContext): string => {
    return `${type}-${context.page}-${context.component}-${context.element}`;
  },

  /**
   * Check if data should be cached
   */
  shouldCache: (type: InteractionType, context: InteractionContext): boolean => {
    const cacheableTypes: InteractionType[] = ['click', 'scroll', 'search', 'navigation'];
    return cacheableTypes.includes(type) && !ContextUtils.isMobileContext(context);
  },

  /**
   * Get cache TTL based on interaction type
   */
  getCacheTTL: (type: InteractionType): number => {
    const ttlMap: Record<InteractionType, number> = {
      click: 5 * 60 * 1000, // 5 minutes
      scroll: 10 * 60 * 1000, // 10 minutes
      search: 15 * 60 * 1000, // 15 minutes
      play: 30 * 60 * 1000, // 30 minutes
      navigation: 20 * 60 * 1000, // 20 minutes
      hover: 2 * 60 * 1000, // 2 minutes
      focus: 2 * 60 * 1000, // 2 minutes
      blur: 2 * 60 * 1000, // 2 minutes
      submit: 10 * 60 * 1000, // 10 minutes
      pause: 30 * 60 * 1000, // 30 minutes
      share: 60 * 60 * 1000, // 1 hour
      like: 60 * 60 * 1000, // 1 hour
      comment: 60 * 60 * 1000, // 1 hour
      follow: 60 * 60 * 1000, // 1 hour
      unfollow: 60 * 60 * 1000, // 1 hour
      bookmark: 60 * 60 * 1000, // 1 hour
      report: 24 * 60 * 60 * 1000, // 24 hours
      settings_change: 60 * 60 * 1000, // 1 hour
      error: 24 * 60 * 60 * 1000, // 24 hours
      load: 30 * 60 * 1000, // 30 minutes
      unload: 30 * 60 * 1000, // 30 minutes
    };

    return ttlMap[type] || 10 * 60 * 1000; // Default 10 minutes
  },
};

/**
 * String utilities
 */
export const StringUtils = {
  /**
   * Generate unique ID
   */
  generateId: (prefix: string = ''): string => {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Truncate string with ellipsis
   */
  truncate: (str: string, length: number): string => {
    if (str.length <= length) return str;
    return str.substr(0, length - 3) + '...';
  },

  /**
   * Convert camelCase to snake_case
   */
  camelToSnake: (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },

  /**
   * Convert snake_case to camelCase
   */
  snakeToCamel: (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  },
};

/**
 * Array utilities
 */
export const ArrayUtils = {
  /**
   * Group array by key
   */
  groupBy: <T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Get unique values from array
   */
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  /**
   * Calculate average of array
   */
  average: (array: number[]): number => {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  },
};

/**
 * Date utilities
 */
export const DateUtils = {
  /**
   * Format date for display
   */
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  /**
   * Get time ago string
   */
  timeAgo: (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return `${diffSeconds}s ago`;
  },

  /**
   * Check if date is within range
   */
  isWithinRange: (date: Date, start: Date, end: Date): boolean => {
    return date >= start && date <= end;
  },

  /**
   * Get date range for period
   */
  getDateRange: (period: 'day' | 'week' | 'month' | 'year'): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(end.getDate() - 1);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start, end };
  },
};

/**
 * Helper functions
 */
function getOperatingSystem(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

function getBrowser(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getComponentName(element: HTMLElement): string {
  // Try to get component name from various sources
  return element.getAttribute('data-component') ||
         element.closest('[data-component]')?.getAttribute('data-component') ||
         'unknown';
}

function getCurrentComponent(): string {
  if (typeof document !== 'undefined') {
    const element = document.activeElement as HTMLElement;
    return getComponentName(element);
  }
  return 'unknown';
}

function getCurrentElement(): string {
  if (typeof document !== 'undefined') {
    const element = document.activeElement;
    return element?.tagName.toLowerCase() || 'unknown';
  }
  return 'unknown';
}

function getUTMParameters(): Record<string, string> | undefined {
  if (typeof window === 'undefined') return undefined;

  const urlParams = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  for (const [key, value] of urlParams.entries()) {
    if (key.startsWith('utm_')) {
      utm[key] = value;
    }
  }

  return Object.keys(utm).length > 0 ? utm : undefined;
}

/**
 * Debounce utility
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Throttle utility
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone utility
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;

  const clonedObj = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Safe JSON parse utility
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Local storage utilities with error handling
 */
export const StorageUtils = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? safeJsonParse(item, fallback) : fallback;
    } catch {
      return fallback;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Error handling utilities
 */
export const ErrorUtils = {
  /**
   * Wrap function with error handling
   */
  withErrorHandling: <T extends (...args: any[]) => any>(
    fn: T,
    fallback?: (...args: Parameters<T>) => ReturnType<T>
  ): T => {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        console.error('Error in wrapped function:', error);
        if (fallback) {
          return fallback(...args);
        }
        throw error;
      }
    }) as T;
  },

  /**
   * Retry function with exponential backoff
   */
  withRetry: <T extends (...args: any[]) => any>(
    fn: T,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): T => {
    return (async (...args: Parameters<T>) => {
      let lastError: Error;

      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error as Error;

          if (i === maxRetries) {
            throw lastError;
          }

          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError!;
    }) as T;
  },
};

/**
 * Export all utilities as a single object for convenience
 */
export const InteractionUtils = {
  Performance: PerformanceUtils,
  Context: ContextUtils,
  Validation: ValidationUtils,
  Data: DataUtils,
  Cache: CacheUtils,
  String: StringUtils,
  Array: ArrayUtils,
  Date: DateUtils,
  Storage: StorageUtils,
  Error: ErrorUtils,
  debounce,
  throttle,
  deepClone,
  safeJsonParse,
};