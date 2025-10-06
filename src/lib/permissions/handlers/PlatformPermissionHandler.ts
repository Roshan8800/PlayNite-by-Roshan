import {
  PermissionType,
  PermissionStatus,
  PermissionResult,
  PermissionRequest,
  PlatformType,
  PlatformPermissionConfig,
  IOSPermissionConfig,
  AndroidPermissionConfig,
  PlatformNotSupportedError,
  PermissionError
} from '../types';

/**
 * Platform-specific permission handler for Android and iOS
 * Provides native permission handling capabilities
 */
export class PlatformPermissionHandler {
  private platform: PlatformType;
  private isInitialized = false;

  constructor() {
    this.platform = this.detectPlatform();
  }

  /**
   * Initialize the platform handler
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Platform-specific initialization
    switch (this.platform) {
      case 'ios':
        await this.initializeIOS();
        break;
      case 'android':
        await this.initializeAndroid();
        break;
      case 'web':
        await this.initializeWeb();
        break;
    }

    this.isInitialized = true;
  }

  /**
   * Check permission status for a specific permission type
   */
  public async checkPermission(type: PermissionType): Promise<PermissionResult> {
    this.ensureInitialized();

    switch (this.platform) {
      case 'ios':
        return this.checkIOSPermission(type);
      case 'android':
        return this.checkAndroidPermission(type);
      case 'web':
        return this.checkWebPermission(type);
      default:
        throw new PlatformNotSupportedError(this.platform, type);
    }
  }

  /**
   * Request permission for a specific permission type
   */
  public async requestPermission(request: PermissionRequest): Promise<PermissionResult> {
    this.ensureInitialized();

    switch (this.platform) {
      case 'ios':
        return this.requestIOSPermission(request);
      case 'android':
        return this.requestAndroidPermission(request);
      case 'web':
        return this.requestWebPermission(request);
      default:
        throw new PlatformNotSupportedError(this.platform, request.type);
    }
  }

  /**
   * Get platform-specific permission configuration
   */
  public getPlatformConfig(type: PermissionType): PlatformPermissionConfig {
    const configs: Record<PermissionType, PlatformPermissionConfig> = {
      [PermissionType.CAMERA]: {
        ios: {
          usageDescription: 'This app needs camera access to capture photos and videos for your content.'
        },
        android: {
          manifestPermissions: ['android.permission.CAMERA'],
          dangerousPermissions: ['android.permission.CAMERA'],
          rationale: 'Camera access is needed to capture photos and videos.'
        }
      },
      [PermissionType.CAMERA_ROLL]: {
        ios: {
          usageDescription: 'This app needs photo library access to select photos and videos.'
        },
        android: {
          manifestPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
          dangerousPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
          rationale: 'Photo library access is needed to select photos and videos.'
        }
      },
      [PermissionType.MEDIA_LIBRARY]: {
        ios: {
          usageDescription: 'This app needs media library access to access your photos and videos.'
        },
        android: {
          manifestPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
          dangerousPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
          rationale: 'Media library access is needed to access your photos and videos.'
        }
      },
      [PermissionType.MICROPHONE]: {
        ios: {
          usageDescription: 'This app needs microphone access to record audio for your videos.'
        },
        android: {
          manifestPermissions: ['android.permission.RECORD_AUDIO'],
          dangerousPermissions: ['android.permission.RECORD_AUDIO'],
          rationale: 'Microphone access is needed to record audio.'
        }
      },
      [PermissionType.SPEECH_RECOGNITION]: {
        ios: {
          usageDescription: 'This app needs speech recognition to understand voice commands.'
        },
        android: {
          manifestPermissions: ['android.permission.RECORD_AUDIO'],
          dangerousPermissions: ['android.permission.RECORD_AUDIO'],
          rationale: 'Speech recognition needs microphone access.'
        }
      },
      [PermissionType.LOCATION]: {
        ios: {
          usageDescription: 'This app needs location access to provide location-based features.'
        },
        android: {
          manifestPermissions: [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
          ],
          dangerousPermissions: [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
          ],
          rationale: 'Location access is needed for location-based features.'
        }
      },
      [PermissionType.LOCATION_ALWAYS]: {
        ios: {
          usageDescription: 'This app needs location access to provide location-based features.'
        },
        android: {
          manifestPermissions: [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
            'android.permission.ACCESS_BACKGROUND_LOCATION'
          ],
          dangerousPermissions: [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
            'android.permission.ACCESS_BACKGROUND_LOCATION'
          ],
          rationale: 'Location access is needed for location-based features.'
        }
      },
      [PermissionType.LOCATION_WHEN_IN_USE]: {
        ios: {
          usageDescription: 'This app needs location access to provide location-based features.'
        },
        android: {
          manifestPermissions: [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
          ],
          dangerousPermissions: [
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION'
          ],
          rationale: 'Location access is needed for location-based features.'
        }
      },
      [PermissionType.NOTIFICATIONS]: {
        ios: {
          usageDescription: 'This app needs notification permissions to send you updates.'
        },
        android: {
          manifestPermissions: [],
          rationale: 'Notification access is needed to send you updates.'
        }
      },
      [PermissionType.PUSH_NOTIFICATIONS]: {
        ios: {
          usageDescription: 'This app needs notification permissions to send you updates.'
        },
        android: {
          manifestPermissions: [],
          rationale: 'Notification access is needed to send you updates.'
        }
      },
      [PermissionType.STORAGE]: {
        ios: {},
        android: {
          manifestPermissions: [
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
          ],
          dangerousPermissions: [
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
          ],
          rationale: 'Storage access is needed to save and load files.'
        }
      },
      [PermissionType.EXTERNAL_STORAGE]: {
        ios: {},
        android: {
          manifestPermissions: [
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
          ],
          dangerousPermissions: [
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE'
          ],
          rationale: 'External storage access is needed to save and load files.'
        }
      },
      [PermissionType.CONTACTS]: {
        ios: {
          usageDescription: 'This app needs contact access to help you connect with friends.'
        },
        android: {
          manifestPermissions: ['android.permission.READ_CONTACTS'],
          dangerousPermissions: ['android.permission.READ_CONTACTS'],
          rationale: 'Contact access is needed to help you connect with friends.'
        }
      },
      [PermissionType.CALENDAR]: {
        ios: {
          usageDescription: 'This app needs calendar access to schedule events.'
        },
        android: {
          manifestPermissions: ['android.permission.READ_CALENDAR'],
          dangerousPermissions: ['android.permission.READ_CALENDAR'],
          rationale: 'Calendar access is needed to schedule events.'
        }
      },
      [PermissionType.BIOMETRIC]: {
        ios: {
          usageDescription: 'This app uses biometric authentication for secure access.'
        },
        android: {
          manifestPermissions: ['android.permission.USE_FINGERPRINT', 'android.permission.USE_BIOMETRIC'],
          dangerousPermissions: ['android.permission.USE_FINGERPRINT', 'android.permission.USE_BIOMETRIC'],
          rationale: 'Biometric access is needed for secure authentication.'
        }
      },
      [PermissionType.FACE_ID]: {
        ios: {
          usageDescription: 'This app uses Face ID for secure access.'
        },
        android: {}
      },
      [PermissionType.TOUCH_ID]: {
        ios: {
          usageDescription: 'This app uses Touch ID for secure access.'
        },
        android: {}
      },
      [PermissionType.FINGERPRINT]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.USE_FINGERPRINT'],
          dangerousPermissions: ['android.permission.USE_FINGERPRINT'],
          rationale: 'Fingerprint access is needed for secure authentication.'
        }
      },
      [PermissionType.NETWORK_STATE]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.ACCESS_NETWORK_STATE'],
          rationale: 'Network state access is needed for connectivity checks.'
        }
      },
      [PermissionType.INTERNET]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.INTERNET'],
          rationale: 'Internet access is needed for network connectivity.'
        }
      },
      [PermissionType.PHONE_STATE]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.READ_PHONE_STATE'],
          dangerousPermissions: ['android.permission.READ_PHONE_STATE'],
          rationale: 'Phone state access is needed for certain features.'
        }
      },
      [PermissionType.CALL_PHONE]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.CALL_PHONE'],
          dangerousPermissions: ['android.permission.CALL_PHONE'],
          rationale: 'Phone call access is needed for calling features.'
        }
      },
      [PermissionType.READ_PHONE_STATE]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.READ_PHONE_STATE'],
          dangerousPermissions: ['android.permission.READ_PHONE_STATE'],
          rationale: 'Phone state access is needed for certain features.'
        }
      },
      [PermissionType.SMS]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.RECEIVE_SMS', 'android.permission.SEND_SMS'],
          dangerousPermissions: ['android.permission.RECEIVE_SMS', 'android.permission.SEND_SMS'],
          rationale: 'SMS access is needed for verification features.'
        }
      },
      [PermissionType.SEND_SMS]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.SEND_SMS'],
          dangerousPermissions: ['android.permission.SEND_SMS'],
          rationale: 'SMS sending is needed for verification features.'
        }
      },
      [PermissionType.RECEIVE_SMS]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.RECEIVE_SMS'],
          dangerousPermissions: ['android.permission.RECEIVE_SMS'],
          rationale: 'SMS receiving is needed for verification features.'
        }
      },
      [PermissionType.MOTION]: {
        ios: {
          usageDescription: 'This app needs motion access to track your movements.'
        },
        android: {
          manifestPermissions: ['android.permission.ACTIVITY_RECOGNITION'],
          dangerousPermissions: ['android.permission.ACTIVITY_RECOGNITION'],
          rationale: 'Motion access is needed to track your movements.'
        }
      },
      [PermissionType.ACTIVITY_RECOGNITION]: {
        ios: {
          usageDescription: 'This app needs activity recognition to track your movements.'
        },
        android: {
          manifestPermissions: ['android.permission.ACTIVITY_RECOGNITION'],
          dangerousPermissions: ['android.permission.ACTIVITY_RECOGNITION'],
          rationale: 'Activity recognition is needed to track your movements.'
        }
      },
      [PermissionType.BODY_SENSORS]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BODY_SENSORS'],
          dangerousPermissions: ['android.permission.BODY_SENSORS'],
          rationale: 'Body sensors access is needed for health features.'
        }
      },
      [PermissionType.SYSTEM_ALERT_WINDOW]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
          dangerousPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
          rationale: 'System alert window is needed for overlay features.'
        }
      },
      [PermissionType.WRITE_SETTINGS]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.WRITE_SETTINGS'],
          dangerousPermissions: ['android.permission.WRITE_SETTINGS'],
          rationale: 'Write settings is needed to modify system settings.'
        }
      },
      [PermissionType.ACCESSIBILITY]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BIND_ACCESSIBILITY_SERVICE'],
          dangerousPermissions: ['android.permission.BIND_ACCESSIBILITY_SERVICE'],
          rationale: 'Accessibility service is needed for enhanced accessibility features.'
        }
      },
      [PermissionType.RECORD_AUDIO]: {
        ios: {
          usageDescription: 'This app needs audio recording access to capture sound.'
        },
        android: {
          manifestPermissions: ['android.permission.RECORD_AUDIO'],
          dangerousPermissions: ['android.permission.RECORD_AUDIO'],
          rationale: 'Audio recording is needed to capture sound.'
        }
      },
      [PermissionType.MODIFY_AUDIO_SETTINGS]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.MODIFY_AUDIO_SETTINGS'],
          dangerousPermissions: ['android.permission.MODIFY_AUDIO_SETTINGS'],
          rationale: 'Audio settings modification is needed for enhanced audio features.'
        }
      },
      [PermissionType.BACKGROUND_REFRESH]: {
        ios: {
          usageDescription: 'This app needs background refresh to stay updated.',
          backgroundModes: ['fetch', 'remote-notification']
        },
        android: {}
      },
      [PermissionType.BACKGROUND_APP_REFRESH]: {
        ios: {
          usageDescription: 'This app needs background refresh to stay updated.',
          backgroundModes: ['fetch', 'remote-notification']
        },
        android: {}
      },
      [PermissionType.HEALTH]: {
        ios: {
          usageDescription: 'This app needs health data access to provide wellness features.'
        },
        android: {
          manifestPermissions: ['android.permission.BODY_SENSORS'],
          dangerousPermissions: ['android.permission.BODY_SENSORS'],
          rationale: 'Health data access is needed for wellness features.'
        }
      },
      [PermissionType.HEALTH_SHARE]: {
        ios: {
          usageDescription: 'This app needs health data access to share wellness features.'
        },
        android: {
          manifestPermissions: ['android.permission.BODY_SENSORS'],
          dangerousPermissions: ['android.permission.BODY_SENSORS'],
          rationale: 'Health data access is needed for wellness features.'
        }
      },
      [PermissionType.HEALTH_UPDATE]: {
        ios: {
          usageDescription: 'This app needs health data access to update wellness features.'
        },
        android: {
          manifestPermissions: ['android.permission.BODY_SENSORS'],
          dangerousPermissions: ['android.permission.BODY_SENSORS'],
          rationale: 'Health data access is needed for wellness features.'
        }
      },
      [PermissionType.BLUETOOTH]: {
        ios: {
          usageDescription: 'This app needs Bluetooth access to connect with nearby devices.'
        },
        android: {
          manifestPermissions: [
            'android.permission.BLUETOOTH',
            'android.permission.BLUETOOTH_ADMIN',
            'android.permission.BLUETOOTH_ADVERTISE',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.BLUETOOTH_SCAN'
          ],
          dangerousPermissions: [
            'android.permission.BLUETOOTH_ADVERTISE',
            'android.permission.BLUETOOTH_CONNECT',
            'android.permission.BLUETOOTH_SCAN'
          ],
          rationale: 'Bluetooth access is needed to connect with nearby devices.'
        }
      },
      [PermissionType.BLUETOOTH_ADMIN]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BLUETOOTH_ADMIN'],
          rationale: 'Bluetooth admin access is needed to manage Bluetooth connections.'
        }
      },
      [PermissionType.BLUETOOTH_ADVERTISE]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BLUETOOTH_ADVERTISE'],
          dangerousPermissions: ['android.permission.BLUETOOTH_ADVERTISE'],
          rationale: 'Bluetooth advertising is needed to broadcast to nearby devices.'
        }
      },
      [PermissionType.BLUETOOTH_CONNECT]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BLUETOOTH_CONNECT'],
          dangerousPermissions: ['android.permission.BLUETOOTH_CONNECT'],
          rationale: 'Bluetooth connection is needed to connect with nearby devices.'
        }
      },
      [PermissionType.BLUETOOTH_SCAN]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BLUETOOTH_SCAN'],
          dangerousPermissions: ['android.permission.BLUETOOTH_SCAN'],
          rationale: 'Bluetooth scanning is needed to discover nearby devices.'
        }
      },
      [PermissionType.NFC]: {
        ios: {
          usageDescription: 'This app needs NFC access to read NFC tags.'
        },
        android: {
          manifestPermissions: ['android.permission.NFC'],
          dangerousPermissions: ['android.permission.NFC'],
          rationale: 'NFC access is needed to read NFC tags.'
        }
      },
      [PermissionType.NFC_TRANSACTION_EVENT]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.NFC_TRANSACTION_EVENT'],
          dangerousPermissions: ['android.permission.NFC_TRANSACTION_EVENT'],
          rationale: 'NFC transaction events are needed for payment features.'
        }
      },
      [PermissionType.BIND_VPN_SERVICE]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.BIND_VPN_SERVICE'],
          dangerousPermissions: ['android.permission.BIND_VPN_SERVICE'],
          rationale: 'VPN service binding is needed for VPN features.'
        }
      },
      [PermissionType.CONTROL_VPN]: {
        ios: {},
        android: {
          manifestPermissions: ['android.permission.CONTROL_VPN'],
          dangerousPermissions: ['android.permission.CONTROL_VPN'],
          rationale: 'VPN control is needed for VPN features.'
        }
      }
    };

    return configs[type] || {};
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): PlatformType {
    if (typeof window === 'undefined') {
      return 'web';
    }

    const userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.includes('android')) {
      return 'android';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    }

    return 'web';
  }

  /**
   * Initialize iOS-specific permissions
   */
  private async initializeIOS(): Promise<void> {
    // iOS-specific initialization if needed
    console.log('Initializing iOS permission handler');
  }

  /**
   * Initialize Android-specific permissions
   */
  private async initializeAndroid(): Promise<void> {
    // Android-specific initialization if needed
    console.log('Initializing Android permission handler');
  }

  /**
   * Initialize web-specific permissions
   */
  private async initializeWeb(): Promise<void> {
    // Web-specific initialization if needed
    console.log('Initializing web permission handler');
  }

  /**
   * Check iOS permission status
   */
  private async checkIOSPermission(type: PermissionType): Promise<PermissionResult> {
    // iOS-specific permission checking logic
    // This would integrate with actual iOS APIs in a real implementation

    const config = this.getPlatformConfig(type);

    // For now, return a mock implementation
    return {
      type,
      status: 'prompt', // Would check actual iOS permission APIs
      platform: 'ios',
      canAskAgain: true
    };
  }

  /**
   * Check Android permission status
   */
  private async checkAndroidPermission(type: PermissionType): Promise<PermissionResult> {
    // Android-specific permission checking logic
    // This would integrate with actual Android APIs in a real implementation

    const config = this.getPlatformConfig(type);

    // For now, return a mock implementation
    return {
      type,
      status: 'prompt', // Would check actual Android permission APIs
      platform: 'android',
      canAskAgain: true
    };
  }

  /**
   * Check web permission status
   */
  private async checkWebPermission(type: PermissionType): Promise<PermissionResult> {
    // Web-specific permission checking logic using Permissions API

    if (typeof window === 'undefined' || !window.navigator.permissions) {
      return {
        type,
        status: 'unavailable',
        platform: 'web',
        canAskAgain: false,
        error: 'Permissions API not available'
      };
    }

    try {
      const permissionName = this.mapPermissionToWebAPI(type);
      if (!permissionName) {
        return {
          type,
          status: 'unavailable',
          platform: 'web',
          canAskAgain: false,
          error: 'Permission not supported in web'
        };
      }

      const result = await window.navigator.permissions.query({ name: permissionName });

      let status: PermissionStatus;
      switch (result.state) {
        case 'granted':
          status = 'granted';
          break;
        case 'denied':
          status = 'denied';
          break;
        case 'prompt':
          status = 'prompt';
          break;
        default:
          status = 'unavailable';
      }

      return {
        type,
        status,
        platform: 'web',
        canAskAgain: result.state !== 'denied'
      };
    } catch (error) {
      return {
        type,
        status: 'unavailable',
        platform: 'web',
        canAskAgain: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Request iOS permission
   */
  private async requestIOSPermission(request: PermissionRequest): Promise<PermissionResult> {
    // iOS-specific permission request logic
    // This would integrate with actual iOS APIs in a real implementation

    return {
      type: request.type,
      status: 'prompt', // Would request actual iOS permission APIs
      platform: 'ios',
      canAskAgain: true
    };
  }

  /**
   * Request Android permission
   */
  private async requestAndroidPermission(request: PermissionRequest): Promise<PermissionResult> {
    // Android-specific permission request logic
    // This would integrate with actual Android APIs in a real implementation

    return {
      type: request.type,
      status: 'prompt', // Would request actual Android permission APIs
      platform: 'android',
      canAskAgain: true
    };
  }

  /**
   * Request web permission
   */
  private async requestWebPermission(request: PermissionRequest): Promise<PermissionResult> {
    // Web-specific permission request logic

    if (typeof window === 'undefined' || !window.navigator.permissions) {
      return {
        type: request.type,
        status: 'unavailable',
        platform: 'web',
        canAskAgain: false,
        error: 'Permissions API not available'
      };
    }

    try {
      const permissionName = this.mapPermissionToWebAPI(request.type);
      if (!permissionName) {
        return {
          type: request.type,
          status: 'unavailable',
          platform: 'web',
          canAskAgain: false,
          error: 'Permission not supported in web'
        };
      }

      const result = await window.navigator.permissions.query({ name: permissionName });

      let status: PermissionStatus;
      switch (result.state) {
        case 'granted':
          status = 'granted';
          break;
        case 'denied':
          status = 'denied';
          break;
        case 'prompt':
          status = 'prompt';
          break;
        default:
          status = 'unavailable';
      }

      return {
        type: request.type,
        status,
        platform: 'web',
        canAskAgain: result.state !== 'denied'
      };
    } catch (error) {
      return {
        type: request.type,
        status: 'unavailable',
        platform: 'web',
        canAskAgain: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map our permission types to Web API permission names
   */
  private mapPermissionToWebAPI(type: PermissionType): PermissionName | null {
    const mapping: Record<PermissionType, PermissionName | null> = {
      [PermissionType.CAMERA]: 'camera' as PermissionName,
      [PermissionType.MICROPHONE]: 'microphone' as PermissionName,
      [PermissionType.LOCATION]: 'geolocation' as PermissionName,
      [PermissionType.NOTIFICATIONS]: 'notifications' as PermissionName,
      [PermissionType.STORAGE]: null, // Not directly supported in Permissions API
      [PermissionType.CONTACTS]: null, // Not supported in web
      [PermissionType.CALENDAR]: null, // Not supported in web
      [PermissionType.BIOMETRIC]: null, // Not supported in Permissions API
      [PermissionType.BLUETOOTH]: null, // Not supported in web
      [PermissionType.NFC]: null, // Not supported in web
      [PermissionType.HEALTH]: null, // Not supported in web
      [PermissionType.SMS]: null, // Not supported in web
      [PermissionType.PHONE_STATE]: null, // Not supported in web
      [PermissionType.BACKGROUND_REFRESH]: null, // Not supported in web
      [PermissionType.SYSTEM_ALERT_WINDOW]: null, // Not supported in web
      [PermissionType.WRITE_SETTINGS]: null, // Not supported in web
      [PermissionType.ACCESSIBILITY]: null, // Not supported in web
      [PermissionType.RECORD_AUDIO]: 'microphone' as PermissionName,
      [PermissionType.MODIFY_AUDIO_SETTINGS]: null, // Not supported in web
      [PermissionType.BIND_VPN_SERVICE]: null, // Not supported in web
      [PermissionType.CAMERA_ROLL]: null, // Not supported in web
      [PermissionType.MEDIA_LIBRARY]: null, // Not supported in web
      [PermissionType.SPEECH_RECOGNITION]: 'microphone' as PermissionName,
      [PermissionType.LOCATION_ALWAYS]: 'geolocation' as PermissionName,
      [PermissionType.LOCATION_WHEN_IN_USE]: 'geolocation' as PermissionName,
      [PermissionType.PUSH_NOTIFICATIONS]: 'notifications' as PermissionName,
      [PermissionType.EXTERNAL_STORAGE]: null, // Not supported in web
      [PermissionType.NETWORK_STATE]: null, // Not supported in web
      [PermissionType.INTERNET]: null, // Not supported in web
      [PermissionType.CALL_PHONE]: null, // Not supported in web
      [PermissionType.READ_PHONE_STATE]: null, // Not supported in web
      [PermissionType.SEND_SMS]: null, // Not supported in web
      [PermissionType.RECEIVE_SMS]: null, // Not supported in web
      [PermissionType.MOTION]: null, // Not supported in web
      [PermissionType.ACTIVITY_RECOGNITION]: null, // Not supported in web
      [PermissionType.BODY_SENSORS]: null, // Not supported in web
      [PermissionType.FACE_ID]: null, // Not supported in web
      [PermissionType.TOUCH_ID]: null, // Not supported in web
      [PermissionType.FINGERPRINT]: null, // Not supported in web
      [PermissionType.BLUETOOTH_ADMIN]: null, // Not supported in web
      [PermissionType.BLUETOOTH_ADVERTISE]: null, // Not supported in web
      [PermissionType.BLUETOOTH_CONNECT]: null, // Not supported in web
      [PermissionType.BLUETOOTH_SCAN]: null, // Not supported in web
      [PermissionType.NFC_TRANSACTION_EVENT]: null, // Not supported in web
      [PermissionType.CONTROL_VPN]: null, // Not supported in web
      [PermissionType.HEALTH_SHARE]: null, // Not supported in web
      [PermissionType.HEALTH_UPDATE]: null, // Not supported in web
      [PermissionType.BACKGROUND_APP_REFRESH]: null, // Not supported in web
    };

    return mapping[type] || null;
  }

  /**
   * Ensure handler is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new PermissionError(
        'PlatformPermissionHandler not initialized. Call initialize() first.',
        PermissionType.NOTIFICATIONS,
        this.platform,
        'NOT_INITIALIZED'
      );
    }
  }
}