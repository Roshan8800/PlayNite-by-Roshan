'use client';

import React, { useState } from 'react';
import {
  PermissionType,
  PermissionRequest,
  PermissionCategory,
  UserEducationContent,
  FallbackBehavior
} from '../types';

import { PermissionManager } from '../core/PermissionManager';
import { FeatureAccessController } from '../core/FeatureAccessController';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: PermissionRequest[];
  title?: string;
  description?: string;
  onPermissionsGranted?: (grantedPermissions: PermissionType[]) => void;
  onPermissionsDenied?: (deniedPermissions: PermissionType[]) => void;
  featureName?: string;
}

interface PermissionRequestItemProps {
  request: PermissionRequest;
  education: UserEducationContent;
  isGranted: boolean;
  isLoading: boolean;
  onRequest: () => void;
}

/**
 * Individual permission request item component
 */
const PermissionRequestItem: React.FC<PermissionRequestItemProps> = ({
  request,
  education,
  isGranted,
  isLoading,
  onRequest
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`permission-item ${isGranted ? 'granted' : 'pending'}`}>
      <div className="permission-header">
        <div className="permission-icon">
          {getPermissionIcon(request.type)}
        </div>
        <div className="permission-content">
          <h3 className="permission-title">{education.title}</h3>
          <p className="permission-description">{education.shortDescription}</p>
        </div>
        <div className="permission-status">
          {isGranted ? (
            <span className="status-granted">✓ Granted</span>
          ) : (
            <button
              className="request-button"
              onClick={onRequest}
              disabled={isLoading}
            >
              {isLoading ? 'Requesting...' : 'Grant'}
            </button>
          )}
        </div>
      </div>

      <button
        className="expand-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Show Less' : 'Learn More'}
      </button>

      {isExpanded && (
        <div className="permission-details">
          <p className="detailed-explanation">{education.detailedExplanation}</p>

          {education.benefits.length > 0 && (
            <div className="benefits-section">
              <h4>Benefits:</h4>
              <ul>
                {education.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
          )}

          {education.privacyNote && (
            <div className="privacy-note">
              <strong>Privacy Note:</strong> {education.privacyNote}
            </div>
          )}

          {education.learnMoreUrl && (
            <a
              href={education.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="learn-more-link"
            >
              Learn More
            </a>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Main permission request modal component
 */
export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  isOpen,
  onClose,
  permissions,
  title = 'App Permissions Required',
  description = 'This app needs the following permissions to provide you with the best experience.',
  onPermissionsGranted,
  onPermissionsDenied,
  featureName
}) => {
  const [permissionStates, setPermissionStates] = useState<Map<PermissionType, boolean>>(new Map());
  const [loadingPermissions, setLoadingPermissions] = useState<Set<PermissionType>>(new Set());
  const [hasRequested, setHasRequested] = useState(false);

  const permissionManager = PermissionManager.getInstance();
  const featureController = FeatureAccessController.getInstance();

  // Initialize permission states when modal opens
  React.useEffect(() => {
    if (isOpen && permissions.length > 0) {
      initializePermissionStates();
    }
  }, [isOpen, permissions]);

  const initializePermissionStates = async () => {
    const states = new Map<PermissionType, boolean>();

    for (const permission of permissions) {
      try {
        const result = await permissionManager.checkPermission(permission.type);
        states.set(permission.type, result.status === 'granted');
      } catch (error) {
        console.warn(`Failed to check permission ${permission.type}:`, error);
        states.set(permission.type, false);
      }
    }

    setPermissionStates(states);
  };

  const handlePermissionRequest = async (permissionType: PermissionType) => {
    setLoadingPermissions(prev => new Set(prev).add(permissionType));

    try {
      const result = await permissionManager.requestPermission(
        permissionType,
        permissions.find(p => p.type === permissionType)?.rationale
      );

      const isGranted = result.status === 'granted';
      setPermissionStates(prev => new Map(prev).set(permissionType, isGranted));
      setHasRequested(true);

      if (isGranted) {
        onPermissionsGranted?.([permissionType]);
      } else {
        onPermissionsDenied?.([permissionType]);
      }
    } catch (error) {
      console.error(`Failed to request permission ${permissionType}:`, error);
      setPermissionStates(prev => new Map(prev).set(permissionType, false));
      onPermissionsDenied?.([permissionType]);
    } finally {
      setLoadingPermissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(permissionType);
        return newSet;
      });
    }
  };

  const handleRequestAllPermissions = async () => {
    const ungrantedPermissions = permissions.filter(
      p => !permissionStates.get(p.type)
    );

    if (ungrantedPermissions.length === 0) {
      onClose();
      return;
    }

    setLoadingPermissions(new Set(ungrantedPermissions.map(p => p.type)));

    try {
      const results = await permissionManager.requestMultiplePermissions(ungrantedPermissions);

      const granted: PermissionType[] = [];
      const denied: PermissionType[] = [];

      Object.entries(results).forEach(([type, result]) => {
        const isGranted = result.status === 'granted';
        setPermissionStates(prev => new Map(prev).set(type as PermissionType, isGranted));

        if (isGranted) {
          granted.push(type as PermissionType);
        } else {
          denied.push(type as PermissionType);
        }
      });

      setHasRequested(true);

      if (granted.length > 0) {
        onPermissionsGranted?.(granted);
      }
      if (denied.length > 0) {
        onPermissionsDenied?.(denied);
      }

      // Close modal if all permissions are handled
      if (granted.length === ungrantedPermissions.length) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to request multiple permissions:', error);
    } finally {
      setLoadingPermissions(new Set());
    }
  };

  const getEducationContent = (permissionType: PermissionType): UserEducationContent => {
    // Default education content - in a real app, this would come from a configuration
    const educationMap: Record<PermissionType, UserEducationContent> = {
      [PermissionType.CAMERA]: {
        title: 'Camera Access',
        shortDescription: 'Take photos and videos for your content',
        detailedExplanation: 'Camera access allows you to capture photos and videos directly within the app, making it easy to share visual content with your audience.',
        benefits: [
          'Capture high-quality photos and videos',
          'Apply filters and effects in real-time',
          'Share moments instantly with your followers'
        ],
        privacyNote: 'Camera access is only used when you choose to take a photo or video. We never access your camera without your explicit permission.'
      },
      [PermissionType.MICROPHONE]: {
        title: 'Microphone Access',
        shortDescription: 'Record audio for your videos',
        detailedExplanation: 'Microphone access enables you to record voiceovers, music, and ambient sounds for your video content.',
        benefits: [
          'Add voice narration to your videos',
          'Record live audio performances',
          'Create engaging audio content'
        ],
        privacyNote: 'Microphone access is only active during recording. Audio is processed locally and never stored without your consent.'
      },
      [PermissionType.LOCATION]: {
        title: 'Location Access',
        shortDescription: 'Add location to your posts',
        detailedExplanation: 'Location access helps you tag your posts with accurate location information and discover content from your area.',
        benefits: [
          'Tag posts with specific locations',
          'Discover local content and events',
          'Connect with nearby users'
        ],
        privacyNote: 'Location data is only used to enhance your content. You control when and how your location is shared.'
      },
      [PermissionType.NOTIFICATIONS]: {
        title: 'Push Notifications',
        shortDescription: 'Stay updated with important activity',
        detailedExplanation: 'Receive notifications about likes, comments, follows, and other important activity on your content.',
        benefits: [
          'Never miss important interactions',
          'Stay engaged with your community',
          'Get notified about new features'
        ],
        privacyNote: 'You can customize notification preferences at any time in your settings.'
      },
      [PermissionType.STORAGE]: {
        title: 'Storage Access',
        shortDescription: 'Save and access your media files',
        detailedExplanation: 'Storage access allows you to save photos, videos, and other content to your device for offline access.',
        benefits: [
          'Save content for offline viewing',
          'Organize your media library',
          'Quick access to your files'
        ],
        privacyNote: 'Storage access is limited to the app\'s designated folder. We respect your device\'s privacy settings.'
      },
      [PermissionType.CALENDAR]: {
        title: 'Calendar Access',
        shortDescription: 'Add events to your calendar',
        detailedExplanation: 'Calendar access allows the app to create and manage events in your calendar.',
        benefits: [
          'Schedule reminders and events',
          'Sync with your personal calendar',
          'Never miss important dates'
        ],
        privacyNote: 'Calendar access is only used to create events and never reads your existing appointments.'
      },
      [PermissionType.PHONE_STATE]: {
        title: 'Phone State Access',
        shortDescription: 'Handle interruptions gracefully',
        detailedExplanation: 'Phone state access allows the app to detect incoming calls and pause or resume app activity accordingly.',
        benefits: [
          'Automatically pause videos during calls',
          'Prevent interruptions during recording',
          'Seamless user experience'
        ],
        privacyNote: 'Phone state access is only used to detect call status and never accesses your phone number or call history.'
      },
      // Add more permission education content as needed
      [PermissionType.CONTACTS]: {
        title: 'Contact Access',
        shortDescription: 'Find and connect with friends',
        detailedExplanation: 'Contact access helps you find and connect with people you know on the platform.',
        benefits: [
          'Easily find friends from your contacts',
          'Import profile pictures',
          'Sync your address book'
        ],
        privacyNote: 'Contact data is encrypted and never shared with third parties. You control which contacts to import.'
      },
      [PermissionType.BIOMETRIC]: {
        title: 'Biometric Authentication',
        shortDescription: 'Secure access with fingerprint or Face ID',
        detailedExplanation: 'Use your device\'s biometric security features for quick and secure access to your account.',
        benefits: [
          'Fast and secure login',
          'Enhanced account protection',
          'No need to remember passwords'
        ],
        privacyNote: 'Biometric data is processed locally on your device and never stored on our servers.'
      },
      [PermissionType.BLUETOOTH]: {
        title: 'Bluetooth Access',
        shortDescription: 'Connect with nearby devices',
        detailedExplanation: 'Bluetooth access enables you to connect with nearby devices for enhanced features like live streaming equipment.',
        benefits: [
          'Connect with external cameras',
          'Use professional audio equipment',
          'Enhanced streaming capabilities'
        ],
        privacyNote: 'Bluetooth connections are only established when you initiate them. No background scanning occurs.'
      },
      [PermissionType.HEALTH]: {
        title: 'Health Data Access',
        shortDescription: 'Track wellness and activity',
        detailedExplanation: 'Access health and fitness data to provide personalized wellness insights and recommendations.',
        benefits: [
          'Personalized fitness recommendations',
          'Track activity and goals',
          'Wellness insights and trends'
        ],
        privacyNote: 'Health data is encrypted and HIPAA compliant. You control what data is shared and when.'
      },
      [PermissionType.NFC]: {
        title: 'NFC Access',
        shortDescription: 'Read NFC tags and cards',
        detailedExplanation: 'NFC access allows you to interact with NFC tags, smart cards, and other contactless technologies.',
        benefits: [
          'Read NFC business cards',
          'Access smart posters and displays',
          'Connect with IoT devices'
        ],
        privacyNote: 'NFC access is only used when you tap your device. No background scanning or data collection occurs.'
      },
      [PermissionType.SMS]: {
        title: 'SMS Access',
        shortDescription: 'Verify your phone number',
        detailedExplanation: 'SMS access enables phone number verification and two-factor authentication for enhanced security.',
        benefits: [
          'Secure account verification',
          'Two-factor authentication',
          'Enhanced account security'
        ],
        privacyNote: 'SMS access is only used for verification purposes. Messages are not read or stored.'
      },
      [PermissionType.BACKGROUND_REFRESH]: {
        title: 'Background Refresh',
        shortDescription: 'Keep content updated',
        detailedExplanation: 'Background refresh ensures your content stays up-to-date even when the app is not actively being used.',
        benefits: [
          'Fresh content when you open the app',
          'Real-time notifications',
          'Seamless user experience'
        ],
        privacyNote: 'Background refresh respects your device\'s battery optimization settings and can be disabled anytime.'
      },
      [PermissionType.MOTION]: {
        title: 'Motion & Activity',
        shortDescription: 'Track movement and gestures',
        detailedExplanation: 'Motion access enables gesture controls, activity tracking, and enhanced interactive features.',
        benefits: [
          'Gesture-based controls',
          'Activity and fitness tracking',
          'Enhanced user interactions'
        ],
        privacyNote: 'Motion data is processed locally and used only to improve your experience within the app.'
      },
      [PermissionType.SYSTEM_ALERT_WINDOW]: {
        title: 'System Overlay',
        shortDescription: 'Display over other apps',
        detailedExplanation: 'System overlay permission allows the app to display content over other applications when needed.',
        benefits: [
          'Picture-in-picture video',
          'Floating chat widgets',
          'Enhanced multitasking'
        ],
        privacyNote: 'Overlay is only used for specific features and can be disabled in system settings.'
      },
      [PermissionType.CAMERA_ROLL]: {
        title: 'Photo Library Access',
        shortDescription: 'Select photos and videos',
        detailedExplanation: 'Access your photo library to select and share existing photos and videos from your device.',
        benefits: [
          'Share existing photos and videos',
          'Create content from your library',
          'Easy media management'
        ],
        privacyNote: 'Photo library access is limited to selection only. We never scan or upload your entire library.'
      },
      [PermissionType.MEDIA_LIBRARY]: {
        title: 'Media Library Access',
        shortDescription: 'Access your media files',
        detailedExplanation: 'Access your complete media library for comprehensive content creation and sharing.',
        benefits: [
          'Full media library access',
          'Organize and manage content',
          'Advanced editing capabilities'
        ],
        privacyNote: 'Media library access respects your privacy settings and requires explicit permission for each access.'
      },
      [PermissionType.SPEECH_RECOGNITION]: {
        title: 'Voice Recognition',
        shortDescription: 'Understand voice commands',
        detailedExplanation: 'Voice recognition enables hands-free operation and voice-controlled features within the app.',
        benefits: [
          'Hands-free operation',
          'Voice search and commands',
          'Accessibility features'
        ],
        privacyNote: 'Voice data is processed locally when possible and never stored without your explicit consent.'
      },
      [PermissionType.LOCATION_ALWAYS]: {
        title: 'Always-On Location',
        shortDescription: 'Continuous location tracking',
        detailedExplanation: 'Always-on location access enables continuous location-based features and services.',
        benefits: [
          'Continuous location-based services',
          'Enhanced navigation features',
          'Location-aware content'
        ],
        privacyNote: 'Always-on location significantly impacts battery life and data usage. You can disable this anytime.'
      },
      [PermissionType.LOCATION_WHEN_IN_USE]: {
        title: 'Location When In Use',
        shortDescription: 'Location access while using the app',
        detailedExplanation: 'Location access is only used when the app is actively being used in the foreground.',
        benefits: [
          'Location-based features',
          'Local content discovery',
          'Enhanced user experience'
        ],
        privacyNote: 'Location access is limited to when the app is in use and respects your privacy preferences.'
      },
      [PermissionType.PUSH_NOTIFICATIONS]: {
        title: 'Push Notifications',
        shortDescription: 'Stay updated with push notifications',
        detailedExplanation: 'Receive push notifications about important activity, updates, and personalized content.',
        benefits: [
          'Real-time updates',
          'Personalized content',
          'Enhanced engagement'
        ],
        privacyNote: 'Push notifications can be customized or disabled in your settings at any time.'
      },
      [PermissionType.EXTERNAL_STORAGE]: {
        title: 'External Storage Access',
        shortDescription: 'Access external storage devices',
        detailedExplanation: 'Access external storage devices like SD cards for expanded content storage and management.',
        benefits: [
          'Expanded storage capacity',
          'External device management',
          'Flexible content storage'
        ],
        privacyNote: 'External storage access is limited to the app\'s designated folders and respects device permissions.'
      },
      [PermissionType.NETWORK_STATE]: {
        title: 'Network State Access',
        shortDescription: 'Check network connectivity',
        detailedExplanation: 'Network state access allows the app to check connectivity and optimize performance accordingly.',
        benefits: [
          'Optimized content delivery',
          'Better offline experience',
          'Network-aware features'
        ],
        privacyNote: 'Network state information is used only to improve app performance and user experience.'
      },
      [PermissionType.INTERNET]: {
        title: 'Internet Access',
        shortDescription: 'Connect to online services',
        detailedExplanation: 'Internet access enables all online features, content sharing, and cloud services.',
        benefits: [
          'Access to online content',
          'Cloud synchronization',
          'Social features'
        ],
        privacyNote: 'Internet access is required for most app features and respects your privacy and data preferences.'
      },
      [PermissionType.CALL_PHONE]: {
        title: 'Phone Call Access',
        shortDescription: 'Make phone calls',
        detailedExplanation: 'Phone call access enables click-to-call features and phone number verification.',
        benefits: [
          'Click-to-call functionality',
          'Phone number verification',
          'Enhanced communication'
        ],
        privacyNote: 'Phone call access is only used when you initiate a call and never accesses your call history.'
      },
      [PermissionType.READ_PHONE_STATE]: {
        title: 'Phone State Access',
        shortDescription: 'Read phone status',
        detailedExplanation: 'Phone state access enables features that respond to phone status like incoming calls.',
        benefits: [
          'Call interruption handling',
          'Better media playback',
          'Enhanced user experience'
        ],
        privacyNote: 'Phone state access is limited to status information and never accesses personal call data.'
      },
      [PermissionType.SEND_SMS]: {
        title: 'SMS Sending',
        shortDescription: 'Send text messages',
        detailedExplanation: 'SMS sending enables verification codes and notification features via text message.',
        benefits: [
          'Two-factor authentication',
          'Verification codes',
          'Text-based notifications'
        ],
        privacyNote: 'SMS sending is only used for verification and notification purposes with your explicit consent.'
      },
      [PermissionType.RECEIVE_SMS]: {
        title: 'SMS Receiving',
        shortDescription: 'Receive text messages',
        detailedExplanation: 'SMS receiving enables verification code reception and text-based features.',
        benefits: [
          'Verification code reception',
          'Text-based features',
          'Enhanced security'
        ],
        privacyNote: 'SMS receiving is limited to verification purposes and never scans your personal messages.'
      },
      [PermissionType.ACTIVITY_RECOGNITION]: {
        title: 'Activity Recognition',
        shortDescription: 'Recognize physical activities',
        detailedExplanation: 'Activity recognition tracks your physical activities to provide fitness and wellness insights.',
        benefits: [
          'Fitness and wellness tracking',
          'Activity-based recommendations',
          'Health insights'
        ],
        privacyNote: 'Activity data is processed locally and used only to enhance your wellness experience.'
      },
      [PermissionType.BODY_SENSORS]: {
        title: 'Body Sensors Access',
        shortDescription: 'Access body sensor data',
        detailedExplanation: 'Body sensors access enables heart rate, temperature, and other biometric data for health features.',
        benefits: [
          'Advanced health monitoring',
          'Biometric authentication',
          'Wellness insights'
        ],
        privacyNote: 'Body sensor data is encrypted and HIPAA compliant. You control what data is accessed and shared.'
      },
      [PermissionType.FACE_ID]: {
        title: 'Face ID Access',
        shortDescription: 'Use Face ID for authentication',
        detailedExplanation: 'Face ID provides secure biometric authentication for quick and easy access to your account.',
        benefits: [
          'Secure and fast authentication',
          'Enhanced account protection',
          'Seamless user experience'
        ],
        privacyNote: 'Face ID data is processed locally on your device and never stored on our servers.'
      },
      [PermissionType.TOUCH_ID]: {
        title: 'Touch ID Access',
        shortDescription: 'Use Touch ID for authentication',
        detailedExplanation: 'Touch ID provides secure fingerprint authentication for quick and easy access to your account.',
        benefits: [
          'Secure and fast authentication',
          'Enhanced account protection',
          'Seamless user experience'
        ],
        privacyNote: 'Touch ID data is processed locally on your device and never stored on our servers.'
      },
      [PermissionType.FINGERPRINT]: {
        title: 'Fingerprint Access',
        shortDescription: 'Use fingerprint for authentication',
        detailedExplanation: 'Fingerprint authentication provides secure biometric access to your account and sensitive features.',
        benefits: [
          'Secure authentication',
          'Enhanced account protection',
          'Quick access to features'
        ],
        privacyNote: 'Fingerprint data is processed locally and never stored or shared with third parties.'
      },
      [PermissionType.BLUETOOTH_ADMIN]: {
        title: 'Bluetooth Administration',
        shortDescription: 'Manage Bluetooth connections',
        detailedExplanation: 'Bluetooth administration enables advanced Bluetooth features and device management capabilities.',
        benefits: [
          'Advanced device connectivity',
          'Bluetooth device management',
          'Enhanced audio features'
        ],
        privacyNote: 'Bluetooth administration is only used for device connectivity and respects your privacy settings.'
      },
      [PermissionType.BLUETOOTH_ADVERTISE]: {
        title: 'Bluetooth Advertising',
        shortDescription: 'Advertise to nearby devices',
        detailedExplanation: 'Bluetooth advertising allows your device to be discoverable by nearby Bluetooth-enabled devices.',
        benefits: [
          'Device discoverability',
          'Easy connection setup',
          'Nearby device features'
        ],
        privacyNote: 'Bluetooth advertising is only active when you enable discoverability and never shares personal data.'
      },
      [PermissionType.BLUETOOTH_CONNECT]: {
        title: 'Bluetooth Connection',
        shortDescription: 'Connect to Bluetooth devices',
        detailedExplanation: 'Bluetooth connection enables pairing and communication with nearby Bluetooth devices.',
        benefits: [
          'Connect to audio devices',
          'Use smart accessories',
          'Enhanced functionality'
        ],
        privacyNote: 'Bluetooth connections are only established when you initiate them and never access personal data.'
      },
      [PermissionType.BLUETOOTH_SCAN]: {
        title: 'Bluetooth Scanning',
        shortDescription: 'Discover nearby devices',
        detailedExplanation: 'Bluetooth scanning discovers nearby devices for connection and enhanced features.',
        benefits: [
          'Discover nearby devices',
          'Easy connection setup',
          'Enhanced social features'
        ],
        privacyNote: 'Bluetooth scanning is only used to discover devices and never collects or shares personal information.'
      },
      [PermissionType.NFC_TRANSACTION_EVENT]: {
        title: 'NFC Transaction Events',
        shortDescription: 'Handle NFC transactions',
        detailedExplanation: 'NFC transaction events enable contactless payments and secure NFC-based interactions.',
        benefits: [
          'Contactless payments',
          'Secure transactions',
          'Enhanced convenience'
        ],
        privacyNote: 'NFC transactions are encrypted and secure. You control when and how NFC features are used.'
      },
      [PermissionType.CONTROL_VPN]: {
        title: 'VPN Control',
        shortDescription: 'Manage VPN connections',
        detailedExplanation: 'VPN control enables VPN management and secure network connection features.',
        benefits: [
          'Secure network connections',
          'VPN management',
          'Enhanced privacy'
        ],
        privacyNote: 'VPN control is only used for network security and respects your privacy and security preferences.'
      },
      [PermissionType.HEALTH_SHARE]: {
        title: 'Health Data Sharing',
        shortDescription: 'Share health data',
        detailedExplanation: 'Health data sharing enables you to share wellness information with trusted apps and services.',
        benefits: [
          'Share with health apps',
          'Comprehensive wellness tracking',
          'Integrated health services'
        ],
        privacyNote: 'Health data sharing is encrypted and requires your explicit consent for each sharing instance.'
      },
      [PermissionType.HEALTH_UPDATE]: {
        title: 'Health Data Updates',
        shortDescription: 'Update health information',
        detailedExplanation: 'Health data updates keep your wellness information current across connected services.',
        benefits: [
          'Synchronized health data',
          'Current wellness insights',
          'Integrated health tracking'
        ],
        privacyNote: 'Health data updates are encrypted and you control when and how your data is synchronized.'
      },
      [PermissionType.BACKGROUND_APP_REFRESH]: {
        title: 'Background App Refresh',
        shortDescription: 'Refresh content in background',
        detailedExplanation: 'Background app refresh keeps your content and notifications up-to-date when the app is not active.',
        benefits: [
          'Fresh content and updates',
          'Real-time notifications',
          'Seamless experience'
        ],
        privacyNote: 'Background refresh respects your device\'s battery settings and can be disabled anytime.'
      },
      [PermissionType.WRITE_SETTINGS]: {
        title: 'System Settings Access',
        shortDescription: 'Modify system settings',
        detailedExplanation: 'System settings access enables the app to modify certain device settings for enhanced functionality.',
        benefits: [
          'Enhanced app integration',
          'Improved user experience',
          'System-level features'
        ],
        privacyNote: 'System settings access is limited to specific features and requires your explicit permission.'
      },
      [PermissionType.ACCESSIBILITY]: {
        title: 'Accessibility Service',
        shortDescription: 'Enhanced accessibility features',
        detailedExplanation: 'Accessibility service provides enhanced accessibility features for users with disabilities.',
        benefits: [
          'Enhanced accessibility',
          'Improved usability',
          'Inclusive design'
        ],
        privacyNote: 'Accessibility service is designed to help users with disabilities and respects all privacy guidelines.'
      },
      [PermissionType.RECORD_AUDIO]: {
        title: 'Audio Recording',
        shortDescription: 'Record audio content',
        detailedExplanation: 'Audio recording enables you to capture sound, voice, and music for your content.',
        benefits: [
          'High-quality audio capture',
          'Voice recording',
          'Music and sound effects'
        ],
        privacyNote: 'Audio recording is only active when you initiate it and never occurs in the background.'
      },
      [PermissionType.MODIFY_AUDIO_SETTINGS]: {
        title: 'Audio Settings Modification',
        shortDescription: 'Adjust audio settings',
        detailedExplanation: 'Audio settings modification enables enhanced audio features and sound optimization.',
        benefits: [
          'Enhanced audio quality',
          'Custom sound settings',
          'Improved listening experience'
        ],
        privacyNote: 'Audio settings modification is limited to the app\'s audio features and never affects system settings.'
      },
      [PermissionType.BIND_VPN_SERVICE]: {
        title: 'VPN Service Binding',
        shortDescription: 'Connect to VPN services',
        detailedExplanation: 'VPN service binding enables secure connection to VPN services for enhanced privacy and security.',
        benefits: [
          'Enhanced privacy protection',
          'Secure connections',
          'Bypass restrictions'
        ],
        privacyNote: 'VPN service binding is only used for security purposes and never logs or monitors your activity.'
      }
    };

    return educationMap[permissionType] || {
      title: `${permissionType} Access`,
      shortDescription: 'This permission is required for the app to function properly.',
      detailedExplanation: 'This permission enables specific features within the application.',
      benefits: ['Enhanced functionality', 'Improved user experience'],
      privacyNote: 'Your privacy is important to us. This permission is used responsibly and in accordance with our privacy policy.'
    };
  };

  if (!isOpen) {
    return null;
  }

  const allGranted = permissions.every(p => permissionStates.get(p.type));
  const hasAnyGranted = permissions.some(p => permissionStates.get(p.type));

  return (
    <div className="permission-modal-overlay">
      <div className="permission-modal">
        <div className="permission-modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="permission-modal-content">
          <p className="permission-modal-description">{description}</p>

          <div className="permission-list">
            {permissions.map((permission) => (
              <PermissionRequestItem
                key={permission.type}
                request={permission}
                education={getEducationContent(permission.type)}
                isGranted={permissionStates.get(permission.type) || false}
                isLoading={loadingPermissions.has(permission.type)}
                onRequest={() => handlePermissionRequest(permission.type)}
              />
            ))}
          </div>
        </div>

        <div className="permission-modal-footer">
          <div className="permission-status">
            {allGranted && (
              <span className="status-all-granted">
                ✓ All permissions granted! You can now use all features.
              </span>
            )}
            {hasAnyGranted && !allGranted && (
              <span className="status-partial">
                Some permissions granted. You may experience limited functionality.
              </span>
            )}
          </div>

          <div className="permission-actions">
            {!allGranted && (
              <button
                className="grant-all-button"
                onClick={handleRequestAllPermissions}
                disabled={loadingPermissions.size > 0}
              >
                {loadingPermissions.size > 0 ? 'Requesting...' : 'Grant All Permissions'}
              </button>
            )}
            <button className="continue-button" onClick={onClose}>
              {allGranted ? 'Continue' : 'Continue Anyway'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get icon for permission type
 */
function getPermissionIcon(type: PermissionType): string {
  const iconMap: Record<PermissionType, string> = {
    [PermissionType.CAMERA]: '📷',
    [PermissionType.MICROPHONE]: '🎤',
    [PermissionType.LOCATION]: '📍',
    [PermissionType.NOTIFICATIONS]: '🔔',
    [PermissionType.STORAGE]: '💾',
    [PermissionType.CONTACTS]: '👥',
    [PermissionType.CALENDAR]: '📅',
    [PermissionType.BIOMETRIC]: '🔐',
    [PermissionType.BLUETOOTH]: '🔵',
    [PermissionType.HEALTH]: '❤️',
    [PermissionType.NFC]: '📱',
    [PermissionType.SMS]: '💬',
    [PermissionType.BACKGROUND_REFRESH]: '🔄',
    [PermissionType.MOTION]: '🏃',
    [PermissionType.SYSTEM_ALERT_WINDOW]: '🖼️',
    [PermissionType.CAMERA_ROLL]: '🖼️',
    [PermissionType.MEDIA_LIBRARY]: '🎵',
    [PermissionType.SPEECH_RECOGNITION]: '🗣️',
    [PermissionType.LOCATION_ALWAYS]: '📍',
    [PermissionType.LOCATION_WHEN_IN_USE]: '📍',
    [PermissionType.PUSH_NOTIFICATIONS]: '📲',
    [PermissionType.EXTERNAL_STORAGE]: '💿',
    [PermissionType.NETWORK_STATE]: '🌐',
    [PermissionType.INTERNET]: '🌍',
    [PermissionType.CALL_PHONE]: '📞',
    [PermissionType.READ_PHONE_STATE]: '📱',
    [PermissionType.PHONE_STATE]: '📱',
    [PermissionType.SEND_SMS]: '💬',
    [PermissionType.RECEIVE_SMS]: '💬',
    [PermissionType.ACTIVITY_RECOGNITION]: '🏃',
    [PermissionType.BODY_SENSORS]: '❤️',
    [PermissionType.FACE_ID]: '👤',
    [PermissionType.TOUCH_ID]: '👆',
    [PermissionType.FINGERPRINT]: '👆',
    [PermissionType.BLUETOOTH_ADMIN]: '⚙️',
    [PermissionType.BLUETOOTH_ADVERTISE]: '📡',
    [PermissionType.BLUETOOTH_CONNECT]: '🔗',
    [PermissionType.BLUETOOTH_SCAN]: '🔍',
    [PermissionType.NFC_TRANSACTION_EVENT]: '💳',
    [PermissionType.CONTROL_VPN]: '🔒',
    [PermissionType.HEALTH_SHARE]: '🤝',
    [PermissionType.HEALTH_UPDATE]: '🔄',
    [PermissionType.BACKGROUND_APP_REFRESH]: '🔄',
    [PermissionType.WRITE_SETTINGS]: '⚙️',
    [PermissionType.ACCESSIBILITY]: '♿',
    [PermissionType.RECORD_AUDIO]: '🎤',
    [PermissionType.MODIFY_AUDIO_SETTINGS]: '🔊',
    [PermissionType.BIND_VPN_SERVICE]: '🔒'
  };

  return iconMap[type] || '⚙️';
}