import { securityManager } from '../../security/core/SecurityManager';
import { AuditLogger, AuditEventType } from '../../security/audit/AuditLogger';
import {
  PolicyRule,
  PolicyCategory,
  PolicySeverity,
  PolicyCondition,
  PolicyOperator,
  LogicalOperator,
  PolicyAction,
  PolicyActionType,
  PolicyViolation,
  ViolationStatus,
  LegalEvent,
  LegalEventType
} from '../types';

/**
 * Policy Enforcement Engine
 * Provides automated policy enforcement mechanisms for PlayNite
 */
export class PolicyEnforcementEngine {
  private rules: Map<string, PolicyRule> = new Map();
  private violations: Map<string, PolicyViolation> = new Map();
  private auditLogger: AuditLogger;
  private events: LegalEvent[] = [];

  constructor() {
    this.auditLogger = new AuditLogger();
    this.initializeDefaultRules();
  }

  /**
   * Create a new policy rule
   */
  async createRule(rule: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PolicyRule> {
    // Security validation
    const securityContext = {
      userId: rule.createdBy,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_POLICY_RULE',
      resource: `policy:${rule.category}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newRule: PolicyRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(newRule.id, newRule);

    // Log the rule creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: rule.createdBy,
      operation: 'CREATE_POLICY_RULE',
      resource: newRule.id,
      metadata: {
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity
      },
      success: true
    });

    return newRule;
  }

  /**
   * Evaluate content against all active policy rules
   */
  async evaluateContent(
    content: {
      userId?: string;
      content: string;
      contentType: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    violations: PolicyViolation[];
    actions: PolicyAction[];
    riskScore: number;
  }> {
    const activeRules = Array.from(this.rules.values()).filter(rule => rule.isActive);
    const violations: PolicyViolation[] = [];
    const actions: PolicyAction[] = [];
    let riskScore = 0;

    for (const rule of activeRules) {
      const evaluation = await this.evaluateRule(rule, content);

      if (!evaluation.passed) {
        const violation = await this.createViolation(rule, content, evaluation.reason || 'Policy rule violation');
        violations.push(violation);

        // Add rule actions to response
        actions.push(...rule.actions);

        // Calculate risk score based on severity
        riskScore += this.getSeverityWeight(rule.severity);

        // Log the violation
        await this.auditLogger.logSecurityEvent({
          type: AuditEventType.SECURITY_VIOLATION,
          userId: content.userId,
          operation: 'POLICY_VIOLATION',
          resource: content.contentType,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            reason: evaluation.reason
          },
          success: false
        });

        // Record legal event
        this.recordEvent(LegalEventType.POLICY_VIOLATION, {
          ruleId: rule.id,
          userId: content.userId,
          contentType: content.contentType,
          severity: rule.severity
        });
      }
    }

    // Normalize risk score (0-100)
    riskScore = Math.min(100, riskScore);

    return {
      allowed: violations.length === 0,
      violations,
      actions,
      riskScore
    };
  }

  /**
   * Evaluate a specific rule against content
   */
  async evaluateRule(
    rule: PolicyRule,
    content: {
      userId?: string;
      content: string;
      contentType: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    passed: boolean;
    reason?: string;
  }> {
    try {
      for (const condition of rule.conditions) {
        const result = await this.evaluateCondition(condition, content);

        if (condition.logicalOperator === LogicalOperator.OR && result) {
          continue; // OR condition passed
        }

        if (condition.logicalOperator === LogicalOperator.AND && !result) {
          return {
            passed: false,
            reason: `Failed condition: ${condition.field} ${condition.operator} ${condition.value}`
          };
        }
      }

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        reason: `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: PolicyCondition,
    content: {
      userId?: string;
      content: string;
      contentType: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    const fieldValue = this.extractFieldValue(condition.field, content);

    switch (condition.operator) {
      case PolicyOperator.EQUALS:
        return fieldValue === condition.value;

      case PolicyOperator.NOT_EQUALS:
        return fieldValue !== condition.value;

      case PolicyOperator.CONTAINS:
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());

      case PolicyOperator.NOT_CONTAINS:
        return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());

      case PolicyOperator.GREATER_THAN:
        return Number(fieldValue) > Number(condition.value);

      case PolicyOperator.LESS_THAN:
        return Number(fieldValue) < Number(condition.value);

      case PolicyOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);

      case PolicyOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);

      case PolicyOperator.REGEX:
        const regex = new RegExp(condition.value, 'i');
        return regex.test(String(fieldValue));

      default:
        return false;
    }
  }

  /**
   * Extract field value from content object
   */
  private extractFieldValue(field: string, content: any): any {
    const keys = field.split('.');
    let value: any = content;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Create a policy violation record
   */
  private async createViolation(
    rule: PolicyRule,
    content: {
      userId?: string;
      content: string;
      contentType: string;
      metadata?: Record<string, any>;
    },
    reason: string
  ): Promise<PolicyViolation> {
    const violationId = `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const violation: PolicyViolation = {
      id: violationId,
      ruleId: rule.id,
      userId: content.userId,
      resourceId: content.metadata?.resourceId,
      resourceType: content.contentType,
      violationType: rule.name,
      severity: rule.severity,
      description: reason,
      detectedAt: new Date(),
      status: ViolationStatus.OPEN,
      actions: rule.actions,
      metadata: content.metadata
    };

    this.violations.set(violationId, violation);

    return violation;
  }

  /**
   * Get all policy violations
   */
  async getViolations(filters?: {
    status?: ViolationStatus;
    severity?: PolicySeverity;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PolicyViolation[]> {
    let violations = Array.from(this.violations.values());

    if (filters?.status) {
      violations = violations.filter(v => v.status === filters.status);
    }

    if (filters?.severity) {
      violations = violations.filter(v => v.severity === filters.severity);
    }

    if (filters?.userId) {
      violations = violations.filter(v => v.userId === filters.userId);
    }

    if (filters?.startDate) {
      violations = violations.filter(v => v.detectedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      violations = violations.filter(v => v.detectedAt <= filters.endDate!);
    }

    return violations.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Resolve a policy violation
   */
  async resolveViolation(
    violationId: string,
    resolvedBy: string,
    resolution?: string
  ): Promise<void> {
    const violation = this.violations.get(violationId);
    if (!violation) {
      throw new Error(`Violation not found: ${violationId}`);
    }

    // Security validation
    const securityContext = {
      userId: resolvedBy,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'RESOLVE_POLICY_VIOLATION',
      resource: `violation:${violationId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    violation.status = ViolationStatus.RESOLVED;
    violation.resolvedAt = new Date();
    violation.resolvedBy = resolvedBy;
    this.violations.set(violationId, violation);

    // Log the resolution
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: resolvedBy,
      operation: 'RESOLVE_POLICY_VIOLATION',
      resource: violationId,
      metadata: {
        originalViolation: violation.violationType,
        severity: violation.severity,
        resolution
      },
      success: true
    });
  }

  /**
   * Get policy enforcement statistics
   */
  async getEnforcementStatistics(): Promise<Record<string, any>> {
    const violations = Array.from(this.violations.values());
    const rules = Array.from(this.rules.values());

    const stats = {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      totalViolations: violations.length,
      openViolations: violations.filter(v => v.status === ViolationStatus.OPEN).length,
      resolvedViolations: violations.filter(v => v.status === ViolationStatus.RESOLVED).length,
      violationsBySeverity: {} as Record<PolicySeverity, number>,
      violationsByCategory: {} as Record<PolicyCategory, number>,
      recentViolations: violations.filter(v =>
        v.detectedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      averageResolutionTime: this.calculateAverageResolutionTime(violations)
    };

    // Count by severity
    for (const violation of violations) {
      stats.violationsBySeverity[violation.severity] =
        (stats.violationsBySeverity[violation.severity] || 0) + 1;
    }

    // Count by category (from rules)
    for (const violation of violations) {
      const rule = this.rules.get(violation.ruleId);
      if (rule) {
        stats.violationsByCategory[rule.category] =
          (stats.violationsByCategory[rule.category] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Update rule status
   */
  async updateRuleStatus(ruleId: string, isActive: boolean, updatedBy: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Security validation
    const securityContext = {
      userId: updatedBy,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'UPDATE_POLICY_RULE',
      resource: `rule:${ruleId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    rule.isActive = isActive;
    rule.updatedAt = new Date();
    this.rules.set(ruleId, rule);

    // Log the update
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: updatedBy,
      operation: 'UPDATE_POLICY_RULE',
      resource: ruleId,
      metadata: {
        ruleName: rule.name,
        isActive,
        category: rule.category
      },
      success: true
    });
  }

  /**
   * Get rules by category
   */
  async getRulesByCategory(category: PolicyCategory): Promise<PolicyRule[]> {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string, deletedBy: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Security validation
    const securityContext = {
      userId: deletedBy,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'DELETE_POLICY_RULE',
      resource: `rule:${ruleId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    this.rules.delete(ruleId);

    // Log the deletion
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: deletedBy,
      operation: 'DELETE_POLICY_RULE',
      resource: ruleId,
      metadata: {
        ruleName: rule.name,
        category: rule.category
      },
      success: true
    });
  }

  /**
   * Private helper methods
   */
  private initializeDefaultRules(): void {
    // Initialize with common policy rules
    const defaultRules: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'No Personal Information in Public Content',
        description: 'Prevent users from sharing personal information in public content',
        category: PolicyCategory.PRIVACY,
        severity: PolicySeverity.HIGH,
        isActive: true,
        conditions: [
          {
            field: 'content',
            operator: PolicyOperator.REGEX,
            value: '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN pattern
            logicalOperator: LogicalOperator.OR
          },
          {
            field: 'content',
            operator: PolicyOperator.REGEX,
            value: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email pattern
            logicalOperator: LogicalOperator.OR
          }
        ],
        actions: [
          {
            type: PolicyActionType.BLOCK,
            message: 'Content contains personal information'
          },
          {
            type: PolicyActionType.NOTIFY,
            parameters: { recipient: 'moderator' }
          }
        ],
        createdBy: 'system'
      },
      {
        name: 'No Inappropriate Content',
        description: 'Block inappropriate or offensive content',
        category: PolicyCategory.USER_CONTENT,
        severity: PolicySeverity.MEDIUM,
        isActive: true,
        conditions: [
          {
            field: 'content',
            operator: PolicyOperator.CONTAINS,
            value: 'inappropriate_word',
            logicalOperator: LogicalOperator.OR
          }
        ],
        actions: [
          {
            type: PolicyActionType.WARN,
            message: 'Content may be inappropriate'
          }
        ],
        createdBy: 'system'
      }
    ];

    // Note: In a real implementation, these would be loaded from configuration
    // For now, we'll start with empty rules and let admins create them
  }

  private getSeverityWeight(severity: PolicySeverity): number {
    switch (severity) {
      case PolicySeverity.CRITICAL: return 100;
      case PolicySeverity.HIGH: return 75;
      case PolicySeverity.MEDIUM: return 50;
      case PolicySeverity.LOW: return 25;
      default: return 0;
    }
  }

  private calculateAverageResolutionTime(violations: PolicyViolation[]): number {
    const resolvedViolations = violations.filter(v => v.resolvedAt);

    if (resolvedViolations.length === 0) return 0;

    const totalTime = resolvedViolations.reduce((sum, violation) => {
      return sum + (violation.resolvedAt!.getTime() - violation.detectedAt.getTime());
    }, 0);

    return totalTime / resolvedViolations.length / (1000 * 60 * 60); // Convert to hours
  }

  private recordEvent(type: LegalEventType, details: Record<string, any>): void {
    const event: LegalEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      details,
      source: 'PolicyEnforcementEngine'
    };

    this.events.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
}