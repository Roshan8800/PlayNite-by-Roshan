import {
  PermissionType,
  PermissionStatus,
  PlatformType,
  PermissionState
} from '../types';

import { PermissionManager } from '../core/PermissionManager';

/**
 * Privacy and security manager for mobile permissions
 * Handles privacy controls, data protection, and security settings
 */
export class PrivacyManager {
  private static instance: PrivacyManager;
  private permissionManager: PermissionManager;
  private privacySettings: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {
    this.permissionManager = PermissionManager.getInstance();
  }

  /**
   * Get singleton instance of PrivacyManager
   */
  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  /**
   * Initialize the privacy manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.permissionManager.initialize();
    await this.loadPrivacySettings();
    this.isInitialized = true;
  }

  /**
   * Get privacy setting
   */
  public getPrivacySetting(key: string): any {
    this.ensureInitialized();
    return this.privacySettings.get(key);
  }

  /**
   * Set privacy setting
   */
  public setPrivacySetting(key: string, value: any): void {
    this.ensureInitialized();
    this.privacySettings.set(key, value);
    this.savePrivacySettings();
  }

  /**
   * Get all privacy settings
   */
  public getAllPrivacySettings(): Record<string, any> {
    this.ensureInitialized();
    return Object.fromEntries(this.privacySettings);
  }

  /**
   * Check if data collection is allowed for a permission
   */
  public isDataCollectionAllowed(permissionType: PermissionType): boolean {
    this.ensureInitialized();

    const settingKey = `data_collection_${permissionType}`;
    return this.privacySettings.get(settingKey) !== false;
  }

  /**
   * Set data collection preference for a permission
   */
  public setDataCollectionAllowed(permissionType: PermissionType, allowed: boolean): void {
    this.ensureInitialized();

    const settingKey = `data_collection_${permissionType}`;
    this.setPrivacySetting(settingKey, allowed);
  }

  /**
   * Check if location tracking is allowed
   */
  public isLocationTrackingAllowed(): boolean {
    this.ensureInitialized();

    return this.privacySettings.get('location_tracking') !== false;
  }

  /**
   * Set location tracking preference
   */
  public setLocationTrackingAllowed(allowed: boolean): void {
    this.ensureInitialized();
    this.setPrivacySetting('location_tracking', allowed);
  }

  /**
   * Check if analytics collection is allowed
   */
  public isAnalyticsAllowed(): boolean {
    this.ensureInitialized();

    return this.privacySettings.get('analytics_collection') !== false;
  }

  /**
   * Set analytics collection preference
   */
  public setAnalyticsAllowed(allowed: boolean): void {
    this.ensureInitialized();
    this.setPrivacySetting('analytics_collection', allowed);
  }

  /**
   * Check if personalized ads are allowed
   */
  public isPersonalizedAdsAllowed(): boolean {
    this.ensureInitialized();

    return this.privacySettings.get('personalized_ads') !== false;
  }

  /**
   * Set personalized ads preference
   */
  public setPersonalizedAdsAllowed(allowed: boolean): void {
    this.ensureInitialized();
    this.setPrivacySetting('personalized_ads', allowed);
  }

  /**
   * Check if crash reporting is allowed
   */
  public isCrashReportingAllowed(): boolean {
    this.ensureInitialized();

    return this.privacySettings.get('crash_reporting') !== false;
  }

  /**
   * Set crash reporting preference
   */
  public setCrashReportingAllowed(allowed: boolean): void {
    this.ensureInitialized();
    this.setPrivacySetting('crash_reporting', allowed);
  }

  /**
   * Get data retention period in days
   */
  public getDataRetentionPeriod(): number {
    this.ensureInitialized();

    return this.privacySettings.get('data_retention_days') || 365;
  }

  /**
   * Set data retention period in days
   */
  public setDataRetentionPeriod(days: number): void {
    this.ensureInitialized();
    this.setPrivacySetting('data_retention_days', days);
  }

  /**
   * Check if data sharing with third parties is allowed
   */
  public isThirdPartySharingAllowed(): boolean {
    this.ensureInitialized();

    return this.privacySettings.get('third_party_sharing') === true;
  }

  /**
   * Set third party sharing preference
   */
  public setThirdPartySharingAllowed(allowed: boolean): void {
    this.ensureInitialized();
    this.setPrivacySetting('third_party_sharing', allowed);
  }

  /**
   * Export user privacy data
   */
  public async exportPrivacyData(): Promise<any> {
    this.ensureInitialized();

    const currentPermissions = this.permissionManager.getAllPermissions();

    return {
      privacySettings: this.getAllPrivacySettings(),
      currentPermissions,
      exportDate: new Date().toISOString(),
      dataRetentionPeriod: this.getDataRetentionPeriod(),
      platform: this.getCurrentPlatform()
    };
  }

  /**
   * Delete all user privacy data
   */
  public async deletePrivacyData(): Promise<void> {
    this.ensureInitialized();

    // Reset all privacy settings to defaults
    this.privacySettings.clear();

    // Set secure defaults
    this.setAnalyticsAllowed(false);
    this.setPersonalizedAdsAllowed(false);
    this.setLocationTrackingAllowed(false);
    this.setCrashReportingAllowed(true); // Keep for app stability
    this.setThirdPartySharingAllowed(false);
    this.setDataRetentionPeriod(90); // Shorter retention

    this.savePrivacySettings();
  }

  /**
   * Get privacy compliance status
   */
  public getComplianceStatus(): {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    coppaCompliant: boolean;
    hipaaCompliant: boolean;
    issues: string[];
  } {
    this.ensureInitialized();

    const issues: string[] = [];
    let gdprCompliant = true;
    let ccpaCompliant = true;
    let coppaCompliant = true;
    let hipaaCompliant = true;

    // Check GDPR compliance
    if (!this.isDataCollectionAllowed(PermissionType.HEALTH)) {
      gdprCompliant = false;
      issues.push('GDPR: Health data collection not properly controlled');
    }

    // Check CCPA compliance
    if (!this.isThirdPartySharingAllowed()) {
      ccpaCompliant = false;
      issues.push('CCPA: Third-party sharing controls not implemented');
    }

    // Check COPPA compliance (age verification)
    if (!this.privacySettings.has('age_verified')) {
      coppaCompliant = false;
      issues.push('COPPA: Age verification not implemented');
    }

    // Check HIPAA compliance for health data
    if (this.isDataCollectionAllowed(PermissionType.HEALTH)) {
      if (!this.privacySettings.get('hipaa_compliant_storage')) {
        hipaaCompliant = false;
        issues.push('HIPAA: Health data storage not compliant');
      }
    }

    return {
      gdprCompliant,
      ccpaCompliant,
      coppaCompliant,
      hipaaCompliant,
      issues
    };
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
   * Load privacy settings from storage
   */
  private async loadPrivacySettings(): Promise<void> {
    try {
      const stored = localStorage.getItem('playnite_privacy_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.privacySettings = new Map(Object.entries(settings));
      } else {
        // Set default privacy settings
        this.setDefaultPrivacySettings();
      }
    } catch (error) {
      console.warn('Failed to load privacy settings:', error);
      this.setDefaultPrivacySettings();
    }
  }

  /**
   * Set default privacy settings
   */
  private setDefaultPrivacySettings(): void {
    // Privacy-first defaults
    this.setAnalyticsAllowed(false);
    this.setPersonalizedAdsAllowed(false);
    this.setLocationTrackingAllowed(false);
    this.setCrashReportingAllowed(true);
    this.setThirdPartySharingAllowed(false);
    this.setDataRetentionPeriod(365);

    // Set data collection defaults for each permission type
    Object.values(PermissionType).forEach(permissionType => {
      // Default to allowing data collection for essential permissions
      const essentialPermissions = [
        PermissionType.CAMERA,
        PermissionType.MICROPHONE,
        PermissionType.STORAGE,
        PermissionType.NOTIFICATIONS
      ];

      const allowed = essentialPermissions.includes(permissionType);
      this.setDataCollectionAllowed(permissionType, allowed);
    });
  }

  /**
   * Save privacy settings to storage
   */
  private savePrivacySettings(): void {
    try {
      const settings = Object.fromEntries(this.privacySettings);
      localStorage.setItem('playnite_privacy_settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save privacy settings:', error);
    }
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PrivacyManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Reset privacy settings (for testing/debugging)
   */
  public reset(): void {
    this.privacySettings.clear();
    localStorage.removeItem('playnite_privacy_settings');
    this.isInitialized = false;
  }
}