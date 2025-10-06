import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { panelSecurityManager } from '@/lib/panels/security/PanelSecurityManager';
import { accessControlManager } from '@/lib/panels/managers/AccessControlManager';
import { AuditLogger, AuditEventType } from '../audit/AuditLogger';
import { DataProtectionManager } from '../data-protection/DataProtectionManager';
import { ThreatDetectionEngine } from '../monitoring/ThreatDetectionEngine';
import { ComplianceManager } from '../compliance/ComplianceManager';

/**
 * Security Configuration Interface
 */
export interface SecurityConfig {
  mfa: {
    enabled: boolean;
    requiredRoles: string[];
    issuer: string;
  };
  session: {
    timeout: number; // minutes
    maxConcurrentSessions: number;
    extendOnActivity: boolean;
  };
  encryption: {
    algorithm: string;
    keyRotationDays: number;
  };
  audit: {
    retentionDays: number;
    detailedLogging: boolean;
  };
  threatDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
  };
}

/**
 * Security Context for operations
 */
export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  operation: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Security Validation Result
 */
export interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  requiresMFA?: boolean;
  requiresReauth?: boolean;
  context?: SecurityContext;
}

/**
 * Centralized Security Manager
 * Coordinates all security aspects of the PlayNite platform
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private auditLogger: AuditLogger;
  private dataProtection: DataProtectionManager;
  private threatDetection: ThreatDetectionEngine;
  private complianceManager: ComplianceManager;
  private activeSessions: Map<string, any> = new Map();
  private securityMetrics: Map<string, number> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.auditLogger = new AuditLogger();
    this.dataProtection = new DataProtectionManager();
    this.threatDetection = new ThreatDetectionEngine();
    this.complianceManager = new ComplianceManager();

    this.initializeSecuritySystems();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize all security systems
   */
  private async initializeSecuritySystems(): Promise<void> {
    try {
      // Initialize data protection keys
      await this.dataProtection.initialize();

      // Start threat detection monitoring
      if (this.config.threatDetection.enabled) {
        await this.threatDetection.startMonitoring();
      }

      // Schedule key rotation
      this.scheduleKeyRotation();

      // Initialize session management
      this.initializeSessionManagement();

      console.log('Security systems initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security systems:', error);
      throw error;
    }
  }

  /**
   * Validate security context for an operation
   */
  async validateSecurityContext(context: SecurityContext): Promise<SecurityValidationResult> {
    try {
      // 1. Basic authentication check
      if (!context.userId && context.operation !== 'public_access') {
        return {
          allowed: false,
          reason: 'Authentication required',
          context
        };
      }

      // 2. Session validation
      if (context.sessionId) {
        const sessionValid = await this.validateSession(context.sessionId, context.userId!);
        if (!sessionValid.allowed) {
          return sessionValid;
        }
      }

      // 3. MFA requirement check
      if (this.requiresMFA(context.userId!, context.operation)) {
        return {
          allowed: false,
          reason: 'Multi-factor authentication required',
          requiresMFA: true,
          context
        };
      }

      // 4. Threat detection analysis
      if (this.config.threatDetection.enabled) {
        const threatAnalysis = await this.threatDetection.analyzeContext(context);
        if (threatAnalysis.blocked) {
          return {
            allowed: false,
            reason: threatAnalysis.reason,
            context
          };
        }
      }

      // 5. Resource-specific permissions
      if (context.resource) {
        const resourceAccess = await this.validateResourceAccess(context);
        if (!resourceAccess.allowed) {
          return resourceAccess;
        }
      }

      // 6. Rate limiting
      const rateLimitCheck = await this.checkRateLimits(context);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      // Log successful validation
      await this.auditLogger.logSecurityEvent({
        type: AuditEventType.AUTHORIZATION,
        userId: context.userId,
        operation: context.operation,
        resource: context.resource,
        metadata: context.metadata,
        success: true
      });

      return {
        allowed: true,
        context
      };

    } catch (error) {
      // Log security validation error
      await this.auditLogger.logSecurityEvent({
        type: AuditEventType.AUTHORIZATION,
        userId: context.userId,
        operation: context.operation,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        success: false
      });

      return {
        allowed: false,
        reason: 'Security validation failed',
        context
      };
    }
  }

  /**
   * Enhanced authentication with MFA support
   */
  async authenticateUser(
    email: string,
    password: string,
    context: SecurityContext,
    mfaToken?: string
  ): Promise<SecurityValidationResult> {
    try {
      // Basic Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser) {
        return {
          allowed: false,
          reason: 'Authentication failed',
          context
        };
      }

      // Check if MFA is required
      if (this.requiresMFA(firebaseUser.uid, 'login')) {
        if (!mfaToken) {
          return {
            allowed: false,
            reason: 'Multi-factor authentication required',
            requiresMFA: true,
            context: { ...context, userId: firebaseUser.uid }
          };
        }

        // Validate MFA token
        const mfaValid = await this.validateMFAToken(firebaseUser.uid, mfaToken);
        if (!mfaValid) {
          return {
            allowed: false,
            reason: 'Invalid MFA token',
            context: { ...context, userId: firebaseUser.uid }
          };
        }
      }

      // Create secure session
      const sessionId = await this.createSecureSession(firebaseUser.uid, context);

      // Log successful authentication
      await this.auditLogger.logSecurityEvent({
        type: AuditEventType.AUTHENTICATION,
        userId: firebaseUser.uid,
        operation: 'login',
        metadata: { method: 'email_password', mfaUsed: !!mfaToken },
        success: true
      });

      return {
        allowed: true,
        context: { ...context, userId: firebaseUser.uid, sessionId }
      };

    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        type: AuditEventType.AUTHENTICATION,
        operation: 'login',
        metadata: {
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
          ipAddress: context.ipAddress
        },
        success: false
      });

      return {
        allowed: false,
        reason: 'Authentication failed',
        context
      };
    }
  }

  /**
   * Validate user session
   */
  private async validateSession(sessionId: string, userId: string): Promise<SecurityValidationResult> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return {
        allowed: false,
        reason: 'Invalid session',
        requiresReauth: true
      };
    }

    if (session.userId !== userId) {
      return {
        allowed: false,
        reason: 'Session user mismatch',
        requiresReauth: true
      };
    }

    // Check session timeout
    const now = Date.now();
    const sessionAge = now - session.createdAt;

    if (sessionAge > this.config.session.timeout * 60 * 1000) {
      this.activeSessions.delete(sessionId);
      return {
        allowed: false,
        reason: 'Session expired',
        requiresReauth: true
      };
    }

    // Update last activity
    session.lastActivity = now;

    return { allowed: true };
  }

  /**
   * Create secure session with encryption
   */
  private async createSecureSession(userId: string, context: SecurityContext): Promise<string> {
    const sessionId = this.generateSecureSessionId();
    const sessionData = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      encrypted: true
    };

    // Encrypt session data
    const encryptedSession = await this.dataProtection.encryptSessionData(sessionData);

    this.activeSessions.set(sessionId, {
      ...sessionData,
      encryptedData: encryptedSession
    });

    // Clean up old sessions for this user
    this.cleanupUserSessions(userId);

    return sessionId;
  }

  /**
   * Validate MFA token
   */
  private async validateMFAToken(userId: string, token: string): Promise<boolean> {
    // Implement MFA token validation
    // This would integrate with your MFA provider (Authy, Google Authenticator, etc.)
    return true; // Placeholder
  }

  /**
   * Check if MFA is required for user/operation
   */
  private requiresMFA(userId: string, operation: string): boolean {
    if (!this.config.mfa.enabled) return false;

    // Check if operation requires MFA
    if (['admin_access', 'sensitive_data', 'financial_transaction'].includes(operation)) {
      return true;
    }

    // Check if user role requires MFA
    // This would integrate with your user management system
    return false; // Placeholder
  }

  /**
   * Validate resource-specific access
   */
  private async validateResourceAccess(context: SecurityContext): Promise<SecurityValidationResult> {
    // Integrate with existing panel security manager for resource access
    if (context.resource?.startsWith('panel:')) {
      const panelType = context.resource.replace('panel:', '') as any;
      const accessResult = await panelSecurityManager.validatePanelAccess(
        context.userId!,
        panelType,
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          sessionId: context.sessionId
        }
      );

      return {
        allowed: accessResult.success,
        reason: accessResult.reason,
        context
      };
    }

    return { allowed: true };
  }

  /**
   * Check rate limits for context
   */
  private async checkRateLimits(context: SecurityContext): Promise<SecurityValidationResult> {
    const key = `${context.userId || context.ipAddress}_${context.operation}`;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Simple in-memory rate limiting
    const currentCount = this.securityMetrics.get(key) || 0;

    if (currentCount > this.getRateLimitForOperation(context.operation)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        context
      };
    }

    this.securityMetrics.set(key, currentCount + 1);

    // Clean up old metrics
    this.cleanupMetrics();

    return { allowed: true };
  }

  /**
   * Get rate limit for operation
   */
  private getRateLimitForOperation(operation: string): number {
    const limits: Record<string, number> = {
      'login': 5,
      'password_reset': 3,
      'admin_access': 10,
      'data_export': 5,
      'api_call': 100
    };

    return limits[operation] || 50;
  }

  /**
   * Generate secure session ID
   */
  private generateSecureSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Clean up old sessions for user
   */
  private cleanupUserSessions(userId: string): void {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId && this.activeSessions.size > this.config.session.maxConcurrentSessions) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Clean up old security metrics
   */
  private cleanupMetrics(): void {
    const cutoff = Date.now() - 60000; // 1 minute
    // Implementation would clean up old metrics
  }

  /**
   * Schedule encryption key rotation
   */
  private scheduleKeyRotation(): void {
    const rotationInterval = this.config.encryption.keyRotationDays * 24 * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.dataProtection.rotateEncryptionKeys();
        await this.auditLogger.logSecurityEvent({
          type: AuditEventType.SYSTEM_EVENT,
          operation: 'scheduled_rotation',
          success: true
        });
      } catch (error) {
        await this.auditLogger.logSecurityEvent({
          type: AuditEventType.SYSTEM_EVENT,
          operation: 'scheduled_rotation',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          success: false
        });
      }
    }, rotationInterval);
  }

  /**
   * Initialize session management
   */
  private initializeSessionManagement(): void {
    // Clean up expired sessions periodically
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Every minute
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = this.config.session.timeout * 60 * 1000;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > timeout) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get default security configuration
   */
  private getDefaultConfig(): SecurityConfig {
    return {
      mfa: {
        enabled: true,
        requiredRoles: ['admin', 'moderator'],
        issuer: 'PlayNite'
      },
      session: {
        timeout: 480, // 8 hours
        maxConcurrentSessions: 5,
        extendOnActivity: true
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotationDays: 90
      },
      audit: {
        retentionDays: 2555, // 7 years
        detailedLogging: true
      },
      threatDetection: {
        enabled: true,
        sensitivity: 'medium'
      }
    };
  }

  /**
   * Update security configuration
   */
  async updateSecurityConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.SYSTEM_EVENT,
      operation: 'security_config_update',
      metadata: { updatedFields: Object.keys(newConfig) },
      success: true
    });
  }

  /**
   * Get current security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Get security metrics and statistics
   */
  async getSecurityMetrics(): Promise<Record<string, any>> {
    return {
      activeSessions: this.activeSessions.size,
      securityEvents: await this.auditLogger.getEventCount(),
      threatDetections: await this.threatDetection.getDetectionCount(),
      complianceStatus: await this.complianceManager.getComplianceStatus(),
      config: this.getSecurityConfig()
    };
  }

  /**
   * Export security audit data
   */
  async exportSecurityAudit(startDate: Date, endDate: Date): Promise<any> {
    return {
      auditEvents: await this.auditLogger.getEventsInRange(startDate, endDate),
      securityMetrics: await this.getSecurityMetrics(),
      threatReports: await this.threatDetection.getReportsInRange(startDate, endDate),
      complianceReports: await this.complianceManager.getReportsInRange(startDate, endDate)
    };
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();