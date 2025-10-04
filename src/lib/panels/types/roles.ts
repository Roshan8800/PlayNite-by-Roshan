/**
 * Role-Based Access Control (RBAC) Types and Enums
 * Defines user roles, permissions, and access control structures
 */

export enum UserRole {
  // Basic user roles
  GUEST = 'guest',
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  VERIFIED_USER = 'verified_user',

  // Content creator roles
  CONTENT_CREATOR = 'content_creator',
  INFLUENCER = 'influencer',

  // Moderation roles
  MODERATOR = 'moderator',
  SENIOR_MODERATOR = 'senior_moderator',

  // Administrative roles
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',

  // Special roles
  DEVELOPER = 'developer',
  BETA_TESTER = 'beta_tester'
}

export enum Permission {
  // Basic permissions
  READ_PROFILE = 'read_profile',
  WRITE_PROFILE = 'write_profile',
  DELETE_PROFILE = 'delete_profile',

  // Content permissions
  CREATE_CONTENT = 'create_content',
  READ_CONTENT = 'read_content',
  UPDATE_CONTENT = 'update_content',
  DELETE_CONTENT = 'delete_content',
  PUBLISH_CONTENT = 'publish_content',

  // Social permissions
  FOLLOW_USER = 'follow_user',
  SEND_MESSAGE = 'send_message',
  JOIN_GROUPS = 'join_groups',
  CREATE_GROUPS = 'create_groups',

  // Moderation permissions
  FLAG_CONTENT = 'flag_content',
  REVIEW_FLAGGED_CONTENT = 'review_flagged_content',
  MODERATE_COMMENTS = 'moderate_comments',
  BAN_USERS = 'ban_users',
  SUSPEND_USERS = 'suspend_users',

  // Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_CONTENT = 'manage_content',
  MANAGE_ROLES = 'manage_roles',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',
  SYSTEM_ACCESS = 'system_access',

  // Panel permissions
  ACCESS_ADMIN_PANEL = 'access_admin_panel',
  ACCESS_USER_PANEL = 'access_user_panel',
  ACCESS_MODERATION_PANEL = 'access_moderation_panel',
  ACCESS_ANALYTICS_PANEL = 'access_analytics_panel',

  // Advanced permissions
  EXPORT_DATA = 'export_data',
  IMPORT_DATA = 'import_data',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  VIEW_AUDIT_LOGS = 'view_audit_logs'
}

export enum PanelType {
  ADMIN_DASHBOARD = 'admin_dashboard',
  USER_SETTINGS = 'user_settings',
  MODERATION_QUEUE = 'moderation_queue',
  ANALYTICS_DASHBOARD = 'analytics_dashboard',
  CONTENT_MANAGEMENT = 'content_management',
  USER_MANAGEMENT = 'user_management',
  SYSTEM_SETTINGS = 'system_settings',
  AUDIT_LOGS = 'audit_logs'
}

export enum AccessLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
  SYSTEM = 4
}

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  panelAccess: PanelType[];
  accessLevel: AccessLevel;
  isSystemRole: boolean;
  maxUsers?: number; // For limited roles like beta testers
}

export interface UserPermissions {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  panelAccess: PanelType[];
  accessLevel: AccessLevel;
  grantedBy?: string; // User ID who granted these permissions
  grantedAt: Date;
  expiresAt?: Date;
  restrictions?: PermissionRestriction[];
}

export interface PermissionRestriction {
  permission: Permission;
  resourceType?: string; // e.g., 'content', 'user', 'group'
  resourceId?: string; // Specific resource ID if restricted
  conditions?: Record<string, any>; // Additional conditions
}

export interface PanelAccessRequest {
  userId: string;
  panelType: PanelType;
  requestedPermissions: Permission[];
  reason?: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface PanelAnalytics {
  panelType: PanelType;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  actions: PanelAction[];
  performanceMetrics: PerformanceMetrics;
}

export interface PanelAction {
  action: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  loadTime: number;
  interactionLatency: number;
  errorRate: number;
  userSatisfaction?: number;
}

export interface PanelConfiguration {
  panelType: PanelType;
  title: string;
  description: string;
  requiredRole: UserRole;
  requiredPermissions: Permission[];
  isEnabled: boolean;
  settings: Record<string, any>;
  layout: PanelLayout;
}

export interface PanelLayout {
  sections: PanelSection[];
  responsive: ResponsiveConfig;
  customizations?: Record<string, any>;
}

export interface PanelSection {
  id: string;
  title?: string;
  component: string;
  permissions: Permission[];
  position: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isCollapsible: boolean;
}

export interface ResponsiveConfig {
  mobile: { sections: string[]; layout: 'stack' | 'grid' };
  tablet: { sections: string[]; layout: 'stack' | 'grid' };
  desktop: { sections: string[]; layout: 'stack' | 'grid' };
}