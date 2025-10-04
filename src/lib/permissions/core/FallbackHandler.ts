import {
  PermissionType,
  FallbackBehavior,
  PlatformType
} from '../types';

import { FeatureAccessController } from './FeatureAccessController';
import { PermissionManager } from './PermissionManager';

/**
 * Handles fallback behaviors when permissions are denied
 * Provides graceful degradation and alternative user experiences
 */
export class FallbackHandler {
  private static instance: FallbackHandler;
  private featureController: FeatureAccessController;
  private permissionManager: PermissionManager;
  private fallbackCache: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {
    this.featureController = FeatureAccessController.getInstance();
    this.permissionManager = PermissionManager.getInstance();
  }

  /**
   * Get singleton instance of FallbackHandler
   */
  public static getInstance(): FallbackHandler {
    if (!FallbackHandler.instance) {
      FallbackHandler.instance = new FallbackHandler();
    }
    return FallbackHandler.instance;
  }

  /**
   * Initialize the fallback handler
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.featureController.initialize();
    await this.permissionManager.initialize();
    this.isInitialized = true;
  }

  /**
   * Handle fallback for a denied permission
   */
  public async handlePermissionFallback(
    permissionType: PermissionType,
    context?: Record<string, any>
  ): Promise<{
    success: boolean;
    fallbackUsed: FallbackBehavior;
    alternativeValue?: any;
    userMessage?: string;
  }> {
    this.ensureInitialized();

    // Check if permission is actually denied
    const permissionStatus = this.permissionManager.getPermissionStatus(permissionType);
    if (permissionStatus === 'granted') {
      return {
        success: true,
        fallbackUsed: FallbackBehavior.DISABLE_FEATURE
      };
    }

    // Find features that require this permission
    const affectedFeatures = this.featureController.getFeaturesRequiringPermission(permissionType);

    if (affectedFeatures.length === 0) {
      return {
        success: true,
        fallbackUsed: FallbackBehavior.DISABLE_FEATURE
      };
    }

    // Handle fallback for each affected feature
    const fallbackResults = await Promise.all(
      affectedFeatures.map(featureName =>
        this.handleFeatureFallback(featureName, context)
      )
    );

    // Return the most successful fallback result
    const successfulFallback = fallbackResults.find(result => result.success);
    if (successfulFallback) {
      return successfulFallback;
    }

    // Return the first result if none succeeded
    return fallbackResults[0] || {
      success: false,
      fallbackUsed: FallbackBehavior.DISABLE_FEATURE,
      userMessage: 'Feature is not available without required permissions.'
    };
  }

  /**
   * Handle fallback for a specific feature
   */
  public async handleFeatureFallback(
    featureName: string,
    context?: Record<string, any>
  ): Promise<{
    success: boolean;
    fallbackUsed: FallbackBehavior;
    alternativeValue?: any;
    userMessage?: string;
  }> {
    this.ensureInitialized();

    const accessInfo = await this.featureController.getFeatureAccessInfo(featureName);
    const fallbackBehavior = accessInfo.fallbackBehavior || FallbackBehavior.DISABLE_FEATURE;

    // Check cache first
    const cacheKey = `${featureName}_${fallbackBehavior}`;
    const cachedResult = this.fallbackCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    let result: any;

    switch (fallbackBehavior) {
      case FallbackBehavior.DISABLE_FEATURE:
        result = await this.handleDisableFeature(featureName, context);
        break;

      case FallbackBehavior.SHOW_PLACEHOLDER:
        result = await this.handleShowPlaceholder(featureName, context);
        break;

      case FallbackBehavior.REQUEST_PERMISSION:
        result = await this.handleRequestPermission(featureName, context);
        break;

      case FallbackBehavior.USE_ALTERNATIVE:
        result = await this.handleUseAlternative(featureName, context);
        break;

      case FallbackBehavior.REDIRECT_TO_WEB:
        result = await this.handleRedirectToWeb(featureName, context);
        break;

      default:
        result = {
          success: false,
          fallbackUsed: fallbackBehavior,
          userMessage: 'Feature is not available.'
        };
    }

    // Cache the result
    this.fallbackCache.set(cacheKey, result);

    return result;
  }

  /**
   * Handle feature disable fallback
   */
  private async handleDisableFeature(
    featureName: string,
    context?: Record<string, any>
  ): Promise<any> {
    return {
      success: true,
      fallbackUsed: FallbackBehavior.DISABLE_FEATURE,
      userMessage: this.getFeatureDisabledMessage(featureName)
    };
  }

  /**
   * Handle placeholder fallback
   */
  private async handleShowPlaceholder(
    featureName: string,
    context?: Record<string, any>
  ): Promise<any> {
    const placeholder = this.getFeaturePlaceholder(featureName);

    return {
      success: true,
      fallbackUsed: FallbackBehavior.SHOW_PLACEHOLDER,
      alternativeValue: placeholder,
      userMessage: 'This feature is not available. Placeholder shown instead.'
    };
  }

  /**
   * Handle permission request fallback
   */
  private async handleRequestPermission(
    featureName: string,
    context?: Record<string, any>
  ): Promise<any> {
    const accessInfo = await this.featureController.getFeatureAccessInfo(featureName);

    if (!accessInfo.missingPermissions || accessInfo.missingPermissions.length === 0) {
      return {
        success: true,
        fallbackUsed: FallbackBehavior.REQUEST_PERMISSION,
        userMessage: 'All required permissions are granted.'
      };
    }

    // In a real implementation, this would trigger the permission request flow
    return {
      success: false,
      fallbackUsed: FallbackBehavior.REQUEST_PERMISSION,
      userMessage: `Please grant the following permissions to use ${featureName}: ${accessInfo.missingPermissions.join(', ')}`
    };
  }

  /**
   * Handle alternative implementation fallback
   */
  private async handleUseAlternative(
    featureName: string,
    context?: Record<string, any>
  ): Promise<any> {
    const alternative = await this.getFeatureAlternative(featureName, context);

    if (alternative) {
      return {
        success: true,
        fallbackUsed: FallbackBehavior.USE_ALTERNATIVE,
        alternativeValue: alternative,
        userMessage: 'Using alternative implementation.'
      };
    }

    return {
      success: false,
      fallbackUsed: FallbackBehavior.USE_ALTERNATIVE,
      userMessage: 'No alternative implementation available.'
    };
  }

  /**
   * Handle web redirect fallback
   */
  private async handleRedirectToWeb(
    featureName: string,
    context?: Record<string, any>
  ): Promise<any> {
    const webUrl = this.getWebRedirectUrl(featureName);

    if (webUrl) {
      return {
        success: true,
        fallbackUsed: FallbackBehavior.REDIRECT_TO_WEB,
        alternativeValue: { redirectUrl: webUrl },
        userMessage: 'This feature is available on the web version.'
      };
    }

    return {
      success: false,
      fallbackUsed: FallbackBehavior.REDIRECT_TO_WEB,
      userMessage: 'Web version is not available for this feature.'
    };
  }

  /**
   * Get feature disabled message
   */
  private getFeatureDisabledMessage(featureName: string): string {
    const messages: Record<string, string> = {
      'camera_capture': 'Camera feature is disabled. Grant camera permission to enable.',
      'video_recording': 'Video recording is disabled. Grant camera and microphone permissions to enable.',
      'photo_library': 'Photo library access is disabled. Grant storage permission to enable.',
      'location_sharing': 'Location features are disabled. Grant location permission to enable.',
      'push_notifications': 'Push notifications are disabled. Grant notification permission to enable.',
      'voice_search': 'Voice search is disabled. Grant microphone permission to enable.',
      'biometric_auth': 'Biometric authentication is disabled. Grant biometric permission to enable.',
      'contact_sync': 'Contact sync is disabled. Grant contacts permission to enable.',
      'background_sync': 'Background sync is disabled. Grant background refresh permission to enable.',
      'health_tracking': 'Health tracking is disabled. Grant health permissions to enable.',
      'bluetooth_devices': 'Bluetooth features are disabled. Grant Bluetooth permission to enable.',
      'nfc_payments': 'NFC features are disabled. Grant NFC permission to enable.',
      'sms_verification': 'SMS verification is disabled. Grant SMS permission to enable.',
      'motion_tracking': 'Motion tracking is disabled. Grant motion permission to enable.',
      'system_overlay': 'System overlay is disabled. Grant system alert window permission to enable.',
      'settings_modification': 'Settings modification is disabled. Grant write settings permission to enable.',
      'accessibility_features': 'Accessibility features are disabled. Grant accessibility permission to enable.',
      'file_upload': 'File upload is disabled. Grant storage permission to enable.'
    };

    return messages[featureName] || `${featureName} is disabled due to missing permissions.`;
  }

  /**
   * Get feature placeholder
   */
  private getFeaturePlaceholder(featureName: string): any {
    const placeholders: Record<string, any> = {
      'camera_capture': {
        type: 'placeholder',
        icon: '📷',
        title: 'Camera Unavailable',
        message: 'Camera access is required to take photos and videos.'
      },
      'video_recording': {
        type: 'placeholder',
        icon: '🎥',
        title: 'Video Recording Unavailable',
        message: 'Camera and microphone access are required to record videos.'
      },
      'photo_library': {
        type: 'placeholder',
        icon: '🖼️',
        title: 'Photo Library Unavailable',
        message: 'Storage access is required to browse your photos.'
      },
      'location_sharing': {
        type: 'placeholder',
        icon: '📍',
        title: 'Location Unavailable',
        message: 'Location access is required for location-based features.'
      },
      'voice_search': {
        type: 'placeholder',
        icon: '🎤',
        title: 'Voice Search Unavailable',
        message: 'Microphone access is required for voice search.'
      },
      'biometric_auth': {
        type: 'placeholder',
        icon: '🔐',
        title: 'Biometric Auth Unavailable',
        message: 'Biometric access is required for fingerprint/Face ID authentication.'
      },
      'contact_sync': {
        type: 'placeholder',
        icon: '👥',
        title: 'Contact Sync Unavailable',
        message: 'Contact access is required to sync your contacts.'
      },
      'file_upload': {
        type: 'placeholder',
        icon: '📁',
        title: 'File Upload Unavailable',
        message: 'Storage access is required to upload files.'
      },
      'background_sync': {
        type: 'placeholder',
        icon: '🔄',
        title: 'Background Sync Unavailable',
        message: 'Background refresh is required for automatic updates.'
      },
      'health_tracking': {
        type: 'placeholder',
        icon: '❤️',
        title: 'Health Tracking Unavailable',
        message: 'Health permissions are required for wellness features.'
      },
      'bluetooth_devices': {
        type: 'placeholder',
        icon: '🔵',
        title: 'Bluetooth Unavailable',
        message: 'Bluetooth access is required to connect with devices.'
      },
      'nfc_payments': {
        type: 'placeholder',
        icon: '📱',
        title: 'NFC Unavailable',
        message: 'NFC access is required for contactless features.'
      },
      'sms_verification': {
        type: 'placeholder',
        icon: '💬',
        title: 'SMS Unavailable',
        message: 'SMS access is required for phone verification.'
      },
      'motion_tracking': {
        type: 'placeholder',
        icon: '🏃',
        title: 'Motion Tracking Unavailable',
        message: 'Motion access is required for activity tracking.'
      },
      'system_overlay': {
        type: 'placeholder',
        icon: '🖼️',
        title: 'Overlay Unavailable',
        message: 'System overlay permission is required for this feature.'
      },
      'settings_modification': {
        type: 'placeholder',
        icon: '⚙️',
        title: 'Settings Unavailable',
        message: 'Settings modification permission is required for this feature.'
      },
      'accessibility_features': {
        type: 'placeholder',
        icon: '♿',
        title: 'Accessibility Unavailable',
        message: 'Accessibility permission is required for enhanced accessibility features.'
      }
    };

    return placeholders[featureName] || {
      type: 'placeholder',
      icon: '⚠️',
      title: 'Feature Unavailable',
      message: 'This feature requires additional permissions to function.'
    };
  }

  /**
   * Get feature alternative implementation
   */
  private async getFeatureAlternative(
    featureName: string,
    context?: Record<string, any>
  ): Promise<any | null> {
    const alternatives: Record<string, () => any | Promise<any>> = {
      'camera_capture': () => ({ type: 'alternative', method: 'file_upload' }),
      'video_recording': () => ({ type: 'alternative', method: 'file_upload' }),
      'location_sharing': async () => {
        // Could return last known location or ask user to input manually
        return { type: 'alternative', method: 'manual_input' };
      },
      'voice_search': () => ({ type: 'alternative', method: 'text_search' }),
      'biometric_auth': () => ({ type: 'alternative', method: 'password_auth' }),
      'contact_sync': () => ({ type: 'alternative', method: 'manual_import' }),
      'health_tracking': () => ({ type: 'alternative', method: 'manual_entry' }),
      'bluetooth_devices': () => ({ type: 'alternative', method: 'wifi_devices' }),
      'nfc_payments': () => ({ type: 'alternative', method: 'qr_code' }),
      'sms_verification': () => ({ type: 'alternative', method: 'email_verification' }),
      'motion_tracking': () => ({ type: 'alternative', method: 'manual_activity' }),
      'background_sync': () => ({ type: 'alternative', method: 'manual_refresh' }),
      'push_notifications': () => ({ type: 'alternative', method: 'in_app_notifications' }),
      'file_upload': () => ({ type: 'alternative', method: 'camera_capture' }),
      'system_overlay': () => ({ type: 'alternative', method: 'in_app_display' }),
      'settings_modification': () => ({ type: 'alternative', method: 'app_settings' }),
      'accessibility_features': () => ({ type: 'alternative', method: 'standard_features' })
    };

    const alternativeFn = alternatives[featureName];
    if (alternativeFn) {
      try {
        return await alternativeFn();
      } catch (error) {
        console.warn(`Failed to get alternative for ${featureName}:`, error);
      }
    }

    return null;
  }

  /**
   * Get web redirect URL for a feature
   */
  private getWebRedirectUrl(featureName: string): string | null {
    const webUrls: Record<string, string> = {
      'camera_capture': '/web/camera',
      'video_recording': '/web/video',
      'photo_library': '/web/photos',
      'location_sharing': '/web/location',
      'voice_search': '/web/voice-search',
      'biometric_auth': '/web/login',
      'contact_sync': '/web/contacts',
      'file_upload': '/web/upload',
      'background_sync': '/web/sync',
      'health_tracking': '/web/health',
      'bluetooth_devices': '/web/devices',
      'nfc_payments': '/web/payments',
      'sms_verification': '/web/verify',
      'motion_tracking': '/web/activity',
      'system_overlay': '/web/overlay',
      'settings_modification': '/web/settings',
      'accessibility_features': '/web/accessibility'
    };

    return webUrls[featureName] || null;
  }

  /**
   * Clear fallback cache
   */
  public clearCache(): void {
    this.fallbackCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    entries: string[];
  } {
    return {
      size: this.fallbackCache.size,
      hitRate: 0, // Would need to track hits/misses for this
      entries: Array.from(this.fallbackCache.keys())
    };
  }

  /**
   * Reset fallback handler (for testing/debugging)
   */
  public reset(): void {
    this.fallbackCache.clear();
    this.isInitialized = false;
  }

  /**
   * Ensure handler is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('FallbackHandler not initialized. Call initialize() first.');
    }
  }
}