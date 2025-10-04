import {
  PanelType,
  UserRole,
  Permission,
  AuditLogEntry,
  PanelAccessRequest,
  AccessLevel
} from '../types';
import { accessControlManager } from '../managers/AccessControlManager';

/**
 * Supporting interfaces and types
 */
interface AccessContext {
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

interface AccessValidationResult {
  success: boolean;
  reason: string;
  context: AccessContext;
  timestamp: Date;
  error: string | null;
}

interface AccessAttempt {
  userId: string;
  panelType: PanelType;
  success: boolean;
  timestamp: Date;
  context: AccessContext;
}

interface RateLimiter {
  attempts: Array<{ timestamp: Date; success: boolean }>;
  windowStart: number;
  windowSize: number;
  maxAttempts: number;
}

interface SecurityEvent {
  type: string;
  userId: string;
  panelType?: PanelType;
  context: AccessContext;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface SecurityAlert {
  id: string;
  type: string;
  userId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  timestamp: Date;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  metadata?: Record<string, any>;
}

interface SecurityStatistics {
  totalEvents: number;
  successfulAccess: number;
  failedAccess: number;
  securityAlerts: number;
  eventsByType: Record<string, number>;
  eventsByPanel: Record<PanelType, number>;
  timeRange?: { start: Date; end: Date };
}

/**
 * PanelSecurityManager
 * Handles security aspects of panel management including access controls,
 * audit logging, and security monitoring
 */
export class PanelSecurityManager {
  private securityEvents: SecurityEvent[] = [];
  private accessAttempts: Map<string, AccessAttempt[]> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private securityAlerts: SecurityAlert[] = [];

  /**
   * Validate panel access with comprehensive security checks
   */
  async validatePanelAccess(
    userId: string,
    panelType: PanelType,
    context: AccessContext
  ): Promise<AccessValidationResult> {
    const startTime = Date.now();

    try {
      // 1. Basic permission check
      if (!accessControlManager.canAccessPanel(userId, panelType)) {
        return this.createValidationResult(false, 'INSUFFICIENT_PERMISSIONS', context);
      }

      // 2. Rate limiting check
      if (this.isRateLimited(userId, panelType, context)) {
        return this.createValidationResult(false, 'RATE_LIMITED', context);
      }

      // 3. Context validation
      if (!this.validateAccessContext(context)) {
        return this.createValidationResult(false, 'INVALID_CONTEXT', context);
      }

      // 4. Security policy check
      if (!(await this.checkSecurityPolicies(userId, panelType, context))) {
        return this.createValidationResult(false, 'SECURITY_POLICY_VIOLATION', context);
      }

      // 5. Record successful access attempt
      this.recordAccessAttempt(userId, panelType, true, context);

      // 6. Log successful access
      this.logSecurityEvent({
        type: 'ACCESS_GRANTED',
        userId,
        panelType,
        context,
        timestamp: new Date(),
        success: true
      });

      return this.createValidationResult(true, 'ACCESS_GRANTED', context);

    } catch (error) {
      // Log security error
      this.logSecurityEvent({
        type: 'ACCESS_ERROR',
        userId,
        panelType,
        context,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.createValidationResult(false, 'SECURITY_ERROR', context, error);
    }
  }

  /**
   * Record and analyze access attempts for security monitoring
   */
  recordAccessAttempt(
    userId: string,
    panelType: PanelType,
    success: boolean,
    context: AccessContext
  ): void {
    const attempt: AccessAttempt = {
      userId,
      panelType,
      success,
      timestamp: new Date(),
      context
    };

    // Store attempt
    if (!this.accessAttempts.has(userId)) {
      this.accessAttempts.set(userId, []);
    }

    const userAttempts = this.accessAttempts.get(userId)!;
    userAttempts.push(attempt);

    // Keep only last 100 attempts per user
    if (userAttempts.length > 100) {
      userAttempts.splice(0, userAttempts.length - 100);
    }

    // Check for suspicious patterns
    this.analyzeAccessPatterns(userId, userAttempts);
  }

  /**
   * Implement rate limiting for panel access
   */
  private isRateLimited(userId: string, panelType: PanelType, context: AccessContext): boolean {
    const key = `${userId}_${panelType}`;
    const limiter = this.rateLimiters.get(key);

    if (!limiter) {
      // Create new rate limiter
      const newLimiter: RateLimiter = {
        attempts: [],
        windowStart: Date.now(),
        windowSize: 60000, // 1 minute window
        maxAttempts: this.getMaxAttemptsForPanel(panelType)
      };
      this.rateLimiters.set(key, newLimiter);
      return false;
    }

    // Clean old attempts outside the window
    const windowStart = Date.now() - limiter.windowSize;
    limiter.attempts = limiter.attempts.filter(a => a.timestamp.getTime() > windowStart);

    // Check if limit exceeded
    if (limiter.attempts.length >= limiter.maxAttempts) {
      // Log rate limit violation
      this.logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        userId,
        panelType,
        context,
        timestamp: new Date(),
        success: false
      });

      return true;
    }

    // Record this attempt
    limiter.attempts.push({
      timestamp: new Date(),
      success: true // We'll update this after validation
    });

    return false;
  }

  /**
   * Validate access context (IP, user agent, etc.)
   */
  private validateAccessContext(context: AccessContext): boolean {
    // Basic context validation
    if (!context.ipAddress || !context.userAgent) {
      return false;
    }

    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      return false;
    }

    // Check for VPN/Proxy indicators (basic check)
    if (this.isLikelyVPN(context.ipAddress)) {
      // This is a basic check - in production, you'd use a proper VPN detection service
      return false;
    }

    return true;
  }

  /**
   * Check security policies for the access attempt
   */
  private async checkSecurityPolicies(
    userId: string,
    panelType: PanelType,
    context: AccessContext
  ): Promise<boolean> {
    // 1. Time-based access control
    if (!this.isAllowedAccessTime(panelType)) {
      return false;
    }

    // 2. Location-based restrictions (if enabled)
    if (await this.checkLocationRestrictions(userId, context)) {
      return false;
    }

    // 3. Device-based restrictions
    if (this.checkDeviceRestrictions(userId, context)) {
      return false;
    }

    // 4. Session-based checks
    if (!(await this.validateUserSession(userId, context))) {
      return false;
    }

    return true;
  }

  /**
   * Analyze access patterns for suspicious behavior
   */
  private analyzeAccessPatterns(userId: string, attempts: AccessAttempt[]): void {
    const recentAttempts = attempts.filter(a =>
      a.timestamp.getTime() > Date.now() - 300000 // Last 5 minutes
    );

    // Check for rapid successive failures
    const recentFailures = recentAttempts.filter(a => !a.success);
    if (recentFailures.length >= 5) {
      this.createSecurityAlert({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'SUSPICIOUS_ACTIVITY',
        userId,
        severity: 'HIGH',
        description: 'Multiple failed access attempts detected',
        timestamp: new Date(),
        metadata: {
          failureCount: recentFailures.length,
          timeWindow: 300000
        }
      });
    }

    // Check for unusual access times
    const unusualHours = attempts.filter(a => {
      const hour = a.timestamp.getHours();
      return hour < 6 || hour > 22; // Outside normal business hours
    });

    if (unusualHours.length > attempts.length * 0.3) { // More than 30% of attempts
      this.createSecurityAlert({
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'UNUSUAL_ACCESS_TIME',
        userId,
        severity: 'MEDIUM',
        description: 'Access attempts outside normal hours',
        timestamp: new Date(),
        metadata: {
          unusualAttempts: unusualHours.length,
          totalAttempts: attempts.length
        }
      });
    }
  }

  /**
   * Log security events for audit trail
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    // Keep only last 5000 events
    if (this.securityEvents.length > 5000) {
      this.securityEvents = this.securityEvents.slice(-2500);
    }

    // In a real application, this would also write to persistent storage
    console.log('Security Event:', event);
  }

  /**
   * Create security alert for suspicious activity
   */
  private createSecurityAlert(alert: SecurityAlert): void {
    this.securityAlerts.push(alert);

    // In a real application, this would trigger notifications to administrators
    console.warn('Security Alert:', alert);

    // Log as security event
    this.logSecurityEvent({
      type: 'SECURITY_ALERT',
      userId: alert.userId,
      panelType: undefined,
      context: {
        ipAddress: 'system',
        userAgent: 'system'
      },
      timestamp: alert.timestamp,
      success: false,
      metadata: {
        alertType: alert.type,
        severity: alert.severity,
        description: alert.description
      }
    });
  }

  /**
   * Get security statistics and metrics
   */
  getSecurityStats(timeRange?: { start: Date; end: Date }): SecurityStatistics {
    let events = this.securityEvents;

    if (timeRange) {
      events = events.filter(e =>
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const totalEvents = events.length;
    const successfulAccess = events.filter(e => e.success).length;
    const failedAccess = totalEvents - successfulAccess;
    const securityAlerts = this.securityAlerts.length;

    // Group by event type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by panel type
    const eventsByPanel = events.reduce((acc, event) => {
      if (event.panelType) {
        acc[event.panelType] = (acc[event.panelType] || 0) + 1;
      }
      return acc;
    }, {} as Record<PanelType, number>);

    return {
      totalEvents,
      successfulAccess,
      failedAccess,
      securityAlerts,
      eventsByType,
      eventsByPanel,
      timeRange
    };
  }

  /**
   * Get active security alerts
   */
  getActiveAlerts(minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'): SecurityAlert[] {
    return this.securityAlerts.filter(alert => {
      const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      return severityLevels[alert.severity] >= severityLevels[minSeverity];
    });
  }

  /**
   * Resolve a security alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution?: string): boolean {
    const alertIndex = this.securityAlerts.findIndex(a => a.id === alertId);
    if (alertIndex === -1) return false;

    const alert = this.securityAlerts[alertIndex];
    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    return true;
  }

  /**
   * Clean up old security data
   */
  cleanupSecurityData(maxAge: number = 86400000): number { // 24 hours default
    const cutoffTime = new Date(Date.now() - maxAge);

    const initialEventCount = this.securityEvents.length;
    const initialAlertCount = this.securityAlerts.length;

    this.securityEvents = this.securityEvents.filter(e => e.timestamp > cutoffTime);
    this.securityAlerts = this.securityAlerts.filter(a => a.timestamp > cutoffTime);

    // Clean up old access attempts
    for (const [userId, attempts] of this.accessAttempts.entries()) {
      const filteredAttempts = attempts.filter(a => a.timestamp.getTime() > cutoffTime.getTime());
      if (filteredAttempts.length === 0) {
        this.accessAttempts.delete(userId);
      } else {
        this.accessAttempts.set(userId, filteredAttempts);
      }
    }

    const cleanedEvents = initialEventCount - this.securityEvents.length;
    const cleanedAlerts = initialAlertCount - this.securityAlerts.length;

    return cleanedEvents + cleanedAlerts;
  }

  /**
   * Private helper methods
   */
  private createValidationResult(
    success: boolean,
    reason: string,
    context: AccessContext,
    error?: any
  ): AccessValidationResult {
    return {
      success,
      reason,
      context,
      timestamp: new Date(),
      error: error?.message || null
    };
  }

  private getMaxAttemptsForPanel(panelType: PanelType): number {
    // Different panels have different rate limits
    const limits: Record<PanelType, number> = {
      [PanelType.ADMIN_DASHBOARD]: 30, // 30 attempts per minute
      [PanelType.USER_SETTINGS]: 60,  // 60 attempts per minute
      [PanelType.MODERATION_QUEUE]: 45, // 45 attempts per minute
      [PanelType.ANALYTICS_DASHBOARD]: 20, // 20 attempts per minute
      [PanelType.CONTENT_MANAGEMENT]: 40, // 40 attempts per minute
      [PanelType.USER_MANAGEMENT]: 25, // 25 attempts per minute
      [PanelType.SYSTEM_SETTINGS]: 15, // 15 attempts per minute
      [PanelType.AUDIT_LOGS]: 20 // 20 attempts per minute
    };
    return limits[panelType] || 30;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    // Basic check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /automation/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private isLikelyVPN(ipAddress: string): boolean {
    // Basic VPN detection - in production, use a proper service
    // This is a simplified check
    return false; // Placeholder
  }

  private isAllowedAccessTime(panelType: PanelType): boolean {
    // Check if current time is within allowed access hours
    const now = new Date();
    const hour = now.getHours();

    // Admin panels might have restricted hours
    if (panelType === PanelType.ADMIN_DASHBOARD || panelType === PanelType.SYSTEM_SETTINGS) {
      return hour >= 8 && hour <= 18; // Business hours only
    }

    return true; // Other panels allow 24/7 access
  }

  private async checkLocationRestrictions(userId: string, context: AccessContext): Promise<boolean> {
    // Placeholder for location-based restrictions
    // In production, this would check against allowed countries/regions
    return false;
  }

  private checkDeviceRestrictions(userId: string, context: AccessContext): boolean {
    // Placeholder for device-based restrictions
    // Could check for known device fingerprints, etc.
    return false;
  }

  private async validateUserSession(userId: string, context: AccessContext): Promise<boolean> {
    // Placeholder for session validation
    // Could check session validity, concurrent sessions, etc.
    return true;
  }
}

/**
 * Supporting interfaces and types
 */
interface AccessContext {
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

interface AccessValidationResult {
  success: boolean;
  reason: string;
  context: AccessContext;
  timestamp: Date;
  error: string | null;
}

interface AccessAttempt {
  userId: string;
  panelType: PanelType;
  success: boolean;
  timestamp: Date;
  context: AccessContext;
}

interface RateLimiter {
  attempts: Array<{ timestamp: Date; success: boolean }>;
  windowStart: number;
  windowSize: number;
  maxAttempts: number;
}

interface SecurityEvent {
  type: string;
  userId: string;
  panelType?: PanelType;
  context: AccessContext;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface SecurityAlert {
  id: string;
  type: string;
  userId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  timestamp: Date;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  metadata?: Record<string, any>;
}

interface SecurityStatistics {
  totalEvents: number;
  successfulAccess: number;
  failedAccess: number;
  securityAlerts: number;
  eventsByType: Record<string, number>;
  eventsByPanel: Record<PanelType, number>;
  timeRange?: { start: Date; end: Date };
}

// Singleton instance
export const panelSecurityManager = new PanelSecurityManager();