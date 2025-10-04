import {
  UserRole,
  Permission,
  PanelType,
  AccessLevel,
  RoleDefinition,
  UserPermissions,
  PanelAccessRequest,
  AuditLogEntry,
  PermissionRestriction,
  ROLE_DEFINITIONS,
  PANEL_REQUIREMENTS,
  RoleUtils
} from '../types';

/**
 * AccessControlManager
 * Central manager for Role-Based Access Control (RBAC) functionality
 * Handles permission checking, role management, and access control decisions
 */
export class AccessControlManager {
  private userPermissions: Map<string, UserPermissions> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private accessRequests: PanelAccessRequest[] = [];

  /**
   * Initialize user permissions for a new user
   */
  initializeUser(userId: string, role: UserRole, grantedBy?: string): UserPermissions {
    const roleDefinition = ROLE_DEFINITIONS[role];
    const userPermissions: UserPermissions = {
      userId,
      role,
      permissions: [...roleDefinition.permissions],
      panelAccess: [...roleDefinition.panelAccess],
      accessLevel: roleDefinition.accessLevel,
      grantedBy,
      grantedAt: new Date(),
      restrictions: []
    };

    this.userPermissions.set(userId, userPermissions);
    this.logAuditEvent(userId, 'role_assigned', 'user', userId, {
      role,
      grantedBy,
      permissions: userPermissions.permissions
    });

    return userPermissions;
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userId: string, permission: Permission): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    // Check for restrictions
    const restriction = userPerms.restrictions?.find(r => r.permission === permission);
    if (restriction) {
      return this.evaluateRestriction(userId, restriction);
    }

    return RoleUtils.hasPermission(userPerms.permissions, permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(userId: string, permissions: Permission[]): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    return RoleUtils.hasAnyPermission(userPerms.permissions, permissions);
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(userId: string, permissions: Permission[]): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    return RoleUtils.hasAllPermissions(userPerms.permissions, permissions);
  }

  /**
   * Check if a user can access a specific panel
   */
  canAccessPanel(userId: string, panelType: PanelType): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    return RoleUtils.canAccessPanel(userPerms.role, userPerms.permissions, panelType);
  }

  /**
   * Get user's current role
   */
  getUserRole(userId: string): UserRole | null {
    const userPerms = this.userPermissions.get(userId);
    return userPerms?.role || null;
  }

  /**
   * Get user's permissions
   */
  getUserPermissions(userId: string): Permission[] | null {
    const userPerms = this.userPermissions.get(userId);
    return userPerms?.permissions || null;
  }

  /**
   * Get user's accessible panels
   */
  getUserPanelAccess(userId: string): PanelType[] | null {
    const userPerms = this.userPermissions.get(userId);
    return userPerms?.panelAccess || null;
  }

  /**
   * Grant additional permissions to a user
   */
  grantPermissions(userId: string, permissions: Permission[], grantedBy: string, expiresAt?: Date): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    const newPermissions = [...new Set([...userPerms.permissions, ...permissions])];
    const newPanelAccess = this.calculatePanelAccess(newPermissions);

    userPerms.permissions = newPermissions;
    userPerms.panelAccess = newPanelAccess;
    if (expiresAt) {
      userPerms.expiresAt = expiresAt;
    }

    this.logAuditEvent(userId, 'permissions_granted', 'user', userId, {
      permissions,
      grantedBy,
      expiresAt
    });

    return true;
  }

  /**
   * Revoke permissions from a user
   */
  revokePermissions(userId: string, permissions: Permission[], revokedBy: string): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    const remainingPermissions = userPerms.permissions.filter(p => !permissions.includes(p));
    const newPanelAccess = this.calculatePanelAccess(remainingPermissions);

    userPerms.permissions = remainingPermissions;
    userPerms.panelAccess = newPanelAccess;

    this.logAuditEvent(userId, 'permissions_revoked', 'user', userId, {
      permissions,
      revokedBy
    });

    return true;
  }

  /**
   * Change user's role
   */
  changeUserRole(userId: string, newRole: UserRole, changedBy: string): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    const oldRole = userPerms.role;
    const newRoleDefinition = ROLE_DEFINITIONS[newRole];

    userPerms.role = newRole;
    userPerms.permissions = [...newRoleDefinition.permissions];
    userPerms.panelAccess = [...newRoleDefinition.panelAccess];
    userPerms.accessLevel = newRoleDefinition.accessLevel;

    this.logAuditEvent(userId, 'role_changed', 'user', userId, {
      oldRole,
      newRole,
      changedBy
    });

    return true;
  }

  /**
   * Add permission restriction for a user
   */
  addPermissionRestriction(userId: string, restriction: PermissionRestriction, addedBy: string): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    if (!userPerms.restrictions) {
      userPerms.restrictions = [];
    }

    userPerms.restrictions.push(restriction);

    this.logAuditEvent(userId, 'restriction_added', 'user', userId, {
      restriction,
      addedBy
    });

    return true;
  }

  /**
   * Remove permission restriction for a user
   */
  removePermissionRestriction(userId: string, permission: Permission, removedBy: string): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms || !userPerms.restrictions) return false;

    const initialLength = userPerms.restrictions.length;
    userPerms.restrictions = userPerms.restrictions.filter(r => r.permission !== permission);

    if (userPerms.restrictions.length < initialLength) {
      this.logAuditEvent(userId, 'restriction_removed', 'user', userId, {
        permission,
        removedBy
      });
      return true;
    }

    return false;
  }

  /**
   * Request access to a panel
   */
  requestPanelAccess(userId: string, panelType: PanelType, permissions: Permission[], reason?: string): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: PanelAccessRequest = {
      userId,
      panelType,
      requestedPermissions: permissions,
      reason,
      requestedAt: new Date(),
      status: 'pending'
    };

    this.accessRequests.push(request);

    this.logAuditEvent(userId, 'panel_access_requested', 'panel', panelType, {
      requestId,
      permissions,
      reason
    });

    return requestId;
  }

  /**
   * Approve panel access request
   */
  approvePanelAccess(requestId: string, approvedBy: string): boolean {
    const request = this.accessRequests.find(r => r.userId === requestId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'approved';
    request.reviewedBy = approvedBy;
    request.reviewedAt = new Date();

    // Grant the requested permissions
    this.grantPermissions(request.userId, request.requestedPermissions, approvedBy);

    this.logAuditEvent(request.userId, 'panel_access_approved', 'panel', request.panelType, {
      requestId,
      approvedBy,
      permissions: request.requestedPermissions
    });

    return true;
  }

  /**
   * Deny panel access request
   */
  denyPanelAccess(requestId: string, deniedBy: string, reason?: string): boolean {
    const request = this.accessRequests.find(r => r.userId === requestId);
    if (!request || request.status !== 'pending') return false;

    request.status = 'denied';
    request.reviewedBy = deniedBy;
    request.reviewedAt = new Date();

    this.logAuditEvent(request.userId, 'panel_access_denied', 'panel', request.panelType, {
      requestId,
      deniedBy,
      reason
    });

    return true;
  }

  /**
   * Get pending access requests
   */
  getPendingAccessRequests(): PanelAccessRequest[] {
    return this.accessRequests.filter(r => r.status === 'pending');
  }

  /**
   * Get audit log entries
   */
  getAuditLogs(userId?: string, limit: number = 100): AuditLogEntry[] {
    let logs = userId
      ? this.auditLogs.filter(log => log.userId === userId)
      : this.auditLogs;

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get users with specific role
   */
  getUsersByRole(role: UserRole): string[] {
    return Array.from(this.userPermissions.entries())
      .filter(([, perms]) => perms.role === role)
      .map(([userId]) => userId);
  }

  /**
   * Get users with specific permission
   */
  getUsersByPermission(permission: Permission): string[] {
    return Array.from(this.userPermissions.entries())
      .filter(([, perms]) => perms.permissions.includes(permission))
      .map(([userId]) => userId);
  }

  /**
   * Clean up expired permissions
   */
  cleanupExpiredPermissions(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, userPerms] of this.userPermissions.entries()) {
      if (userPerms.expiresAt && userPerms.expiresAt < now) {
        this.userPermissions.delete(userId);
        cleanedCount++;

        this.logAuditEvent(userId, 'permissions_expired', 'user', userId, {
          expiredAt: userPerms.expiresAt
        });
      }
    }

    return cleanedCount;
  }

  /**
   * Get access control statistics
   */
  getAccessControlStats(): {
    totalUsers: number;
    usersByRole: Record<UserRole, number>;
    pendingRequests: number;
    recentActivity: number;
  } {
    const usersByRole: Record<UserRole, number> = {} as Record<UserRole, number>;

    for (const userPerms of this.userPermissions.values()) {
      usersByRole[userPerms.role] = (usersByRole[userPerms.role] || 0) + 1;
    }

    const recentActivity = this.auditLogs.filter(
      log => log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    ).length;

    return {
      totalUsers: this.userPermissions.size,
      usersByRole,
      pendingRequests: this.getPendingAccessRequests().length,
      recentActivity
    };
  }

  /**
   * Private helper methods
   */
  private evaluateRestriction(userId: string, restriction: PermissionRestriction): boolean {
    // Basic restriction evaluation - can be extended for complex scenarios
    if (restriction.resourceType && restriction.resourceId) {
      // Resource-specific restrictions would need additional context
      // For now, deny access if there are resource restrictions
      return false;
    }

    if (restriction.conditions) {
      // Evaluate custom conditions
      // This would need to be extended based on specific requirements
      return this.evaluateConditions(userId, restriction.conditions);
    }

    return false; // Deny if restriction exists but can't be evaluated
  }

  private evaluateConditions(userId: string, conditions: Record<string, any>): boolean {
    // Placeholder for condition evaluation logic
    // This would be extended based on specific business rules
    return true;
  }

  private calculatePanelAccess(permissions: Permission[]): PanelType[] {
    const accessiblePanels: PanelType[] = [];

    for (const panelType of Object.values(PanelType)) {
      if (RoleUtils.hasAllPermissions(permissions, PANEL_REQUIREMENTS[panelType].requiredPermissions)) {
        accessiblePanels.push(panelType);
      }
    }

    return accessiblePanels;
  }

  private logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resource,
      resourceId,
      details,
      timestamp: new Date(),
      success: true
    };

    this.auditLogs.push(entry);

    // Keep only last 10000 entries to prevent memory issues
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }
  }
}

// Singleton instance
export const accessControlManager = new AccessControlManager();