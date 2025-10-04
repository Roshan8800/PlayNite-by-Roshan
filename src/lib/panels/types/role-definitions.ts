import { UserRole, Permission, PanelType, AccessLevel, RoleDefinition } from './roles';

/**
 * Role Definitions with Permissions and Panel Access
 * Defines the complete role hierarchy and permission structure
 */

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  [UserRole.GUEST]: {
    id: UserRole.GUEST,
    name: 'Guest',
    description: 'Limited access for non-registered users',
    permissions: [
      Permission.READ_CONTENT,
      Permission.READ_PROFILE
    ],
    panelAccess: [],
    accessLevel: AccessLevel.NONE,
    isSystemRole: false
  },

  [UserRole.USER]: {
    id: UserRole.USER,
    name: 'User',
    description: 'Standard registered user with basic permissions',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.ACCESS_USER_PANEL
    ],
    panelAccess: [PanelType.USER_SETTINGS],
    accessLevel: AccessLevel.READ,
    isSystemRole: false
  },

  [UserRole.PREMIUM_USER]: {
    id: UserRole.PREMIUM_USER,
    name: 'Premium User',
    description: 'Premium subscriber with enhanced features',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.CREATE_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.EXPORT_DATA,
      Permission.ACCESS_USER_PANEL
    ],
    panelAccess: [
      PanelType.USER_SETTINGS,
      PanelType.CONTENT_MANAGEMENT
    ],
    accessLevel: AccessLevel.WRITE,
    isSystemRole: false
  },

  [UserRole.VERIFIED_USER]: {
    id: UserRole.VERIFIED_USER,
    name: 'Verified User',
    description: 'Verified user with enhanced credibility',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.CREATE_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.EXPORT_DATA,
      Permission.ACCESS_USER_PANEL
    ],
    panelAccess: [
      PanelType.USER_SETTINGS,
      PanelType.CONTENT_MANAGEMENT,
      PanelType.MODERATION_QUEUE
    ],
    accessLevel: AccessLevel.WRITE,
    isSystemRole: false
  },

  [UserRole.CONTENT_CREATOR]: {
    id: UserRole.CONTENT_CREATOR,
    name: 'Content Creator',
    description: 'Professional content creator with advanced publishing tools',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.CREATE_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.MANAGE_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.MANAGE_INTEGRATIONS,
      Permission.EXPORT_DATA,
      Permission.ACCESS_USER_PANEL
    ],
    panelAccess: [
      PanelType.USER_SETTINGS,
      PanelType.CONTENT_MANAGEMENT,
      PanelType.MODERATION_QUEUE,
      PanelType.ANALYTICS_DASHBOARD
    ],
    accessLevel: AccessLevel.WRITE,
    isSystemRole: false
  },

  [UserRole.INFLUENCER]: {
    id: UserRole.INFLUENCER,
    name: 'Influencer',
    description: 'Verified influencer with partnership features',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.CREATE_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.MANAGE_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.MANAGE_INTEGRATIONS,
      Permission.IMPORT_DATA,
      Permission.MANAGE_SETTINGS,
      Permission.EXPORT_DATA,
      Permission.ACCESS_USER_PANEL,
      Permission.ACCESS_ADMIN_PANEL
    ],
    panelAccess: [
      PanelType.USER_SETTINGS,
      PanelType.CONTENT_MANAGEMENT,
      PanelType.MODERATION_QUEUE,
      PanelType.ANALYTICS_DASHBOARD,
      PanelType.ADMIN_DASHBOARD
    ],
    accessLevel: AccessLevel.ADMIN,
    isSystemRole: false
  },

  [UserRole.MODERATOR]: {
    id: UserRole.MODERATOR,
    name: 'Moderator',
    description: 'Community moderator with content oversight',
    permissions: [
      Permission.READ_PROFILE,
      Permission.READ_CONTENT,
      Permission.REVIEW_FLAGGED_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.SUSPEND_USERS,
      Permission.VIEW_ANALYTICS,
      Permission.ACCESS_MODERATION_PANEL,
      Permission.ACCESS_ADMIN_PANEL
    ],
    panelAccess: [
      PanelType.MODERATION_QUEUE,
      PanelType.ADMIN_DASHBOARD,
      PanelType.ANALYTICS_DASHBOARD
    ],
    accessLevel: AccessLevel.ADMIN,
    isSystemRole: false
  },

  [UserRole.SENIOR_MODERATOR]: {
    id: UserRole.SENIOR_MODERATOR,
    name: 'Senior Moderator',
    description: 'Senior moderator with advanced moderation tools',
    permissions: [
      Permission.READ_PROFILE,
      Permission.READ_CONTENT,
      Permission.REVIEW_FLAGGED_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.SUSPEND_USERS,
      Permission.BAN_USERS,
      Permission.MANAGE_CONTENT,
      Permission.MANAGE_USERS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.VIEW_ANALYTICS,
      Permission.ACCESS_MODERATION_PANEL,
      Permission.ACCESS_ADMIN_PANEL
    ],
    panelAccess: [
      PanelType.MODERATION_QUEUE,
      PanelType.ADMIN_DASHBOARD,
      PanelType.ANALYTICS_DASHBOARD,
      PanelType.USER_MANAGEMENT,
      PanelType.AUDIT_LOGS
    ],
    accessLevel: AccessLevel.ADMIN,
    isSystemRole: false
  },

  [UserRole.ADMIN]: {
    id: UserRole.ADMIN,
    name: 'Administrator',
    description: 'Full administrative access with system management',
    permissions: [
      Permission.READ_PROFILE,
      Permission.READ_CONTENT,
      Permission.REVIEW_FLAGGED_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.SUSPEND_USERS,
      Permission.BAN_USERS,
      Permission.MANAGE_CONTENT,
      Permission.MANAGE_USERS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_SETTINGS,
      Permission.SYSTEM_ACCESS,
      Permission.EXPORT_DATA,
      Permission.IMPORT_DATA,
      Permission.MANAGE_INTEGRATIONS,
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.ACCESS_MODERATION_PANEL,
      Permission.ACCESS_ADMIN_PANEL
    ],
    panelAccess: [
      PanelType.ADMIN_DASHBOARD,
      PanelType.USER_MANAGEMENT,
      PanelType.CONTENT_MANAGEMENT,
      PanelType.MODERATION_QUEUE,
      PanelType.ANALYTICS_DASHBOARD,
      PanelType.SYSTEM_SETTINGS,
      PanelType.AUDIT_LOGS
    ],
    accessLevel: AccessLevel.ADMIN,
    isSystemRole: true
  },

  [UserRole.SUPER_ADMIN]: {
    id: UserRole.SUPER_ADMIN,
    name: 'Super Administrator',
    description: 'Highest level administrator with unrestricted access',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.DELETE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.CREATE_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.REVIEW_FLAGGED_CONTENT,
      Permission.MODERATE_COMMENTS,
      Permission.SUSPEND_USERS,
      Permission.BAN_USERS,
      Permission.MANAGE_CONTENT,
      Permission.MANAGE_USERS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_SETTINGS,
      Permission.SYSTEM_ACCESS,
      Permission.EXPORT_DATA,
      Permission.IMPORT_DATA,
      Permission.MANAGE_INTEGRATIONS,
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.ACCESS_MODERATION_PANEL,
      Permission.ACCESS_ADMIN_PANEL,
      Permission.ACCESS_USER_PANEL
    ],
    panelAccess: [
      PanelType.ADMIN_DASHBOARD,
      PanelType.USER_MANAGEMENT,
      PanelType.CONTENT_MANAGEMENT,
      PanelType.MODERATION_QUEUE,
      PanelType.ANALYTICS_DASHBOARD,
      PanelType.SYSTEM_SETTINGS,
      PanelType.AUDIT_LOGS,
      PanelType.USER_SETTINGS
    ],
    accessLevel: AccessLevel.SYSTEM,
    isSystemRole: true
  },

  [UserRole.SYSTEM_ADMIN]: {
    id: UserRole.SYSTEM_ADMIN,
    name: 'System Administrator',
    description: 'System-level administrator with complete infrastructure access',
    permissions: Object.values(Permission),
    panelAccess: Object.values(PanelType),
    accessLevel: AccessLevel.SYSTEM,
    isSystemRole: true
  },

  [UserRole.DEVELOPER]: {
    id: UserRole.DEVELOPER,
    name: 'Developer',
    description: 'Development team member with technical access',
    permissions: [
      Permission.READ_PROFILE,
      Permission.READ_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.SYSTEM_ACCESS,
      Permission.MANAGE_INTEGRATIONS
    ],
    panelAccess: [
      PanelType.ADMIN_DASHBOARD,
      PanelType.ANALYTICS_DASHBOARD,
      PanelType.AUDIT_LOGS,
      PanelType.SYSTEM_SETTINGS
    ],
    accessLevel: AccessLevel.SYSTEM,
    isSystemRole: true,
    maxUsers: 50
  },

  [UserRole.BETA_TESTER]: {
    id: UserRole.BETA_TESTER,
    name: 'Beta Tester',
    description: 'Beta testing participant with early access',
    permissions: [
      Permission.READ_PROFILE,
      Permission.WRITE_PROFILE,
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
      Permission.FOLLOW_USER,
      Permission.SEND_MESSAGE,
      Permission.JOIN_GROUPS,
      Permission.CREATE_GROUPS,
      Permission.FLAG_CONTENT,
      Permission.VIEW_ANALYTICS,
      Permission.EXPORT_DATA,
      Permission.ACCESS_USER_PANEL,
      Permission.ACCESS_ADMIN_PANEL
    ],
    panelAccess: [
      PanelType.USER_SETTINGS,
      PanelType.CONTENT_MANAGEMENT,
      PanelType.ADMIN_DASHBOARD,
      PanelType.ANALYTICS_DASHBOARD
    ],
    accessLevel: AccessLevel.WRITE,
    isSystemRole: false,
    maxUsers: 1000
  }
};

/**
 * Permission hierarchy - defines which permissions imply others
 */
export const PERMISSION_HIERARCHY: Record<Permission, Permission[]> = {
  [Permission.READ_PROFILE]: [],
  [Permission.WRITE_PROFILE]: [Permission.READ_PROFILE],
  [Permission.DELETE_PROFILE]: [Permission.READ_PROFILE, Permission.WRITE_PROFILE],

  [Permission.CREATE_CONTENT]: [],
  [Permission.READ_CONTENT]: [],
  [Permission.UPDATE_CONTENT]: [Permission.READ_CONTENT],
  [Permission.DELETE_CONTENT]: [Permission.READ_CONTENT, Permission.UPDATE_CONTENT],
  [Permission.PUBLISH_CONTENT]: [Permission.CREATE_CONTENT, Permission.UPDATE_CONTENT],

  [Permission.FOLLOW_USER]: [],
  [Permission.SEND_MESSAGE]: [],
  [Permission.JOIN_GROUPS]: [],
  [Permission.CREATE_GROUPS]: [Permission.JOIN_GROUPS],

  [Permission.FLAG_CONTENT]: [],
  [Permission.REVIEW_FLAGGED_CONTENT]: [Permission.FLAG_CONTENT],
  [Permission.MODERATE_COMMENTS]: [Permission.REVIEW_FLAGGED_CONTENT],
  [Permission.BAN_USERS]: [Permission.MODERATE_COMMENTS, Permission.SUSPEND_USERS],
  [Permission.SUSPEND_USERS]: [Permission.MODERATE_COMMENTS],

  [Permission.MANAGE_USERS]: [Permission.BAN_USERS, Permission.SUSPEND_USERS],
  [Permission.MANAGE_CONTENT]: [Permission.DELETE_CONTENT, Permission.PUBLISH_CONTENT],
  [Permission.MANAGE_ROLES]: [Permission.MANAGE_USERS],
  [Permission.VIEW_ANALYTICS]: [],
  [Permission.MANAGE_SETTINGS]: [Permission.VIEW_ANALYTICS],
  [Permission.SYSTEM_ACCESS]: [Permission.MANAGE_SETTINGS],

  [Permission.ACCESS_ADMIN_PANEL]: [],
  [Permission.ACCESS_USER_PANEL]: [],
  [Permission.ACCESS_MODERATION_PANEL]: [Permission.ACCESS_ADMIN_PANEL],
  [Permission.ACCESS_ANALYTICS_PANEL]: [Permission.VIEW_ANALYTICS],

  [Permission.EXPORT_DATA]: [],
  [Permission.IMPORT_DATA]: [Permission.EXPORT_DATA],
  [Permission.MANAGE_INTEGRATIONS]: [Permission.IMPORT_DATA],
  [Permission.VIEW_AUDIT_LOGS]: []
};

/**
 * Panel access requirements
 */
export const PANEL_REQUIREMENTS: Record<PanelType, {
  requiredRole: UserRole;
  requiredPermissions: Permission[];
  accessLevel: AccessLevel;
}> = {
  [PanelType.ADMIN_DASHBOARD]: {
    requiredRole: UserRole.MODERATOR,
    requiredPermissions: [Permission.ACCESS_ADMIN_PANEL],
    accessLevel: AccessLevel.ADMIN
  },
  [PanelType.USER_SETTINGS]: {
    requiredRole: UserRole.USER,
    requiredPermissions: [Permission.ACCESS_USER_PANEL],
    accessLevel: AccessLevel.READ
  },
  [PanelType.MODERATION_QUEUE]: {
    requiredRole: UserRole.MODERATOR,
    requiredPermissions: [Permission.ACCESS_MODERATION_PANEL],
    accessLevel: AccessLevel.ADMIN
  },
  [PanelType.ANALYTICS_DASHBOARD]: {
    requiredRole: UserRole.CONTENT_CREATOR,
    requiredPermissions: [Permission.ACCESS_ANALYTICS_PANEL],
    accessLevel: AccessLevel.READ
  },
  [PanelType.CONTENT_MANAGEMENT]: {
    requiredRole: UserRole.CONTENT_CREATOR,
    requiredPermissions: [Permission.MANAGE_CONTENT],
    accessLevel: AccessLevel.WRITE
  },
  [PanelType.USER_MANAGEMENT]: {
    requiredRole: UserRole.ADMIN,
    requiredPermissions: [Permission.MANAGE_USERS],
    accessLevel: AccessLevel.ADMIN
  },
  [PanelType.SYSTEM_SETTINGS]: {
    requiredRole: UserRole.ADMIN,
    requiredPermissions: [Permission.MANAGE_SETTINGS],
    accessLevel: AccessLevel.ADMIN
  },
  [PanelType.AUDIT_LOGS]: {
    requiredRole: UserRole.ADMIN,
    requiredPermissions: [Permission.VIEW_AUDIT_LOGS],
    accessLevel: AccessLevel.ADMIN
  }
};

/**
 * Helper functions for role and permission management
 */
export class RoleUtils {
  static getRoleDefinition(role: UserRole): RoleDefinition {
    return ROLE_DEFINITIONS[role];
  }

  static hasPermission(userPermissions: Permission[], permission: Permission): boolean {
    return userPermissions.includes(permission);
  }

  static hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
    return permissions.some(permission => userPermissions.includes(permission));
  }

  static hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
    return permissions.every(permission => userPermissions.includes(permission));
  }

  static getAllImpliedPermissions(permission: Permission): Permission[] {
    const direct = PERMISSION_HIERARCHY[permission] || [];
    const implied = direct.flatMap(p => this.getAllImpliedPermissions(p));
    return [...new Set([permission, ...direct, ...implied])];
  }

  static canAccessPanel(userRole: UserRole, userPermissions: Permission[], panelType: PanelType): boolean {
    const requirements = PANEL_REQUIREMENTS[panelType];
    const roleDefinition = this.getRoleDefinition(userRole);

    // Check role requirement
    if (roleDefinition.accessLevel < requirements.accessLevel) {
      return false;
    }

    // Check permission requirements
    return this.hasAllPermissions(userPermissions, requirements.requiredPermissions);
  }

  static getEffectivePermissions(role: UserRole, additionalPermissions: Permission[] = []): Permission[] {
    const roleDefinition = this.getRoleDefinition(role);
    const basePermissions = [...roleDefinition.permissions];

    // Add implied permissions for existing permissions
    const allPermissions = [...new Set([
      ...basePermissions,
      ...additionalPermissions,
      ...basePermissions.flatMap(p => this.getAllImpliedPermissions(p)),
      ...additionalPermissions.flatMap(p => this.getAllImpliedPermissions(p))
    ])];

    return allPermissions;
  }
}