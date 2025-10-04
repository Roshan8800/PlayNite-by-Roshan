import { securityManager } from '../../security/core/SecurityManager';
import { AuditLogger, AuditEventType } from '../../security/audit/AuditLogger';
import { ComplianceManager, ComplianceRegulation } from '../../security/compliance/ComplianceManager';
import {
  DataInventory,
  DataCategory,
  DataSensitivity,
  DataCollectionPoint,
  CollectionPointType,
  DataProcessingActivity,
  DataRetentionPolicy,
  DeletionMethod,
  DataAccessControl,
  AccessLevel,
  LegalRequirement,
  ImplementationStatus,
  LegalRisk,
  RiskCategory,
  RiskProbability,
  RiskImpact,
  RiskStatus,
  LegalEvent,
  LegalEventType
} from '../types';

/**
 * Data Governance Manager
 * Handles data governance and regulatory compliance for PlayNite
 */
export class DataGovernanceManager {
  private dataInventory: Map<string, DataInventory> = new Map();
  private dataCategories: Map<string, DataCategory> = new Map();
  private collectionPoints: Map<string, DataCollectionPoint> = new Map();
  private processingActivities: Map<string, DataProcessingActivity> = new Map();
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private accessControls: Map<string, DataAccessControl> = new Map();
  private legalRequirements: Map<string, LegalRequirement> = new Map();
  private legalRisks: Map<string, LegalRisk> = new Map();
  private auditLogger: AuditLogger;
  private complianceManager: ComplianceManager;
  private events: LegalEvent[] = [];

  constructor() {
    this.auditLogger = new AuditLogger();
    this.complianceManager = new ComplianceManager();
    this.initializeDataGovernance();
  }

  /**
   * Create data category
   */
  async createDataCategory(category: Omit<DataCategory, 'id'>): Promise<DataCategory> {
    // Security validation
    const securityContext = {
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_DATA_CATEGORY',
      resource: `data-category:${category.name}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newCategory: DataCategory = {
      ...category,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.dataCategories.set(newCategory.id, newCategory);

    // Log the creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: 'system',
      operation: 'CREATE_DATA_CATEGORY',
      resource: newCategory.id,
      metadata: {
        categoryName: category.name,
        sensitivity: category.sensitivity,
        regulations: category.regulations
      },
      success: true
    });

    return newCategory;
  }

  /**
   * Create data collection point
   */
  async createCollectionPoint(point: Omit<DataCollectionPoint, 'id'>): Promise<DataCollectionPoint> {
    const securityContext = {
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_COLLECTION_POINT',
      resource: `collection-point:${point.name}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newPoint: DataCollectionPoint = {
      ...point,
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.collectionPoints.set(newPoint.id, newPoint);

    // Log the creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: 'system',
      operation: 'CREATE_COLLECTION_POINT',
      resource: newPoint.id,
      metadata: {
        pointName: point.name,
        type: point.type,
        purpose: point.purpose
      },
      success: true
    });

    return newPoint;
  }

  /**
   * Create data processing activity
   */
  async createProcessingActivity(activity: Omit<DataProcessingActivity, 'id'>): Promise<DataProcessingActivity> {
    const securityContext = {
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_PROCESSING_ACTIVITY',
      resource: `processing-activity:${activity.name}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newActivity: DataProcessingActivity = {
      ...activity,
      id: `pa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.processingActivities.set(newActivity.id, newActivity);

    // Log the creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: 'system',
      operation: 'CREATE_PROCESSING_ACTIVITY',
      resource: newActivity.id,
      metadata: {
        activityName: activity.name,
        purpose: activity.purpose,
        legalBasis: activity.legalBasis
      },
      success: true
    });

    return newActivity;
  }

  /**
   * Create data retention policy
   */
  async createRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id'>): Promise<DataRetentionPolicy> {
    const securityContext = {
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_RETENTION_POLICY',
      resource: `retention-policy:${policy.name}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newPolicy: DataRetentionPolicy = {
      ...policy,
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.retentionPolicies.set(newPolicy.id, newPolicy);

    // Log the creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: 'system',
      operation: 'CREATE_RETENTION_POLICY',
      resource: newPolicy.id,
      metadata: {
        policyName: policy.name,
        retentionPeriod: policy.retentionPeriod,
        deletionMethod: policy.deletionMethod
      },
      success: true
    });

    return newPolicy;
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetentionCompliance(dataType: string, dataAge: number): Promise<{
    compliant: boolean;
    policy?: DataRetentionPolicy;
    action?: 'delete' | 'anonymize' | 'retain';
    reason: string;
    dueDate?: Date;
  }> {
    const policy = Array.from(this.retentionPolicies.values()).find(
      p => p.dataCategory === dataType
    );

    if (!policy) {
      return {
        compliant: true,
        reason: 'No specific retention policy for this data type'
      };
    }

    const ageInDays = dataAge / (24 * 60 * 60 * 1000);

    if (ageInDays > policy.retentionPeriod) {
      if (policy.deletionMethod === DeletionMethod.LEGAL_HOLD) {
        return {
          compliant: false,
          policy,
          action: 'retain',
          reason: `Data under legal hold for ${policy.retentionPeriod} days`,
          dueDate: new Date(Date.now() + policy.retentionPeriod * 24 * 60 * 60 * 1000)
        };
      } else if (policy.deletionMethod === DeletionMethod.AUTOMATIC) {
        return {
          compliant: false,
          policy,
          action: 'delete',
          reason: `Data exceeds retention period of ${policy.retentionPeriod} days`
        };
      }
    }

    return {
      compliant: true,
      policy,
      reason: `Data is within retention period of ${policy.retentionPeriod} days`
    };
  }

  /**
   * Create legal requirement
   */
  async createLegalRequirement(requirement: Omit<LegalRequirement, 'id'>): Promise<LegalRequirement> {
    const securityContext = {
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_LEGAL_REQUIREMENT',
      resource: `legal-requirement:${requirement.name}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newRequirement: LegalRequirement = {
      ...requirement,
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.legalRequirements.set(newRequirement.id, newRequirement);

    // Log the creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: 'system',
      operation: 'CREATE_LEGAL_REQUIREMENT',
      resource: newRequirement.id,
      metadata: {
        requirementName: requirement.name,
        regulation: requirement.regulation,
        mandatory: requirement.mandatory
      },
      success: true
    });

    return newRequirement;
  }

  /**
   * Assess legal risk
   */
  async assessLegalRisk(risk: Omit<LegalRisk, 'id'>): Promise<LegalRisk> {
    const securityContext = {
      userId: 'system',
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'ASSESS_LEGAL_RISK',
      resource: `legal-risk:${risk.title}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newRisk: LegalRisk = {
      ...risk,
      id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.legalRisks.set(newRisk.id, newRisk);

    // Log the assessment
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.ADMIN_ACTION,
      userId: 'system',
      operation: 'ASSESS_LEGAL_RISK',
      resource: newRisk.id,
      metadata: {
        riskTitle: risk.title,
        category: risk.category,
        probability: risk.probability,
        impact: risk.impact
      },
      success: true
    });

    return newRisk;
  }

  /**
   * Generate data governance report
   */
  async generateDataGovernanceReport(): Promise<Record<string, any>> {
    const categories = Array.from(this.dataCategories.values());
    const collectionPoints = Array.from(this.collectionPoints.values());
    const processingActivities = Array.from(this.processingActivities.values());
    const retentionPolicies = Array.from(this.retentionPolicies.values());
    const requirements = Array.from(this.legalRequirements.values());
    const risks = Array.from(this.legalRisks.values());

    // Calculate compliance scores
    const implementedRequirements = requirements.filter(
      r => r.implementationStatus === ImplementationStatus.COMPLETED
    );

    const highRisks = risks.filter(
      r => r.status !== RiskStatus.MITIGATED && r.status !== RiskStatus.CLOSED
    );

    return {
      reportId: `governance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
      summary: {
        totalDataCategories: categories.length,
        totalCollectionPoints: collectionPoints.length,
        totalProcessingActivities: processingActivities.length,
        totalRetentionPolicies: retentionPolicies.length,
        complianceScore: Math.round((implementedRequirements.length / requirements.length) * 100),
        activeRisks: highRisks.length
      },
      dataCategories: categories,
      collectionPoints,
      processingActivities,
      retentionPolicies,
      legalRequirements: requirements,
      legalRisks: risks,
      recommendations: this.generateGovernanceRecommendations(categories, requirements, risks)
    };
  }

  /**
   * Get data processing basis for GDPR compliance
   */
  async getDataProcessingBasis(dataCategory: string): Promise<{
    lawfulBases: string[];
    retentionPolicies: DataRetentionPolicy[];
    securityMeasures: string[];
    thirdPartyTransfers: string[];
  }> {
    const category = Array.from(this.dataCategories.values()).find(
      c => c.name.toLowerCase() === dataCategory.toLowerCase()
    );

    if (!category) {
      throw new Error(`Data category not found: ${dataCategory}`);
    }

    const policies = Array.from(this.retentionPolicies.values()).filter(
      p => p.dataCategory === category.id
    );

    const activities = Array.from(this.processingActivities.values()).filter(
      a => a.dataCategories.includes(category.id)
    );

    return {
      lawfulBases: [...new Set(activities.map(a => a.legalBasis))],
      retentionPolicies: policies,
      securityMeasures: [...new Set(activities.flatMap(a => a.securityMeasures))],
      thirdPartyTransfers: [...new Set(activities.flatMap(a => a.processors))]
    };
  }

  /**
   * Check GDPR compliance for data processing
   */
  async checkGDPRCompliance(dataCategory: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const basis = await this.getDataProcessingBasis(dataCategory);

      // Check for lawful basis
      if (basis.lawfulBases.length === 0) {
        issues.push('No lawful basis identified for data processing');
        recommendations.push('Establish clear lawful basis for data processing');
      }

      // Check for retention policies
      if (basis.retentionPolicies.length === 0) {
        issues.push('No data retention policies defined');
        recommendations.push('Implement data retention policies');
      }

      // Check for security measures
      if (basis.securityMeasures.length === 0) {
        issues.push('No security measures identified');
        recommendations.push('Document security measures for data protection');
      }

      // Check for third-party transfer documentation
      if (basis.thirdPartyTransfers.length > 0) {
        recommendations.push('Ensure data processing agreements are in place for third-party transfers');
      }

    } catch (error) {
      issues.push(`Error checking GDPR compliance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate data subject request response (GDPR Article 15)
   */
  async generateDataSubjectRequest(userId: string, requestType: 'access' | 'portability' | 'erasure'): Promise<Record<string, any>> {
    // Security validation
    const securityContext = {
      userId,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'DATA_SUBJECT_REQUEST',
      resource: `user:${userId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const requestId = `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the request
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId,
      operation: 'DATA_SUBJECT_REQUEST',
      metadata: {
        requestType,
        requestId,
        gdpr: true
      },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.DATA_BREACH, {
      userId,
      requestType,
      requestId,
      action: 'DATA_SUBJECT_REQUEST_INITIATED'
    });

    return {
      requestId,
      userId,
      requestType,
      status: 'PROCESSING',
      requestedAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      description: this.getRequestDescription(requestType)
    };
  }

  /**
   * Private helper methods
   */
  private initializeDataGovernance(): void {
    // Initialize with common data categories and policies
    this.initializeDefaultDataCategories();
    this.initializeDefaultLegalRequirements();
  }

  private initializeDefaultDataCategories(): void {
    const defaultCategories: Omit<DataCategory, 'id'>[] = [
      {
        name: 'User Profile Data',
        description: 'Basic user profile information',
        sensitivity: DataSensitivity.INTERNAL,
        regulations: ['GDPR', 'CCPA'],
        retentionPeriod: 2555 // 7 years
      },
      {
        name: 'Usage Analytics',
        description: 'User behavior and analytics data',
        sensitivity: DataSensitivity.INTERNAL,
        regulations: ['GDPR'],
        retentionPeriod: 90 // 90 days
      },
      {
        name: 'Payment Information',
        description: 'Payment method and transaction data',
        sensitivity: DataSensitivity.RESTRICTED,
        regulations: ['GDPR', 'PCI-DSS'],
        retentionPeriod: 365 // 1 year
      }
    ];

    // Note: In a real implementation, these would be loaded from configuration
  }

  private initializeDefaultLegalRequirements(): void {
    const defaultRequirements: Omit<LegalRequirement, 'id'>[] = [
      {
        name: 'Data Protection Impact Assessment',
        description: 'Conduct DPIA for high-risk processing activities',
        regulation: 'GDPR',
        category: 'Privacy',
        mandatory: true,
        status: 'COMPLIANT' as any,
        implementationStatus: ImplementationStatus.IN_PROGRESS
      },
      {
        name: 'Data Subject Rights',
        description: 'Implement procedures for data subject rights',
        regulation: 'GDPR',
        category: 'Privacy',
        mandatory: true,
        status: 'COMPLIANT' as any,
        implementationStatus: ImplementationStatus.COMPLETED
      },
      {
        name: 'Breach Notification',
        description: 'Implement data breach notification procedures',
        regulation: 'GDPR',
        category: 'Security',
        mandatory: true,
        status: 'COMPLIANT' as any,
        implementationStatus: ImplementationStatus.COMPLETED
      }
    ];

    // Note: In a real implementation, these would be loaded from configuration
  }

  private generateGovernanceRecommendations(
    categories: DataCategory[],
    requirements: LegalRequirement[],
    risks: LegalRisk[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing retention policies
    const categoriesWithoutPolicies = categories.filter(cat => {
      return !Array.from(this.retentionPolicies.values()).some(
        policy => policy.dataCategory === cat.id
      );
    });

    if (categoriesWithoutPolicies.length > 0) {
      recommendations.push(`Create retention policies for ${categoriesWithoutPolicies.length} data categories`);
    }

    // Check for unimplemented requirements
    const unimplementedRequirements = requirements.filter(
      req => req.implementationStatus === ImplementationStatus.NOT_STARTED
    );

    if (unimplementedRequirements.length > 0) {
      recommendations.push(`Implement ${unimplementedRequirements.length} pending legal requirements`);
    }

    // Check for high-priority risks
    const highPriorityRisks = risks.filter(risk =>
      (risk.probability === RiskProbability.HIGH || risk.probability === RiskProbability.VERY_HIGH) &&
      (risk.impact === RiskImpact.HIGH || risk.impact === RiskImpact.VERY_HIGH)
    );

    if (highPriorityRisks.length > 0) {
      recommendations.push(`Address ${highPriorityRisks.length} high-priority legal risks`);
    }

    return recommendations;
  }

  private getRequestDescription(requestType: string): string {
    switch (requestType) {
      case 'access':
        return 'Request for information about personal data processing';
      case 'portability':
        return 'Request to receive personal data in a structured format';
      case 'erasure':
        return 'Request for deletion of personal data (Right to be Forgotten)';
      default:
        return 'Data subject request';
    }
  }

  private recordEvent(type: LegalEventType, details: Record<string, any>): void {
    const event: LegalEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      details,
      source: 'DataGovernanceManager'
    };

    this.events.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
}