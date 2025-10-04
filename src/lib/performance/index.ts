// Advanced Performance Optimization Systems
import { AdvancedCacheManager } from './AdvancedCacheManager';
import { IntelligentLazyLoader } from './IntelligentLazyLoader';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { PerformanceAnalytics } from './PerformanceAnalytics';

export { AdvancedCacheManager, type MultiLayerCacheConfig, type CacheEntry, type CacheStats } from './AdvancedCacheManager';
export { IntelligentLazyLoader, type LazyLoadConfig, type LazyLoadElement, type UserBehaviorPattern } from './IntelligentLazyLoader';
export { PerformanceOptimizer, type PerformanceConfig, type PerformanceMetrics, type OptimizationRule } from './PerformanceOptimizer';
export { PerformanceAnalytics, type AnalyticsConfig, type PerformanceReport, type PerformanceRecommendation } from './PerformanceAnalytics';

// Re-export enhanced performance optimization service
export { PerformanceOptimizationService, performanceOptimizationService } from '../services/performance-optimization-service';

// Convenience exports for common use cases
export const PerformanceSystems = {
  cache: {
    AdvancedCacheManager
  },
  loading: {
    IntelligentLazyLoader
  },
  optimization: {
    PerformanceOptimizer
  },
  analytics: {
    PerformanceAnalytics
  }
} as const;

// Performance presets for different use cases
export const PerformancePresets = {
  highPerformance: {
    cache: {
      layers: [
        { name: 'memory', maxSize: 100 * 1024 * 1024, maxAge: 30 * 60 * 1000, strategy: 'LRU' as const },
        { name: 'disk', maxSize: 500 * 1024 * 1024, maxAge: 60 * 60 * 1000, strategy: 'LFU' as const }
      ],
      enableCompression: true,
      enableEncryption: false
    },
    lazyLoading: {
      predictiveLoading: true,
      userBehaviorAware: true,
      priorityWeights: { viewport: 0.4, userBehavior: 0.3, contentType: 0.2, networkSpeed: 0.1, batteryLevel: 0.0 }
    },
    optimization: {
      targetFPS: 60,
      adaptiveQuality: false,
      backgroundProcessing: true
    }
  },

  batterySaving: {
    cache: {
      layers: [
        { name: 'memory', maxSize: 25 * 1024 * 1024, maxAge: 15 * 60 * 1000, strategy: 'LRU' as const }
      ],
      enableCompression: true,
      enableEncryption: false
    },
    lazyLoading: {
      predictiveLoading: false,
      userBehaviorAware: false,
      priorityWeights: { viewport: 0.6, userBehavior: 0.0, contentType: 0.2, networkSpeed: 0.1, batteryLevel: 0.1 }
    },
    optimization: {
      targetFPS: 30,
      adaptiveQuality: true,
      backgroundProcessing: false
    }
  },

  slowNetwork: {
    cache: {
      layers: [
        { name: 'memory', maxSize: 50 * 1024 * 1024, maxAge: 60 * 60 * 1000, strategy: 'Adaptive' as const },
        { name: 'disk', maxSize: 200 * 1024 * 1024, maxAge: 24 * 60 * 60 * 1000, strategy: 'LFU' as const }
      ],
      enableCompression: true,
      enableEncryption: false
    },
    lazyLoading: {
      predictiveLoading: false,
      userBehaviorAware: true,
      priorityWeights: { viewport: 0.5, userBehavior: 0.1, contentType: 0.2, networkSpeed: 0.2, batteryLevel: 0.0 }
    },
    optimization: {
      targetFPS: 30,
      adaptiveQuality: true,
      backgroundProcessing: true
    }
  }
} as const;

// Utility functions for performance monitoring
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
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  },

  /**
   * Monitor network conditions
   */
  getNetworkConditions: () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        speed: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return { speed: 'unknown' };
  },

  /**
   * Check if performance optimization is beneficial
   */
  shouldOptimize: (metrics: any): boolean => {
    return (
      metrics.memoryUsage > 400 ||
      metrics.fps < 50 ||
      metrics.networkLatency > 200 ||
      metrics.cacheHitRate < 0.7
    );
  }
} as const;