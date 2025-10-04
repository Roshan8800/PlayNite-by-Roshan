import {
  PanelType,
  PanelConfiguration,
  PanelLayout,
  PanelSection,
  ResponsiveConfig,
  UserRole,
  Permission,
  PanelAnalytics,
  PanelAction,
  PerformanceMetrics,
  PANEL_REQUIREMENTS
} from '../types';
import { accessControlManager } from '../managers/AccessControlManager';

/**
 * PanelManager
 * Centralized manager for panel control, configuration, and state management
 * Handles panel lifecycle, user interactions, and performance monitoring
 */
export class PanelManager {
  private panelConfigurations: Map<PanelType, PanelConfiguration> = new Map();
  private activePanels: Map<string, { userId: string; panelType: PanelType; startTime: Date }> = new Map();
  private panelAnalytics: Map<string, PanelAnalytics> = new Map();
  private panelCache: Map<PanelType, { data: any; timestamp: Date; ttl: number }> = new Map();

  constructor() {
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize default panel configurations
   */
  private initializeDefaultConfigurations(): void {
    for (const panelType of Object.values(PanelType)) {
      const requirements = PANEL_REQUIREMENTS[panelType];
      const config: PanelConfiguration = {
        panelType,
        title: this.getPanelTitle(panelType),
        description: this.getPanelDescription(panelType),
        requiredRole: requirements.requiredRole,
        requiredPermissions: requirements.requiredPermissions,
        isEnabled: true,
        settings: this.getDefaultPanelSettings(panelType),
        layout: this.getDefaultPanelLayout(panelType)
      };

      this.panelConfigurations.set(panelType, config);
    }
  }

  /**
   * Check if a user can access a panel
   */
  canAccessPanel(userId: string, panelType: PanelType): boolean {
    return accessControlManager.canAccessPanel(userId, panelType);
  }

  /**
   * Open a panel for a user
   */
  openPanel(userId: string, panelType: PanelType, sessionId?: string): boolean {
    if (!this.canAccessPanel(userId, panelType)) {
      return false;
    }

    const panelKey = sessionId || `${userId}_${panelType}_${Date.now()}`;
    const analytics: PanelAnalytics = {
      panelType,
      userId,
      sessionId: panelKey,
      startTime: new Date(),
      actions: [],
      performanceMetrics: {
        loadTime: 0,
        interactionLatency: 0,
        errorRate: 0,
        userSatisfaction: 0
      }
    };

    this.activePanels.set(panelKey, {
      userId,
      panelType,
      startTime: new Date()
    });

    this.panelAnalytics.set(panelKey, analytics);

    // Log panel access
    accessControlManager.getAuditLogs = () => []; // Placeholder for audit logging

    return true;
  }

  /**
   * Close a panel for a user
   */
  closePanel(sessionId: string): boolean {
    const activePanel = this.activePanels.get(sessionId);
    if (!activePanel) return false;

    const analytics = this.panelAnalytics.get(sessionId);
    if (analytics) {
      analytics.endTime = new Date();
      this.processPanelAnalytics(analytics);
    }

    this.activePanels.delete(sessionId);
    this.panelAnalytics.delete(sessionId);

    return true;
  }

  /**
   * Record a user action within a panel
   */
  recordAction(sessionId: string, action: string, metadata?: Record<string, any>): void {
    const analytics = this.panelAnalytics.get(sessionId);
    if (!analytics) return;

    const panelAction: PanelAction = {
      action,
      timestamp: new Date(),
      metadata
    };

    analytics.actions.push(panelAction);

    // Update performance metrics based on action
    this.updatePerformanceMetrics(analytics, action, metadata);
  }

  /**
   * Get panel configuration
   */
  getPanelConfiguration(panelType: PanelType): PanelConfiguration | null {
    return this.panelConfigurations.get(panelType) || null;
  }

  /**
   * Update panel configuration
   */
  updatePanelConfiguration(panelType: PanelType, updates: Partial<PanelConfiguration>): boolean {
    const config = this.panelConfigurations.get(panelType);
    if (!config) return false;

    Object.assign(config, updates);
    this.panelCache.delete(panelType); // Clear cache

    return true;
  }

  /**
   * Get panel layout for responsive design
   */
  getPanelLayout(panelType: PanelType, deviceType: 'mobile' | 'tablet' | 'desktop'): PanelSection[] {
    const config = this.panelConfigurations.get(panelType);
    if (!config) return [];

    const responsiveConfig = config.layout.responsive;
    let layoutConfig: { sections: string[]; layout: 'stack' | 'grid' };

    switch (deviceType) {
      case 'mobile':
        layoutConfig = responsiveConfig.mobile;
        break;
      case 'tablet':
        layoutConfig = responsiveConfig.tablet;
        break;
      case 'desktop':
        layoutConfig = responsiveConfig.desktop;
        break;
      default:
        layoutConfig = responsiveConfig.desktop;
    }

    return config.layout.sections.filter(section =>
      layoutConfig.sections.includes(section.id)
    );
  }

  /**
   * Get cached panel data
   */
  getCachedPanelData(panelType: PanelType): any | null {
    const cached = this.panelCache.get(panelType);
    if (!cached) return null;

    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.panelCache.delete(panelType);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached panel data
   */
  setCachedPanelData(panelType: PanelType, data: any, ttl: number = 300000): void { // 5 minutes default
    this.panelCache.set(panelType, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  /**
   * Get active panels for a user
   */
  getActivePanels(userId: string): Array<{ panelType: PanelType; startTime: Date; sessionId: string }> {
    return Array.from(this.activePanels.entries())
      .filter(([, panel]) => panel.userId === userId)
      .map(([sessionId, panel]) => ({
        panelType: panel.panelType,
        startTime: panel.startTime,
        sessionId
      }));
  }

  /**
   * Get panel analytics for a user
   */
  getPanelAnalytics(userId: string, panelType?: PanelType): PanelAnalytics[] {
    return Array.from(this.panelAnalytics.values())
      .filter(analytics =>
        analytics.userId === userId &&
        (!panelType || analytics.panelType === panelType)
      );
  }

  /**
   * Get panel usage statistics
   */
  getPanelUsageStats(panelType?: PanelType, timeRange?: { start: Date; end: Date }): {
    totalSessions: number;
    averageSessionDuration: number;
    mostUsedActions: Array<{ action: string; count: number }>;
    performanceMetrics: PerformanceMetrics;
  } {
    let analytics = Array.from(this.panelAnalytics.values());

    if (panelType) {
      analytics = analytics.filter(a => a.panelType === panelType);
    }

    if (timeRange) {
      analytics = analytics.filter(a =>
        a.startTime >= timeRange.start &&
        (!a.endTime || a.endTime <= timeRange.end)
      );
    }

    if (analytics.length === 0) {
      return {
        totalSessions: 0,
        averageSessionDuration: 0,
        mostUsedActions: [],
        performanceMetrics: {
          loadTime: 0,
          interactionLatency: 0,
          errorRate: 0,
          userSatisfaction: 0
        }
      };
    }

    const totalSessions = analytics.length;
    const completedSessions = analytics.filter(a => a.endTime);
    const totalDuration = completedSessions.reduce((sum, a) => {
      return sum + (a.endTime!.getTime() - a.startTime.getTime());
    }, 0);
    const averageSessionDuration = completedSessions.length > 0
      ? totalDuration / completedSessions.length
      : 0;

    // Count actions
    const actionCounts = new Map<string, number>();
    analytics.forEach(a => {
      a.actions.forEach(action => {
        actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
      });
    });

    const mostUsedActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average performance metrics
    const avgPerformanceMetrics: PerformanceMetrics = {
      loadTime: analytics.reduce((sum, a) => sum + a.performanceMetrics.loadTime, 0) / analytics.length,
      interactionLatency: analytics.reduce((sum, a) => sum + a.performanceMetrics.interactionLatency, 0) / analytics.length,
      errorRate: analytics.reduce((sum, a) => sum + a.performanceMetrics.errorRate, 0) / analytics.length,
      userSatisfaction: analytics.reduce((sum, a) => sum + (a.performanceMetrics.userSatisfaction || 0), 0) / analytics.length
    };

    return {
      totalSessions,
      averageSessionDuration,
      mostUsedActions,
      performanceMetrics: avgPerformanceMetrics
    };
  }

  /**
   * Enable or disable a panel
   */
  setPanelEnabled(panelType: PanelType, enabled: boolean): boolean {
    const config = this.panelConfigurations.get(panelType);
    if (!config) return false;

    config.isEnabled = enabled;
    return true;
  }

  /**
   * Check if a panel is enabled
   */
  isPanelEnabled(panelType: PanelType): boolean {
    const config = this.panelConfigurations.get(panelType);
    return config?.isEnabled || false;
  }

  /**
   * Get all available panels for a user
   */
  getAvailablePanels(userId: string): PanelType[] {
    return Object.values(PanelType).filter(panelType =>
      this.canAccessPanel(userId, panelType) && this.isPanelEnabled(panelType)
    );
  }

  /**
   * Cleanup inactive sessions
   */
  cleanupInactiveSessions(maxAge: number = 3600000): number { // 1 hour default
    const cutoffTime = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    for (const [sessionId, panel] of this.activePanels.entries()) {
      if (panel.startTime < cutoffTime) {
        this.closePanel(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Private helper methods
   */
  private getPanelTitle(panelType: PanelType): string {
    const titles: Record<PanelType, string> = {
      [PanelType.ADMIN_DASHBOARD]: 'Admin Dashboard',
      [PanelType.USER_SETTINGS]: 'User Settings',
      [PanelType.MODERATION_QUEUE]: 'Moderation Queue',
      [PanelType.ANALYTICS_DASHBOARD]: 'Analytics Dashboard',
      [PanelType.CONTENT_MANAGEMENT]: 'Content Management',
      [PanelType.USER_MANAGEMENT]: 'User Management',
      [PanelType.SYSTEM_SETTINGS]: 'System Settings',
      [PanelType.AUDIT_LOGS]: 'Audit Logs'
    };
    return titles[panelType] || panelType;
  }

  private getPanelDescription(panelType: PanelType): string {
    const descriptions: Record<PanelType, string> = {
      [PanelType.ADMIN_DASHBOARD]: 'Comprehensive administrative dashboard with system overview',
      [PanelType.USER_SETTINGS]: 'Manage your profile, preferences, and account settings',
      [PanelType.MODERATION_QUEUE]: 'Review and moderate flagged content and user reports',
      [PanelType.ANALYTICS_DASHBOARD]: 'View detailed analytics and performance metrics',
      [PanelType.CONTENT_MANAGEMENT]: 'Create, edit, and manage content across the platform',
      [PanelType.USER_MANAGEMENT]: 'Manage user accounts, roles, and permissions',
      [PanelType.SYSTEM_SETTINGS]: 'Configure system-wide settings and integrations',
      [PanelType.AUDIT_LOGS]: 'Review system audit logs and security events'
    };
    return descriptions[panelType] || `Panel for ${panelType}`;
  }

  private getDefaultPanelSettings(panelType: PanelType): Record<string, any> {
    const defaultSettings: Record<PanelType, Record<string, any>> = {
      [PanelType.ADMIN_DASHBOARD]: {
        refreshInterval: 30000,
        defaultView: 'overview',
        showNotifications: true
      },
      [PanelType.USER_SETTINGS]: {
        autoSave: true,
        showTips: true,
        compactMode: false
      },
      [PanelType.MODERATION_QUEUE]: {
        itemsPerPage: 20,
        autoRefresh: true,
        priorityFilter: 'all'
      },
      [PanelType.ANALYTICS_DASHBOARD]: {
        defaultTimeRange: '7d',
        chartType: 'line',
        realTimeUpdates: false
      },
      [PanelType.CONTENT_MANAGEMENT]: {
        defaultView: 'grid',
        itemsPerPage: 12,
        showPreview: true
      },
      [PanelType.USER_MANAGEMENT]: {
        itemsPerPage: 25,
        defaultSort: 'lastActive',
        showInactive: false
      },
      [PanelType.SYSTEM_SETTINGS]: {
        advancedMode: false,
        confirmChanges: true,
        backupBeforeChanges: true
      },
      [PanelType.AUDIT_LOGS]: {
        itemsPerPage: 50,
        defaultTimeRange: '24h',
        autoRefresh: false
      }
    };
    return defaultSettings[panelType] || {};
  }

  private getDefaultPanelLayout(panelType: PanelType): PanelLayout {
    const baseSections: Record<PanelType, PanelSection[]> = {
      [PanelType.ADMIN_DASHBOARD]: [
        {
          id: 'stats',
          title: 'Statistics',
          component: 'StatsGrid',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 4 },
          isVisible: true,
          isCollapsible: false
        },
        {
          id: 'activity',
          title: 'Recent Activity',
          component: 'ActivityFeed',
          permissions: [],
          position: { x: 0, y: 4, width: 8, height: 8 },
          isVisible: true,
          isCollapsible: true
        },
        {
          id: 'actions',
          title: 'Quick Actions',
          component: 'QuickActions',
          permissions: [],
          position: { x: 8, y: 4, width: 4, height: 4 },
          isVisible: true,
          isCollapsible: true
        }
      ],
      [PanelType.USER_SETTINGS]: [
        {
          id: 'profile',
          title: 'Profile Settings',
          component: 'ProfileForm',
          permissions: [],
          position: { x: 0, y: 0, width: 8, height: 6 },
          isVisible: true,
          isCollapsible: false
        },
        {
          id: 'security',
          title: 'Security Settings',
          component: 'SecurityForm',
          permissions: [],
          position: { x: 8, y: 0, width: 4, height: 6 },
          isVisible: true,
          isCollapsible: true
        }
      ],
      [PanelType.MODERATION_QUEUE]: [
        {
          id: 'queue',
          title: 'Moderation Queue',
          component: 'ModerationQueue',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 10 },
          isVisible: true,
          isCollapsible: false
        }
      ],
      [PanelType.ANALYTICS_DASHBOARD]: [
        {
          id: 'metrics',
          title: 'Key Metrics',
          component: 'MetricsGrid',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 4 },
          isVisible: true,
          isCollapsible: false
        },
        {
          id: 'charts',
          title: 'Analytics Charts',
          component: 'AnalyticsCharts',
          permissions: [],
          position: { x: 0, y: 4, width: 12, height: 8 },
          isVisible: true,
          isCollapsible: true
        }
      ],
      [PanelType.CONTENT_MANAGEMENT]: [
        {
          id: 'content-list',
          title: 'Content List',
          component: 'ContentList',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 12 },
          isVisible: true,
          isCollapsible: false
        }
      ],
      [PanelType.USER_MANAGEMENT]: [
        {
          id: 'user-list',
          title: 'User List',
          component: 'UserList',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 12 },
          isVisible: true,
          isCollapsible: false
        }
      ],
      [PanelType.SYSTEM_SETTINGS]: [
        {
          id: 'settings-form',
          title: 'System Settings',
          component: 'SettingsForm',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 12 },
          isVisible: true,
          isCollapsible: false
        }
      ],
      [PanelType.AUDIT_LOGS]: [
        {
          id: 'logs-table',
          title: 'Audit Logs',
          component: 'AuditLogsTable',
          permissions: [],
          position: { x: 0, y: 0, width: 12, height: 12 },
          isVisible: true,
          isCollapsible: false
        }
      ]
    };

    const sections = baseSections[panelType] || [];

    return {
      sections,
      responsive: {
        mobile: { sections: sections.map(s => s.id), layout: 'stack' },
        tablet: { sections: sections.map(s => s.id), layout: 'grid' },
        desktop: { sections: sections.map(s => s.id), layout: 'grid' }
      }
    };
  }

  private updatePerformanceMetrics(analytics: PanelAnalytics, action: string, metadata?: Record<string, any>): void {
    // Update interaction latency based on action timing
    if (metadata?.duration) {
      analytics.performanceMetrics.interactionLatency =
        (analytics.performanceMetrics.interactionLatency + metadata.duration) / 2;
    }

    // Track errors
    if (action.includes('error') || metadata?.error) {
      analytics.performanceMetrics.errorRate += 0.1;
    }

    // Update load time on first action
    if (analytics.actions.length === 1 && metadata?.loadTime) {
      analytics.performanceMetrics.loadTime = metadata.loadTime;
    }
  }

  private processPanelAnalytics(analytics: PanelAnalytics): void {
    // Process completed analytics for insights
    const sessionDuration = analytics.endTime!.getTime() - analytics.startTime.getTime();

    // Calculate user satisfaction based on session patterns
    if (sessionDuration > 300000 && analytics.actions.length > 5) { // 5 minutes, 5+ actions
      analytics.performanceMetrics.userSatisfaction = Math.min(100,
        (analytics.actions.length * 10) + (sessionDuration / 60000) // Points per action and minute
      );
    }

    // Store analytics for later analysis (in a real app, this would go to a database)
    console.log('Panel Analytics:', {
      panelType: analytics.panelType,
      sessionDuration,
      actionCount: analytics.actions.length,
      performanceMetrics: analytics.performanceMetrics
    });
  }
}

// Singleton instance
export const panelManager = new PanelManager();