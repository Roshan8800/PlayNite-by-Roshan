import {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  RequestConfig,
  CacheEntry,
  CacheOptions,
  QueuedAction,
  SyncStatus
} from '../types/api';

// API Client Configuration
export class ApiClient {
  private baseURL: string;
  private defaultConfig: RequestConfig;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private offlineQueue: QueuedAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private subscribers: Set<(status: SyncStatus) => void> = new Set();

  constructor(baseURL: string = '', config: RequestConfig = {}) {
    this.baseURL = baseURL;
    this.defaultConfig = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      cache: { ttl: 5 * 60 * 1000 }, // 5 minutes default
      offline: true,
      ...config
    };

    this.setupOnlineListener();
    this.loadOfflineQueue();
  }

  // Core request method
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, mergedConfig);

    // Check cache first
    if (mergedConfig.cache && !options.method?.toLowerCase().includes('post') && !options.method?.toLowerCase().includes('put') && !options.method?.toLowerCase().includes('delete')) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return { data: cached, success: true, timestamp: new Date().toISOString() };
      }
    }

    // Handle offline scenario
    if (!this.isOnline && mergedConfig.offline) {
      throw new ApiError({
        message: 'No internet connection',
        code: 'OFFLINE',
        statusCode: 0
      });
    }

    try {
      const response = await this.executeRequest(url, options, mergedConfig);

      // Cache successful GET requests
      if (mergedConfig.cache && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
        this.setCache(cacheKey, response.data, mergedConfig.cache.ttl);
      }

      return {
        data: response.data,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Queue action for offline sync if enabled
      if (!this.isOnline && mergedConfig.offline && options.method !== 'GET') {
        await this.queueAction(endpoint, options, mergedConfig);
      }

      throw this.handleError(error);
    }
  }

  // HTTP method shortcuts
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, config);
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    }, config);
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    }, config);
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, config);
  }

  // Paginated requests
  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<PaginatedResponse<T>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.get<T[]>(`${endpoint}${queryString}`, config);

    // Mock pagination for now - in real API this would come from server
    const page = parseInt(params?.page || '1');
    const limit = parseInt(params?.limit || '20');
    const total = response.data.length * 5; // Mock total
    const totalPages = Math.ceil(total / limit);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      success: true,
      timestamp: response.timestamp
    };
  }

  // Cache management
  private getCacheKey(url: string, config: RequestConfig): string {
    const customKey = config.cache?.key;
    if (customKey) return customKey;

    // Create cache key from URL and relevant config
    const relevantParams = ['search', 'category', 'sortBy', 'type'];
    const urlObj = new URL(url, 'http://localhost');
    const params = new URLSearchParams();

    for (const [key, value] of urlObj.searchParams) {
      if (relevantParams.includes(key)) {
        params.set(key, value);
      }
    }

    return `${urlObj.pathname}?${params.toString()}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };
    this.cache.set(key, entry);
  }

  // Offline support
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineActions();
      this.notifySubscribers();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifySubscribers();
    });
  }

  private async queueAction(endpoint: string, options: RequestInit, config: RequestConfig): Promise<void> {
    const action: QueuedAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: (options.method?.toLowerCase() as any) || 'get',
      endpoint,
      data: options.body,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    this.offlineQueue.push(action);
    this.saveOfflineQueue();
    this.notifySubscribers();
  }

  private async syncOfflineActions(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const actionsToSync = [...this.offlineQueue];

    for (const action of actionsToSync) {
      try {
        await this.executeRequest(`${this.baseURL}${action.endpoint}`, {
          method: action.type.toUpperCase(),
          body: action.data,
          headers: {
            'Content-Type': 'application/json'
          }
        }, {});

        // Remove from queue on success
        this.offlineQueue = this.offlineQueue.filter(a => a.id !== action.id);
      } catch (error) {
        action.retries++;
        if (action.retries >= 3) {
          // Remove failed actions after 3 retries
          this.offlineQueue = this.offlineQueue.filter(a => a.id !== action.id);
        }
      }
    }

    this.saveOfflineQueue();
    this.notifySubscribers();
  }

  private saveOfflineQueue(): void {
    localStorage.setItem('offline-queue', JSON.stringify(this.offlineQueue));
  }

  private loadOfflineQueue(): void {
    const stored = localStorage.getItem('offline-queue');
    if (stored) {
      try {
        this.offlineQueue = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load offline queue:', error);
        this.offlineQueue = [];
      }
    }
  }

  // Subscription management for real-time updates
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const status: SyncStatus = {
      lastSync: new Date().toISOString(),
      pendingActions: this.offlineQueue.length,
      isOnline: this.isOnline,
      conflictCount: 0
    };

    this.subscribers.forEach(callback => callback(status));
  }

  // Error handling
  private async executeRequest(url: string, options: RequestInit, config: RequestConfig): Promise<{ data: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'HTTP_ERROR',
          statusCode: response.status
        });
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError({
          message: 'Request timeout',
          code: 'TIMEOUT',
          statusCode: 0
        });
      }

      throw error;
    }
  }

  private handleError(error: any): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiError({
        message: 'Network error',
        code: 'NETWORK_ERROR',
        statusCode: 0
      });
    }

    return new ApiError({
      message: error.message || 'Unknown error',
      code: 'UNKNOWN_ERROR',
      statusCode: 0
    });
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getSyncStatus(): SyncStatus {
    return {
      lastSync: new Date().toISOString(),
      pendingActions: this.offlineQueue.length,
      isOnline: this.isOnline,
      conflictCount: 0
    };
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();