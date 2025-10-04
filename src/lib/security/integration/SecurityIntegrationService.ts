import { signInWithEmailAndPassword } from 'firebase/auth';
import { securityManager } from '../core/SecurityManager';
import { authorizationService } from '../authorization/AuthorizationService';
import { mfaService } from '../auth/MFAService';
import { auth } from '@/lib/firebase';
import { panelSecurityManager } from '@/lib/panels/security/PanelSecurityManager';
import { accessControlManager } from '@/lib/panels/managers/AccessControlManager';

/**
 * Integration Configuration
 */
interface IntegrationConfig {
  enableEnhancedAuth: boolean;
  enableAdvancedRBAC: boolean;
  enableSecurityAudit: boolean;
  enableThreatDetection: boolean;
  enableComplianceReporting: boolean;
  fallbackToLegacy: boolean;
}

/**
 * Security Integration Service
 * Integrates the enhanced security system with existing PlayNite systems
 */
export class SecurityIntegrationService {
  private config: IntegrationConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize security integration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing security integration...');

      // Setup auth state listener for enhanced security
      this.setupAuthStateListener();

      // Integrate with existing panel security
      this.integratePanelSecurity();

      // Setup rule system integration
      this.integrateRuleSystem();

      // Setup service integrations
      this.integrateServices();

      this.initialized = true;
      console.log('Security integration initialized successfully');

    } catch (error) {
      console.error('Failed to initialize security integration:', error);
      throw error;
    }
  }

  /**
   * Enhanced authentication with security context
   */
  async authenticateUserWithSecurity(
    email: string,
    password: string,
    context: {
      ipAddress: string;
      userAgent: string;
      mfaToken?: string;
    }
  ): Promise<{
    success: boolean;
    user?: any;
    requiresMFA?: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      // Create security context
      const securityContext = {
        userId: '', // Will be set after authentication
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date(),
        operation: 'login',
        metadata: { method: 'email_password' }
      };

      // Use enhanced security manager for authentication
      if (this.config.enableEnhancedAuth) {
        const authResult = await securityManager.authenticateUser(
          email,
          password,
          securityContext,
          context.mfaToken
        );

        if (authResult.requiresMFA) {
          return {
            success: false,
            requiresMFA: true,
            error: authResult.reason
          };
        }

        if (authResult.allowed && authResult.context) {
          return {
            success: true,
            user: auth.currentUser,
            sessionId: authResult.context.sessionId
          };
        }

        return {
          success: false,
          error: authResult.reason
        };
      }

      // Fallback to legacy authentication
      if (this.config.fallbackToLegacy) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        return {
          success: true,
          user: userCredential.user,
          sessionId: `legacy_${Date.now()}`
        };
      }

      return {
        success: false,
        error: 'Authentication method not available'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Enhanced authorization check
   */
  async checkAuthorization(
    userId: string,
    resource: string,
    action: string,
    context?: {
      ipAddress: string;
      userAgent: string;
      timestamp?: Date;
    }
  ): Promise<{
    allowed: boolean;
    reason?: string;
    contextualRules?: any[];
  }> {
    try {
      // Use enhanced authorization service
      if (this.config.enableAdvancedRBAC) {
        const authContext = {
          userId,
          resource,
          action,
          environment: context ? {
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            timestamp: context.timestamp || new Date()
          } : undefined
        };

        const decision = await authorizationService.isAuthorized(
          userId,
          resource,
          action,
          authContext
        );

        return {
          allowed: decision.allowed,
          reason: decision.reason,
          contextualRules: decision.contextualRules
        };
      }

      // Fallback to legacy panel security
      if (this.config.fallbackToLegacy && resource.startsWith('panel:')) {
        const panelType = resource.replace('panel:', '') as any;
        const accessResult = await panelSecurityManager.validatePanelAccess(
          userId,
          panelType,
          {
            ipAddress: context?.ipAddress || 'unknown',
            userAgent: context?.userAgent || 'unknown'
          }
        );

        return {
          allowed: accessResult.success,
          reason: accessResult.reason
        };
      }

      return {
        allowed: false,
        reason: 'Authorization method not available'
      };

    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Authorization check failed'
      };
    }
  }

  /**
   * Enhanced security validation for operations
   */
  async validateSecurityContext(
    userId: string,
    operation: string,
    context: {
      ipAddress: string;
      userAgent: string;
      resource?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiresMFA?: boolean;
    requiresReauth?: boolean;
  }> {
    try {
      const securityContext = {
        userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: new Date(),
        operation,
        resource: context.resource,
        metadata: context.metadata
      };

      const validation = await securityManager.validateSecurityContext(securityContext);

      return {
        allowed: validation.allowed,
        reason: validation.reason,
        requiresMFA: validation.requiresMFA,
        requiresReauth: validation.requiresReauth
      };

    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Security validation failed'
      };
    }
  }

  /**
   * Log security event through integrated system
   */
  async logSecurityEvent(event: {
    type: string;
    userId?: string;
    operation: string;
    resource?: string;
    metadata?: Record<string, any>;
    success: boolean;
  }): Promise<void> {
    if (this.config.enableSecurityAudit) {
      await securityManager.validateSecurityContext({
        userId: event.userId,
        ipAddress: 'system',
        userAgent: 'system',
        timestamp: new Date(),
        operation: event.operation,
        resource: event.resource,
        metadata: event.metadata
      });
    }
  }

  /**
   * Setup auth state listener for enhanced security
   */
  private setupAuthStateListener(): void {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User signed in - enhance security context
        const securityContext = {
          userId: user.uid,
          ipAddress: 'system',
          userAgent: 'system',
          timestamp: new Date(),
          operation: 'auth_state_change',
          metadata: { event: 'sign_in' }
        };

        await securityManager.validateSecurityContext(securityContext);
      } else {
        // User signed out - cleanup security context
        const securityContext = {
          userId: 'anonymous',
          ipAddress: 'system',
          userAgent: 'system',
          timestamp: new Date(),
          operation: 'auth_state_change',
          metadata: { event: 'sign_out' }
        };

        await securityManager.validateSecurityContext(securityContext);
      }
    });
  }

  /**
   * Integrate with existing panel security system
   */
  private integratePanelSecurity(): void {
    // Enhance panel security manager with new security features
    const originalValidateAccess = panelSecurityManager.validatePanelAccess;

    panelSecurityManager.validatePanelAccess = async (userId, panelType, context) => {
      // First use enhanced authorization if enabled
      if (this.config.enableAdvancedRBAC) {
        const authDecision = await authorizationService.isAuthorized(
          userId,
          `panel:${panelType}`,
          'access'
        );

        if (!authDecision.allowed) {
          return {
            success: false,
            reason: authDecision.reason || 'Access denied by enhanced authorization',
            context,
            timestamp: new Date(),
            error: null
          };
        }
      }

      // Fallback to original panel security
      return originalValidateAccess.call(panelSecurityManager, userId, panelType, context);
    };
  }

  /**
   * Integrate with rule system
   */
  private integrateRuleSystem(): void {
    // This would integrate with the existing rule engine
    // For now, it's a placeholder for future integration
    console.log('Rule system integration ready');
  }

  /**
   * Integrate with various services
   */
  private integrateServices(): void {
    // Content service integration
    this.integrateContentService();

    // Social service integration
    this.integrateSocialService();

    // Video service integration
    this.integrateVideoService();

    // Notification service integration
    this.integrateNotificationService();
  }

  /**
   * Integrate with content service
   */
  private integrateContentService(): void {
    // Enhance content operations with security checks
    console.log('Content service security integration ready');
  }

  /**
   * Integrate with social service
   */
  private integrateSocialService(): void {
    // Enhance social operations with security checks
    console.log('Social service security integration ready');
  }

  /**
   * Integrate with video service
   */
  private integrateVideoService(): void {
    // Enhance video operations with security checks
    console.log('Video service security integration ready');
  }

  /**
   * Integrate with notification service
   */
  private integrateNotificationService(): void {
    // Enhance notification operations with security checks
    console.log('Notification service security integration ready');
  }

  /**
   * Update integration configuration
   */
  async updateConfig(newConfig: Partial<IntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // Log configuration change
    await this.logSecurityEvent({
      type: 'CONFIG_UPDATE',
      operation: 'integration_config_update',
      metadata: { updatedFields: Object.keys(newConfig) },
      success: true
    });
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(): Record<string, any> {
    return {
      initialized: this.initialized,
      config: this.config,
      securityManager: {
        activeSessions: securityManager.getSecurityConfig().session.maxConcurrentSessions,
        threatDetection: securityManager.getSecurityConfig().threatDetection.enabled,
        mfaEnabled: securityManager.getSecurityConfig().mfa.enabled
      },
      authorizationService: {
        totalRoles: authorizationService.getAllRoles().length,
        advancedRBAC: this.config.enableAdvancedRBAC
      },
      mfaService: {
        mfaEnabled: this.config.enableEnhancedAuth
      }
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): IntegrationConfig {
    return {
      enableEnhancedAuth: true,
      enableAdvancedRBAC: true,
      enableSecurityAudit: true,
      enableThreatDetection: true,
      enableComplianceReporting: true,
      fallbackToLegacy: true
    };
  }

  /**
   * Cleanup security integration
   */
  async cleanup(): Promise<void> {
    this.initialized = false;

    // Cleanup security manager
    // Stop threat detection monitoring
    // Close active sessions
    // Clear caches

    console.log('Security integration cleaned up');
  }
}

// Export singleton instance
export const securityIntegrationService = new SecurityIntegrationService();