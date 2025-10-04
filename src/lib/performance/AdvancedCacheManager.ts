export interface CacheLayer {
  name: string;
  maxSize: number;
  maxAge: number;
  strategy: 'LRU' | 'LFU' | 'TTL' | 'Adaptive';
  compression: boolean;
  encryption: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  size: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  layer: string;
  metadata?: {
    contentType?: string;
    compressed?: boolean;
    encrypted?: boolean;
    checksum?: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
  averageAccessTime: number;
}

export interface MultiLayerCacheConfig {
  layers: CacheLayer[];
  globalMaxSize: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  enableMetrics: boolean;
  adaptiveScaling: boolean;
}

export class AdvancedCacheManager {
  private layers = new Map<string, Map<string, CacheEntry>>();
  private stats = new Map<string, CacheStats>();
  private accessTimes: number[] = [];
  private config: MultiLayerCacheConfig;
  private compressionWorker?: Worker;
  private encryptionKey?: CryptoKey;

  constructor(config: MultiLayerCacheConfig) {
    this.config = config;
    this.initializeLayers();
    this.initializeCompression();
    this.initializeEncryption();
    this.startMaintenanceTasks();
  }

  /**
   * Set data in the most appropriate cache layer
   */
  async set(key: string, data: any, options?: {
    layer?: string;
    contentType?: string;
    ttl?: number;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<void> {
    const startTime = performance.now();

    try {
      // Determine optimal layer
      const targetLayer = options?.layer || this.selectOptimalLayer(key, data, options);

      // Serialize and measure data
      const serializedData = await this.serializeData(data, options?.contentType);
      const entry: CacheEntry = {
        key,
        data: serializedData,
        size: this.estimateSize(serializedData),
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        layer: targetLayer,
        metadata: {
          contentType: options?.contentType,
          compressed: false,
          encrypted: false
        }
      };

      // Apply compression if enabled
      if (this.config.enableCompression && this.shouldCompress(entry)) {
        entry.data = await this.compressData(entry.data);
        entry.metadata!.compressed = true;
      }

      // Apply encryption if enabled
      if (this.config.enableEncryption && this.shouldEncrypt(entry)) {
        entry.data = await this.encryptData(entry.data);
        entry.metadata!.encrypted = true;
      }

      // Store in selected layer
      await this.storeInLayer(targetLayer, entry);

      // Update adaptive scaling if enabled
      if (this.config.adaptiveScaling) {
        this.updateAdaptiveScaling();
      }

      this.recordAccessTime(performance.now() - startTime);

    } catch (error) {
      console.error('Failed to set cache entry:', error);
      throw error;
    }
  }

  /**
   * Get data from cache with fallback across layers
   */
  async get(key: string): Promise<any | null> {
    const startTime = performance.now();

    try {
      // Try each layer in order of priority
      for (const layerName of this.getLayerPriority()) {
        const layer = this.layers.get(layerName);
        if (!layer) continue;

        const entry = layer.get(key);
        if (entry && this.isValid(entry)) {
          // Update access statistics
          entry.lastAccessed = Date.now();
          entry.accessCount++;

          // Move to higher priority layer if frequently accessed
          if (this.shouldPromote(entry)) {
            await this.promoteEntry(entry);
          }

          const result = await this.deserializeData(entry);
          this.recordAccessTime(performance.now() - startTime);
          this.updateStats(layerName, 'hits');
          return result;
        }
      }

      this.recordAccessTime(performance.now() - startTime);
      // Update miss stats for all layers
      for (const layerName of this.getLayerPriority()) {
        this.updateStats(layerName, 'misses');
      }
      return null;

    } catch (error) {
      console.error('Failed to get cache entry:', error);
      return null;
    }
  }

  /**
   * Delete entry from all layers
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;

    for (const [layerName, layer] of this.layers) {
      if (layer.has(key)) {
        const entry = layer.get(key)!;
        layer.delete(key);
        this.updateStats(layerName, 'evictions');
        this.updateLayerSize(layerName, -entry.size);
        deleted = true;
      }
    }

    return deleted;
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    for (const [layerName, layer] of this.layers) {
      const size = this.getLayerSize(layerName);
      layer.clear();
      this.updateLayerSize(layerName, -size);
      this.resetStats(layerName);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): Map<string, CacheStats> {
    return new Map(this.stats);
  }

  /**
   * Get cache efficiency metrics
   */
  getEfficiencyMetrics(): {
    overallHitRate: number;
    memoryUtilization: number;
    averageResponseTime: number;
    compressionRatio: number;
    layerDistribution: Record<string, number>;
  } {
    const totalHits = Array.from(this.stats.values()).reduce((sum, stat) => sum + stat.hits, 0);
    const totalRequests = totalHits + Array.from(this.stats.values()).reduce((sum, stat) => sum + stat.misses, 0);

    const totalSize = Array.from(this.layers.values()).reduce((sum, layer) => {
      return sum + Array.from(layer.values()).reduce((layerSum, entry) => layerSum + entry.size, 0);
    }, 0);

    const maxSize = this.config.globalMaxSize;
    const avgResponseTime = this.accessTimes.length > 0
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length
      : 0;

    const layerDistribution: Record<string, number> = {};
    for (const [layerName, layer] of this.layers) {
      layerDistribution[layerName] = layer.size;
    }

    return {
      overallHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      memoryUtilization: maxSize > 0 ? totalSize / maxSize : 0,
      averageResponseTime: avgResponseTime,
      compressionRatio: this.calculateCompressionRatio(),
      layerDistribution
    };
  }

  /**
   * Optimize cache configuration based on usage patterns
   */
  async optimize(): Promise<void> {
    const metrics = this.getEfficiencyMetrics();

    // Adjust layer sizes based on hit rates
    for (const [layerName, layer] of this.layers) {
      const layerConfig = this.config.layers.find(l => l.name === layerName);
      if (!layerConfig) continue;

      const layerStats = this.stats.get(layerName);
      if (!layerStats) continue;

      const hitRate = layerStats.hitRate;

      // Increase size for high-performing layers
      if (hitRate > 0.8 && metrics.memoryUtilization < 0.9) {
        layerConfig.maxSize *= 1.1;
      }
      // Decrease size for low-performing layers
      else if (hitRate < 0.3 && layerConfig.maxSize > 10) {
        layerConfig.maxSize *= 0.9;
      }
    }

    // Trigger cleanup to apply new size limits
    await this.maintainCache();
  }

  /**
   * Initialize cache layers
   */
  private initializeLayers(): void {
    for (const layerConfig of this.config.layers) {
      this.layers.set(layerConfig.name, new Map());
      this.stats.set(layerConfig.name, {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        maxSize: layerConfig.maxSize,
        hitRate: 0,
        averageAccessTime: 0
      });
    }
  }

  /**
   * Initialize compression worker
   */
  private initializeCompression(): void {
    if (this.config.enableCompression && typeof Worker !== 'undefined') {
      try {
        // Create compression worker for background compression
        const workerCode = `
          self.onmessage = async function(e) {
            const { id, data, action } = e.data;

            if (action === 'compress') {
              try {
                const compressed = await compressData(data);
                self.postMessage({ id, result: compressed, success: true });
              } catch (error) {
                self.postMessage({ id, error: error.message, success: false });
              }
            }
          };

          async function compressData(data) {
            // Simple compression using run-length encoding for demo
            // In production, use proper compression algorithms
            const str = JSON.stringify(data);
            let result = '';
            let count = 1;

            for (let i = 0; i < str.length; i++) {
              if (i + 1 < str.length && str[i] === str[i + 1]) {
                count++;
              } else {
                if (count > 1) {
                  result += str[i] + count;
                } else {
                  result += str[i];
                }
                count = 1;
              }
            }
            return result;
          }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
      }
    }
  }

  /**
   * Initialize encryption
   */
  private async initializeEncryption(): Promise<void> {
    if (this.config.enableEncryption && typeof crypto !== 'undefined') {
      try {
        this.encryptionKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('Failed to initialize encryption:', error);
      }
    }
  }

  /**
   * Select optimal layer for data
   */
  private selectOptimalLayer(key: string, data: any, options?: { priority?: string }): string {
    const dataSize = this.estimateSize(data);

    // High priority data goes to fastest layer
    if (options?.priority === 'high') {
      return this.config.layers[0].name;
    }

    // Large data goes to slower but larger layers
    if (dataSize > 50 * 1024 * 1024) { // 50MB
      return this.config.layers[this.config.layers.length - 1].name;
    }

    // Medium data goes to middle layers
    return this.config.layers[Math.floor(this.config.layers.length / 2)].name;
  }

  /**
   * Get layer priority order (fastest first)
   */
  private getLayerPriority(): string[] {
    return this.config.layers.map(l => l.name);
  }

  /**
   * Check if entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const layerConfig = this.config.layers.find(l => l.name === entry.layer);
    if (!layerConfig) return false;

    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > layerConfig.maxAge) return false;

    // Check if layer strategy allows this entry
    return this.checkStrategyValidity(entry, layerConfig);
  }

  /**
   * Check validity based on cache strategy
   */
  private checkStrategyValidity(entry: CacheEntry, layerConfig: CacheLayer): boolean {
    switch (layerConfig.strategy) {
      case 'TTL':
        return true; // Already checked above
      case 'LRU':
        // LRU is handled by access patterns
        return true;
      case 'LFU':
        // LFU entries are valid until explicitly evicted
        return true;
      case 'Adaptive':
        // Adaptive strategy uses multiple factors
        return this.checkAdaptiveValidity(entry);
      default:
        return true;
    }
  }

  /**
   * Check validity for adaptive strategy
   */
  private checkAdaptiveValidity(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    const accessScore = entry.accessCount / Math.max(1, age / (1000 * 60 * 60)); // Access per hour

    // Remove entries that haven't been accessed recently and have low access scores
    return !(age > 24 * 60 * 60 * 1000 && accessScore < 0.1);
  }

  /**
   * Determine if entry should be promoted to higher layer
   */
  private shouldPromote(entry: CacheEntry): boolean {
    const accessScore = entry.accessCount / Math.max(1, (Date.now() - entry.timestamp) / (1000 * 60 * 60));
    return accessScore > 2; // More than 2 accesses per hour
  }

  /**
   * Promote entry to higher priority layer
   */
  private async promoteEntry(entry: CacheEntry): Promise<void> {
    const currentLayerIndex = this.config.layers.findIndex(l => l.name === entry.layer);
    if (currentLayerIndex > 0) {
      const newLayer = this.config.layers[currentLayerIndex - 1].name;

      // Remove from current layer
      const currentLayer = this.layers.get(entry.layer);
      currentLayer?.delete(entry.key);
      this.updateLayerSize(entry.layer, -entry.size);

      // Add to new layer
      entry.layer = newLayer;
      await this.storeInLayer(newLayer, entry);
    }
  }

  /**
   * Serialize data for storage
   */
  private async serializeData(data: any, contentType?: string): Promise<any> {
    if (contentType?.includes('json') || typeof data === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }

  /**
   * Deserialize data from storage
   */
  private async deserializeData(entry: CacheEntry): Promise<any> {
    // Decrypt if necessary
    let data = entry.data;
    if (entry.metadata?.encrypted) {
      data = await this.decryptData(data);
    }

    // Decompress if necessary
    if (entry.metadata?.compressed) {
      data = await this.decompressData(data);
    }

    // Parse if JSON
    if (entry.metadata?.contentType?.includes('json')) {
      return JSON.parse(data);
    }

    return data;
  }

  /**
   * Estimate data size in bytes
   */
  private estimateSize(data: any): number {
    if (data instanceof Blob) {
      return data.size;
    }
    if (typeof data === 'string') {
      return new Blob([data]).size;
    }
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Check if data should be compressed
   */
  private shouldCompress(entry: CacheEntry): boolean {
    return entry.size > 10 * 1024; // Compress data > 10KB
  }

  /**
   * Check if data should be encrypted
   */
  private shouldEncrypt(entry: CacheEntry): boolean {
    // Encrypt sensitive data or large data
    return entry.size > 1024 * 1024 || (entry.metadata?.contentType?.includes('sensitive') ?? false);
  }

  /**
   * Compress data
   */
  private async compressData(data: any): Promise<any> {
    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36);
        this.compressionWorker!.onmessage = (e) => {
          if (e.data.id === id) {
            if (e.data.success) {
              resolve(e.data.result);
            } else {
              reject(new Error(e.data.error));
            }
          }
        };
        this.compressionWorker!.postMessage({ id, data, action: 'compress' });
      });
    }

    // Fallback compression
    const str = JSON.stringify(data);
    let result = '';
    let count = 1;

    for (let i = 0; i < str.length; i++) {
      if (i + 1 < str.length && str[i] === str[i + 1]) {
        count++;
      } else {
        if (count > 1) {
          result += str[i] + count;
        } else {
          result += str[i];
        }
        count = 1;
      }
    }
    return result;
  }

  /**
   * Decompress data
   */
  private async decompressData(data: any): Promise<any> {
    // Simple decompression (reverse of compression)
    const str = data.toString();
    let result = '';
    let i = 0;

    while (i < str.length) {
      const char = str[i];
      i++;

      if (i < str.length && /\d/.test(str[i])) {
        // This is a repeated character
        let countStr = '';
        while (i < str.length && /\d/.test(str[i])) {
          countStr += str[i];
          i++;
        }
        const count = parseInt(countStr);
        result += char.repeat(count);
      } else {
        // This is a single character
        result += char;
      }
    }

    return result;
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: any): Promise<any> {
    if (!this.encryptionKey) return data;

    const dataStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataStr);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );

    return { encrypted: new Uint8Array(encrypted), iv };
  }

  /**
   * Decrypt data
   */
  private async decryptData(data: any): Promise<any> {
    if (!this.encryptionKey || !data.encrypted || !data.iv) return data;

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: data.iv },
      this.encryptionKey,
      data.encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  /**
   * Store entry in specific layer
   */
  private async storeInLayer(layerName: string, entry: CacheEntry): Promise<void> {
    const layer = this.layers.get(layerName);
    if (!layer) throw new Error(`Layer ${layerName} not found`);

    // Check size limits
    const currentSize = this.getLayerSize(layerName);
    if (currentSize + entry.size > this.getLayerMaxSize(layerName)) {
      await this.evictFromLayer(layerName, entry.size);
    }

    layer.set(entry.key, entry);
    this.updateLayerSize(layerName, entry.size);
  }

  /**
   * Evict entries from layer to make space
   */
  private async evictFromLayer(layerName: string, requiredSpace: number): Promise<void> {
    const layer = this.layers.get(layerName);
    const layerConfig = this.config.layers.find(l => l.name === layerName);

    if (!layer || !layerConfig) return;

    const entries = Array.from(layer.values());

    // Sort by eviction priority based on strategy
    entries.sort((a, b) => this.getEvictionPriority(a, b, layerConfig.strategy));

    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break;

      layer.delete(entry.key);
      this.updateLayerSize(layerName, -entry.size);
      this.updateStats(layerName, 'evictions');
      freedSpace += entry.size;
    }
  }

  /**
   * Get eviction priority for entries
   */
  private getEvictionPriority(a: CacheEntry, b: CacheEntry, strategy: string): number {
    switch (strategy) {
      case 'LRU':
        return a.lastAccessed - b.lastAccessed;
      case 'LFU':
        return a.accessCount - b.accessCount;
      case 'TTL':
        return a.timestamp - b.timestamp;
      case 'Adaptive':
        const scoreA = a.accessCount / Math.max(1, Date.now() - a.lastAccessed);
        const scoreB = b.accessCount / Math.max(1, Date.now() - b.lastAccessed);
        return scoreA - scoreB;
      default:
        return 0;
    }
  }

  /**
   * Get current layer size
   */
  private getLayerSize(layerName: string): number {
    const stats = this.stats.get(layerName);
    return stats?.size || 0;
  }

  /**
   * Get layer max size
   */
  private getLayerMaxSize(layerName: string): number {
    const layerConfig = this.config.layers.find(l => l.name === layerName);
    return layerConfig?.maxSize || 0;
  }

  /**
   * Update layer size
   */
  private updateLayerSize(layerName: string, delta: number): void {
    const stats = this.stats.get(layerName);
    if (stats) {
      stats.size = Math.max(0, stats.size + delta);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(layerName: string, type: 'hits' | 'misses' | 'evictions'): void {
    const stats = this.stats.get(layerName);
    if (stats) {
      stats[type]++;
      const total = stats.hits + stats.misses;
      stats.hitRate = total > 0 ? stats.hits / total : 0;
    }
  }

  /**
   * Reset layer statistics
   */
  private resetStats(layerName: string): void {
    const stats = this.stats.get(layerName);
    if (stats) {
      stats.hits = 0;
      stats.misses = 0;
      stats.evictions = 0;
      stats.hitRate = 0;
    }
  }

  /**
   * Record access time for metrics
   */
  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);
    if (this.accessTimes.length > 1000) {
      this.accessTimes.shift(); // Keep only last 1000 measurements
    }
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(): number {
    // This would be calculated based on actual compressed vs uncompressed sizes
    return 0.7; // Mock 70% compression ratio
  }

  /**
   * Update adaptive scaling
   */
  private updateAdaptiveScaling(): void {
    const metrics = this.getEfficiencyMetrics();

    // Scale layer sizes based on performance
    for (const layerConfig of this.config.layers) {
      const layerStats = this.stats.get(layerConfig.name);
      if (!layerStats) continue;

      if (layerStats.hitRate > 0.8 && metrics.memoryUtilization < 0.9) {
        layerConfig.maxSize = Math.min(layerConfig.maxSize * 1.05, layerConfig.maxSize * 2);
      } else if (layerStats.hitRate < 0.3) {
        layerConfig.maxSize = Math.max(layerConfig.maxSize * 0.95, layerConfig.maxSize * 0.5);
      }
    }
  }

  /**
   * Start maintenance tasks
   */
  private startMaintenanceTasks(): void {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.maintainCache();
    }, 5 * 60 * 1000);

    // Optimize cache every 30 minutes
    setInterval(() => {
      this.optimize();
    }, 30 * 60 * 1000);
  }

  /**
   * Maintain cache (cleanup, optimize)
   */
  private async maintainCache(): Promise<void> {
    for (const [layerName, layer] of this.layers) {
      const layerConfig = this.config.layers.find(l => l.name === layerName);
      if (!layerConfig) continue;

      // Remove expired entries
      for (const [key, entry] of layer) {
        if (!this.isValid(entry)) {
          layer.delete(key);
          this.updateLayerSize(layerName, -entry.size);
        }
      }

      // Evict if over size limit
      const currentSize = this.getLayerSize(layerName);
      if (currentSize > layerConfig.maxSize) {
        await this.evictFromLayer(layerName, currentSize - layerConfig.maxSize);
      }
    }
  }
}