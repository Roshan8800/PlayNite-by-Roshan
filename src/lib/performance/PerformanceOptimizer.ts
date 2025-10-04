export interface PerformanceConfig {
  targetFPS: number;
  maxMemoryUsage: number; // MB
  maxNetworkRequests: number;
  cacheOptimization: boolean;
  lazyLoading: boolean;
  codeSplitting: boolean;
  resourceHints: boolean;
  adaptiveQuality: boolean;
  backgroundProcessing: boolean;
  predictiveLoading: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  concurrentRequests: number;
  batteryLevel: number;
  networkType: string;
  deviceMemory: number;
  hardwareConcurrency: number;
}

export interface OptimizationRule {
  id: string;
  name: string;
  condition: (metrics: PerformanceMetrics) => boolean;
  action: (config: PerformanceConfig) => void;
  priority: number;
  cooldown: number; // Minimum time between executions in ms
  lastExecuted?: number;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'config' | 'code' | 'resource' | 'behavior';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  action: () => void | Promise<void>;
}

export interface PerformanceProfile {
  name: string;
  conditions: Partial<PerformanceMetrics>;
  optimizations: Partial<PerformanceConfig>;
  priority: number;
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private rules: OptimizationRule[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  private profiles: PerformanceProfile[] = [];
  private observers: PerformanceObserver[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private isOptimizing = false;
  private optimizationHistory: Array<{
    timestamp: number;
    ruleId: string;
    metrics: PerformanceMetrics;
    action: string;
  }> = [];

  constructor(initialConfig: Partial<PerformanceConfig> = {}) {
    this.config = {
      targetFPS: 60,
      maxMemoryUsage: 500, // 500MB
      maxNetworkRequests: 6,
      cacheOptimization: true,
      lazyLoading: true,
      codeSplitting: true,
      resourceHints: true,
      adaptiveQuality: true,
      backgroundProcessing: true,
      predictiveLoading: true,
      ...initialConfig
    };

    this.metrics = this.initializeMetrics();
    this.initializeRules();
    this.initializeProfiles();
    this.startMonitoring();
  }

  /**
   * Analyze current performance and apply optimizations
   */
  async optimize(): Promise<{
    optimizations: string[];
    suggestions: OptimizationSuggestion[];
    metrics: PerformanceMetrics;
  }> {
    if (this.isOptimizing) {
      return { optimizations: [], suggestions: [], metrics: this.metrics };
    }

    this.isOptimizing = true;

    try {
      // Update current metrics
      await this.updateMetrics();

      // Apply automatic optimizations
      const optimizations = await this.applyAutomaticOptimizations();

      // Generate suggestions
      const suggestions = this.generateSuggestions();

      // Apply profile-based optimizations
      await this.applyProfileOptimizations();

      this.isOptimizing = false;

      return {
        optimizations,
        suggestions,
        metrics: { ...this.metrics }
      };

    } catch (error) {
      console.error('Performance optimization failed:', error);
      this.isOptimizing = false;
      return { optimizations: [], suggestions: [], metrics: this.metrics };
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Add custom optimization rule
   */
  addRule(rule: OptimizationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove optimization rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Add performance profile
   */
  addProfile(profile: PerformanceProfile): void {
    this.profiles.push(profile);
    this.profiles.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(limit: number = 50): typeof this.optimizationHistory {
    return this.optimizationHistory.slice(-limit);
  }

  /**
   * Force garbage collection if available
   */
  async forceGarbageCollection(): Promise<void> {
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources(): Promise<void> {
    if (!this.config.resourceHints) return;

    const criticalResources = this.identifyCriticalResources();

    for (const resource of criticalResources) {
      await this.preloadResource(resource);
    }
  }

  /**
   * Optimize bundle loading
   */
  async optimizeBundleLoading(): Promise<void> {
    if (!this.config.codeSplitting) return;

    // Analyze current bundle
    const bundleAnalysis = await this.analyzeBundle();

    // Apply code splitting optimizations
    await this.applyCodeSplitting(bundleAnalysis);

    // Optimize chunk loading
    this.optimizeChunkLoading();
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      memoryUsage: 0,
      networkLatency: 0,
      cacheHitRate: 0,
      loadTime: 0,
      renderTime: 0,
      bundleSize: 0,
      concurrentRequests: 0,
      batteryLevel: 1,
      networkType: 'unknown',
      deviceMemory: 4,
      hardwareConcurrency: 4
    };
  }

  /**
   * Initialize optimization rules
   */
  private initializeRules(): void {
    // Memory optimization rule
    this.addRule({
      id: 'memory-optimization',
      name: 'Memory Usage Optimization',
      condition: (metrics) => metrics.memoryUsage > this.config.maxMemoryUsage * 0.8,
      action: (config) => {
        config.maxMemoryUsage *= 0.9; // Reduce memory limit
        this.forceGarbageCollection();
      },
      priority: 10,
      cooldown: 30000
    });

    // FPS optimization rule
    this.addRule({
      id: 'fps-optimization',
      name: 'Frame Rate Optimization',
      condition: (metrics) => metrics.fps < this.config.targetFPS * 0.8,
      action: (config) => {
        config.targetFPS = Math.max(30, config.targetFPS * 0.9);
        config.adaptiveQuality = true;
      },
      priority: 9,
      cooldown: 10000
    });

    // Network optimization rule
    this.addRule({
      id: 'network-optimization',
      name: 'Network Condition Optimization',
      condition: (metrics) => metrics.networkLatency > 200 || metrics.concurrentRequests > this.config.maxNetworkRequests,
      action: (config) => {
        config.maxNetworkRequests = Math.max(2, config.maxNetworkRequests * 0.8);
        config.predictiveLoading = false;
      },
      priority: 8,
      cooldown: 15000
    });

    // Battery optimization rule
    this.addRule({
      id: 'battery-optimization',
      name: 'Battery Level Optimization',
      condition: (metrics) => metrics.batteryLevel < 0.2,
      action: (config) => {
        config.backgroundProcessing = false;
        config.predictiveLoading = false;
        config.adaptiveQuality = true;
      },
      priority: 7,
      cooldown: 60000
    });

    // Cache optimization rule
    this.addRule({
      id: 'cache-optimization',
      name: 'Cache Performance Optimization',
      condition: (metrics) => metrics.cacheHitRate < 0.5,
      action: (config) => {
        config.cacheOptimization = true;
        config.lazyLoading = true;
      },
      priority: 6,
      cooldown: 30000
    });
  }

  /**
   * Initialize performance profiles
   */
  private initializeProfiles(): void {
    // High performance profile
    this.addProfile({
      name: 'high-performance',
      conditions: {
        deviceMemory: 8,
        hardwareConcurrency: 8,
        networkType: 'fast'
      },
      optimizations: {
        targetFPS: 60,
        maxMemoryUsage: 800,
        maxNetworkRequests: 10,
        cacheOptimization: true,
        predictiveLoading: true,
        adaptiveQuality: false
      },
      priority: 10
    });

    // Low power profile
    this.addProfile({
      name: 'low-power',
      conditions: {
        batteryLevel: 0.3,
        deviceMemory: 4
      },
      optimizations: {
        targetFPS: 30,
        maxMemoryUsage: 300,
        maxNetworkRequests: 3,
        backgroundProcessing: false,
        predictiveLoading: false,
        adaptiveQuality: true
      },
      priority: 9
    });

    // Slow network profile
    this.addProfile({
      name: 'slow-network',
      conditions: {
        networkLatency: 500,
        networkType: 'slow'
      },
      optimizations: {
        maxNetworkRequests: 2,
        cacheOptimization: true,
        lazyLoading: true,
        predictiveLoading: false,
        resourceHints: false
      },
      priority: 8
    });
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    this.startMetricsCollection();
    this.startPerformanceObserver();
    this.startOptimizationLoop();
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Update metrics every 5 seconds
    const metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000);
    this.intervals.push(metricsInterval);

    // Update device info every 30 seconds
    const deviceInterval = setInterval(() => {
      this.updateDeviceMetrics();
    }, 30000);
    this.intervals.push(deviceInterval);
  }

  /**
   * Start performance observer
   */
  private startPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Observe navigation timing
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
          }
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.updateNetworkMetrics(entries);
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-paint') {
            this.metrics.renderTime = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('Paint observer not supported:', error);
    }
  }

  /**
   * Start optimization loop
   */
  private startOptimizationLoop(): void {
    // Run optimization checks every 10 seconds
    const optimizationInterval = setInterval(() => {
      this.checkAndApplyOptimizations();
    }, 10000);
    this.intervals.push(optimizationInterval);
  }

  /**
   * Update current metrics
   */
  private async updateMetrics(): Promise<void> {
    // Update FPS
    this.metrics.fps = await this.measureFPS();

    // Update memory usage
    this.metrics.memoryUsage = this.getMemoryUsage();

    // Update battery level
    this.metrics.batteryLevel = await this.getBatteryLevel();

    // Update concurrent requests
    this.metrics.concurrentRequests = this.getConcurrentRequests();
  }

  /**
   * Update device-specific metrics
   */
  private updateDeviceMetrics(): void {
    // Update device memory
    this.metrics.deviceMemory = (navigator as any).deviceMemory || 4;

    // Update hardware concurrency
    this.metrics.hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // Update network type
    this.metrics.networkType = this.getNetworkType();
  }

  /**
   * Update network metrics from performance entries
   */
  private updateNetworkMetrics(entries: PerformanceEntry[]): void {
    const resourceEntries = entries.filter(entry => entry.entryType === 'resource') as PerformanceResourceTiming[];
    if (resourceEntries.length === 0) return;

    // Calculate average latency
    const totalLatency = resourceEntries.reduce((sum, entry) => {
      return sum + (entry.responseEnd - entry.requestStart);
    }, 0);

    this.metrics.networkLatency = totalLatency / resourceEntries.length;
  }

  /**
   * Apply automatic optimizations
   */
  private async applyAutomaticOptimizations(): Promise<string[]> {
    const optimizations: string[] = [];
    const now = Date.now();

    for (const rule of this.rules) {
      if (rule.lastExecuted && now - rule.lastExecuted < rule.cooldown) {
        continue;
      }

      if (rule.condition(this.metrics)) {
        try {
          rule.action(this.config);
          rule.lastExecuted = now;

          // Record optimization
          this.optimizationHistory.push({
            timestamp: now,
            ruleId: rule.id,
            metrics: { ...this.metrics },
            action: rule.name
          });

          optimizations.push(rule.name);

          // Limit history size
          if (this.optimizationHistory.length > 200) {
            this.optimizationHistory = this.optimizationHistory.slice(-100);
          }

        } catch (error) {
          console.error(`Failed to apply rule ${rule.id}:`, error);
        }
      }
    }

    return optimizations;
  }

  /**
   * Generate optimization suggestions
   */
  private generateSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Memory suggestions
    if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.9) {
      suggestions.push({
        id: 'memory-cleanup',
        type: 'behavior',
        title: 'Free Up Memory',
        description: 'Close unused tabs and applications to improve performance',
        impact: 'high',
        effort: 'low',
        action: () => this.forceGarbageCollection()
      });
    }

    // Network suggestions
    if (this.metrics.networkLatency > 300) {
      suggestions.push({
        id: 'network-optimization',
        type: 'config',
        title: 'Enable Offline Mode',
        description: 'Switch to offline mode to reduce network requests',
        impact: 'medium',
        effort: 'low',
        action: () => {
          this.config.maxNetworkRequests = 2;
          this.config.cacheOptimization = true;
        }
      });
    }

    // Bundle size suggestions
    if (this.metrics.bundleSize > 2 * 1024 * 1024) { // 2MB
      suggestions.push({
        id: 'bundle-splitting',
        type: 'code',
        title: 'Implement Code Splitting',
        description: 'Split large bundles into smaller chunks for faster loading',
        impact: 'high',
        effort: 'medium',
        action: () => this.optimizeBundleLoading()
      });
    }

    return suggestions;
  }

  /**
   * Apply profile-based optimizations
   */
  private async applyProfileOptimizations(): Promise<void> {
    for (const profile of this.profiles) {
      if (this.matchesProfile(profile)) {
        // Merge profile optimizations with current config
        this.config = { ...this.config, ...profile.optimizations };
        break; // Apply highest priority matching profile
      }
    }
  }

  /**
   * Check if current metrics match profile conditions
   */
  private matchesProfile(profile: PerformanceProfile): boolean {
    for (const [key, value] of Object.entries(profile.conditions)) {
      const metricKey = key as keyof PerformanceMetrics;
      const currentValue = this.metrics[metricKey];

      if (typeof currentValue === 'number' && typeof value === 'number') {
        if (Math.abs(currentValue - value) > 0.1) {
          return false;
        }
      } else if (typeof currentValue === 'string' && typeof value === 'string') {
        if (currentValue !== value) {
          return false;
        }
      } else {
        return false; // Type mismatch
      }
    }
    return true;
  }

  /**
   * Check and apply optimizations
   */
  private async checkAndApplyOptimizations(): Promise<void> {
    if (this.isOptimizing) return;

    const threshold = 0.1; // 10% deviation threshold

    // Check FPS
    if (Math.abs(this.metrics.fps - this.config.targetFPS) / this.config.targetFPS > threshold) {
      await this.optimize();
    }

    // Check memory usage
    if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      await this.optimize();
    }

    // Check network conditions
    if (this.metrics.networkLatency > 200) {
      await this.optimize();
    }
  }

  /**
   * Measure current FPS
   */
  private async measureFPS(): Promise<number> {
    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = performance.now();

      const measure = () => {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;

        if (elapsed >= 1000) { // Measure for 1 second
          const fps = (frameCount / elapsed) * 1000;
          resolve(Math.round(fps));
        } else {
          requestAnimationFrame(measure);
        }
      };

      requestAnimationFrame(measure);
    });
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  /**
   * Get battery level
   */
  private async getBatteryLevel(): Promise<number> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return battery.level;
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
    return 1;
  }

  /**
   * Get concurrent network requests
   */
  private getConcurrentRequests(): number {
    // This would need to be tracked by the application
    // For now, return a mock value
    return 2;
  }

  /**
   * Get network type
   */
  private getNetworkType(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Identify critical resources for preloading
   */
  private identifyCriticalResources(): string[] {
    // This would analyze the current page to identify critical resources
    return [
      '/api/critical-data',
      '/images/hero.jpg',
      '/fonts/main.woff2'
    ];
  }

  /**
   * Preload specific resource
   */
  private async preloadResource(url: string): Promise<void> {
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = this.getResourceType(url);

      document.head.appendChild(link);
    } catch (error) {
      console.warn(`Failed to preload resource ${url}:`, error);
    }
  }

  /**
   * Get resource type for preloading
   */
  private getResourceType(url: string): string {
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'style';
    if (url.endsWith('.woff2') || url.endsWith('.woff') || url.endsWith('.ttf')) return 'font';
    if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp')) return 'image';
    return 'fetch';
  }

  /**
   * Analyze current bundle
   */
  private async analyzeBundle(): Promise<{
    totalSize: number;
    chunkCount: number;
    largestChunk: number;
    unusedCode: string[];
  }> {
    // This would analyze the actual bundle
    return {
      totalSize: 1024 * 1024, // 1MB
      chunkCount: 5,
      largestChunk: 500 * 1024, // 500KB
      unusedCode: ['unused-module-1', 'unused-module-2']
    };
  }

  /**
   * Apply code splitting optimizations
   */
  private async applyCodeSplitting(analysis: any): Promise<void> {
    // Implement code splitting logic
    if (analysis.largestChunk > 200 * 1024) { // 200KB
      // Split large chunks
      console.log('Applying code splitting for large chunks');
    }
  }

  /**
   * Optimize chunk loading
   */
  private optimizeChunkLoading(): void {
    // Add resource hints for chunks
    const scripts = document.querySelectorAll('script[data-chunk]');
    scripts.forEach((script) => {
      const url = (script as HTMLElement).dataset.chunk;
      if (url) {
        this.preloadResource(url);
      }
    });
  }

  /**
   * Cleanup observers and intervals
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.intervals.forEach(interval => clearInterval(interval));
    this.observers = [];
    this.intervals = [];
  }
}