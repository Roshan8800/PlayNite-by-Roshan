/**
 * Panel Management System
 * Central export for all panel-related functionality
 */

// Core types and definitions
export * from './types';

// Core managers
export { PanelManager, panelManager } from './core/PanelManager';
export { AccessControlManager, accessControlManager } from './managers/AccessControlManager';

// Security and analytics
export { PanelSecurityManager, panelSecurityManager } from './security/PanelSecurityManager';
export { PanelAnalyticsManager, panelAnalyticsManager } from './analytics/PanelAnalyticsManager';

// Re-export commonly used types for convenience
export type {
  UserRole,
  Permission,
  PanelType,
  AccessLevel,
  RoleDefinition,
  UserPermissions,
  PanelConfiguration,
  PanelAnalytics,
  AuditLogEntry
} from './types';