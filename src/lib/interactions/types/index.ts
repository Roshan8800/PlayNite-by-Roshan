// Core interaction types and interfaces for the PlayNite optimization system

export interface InteractionEvent {
  id: string;
  type: InteractionType;
  userId?: string;
  sessionId: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  performance?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface UserInteractionPattern {
  userId: string;
  sessionId: string;
  interactionSequence: InteractionEvent[];
  behaviorProfile: BehaviorProfile;
  preferences: UserPreferences;
  performanceHistory: PerformanceMetrics[];
}

export interface BehaviorProfile {
  interactionFrequency: number;
  averageSessionDuration: number;
  preferredContentTypes: string[];
  peakUsageHours: number[];
  devicePreferences: DeviceInfo[];
  engagementLevel: 'low' | 'medium' | 'high';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  performance: PerformanceSettings;
  accessibility: AccessibilitySettings;
}

export interface NotificationSettings {
  enabled: boolean;
  types: Record<string, boolean>;
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
  channels: ('push' | 'email' | 'sms' | 'in-app')[];
}

export interface PrivacySettings {
  dataCollection: boolean;
  analyticsTracking: boolean;
  personalizedAds: boolean;
  thirdPartySharing: boolean;
  dataRetention: number; // days
}

export interface PerformanceSettings {
  autoOptimize: boolean;
  cacheEnabled: boolean;
  lazyLoading: boolean;
  adaptiveQuality: boolean;
  backgroundProcessing: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenSize: { width: number; height: number };
  memory: number; // GB
  cpuCores: number;
  connection: NetworkInfo;
}

export interface NetworkInfo {
  type: 'slow' | 'medium' | 'fast';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface InteractionAnalytics {
  totalInteractions: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topInteractionTypes: Array<{ type: InteractionType; count: number }>;
  performanceTrends: PerformanceTrend[];
  userSatisfaction: number;
}

export interface PerformanceTrend {
  timestamp: number;
  metric: keyof PerformanceMetrics;
  value: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface OptimizationRecommendation {
  id: string;
  type: 'performance' | 'user-experience' | 'accessibility' | 'privacy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: number; // 0-1 scale
  effort: number; // 0-1 scale
  actions: OptimizationAction[];
  expectedResults: string[];
}

export interface OptimizationAction {
  id: string;
  type: 'config' | 'code' | 'infrastructure' | 'policy';
  description: string;
  automated: boolean;
  rollback: boolean;
}

export interface DatabaseQuery {
  id: string;
  type: 'read' | 'write' | 'update' | 'delete';
  table: string;
  conditions?: Record<string, any>;
  fields?: string[];
  orderBy?: string;
  limit?: number;
  timestamp: number;
  duration: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface DatabaseMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  errorRate: number;
  cacheHitRate: number;
  connectionPoolUsage: number;
  tableStats: Record<string, TableStats>;
}

export interface TableStats {
  rowCount: number;
  size: number; // MB
  indexCount: number;
  lastOptimized: number;
}

export interface SettingsProfile {
  id: string;
  name: string;
  description: string;
  targetAudience: string[];
  settings: UserPreferences;
  performanceImpact: PerformanceImpact;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface PerformanceImpact {
  memory: number; // MB
  cpu: number; // percentage
  network: number; // requests per minute
  battery: number; // percentage
}

export interface InteractionOptimizerConfig {
  enableResponseOptimization: boolean;
  enablePredictiveLoading: boolean;
  enableAdaptiveQuality: boolean;
  enableSmartCaching: boolean;
  enablePerformanceMonitoring: boolean;
  responseTimeThreshold: number; // ms
  memoryThreshold: number; // MB
  cpuThreshold: number; // percentage
  cacheSize: number; // MB
  analyticsRetention: number; // days
}

export interface DatabaseOptimizerConfig {
  enableQueryOptimization: boolean;
  enableConnectionPooling: boolean;
  enableQueryCaching: boolean;
  enableSlowQueryLogging: boolean;
  slowQueryThreshold: number; // ms
  maxConnections: number;
  queryCacheSize: number; // MB
  enableAutoOptimization: boolean;
}

export interface SettingsManagerConfig {
  enableDynamicProfiles: boolean;
  enableContextualSettings: boolean;
  enableSettingsSync: boolean;
  enableSettingsAnalytics: boolean;
  profileSwitchThreshold: number; // similarity score
  settingsBackupFrequency: number; // hours
}

export type InteractionType =
  | 'click'
  | 'scroll'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'submit'
  | 'search'
  | 'play'
  | 'pause'
  | 'share'
  | 'like'
  | 'comment'
  | 'follow'
  | 'unfollow'
  | 'bookmark'
  | 'report'
  | 'settings_change'
  | 'navigation'
  | 'error'
  | 'load'
  | 'unload';

export interface InteractionContext {
  page: string;
  component: string;
  element: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timestamp: number;
  referrer?: string;
  utm?: Record<string, string>;
}

export interface ResponseOptimization {
  enableCompression: boolean;
  enableMinification: boolean;
  enableCDN: boolean;
  enableEdgeCaching: boolean;
  enableImageOptimization: boolean;
  enableVideoOptimization: boolean;
  enableFontOptimization: boolean;
  enableCSSOptimization: boolean;
  enableJSOptimization: boolean;
}

export interface CachingStrategy {
  type: 'memory' | 'disk' | 'network' | 'hybrid';
  maxSize: number;
  maxAge: number;
  compression: boolean;
  encryption: boolean;
  priority: 'low' | 'medium' | 'high';
  invalidationStrategy: 'time' | 'event' | 'manual';
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  condition: (context: InteractionContext, metrics: PerformanceMetrics) => boolean;
  action: (context: InteractionContext) => Promise<void>;
  priority: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}