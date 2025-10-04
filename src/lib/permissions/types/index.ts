// Core permission types and interfaces for mobile platform permissions

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'prompt';

export type PlatformType = 'ios' | 'android' | 'web';

export interface PermissionRequest {
  type: PermissionType;
  rationale?: string;
  required?: boolean;
  platformSpecific?: PlatformPermissionConfig;
}

export interface PermissionResult {
  type: PermissionType;
  status: PermissionStatus;
  platform: PlatformType;
  canAskAgain: boolean;
  expiresAt?: Date;
  error?: string;
}

export interface PlatformPermissionConfig {
  ios?: IOSPermissionConfig;
  android?: AndroidPermissionConfig;
}

export interface IOSPermissionConfig {
  usageDescription?: string;
  backgroundModes?: string[];
  infoPlistKeys?: Record<string, string>;
}

export interface AndroidPermissionConfig {
  manifestPermissions?: string[];
  dangerousPermissions?: string[];
  rationale?: string;
  deniedDialogTitle?: string;
  deniedDialogMessage?: string;
}

// Core permission types
export enum PermissionType {
  // Camera permissions
  CAMERA = 'camera',
  CAMERA_ROLL = 'camera_roll',
  MEDIA_LIBRARY = 'media_library',

  // Microphone permissions
  MICROPHONE = 'microphone',
  SPEECH_RECOGNITION = 'speech_recognition',

  // Location permissions
  LOCATION = 'location',
  LOCATION_ALWAYS = 'location_always',
  LOCATION_WHEN_IN_USE = 'location_when_in_use',

  // Notification permissions
  NOTIFICATIONS = 'notifications',
  PUSH_NOTIFICATIONS = 'push_notifications',

  // Storage permissions
  STORAGE = 'storage',
  EXTERNAL_STORAGE = 'external_storage',

  // Contact permissions
  CONTACTS = 'contacts',

  // Calendar permissions
  CALENDAR = 'calendar',

  // Biometric permissions
  BIOMETRIC = 'biometric',
  FACE_ID = 'face_id',
  TOUCH_ID = 'touch_id',
  FINGERPRINT = 'fingerprint',

  // Network permissions
  NETWORK_STATE = 'network_state',
  INTERNET = 'internet',

  // Phone permissions
  PHONE_STATE = 'phone_state',
  CALL_PHONE = 'call_phone',
  READ_PHONE_STATE = 'read_phone_state',

  // SMS permissions
  SMS = 'sms',
  SEND_SMS = 'send_sms',
  RECEIVE_SMS = 'receive_sms',

  // Sensor permissions
  MOTION = 'motion',
  ACTIVITY_RECOGNITION = 'activity_recognition',
  BODY_SENSORS = 'body_sensors',

  // System permissions
  SYSTEM_ALERT_WINDOW = 'system_alert_window',
  WRITE_SETTINGS = 'write_settings',
  ACCESSIBILITY = 'accessibility',

  // Media permissions
  RECORD_AUDIO = 'record_audio',
  MODIFY_AUDIO_SETTINGS = 'modify_audio_settings',

  // Background permissions
  BACKGROUND_REFRESH = 'background_refresh',
  BACKGROUND_APP_REFRESH = 'background_app_refresh',

  // Health permissions
  HEALTH = 'health',
  HEALTH_SHARE = 'health_share',
  HEALTH_UPDATE = 'health_update',

  // Bluetooth permissions
  BLUETOOTH = 'bluetooth',
  BLUETOOTH_ADMIN = 'bluetooth_admin',
  BLUETOOTH_ADVERTISE = 'bluetooth_advertise',
  BLUETOOTH_CONNECT = 'bluetooth_connect',
  BLUETOOTH_SCAN = 'bluetooth_scan',

  // NFC permissions
  NFC = 'nfc',
  NFC_TRANSACTION_EVENT = 'nfc_transaction_event',

  // VPN permissions
  BIND_VPN_SERVICE = 'bind_vpn_service',
  CONTROL_VPN = 'control_vpn'
}

// Feature access control types
export interface FeatureAccessRule {
  feature: string;
  requiredPermissions: PermissionType[];
  fallbackBehavior: FallbackBehavior;
  platformOverrides?: PlatformFeatureConfig;
}

export interface PlatformFeatureConfig {
  ios?: FeatureConfig;
  android?: FeatureConfig;
}

export interface FeatureConfig {
  enabled: boolean;
  requiredPermissions: PermissionType[];
  fallbackBehavior: FallbackBehavior;
  userMessage?: string;
}

export enum FallbackBehavior {
  DISABLE_FEATURE = 'disable_feature',
  SHOW_PLACEHOLDER = 'show_placeholder',
  REQUEST_PERMISSION = 'request_permission',
  USE_ALTERNATIVE = 'use_alternative',
  REDIRECT_TO_WEB = 'redirect_to_web'
}

// Permission request flow types
export interface PermissionRequestFlow {
  id: string;
  title: string;
  description: string;
  icon?: string;
  permissions: PermissionRequest[];
  priority: number;
  category: PermissionCategory;
  userEducation: UserEducationContent;
}

export enum PermissionCategory {
  ESSENTIAL = 'essential',
  FUNCTIONAL = 'functional',
  ANALYTICAL = 'analytical',
  MARKETING = 'marketing'
}

export interface UserEducationContent {
  title: string;
  shortDescription: string;
  detailedExplanation: string;
  benefits: string[];
  privacyNote?: string;
  learnMoreUrl?: string;
}

// Permission state management
export interface PermissionState {
  [PermissionType.CAMERA]: PermissionResult;
  [PermissionType.MICROPHONE]: PermissionResult;
  [PermissionType.LOCATION]: PermissionResult;
  [PermissionType.NOTIFICATIONS]: PermissionResult;
  [PermissionType.STORAGE]: PermissionResult;
  [key: string]: PermissionResult;
}

// Event types for permission system
export interface PermissionEvent {
  type: 'permission_requested' | 'permission_granted' | 'permission_denied' | 'permission_revoked';
  permissionType: PermissionType;
  platform: PlatformType;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface PermissionEventListener {
  (event: PermissionEvent): void;
}

// Error types
export class PermissionError extends Error {
  constructor(
    message: string,
    public permissionType: PermissionType,
    public platform: PlatformType,
    public code?: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class PlatformNotSupportedError extends Error {
  constructor(platform: PlatformType, permission: PermissionType) {
    super(`Permission ${permission} not supported on platform ${platform}`);
    this.name = 'PlatformNotSupportedError';
  }
}

// Utility types
export type PermissionStatusMap = Map<PermissionType, PermissionStatus>;
export type PermissionRequestMap = Map<PermissionType, PermissionRequest>;
export type FeatureAccessMap = Map<string, boolean>;