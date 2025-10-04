import { PanelType, UserRole, Permission, PanelConfiguration } from '../types';
import { panelManager } from '../core/PanelManager';

/**
 * PanelConfiguration
 * Centralized configuration management for all panel types
 */
export class PanelConfigurationManager {
  private static instance: PanelConfigurationManager;
  private configurations: Map<PanelType, PanelConfiguration> = new Map();

  private constructor() {
    this.initializeConfigurations();
  }

  static getInstance(): PanelConfigurationManager {
    if (!PanelConfigurationManager.instance) {
      PanelConfigurationManager.instance = new PanelConfigurationManager();
    }
    return PanelConfigurationManager.instance;
  }

  /**
   * Initialize default configurations for all panel types
   */
  private initializeConfigurations(): void {
    const defaultConfigs: Record<PanelType, Partial<PanelConfiguration>> = {
      [PanelType.ADMIN_DASHBOARD]: {
        title: 'Admin Dashboard',
        description: 'Comprehensive administrative dashboard with system overview and management tools',
        requiredRole: UserRole.MODERATOR,
        requiredPermissions: [Permission.ACCESS_ADMIN_PANEL],
        isEnabled: true,
        settings: {
          refreshInterval: 30000,
          defaultView: 'overview',
          showNotifications: true,
          enableRealTimeUpdates: true,
          maxDashboardItems: 50
        }
      },

      [PanelType.USER_SETTINGS]: {
        title: 'Settings',
        description: 'Manage your profile, security, and application preferences',
        requiredRole: UserRole.USER,
        requiredPermissions: [Permission.ACCESS_USER_PANEL],
        isEnabled: true,
        settings: {
          autoSave: true,
          showTips: true,
          compactMode: false,
          enableAdvancedSecurity: true,
          sessionTimeout: 3600000 // 1 hour
        }
      },

      [PanelType.MODERATION_QUEUE]: {
        title: 'Moderation Queue',
        description: 'Review and moderate flagged content and user reports',
        requiredRole: UserRole.MODERATOR,
        requiredPermissions: [Permission.ACCESS_MODERATION_PANEL, Permission.REVIEW_FLAGGED_CONTENT],
        isEnabled: true,
        settings: {
          itemsPerPage: 20,
          autoRefresh: true,
          priorityFilter: 'all',
          enableBulkActions: true,
          requireReasonForActions: true
        }
      },

      [PanelType.ANALYTICS_DASHBOARD]: {
        title: 'Analytics Dashboard',
        description: 'View detailed analytics and performance metrics',
        requiredRole: UserRole.CONTENT_CREATOR,
        requiredPermissions: [Permission.ACCESS_ANALYTICS_PANEL, Permission.VIEW_ANALYTICS],
        isEnabled: true,
        settings: {
          defaultTimeRange: '7d',
          chartType: 'line',
          realTimeUpdates: false,
          enableExport: true,
          maxDataPoints: 1000
        }
      },

      [PanelType.CONTENT_MANAGEMENT]: {
        title: 'Content Management',
        description: 'Create, edit, and manage content across the platform',
        requiredRole: UserRole.CONTENT_CREATOR,
        requiredPermissions: [Permission.MANAGE_CONTENT],
        isEnabled: true,
        settings: {
          defaultView: 'grid',
          itemsPerPage: 12,
          showPreview: true,
          enableDraftMode: true,
          autoSaveInterval: 30000
        }
      },

      [PanelType.USER_MANAGEMENT]: {
        title: 'User Management',
        description: 'Manage user accounts, roles, and permissions',
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [Permission.MANAGE_USERS],
        isEnabled: true,
        settings: {
          itemsPerPage: 25,
          defaultSort: 'lastActive',
          showInactive: false,
          enableBulkOperations: true,
          requireApprovalForRoleChanges: true
        }
      },

      [PanelType.SYSTEM_SETTINGS]: {
        title: 'System Settings',
        description: 'Configure system-wide settings and integrations',
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [Permission.MANAGE_SETTINGS, Permission.SYSTEM_ACCESS],
        isEnabled: true,
        settings: {
          advancedMode: false,
          confirmChanges: true,
          backupBeforeChanges: true,
          enableMaintenanceMode: false,
          logLevel: 'info'
        }
      },

      [PanelType.AUDIT_LOGS]: {
        title: 'Audit Logs',
        description: 'Review system audit logs and security events',
        requiredRole: UserRole.ADMIN,
        requiredPermissions: [Permission.VIEW_AUDIT_LOGS],
        isEnabled: true,
        settings: {
          itemsPerPage: 50,
          defaultTimeRange: '24h',
          autoRefresh: false,
          enableExport: true,
          retentionDays: 90
        }
      }
    };

    // Apply configurations to panel manager
    for (const [panelType, config] of Object.entries(defaultConfigs)) {
      panelManager.updatePanelConfiguration(panelType as PanelType, config as PanelConfiguration);
    }
  }

  /**
   * Get configuration for a specific panel
   */
  getPanelConfiguration(panelType: PanelType): PanelConfiguration | null {
    return panelManager.getPanelConfiguration(panelType);
  }

  /**
   * Update configuration for a specific panel
   */
  updatePanelConfiguration(panelType: PanelType, updates: Partial<PanelConfiguration>): boolean {
    const currentConfig = panelManager.getPanelConfiguration(panelType);
    if (!currentConfig) return false;

    const updatedConfig = { ...currentConfig, ...updates };
    return panelManager.updatePanelConfiguration(panelType, updatedConfig);
  }

  /**
   * Enable or disable a panel
   */
  setPanelEnabled(panelType: PanelType, enabled: boolean): boolean {
    return panelManager.setPanelEnabled(panelType, enabled);
  }

  /**
   * Get all panel configurations
   */
  getAllConfigurations(): Map<PanelType, PanelConfiguration> {
    const configs = new Map<PanelType, PanelConfiguration>();
    for (const panelType of Object.values(PanelType)) {
      const config = panelManager.getPanelConfiguration(panelType);
      if (config) {
        configs.set(panelType, config);
      }
    }
    return configs;
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(panelType: PanelType): boolean {
    const defaultConfig = this.getDefaultConfiguration(panelType);
    if (!defaultConfig) return false;

    return panelManager.updatePanelConfiguration(panelType, defaultConfig);
  }

  /**
   * Get default configuration for a panel type
   */
  private getDefaultConfiguration(panelType: PanelType): PanelConfiguration | null {
    // This would return the default configuration for each panel type
    // Implementation would depend on the specific requirements

    const config = panelManager.getPanelConfiguration(panelType);
    return config || null;
  }

  /**
   * Validate panel configuration
   */
  validateConfiguration(config: PanelConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.title || config.title.trim().length === 0) {
      errors.push('Panel title is required');
    }

    if (!config.description || config.description.trim().length === 0) {
      errors.push('Panel description is required');
    }

    if (!config.requiredRole) {
      errors.push('Required role must be specified');
    }

    if (!config.requiredPermissions || config.requiredPermissions.length === 0) {
      errors.push('At least one required permission must be specified');
    }

    if (config.settings) {
      // Validate specific settings based on panel type
      switch (config.panelType) {
        case PanelType.ADMIN_DASHBOARD:
          if (typeof config.settings.refreshInterval !== 'number' || config.settings.refreshInterval < 1000) {
            errors.push('Refresh interval must be at least 1000ms');
          }
          break;

        case PanelType.MODERATION_QUEUE:
          if (typeof config.settings.itemsPerPage !== 'number' || config.settings.itemsPerPage < 1) {
            errors.push('Items per page must be at least 1');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export all configurations
   */
  exportConfigurations(): string {
    const configs = Object.fromEntries(this.getAllConfigurations());
    return JSON.stringify(configs, null, 2);
  }

  /**
   * Import configurations
   */
  importConfigurations(configJson: string): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const configs = JSON.parse(configJson) as Record<PanelType, PanelConfiguration>;

      for (const [panelType, config] of Object.entries(configs)) {
        const validation = this.validateConfiguration(config);
        if (!validation.valid) {
          errors.push(`Invalid configuration for ${panelType}: ${validation.errors.join(', ')}`);
          continue;
        }

        const success = panelManager.updatePanelConfiguration(panelType as PanelType, config);
        if (!success) {
          errors.push(`Failed to update configuration for ${panelType}`);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

// Export singleton instance
export const panelConfigManager = PanelConfigurationManager.getInstance();

/**
 * Configuration Presets
 * Predefined configuration presets for different use cases
 */
export const CONFIGURATION_PRESETS = {
  development: {
    enableDebugMode: true,
    logLevel: 'debug',
    refreshInterval: 5000,
    showAdvancedOptions: true
  },

  production: {
    enableDebugMode: false,
    logLevel: 'error',
    refreshInterval: 30000,
    showAdvancedOptions: false
  },

  demo: {
    enableDebugMode: false,
    logLevel: 'info',
    refreshInterval: 10000,
    showSampleData: true,
    enableTours: true
  }
} as const;

/**
 * Apply configuration preset to all panels
 */
export function applyConfigurationPreset(preset: keyof typeof CONFIGURATION_PRESETS): void {
  const presetConfig = CONFIGURATION_PRESETS[preset];

  for (const panelType of Object.values(PanelType)) {
    const config = panelManager.getPanelConfiguration(panelType);
    if (config) {
      config.settings = { ...config.settings, ...presetConfig };
      panelManager.updatePanelConfiguration(panelType, config);
    }
  }
}