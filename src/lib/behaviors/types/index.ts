// Core behavior system types and interfaces

export interface UserBehavior {
  userId: string;
  action: string;
  target: string;
  context: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface InteractionPattern {
  patternId: string;
  userId: string;
  patternType: 'navigation' | 'engagement' | 'preference' | 'social';
  frequency: number;
  confidence: number;
  context: Record<string, any>;
  lastSeen: Date;
  trends: PatternTrend[];
}

export interface PatternTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  timeframe: string;
}

export interface SmartAction {
  actionId: string;
  type: 'suggestion' | 'automation' | 'enhancement' | 'guidance';
  trigger: ActionTrigger;
  conditions: ActionCondition[];
  priority: number;
  context: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ActionTrigger {
  event: string;
  conditions: Record<string, any>;
  cooldown?: number;
  frequency?: 'once' | 'recurring' | 'continuous';
}

export interface ActionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PersonalizationProfile {
  userId: string;
  preferences: UserPreferences;
  behaviorPatterns: InteractionPattern[];
  contentPreferences: ContentPreferences;
  uiPreferences: UIPreferences;
  lastUpdated: Date;
  confidence: number;
}

export interface UserPreferences {
  themes: string[];
  contentTypes: string[];
  interactionStyles: string[];
  notificationSettings: NotificationPreferences;
  accessibility: AccessibilityPreferences;
}

export interface ContentPreferences {
  categories: string[];
  tags: string[];
  creators: string[];
  excludedCategories: string[];
  excludedTags: string[];
  preferredLength?: {
    min?: number;
    max?: number;
  };
  qualityPreferences: string[];
}

export interface UIPreferences {
  layout: 'grid' | 'list' | 'compact' | 'detailed';
  theme: 'light' | 'dark' | 'auto';
  animations: boolean;
  autoPlay: boolean;
  sidebarCollapsed: boolean;
  fontSize: 'small' | 'medium' | 'large';
  density: 'comfortable' | 'compact' | 'spacious';
}

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  categories: string[];
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  fontSize: string;
  colorBlind: boolean;
}

export interface ContextualHelp {
  helpId: string;
  trigger: HelpTrigger;
  content: HelpContent;
  conditions: HelpCondition[];
  priority: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface HelpTrigger {
  event: string;
  element?: string;
  context?: Record<string, any>;
  delay?: number;
  frequency?: 'once' | 'recurring' | 'always';
}

export interface HelpContent {
  title: string;
  message: string;
  type: 'tooltip' | 'modal' | 'inline' | 'tour' | 'notification';
  actions?: HelpAction[];
  media?: HelpMedia;
}

export interface HelpAction {
  label: string;
  action: string;
  type: 'primary' | 'secondary' | 'dismiss';
  url?: string;
}

export interface HelpMedia {
  images?: string[];
  videos?: string[];
  gifs?: string[];
}

export interface HelpCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: any;
}

export interface BehavioralInsight {
  insightId: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  userId?: string;
  userSegment?: string;
  metric: string;
  value: number;
  change: number;
  confidence: number;
  timeframe: string;
  description: string;
  recommendations?: string[];
  metadata?: Record<string, any>;
}

export interface ContentCurationRule {
  ruleId: string;
  name: string;
  conditions: CurationCondition[];
  actions: CurationAction[];
  priority: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface CurationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface CurationAction {
  type: 'promote' | 'demote' | 'hide' | 'feature' | 'categorize' | 'tag';
  value?: string;
  confidence?: number;
}

export interface SmartInteractionContext {
  userId?: string;
  sessionId: string;
  currentPage: string;
  userAgent: string;
  referrer?: string;
  timestamp: Date;
  interactions: UserBehavior[];
  environment: {
    screenSize: string;
    deviceType: string;
    browser: string;
    platform: string;
  };
}

export interface RecommendationContext {
  userId: string;
  currentContent?: string;
  context: 'browsing' | 'watching' | 'searching' | 'social' | 'discovery';
  preferences: ContentPreferences;
  behaviorHistory: UserBehavior[];
  similarUsers?: string[];
  trendingTopics?: string[];
  metadata?: Record<string, any>;
}

export interface AdaptiveUIState {
  userId: string;
  currentLayout: UIPreferences;
  adaptiveElements: AdaptiveElement[];
  lastUpdated: Date;
  triggers: UIAdaptationTrigger[];
}

export interface AdaptiveElement {
  elementId: string;
  elementType: string;
  adaptations: UIAdaptation[];
  conditions: AdaptationCondition[];
  priority: number;
}

export interface UIAdaptation {
  property: string;
  value: any;
  trigger: string;
  confidence: number;
}

export interface AdaptationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface UIAdaptationTrigger {
  event: string;
  conditions: Record<string, any>;
  cooldown?: number;
}

// Analytics and tracking types
export interface BehaviorMetrics {
  userId: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics: {
    engagement: EngagementMetrics;
    navigation: NavigationMetrics;
    social: SocialMetrics;
    content: ContentMetrics;
  };
  insights: BehavioralInsight[];
}

export interface EngagementMetrics {
  totalInteractions: number;
  averageSessionDuration: number;
  bounceRate: number;
  completionRate: number;
  interactionRate: number;
  timeToFirstInteraction: number;
}

export interface NavigationMetrics {
  pageViews: number;
  uniquePages: number;
  entryPages: string[];
  exitPages: string[];
  navigationPaths: NavigationPath[];
  searchUsage: number;
  bounceRate?: number;
}

export interface NavigationPath {
  from: string;
  to: string;
  frequency: number;
  averageTime: number;
}

export interface SocialMetrics {
  likes: number;
  comments: number;
  shares: number;
  follows: number;
  unfollows: number;
  socialInteractions: number;
}

export interface ContentMetrics {
  views: number;
  completions: number;
  averageWatchTime: number;
  contentTypes: Record<string, number>;
  categories: Record<string, number>;
  creators: Record<string, number>;
}

// Service integration types
export interface BehaviorServiceConfig {
  enableTracking: boolean;
  enableAnalytics: boolean;
  enablePersonalization: boolean;
  enableContextualHelp: boolean;
  enableAutomation: boolean;
  dataRetentionDays: number;
  batchSize: number;
  flushInterval: number;
}

export interface IntegrationEvent {
  type: string;
  source: string;
  target: string;
  data: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

// Error types
export interface BehaviorError extends Error {
  code: string;
  context?: Record<string, any>;
  userId?: string;
  timestamp: Date;
  retryable: boolean;
}

// API response types
export interface BehaviorAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: BehaviorError;
  metadata?: {
    timestamp: Date;
    version: string;
    requestId: string;
    cached?: boolean;
  };
}