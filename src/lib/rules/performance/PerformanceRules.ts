import { RuleDefinition, RuleContext, ValidationResult, ValidationError, ValidationWarning } from '../types';

/**
 * Performance validation rules for optimization, caching, and resource management
 */
export class PerformanceRules {
  /**
   * Rule: Content optimization validation
   */
  static readonly CONTENT_OPTIMIZATION: RuleDefinition = {
    id: 'performance_content_optimization',
    name: 'Content Optimization Validation',
    description: 'Validates content for optimal performance and loading',
    category: 'performance',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.content',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.content',
        config: {
          maxImageSize: 2 * 1024 * 1024, // 2MB
          maxVideoSize: 100 * 1024 * 1024, // 100MB
          requireCompression: true,
          optimizeForWeb: true,
          generateThumbnails: true,
          lazyLoadingEnabled: true,
          cdnOptimization: true
        }
      }
    ],
    tags: ['optimization', 'content', 'loading']
  };

  /**
   * Rule: Caching strategy validation
   */
  static readonly CACHING_STRATEGY: RuleDefinition = {
    id: 'performance_caching_strategy',
    name: 'Caching Strategy Validation',
    description: 'Validates caching strategies and cache management',
    category: 'performance',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'data.cache',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.cache',
        config: {
          maxCacheSize: 100 * 1024 * 1024, // 100MB
          maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
          cacheCompressionEnabled: true,
          cacheInvalidationStrategy: 'LRU',
          requireCacheHeaders: true,
          enableCacheAnalytics: true,
          maxConcurrentCacheOperations: 100
        }
      }
    ],
    tags: ['caching', 'strategy', 'optimization']
  };

  /**
   * Rule: Resource management validation
   */
  static readonly RESOURCE_MANAGEMENT: RuleDefinition = {
    id: 'performance_resource_management',
    name: 'Resource Management Validation',
    description: 'Validates resource usage and management',
    category: 'performance',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.resources',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.resources',
        config: {
          maxMemoryUsage: 512 * 1024 * 1024, // 512MB
          maxCPUUsage: 80, // percentage
          maxConcurrentConnections: 1000,
          maxFileDescriptors: 10000,
          requireResourceMonitoring: true,
          enableAutoScaling: true,
          resourceCleanupEnabled: true,
          maxRequestTimeout: 30000 // 30 seconds
        }
      }
    ],
    tags: ['resources', 'management', 'monitoring']
  };

  /**
   * Rule: Database performance validation
   */
  static readonly DATABASE_PERFORMANCE: RuleDefinition = {
    id: 'performance_database_optimization',
    name: 'Database Performance Validation',
    description: 'Validates database queries and performance',
    category: 'performance',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'data.query',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.query',
        config: {
          maxQueryTime: 1000, // 1 second
          requireQueryOptimization: true,
          maxResultSetSize: 10000,
          requireConnectionPooling: true,
          enableQueryCaching: true,
          validateIndexes: true,
          preventNPlusOneQueries: true,
          requirePaginationForLarge: true
        }
      }
    ],
    tags: ['database', 'queries', 'optimization']
  };

  /**
   * Rule: API performance validation
   */
  static readonly API_PERFORMANCE: RuleDefinition = {
    id: 'performance_api_optimization',
    name: 'API Performance Validation',
    description: 'Validates API performance and response times',
    category: 'performance',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.api',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.api',
        config: {
          maxResponseTime: 2000, // 2 seconds
          requireResponseCompression: true,
          enableAPICaching: true,
          maxPayloadSize: 10 * 1024 * 1024, // 10MB
          requireRateLimiting: true,
          validatePagination: true,
          enableRequestBatching: true,
          requireHealthChecks: true
        }
      }
    ],
    tags: ['api', 'performance', 'response-time']
  };

  /**
   * Rule: Frontend performance validation
   */
  static readonly FRONTEND_PERFORMANCE: RuleDefinition = {
    id: 'performance_frontend_optimization',
    name: 'Frontend Performance Validation',
    description: 'Validates frontend performance and optimization',
    category: 'performance',
    priority: 80,
    enabled: true,
    conditions: [
      {
        field: 'data.frontend',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.frontend',
        config: {
          maxBundleSize: 5 * 1024 * 1024, // 5MB
          requireCodeSplitting: true,
          enableLazyLoading: true,
          requireImageOptimization: true,
          maxFirstContentfulPaint: 2000, // 2 seconds
          maxLargestContentfulPaint: 4000, // 4 seconds
          requireServiceWorker: true,
          enableCachingHeaders: true
        }
      }
    ],
    tags: ['frontend', 'optimization', 'loading']
  };

  /**
   * Rule: Network performance validation
   */
  static readonly NETWORK_PERFORMANCE: RuleDefinition = {
    id: 'performance_network_optimization',
    name: 'Network Performance Validation',
    description: 'Validates network performance and connectivity',
    category: 'performance',
    priority: 75,
    enabled: true,
    conditions: [
      {
        field: 'data.network',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.network',
        config: {
          maxLatency: 100, // milliseconds
          minBandwidth: 1 * 1024 * 1024, // 1Mbps
          requireConnectionPooling: true,
          enableRequestCompression: true,
          maxConcurrentRequests: 6,
          requireRetryLogic: true,
          enableRequestQueuing: true,
          validateTimeouts: true
        }
      }
    ],
    tags: ['network', 'connectivity', 'latency']
  };

  /**
   * Rule: Monitoring and analytics validation
   */
  static readonly MONITORING_ANALYTICS: RuleDefinition = {
    id: 'performance_monitoring_analytics',
    name: 'Monitoring and Analytics Validation',
    description: 'Validates performance monitoring and analytics',
    category: 'performance',
    priority: 70,
    enabled: true,
    conditions: [
      {
        field: 'data.monitoring',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.monitoring',
        config: {
          requirePerformanceMetrics: true,
          enableErrorTracking: true,
          trackResourceUsage: true,
          enableRealUserMonitoring: true,
          requireAlertingRules: true,
          maxMetricsRetention: 90, // days
          enableAnomalyDetection: true,
          requirePerformanceBudgets: true
        }
      }
    ],
    tags: ['monitoring', 'analytics', 'metrics']
  };

  /**
   * Get all performance rules
   */
  static getAllRules(): RuleDefinition[] {
    return [
      this.CONTENT_OPTIMIZATION,
      this.CACHING_STRATEGY,
      this.RESOURCE_MANAGEMENT,
      this.DATABASE_PERFORMANCE,
      this.API_PERFORMANCE,
      this.FRONTEND_PERFORMANCE,
      this.NETWORK_PERFORMANCE,
      this.MONITORING_ANALYTICS
    ];
  }

  /**
   * Get rules by tag
   */
  static getRulesByTag(tag: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.tags?.includes(tag)
    );
  }

  /**
   * Get rules by category
   */
  static getRulesByCategory(category: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.category === category
    );
  }
}

/**
 * Performance validation utilities
 */
export class PerformanceValidationUtils {
  /**
   * Validate content optimization
   */
  static validateContentOptimization(content: {
    type: string;
    size: number;
    dimensions?: { width: number; height: number };
  }, config: {
    maxImageSize?: number;
    maxVideoSize?: number;
    requireCompression?: boolean;
    optimizeForWeb?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxImageSize = 2 * 1024 * 1024,
      maxVideoSize = 100 * 1024 * 1024,
      requireCompression = true,
      optimizeForWeb = true
    } = config;

    // Size validation based on content type
    if (content.type.startsWith('image/')) {
      if (content.size > maxImageSize) {
        errors.push({
          field: 'content.size',
          code: 'IMAGE_TOO_LARGE',
          message: `Image size exceeds maximum allowed size of ${Math.round(maxImageSize / 1024 / 1024)}MB`,
          severity: 'error',
          value: content.size,
          constraints: { maxImageSize }
        });
      }

      // Dimension validation for images
      if (content.dimensions) {
        const { width, height } = content.dimensions;
        if (width > 4096 || height > 4096) {
          warnings.push({
            field: 'content.dimensions',
            code: 'LARGE_DIMENSIONS',
            message: 'Image dimensions are very large and may impact performance',
            suggestion: 'Consider resizing for better performance'
          });
        }
      }
    }

    if (content.type.startsWith('video/')) {
      if (content.size > maxVideoSize) {
        errors.push({
          field: 'content.size',
          code: 'VIDEO_TOO_LARGE',
          message: `Video size exceeds maximum allowed size of ${Math.round(maxVideoSize / 1024 / 1024)}MB`,
          severity: 'error',
          value: content.size,
          constraints: { maxVideoSize }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate caching strategy
   */
  static validateCachingStrategy(cacheConfig: {
    size: number;
    maxAge: number;
    compressionEnabled: boolean;
  }, config: {
    maxCacheSize?: number;
    maxCacheAge?: number;
    cacheCompressionEnabled?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxCacheSize = 100 * 1024 * 1024,
      maxCacheAge = 24 * 60 * 60 * 1000,
      cacheCompressionEnabled = true
    } = config;

    // Cache size validation
    if (cacheConfig.size > maxCacheSize) {
      errors.push({
        field: 'cache.size',
        code: 'CACHE_TOO_LARGE',
        message: `Cache size exceeds maximum allowed size of ${Math.round(maxCacheSize / 1024 / 1024)}MB`,
        severity: 'error',
        value: cacheConfig.size,
        constraints: { maxCacheSize }
      });
    }

    // Cache age validation
    if (cacheConfig.maxAge > maxCacheAge) {
      warnings.push({
        field: 'cache.maxAge',
        code: 'CACHE_AGE_TOO_LONG',
        message: 'Cache age is very long and may serve stale content',
        suggestion: 'Consider reducing cache age for better freshness'
      });
    }

    // Compression recommendation
    if (cacheCompressionEnabled && !cacheConfig.compressionEnabled) {
      warnings.push({
        field: 'cache.compression',
        code: 'COMPRESSION_DISABLED',
        message: 'Cache compression is disabled',
        suggestion: 'Enable compression to reduce cache size'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate resource usage
   */
  static validateResourceUsage(usage: {
    memory: number;
    cpu: number;
    connections: number;
    fileDescriptors: number;
  }, config: {
    maxMemoryUsage?: number;
    maxCPUUsage?: number;
    maxConcurrentConnections?: number;
    maxFileDescriptors?: number;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxMemoryUsage = 512 * 1024 * 1024,
      maxCPUUsage = 80,
      maxConcurrentConnections = 1000,
      maxFileDescriptors = 10000
    } = config;

    // Memory usage validation
    if (usage.memory > maxMemoryUsage) {
      errors.push({
        field: 'resources.memory',
        code: 'MEMORY_USAGE_EXCEEDED',
        message: `Memory usage exceeds maximum allowed usage of ${Math.round(maxMemoryUsage / 1024 / 1024)}MB`,
        severity: 'error',
        value: usage.memory,
        constraints: { maxMemoryUsage }
      });
    }

    // CPU usage validation
    if (usage.cpu > maxCPUUsage) {
      errors.push({
        field: 'resources.cpu',
        code: 'CPU_USAGE_EXCEEDED',
        message: `CPU usage exceeds maximum allowed usage of ${maxCPUUsage}%`,
        severity: 'error',
        value: usage.cpu,
        constraints: { maxCPUUsage }
      });
    }

    // Connection validation
    if (usage.connections > maxConcurrentConnections) {
      errors.push({
        field: 'resources.connections',
        code: 'TOO_MANY_CONNECTIONS',
        message: `Number of concurrent connections exceeds maximum allowed`,
        severity: 'error',
        value: usage.connections,
        constraints: { maxConcurrentConnections }
      });
    }

    // File descriptor validation
    if (usage.fileDescriptors > maxFileDescriptors) {
      errors.push({
        field: 'resources.fileDescriptors',
        code: 'TOO_MANY_FILE_DESCRIPTORS',
        message: `Number of file descriptors exceeds maximum allowed`,
        severity: 'error',
        value: usage.fileDescriptors,
        constraints: { maxFileDescriptors }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate database query performance
   */
  static validateQueryPerformance(query: {
    executionTime: number;
    resultCount: number;
    hasIndex?: boolean;
    isPaginated?: boolean;
  }, config: {
    maxQueryTime?: number;
    maxResultSetSize?: number;
    requireQueryOptimization?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxQueryTime = 1000,
      maxResultSetSize = 10000,
      requireQueryOptimization = true
    } = config;

    // Query time validation
    if (query.executionTime > maxQueryTime) {
      errors.push({
        field: 'query.executionTime',
        code: 'QUERY_TOO_SLOW',
        message: `Query execution time exceeds maximum allowed time of ${maxQueryTime}ms`,
        severity: 'error',
        value: query.executionTime,
        constraints: { maxQueryTime }
      });
    }

    // Result set size validation
    if (query.resultCount > maxResultSetSize) {
      errors.push({
        field: 'query.resultCount',
        code: 'RESULT_SET_TOO_LARGE',
        message: `Query result set exceeds maximum allowed size`,
        severity: 'error',
        value: query.resultCount,
        constraints: { maxResultSetSize }
      });
    }

    // Index recommendation
    if (requireQueryOptimization && !query.hasIndex && query.executionTime > 100) {
      warnings.push({
        field: 'query.optimization',
        code: 'MISSING_INDEX',
        message: 'Query may benefit from proper indexing',
        suggestion: 'Consider adding appropriate indexes for better performance'
      });
    }

    // Pagination recommendation
    if (!query.isPaginated && query.resultCount > 1000) {
      warnings.push({
        field: 'query.pagination',
        code: 'LARGE_RESULT_SET',
        message: 'Large result set without pagination may impact performance',
        suggestion: 'Consider implementing pagination for large datasets'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate API performance
   */
  static validateAPIPerformance(apiCall: {
    responseTime: number;
    payloadSize: number;
    isCompressed?: boolean;
    hasPagination?: boolean;
  }, config: {
    maxResponseTime?: number;
    maxPayloadSize?: number;
    requireResponseCompression?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxResponseTime = 2000,
      maxPayloadSize = 10 * 1024 * 1024,
      requireResponseCompression = true
    } = config;

    // Response time validation
    if (apiCall.responseTime > maxResponseTime) {
      errors.push({
        field: 'api.responseTime',
        code: 'RESPONSE_TOO_SLOW',
        message: `API response time exceeds maximum allowed time of ${maxResponseTime}ms`,
        severity: 'error',
        value: apiCall.responseTime,
        constraints: { maxResponseTime }
      });
    }

    // Payload size validation
    if (apiCall.payloadSize > maxPayloadSize) {
      errors.push({
        field: 'api.payloadSize',
        code: 'PAYLOAD_TOO_LARGE',
        message: `API payload size exceeds maximum allowed size`,
        severity: 'error',
        value: apiCall.payloadSize,
        constraints: { maxPayloadSize }
      });
    }

    // Compression recommendation
    if (requireResponseCompression && !apiCall.isCompressed && apiCall.payloadSize > 1024 * 1024) {
      warnings.push({
        field: 'api.compression',
        code: 'COMPRESSION_RECOMMENDED',
        message: 'Large payload without compression detected',
        suggestion: 'Enable response compression for better performance'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}