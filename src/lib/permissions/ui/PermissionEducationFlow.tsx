'use client';

import React, { useState, useEffect } from 'react';
import {
  PermissionType,
  PermissionRequest,
  PermissionCategory,
  UserEducationContent,
  FallbackBehavior
} from '../types';

import { PermissionManager } from '../core/PermissionManager';
import { FeatureAccessController } from '../core/FeatureAccessController';

interface PermissionEducationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: PermissionRequest[];
  title?: string;
  description?: string;
  onComplete: (grantedPermissions: PermissionType[], deniedPermissions: PermissionType[]) => void;
  featureName?: string;
  showSkipOption?: boolean;
}

interface EducationStep {
  id: string;
  title: string;
  description: string;
  permissions: PermissionRequest[];
  category: PermissionCategory;
  isRequired: boolean;
  illustration?: string;
}

/**
 * Permission education flow component
 * Guides users through understanding permissions before requesting them
 */
export const PermissionEducationFlow: React.FC<PermissionEducationFlowProps> = ({
  isOpen,
  onClose,
  permissions,
  title = 'Understanding App Permissions',
  description = 'Let\'s walk through the permissions this app needs to provide you with the best experience.',
  onComplete,
  featureName,
  showSkipOption = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [educationSteps, setEducationSteps] = useState<EducationStep[]>([]);
  const [userDecisions, setUserDecisions] = useState<Map<PermissionType, boolean>>(new Map());

  const permissionManager = PermissionManager.getInstance();
  const featureController = FeatureAccessController.getInstance();

  // Group permissions into education steps
  useEffect(() => {
    if (isOpen && permissions.length > 0) {
      const steps = createEducationSteps(permissions);
      setEducationSteps(steps);
    }
  }, [isOpen, permissions]);

  /**
   * Create education steps from permissions
   */
  const createEducationSteps = (perms: PermissionRequest[]): EducationStep[] => {
    const stepsByCategory = new Map<PermissionCategory, PermissionRequest[]>();

    // Group permissions by category
    perms.forEach(permission => {
      const category = getPermissionCategory(permission.type);
      if (!stepsByCategory.has(category)) {
        stepsByCategory.set(category, []);
      }
      stepsByCategory.get(category)!.push(permission);
    });

    // Create education steps
    const steps: EducationStep[] = [];
    let stepId = 0;

    stepsByCategory.forEach((categoryPermissions, category) => {
      steps.push({
        id: `step-${stepId++}`,
        title: getCategoryTitle(category),
        description: getCategoryDescription(category),
        permissions: categoryPermissions,
        category,
        isRequired: categoryPermissions.some(p => p.required),
        illustration: getCategoryIllustration(category)
      });
    });

    return steps;
  };

  /**
   * Get permission category
   */
  const getPermissionCategory = (type: PermissionType): PermissionCategory => {
    const categoryMap: Record<PermissionType, PermissionCategory> = {
      [PermissionType.CAMERA]: PermissionCategory.ESSENTIAL,
      [PermissionType.MICROPHONE]: PermissionCategory.ESSENTIAL,
      [PermissionType.CAMERA_ROLL]: PermissionCategory.FUNCTIONAL,
      [PermissionType.MEDIA_LIBRARY]: PermissionCategory.FUNCTIONAL,
      [PermissionType.STORAGE]: PermissionCategory.FUNCTIONAL,
      [PermissionType.LOCATION]: PermissionCategory.FUNCTIONAL,
      [PermissionType.NOTIFICATIONS]: PermissionCategory.FUNCTIONAL,
      [PermissionType.CONTACTS]: PermissionCategory.FUNCTIONAL,
      [PermissionType.CALENDAR]: PermissionCategory.FUNCTIONAL,
      [PermissionType.BIOMETRIC]: PermissionCategory.ESSENTIAL,
      [PermissionType.BLUETOOTH]: PermissionCategory.FUNCTIONAL,
      [PermissionType.HEALTH]: PermissionCategory.ANALYTICAL,
      [PermissionType.NFC]: PermissionCategory.FUNCTIONAL,
      [PermissionType.SMS]: PermissionCategory.ESSENTIAL,
      [PermissionType.BACKGROUND_REFRESH]: PermissionCategory.FUNCTIONAL,
      [PermissionType.MOTION]: PermissionCategory.ANALYTICAL,
      [PermissionType.SYSTEM_ALERT_WINDOW]: PermissionCategory.FUNCTIONAL,
      [PermissionType.SPEECH_RECOGNITION]: PermissionCategory.FUNCTIONAL,
      [PermissionType.LOCATION_ALWAYS]: PermissionCategory.FUNCTIONAL,
      [PermissionType.LOCATION_WHEN_IN_USE]: PermissionCategory.FUNCTIONAL,
      [PermissionType.PUSH_NOTIFICATIONS]: PermissionCategory.FUNCTIONAL,
      [PermissionType.EXTERNAL_STORAGE]: PermissionCategory.FUNCTIONAL,
      [PermissionType.NETWORK_STATE]: PermissionCategory.ESSENTIAL,
      [PermissionType.INTERNET]: PermissionCategory.ESSENTIAL,
      [PermissionType.CALL_PHONE]: PermissionCategory.FUNCTIONAL,
      [PermissionType.READ_PHONE_STATE]: PermissionCategory.FUNCTIONAL,
      [PermissionType.SEND_SMS]: PermissionCategory.ESSENTIAL,
      [PermissionType.RECEIVE_SMS]: PermissionCategory.ESSENTIAL,
      [PermissionType.ACTIVITY_RECOGNITION]: PermissionCategory.ANALYTICAL,
      [PermissionType.BODY_SENSORS]: PermissionCategory.ANALYTICAL,
      [PermissionType.FACE_ID]: PermissionCategory.ESSENTIAL,
      [PermissionType.TOUCH_ID]: PermissionCategory.ESSENTIAL,
      [PermissionType.FINGERPRINT]: PermissionCategory.ESSENTIAL,
      [PermissionType.BLUETOOTH_ADMIN]: PermissionCategory.FUNCTIONAL,
      [PermissionType.BLUETOOTH_ADVERTISE]: PermissionCategory.FUNCTIONAL,
      [PermissionType.BLUETOOTH_CONNECT]: PermissionCategory.FUNCTIONAL,
      [PermissionType.BLUETOOTH_SCAN]: PermissionCategory.FUNCTIONAL,
      [PermissionType.NFC_TRANSACTION_EVENT]: PermissionCategory.FUNCTIONAL,
      [PermissionType.CONTROL_VPN]: PermissionCategory.ESSENTIAL,
      [PermissionType.HEALTH_SHARE]: PermissionCategory.ANALYTICAL,
      [PermissionType.HEALTH_UPDATE]: PermissionCategory.ANALYTICAL,
      [PermissionType.BACKGROUND_APP_REFRESH]: PermissionCategory.FUNCTIONAL,
      [PermissionType.WRITE_SETTINGS]: PermissionCategory.FUNCTIONAL,
      [PermissionType.ACCESSIBILITY]: PermissionCategory.ANALYTICAL,
      [PermissionType.RECORD_AUDIO]: PermissionCategory.ESSENTIAL,
      [PermissionType.MODIFY_AUDIO_SETTINGS]: PermissionCategory.FUNCTIONAL,
      [PermissionType.BIND_VPN_SERVICE]: PermissionCategory.ESSENTIAL,
      [PermissionType.PHONE_STATE]: PermissionCategory.FUNCTIONAL
    };

    return categoryMap[type] || PermissionCategory.FUNCTIONAL;
  };

  /**
   * Get category title
   */
  const getCategoryTitle = (category: PermissionCategory): string => {
    const titles: Record<PermissionCategory, string> = {
      [PermissionCategory.ESSENTIAL]: 'Essential Features',
      [PermissionCategory.FUNCTIONAL]: 'Enhanced Features',
      [PermissionCategory.ANALYTICAL]: 'Analytics & Personalization',
      [PermissionCategory.MARKETING]: 'Marketing & Communication'
    };
    return titles[category];
  };

  /**
   * Get category description
   */
  const getCategoryDescription = (category: PermissionCategory): string => {
    const descriptions: Record<PermissionCategory, string> = {
      [PermissionCategory.ESSENTIAL]: 'These permissions are required for the app to function properly.',
      [PermissionCategory.FUNCTIONAL]: 'These permissions enable additional features and improved functionality.',
      [PermissionCategory.ANALYTICAL]: 'These permissions help us understand how you use the app to improve your experience.',
      [PermissionCategory.MARKETING]: 'These permissions allow us to provide you with relevant offers and updates.'
    };
    return descriptions[category];
  };

  /**
   * Get category illustration
   */
  const getCategoryIllustration = (category: PermissionCategory): string => {
    const illustrations: Record<PermissionCategory, string> = {
      [PermissionCategory.ESSENTIAL]: '🔑',
      [PermissionCategory.FUNCTIONAL]: '⚡',
      [PermissionCategory.ANALYTICAL]: '📊',
      [PermissionCategory.MARKETING]: '📢'
    };
    return illustrations[category];
  };

  /**
   * Handle user decision for current step
   */
  const handleStepDecision = (allow: boolean) => {
    const currentStepData = educationSteps[currentStep];
    if (!currentStepData) return;

    // Record user decisions for all permissions in this step
    const newDecisions = new Map(userDecisions);
    currentStepData.permissions.forEach(permission => {
      newDecisions.set(permission.type, allow);
    });
    setUserDecisions(newDecisions);

    // Move to next step or complete
    if (currentStep < educationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeEducationFlow();
    }
  };

  /**
   * Complete the education flow and request permissions
   */
  const completeEducationFlow = async () => {
    const allowedPermissions = Array.from(userDecisions.entries())
      .filter(([, allowed]) => allowed)
      .map(([type]) => type);

    const deniedPermissions = Array.from(userDecisions.entries())
      .filter(([, allowed]) => !allowed)
      .map(([type]) => type);

    if (allowedPermissions.length > 0) {
      try {
        // Request allowed permissions
        const permissionRequests = permissions.filter(p =>
          allowedPermissions.includes(p.type)
        );

        const results = await permissionManager.requestMultiplePermissions(permissionRequests);

        const actuallyGranted = Object.entries(results)
          .filter(([, result]) => result.status === 'granted')
          .map(([type]) => type as PermissionType);

        const actuallyDenied = Object.entries(results)
          .filter(([, result]) => result.status !== 'granted')
          .map(([type]) => type as PermissionType);

        onComplete(actuallyGranted, [...deniedPermissions, ...actuallyDenied]);
      } catch (error) {
        console.error('Failed to request permissions:', error);
        onComplete([], [...deniedPermissions, ...allowedPermissions]);
      }
    } else {
      onComplete([], [...deniedPermissions, ...allowedPermissions]);
    }
  };

  /**
   * Skip the education flow
   */
  const handleSkip = () => {
    const allPermissions = permissions.map(p => p.type);
    onComplete([], allPermissions);
  };

  if (!isOpen || educationSteps.length === 0) {
    return null;
  }

  const currentStepData = educationSteps[currentStep];
  const progress = ((currentStep + 1) / educationSteps.length) * 100;

  return (
    <div className="education-flow-overlay">
      <div className="education-flow-modal">
        <div className="education-flow-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="education-flow-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            {currentStep + 1} of {educationSteps.length}
          </span>
        </div>

        <div className="education-flow-content">
          <div className="step-illustration">
            <span className="illustration-icon">{currentStepData.illustration}</span>
          </div>

          <div className="step-content">
            <h3 className="step-title">{currentStepData.title}</h3>
            <p className="step-description">{currentStepData.description}</p>

            <div className="permissions-in-step">
              <h4>Permissions in this category:</h4>
              <ul>
                {currentStepData.permissions.map(permission => (
                  <li key={permission.type}>
                    <span className="permission-icon-small">
                      {getPermissionIcon(permission.type)}
                    </span>
                    <span className="permission-name">
                      {getPermissionDisplayName(permission.type)}
                    </span>
                    {permission.required && (
                      <span className="required-badge">Required</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="step-benefits">
              <h4>Why we need these permissions:</h4>
              <div className="benefits-list">
                {getCategoryBenefits(currentStepData.category).map((benefit, index) => (
                  <div key={index} className="benefit-item">
                    <span className="benefit-icon">✓</span>
                    <span className="benefit-text">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="step-privacy">
              <h4>Privacy & Security:</h4>
              <p>{getCategoryPrivacyNote(currentStepData.category)}</p>
            </div>
          </div>
        </div>

        <div className="education-flow-footer">
          <div className="step-actions">
            {currentStep > 0 && (
              <button
                className="secondary-button"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Previous
              </button>
            )}

            <div className="primary-actions">
              {showSkipOption && currentStep === 0 && (
                <button className="skip-button" onClick={handleSkip}>
                  Skip All
                </button>
              )}

              <button
                className="deny-button"
                onClick={() => handleStepDecision(false)}
              >
                {currentStepData.isRequired ? "I Understand (Required)" : "Don't Allow"}
              </button>

              <button
                className="allow-button"
                onClick={() => handleStepDecision(true)}
              >
                {currentStep === educationSteps.length - 1 ? 'Continue' : 'Allow & Continue'}
              </button>
            </div>
          </div>

          <div className="step-indicator">
            <span>Step {currentStep + 1} of {educationSteps.length}</span>
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
    [PermissionType.BIND_VPN_SERVICE]: '🔒',
    [PermissionType.PHONE_STATE]: '📱'
  };

  return iconMap[type] || '⚙️';
}

/**
 * Get display name for permission type
 */
function getPermissionDisplayName(type: PermissionType): string {
  const displayNames: Record<PermissionType, string> = {
    [PermissionType.CAMERA]: 'Camera',
    [PermissionType.MICROPHONE]: 'Microphone',
    [PermissionType.LOCATION]: 'Location',
    [PermissionType.NOTIFICATIONS]: 'Notifications',
    [PermissionType.STORAGE]: 'Storage',
    [PermissionType.CONTACTS]: 'Contacts',
    [PermissionType.CALENDAR]: 'Calendar',
    [PermissionType.BIOMETRIC]: 'Biometric Authentication',
    [PermissionType.BLUETOOTH]: 'Bluetooth',
    [PermissionType.HEALTH]: 'Health Data',
    [PermissionType.NFC]: 'NFC',
    [PermissionType.SMS]: 'SMS',
    [PermissionType.BACKGROUND_REFRESH]: 'Background Refresh',
    [PermissionType.MOTION]: 'Motion & Activity',
    [PermissionType.SYSTEM_ALERT_WINDOW]: 'System Overlay',
    [PermissionType.CAMERA_ROLL]: 'Photo Library',
    [PermissionType.MEDIA_LIBRARY]: 'Media Library',
    [PermissionType.SPEECH_RECOGNITION]: 'Voice Recognition',
    [PermissionType.LOCATION_ALWAYS]: 'Always-On Location',
    [PermissionType.LOCATION_WHEN_IN_USE]: 'Location When In Use',
    [PermissionType.PUSH_NOTIFICATIONS]: 'Push Notifications',
    [PermissionType.EXTERNAL_STORAGE]: 'External Storage',
    [PermissionType.NETWORK_STATE]: 'Network State',
    [PermissionType.INTERNET]: 'Internet Access',
    [PermissionType.CALL_PHONE]: 'Phone Calls',
    [PermissionType.READ_PHONE_STATE]: 'Phone State',
    [PermissionType.SEND_SMS]: 'Send SMS',
    [PermissionType.RECEIVE_SMS]: 'Receive SMS',
    [PermissionType.ACTIVITY_RECOGNITION]: 'Activity Recognition',
    [PermissionType.BODY_SENSORS]: 'Body Sensors',
    [PermissionType.FACE_ID]: 'Face ID',
    [PermissionType.TOUCH_ID]: 'Touch ID',
    [PermissionType.FINGERPRINT]: 'Fingerprint',
    [PermissionType.BLUETOOTH_ADMIN]: 'Bluetooth Administration',
    [PermissionType.BLUETOOTH_ADVERTISE]: 'Bluetooth Advertising',
    [PermissionType.BLUETOOTH_CONNECT]: 'Bluetooth Connection',
    [PermissionType.BLUETOOTH_SCAN]: 'Bluetooth Scanning',
    [PermissionType.NFC_TRANSACTION_EVENT]: 'NFC Transactions',
    [PermissionType.CONTROL_VPN]: 'VPN Control',
    [PermissionType.HEALTH_SHARE]: 'Health Data Sharing',
    [PermissionType.HEALTH_UPDATE]: 'Health Data Updates',
    [PermissionType.BACKGROUND_APP_REFRESH]: 'Background App Refresh',
    [PermissionType.WRITE_SETTINGS]: 'System Settings',
    [PermissionType.ACCESSIBILITY]: 'Accessibility Service',
    [PermissionType.RECORD_AUDIO]: 'Audio Recording',
    [PermissionType.MODIFY_AUDIO_SETTINGS]: 'Audio Settings',
    [PermissionType.BIND_VPN_SERVICE]: 'VPN Service',
    [PermissionType.PHONE_STATE]: 'Phone State'
  };

  return displayNames[type] || `${type}`;
}

/**
 * Get category benefits
 */
function getCategoryBenefits(category: PermissionCategory): string[] {
  const benefits: Record<PermissionCategory, string[]> = {
    [PermissionCategory.ESSENTIAL]: [
      'Core app functionality',
      'Basic user experience',
      'Essential security features'
    ],
    [PermissionCategory.FUNCTIONAL]: [
      'Enhanced features',
      'Improved user experience',
      'Additional capabilities'
    ],
    [PermissionCategory.ANALYTICAL]: [
      'Personalized experience',
      'Usage insights',
      'Feature improvements'
    ],
    [PermissionCategory.MARKETING]: [
      'Relevant offers',
      'Product updates',
      'Community features'
    ]
  };

  return benefits[category];
}

/**
 * Get category privacy note
 */
function getCategoryPrivacyNote(category: PermissionCategory): string {
  const privacyNotes: Record<PermissionCategory, string> = {
    [PermissionCategory.ESSENTIAL]: 'Essential permissions are required for the app to function and are used responsibly according to our privacy policy.',
    [PermissionCategory.FUNCTIONAL]: 'Functional permissions enhance your experience and are only used when you engage with specific features.',
    [PermissionCategory.ANALYTICAL]: 'Analytical permissions help us improve the app. You can opt out in settings at any time.',
    [PermissionCategory.MARKETING]: 'Marketing permissions allow us to provide relevant content. You can manage these preferences in settings.'
  };

  return privacyNotes[category];
}