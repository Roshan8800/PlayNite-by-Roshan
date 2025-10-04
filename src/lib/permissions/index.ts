// Main entry point for the PlayNite mobile permissions system
// Exports all components, types, and utilities for mobile platform permissions

// Core types and interfaces
export * from './types';

// Core permission management
export { PermissionManager } from './core/PermissionManager';
export { FeatureAccessController } from './core/FeatureAccessController';
export { FallbackHandler } from './core/FallbackHandler';

// Platform-specific handlers
export { PlatformPermissionHandler } from './handlers/PlatformPermissionHandler';

// Security and privacy management
export { PrivacyManager } from './security/PrivacyManager';
export { PermissionSecurityIntegration } from './security/PermissionSecurityIntegration';

// UI components and hooks
export { PermissionRequestModal } from './ui/PermissionRequestModal';
export { PermissionEducationFlow } from './ui/PermissionEducationFlow';
export { usePermissions, usePermissionRequest, useFeatureAccess } from './ui/usePermissions';

// Utility functions for common permission operations
import { PermissionManager } from './core/PermissionManager';
import { FeatureAccessController } from './core/FeatureAccessController';
import { PrivacyManager } from './security/PrivacyManager';
import { FallbackHandler } from './core/FallbackHandler';
import { PermissionSecurityIntegration } from './security/PermissionSecurityIntegration';

/**
 * Initialize the complete permissions system
 */
export async function initializePermissionsSystem(): Promise<void> {
  const integration = PermissionSecurityIntegration.getInstance();
  await integration.initialize();
}

/**
 * Quick access to commonly used permission functions
 */
export const Permissions = {
  // Permission management
  async requestPermission(type: any, rationale?: string) {
    const manager = PermissionManager.getInstance();
    await manager.initialize();
    return manager.requestPermission(type, rationale);
  },

  async checkPermission(type: any) {
    const manager = PermissionManager.getInstance();
    await manager.initialize();
    return manager.checkPermission(type);
  },

  // Feature access control
  async canAccessFeature(featureName: string) {
    const controller = FeatureAccessController.getInstance();
    await controller.initialize();
    return controller.canAccessFeature(featureName);
  },

  // Privacy management
  getPrivacySetting(key: string) {
    const privacy = PrivacyManager.getInstance();
    return privacy.getPrivacySetting(key);
  },

  setPrivacySetting(key: string, value: any) {
    const privacy = PrivacyManager.getInstance();
    privacy.setPrivacySetting(key, value);
  },

  // Fallback handling
  async handleFallback(permissionType: any, context?: any) {
    const fallback = FallbackHandler.getInstance();
    await fallback.initialize();
    return fallback.handlePermissionFallback(permissionType, context);
  }
};

/**
 * React hook for easy permissions integration
 */
export function usePermissionsSystem() {
  return {
    Permissions,
    initializePermissionsSystem
  };
}

// Default export for easy importing
export default {
  initializePermissionsSystem,
  Permissions,
  usePermissionsSystem
};