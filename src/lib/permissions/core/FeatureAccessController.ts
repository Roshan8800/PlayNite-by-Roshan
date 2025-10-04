import {
  PermissionType,
  FeatureAccessRule,
  PlatformFeatureConfig,
  FallbackBehavior,
  PermissionStatus,
  PlatformType
} from '../types';

import { PermissionManager } from './PermissionManager';

/**
 * Controls access to mobile features based on permission states
 * Implements feature gating, fallback behaviors, and platform-specific logic
 */
export class FeatureAccessController {
  private static instance: FeatureAccessController;
  private permissionManager: PermissionManager;
  private featureRules: Map<string, FeatureAccessRule> = new Map();
  private isInitialized = false;

  private constructor() {
    this.permissionManager = PermissionManager.getInstance();
  }

  /**
   * Get singleton instance of FeatureAccessController
   */
  public static getInstance(): FeatureAccessController {
    if (!FeatureAccessController.instance) {
      FeatureAccessController.instance = new FeatureAccessController();
    }
    return FeatureAccessController.instance;
  }

  /**
   * Initialize the feature access controller
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.permissionManager.initialize();
    this.setupDefaultFeatureRules();
    this.isInitialized = true;
  }

  /**
   * Register a feature access rule
   */
  public registerFeatureRule(rule: FeatureAccessRule): void {
    this.ensureInitialized();
    this.featureRules.set(rule.feature, rule);
  }

  /**
   * Register multiple feature access rules
   */
  public registerFeatureRules(rules: FeatureAccessRule[]): void {
    this.ensureInitialized();
    rules.forEach(rule => this.registerFeatureRule(rule));
  }

  /**
   * Check if a feature is accessible
   */
  public async canAccessFeature(featureName: string): Promise<boolean> {
    this.ensureInitialized();

    const rule = this.featureRules.get(featureName);
    if (!rule) {
      // If no rule is defined, feature is accessible by default
      return true;
    }

    return this.evaluateFeatureRule(rule);
  }

  /**
   * Get feature access information including fallback behavior
   */
  public async getFeatureAccessInfo(featureName: string): Promise<{
    canAccess: boolean;
    reason?: string;
    fallbackBehavior?: FallbackBehavior;
    missingPermissions?: PermissionType[];
    platformOverrides?: PlatformFeatureConfig;
  }> {
    this.ensureInitialized();

    const rule = this.featureRules.get(featureName);
    if (!rule) {
      return { canAccess: true };
    }

    const canAccess = await this.evaluateFeatureRule(rule);
    const missingPermissions = await this.getMissingPermissions(rule.requiredPermissions);

    return {
      canAccess,
      reason: canAccess ? undefined : this.getDenialReason(missingPermissions),
      fallbackBehavior: canAccess ? undefined : rule.fallbackBehavior,
      missingPermissions: canAccess ? undefined : missingPermissions,
      platformOverrides: rule.platformOverrides
    };
  }

  /**
   * Get all accessible features for current permission state
   */
  public async getAccessibleFeatures(): Promise<string[]> {
    this.ensureInitialized();

    const accessibleFeatures: string[] = [];

    for (const [featureName, rule] of this.featureRules) {
      if (await this.evaluateFeatureRule(rule)) {
        accessibleFeatures.push(featureName);
      }
    }

    return accessibleFeatures;
  }

  /**
   * Get features that require specific permissions
   */
  public getFeaturesRequiringPermission(permission: PermissionType): string[] {
    this.ensureInitialized();

    const features: string[] = [];

    for (const [featureName, rule] of this.featureRules) {
      if (rule.requiredPermissions.includes(permission)) {
        features.push(featureName);
      }
    }

    return features;
  }

  /**
   * Update feature rule
   */
  public updateFeatureRule(featureName: string, updates: Partial<FeatureAccessRule>): void {
    this.ensureInitialized();

    const existingRule = this.featureRules.get(featureName);
    if (existingRule) {
      this.featureRules.set(featureName, { ...existingRule, ...updates });
    }
  }

  /**
   * Remove feature rule
   */
  public removeFeatureRule(featureName: string): void {
    this.ensureInitialized();
    this.featureRules.delete(featureName);
  }

  /**
   * Get current platform type
   */
  private getCurrentPlatform(): PlatformType {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('android')) {
        return 'android';
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        return 'ios';
      }
    }
    return 'web';
  }

  /**
   * Evaluate a feature access rule
   */
  private async evaluateFeatureRule(rule: FeatureAccessRule): Promise<boolean> {
    const platform = this.getCurrentPlatform();

    // Check platform-specific overrides first
    const platformConfig = rule.platformOverrides?.[platform as keyof PlatformFeatureConfig];
    if (platformConfig) {
      if (!platformConfig.enabled) {
        return false;
      }

      // Check platform-specific permissions
      const missingPermissions = await this.getMissingPermissions(
        platformConfig.requiredPermissions
      );

      return missingPermissions.length === 0;
    }

    // Check default permissions
    const missingPermissions = await this.getMissingPermissions(rule.requiredPermissions);
    return missingPermissions.length === 0;
  }

  /**
   * Get missing permissions for a list of required permissions
   */
  private async getMissingPermissions(requiredPermissions: PermissionType[]): Promise<PermissionType[]> {
    const missingPermissions: PermissionType[] = [];

    for (const permission of requiredPermissions) {
      const status = this.permissionManager.getPermissionStatus(permission);

      if (status !== 'granted') {
        missingPermissions.push(permission);
      }
    }

    return missingPermissions;
  }

  /**
   * Get denial reason for missing permissions
   */
  private getDenialReason(missingPermissions: PermissionType[]): string {
    if (missingPermissions.length === 0) {
      return 'Feature is not available';
    }

    if (missingPermissions.length === 1) {
      return `Missing required permission: ${missingPermissions[0]}`;
    }

    return `Missing required permissions: ${missingPermissions.join(', ')}`;
  }

  /**
   * Set up default feature rules for common mobile features
   */
  private setupDefaultFeatureRules(): void {
    const defaultRules: FeatureAccessRule[] = [
      {
        feature: 'camera_capture',
        requiredPermissions: [PermissionType.CAMERA],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'video_recording',
        requiredPermissions: [PermissionType.CAMERA, PermissionType.MICROPHONE],
        fallbackBehavior: FallbackBehavior.REQUEST_PERMISSION
      },
      {
        feature: 'photo_library',
        requiredPermissions: [PermissionType.CAMERA_ROLL, PermissionType.MEDIA_LIBRARY],
        fallbackBehavior: FallbackBehavior.SHOW_PLACEHOLDER
      },
      {
        feature: 'location_sharing',
        requiredPermissions: [PermissionType.LOCATION],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'background_location',
        requiredPermissions: [PermissionType.LOCATION_ALWAYS],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'push_notifications',
        requiredPermissions: [PermissionType.NOTIFICATIONS],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'voice_search',
        requiredPermissions: [PermissionType.MICROPHONE, PermissionType.SPEECH_RECOGNITION],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'biometric_auth',
        requiredPermissions: [PermissionType.BIOMETRIC],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'contact_sync',
        requiredPermissions: [PermissionType.CONTACTS],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'file_upload',
        requiredPermissions: [PermissionType.STORAGE],
        fallbackBehavior: FallbackBehavior.SHOW_PLACEHOLDER
      },
      {
        feature: 'background_sync',
        requiredPermissions: [PermissionType.BACKGROUND_REFRESH],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'health_tracking',
        requiredPermissions: [PermissionType.HEALTH, PermissionType.ACTIVITY_RECOGNITION],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'bluetooth_devices',
        requiredPermissions: [PermissionType.BLUETOOTH],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'nfc_payments',
        requiredPermissions: [PermissionType.NFC],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'sms_verification',
        requiredPermissions: [PermissionType.SMS],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'phone_calls',
        requiredPermissions: [PermissionType.CALL_PHONE],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'motion_tracking',
        requiredPermissions: [PermissionType.MOTION, PermissionType.ACTIVITY_RECOGNITION],
        fallbackBehavior: FallbackBehavior.USE_ALTERNATIVE
      },
      {
        feature: 'accessibility_features',
        requiredPermissions: [PermissionType.ACCESSIBILITY],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'system_overlay',
        requiredPermissions: [PermissionType.SYSTEM_ALERT_WINDOW],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      },
      {
        feature: 'settings_modification',
        requiredPermissions: [PermissionType.WRITE_SETTINGS],
        fallbackBehavior: FallbackBehavior.DISABLE_FEATURE
      }
    ];

    this.registerFeatureRules(defaultRules);
  }

  /**
   * Get fallback behavior for a feature
   */
  public getFallbackBehavior(featureName: string): FallbackBehavior | null {
    this.ensureInitialized();

    const rule = this.featureRules.get(featureName);
    return rule?.fallbackBehavior || null;
  }

  /**
   * Check if feature has platform-specific configuration
   */
  public hasPlatformConfig(featureName: string, platform: PlatformType): boolean {
    this.ensureInitialized();

    const rule = this.featureRules.get(featureName);
    return !!(rule?.platformOverrides?.[platform as keyof PlatformFeatureConfig]);
  }

  /**
   * Get platform-specific feature configuration
   */
  public getPlatformFeatureConfig(featureName: string, platform: PlatformType): any {
    this.ensureInitialized();

    const rule = this.featureRules.get(featureName);
    return rule?.platformOverrides?.[platform as keyof PlatformFeatureConfig] || null;
  }

  /**
   * Reset all feature rules (for testing/debugging)
   */
  public reset(): void {
    this.featureRules.clear();
    this.isInitialized = false;
  }

  /**
   * Ensure controller is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('FeatureAccessController not initialized. Call initialize() first.');
    }
  }
}