// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: boolean;
  message?: string;
  timestamp: string;
}

export class ApiError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, any>;

  constructor({ message, code, statusCode, details }: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
  }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Filter and Sort Types
export interface BaseFilters {
  search?: string;
  category?: string;
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'popularity' | 'trending';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ContentFilters extends BaseFilters {
  type?: 'all' | 'image' | 'video' | 'story' | 'user';
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  minViews?: number;
  maxViews?: number;
  verified?: boolean;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
}

// Request Configuration
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: CacheOptions;
  offline?: boolean;
}

// Real-time Update Types
export interface RealtimeUpdate<T> {
  type: 'create' | 'update' | 'delete';
  data: T;
  timestamp: string;
  userId: string;
}

export interface SubscriptionCallback<T> {
  (update: RealtimeUpdate<T>): void;
}

// Offline Queue Types
export interface QueuedAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: any;
  timestamp: string;
  retries: number;
}

// Data Synchronization Types
export interface SyncStatus {
  lastSync: string;
  pendingActions: number;
  isOnline: boolean;
  conflictCount: number;
}