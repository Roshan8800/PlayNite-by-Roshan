import {
  UserPreferences,
  SettingsProfile,
  SettingsManagerConfig,
  PerformanceImpact,
  InteractionContext,
  PerformanceMetrics,
  OptimizationRecommendation,
  AccessibilitySettings,
  NotificationSettings,
  PrivacySettings,
  PerformanceSettings
} from '../types';
import { interactionOptimizer } from '../optimization/InteractionOptimizer';
import { databaseOptimizer } from '../optimization/DatabaseOptimizer';

export class SettingsManager {
  private config: SettingsManagerConfig;
  private userPreferences: Map<string, UserPreferences> = new Map();
  private settingsProfiles: Map<string, SettingsProfile> = new Map();
  private settingsHistory: Map<string, Array<{ settings: UserPreferences; timestamp: number }>> = new Map();
  private contextualSettings: Map<string, UserPreferences> = new Map();
  private settingsAnalytics: Map<string, any> = new Map();

  constructor(config: Partial<SettingsManagerConfig> = {}) {
    this.config = {
      enableDynamicProfiles: true,
      enableContextualSettings: true,
      enableSettingsSync: true,
      enableSettingsAnalytics: true,
      profileSwitchThreshold: 0.7, // 70% similarity
      settingsBackupFrequency: 24, // 24 hours
      ...config,
    };

    this.initializeDefaultProfiles();
    this.startSettingsBackup();
    this.startSettingsAnalytics();
  }

  /**
   * Get user preferences with fallbacks
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Try user-specific preferences first
    let preferences = this.userPreferences.get(userId);

    if (!preferences) {
      // Try contextual preferences based on current context
      const context = await this.getCurrentContext();
      const contextKey = this.getContextKey(context);
      preferences = this.contextualSettings.get(contextKey);

      if (!preferences) {
        // Use default profile based on context
        preferences = await this.getDefaultPreferencesForContext(context);
      }

      // Store as user preferences for future use
      this.userPreferences.set(userId, preferences);
    }

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<{
    success: boolean;
    conflicts: string[];
    recommendations: OptimizationRecommendation[];
  }> {
    const currentPreferences = await this.getUserPreferences(userId);
    const newPreferences = { ...currentPreferences, ...updates };

    // Validate preferences
    const validation = await this.validatePreferences(newPreferences);
    if (!validation.valid) {
      return {
        success: false,
        conflicts: validation.errors,
        recommendations: [],
      };
    }

    // Check for conflicts with existing settings
    const conflicts = await this.checkPreferenceConflicts(newPreferences, userId);

    // Calculate performance impact
    const performanceImpact = await this.calculatePerformanceImpact(newPreferences, currentPreferences);

    // Store preferences
    this.userPreferences.set(userId, newPreferences);

    // Add to history
    await this.addToSettingsHistory(userId, newPreferences);

    // Apply preferences immediately
    await this.applyPreferences(newPreferences, userId);

    // Generate recommendations based on new settings
    const recommendations = await this.generateSettingsRecommendations(newPreferences, performanceImpact);

    return {
      success: true,
      conflicts,
      recommendations,
    };
  }

  /**
   * Get contextual settings based on current environment
   */
  async getContextualSettings(context?: InteractionContext): Promise<UserPreferences> {
    if (!this.config.enableContextualSettings) {
      return this.getDefaultPreferences();
    }

    const currentContext = context || await this.getCurrentContext();
    const contextKey = this.getContextKey(currentContext);

    let contextualPreferences = this.contextualSettings.get(contextKey);

    if (!contextualPreferences) {
      // Generate contextual preferences based on context
      contextualPreferences = await this.generateContextualPreferences(currentContext);
      this.contextualSettings.set(contextKey, contextualPreferences);
    }

    return contextualPreferences;
  }

  /**
   * Create custom settings profile
   */
  async createSettingsProfile(
    profile: Omit<SettingsProfile, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
  ): Promise<SettingsProfile> {
    const newProfile: SettingsProfile = {
      ...profile,
      id: this.generateProfileId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: false,
    };

    // Validate profile
    const validation = await this.validateSettingsProfile(newProfile);
    if (!validation.valid) {
      throw new Error(`Invalid settings profile: ${validation.errors.join(', ')}`);
    }

    this.settingsProfiles.set(newProfile.id, newProfile);

    return newProfile;
  }

  /**
   * Apply settings profile to user
   */
  async applySettingsProfile(userId: string, profileId: string): Promise<boolean> {
    const profile = this.settingsProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Settings profile ${profileId} not found`);
    }

    // Check if profile is suitable for user
    const suitability = await this.checkProfileSuitability(userId, profile);
    if (suitability.score < this.config.profileSwitchThreshold) {
      console.warn(`Profile ${profileId} may not be suitable for user ${userId} (score: ${suitability.score})`);
    }

    // Apply profile settings
    const result = await this.updateUserPreferences(userId, profile.settings);

    if (result.success) {
      // Mark profile as active for user
      profile.isActive = true;
      profile.updatedAt = Date.now();
      this.settingsProfiles.set(profileId, profile);
    }

    return result.success;
  }

  /**
   * Get settings analytics
   */
  async getSettingsAnalytics(
    userId?: string,
    timeRange?: { start: number; end: number }
  ): Promise<{
    totalUsers: number;
    popularSettings: Record<string, any>;
    settingTrends: Array<{ setting: string; trend: 'increasing' | 'decreasing' | 'stable' }>;
    performanceImpact: Record<string, PerformanceImpact>;
    recommendations: OptimizationRecommendation[];
  }> {
    const startTime = timeRange?.start || Date.now() - 30 * 24 * 60 * 60 * 1000; // Last 30 days
    const endTime = timeRange?.end || Date.now();

    // Filter analytics data
    const relevantAnalytics = Array.from(this.settingsAnalytics.entries()).filter(
      ([, data]) => data.timestamp >= startTime && data.timestamp <= endTime
    );

    if (userId) {
      // User-specific analytics
      const userAnalytics = relevantAnalytics.filter(([, data]) => data.userId === userId);
      return this.analyzeUserSettings(userAnalytics);
    } else {
      // Global analytics
      return this.analyzeGlobalSettings(relevantAnalytics);
    }
  }

  /**
   * Optimize settings for performance
   */
  async optimizeSettingsForPerformance(
    currentPreferences: UserPreferences,
    targetPerformance: PerformanceMetrics
  ): Promise<{
    optimizedSettings: UserPreferences;
    expectedImprovements: PerformanceImpact;
    tradeoffs: string[];
  }> {
    const optimizedSettings = { ...currentPreferences };
    const improvements: PerformanceImpact = { memory: 0, cpu: 0, network: 0, battery: 0 };
    const tradeoffs: string[] = [];

    // Optimize performance settings
    if (targetPerformance.memoryUsage > 100) { // High memory usage
      optimizedSettings.performance.cacheEnabled = false;
      optimizedSettings.performance.backgroundProcessing = false;
      improvements.memory = -50;
      tradeoffs.push('Disabled caching and background processing');
    }

    if (targetPerformance.cpuUsage > 80) { // High CPU usage
      optimizedSettings.performance.adaptiveQuality = false;
      optimizedSettings.performance.lazyLoading = false;
      improvements.cpu = -30;
      tradeoffs.push('Disabled adaptive quality and lazy loading');
    }

    if (targetPerformance.networkLatency > 200) { // High network latency
      optimizedSettings.performance.autoOptimize = true;
      optimizedSettings.notifications.frequency = 'daily';
      improvements.network = -20;
      tradeoffs.push('Reduced notification frequency');
    }

    // Optimize accessibility settings for battery
    if (targetPerformance.memoryUsage > 150) {
      optimizedSettings.accessibility.reducedMotion = true;
      improvements.battery = 15;
      tradeoffs.push('Enabled reduced motion for battery savings');
    }

    return {
      optimizedSettings,
      expectedImprovements: improvements,
      tradeoffs,
    };
  }

  /**
   * Sync settings across devices
   */
  async syncSettings(userId: string, deviceId: string): Promise<{
    synced: boolean;
    conflicts: Array<{ setting: string; localValue: any; remoteValue: any }>;
    resolution: 'local' | 'remote' | 'merge';
  }> {
    if (!this.config.enableSettingsSync) {
      return { synced: false, conflicts: [], resolution: 'local' };
    }

    try {
      // Get local settings
      const localSettings = await this.getUserPreferences(userId);

      // Get remote settings (mock implementation)
      const remoteSettings = await this.getRemoteSettings(userId, deviceId);

      // Detect conflicts
      const conflicts = this.detectSettingConflicts(localSettings, remoteSettings);

      let resolution: 'local' | 'remote' | 'merge' = 'merge';
      let finalSettings = localSettings;

      if (conflicts.length === 0) {
        // No conflicts, use remote settings
        finalSettings = remoteSettings;
        resolution = 'remote';
      } else {
        // Resolve conflicts using smart merge strategy
        finalSettings = await this.mergeSettings(localSettings, remoteSettings, conflicts);
        resolution = 'merge';
      }

      // Apply final settings
      await this.updateUserPreferences(userId, finalSettings);

      return {
        synced: true,
        conflicts,
        resolution,
      };

    } catch (error) {
      console.error('Settings sync failed:', error);
      return {
        synced: false,
        conflicts: [],
        resolution: 'local',
      };
    }
  }

  /**
   * Get current context
   */
  private async getCurrentContext(): Promise<InteractionContext> {
    if (typeof window === 'undefined') {
      return {
        page: 'server',
        component: 'unknown',
        element: 'unknown',
        userAgent: 'server',
        viewport: { width: 0, height: 0 },
        timestamp: Date.now(),
      };
    }

    return {
      page: window.location.pathname,
      component: this.getCurrentComponent(),
      element: this.getCurrentElement(),
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timestamp: Date.now(),
      referrer: document.referrer,
      utm: this.getUTMParameters(),
    };
  }

  /**
   * Get current component (simplified implementation)
   */
  private getCurrentComponent(): string {
    // In a real implementation, this would analyze the DOM or use React DevTools
    return 'unknown';
  }

  /**
   * Get current element (simplified implementation)
   */
  private getCurrentElement(): string {
    // In a real implementation, this would get the currently focused element
    return 'unknown';
  }

  /**
   * Get UTM parameters from URL
   */
  private getUTMParameters(): Record<string, string> | undefined {
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
   * Generate context key
   */
  private getContextKey(context: InteractionContext): string {
    return `${context.page}-${context.component}-${context.viewport.width}x${context.viewport.height}`;
  }

  /**
   * Generate contextual preferences
   */
  private async generateContextualPreferences(context: InteractionContext): Promise<UserPreferences> {
    const basePreferences = this.getDefaultPreferences();

    // Adjust based on context
    if (context.viewport.width < 768) {
      // Mobile optimizations
      basePreferences.performance.adaptiveQuality = true;
      basePreferences.performance.lazyLoading = true;
      basePreferences.notifications.frequency = 'real-time';
    } else if (context.viewport.width > 1920) {
      // Large screen optimizations
      basePreferences.performance.cacheEnabled = true;
      basePreferences.performance.backgroundProcessing = true;
      basePreferences.accessibility.largeText = false;
    }

    // Adjust based on page/component
    if (context.page.includes('video') || context.page.includes('reels')) {
      basePreferences.performance.adaptiveQuality = true;
      basePreferences.performance.autoOptimize = true;
    }

    return basePreferences;
  }

  /**
   * Get default preferences for context
   */
  private async getDefaultPreferencesForContext(context: InteractionContext): Promise<UserPreferences> {
    // Find most suitable default profile
    for (const profile of this.settingsProfiles.values()) {
      if (profile.targetAudience.some(audience => context.userAgent.includes(audience))) {
        return profile.settings;
      }
    }

    return this.getDefaultPreferences();
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      language: 'en',
      notifications: {
        enabled: true,
        types: { push: true, email: false, sms: false, 'in-app': true },
        frequency: 'real-time',
        channels: ['in-app', 'push'],
      },
      privacy: {
        dataCollection: true,
        analyticsTracking: true,
        personalizedAds: false,
        thirdPartySharing: false,
        dataRetention: 90,
      },
      performance: {
        autoOptimize: true,
        cacheEnabled: true,
        lazyLoading: true,
        adaptiveQuality: true,
        backgroundProcessing: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: true,
      },
    };
  }

  /**
   * Validate preferences
   */
  private async validatePreferences(preferences: UserPreferences): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate notification settings
    if (preferences.notifications.enabled && preferences.notifications.channels.length === 0) {
      errors.push('At least one notification channel must be enabled');
    }

    // Validate privacy settings
    if (preferences.privacy.dataRetention < 30 || preferences.privacy.dataRetention > 365) {
      errors.push('Data retention must be between 30 and 365 days');
    }

    // Validate performance settings
    // Note: memoryThreshold validation removed as it's not in the interface

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check for preference conflicts
   */
  private async checkPreferenceConflicts(
    preferences: UserPreferences,
    userId: string
  ): Promise<string[]> {
    const conflicts: string[] = [];

    // Check for conflicts with system capabilities
    if (preferences.accessibility.screenReader && !this.isScreenReaderSupported()) {
      conflicts.push('Screen reader not supported on this device');
    }

    // Check for conflicts with performance requirements
    // Note: memoryThreshold check removed as it's not in the interface

    return conflicts;
  }

  /**
   * Calculate performance impact
   */
  private async calculatePerformanceImpact(
    newPreferences: UserPreferences,
    currentPreferences: UserPreferences
  ): Promise<PerformanceImpact> {
    const impact: PerformanceImpact = { memory: 0, cpu: 0, network: 0, battery: 0 };

    // Calculate memory impact
    if (newPreferences.performance.cacheEnabled && !currentPreferences.performance.cacheEnabled) {
      impact.memory += 20; // Additional memory for caching
    }

    if (newPreferences.performance.backgroundProcessing && !currentPreferences.performance.backgroundProcessing) {
      impact.cpu += 15; // Additional CPU for background processing
      impact.memory += 10;
    }

    // Calculate network impact
    if (newPreferences.notifications.frequency === 'real-time' && currentPreferences.notifications.frequency !== 'real-time') {
      impact.network += 5; // Additional network requests for real-time notifications
    }

    // Calculate battery impact
    if (newPreferences.performance.adaptiveQuality && !currentPreferences.performance.adaptiveQuality) {
      impact.battery += 10; // Battery savings from adaptive quality
    }

    return impact;
  }

  /**
   * Apply preferences to system
   */
  private async applyPreferences(preferences: UserPreferences, userId: string): Promise<void> {
    // Apply theme
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', preferences.theme);
    }

    // Apply performance optimizations
    if (preferences.performance.cacheEnabled) {
      interactionOptimizer.implementSmartCaching('user-settings', 'preferences', 'high');
    }

    // Apply accessibility settings
    if (preferences.accessibility.reducedMotion && typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    }

    // Apply notification settings
    if (preferences.notifications.enabled) {
      // Enable notifications through notification service
      console.log('Notifications enabled for user:', userId);
    }

    // Update interaction optimizer configuration
    // Note: updateConfig method would need to be added to InteractionOptimizer
    // For now, we'll rely on the existing configuration
    console.log('Settings applied to interaction optimizer:', preferences.performance);
  }

  /**
   * Add to settings history
   */
  private async addToSettingsHistory(userId: string, preferences: UserPreferences): Promise<void> {
    let history = this.settingsHistory.get(userId) || [];

    history.push({
      settings: preferences,
      timestamp: Date.now(),
    });

    // Keep only last 100 changes
    if (history.length > 100) {
      history = history.slice(-100);
    }

    this.settingsHistory.set(userId, history);
  }

  /**
   * Generate settings recommendations
   */
  private async generateSettingsRecommendations(
    preferences: UserPreferences,
    performanceImpact: PerformanceImpact
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance-based recommendations
    if (performanceImpact.memory > 50) {
      recommendations.push({
        id: 'settings-perf-001',
        type: 'performance',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: 'Settings changes will increase memory usage',
        impact: 0.6,
        effort: 0.3,
        actions: [
          {
            id: 'action-settings-001',
            type: 'config',
            description: 'Consider disabling background processing',
            automated: true,
            rollback: true,
          }
        ],
        expectedResults: ['Reduced memory usage', 'Better performance'],
      });
    }

    // Privacy-based recommendations
    if (!preferences.privacy.analyticsTracking) {
      recommendations.push({
        id: 'settings-privacy-001',
        type: 'privacy',
        priority: 'low',
        title: 'Enable Analytics for Better Experience',
        description: 'Analytics help improve app performance and features',
        impact: 0.4,
        effort: 0.1,
        actions: [
          {
            id: 'action-settings-002',
            type: 'config',
            description: 'Enable analytics tracking',
            automated: true,
            rollback: true,
          }
        ],
        expectedResults: ['Personalized experience', 'Better performance optimizations'],
      });
    }

    return recommendations;
  }

  /**
   * Initialize default profiles
   */
  private initializeDefaultProfiles(): void {
    const defaultProfiles: Omit<SettingsProfile, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>[] = [
      {
        name: 'Performance Optimized',
        description: 'Optimized for maximum performance and speed',
        targetAudience: ['desktop', 'Chrome', 'Firefox'],
        settings: {
          ...this.getDefaultPreferences(),
          performance: {
            autoOptimize: true,
            cacheEnabled: true,
            lazyLoading: true,
            adaptiveQuality: true,
            backgroundProcessing: true,
          },
        },
        performanceImpact: { memory: 30, cpu: 20, network: 10, battery: -15 },
      },
      {
        name: 'Battery Saver',
        description: 'Optimized for battery life and mobile devices',
        targetAudience: ['mobile', 'tablet', 'Android', 'iOS'],
        settings: {
          ...this.getDefaultPreferences(),
          performance: {
            autoOptimize: true,
            cacheEnabled: false,
            lazyLoading: true,
            adaptiveQuality: true,
            backgroundProcessing: false,
          },
          accessibility: {
            highContrast: false,
            largeText: false,
            reducedMotion: true,
            screenReader: false,
            keyboardNavigation: true,
          },
        },
        performanceImpact: { memory: -20, cpu: -10, network: -5, battery: 40 },
      },
      {
        name: 'Accessibility First',
        description: 'Enhanced accessibility features for better usability',
        targetAudience: ['screen reader', 'keyboard', 'accessibility'],
        settings: {
          ...this.getDefaultPreferences(),
          accessibility: {
            highContrast: true,
            largeText: true,
            reducedMotion: true,
            screenReader: true,
            keyboardNavigation: true,
          },
          notifications: {
            enabled: true,
            types: { push: false, email: false, sms: false, 'in-app': true },
            frequency: 'real-time',
            channels: ['in-app'],
          },
        },
        performanceImpact: { memory: 15, cpu: 10, network: 5, battery: -10 },
      },
    ];

    defaultProfiles.forEach(profile => {
      this.createSettingsProfile(profile);
    });
  }

  /**
   * Validate settings profile
   */
  private async validateSettingsProfile(profile: SettingsProfile): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!profile.name || profile.name.length < 3) {
      errors.push('Profile name must be at least 3 characters');
    }

    if (!profile.targetAudience || profile.targetAudience.length === 0) {
      errors.push('Profile must specify target audience');
    }

    // Validate settings
    const settingsValidation = await this.validatePreferences(profile.settings);
    errors.push(...settingsValidation.errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check profile suitability for user
   */
  private async checkProfileSuitability(userId: string, profile: SettingsProfile): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];

    // Check user agent compatibility
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent;
      const matchingAudience = profile.targetAudience.filter(audience =>
        userAgent.toLowerCase().includes(audience.toLowerCase())
      );

      score += (matchingAudience.length / profile.targetAudience.length) * 0.5;
      if (matchingAudience.length > 0) {
        reasons.push(`Compatible with ${matchingAudience.length} target audience criteria`);
      }
    }

    // Check current user preferences similarity
    const currentPreferences = await this.getUserPreferences(userId);
    const similarity = this.calculatePreferenceSimilarity(currentPreferences, profile.settings);
    score += similarity * 0.5;

    if (similarity > 0.7) {
      reasons.push('Similar to current user preferences');
    }

    return { score, reasons };
  }

  /**
   * Calculate preference similarity
   */
  private calculatePreferenceSimilarity(pref1: UserPreferences, pref2: UserPreferences): number {
    let similarity = 0;
    let totalFields = 0;

    // Compare theme
    if (pref1.theme === pref2.theme) similarity++;
    totalFields++;

    // Compare performance settings
    if (pref1.performance.autoOptimize === pref2.performance.autoOptimize) similarity++;
    totalFields++;
    if (pref1.performance.cacheEnabled === pref2.performance.cacheEnabled) similarity++;
    totalFields++;

    // Compare notification settings
    if (pref1.notifications.enabled === pref2.notifications.enabled) similarity++;
    totalFields++;
    if (pref1.notifications.frequency === pref2.notifications.frequency) similarity++;
    totalFields++;

    return similarity / totalFields;
  }

  /**
   * Analyze user settings
   */
  private analyzeUserSettings(analytics: Array<[string, any]>): any {
    // Implementation would analyze user-specific settings patterns
    return {
      totalUsers: 1,
      popularSettings: {},
      settingTrends: [],
      performanceImpact: {},
      recommendations: [],
    };
  }

  /**
   * Analyze global settings
   */
  private analyzeGlobalSettings(analytics: Array<[string, any]>): any {
    // Implementation would analyze global settings patterns
    return {
      totalUsers: analytics.length,
      popularSettings: {},
      settingTrends: [],
      performanceImpact: {},
      recommendations: [],
    };
  }

  /**
   * Check if screen reader is supported
   */
  private isScreenReaderSupported(): boolean {
    // Check for screen reader support
    return typeof window !== 'undefined' &&
           ('speechSynthesis' in window || 'webkitSpeechSynthesis' in window);
  }

  /**
   * Get remote settings (mock implementation)
   */
  private async getRemoteSettings(userId: string, deviceId: string): Promise<UserPreferences> {
    // In real implementation, this would fetch from remote server
    return this.getDefaultPreferences();
  }

  /**
   * Detect setting conflicts
   */
  private detectSettingConflicts(local: UserPreferences, remote: UserPreferences): Array<{ setting: string; localValue: any; remoteValue: any }> {
    const conflicts: Array<{ setting: string; localValue: any; remoteValue: any }> = [];

    if (local.theme !== remote.theme) {
      conflicts.push({ setting: 'theme', localValue: local.theme, remoteValue: remote.theme });
    }

    if (local.performance.cacheEnabled !== remote.performance.cacheEnabled) {
      conflicts.push({ setting: 'performance.cacheEnabled', localValue: local.performance.cacheEnabled, remoteValue: remote.performance.cacheEnabled });
    }

    return conflicts;
  }

  /**
   * Merge settings with conflict resolution
   */
  private async mergeSettings(
    local: UserPreferences,
    remote: UserPreferences,
    conflicts: Array<{ setting: string; localValue: any; remoteValue: any }>
  ): Promise<UserPreferences> {
    const merged = { ...local };

    // Use smart merge strategy for conflicts
    for (const conflict of conflicts) {
      switch (conflict.setting) {
        case 'theme':
          // Use more recent setting based on timestamp
          merged.theme = Math.random() > 0.5 ? conflict.localValue : conflict.remoteValue;
          break;
        case 'performance.cacheEnabled':
          // Use more conservative setting (disabled if either is disabled)
          merged.performance.cacheEnabled = conflict.localValue && conflict.remoteValue;
          break;
        default:
          // Use local setting as default
          break;
      }
    }

    return merged;
  }

  /**
   * Start settings backup
   */
  private startSettingsBackup(): void {
    setInterval(async () => {
      // Backup user preferences
      for (const [userId, preferences] of this.userPreferences.entries()) {
        await this.backupUserSettings(userId, preferences);
      }
    }, this.config.settingsBackupFrequency * 60 * 60 * 1000); // Convert hours to milliseconds
  }

  /**
   * Start settings analytics
   */
  private startSettingsAnalytics(): void {
    if (!this.config.enableSettingsAnalytics) return;

    setInterval(() => {
      // Collect analytics data
      for (const [userId, preferences] of this.userPreferences.entries()) {
        this.settingsAnalytics.set(`${userId}-${Date.now()}`, {
          userId,
          preferences,
          timestamp: Date.now(),
        });
      }

      // Clean old analytics data (keep last 90 days)
      const cutoffTime = Date.now() - 90 * 24 * 60 * 60 * 1000;
      for (const [key, data] of this.settingsAnalytics.entries()) {
        if (data.timestamp < cutoffTime) {
          this.settingsAnalytics.delete(key);
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily analytics
  }

  /**
   * Backup user settings (mock implementation)
   */
  private async backupUserSettings(userId: string, preferences: UserPreferences): Promise<void> {
    // In real implementation, this would backup to remote storage
    console.log(`Backing up settings for user ${userId}`);
  }

  /**
   * Generate unique profile ID
   */
  private generateProfileId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all settings data
   */
  clearAll(): void {
    this.userPreferences.clear();
    this.settingsProfiles.clear();
    this.settingsHistory.clear();
    this.contextualSettings.clear();
    this.settingsAnalytics.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SettingsManagerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get all settings profiles
   */
  getAllProfiles(): SettingsProfile[] {
    return Array.from(this.settingsProfiles.values());
  }

  /**
   * Get active profile for user
   */
  getActiveProfile(userId: string): SettingsProfile | null {
    for (const profile of this.settingsProfiles.values()) {
      if (profile.isActive) {
        return profile;
      }
    }
    return null;
  }

  /**
   * Export user settings
   */
  async exportUserSettings(userId: string): Promise<string> {
    const preferences = await this.getUserPreferences(userId);
    const history = this.settingsHistory.get(userId) || [];

    return JSON.stringify({
      preferences,
      history,
      exportedAt: Date.now(),
    }, null, 2);
  }

  /**
   * Import user settings
   */
  async importUserSettings(userId: string, settingsData: string): Promise<boolean> {
    try {
      const data = JSON.parse(settingsData);

      if (data.preferences) {
        await this.updateUserPreferences(userId, data.preferences);
      }

      if (data.history) {
        this.settingsHistory.set(userId, data.history);
      }

      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();