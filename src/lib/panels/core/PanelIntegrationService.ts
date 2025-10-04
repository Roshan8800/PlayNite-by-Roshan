import { UserRole, Permission, PanelType, UserPermissions } from '../types';
import { accessControlManager } from '../managers/AccessControlManager';
import { panelManager } from './PanelManager';
import { panelSecurityManager } from '../security/PanelSecurityManager';
import { panelAnalyticsManager } from '../analytics/PanelAnalyticsManager';
import { authService, AuthUser } from '../../auth';
import { RuleEngine } from '../../rules/core/RuleEngine';

/**
 * PanelIntegrationService
 * Integrates panel management system with existing auth, rule engine, and behavior systems
 */
export class PanelIntegrationService {
  private ruleEngine: RuleEngine;
  private isInitialized = false;

  constructor(ruleEngine?: RuleEngine) {
    this.ruleEngine = ruleEngine || new RuleEngine();
    this.initializeIntegration();
  }

  /**
   * Initialize integration with existing systems
   */
  private async initializeIntegration(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Set up auth state listener
      this.setupAuthIntegration();

      // 2. Register panel-specific rules
      this.registerPanelRules();

      // 3. Set up behavior system integration
      this.setupBehaviorIntegration();

      // 4. Initialize cleanup routines
      this.setupCleanupRoutines();

      this.isInitialized = true;
      console.log('Panel integration service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize panel integration:', error);
      throw error;
    }
  }

  /**
   * Set up integration with authentication system
   */
  private setupAuthIntegration(): void {
    // Listen to auth state changes
    authService.onAuthStateChange(async (user: AuthUser | null) => {
      if (user) {
        await this.handleUserLogin(user);
      } else {
        this.handleUserLogout();
      }
    });
  }

  /**
   * Handle user login and initialize panel permissions
   */
  private async handleUserLogin(user: AuthUser): Promise<void> {
    try {
      // Get user role from auth system or assign default
      const userRole = this.getUserRoleFromAuth(user);

      // Initialize user in access control manager
      const userPermissions = accessControlManager.initializeUser(
        user.uid,
        userRole,
        'system'
      );

      // Set up user-specific panel configurations
      await this.setupUserPanelConfiguration(user.uid, userPermissions);

      // Log successful login
      panelSecurityManager.recordAccessAttempt(
        user.uid,
        PanelType.USER_SETTINGS,
        true,
        {
          ipAddress: '127.0.0.1', // In real app, get from request
          userAgent: navigator.userAgent
        }
      );

      console.log(`Panel permissions initialized for user: ${user.uid}`);

    } catch (error) {
      console.error('Failed to handle user login for panels:', error);
    }
  }

  /**
   * Handle user logout and cleanup panel sessions
   */
  private handleUserLogout(): void {
    // Close all active panel sessions for the user
    // Note: In a real app, you'd need to track the current user ID
    // For now, this is a placeholder for cleanup logic

    console.log('User logged out, panel sessions cleaned up');
  }

  /**
   * Register panel-specific rules in the rule engine
   */
  private registerPanelRules(): void {
    // Rule: Users must have appropriate role for panel access
    this.ruleEngine.registerRule({
      id: 'panel_access_role_requirement',
      name: 'Panel Access Role Requirement',
      description: 'Users must have appropriate role to access panels',
      category: 'security' as any,
      priority: 100,
      enabled: true,
      conditions: [
        {
          field: 'action.type',
          operator: 'equals' as any,
          value: 'panel_access',
          logicalOperator: 'AND' as any
        }
      ],
      actions: [
        {
          type: 'validate' as any,
          target: 'user.role',
          value: { required: true }
        }
      ]
    });

    // Rule: Panel access must be logged for audit
    this.ruleEngine.registerRule({
      id: 'panel_access_audit_logging',
      name: 'Panel Access Audit Logging',
      description: 'All panel access attempts must be logged',
      category: 'audit' as any,
      priority: 90,
      enabled: true,
      conditions: [
        {
          field: 'action.type',
          operator: 'equals' as any,
          value: 'panel_access',
          logicalOperator: 'AND' as any
        }
      ],
      actions: [
        {
          type: 'log' as any,
          target: 'panel_access',
          config: { level: 'info', message: 'Panel access attempt' }
        }
      ]
    });

    // Rule: High-frequency panel access should be monitored
    this.ruleEngine.registerRule({
      id: 'panel_access_frequency_monitoring',
      name: 'Panel Access Frequency Monitoring',
      description: 'Monitor for unusually high panel access frequency',
      category: 'security' as any,
      priority: 80,
      enabled: true,
      conditions: [
        {
          field: 'accessCount',
          operator: 'greater_than' as any,
          value: 50,
          logicalOperator: 'AND' as any
        },
        {
          field: 'timeWindow',
          operator: 'less_than' as any,
          value: 300000, // 5 minutes
          logicalOperator: 'AND' as any
        }
      ],
      actions: [
        {
          type: 'log' as any,
          target: 'security_monitoring',
          config: {
            level: 'warning',
            message: 'High frequency panel access detected'
          }
        }
      ]
    });
  }

  /**
   * Set up integration with behavior systems
   */
  private setupBehaviorIntegration(): void {
    // Monitor panel usage patterns for behavior analysis
    setInterval(() => {
      this.analyzePanelUsagePatterns();
    }, 60000); // Run every minute

    // Update user behavior profiles based on panel interactions
    setInterval(() => {
      this.updateBehaviorProfiles();
    }, 300000); // Run every 5 minutes
  }

  /**
   * Set up cleanup routines for panel data
   */
  private setupCleanupRoutines(): void {
    // Clean up old panel sessions daily
    setInterval(() => {
      const cleanedSessions = panelManager.cleanupInactiveSessions(24 * 60 * 60 * 1000); // 24 hours
      if (cleanedSessions > 0) {
        console.log(`Cleaned up ${cleanedSessions} inactive panel sessions`);
      }
    }, 24 * 60 * 60 * 1000); // Run daily

    // Clean up old security data weekly
    setInterval(() => {
      const cleanedSecurity = panelSecurityManager.cleanupSecurityData(7 * 24 * 60 * 60 * 1000); // 7 days
      if (cleanedSecurity > 0) {
        console.log(`Cleaned up ${cleanedSecurity} old security records`);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Run weekly

    // Clean up expired permissions daily
    setInterval(() => {
      const cleanedPermissions = accessControlManager.cleanupExpiredPermissions();
      if (cleanedPermissions > 0) {
        console.log(`Cleaned up ${cleanedPermissions} expired permissions`);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Set up user-specific panel configuration
   */
  private async setupUserPanelConfiguration(userId: string, userPermissions: UserPermissions): Promise<void> {
    // Customize panel configurations based on user role and permissions
    for (const panelType of userPermissions.panelAccess) {
      const config = panelManager.getPanelConfiguration(panelType);
      if (config) {
        // Apply user-specific customizations
        this.applyUserCustomizations(config, userPermissions);
        panelManager.updatePanelConfiguration(panelType, config);
      }
    }
  }

  /**
   * Apply user-specific customizations to panel configuration
   */
  private applyUserCustomizations(config: any, userPermissions: UserPermissions): void {
    // Customize based on user role
    switch (userPermissions.role) {
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        config.settings.showAdvancedOptions = true;
        config.settings.enableDebugMode = true;
        break;

      case UserRole.MODERATOR:
        config.settings.moderationTools = true;
        config.settings.quickActions = ['flag', 'suspend', 'review'];
        break;

      case UserRole.CONTENT_CREATOR:
        config.settings.contentTools = true;
        config.settings.analyticsEnabled = true;
        break;

      default:
        // Standard user customizations
        config.settings.compactMode = true;
        break;
    }

    // Customize based on permissions
    if (userPermissions.permissions.includes(Permission.VIEW_ANALYTICS)) {
      config.settings.analyticsEnabled = true;
    }

    if (userPermissions.permissions.includes(Permission.MANAGE_USERS)) {
      config.settings.userManagementEnabled = true;
    }
  }

  /**
   * Analyze panel usage patterns for insights
   */
  private analyzePanelUsagePatterns(): void {
    try {
      // Get usage statistics for all panels
      const insights = panelManager.getPanelUsageStats();

      // Log significant patterns
      if (insights.totalSessions > 100) {
        console.log('High panel usage detected:', {
          totalSessions: insights.totalSessions,
          avgSessionDuration: insights.averageSessionDuration,
          topActions: insights.mostUsedActions.slice(0, 3)
        });
      }

      // Check for performance issues
      if (insights.performanceMetrics.errorRate > 0.05) {
        console.warn('High error rate detected in panel usage:', {
          errorRate: insights.performanceMetrics.errorRate,
          avgLoadTime: insights.performanceMetrics.loadTime
        });
      }

    } catch (error) {
      console.error('Failed to analyze panel usage patterns:', error);
    }
  }

  /**
   * Update user behavior profiles based on panel interactions
   */
  private updateBehaviorProfiles(): void {
    try {
      // Get all users with panel activity
      const activeUsers = new Set<string>();

      // Collect user activity data from all managers
      // This would typically query a database in a real application

      for (const userId of activeUsers) {
        const behaviorProfile = panelAnalyticsManager.getUserBehaviorProfile(userId);
        if (behaviorProfile) {
          // Update behavior profile with latest insights
          console.log(`Updated behavior profile for user: ${userId}`, {
            totalSessions: behaviorProfile.totalSessions,
            avgEngagement: behaviorProfile.avgEngagementLevel,
            preferredPanels: Array.from(behaviorProfile.preferredPanels)
          });
        }
      }

    } catch (error) {
      console.error('Failed to update behavior profiles:', error);
    }
  }

  /**
   * Get user role from auth user object
   */
  private getUserRoleFromAuth(user: AuthUser): UserRole {
    // In a real application, this would check user claims, database, or external service
    // For now, return a default role based on email or other criteria

    if (user.email?.includes('admin')) {
      return UserRole.ADMIN;
    }

    if (user.email?.includes('moderator')) {
      return UserRole.MODERATOR;
    }

    // Default to regular user
    return UserRole.USER;
  }

  /**
   * Validate panel access using rule engine
   */
  async validatePanelAccessWithRules(
    userId: string,
    panelType: PanelType,
    context: any
  ): Promise<boolean> {
    try {
      // Create rule context for validation
      const ruleContext = {
        user: { id: userId },
        panel: { type: panelType },
        action: { type: 'panel_access' },
        data: context,
        timestamp: new Date()
      };

      // Execute panel access rules
      const results = await this.ruleEngine.executeRules(ruleContext, 'security' as any);

      // Check if all rules passed
      return results.every(result => result.success && result.result.isValid);

    } catch (error) {
      console.error('Rule-based panel access validation failed:', error);
      return false;
    }
  }

  /**
   * Get integrated panel statistics
   */
  getIntegratedStats(): {
    panelStats: any;
    securityStats: any;
    accessControlStats: any;
    ruleEngineStats: any;
  } {
    return {
      panelStats: panelManager.getPanelUsageStats(),
      securityStats: panelSecurityManager.getSecurityStats(),
      accessControlStats: accessControlManager.getAccessControlStats(),
      ruleEngineStats: this.ruleEngine.getStats()
    };
  }

  /**
   * Health check for panel integration
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    issues: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    try {
      // Check auth integration
      checks.authIntegration = !!authService.getCurrentUser();
    } catch (error) {
      checks.authIntegration = false;
      issues.push('Auth integration check failed');
    }

    try {
      // Check rule engine
      checks.ruleEngine = this.ruleEngine.getRules().length > 0;
    } catch (error) {
      checks.ruleEngine = false;
      issues.push('Rule engine check failed');
    }

    try {
      // Check panel managers
      checks.panelManagers = panelManager.getAvailablePanels('test-user').length >= 0;
    } catch (error) {
      checks.panelManagers = false;
      issues.push('Panel managers check failed');
    }

    try {
      // Check security manager
      checks.securityManager = Object.keys(panelSecurityManager.getSecurityStats()).length > 0;
    } catch (error) {
      checks.securityManager = false;
      issues.push('Security manager check failed');
    }

    const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).length;
    const status = failedChecks === 0 ? 'healthy' : failedChecks <= 2 ? 'degraded' : 'unhealthy';

    return {
      status,
      checks,
      issues
    };
  }
}

// Singleton instance
export const panelIntegrationService = new PanelIntegrationService();