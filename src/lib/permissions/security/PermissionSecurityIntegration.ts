import {
  PermissionType,
  PermissionStatus,
  PermissionState,
  PermissionEvent
} from '../types';

import { PermissionManager } from '../core/PermissionManager';
import { FeatureAccessController } from '../core/FeatureAccessController';
import { PrivacyManager } from './PrivacyManager';
import { FallbackHandler } from '../core/FallbackHandler';

/**
 * Integration service for connecting permissions system with existing security and auth systems
 */
export class PermissionSecurityIntegration {
  private static instance: PermissionSecurityIntegration;
  private permissionManager: PermissionManager;
  private featureController: FeatureAccessController;
  private privacyManager: PrivacyManager;
  private fallbackHandler: FallbackHandler;
  private isInitialized = false;

  // Integration hooks
  private authHooks: Map<string, Function[]> = new Map();
  private securityHooks: Map<string, Function[]> = new Map();

  private constructor() {
    this.permissionManager = PermissionManager.getInstance();
    this.featureController = FeatureAccessController.getInstance();
    this.privacyManager = PrivacyManager.getInstance();
    this.fallbackHandler = FallbackHandler.getInstance();
  }

  /**
   * Get singleton instance of PermissionSecurityIntegration
   */
  public static getInstance(): PermissionSecurityIntegration {
    if (!PermissionSecurityIntegration.instance) {
      PermissionSecurityIntegration.instance = new PermissionSecurityIntegration();
    }
    return PermissionSecurityIntegration.instance;
  }

  /**
   * Initialize the integration service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize all components
    await Promise.all([
      this.permissionManager.initialize(),
      this.featureController.initialize(),
      this.privacyManager.initialize(),
      this.fallbackHandler.initialize()
    ]);

    // Set up event listeners
    this.setupEventListeners();

    // Set up security integrations
    await this.setupSecurityIntegrations();

    this.isInitialized = true;
  }

  /**
   * Check if user has permission for a feature with security context
   */
  public async checkFeaturePermission(
    featureName: string,
    userId?: string,
    securityContext?: Record<string, any>
  ): Promise<{
    allowed: boolean;
    reason?: string;
    securityLevel: 'low' | 'medium' | 'high';
    requiresAuth: boolean;
    authLevel?: string;
  }> {
    this.ensureInitialized();

    try {
      // Check if feature is accessible based on permissions
      const accessInfo = await this.featureController.getFeatureAccessInfo(featureName);

      if (accessInfo.canAccess) {
        return {
          allowed: true,
          securityLevel: 'low',
          requiresAuth: false
        };
      }

      // Check if user authentication is required
      const requiresAuth = await this.checkAuthenticationRequirement(featureName, securityContext);

      if (requiresAuth && !userId) {
        return {
          allowed: false,
          reason: 'Authentication required',
          securityLevel: 'high',
          requiresAuth: true
        };
      }

      // Check security clearance level
      const securityLevel = this.getFeatureSecurityLevel(featureName);

      // Check if user has required security clearance
      if (userId && securityLevel === 'high') {
        const hasClearance = await this.checkSecurityClearance(userId, featureName, securityContext);
        if (!hasClearance) {
          return {
            allowed: false,
            reason: 'Insufficient security clearance',
            securityLevel,
            requiresAuth: true,
            authLevel: 'high'
          };
        }
      }

      return {
        allowed: false,
        reason: accessInfo.reason || 'Feature not accessible',
        securityLevel,
        requiresAuth,
        authLevel: requiresAuth ? 'medium' : undefined
      };
    } catch (error) {
      console.error(`Failed to check feature permission for ${featureName}:`, error);
      return {
        allowed: false,
        reason: 'Permission check failed',
        securityLevel: 'high',
        requiresAuth: true
      };
    }
  }

  /**
   * Request permissions with security validation
   */
  public async requestPermissionsWithSecurity(
    permissions: PermissionType[],
    userId?: string,
    securityContext?: Record<string, any>
  ): Promise<{
    granted: PermissionType[];
    denied: PermissionType[];
    blocked: PermissionType[];
    securityViolations: string[];
  }> {
    this.ensureInitialized();

    const granted: PermissionType[] = [];
    const denied: PermissionType[] = [];
    const blocked: PermissionType[] = [];
    const securityViolations: string[] = [];

    for (const permissionType of permissions) {
      try {
        // Check if permission request is allowed from security perspective
        const securityCheck = await this.validatePermissionRequest(
          permissionType,
          userId,
          securityContext
        );

        if (!securityCheck.allowed) {
          blocked.push(permissionType);
          securityViolations.push(securityCheck.reason || 'Security validation failed');
          continue;
        }

        // Check privacy settings
        if (!this.privacyManager.isDataCollectionAllowed(permissionType)) {
          denied.push(permissionType);
          continue;
        }

        // Request the permission
        const result = await this.permissionManager.requestPermission(permissionType);

        if (result.status === 'granted') {
          granted.push(permissionType);

          // Trigger security hooks
          await this.triggerSecurityHooks('permission_granted', {
            permissionType,
            userId,
            securityContext,
            result
          });
        } else {
          denied.push(permissionType);
        }
      } catch (error) {
        console.error(`Failed to request permission ${permissionType}:`, error);
        denied.push(permissionType);
      }
    }

    return {
      granted,
      denied,
      blocked,
      securityViolations
    };
  }

  /**
   * Register authentication hook
   */
  public registerAuthHook(event: string, callback: Function): void {
    if (!this.authHooks.has(event)) {
      this.authHooks.set(event, []);
    }
    this.authHooks.get(event)!.push(callback);
  }

  /**
   * Register security hook
   */
  public registerSecurityHook(event: string, callback: Function): void {
    if (!this.securityHooks.has(event)) {
      this.securityHooks.set(event, []);
    }
    this.securityHooks.get(event)!.push(callback);
  }

  /**
   * Integrate with existing auth middleware
   */
  public integrateWithAuthMiddleware(authMiddleware: any): void {
    this.ensureInitialized();

    // Hook into auth middleware to check permissions for protected routes
    const originalCheck = authMiddleware.checkPermission || authMiddleware.check;
    if (originalCheck) {
      authMiddleware.checkPermission = async (userId: string, permission: string, context?: any) => {
        // First check our permission system
        const featurePermission = await this.checkFeaturePermission(permission, userId, context);

        if (!featurePermission.allowed) {
          // Trigger auth hooks
          await this.triggerAuthHooks('permission_denied', {
            userId,
            permission,
            context,
            reason: featurePermission.reason
          });

          return false;
        }

        // Then check original auth system if needed
        if (originalCheck) {
          return await originalCheck.call(authMiddleware, userId, permission, context);
        }

        return true;
      };
    }
  }

  /**
   * Integrate with existing security monitoring
   */
  public integrateWithSecurityMonitoring(securityMonitor: any): void {
    this.ensureInitialized();

    // Register permission events with security monitoring
    this.permissionManager.addEventListener('all', (event: PermissionEvent) => {
      securityMonitor.logPermissionEvent?.(event);
    });

    // Hook into security monitoring for permission violations
    const originalAlert = securityMonitor.alert || securityMonitor.report;
    if (originalAlert) {
      this.registerSecurityHook('permission_violation', (violation: any) => {
        originalAlert.call(securityMonitor, {
          type: 'permission_violation',
          ...violation,
          timestamp: new Date()
        });
      });
    }
  }

  /**
   * Get security audit trail for permissions
   */
  public async getPermissionAuditTrail(
    userId?: string,
    permissionType?: PermissionType,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    this.ensureInitialized();

    // In a real implementation, this would query an audit log
    // For now, return mock audit data
    return [
      {
        timestamp: new Date(),
        userId,
        permissionType,
        action: 'permission_requested',
        result: 'granted',
        securityLevel: 'medium',
        context: {
          platform: this.getCurrentPlatform(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
        }
      }
    ];
  }

  /**
   * Validate permission request from security perspective
   */
  private async validatePermissionRequest(
    permissionType: PermissionType,
    userId?: string,
    securityContext?: Record<string, any>
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check rate limiting
    if (await this.isRateLimited(permissionType, userId)) {
      return {
        allowed: false,
        reason: 'Too many permission requests. Please try again later.'
      };
    }

    // Check if permission is blocked by security policy
    if (await this.isPermissionBlocked(permissionType, securityContext)) {
      return {
        allowed: false,
        reason: 'Permission blocked by security policy'
      };
    }

    // Check user security clearance
    if (userId && this.isHighSecurityPermission(permissionType)) {
      const hasClearance = await this.checkSecurityClearance(userId, permissionType, securityContext);
      if (!hasClearance) {
        return {
          allowed: false,
          reason: 'Insufficient security clearance for this permission'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if permission is high security
   */
  private isHighSecurityPermission(permissionType: PermissionType): boolean {
    const highSecurityPermissions = [
      PermissionType.BIOMETRIC,
      PermissionType.HEALTH,
      PermissionType.SMS,
      PermissionType.CONTROL_VPN,
      PermissionType.SYSTEM_ALERT_WINDOW,
      PermissionType.WRITE_SETTINGS,
      PermissionType.ACCESSIBILITY
    ];

    return highSecurityPermissions.includes(permissionType);
  }

  /**
   * Check if request is rate limited
   */
  private async isRateLimited(permissionType: PermissionType, userId?: string): Promise<boolean> {
    // In a real implementation, this would check rate limiting in Redis or similar
    // For now, return false (not rate limited)
    return false;
  }

  /**
   * Check if permission is blocked by security policy
   */
  private async isPermissionBlocked(
    permissionType: PermissionType,
    securityContext?: Record<string, any>
  ): Promise<boolean> {
    // Check platform-specific blocks
    const platform = this.getCurrentPlatform();

    // Example: Block certain permissions on web platform
    if (platform === 'web') {
      const webBlockedPermissions = [
        PermissionType.SYSTEM_ALERT_WINDOW,
        PermissionType.WRITE_SETTINGS,
        PermissionType.CONTROL_VPN
      ];

      if (webBlockedPermissions.includes(permissionType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check user security clearance
   */
  private async checkSecurityClearance(
    userId: string,
    featureName: string,
    securityContext?: Record<string, any>
  ): Promise<boolean> {
    // In a real implementation, this would check user roles, groups, or clearance levels
    // For now, return true (has clearance)
    return true;
  }

  /**
   * Check if authentication is required for a feature
   */
  private async checkAuthenticationRequirement(
    featureName: string,
    securityContext?: Record<string, any>
  ): Promise<boolean> {
    // Define which features require authentication
    const authRequiredFeatures = [
      'biometric_auth',
      'contact_sync',
      'health_tracking',
      'sms_verification',
      'background_sync',
      'file_upload',
      'settings_modification'
    ];

    return authRequiredFeatures.includes(featureName);
  }

  /**
   * Get security level for a feature
   */
  private getFeatureSecurityLevel(featureName: string): 'low' | 'medium' | 'high' {
    const highSecurityFeatures = [
      'biometric_auth',
      'health_tracking',
      'contact_sync',
      'sms_verification',
      'system_overlay',
      'settings_modification',
      'accessibility_features'
    ];

    const mediumSecurityFeatures = [
      'camera_capture',
      'video_recording',
      'location_sharing',
      'background_sync',
      'bluetooth_devices',
      'nfc_payments'
    ];

    if (highSecurityFeatures.includes(featureName)) {
      return 'high';
    }

    if (mediumSecurityFeatures.includes(featureName)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Set up event listeners for security integration
   */
  private setupEventListeners(): void {
    // Listen for permission events and trigger security hooks
    this.permissionManager.addEventListener('permission_granted', (event: PermissionEvent) => {
      this.triggerSecurityHooks('permission_granted', event);
    });

    this.permissionManager.addEventListener('permission_denied', (event: PermissionEvent) => {
      this.triggerSecurityHooks('permission_denied', event);
    });

    this.permissionManager.addEventListener('permission_revoked', (event: PermissionEvent) => {
      this.triggerSecurityHooks('permission_revoked', event);
    });
  }

  /**
   * Set up security integrations
   */
  private async setupSecurityIntegrations(): Promise<void> {
    // In a real implementation, this would integrate with:
    // - Authentication services (Auth0, Firebase Auth, etc.)
    // - Security monitoring (Datadog, New Relic, etc.)
    // - Compliance systems (GDPR, HIPAA, etc.)
    // - Audit logging systems

    console.log('Setting up security integrations...');
  }

  /**
   * Trigger authentication hooks
   */
  private async triggerAuthHooks(event: string, data: any): Promise<void> {
    const hooks = this.authHooks.get(event) || [];
    for (const hook of hooks) {
      try {
        await hook(data);
      } catch (error) {
        console.error(`Error in auth hook ${event}:`, error);
      }
    }
  }

  /**
   * Trigger security hooks
   */
  private async triggerSecurityHooks(event: string, data: any): Promise<void> {
    const hooks = this.securityHooks.get(event) || [];
    for (const hook of hooks) {
      try {
        await hook(data);
      } catch (error) {
        console.error(`Error in security hook ${event}:`, error);
      }
    }
  }

  /**
   * Get current platform type
   */
  private getCurrentPlatform(): 'ios' | 'android' | 'web' {
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
   * Ensure integration service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PermissionSecurityIntegration not initialized. Call initialize() first.');
    }
  }

  /**
   * Reset integration service (for testing/debugging)
   */
  public reset(): void {
    this.authHooks.clear();
    this.securityHooks.clear();
    this.isInitialized = false;
  }
}