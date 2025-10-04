import {
  AuditLogEntry,
  PanelType,
  UserRole,
  Permission,
  PanelAccessRequest
} from '../types';
import { panelSecurityManager } from './PanelSecurityManager';

/**
 * PanelAuditManager
 * Comprehensive audit logging and security monitoring for panel operations
 */
export class PanelAuditManager {
  private auditLogs: AuditLogEntry[] = [];
  private complianceReports: ComplianceReport[] = [];
  private securityIncidents: SecurityIncident[] = [];
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  constructor() {
    this.initializeDefaultRetentionPolicies();
    this.startAuditMaintenance();
  }

  /**
   * Log panel access attempt
   */
  logPanelAccess(
    userId: string,
    panelType: PanelType,
    success: boolean,
    context: AuditContext,
    metadata?: Record<string, any>
  ): string {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action: 'panel_access',
      resource: panelType,
      resourceId: panelType,
      details: {
        success,
        context,
        metadata,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success,
      errorMessage: success ? undefined : metadata?.error || 'Access denied'
    };

    this.auditLogs.push(entry);

    // Check for security incidents
    if (!success) {
      this.checkForSecurityIncident(userId, panelType, context, metadata);
    }

    // Apply retention policy
    this.applyRetentionPolicy('panel_access', entry);

    return entry.id;
  }

  /**
   * Log panel action
   */
  logPanelAction(
    userId: string,
    panelType: PanelType,
    action: string,
    context: AuditContext,
    details?: Record<string, any>
  ): string {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resource: panelType,
      resourceId: `${panelType}_${action}`,
      details: {
        ...details,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: true
    };

    this.auditLogs.push(entry);

    // Apply retention policy
    this.applyRetentionPolicy('panel_action', entry);

    return entry.id;
  }

  /**
   * Log permission change
   */
  logPermissionChange(
    targetUserId: string,
    changedBy: string,
    permission: Permission,
    action: 'grant' | 'revoke' | 'modify',
    context: AuditContext,
    reason?: string
  ): string {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: changedBy,
      action: `permission_${action}`,
      resource: 'user_permissions',
      resourceId: `${targetUserId}_${permission}`,
      details: {
        targetUserId,
        permission,
        action,
        reason,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: true
    };

    this.auditLogs.push(entry);

    // Apply retention policy
    this.applyRetentionPolicy('permission_change', entry);

    return entry.id;
  }

  /**
   * Log role change
   */
  logRoleChange(
    targetUserId: string,
    oldRole: UserRole,
    newRole: UserRole,
    changedBy: string,
    context: AuditContext,
    reason?: string
  ): string {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: changedBy,
      action: 'role_change',
      resource: 'user_role',
      resourceId: targetUserId,
      details: {
        targetUserId,
        oldRole,
        newRole,
        reason,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: true
    };

    this.auditLogs.push(entry);

    // Apply retention policy
    this.applyRetentionPolicy('role_change', entry);

    return entry.id;
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    userId: string,
    eventType: SecurityEventType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    context: AuditContext,
    details?: Record<string, any>
  ): string {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action: 'security_event',
      resource: 'security',
      resourceId: `${eventType}_${Date.now()}`,
      details: {
        eventType,
        severity,
        description,
        ...details,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: false // Security events are typically failures or warnings
    };

    this.auditLogs.push(entry);

    // Create security incident if severity is high or critical
    if (severity === 'high' || severity === 'critical') {
      this.createSecurityIncident(eventType, severity, description, userId, context, details);
    }

    // Apply retention policy
    this.applyRetentionPolicy('security_event', entry);

    return entry.id;
  }

  /**
   * Query audit logs with advanced filtering
   */
  queryAuditLogs(query: AuditQuery): AuditQueryResult {
    let results = [...this.auditLogs];

    // Apply filters
    if (query.userId) {
      results = results.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      results = results.filter(log => log.action === query.action);
    }

    if (query.resource) {
      results = results.filter(log => log.resource === query.resource);
    }

    if (query.panelType) {
      results = results.filter(log => log.resource === query.panelType);
    }

    if (query.dateFrom) {
      results = results.filter(log => log.timestamp >= query.dateFrom!);
    }

    if (query.dateTo) {
      results = results.filter(log => log.timestamp <= query.dateTo!);
    }

    if (query.ipAddress) {
      results = results.filter(log => log.ipAddress === query.ipAddress);
    }

    if (query.success !== undefined) {
      results = results.filter(log => log.success === query.success);
    }

    // Apply sorting
    results.sort((a, b) => {
      const aTime = a.timestamp.getTime();
      const bTime = b.timestamp.getTime();
      return query.sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

    // Apply pagination
    const total = results.length;
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      logs: paginatedResults,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReportType,
    timeRange: { start: Date; end: Date },
    options?: ComplianceReportOptions
  ): Promise<ComplianceReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Gather relevant audit data
    const relevantLogs = this.auditLogs.filter(log =>
      log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
    );

    // Generate report based on type
    let reportData: any = {};

    switch (reportType) {
      case 'access_summary':
        reportData = this.generateAccessSummaryReport(relevantLogs);
        break;
      case 'security_incidents':
        reportData = this.generateSecurityIncidentsReport(relevantLogs);
        break;
      case 'permission_changes':
        reportData = this.generatePermissionChangesReport(relevantLogs);
        break;
      case 'user_activity':
        reportData = this.generateUserActivityReport(relevantLogs);
        break;
      case 'full_audit':
        reportData = this.generateFullAuditReport(relevantLogs);
        break;
    }

    const report: ComplianceReport = {
      id: reportId,
      type: reportType,
      title: this.getReportTitle(reportType),
      timeRange,
      generatedAt: new Date(),
      generatedBy: options?.generatedBy || 'system',
      data: reportData,
      summary: this.generateReportSummary(reportData),
      recommendations: this.generateReportRecommendations(reportType, reportData)
    };

    this.complianceReports.push(report);
    return report;
  }

  /**
   * Get security incidents
   */
  getSecurityIncidents(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    status?: 'open' | 'investigating' | 'resolved'
  ): SecurityIncident[] {
    let incidents = [...this.securityIncidents];

    if (severity) {
      incidents = incidents.filter(i => i.severity === severity);
    }

    if (status) {
      incidents = incidents.filter(i => i.status === status);
    }

    return incidents.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Update security incident status
   */
  updateSecurityIncident(
    incidentId: string,
    status: 'open' | 'investigating' | 'resolved',
    updatedBy: string,
    notes?: string
  ): boolean {
    const incident = this.securityIncidents.find(i => i.id === incidentId);
    if (!incident) return false;

    incident.status = status;
    incident.updatedBy = updatedBy;
    incident.updatedAt = new Date();
    if (notes) {
      incident.notes = notes;
    }

    // Log the status update
    this.logSecurityEvent(
      updatedBy,
      'incident_update',
      'medium',
      `Security incident ${incidentId} updated to ${status}`,
      {
        ipAddress: 'system',
        userAgent: 'system'
      },
      { incidentId, status, notes }
    );

    return true;
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(timeRange?: { start: Date; end: Date }): AuditStatistics {
    let logs = this.auditLogs;

    if (timeRange) {
      logs = logs.filter(log =>
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const totalLogs = logs.length;
    const successfulActions = logs.filter(log => log.success).length;
    const failedActions = totalLogs - successfulActions;

    // Group by action type
    const actionsByType = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by panel type
    const actionsByPanel = logs.reduce((acc, log) => {
      if (log.resource in Object.values(PanelType)) {
        acc[log.resource as PanelType] = (acc[log.resource as PanelType] || 0) + 1;
      }
      return acc;
    }, {} as Record<PanelType, number>);

    // Group by user
    const actionsByUser = logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs,
      successfulActions,
      failedActions,
      successRate: totalLogs > 0 ? (successfulActions / totalLogs) * 100 : 0,
      actionsByType,
      actionsByPanel,
      actionsByUser,
      timeRange
    };
  }

  /**
   * Export audit logs
   */
  exportAuditLogs(
    format: 'json' | 'csv' | 'xml',
    query?: AuditQuery
  ): string {
    const logs = query ? this.queryAuditLogs(query).logs : this.auditLogs;

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);

      case 'csv':
        return this.convertToCSV(logs);

      case 'xml':
        return this.convertToXML(logs);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Private helper methods
   */
  private checkForSecurityIncident(
    userId: string,
    panelType: PanelType,
    context: AuditContext,
    metadata?: Record<string, any>
  ): void {
    // Check for patterns that indicate security incidents
    const recentLogs = this.auditLogs.filter(log =>
      log.userId === userId &&
      log.resource === panelType &&
      !log.success &&
      log.timestamp.getTime() > Date.now() - 300000 // Last 5 minutes
    );

    // Multiple failed attempts
    if (recentLogs.length >= 5) {
      this.createSecurityIncident(
        'multiple_failed_access',
        'high',
        `Multiple failed access attempts to ${panelType}`,
        userId,
        context,
        { failedAttempts: recentLogs.length }
      );
    }

    // Suspicious IP pattern
    if (metadata?.suspiciousActivity) {
      this.createSecurityIncident(
        'suspicious_activity',
        'critical',
        'Suspicious activity detected',
        userId,
        context,
        metadata
      );
    }
  }

  private createSecurityIncident(
    type: SecurityEventType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    userId: string,
    context: AuditContext,
    details?: Record<string, any>
  ): void {
    const incident: SecurityIncident = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      description,
      userId,
      detectedAt: new Date(),
      status: 'open',
      context,
      details
    };

    this.securityIncidents.push(incident);

    // Log the incident
    this.logSecurityEvent(
      userId,
      type,
      severity,
      description,
      context,
      details
    );
  }

  private initializeDefaultRetentionPolicies(): void {
    // Panel access logs: 90 days
    this.retentionPolicies.set('panel_access', {
      type: 'panel_access',
      duration: 90 * 24 * 60 * 60 * 1000, // 90 days
      autoDelete: true
    });

    // Security events: 1 year
    this.retentionPolicies.set('security_event', {
      type: 'security_event',
      duration: 365 * 24 * 60 * 60 * 1000, // 1 year
      autoDelete: true
    });

    // Permission changes: 2 years
    this.retentionPolicies.set('permission_change', {
      type: 'permission_change',
      duration: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      autoDelete: true
    });

    // User actions: 30 days
    this.retentionPolicies.set('panel_action', {
      type: 'panel_action',
      duration: 30 * 24 * 60 * 60 * 1000, // 30 days
      autoDelete: true
    });
  }

  private applyRetentionPolicy(type: string, entry: AuditLogEntry): void {
    const policy = this.retentionPolicies.get(type);
    if (policy?.autoDelete) {
      // In a real system, this would mark for deletion after the duration
      entry.details = {
        ...entry.details,
        retentionPolicy: policy.duration,
        deleteAfter: new Date(entry.timestamp.getTime() + policy.duration)
      };
    }
  }

  private startAuditMaintenance(): void {
    // Clean up old logs based on retention policies
    setInterval(() => {
      this.performMaintenance();
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  private performMaintenance(): void {
    const now = Date.now();

    // Apply retention policies
    for (const [type, policy] of this.retentionPolicies.entries()) {
      if (policy.autoDelete) {
        const cutoffTime = now - policy.duration;

        // Remove old entries (in a real system, this would be more efficient)
        this.auditLogs = this.auditLogs.filter(log => {
          const logTime = log.timestamp.getTime();
          return logTime > cutoffTime;
        });
      }
    }

    console.log(`Audit maintenance completed. ${this.auditLogs.length} logs remaining.`);
  }

  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = ['id', 'userId', 'action', 'resource', 'timestamp', 'success', 'ipAddress'];
    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.userId,
        log.action,
        log.resource,
        log.timestamp.toISOString(),
        log.success,
        log.ipAddress
      ].join(','))
    ];
    return csvRows.join('\n');
  }

  private convertToXML(logs: AuditLogEntry[]): string {
    const logElements = logs.map(log => `
  <audit_log>
    <id>${log.id}</id>
    <user_id>${log.userId}</user_id>
    <action>${log.action}</action>
    <resource>${log.resource}</resource>
    <timestamp>${log.timestamp.toISOString()}</timestamp>
    <success>${log.success}</success>
    <ip_address>${log.ipAddress}</ip_address>
  </audit_log>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<audit_logs>
  ${logElements}
</audit_logs>`;
  }

  // Report generation methods
  private generateAccessSummaryReport(logs: AuditLogEntry[]): any {
    const accessLogs = logs.filter(log => log.action === 'panel_access');
    const uniqueUsers = new Set(accessLogs.map(log => log.userId)).size;
    const successfulAccess = accessLogs.filter(log => log.success).length;
    const failedAccess = accessLogs.length - successfulAccess;

    return {
      totalAccessAttempts: accessLogs.length,
      uniqueUsers,
      successfulAccess,
      failedAccess,
      successRate: accessLogs.length > 0 ? (successfulAccess / accessLogs.length) * 100 : 0
    };
  }

  private generateSecurityIncidentsReport(logs: AuditLogEntry[]): any {
    const securityLogs = logs.filter(log => log.action === 'security_event');
    const incidentsByType = securityLogs.reduce((acc, log) => {
      const type = log.details?.eventType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSecurityEvents: securityLogs.length,
      incidentsByType,
      criticalEvents: securityLogs.filter(log => log.details?.severity === 'critical').length,
      highSeverityEvents: securityLogs.filter(log => log.details?.severity === 'high').length
    };
  }

  private generatePermissionChangesReport(logs: AuditLogEntry[]): any {
    const permissionLogs = logs.filter(log =>
      log.action.startsWith('permission_') || log.action === 'role_change'
    );

    return {
      totalPermissionChanges: permissionLogs.length,
      roleChanges: permissionLogs.filter(log => log.action === 'role_change').length,
      permissionGrants: permissionLogs.filter(log => log.action === 'permission_grant').length,
      permissionRevocations: permissionLogs.filter(log => log.action === 'permission_revoke').length
    };
  }

  private generateUserActivityReport(logs: AuditLogEntry[]): any {
    const userActivity = logs.reduce((acc, log) => {
      if (!acc[log.userId]) {
        acc[log.userId] = {
          totalActions: 0,
          successfulActions: 0,
          failedActions: 0,
          panelsAccessed: new Set(),
          lastActivity: log.timestamp
        };
      }

      acc[log.userId].totalActions++;
      if (log.success) {
        acc[log.userId].successfulActions++;
      } else {
        acc[log.userId].failedActions++;
      }

      if (log.resource in Object.values(PanelType)) {
        acc[log.userId].panelsAccessed.add(log.resource as PanelType);
      }

      if (log.timestamp > acc[log.userId].lastActivity) {
        acc[log.userId].lastActivity = log.timestamp;
      }

      return acc;
    }, {} as Record<string, any>);

    return {
      totalActiveUsers: Object.keys(userActivity).length,
      userActivity,
      mostActiveUsers: Object.entries(userActivity)
        .sort(([, a]: [string, any], [, b]: [string, any]) => b.totalActions - a.totalActions)
        .slice(0, 10)
    };
  }

  private generateFullAuditReport(logs: AuditLogEntry[]): any {
    return {
      summary: this.generateAccessSummaryReport(logs),
      security: this.generateSecurityIncidentsReport(logs),
      permissions: this.generatePermissionChangesReport(logs),
      users: this.generateUserActivityReport(logs),
      totalLogs: logs.length,
      dateRange: {
        earliest: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
        latest: logs.length > 0 ? logs[0].timestamp : null
      }
    };
  }

  private getReportTitle(reportType: ComplianceReportType): string {
    const titles = {
      access_summary: 'Panel Access Summary Report',
      security_incidents: 'Security Incidents Report',
      permission_changes: 'Permission Changes Report',
      user_activity: 'User Activity Report',
      full_audit: 'Comprehensive Audit Report'
    };
    return titles[reportType] || 'Audit Report';
  }

  private generateReportSummary(reportData: any): string {
    // Generate a human-readable summary based on report data
    return `Audit report generated with ${reportData.totalLogs || 0} log entries`;
  }

  private generateReportRecommendations(reportType: ComplianceReportType, reportData: any): string[] {
    const recommendations: string[] = [];

    switch (reportType) {
      case 'security_incidents':
        if (reportData.criticalEvents > 0) {
          recommendations.push('Immediate attention required for critical security events');
        }
        if (reportData.highSeverityEvents > 5) {
          recommendations.push('Review and strengthen security policies');
        }
        break;

      case 'access_summary':
        if (reportData.successRate < 95) {
          recommendations.push('Investigate access denial patterns');
        }
        break;
    }

    return recommendations;
  }
}

/**
 * Supporting interfaces and types
 */
interface AuditContext {
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  location?: string;
}

interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  panelType?: PanelType;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  success?: boolean;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

interface AuditQueryResult {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RetentionPolicy {
  type: string;
  duration: number; // milliseconds
  autoDelete: boolean;
}

type SecurityEventType =
  | 'multiple_failed_access'
  | 'suspicious_activity'
  | 'unauthorized_access'
  | 'privilege_escalation'
  | 'data_breach'
  | 'incident_update';

interface SecurityIncident {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId: string;
  detectedAt: Date;
  status: 'open' | 'investigating' | 'resolved';
  updatedBy?: string;
  updatedAt?: Date;
  notes?: string;
  context: AuditContext;
  details?: Record<string, any>;
}

interface AuditStatistics {
  totalLogs: number;
  successfulActions: number;
  failedActions: number;
  successRate: number;
  actionsByType: Record<string, number>;
  actionsByPanel: Record<PanelType, number>;
  actionsByUser: Record<string, number>;
  timeRange?: { start: Date; end: Date };
}

type ComplianceReportType =
  | 'access_summary'
  | 'security_incidents'
  | 'permission_changes'
  | 'user_activity'
  | 'full_audit';

interface ComplianceReportOptions {
  generatedBy?: string;
  includeDetails?: boolean;
  format?: 'summary' | 'detailed';
}

interface ComplianceReport {
  id: string;
  type: ComplianceReportType;
  title: string;
  timeRange: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;
  data: any;
  summary: string;
  recommendations: string[];
}

// Singleton instance
export const panelAuditManager = new PanelAuditManager();