import { securityManager } from '../core/SecurityManager';
import { panelSecurityManager } from '@/lib/panels/security/PanelSecurityManager';
import { accessControlManager } from '@/lib/panels/managers/AccessControlManager';

/**
 * Permission Types
 */
export enum Permission {
  // Content permissions
  CREATE_CONTENT = 'content:create',
  READ_CONTENT = 'content:read',
  UPDATE_CONTENT = 'content:update',
  DELETE_CONTENT = 'content:delete',
  PUBLISH_CONTENT = 'content:publish',
  MODERATE_CONTENT = 'content:moderate',

  // User permissions
  CREATE_USER = 'user:create',
  READ_USER = 'user:read',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',
  MANAGE_ROLES = 'user:manage_roles',

  // Admin permissions
  ACCESS_ADMIN_PANEL = 'admin:access',
  SYSTEM_CONFIG = 'admin:system_config',
  VIEW_AUDIT_LOGS = 'admin:audit_logs',
  MANAGE_SECURITY = 'admin:manage_security',

  // Social permissions
  CREATE_POST = 'social:create_post',
  READ_POST = 'social:read_post',
  UPDATE_POST = 'social:update_post',
  DELETE_POST = 'social:delete_post',
  MANAGE_COMMENTS = 'social:manage_comments',

  // Video permissions
  UPLOAD_VIDEO = 'video:upload',
  READ_VIDEO = 'video:read',
  UPDATE_VIDEO = 'video:update',
  DELETE_VIDEO = 'video:delete',
  STREAM_VIDEO = 'video:stream',
  ANALYZE_VIDEO = 'video:analyze'
}

/**
 * Role Definition
 */
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  parentRoles?: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contextual Permission Rule
 */
export interface ContextualPermissionRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    userAttributes?: Record<string, any>;
    resourceAttributes?: Record<string, any>;
    environmentAttributes?: Record<string, any>;
    timeConstraints?: {
      startTime?: string;
      endTime?: string;
      daysOfWeek?: number[];
      timezone?: string;
    };
    ipRestrictions?: string[];
    deviceRestrictions?: string[];
  };
  effect: 'ALLOW' | 'DENY';
  priority: number;
  enabled: boolean;
}

/**
 * Authorization Context
 */
export interface AuthorizationContext {
  userId: string;
  resource: string;
  action: string;
  environment?: {
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    deviceFingerprint?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  };
  metadata?: Record<string, any>;
}

/**
 * Authorization Decision
 */
export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
  advice?: string[];
  contextualRules?: ContextualPermissionRule[];
}

/**
 * Enhanced Authorization Service
 * Provides advanced RBAC with contextual permissions for PlayNite
 */
export class AuthorizationService {
  private roles: Map<string, RoleDefinition> = new Map();
  private contextualRules: Map<string, ContextualPermissionRule> = new Map();
  private permissionCache: Map<string, boolean> = new Map();
  private cacheTimeout: number = 300000; // 5 minutes

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultRules();
  }

  /**
   * Check if user is authorized for an action
   */
  async isAuthorized(
    userId: string,
    resource: string,
    action: string,
    context?: AuthorizationContext
  ): Promise<AuthorizationDecision> {
    try {
      // Check cache first
      const cacheKey = `${userId}:${resource}:${action}`;
      const cachedResult = this.getCachedDecision(cacheKey);

      if (cachedResult !== undefined) {
        return cachedResult;
      }

      // Get user roles
      const userRoles = await this.getUserRoles(userId);

      // Check basic role permissions
      const roleDecision = await this.checkRolePermissions(userRoles, resource, action);

      if (!roleDecision.allowed) {
        return this.cacheDecision(cacheKey, roleDecision);
      }

      // Check contextual permissions
      const contextualDecision = await this.checkContextualPermissions(userId, resource, action, context);

      const finalDecision = {
        allowed: roleDecision.allowed && contextualDecision.allowed,
        reason: roleDecision.allowed && contextualDecision.allowed
          ? 'Authorized by role and context'
          : roleDecision.allowed
            ? contextualDecision.reason
            : roleDecision.reason,
        obligations: [...(roleDecision.obligations || []), ...(contextualDecision.obligations || [])],
        advice: [...(roleDecision.advice || []), ...(contextualDecision.advice || [])],
        contextualRules: contextualDecision.contextualRules
      };

      return this.cacheDecision(cacheKey, finalDecision);
    } catch (error) {
      return {
        allowed: false,
        reason: `Authorization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermissions(
    userRoles: string[],
    resource: string,
    action: string
  ): Promise<AuthorizationDecision> {
    const requiredPermission = this.mapActionToPermission(resource, action);

    if (!requiredPermission) {
      return {
        allowed: false,
        reason: `No permission mapping found for action: ${action} on resource: ${resource}`
      };
    }

    // Check if any user role has the required permission
    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (role && role.permissions.includes(requiredPermission as Permission)) {
        return {
          allowed: true,
          reason: `Authorized by role: ${role.name}`
        };
      }

      // Check parent roles recursively
      if (role?.parentRoles) {
        for (const parentRoleId of role.parentRoles) {
          const parentRole = this.roles.get(parentRoleId);
          if (parentRole && parentRole.permissions.includes(requiredPermission as Permission)) {
            return {
              allowed: true,
              reason: `Authorized by parent role: ${parentRole.name}`
            };
          }
        }
      }
    }

    return {
      allowed: false,
      reason: `No role with permission: ${requiredPermission}`
    };
  }

  /**
   * Check contextual permission rules
   */
  private async checkContextualPermissions(
    userId: string,
    resource: string,
    action: string,
    context?: AuthorizationContext
  ): Promise<AuthorizationDecision> {
    const applicableRules = Array.from(this.contextualRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    const obligations: string[] = [];
    const advice: string[] = [];
    const appliedRules: ContextualPermissionRule[] = [];

    for (const rule of applicableRules) {
      if (await this.evaluateRule(rule, userId, resource, action, context)) {
        appliedRules.push(rule);

        if (rule.effect === 'ALLOW') {
          return {
            allowed: true,
            reason: `Allowed by contextual rule: ${rule.name}`,
            obligations,
            advice,
            contextualRules: appliedRules
          };
        } else {
          return {
            allowed: false,
            reason: `Denied by contextual rule: ${rule.name}`,
            obligations,
            advice,
            contextualRules: appliedRules
          };
        }
      }
    }

    return {
      allowed: true,
      reason: 'No contextual rules apply',
      obligations,
      advice,
      contextualRules: appliedRules
    };
  }

  /**
   * Evaluate contextual rule against context
   */
  private async evaluateRule(
    rule: ContextualPermissionRule,
    userId: string,
    resource: string,
    action: string,
    context?: AuthorizationContext
  ): Promise<boolean> {
    const conditions = rule.conditions;

    // Check user attributes
    if (conditions.userAttributes) {
      const userMatches = await this.checkUserAttributes(userId, conditions.userAttributes);
      if (!userMatches) return false;
    }

    // Check resource attributes
    if (conditions.resourceAttributes) {
      const resourceMatches = await this.checkResourceAttributes(resource, conditions.resourceAttributes);
      if (!resourceMatches) return false;
    }

    // Check environment attributes
    if (conditions.environmentAttributes && context?.environment) {
      const envMatches = await this.checkEnvironmentAttributes(context.environment, conditions.environmentAttributes);
      if (!envMatches) return false;
    }

    // Check time constraints
    if (conditions.timeConstraints) {
      const timeMatches = await this.checkTimeConstraints(conditions.timeConstraints, context?.environment?.timestamp);
      if (!timeMatches) return false;
    }

    // Check IP restrictions
    if (conditions.ipRestrictions && context?.environment?.ipAddress) {
      const ipMatches = conditions.ipRestrictions.includes(context.environment.ipAddress);
      if (!ipMatches) return false;
    }

    return true;
  }

  /**
   * Map action and resource to permission
   */
  private mapActionToPermission(resource: string, action: string): string | null {
    // Content permissions
    if (resource.startsWith('content:')) {
      switch (action) {
        case 'create': return Permission.CREATE_CONTENT;
        case 'read': return Permission.READ_CONTENT;
        case 'update': return Permission.UPDATE_CONTENT;
        case 'delete': return Permission.DELETE_CONTENT;
        case 'publish': return Permission.PUBLISH_CONTENT;
        case 'moderate': return Permission.MODERATE_CONTENT;
      }
    }

    // User permissions
    if (resource.startsWith('user:')) {
      switch (action) {
        case 'create': return Permission.CREATE_USER;
        case 'read': return Permission.READ_USER;
        case 'update': return Permission.UPDATE_USER;
        case 'delete': return Permission.DELETE_USER;
        case 'manage_roles': return Permission.MANAGE_ROLES;
      }
    }

    // Admin permissions
    if (resource.startsWith('admin:')) {
      switch (action) {
        case 'access': return Permission.ACCESS_ADMIN_PANEL;
        case 'system_config': return Permission.SYSTEM_CONFIG;
        case 'audit_logs': return Permission.VIEW_AUDIT_LOGS;
        case 'manage_security': return Permission.MANAGE_SECURITY;
      }
    }

    // Social permissions
    if (resource.startsWith('social:')) {
      switch (action) {
        case 'create_post': return Permission.CREATE_POST;
        case 'read_post': return Permission.READ_POST;
        case 'update_post': return Permission.UPDATE_POST;
        case 'delete_post': return Permission.DELETE_POST;
        case 'manage_comments': return Permission.MANAGE_COMMENTS;
      }
    }

    // Video permissions
    if (resource.startsWith('video:')) {
      switch (action) {
        case 'upload': return Permission.UPLOAD_VIDEO;
        case 'read': return Permission.READ_VIDEO;
        case 'update': return Permission.UPDATE_VIDEO;
        case 'delete': return Permission.DELETE_VIDEO;
        case 'stream': return Permission.STREAM_VIDEO;
        case 'analyze': return Permission.ANALYZE_VIDEO;
      }
    }

    return null;
  }

  /**
   * Check user attributes against rule conditions
   */
  private async checkUserAttributes(userId: string, requiredAttributes: Record<string, any>): Promise<boolean> {
    // In production, this would query user attributes from database
    // For now, simulate attribute checking
    for (const [key, value] of Object.entries(requiredAttributes)) {
      const userValue = await this.getUserAttribute(userId, key);
      if (userValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check resource attributes against rule conditions
   */
  private async checkResourceAttributes(resource: string, requiredAttributes: Record<string, any>): Promise<boolean> {
    // In production, this would query resource attributes from database
    // For now, simulate attribute checking
    for (const [key, value] of Object.entries(requiredAttributes)) {
      const resourceValue = await this.getResourceAttribute(resource, key);
      if (resourceValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check environment attributes against rule conditions
   */
  private async checkEnvironmentAttributes(
    environment: any,
    requiredAttributes: Record<string, any>
  ): Promise<boolean> {
    for (const [key, value] of Object.entries(requiredAttributes)) {
      const envValue = environment[key];
      if (envValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check time constraints against current time
   */
  private async checkTimeConstraints(
    constraints: any,
    currentTime?: Date
  ): Promise<boolean> {
    const now = currentTime || new Date();

    // Check time of day
    if (constraints.startTime || constraints.endTime) {
      const currentHour = now.getHours() * 100 + now.getMinutes();

      if (constraints.startTime) {
        const startTime = this.parseTimeString(constraints.startTime);
        if (currentHour < startTime) return false;
      }

      if (constraints.endTime) {
        const endTime = this.parseTimeString(constraints.endTime);
        if (currentHour > endTime) return false;
      }
    }

    // Check days of week
    if (constraints.daysOfWeek) {
      const currentDay = now.getDay();
      if (!constraints.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get user roles
   */
  private async getUserRoles(userId: string): Promise<string[]> {
    // In production, this would query from database
    // For now, return default roles based on user ID
    if (userId.startsWith('admin')) {
      return ['admin', 'moderator', 'user'];
    } else if (userId.startsWith('mod')) {
      return ['moderator', 'user'];
    } else {
      return ['user'];
    }
  }

  /**
   * Get user attribute value
   */
  private async getUserAttribute(userId: string, attribute: string): Promise<any> {
    // In production, query from user database
    // For now, return mock data
    const mockAttributes: Record<string, any> = {
      department: 'engineering',
      level: 'senior',
      clearance: 'standard'
    };

    return mockAttributes[attribute];
  }

  /**
   * Get resource attribute value
   */
  private async getResourceAttribute(resource: string, attribute: string): Promise<any> {
    // In production, query from resource database
    // For now, return mock data
    const mockAttributes: Record<string, any> = {
      classification: 'internal',
      owner: 'system',
      sensitivity: 'normal'
    };

    return mockAttributes[attribute];
  }

  /**
   * Parse time string (HH:MM format) to minutes
   */
  private parseTimeString(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: RoleDefinition[] = [
      {
        id: 'user',
        name: 'User',
        description: 'Basic user role with standard permissions',
        permissions: [
          Permission.READ_CONTENT,
          Permission.CREATE_POST,
          Permission.READ_POST,
          Permission.UPDATE_POST,
          Permission.DELETE_POST,
          Permission.READ_VIDEO,
          Permission.STREAM_VIDEO
        ],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'moderator',
        name: 'Moderator',
        description: 'Content moderator with enhanced permissions',
        permissions: [
          Permission.READ_CONTENT,
          Permission.UPDATE_CONTENT,
          Permission.MODERATE_CONTENT,
          Permission.READ_USER,
          Permission.UPDATE_USER,
          Permission.CREATE_POST,
          Permission.READ_POST,
          Permission.UPDATE_POST,
          Permission.DELETE_POST,
          Permission.MANAGE_COMMENTS,
          Permission.READ_VIDEO,
          Permission.UPDATE_VIDEO,
          Permission.ANALYZE_VIDEO
        ],
        parentRoles: ['user'],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full administrative access',
        permissions: Object.values(Permission),
        parentRoles: ['moderator'],
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const role of defaultRoles) {
      this.roles.set(role.id, role);
    }
  }

  /**
   * Initialize default contextual rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: ContextualPermissionRule[] = [
      {
        id: 'business_hours_admin',
        name: 'Business Hours Admin Access',
        description: 'Allow admin access only during business hours',
        conditions: {
          timeConstraints: {
            startTime: '08:00',
            endTime: '18:00',
            daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
          }
        },
        effect: 'ALLOW',
        priority: 100,
        enabled: true
      },
      {
        id: 'emergency_admin_override',
        name: 'Emergency Admin Override',
        description: 'Allow emergency admin access outside business hours',
        conditions: {
          userAttributes: {
            clearance: 'emergency'
          }
        },
        effect: 'ALLOW',
        priority: 200,
        enabled: true
      }
    ];

    for (const rule of defaultRules) {
      this.contextualRules.set(rule.id, rule);
    }
  }

  /**
   * Cache authorization decision
   */
  private cacheDecision(cacheKey: string, decision: AuthorizationDecision): AuthorizationDecision {
    this.permissionCache.set(cacheKey, decision.allowed);

    // Auto-cleanup cache after timeout
    setTimeout(() => {
      this.permissionCache.delete(cacheKey);
    }, this.cacheTimeout);

    return decision;
  }

  /**
   * Get cached decision
   */
  private getCachedDecision(cacheKey: string): AuthorizationDecision | undefined {
    const cached = this.permissionCache.get(cacheKey);
    if (cached !== undefined) {
      return { allowed: cached };
    }
    return undefined;
  }

  /**
   * Get all roles
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by ID
   */
  getRole(roleId: string): RoleDefinition | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Create new role
   */
  async createRole(roleDefinition: Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleDefinition> {
    const role: RoleDefinition = {
      ...roleDefinition,
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(role.id, role);

    // Log role creation
    await securityManager.validateSecurityContext({
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'create_role',
      resource: `role:${role.id}`,
      metadata: { roleName: role.name }
    });

    return role;
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, updates: Partial<RoleDefinition>): Promise<RoleDefinition | null> {
    const role = this.roles.get(roleId);
    if (!role) {
      return null;
    }

    const updatedRole = {
      ...role,
      ...updates,
      updatedAt: new Date()
    };

    this.roles.set(roleId, updatedRole);

    // Clear permission cache for this role
    this.clearRoleCache(roleId);

    return updatedRole;
  }

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<boolean> {
    const deleted = this.roles.delete(roleId);

    if (deleted) {
      // Clear permission cache for this role
      this.clearRoleCache(roleId);
    }

    return deleted;
  }

  /**
   * Clear permission cache for role
   */
  private clearRoleCache(roleId: string): void {
    for (const [cacheKey] of this.permissionCache.entries()) {
      if (cacheKey.includes(`:${roleId}:`)) {
        this.permissionCache.delete(cacheKey);
      }
    }
  }

  /**
   * Get authorization statistics
   */
  async getAuthorizationStatistics(): Promise<Record<string, any>> {
    return {
      totalRoles: this.roles.size,
      totalContextualRules: this.contextualRules.size,
      cacheSize: this.permissionCache.size,
      enabledRules: Array.from(this.contextualRules.values()).filter(r => r.enabled).length,
      lastUpdated: new Date()
    };
  }
}

// Export singleton instance
export const authorizationService = new AuthorizationService();