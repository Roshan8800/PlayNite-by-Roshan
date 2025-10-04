export interface PerformanceReport {
  id: string;
  timestamp: number;
  period: {
    start: number;
    end: number;
    duration: number;
  };
  summary: {
    overallScore: number;
    totalOptimizations: number;
    performanceGains: number;
    resourceSavings: number;
  };
  metrics: {
    cache: CacheAnalytics;
    lazyLoading: LazyLoadingAnalytics;
    optimization: OptimizationAnalytics;
    resource: ResourceAnalytics;
  };
  recommendations: PerformanceRecommendation[];
  trends: PerformanceTrend[];
}

export interface CacheAnalytics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  totalRequests: number;
  cacheSize: number;
  evictions: number;
  layerStats: Record<string, {
    size: number;
    hitRate: number;
    requests: number;
  }>;
}

export interface LazyLoadingAnalytics {
  totalElements: number;
  loadedElements: number;
  loadingQueueSize: number;
  averageLoadTime: number;
  hitRate: number;
  userEngagement: number;
  viewportEfficiency: number;
}

export interface OptimizationAnalytics {
  totalOptimizations: number;
  automaticOptimizations: number;
  manualOptimizations: number;
  successRate: number;
  averageImprovement: number;
  resourceImpact: {
    memoryReduction: number;
    networkReduction: number;
    batterySavings: number;
  };
}

export interface ResourceAnalytics {
  memoryUsage: {
    current: number;
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  networkUsage: {
    requestsPerSecond: number;
    averageLatency: number;
    bandwidthUsage: number;
    efficiency: number;
  };
  batteryImpact: {
    consumptionRate: number;
    estimatedLife: number;
    optimizationSavings: number;
  };
}

export interface PerformanceRecommendation {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'optimization';
  category: 'cache' | 'lazy-loading' | 'optimization' | 'resource' | 'code';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  action: string;
  expectedImprovement: number;
  priority: number;
}

export interface PerformanceTrend {
  metric: string;
  period: string;
  values: Array<{
    timestamp: number;
    value: number;
  }>;
  trend: 'improving' | 'degrading' | 'stable';
  change: number;
  significance: 'low' | 'medium' | 'high';
}

export interface AnalyticsConfig {
  retentionPeriod: number; // days
  samplingRate: number; // 0-1
  enableRealTime: boolean;
  enableHistorical: boolean;
  enablePredictions: boolean;
  reportInterval: number; // minutes
  maxDataPoints: number;
}

export class PerformanceAnalytics {
  private dataPoints: Map<string, any[]> = new Map();
  private reports: PerformanceReport[] = [];
  private config: AnalyticsConfig;
  private intervals: NodeJS.Timeout[] = [];
  private isCollecting = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      retentionPeriod: 30,
      samplingRate: 1.0,
      enableRealTime: true,
      enableHistorical: true,
      enablePredictions: true,
      reportInterval: 60,
      maxDataPoints: 10000,
      ...config
    };

    this.startCollection();
    this.startReporting();
    this.startCleanup();
  }

  /**
   * Record performance metric
   */
  recordMetric(category: string, metric: string, value: any, metadata?: any): void {
    if (Math.random() > this.config.samplingRate) return;

    const dataPoint = {
      timestamp: Date.now(),
      category,
      metric,
      value,
      metadata
    };

    if (!this.dataPoints.has(category)) {
      this.dataPoints.set(category, []);
    }

    const categoryData = this.dataPoints.get(category)!;
    categoryData.push(dataPoint);

    // Limit data points per category
    if (categoryData.length > this.config.maxDataPoints) {
      categoryData.splice(0, categoryData.length - this.config.maxDataPoints);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(startTime?: number, endTime?: number): Promise<PerformanceReport> {
    const end = endTime || Date.now();
    const start = startTime || (end - 24 * 60 * 60 * 1000); // Default to last 24 hours

    const report: PerformanceReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      period: {
        start,
        end,
        duration: end - start
      },
      summary: {
        overallScore: 0,
        totalOptimizations: 0,
        performanceGains: 0,
        resourceSavings: 0
      },
      metrics: {
        cache: this.analyzeCachePerformance(start, end),
        lazyLoading: this.analyzeLazyLoadingPerformance(start, end),
        optimization: this.analyzeOptimizationPerformance(start, end),
        resource: this.analyzeResourceUsage(start, end)
      },
      recommendations: [],
      trends: []
    };

    // Calculate summary metrics
    report.summary = this.calculateSummaryMetrics(report.metrics);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.metrics);

    // Analyze trends
    report.trends = this.analyzeTrends();

    // Store report
    this.reports.push(report);

    // Limit stored reports
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-50);
    }

    return report;
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    currentMetrics: any;
    recentTrends: PerformanceTrend[];
    activeRecommendations: PerformanceRecommendation[];
    alerts: Array<{
      type: 'critical' | 'warning' | 'info';
      message: string;
      timestamp: number;
    }>;
  } {
    return {
      currentMetrics: this.getCurrentMetrics(),
      recentTrends: this.getRecentTrends(),
      activeRecommendations: this.getActiveRecommendations(),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Export performance data
   */
  async exportData(format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    const data = {
      reports: this.reports,
      currentData: Object.fromEntries(this.dataPoints),
      config: this.config,
      exportedAt: Date.now()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Get performance predictions
   */
  async getPredictions(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<{
    predictedMetrics: any;
    confidence: number;
    recommendations: string[];
  }> {
    if (!this.config.enablePredictions) {
      throw new Error('Predictions are disabled');
    }

    const prediction = await this.generatePredictions(timeframe);
    return prediction;
  }

  /**
   * Analyze cache performance
   */
  private analyzeCachePerformance(start: number, end: number): CacheAnalytics {
    const cacheData = this.getDataInRange('cache', start, end);

    const totalRequests = cacheData.length;
    const hits = cacheData.filter(d => d.metadata?.hit === true).length;
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

    const responseTimes = cacheData
      .map(d => d.value)
      .filter(v => typeof v === 'number');

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      hitRate,
      missRate: 1 - hitRate,
      averageResponseTime,
      totalRequests,
      cacheSize: this.getCurrentCacheSize(),
      evictions: cacheData.filter(d => d.metadata?.evicted === true).length,
      layerStats: this.getCacheLayerStats()
    };
  }

  /**
   * Analyze lazy loading performance
   */
  private analyzeLazyLoadingPerformance(start: number, end: number): LazyLoadingAnalytics {
    const lazyData = this.getDataInRange('lazy-loading', start, end);

    const totalElements = lazyData.filter(d => d.metric === 'total-elements').length;
    const loadedElements = lazyData.filter(d => d.metric === 'loaded-elements').length;

    const loadTimes = lazyData
      .filter(d => d.metric === 'load-time')
      .map(d => d.value)
      .filter(v => typeof v === 'number');

    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;

    return {
      totalElements,
      loadedElements,
      loadingQueueSize: this.getCurrentLoadingQueueSize(),
      averageLoadTime,
      hitRate: this.calculateLazyLoadingHitRate(lazyData),
      userEngagement: this.calculateUserEngagement(lazyData),
      viewportEfficiency: this.calculateViewportEfficiency(lazyData)
    };
  }

  /**
   * Analyze optimization performance
   */
  private analyzeOptimizationPerformance(start: number, end: number): OptimizationAnalytics {
    const optimizationData = this.getDataInRange('optimization', start, end);

    const totalOptimizations = optimizationData.length;
    const automaticOptimizations = optimizationData.filter(d => d.metadata?.automatic === true).length;

    const improvements = optimizationData
      .filter(d => d.metadata?.improvement)
      .map(d => d.metadata.improvement);

    const averageImprovement = improvements.length > 0
      ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
      : 0;

    return {
      totalOptimizations,
      automaticOptimizations,
      manualOptimizations: totalOptimizations - automaticOptimizations,
      successRate: this.calculateOptimizationSuccessRate(optimizationData),
      averageImprovement,
      resourceImpact: this.calculateResourceImpact(optimizationData)
    };
  }

  /**
   * Analyze resource usage
   */
  private analyzeResourceUsage(start: number, end: number): ResourceAnalytics {
    const memoryData = this.getDataInRange('memory', start, end);
    const networkData = this.getDataInRange('network', start, end);
    const batteryData = this.getDataInRange('battery', start, end);

    const memoryValues = memoryData.map(d => d.value).filter(v => typeof v === 'number');
    const networkValues = networkData.map(d => d.value).filter(v => typeof v === 'number');
    const batteryValues = batteryData.map(d => d.value).filter(v => typeof v === 'number');

    return {
      memoryUsage: {
        current: memoryValues[memoryValues.length - 1] || 0,
        average: memoryValues.length > 0 ? memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length : 0,
        peak: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
        trend: this.calculateTrend(memoryValues)
      },
      networkUsage: {
        requestsPerSecond: networkValues.length > 0 ? networkValues.reduce((sum, val) => sum + val, 0) / networkValues.length : 0,
        averageLatency: this.calculateAverageLatency(networkData),
        bandwidthUsage: this.calculateBandwidthUsage(networkData),
        efficiency: this.calculateNetworkEfficiency(networkData)
      },
      batteryImpact: {
        consumptionRate: batteryValues.length > 0 ? batteryValues.reduce((sum, val) => sum + val, 0) / batteryValues.length : 0,
        estimatedLife: this.estimateBatteryLife(batteryValues),
        optimizationSavings: this.calculateOptimizationSavings()
      }
    };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(metrics: PerformanceReport['metrics']): PerformanceReport['summary'] {
    const cacheScore = metrics.cache.hitRate * 100;
    const lazyScore = metrics.lazyLoading.hitRate * 100;
    const optimizationScore = metrics.optimization.successRate * 100;
    const resourceScore = this.calculateResourceScore(metrics.resource);

    const overallScore = (cacheScore + lazyScore + optimizationScore + resourceScore) / 4;

    return {
      overallScore: Math.round(overallScore),
      totalOptimizations: metrics.optimization.totalOptimizations,
      performanceGains: metrics.optimization.averageImprovement,
      resourceSavings: metrics.resource.batteryImpact.optimizationSavings
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceReport['metrics']): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Cache recommendations
    if (metrics.cache.hitRate < 0.7) {
      recommendations.push({
        id: 'cache-optimization',
        type: 'warning',
        category: 'cache',
        title: 'Improve Cache Hit Rate',
        description: 'Cache hit rate is below optimal levels. Consider adjusting cache strategies.',
        impact: 'high',
        effort: 'medium',
        action: 'Review and optimize cache layer configuration',
        expectedImprovement: 25,
        priority: 8
      });
    }

    // Lazy loading recommendations
    if (metrics.lazyLoading.averageLoadTime > 2000) {
      recommendations.push({
        id: 'lazy-loading-speed',
        type: 'optimization',
        category: 'lazy-loading',
        title: 'Optimize Lazy Loading Speed',
        description: 'Lazy loading times are slower than optimal. Consider preloading critical content.',
        impact: 'medium',
        effort: 'low',
        action: 'Implement predictive loading for above-the-fold content',
        expectedImprovement: 40,
        priority: 6
      });
    }

    // Memory recommendations
    if (metrics.resource.memoryUsage.trend === 'increasing') {
      recommendations.push({
        id: 'memory-management',
        type: 'critical',
        category: 'resource',
        title: 'Memory Usage Increasing',
        description: 'Memory usage is trending upward. Immediate action required.',
        impact: 'high',
        effort: 'medium',
        action: 'Implement memory cleanup and optimize resource usage',
        expectedImprovement: 30,
        priority: 10
      });
    }

    // Network recommendations
    if (metrics.resource.networkUsage.averageLatency > 300) {
      recommendations.push({
        id: 'network-optimization',
        type: 'warning',
        category: 'resource',
        title: 'High Network Latency',
        description: 'Network latency is above acceptable levels.',
        impact: 'medium',
        effort: 'low',
        action: 'Enable caching and optimize network requests',
        expectedImprovement: 50,
        priority: 7
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const [category, data] of this.dataPoints) {
      if (data.length < 10) continue;

      // Group data points by hour
      const hourlyData = this.groupDataByHour(data, now - oneDay);

      for (const metric in hourlyData) {
        const values = hourlyData[metric];
        if (values.length < 2) continue;

        const recent = values.slice(-12); // Last 12 hours
        const older = values.slice(0, -12); // Previous period

        if (older.length === 0) continue;

        const recentAvg = recent.reduce((sum, val) => sum + val.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val.value, 0) / older.length;
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        trends.push({
          metric: `${category}.${metric}`,
          period: '24h',
          values: values.map(v => ({ timestamp: v.timestamp, value: v.value })),
          trend: this.determineTrend(change),
          change,
          significance: this.determineSignificance(Math.abs(change))
        });
      }
    }

    return trends;
  }

  /**
   * Start data collection
   */
  private startCollection(): void {
    if (this.isCollecting) return;

    this.isCollecting = true;

    // Collect performance metrics every 10 seconds
    const collectionInterval = setInterval(() => {
      this.collectCurrentMetrics();
    }, 10000);

    this.intervals.push(collectionInterval);
  }

  /**
   * Start automated reporting
   */
  private startReporting(): void {
    if (!this.config.enableHistorical) return;

    // Generate reports every hour
    const reportInterval = setInterval(() => {
      this.generateReport(Date.now() - 60 * 60 * 1000, Date.now());
    }, this.config.reportInterval * 60 * 1000);

    this.intervals.push(reportInterval);
  }

  /**
   * Start cleanup tasks
   */
  private startCleanup(): void {
    // Clean up old data daily
    const cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);

    this.intervals.push(cleanupInterval);
  }

  /**
   * Collect current performance metrics
   */
  private collectCurrentMetrics(): void {
    // Memory metrics
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory', 'usage', memory.usedJSHeapSize / (1024 * 1024));
      this.recordMetric('memory', 'total', memory.totalJSHeapSize / (1024 * 1024));
      this.recordMetric('memory', 'limit', memory.jsHeapSizeLimit / (1024 * 1024));
    }

    // Navigation timing
    if (performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        this.recordMetric('navigation', 'load-time', nav.loadEventEnd - nav.loadEventStart);
        this.recordMetric('navigation', 'dom-ready', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart);
      }
    }

    // Resource timing
    if (performance.getEntriesByType) {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      resourceEntries.forEach(entry => {
        this.recordMetric('network', 'latency', entry.responseEnd - entry.requestStart, {
          url: entry.name,
          type: this.getResourceType(entry.name)
        });
      });
    }
  }

  /**
   * Get data points in time range
   */
  private getDataInRange(category: string, start: number, end: number): any[] {
    const data = this.dataPoints.get(category) || [];
    return data.filter(point => point.timestamp >= start && point.timestamp <= end);
  }

  /**
   * Calculate resource score
   */
  private calculateResourceScore(resource: ResourceAnalytics): number {
    const memoryScore = Math.max(0, 100 - (resource.memoryUsage.current / 500) * 100); // Assuming 500MB max
    const networkScore = Math.max(0, 100 - (resource.networkUsage.averageLatency / 1000) * 100);
    const batteryScore = Math.max(0, 100 - resource.batteryImpact.consumptionRate * 10);

    return (memoryScore + networkScore + batteryScore) / 3;
  }

  /**
   * Calculate lazy loading hit rate
   */
  private calculateLazyLoadingHitRate(data: any[]): number {
    const loaded = data.filter(d => d.metric === 'loaded' && d.value === true).length;
    const total = data.filter(d => d.metric === 'registered').length;
    return total > 0 ? loaded / total : 0;
  }

  /**
   * Calculate user engagement
   */
  private calculateUserEngagement(data: any[]): number {
    const engagementData = data.filter(d => d.metric === 'engagement');
    if (engagementData.length === 0) return 0;

    return engagementData.reduce((sum, d) => sum + d.value, 0) / engagementData.length;
  }

  /**
   * Calculate viewport efficiency
   */
  private calculateViewportEfficiency(data: any[]): number {
    const efficiencyData = data.filter(d => d.metric === 'viewport-efficiency');
    if (efficiencyData.length === 0) return 0;

    return efficiencyData.reduce((sum, d) => sum + d.value, 0) / efficiencyData.length;
  }

  /**
   * Calculate optimization success rate
   */
  private calculateOptimizationSuccessRate(data: any[]): number {
    const successful = data.filter(d => d.metadata?.success === true).length;
    return data.length > 0 ? successful / data.length : 0;
  }

  /**
   * Calculate resource impact
   */
  private calculateResourceImpact(data: any[]): OptimizationAnalytics['resourceImpact'] {
    const impacts = data
      .filter(d => d.metadata?.resourceImpact)
      .map(d => d.metadata.resourceImpact);

    if (impacts.length === 0) {
      return { memoryReduction: 0, networkReduction: 0, batterySavings: 0 };
    }

    return {
      memoryReduction: impacts.reduce((sum, impact) => sum + (impact.memoryReduction || 0), 0) / impacts.length,
      networkReduction: impacts.reduce((sum, impact) => sum + (impact.networkReduction || 0), 0) / impacts.length,
      batterySavings: impacts.reduce((sum, impact) => sum + (impact.batterySavings || 0), 0) / impacts.length
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(data: any[]): number {
    const latencies = data
      .filter(d => d.metric === 'latency')
      .map(d => d.value)
      .filter(v => typeof v === 'number');

    return latencies.length > 0
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      : 0;
  }

  /**
   * Calculate bandwidth usage
   */
  private calculateBandwidthUsage(data: any[]): number {
    const sizes = data
      .filter(d => d.metric === 'size')
      .map(d => d.value)
      .filter(v => typeof v === 'number');

    return sizes.length > 0
      ? sizes.reduce((sum, size) => sum + size, 0) / sizes.length
      : 0;
  }

  /**
   * Calculate network efficiency
   */
  private calculateNetworkEfficiency(data: any[]): number {
    const cacheHits = data.filter(d => d.metadata?.cached === true).length;
    const total = data.length;
    return total > 0 ? cacheHits / total : 0;
  }

  /**
   * Estimate battery life
   */
  private estimateBatteryLife(values: number[]): number {
    if (values.length === 0) return 0;

    const avgConsumption = values.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.max(0, 8 - avgConsumption * 2); // Rough estimate in hours
  }

  /**
   * Calculate optimization savings
   */
  private calculateOptimizationSavings(): number {
    // This would calculate actual savings from optimizations
    return 15; // Mock value
  }

  /**
   * Get current cache size
   */
  private getCurrentCacheSize(): number {
    // This would get actual cache size from cache manager
    return 50 * 1024 * 1024; // Mock 50MB
  }

  /**
   * Get cache layer statistics
   */
  private getCacheLayerStats(): Record<string, any> {
    return {
      'layer1': { size: 10 * 1024 * 1024, hitRate: 0.8, requests: 100 },
      'layer2': { size: 25 * 1024 * 1024, hitRate: 0.6, requests: 200 },
      'layer3': { size: 50 * 1024 * 1024, hitRate: 0.4, requests: 300 }
    };
  }

  /**
   * Get current loading queue size
   */
  private getCurrentLoadingQueueSize(): number {
    return 5; // Mock value
  }

  /**
   * Get current metrics snapshot
   */
  private getCurrentMetrics(): any {
    return {
      timestamp: Date.now(),
      memory: this.getMemoryUsage(),
      network: this.getNetworkInfo(),
      performance: this.getPerformanceInfo()
    };
  }

  /**
   * Get recent trends
   */
  private getRecentTrends(): PerformanceTrend[] {
    return this.analyzeTrends().slice(0, 5);
  }

  /**
   * Get active recommendations
   */
  private getActiveRecommendations(): PerformanceRecommendation[] {
    return this.generateRecommendations({
      cache: this.analyzeCachePerformance(Date.now() - 60 * 60 * 1000, Date.now()),
      lazyLoading: this.analyzeLazyLoadingPerformance(Date.now() - 60 * 60 * 1000, Date.now()),
      optimization: this.analyzeOptimizationPerformance(Date.now() - 60 * 60 * 1000, Date.now()),
      resource: this.analyzeResourceUsage(Date.now() - 60 * 60 * 1000, Date.now())
    }).slice(0, 5);
  }

  /**
   * Get active alerts
   */
  private getActiveAlerts(): Array<{
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }> {
    const alerts = [];

    if (this.getMemoryUsage() > 400) {
      alerts.push({
        type: 'critical' as const,
        message: 'High memory usage detected',
        timestamp: Date.now()
      });
    }

    return alerts;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Group data by hour
   */
  private groupDataByHour(data: any[], startTime: number): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    data.forEach(point => {
      if (point.timestamp < startTime) return;

      const hour = new Date(point.timestamp).getHours();
      const key = `${point.metric}_${hour}`;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(point);
    });

    return groups;
  }

  /**
   * Determine trend direction
   */
  private determineTrend(change: number): 'improving' | 'degrading' | 'stable' {
    if (change > 5) return 'improving';
    if (change < -5) return 'degrading';
    return 'stable';
  }

  /**
   * Determine significance level
   */
  private determineSignificance(change: number): 'low' | 'medium' | 'high' {
    if (change > 20) return 'high';
    if (change > 10) return 'medium';
    return 'low';
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get network information
   */
  private getNetworkInfo(): any {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        type: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }
    return { type: 'unknown' };
  }

  /**
   * Get performance information
   */
  private getPerformanceInfo(): any {
    return {
      timing: performance.timing ? {
        navigationStart: performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd
      } : null,
      navigation: performance.getEntriesByType('navigation')[0] || null
    };
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'stylesheet';
    if (url.includes('image') || url.match(/\.(jpg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('font') || url.match(/\.(woff|woff2|ttf)$/)) return 'font';
    return 'other';
  }

  /**
   * Convert to CSV format
   */
  private convertToCSV(data: any): string {
    // Simple CSV conversion
    return JSON.stringify(data);
  }

  /**
   * Convert to XML format
   */
  private convertToXML(data: any): string {
    // Simple XML conversion
    return `<performance-data>${JSON.stringify(data)}</performance-data>`;
  }

  /**
   * Generate predictions
   */
  private async generatePredictions(timeframe: string): Promise<any> {
    // Simple prediction algorithm
    return {
      predictedMetrics: {},
      confidence: 0.7,
      recommendations: ['Continue current optimization strategies']
    };
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);

    for (const [category, data] of this.dataPoints) {
      const filtered = data.filter(point => point.timestamp > cutoff);
      this.dataPoints.set(category, filtered);
    }

    // Clean up old reports
    this.reports = this.reports.filter(report => report.timestamp > cutoff);
  }

  /**
   * Cleanup intervals
   */
  cleanup(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isCollecting = false;
  }
}