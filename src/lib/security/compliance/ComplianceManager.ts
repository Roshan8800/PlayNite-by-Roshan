import { securityManager } from '../core/SecurityManager';

/**
 * Compliance Regulation Types
 */
export enum ComplianceRegulation {
  GDPR = 'GDPR',
  CCPA = 'CCPA',
  SOX = 'SOX',
  PCI_DSS = 'PCI_DSS',
  HIPAA = 'HIPAA',
  ISO_27001 = 'ISO_27001',
  NIST = 'NIST'
}

/**
 * Compliance Status
 */
export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}

/**
 * Compliance Requirement Interface
 */
interface ComplianceRequirement {
  id: string;
  regulation: ComplianceRegulation;
  name: string;
  description: string;
  category: 'data_protection' | 'access_control' | 'audit' | 'encryption' | 'retention';
  mandatory: boolean;
  status: ComplianceStatus;
  lastAssessed: Date;
  nextAssessment: Date;
  evidence: string[];
  notes?: string;
}

/**
 * Compliance Report Interface
 */
interface ComplianceReport {
  id: string;
  regulation: ComplianceRegulation;
  reportPeriod: { start: Date; end: Date };
  overallStatus: ComplianceStatus;
  requirements: ComplianceRequirement[];
  summary: {
    totalRequirements: number;
    compliantRequirements: number;
    nonCompliantRequirements: number;
    partiallyCompliantRequirements: number;
  };
  generatedAt: Date;
  generatedBy: string;
  recommendations: string[];
}

/**
 * Data Retention Policy Interface
 */
interface DataRetentionPolicy {
  dataType: string;
  regulation: ComplianceRegulation;
  retentionPeriod: number; // days
  deletionRequired: boolean;
  anonymizationAllowed: boolean;
  legalHold: boolean;
}

/**
 * Compliance Manager
 * Handles regulatory compliance and reporting for PlayNite
 */
export class ComplianceManager {
  private requirements: Map<string, ComplianceRequirement> = new Map();
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private complianceReports: ComplianceReport[] = [];

  constructor() {
    this.initializeComplianceRequirements();
    this.initializeRetentionPolicies();
  }

  /**
   * Get compliance status for a specific regulation
   */
  async getComplianceStatus(regulation?: ComplianceRegulation): Promise<Record<string, any>> {
    const requirements = regulation
      ? Array.from(this.requirements.values()).filter(r => r.regulation === regulation)
      : Array.from(this.requirements.values());

    const statusCounts = requirements.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<ComplianceStatus, number>);

    const overallStatus = this.calculateOverallStatus(statusCounts);

    return {
      regulation: regulation || 'ALL',
      overallStatus,
      requirements: requirements.length,
      statusBreakdown: statusCounts,
      lastAssessed: new Date(),
      nextAssessment: this.getNextAssessmentDate()
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    regulation: ComplianceRegulation,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const requirements = Array.from(this.requirements.values())
      .filter(r => r.regulation === regulation);

    const summary = requirements.reduce((acc, req) => {
      acc.totalRequirements++;
      switch (req.status) {
        case ComplianceStatus.COMPLIANT:
          acc.compliantRequirements++;
          break;
        case ComplianceStatus.NON_COMPLIANT:
          acc.nonCompliantRequirements++;
          break;
        case ComplianceStatus.PARTIALLY_COMPLIANT:
          acc.partiallyCompliantRequirements++;
          break;
        case ComplianceStatus.UNDER_REVIEW:
          acc.underReviewRequirements++;
          break;
      }
      return acc;
    }, {
      totalRequirements: 0,
      compliantRequirements: 0,
      nonCompliantRequirements: 0,
      partiallyCompliantRequirements: 0,
      underReviewRequirements: 0
    });

    const overallStatus = this.calculateOverallStatus({
      [ComplianceStatus.COMPLIANT]: summary.compliantRequirements,
      [ComplianceStatus.NON_COMPLIANT]: summary.nonCompliantRequirements,
      [ComplianceStatus.PARTIALLY_COMPLIANT]: summary.partiallyCompliantRequirements,
      [ComplianceStatus.UNDER_REVIEW]: summary.underReviewRequirements,
      [ComplianceStatus.NOT_APPLICABLE]: 0
    });

    const report: ComplianceReport = {
      id: `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      regulation,
      reportPeriod: { start: startDate, end: endDate },
      overallStatus,
      requirements,
      summary,
      generatedAt: new Date(),
      generatedBy: 'system',
      recommendations: this.generateRecommendations(requirements)
    };

    this.complianceReports.push(report);

    return report;
  }

  /**
   * Get reports in date range
   */
  async getReportsInRange(startDate: Date, endDate: Date): Promise<ComplianceReport[]> {
    return this.complianceReports.filter(report =>
      report.generatedAt >= startDate && report.generatedAt <= endDate
    );
  }

  /**
   * Assess compliance requirement
   */
  async assessRequirement(requirementId: string, status: ComplianceStatus, evidence: string[]): Promise<void> {
    const requirement = this.requirements.get(requirementId);
    if (!requirement) {
      throw new Error(`Compliance requirement not found: ${requirementId}`);
    }

    requirement.status = status;
    requirement.evidence = evidence;
    requirement.lastAssessed = new Date();
    requirement.nextAssessment = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Next quarter

    // Log compliance assessment
    console.log(`Compliance requirement ${requirementId} assessed as ${status}`);
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetentionCompliance(dataType: string, dataAge: number): Promise<{
    compliant: boolean;
    policy?: DataRetentionPolicy;
    action?: 'delete' | 'anonymize' | 'retain';
    reason: string;
  }> {
    const policy = this.retentionPolicies.get(dataType);

    if (!policy) {
      return {
        compliant: true,
        reason: 'No specific retention policy for this data type'
      };
    }

    const ageInDays = dataAge / (24 * 60 * 60 * 1000);

    if (ageInDays > policy.retentionPeriod) {
      if (policy.deletionRequired) {
        return {
          compliant: false,
          policy,
          action: 'delete',
          reason: `Data exceeds retention period of ${policy.retentionPeriod} days`
        };
      } else if (policy.anonymizationAllowed) {
        return {
          compliant: false,
          policy,
          action: 'anonymize',
          reason: `Data exceeds retention period, anonymization recommended`
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
   * Generate data protection impact assessment (DPIA) for GDPR
   */
  async generateDPIA(dataProcessingActivity: {
    name: string;
    description: string;
    dataTypes: string[];
    purpose: string;
    legalBasis: string;
    recipients: string[];
    retentionPeriod: number;
  }): Promise<any> {
    const risks = this.assessDPIARisks(dataProcessingActivity);
    const mitigationMeasures = this.getMitigationMeasures(risks);

    return {
      assessmentId: `dpia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      activity: dataProcessingActivity,
      assessmentDate: new Date(),
      assessor: 'system',
      risks,
      mitigationMeasures,
      overallRisk: this.calculateOverallRisk(risks),
      recommendations: this.generateDPIARecommendations(risks),
      complianceStatus: this.assessGDPRCompliance(dataProcessingActivity)
    };
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(): Promise<Record<string, any>> {
    const allRequirements = Array.from(this.requirements.values());

    const dashboard = {
      overallCompliance: await this.getOverallComplianceScore(),
      regulationBreakdown: {} as Record<ComplianceRegulation, any>,
      upcomingAssessments: this.getUpcomingAssessments(),
      recentViolations: this.getRecentViolations(),
      dataRetentionStatus: await this.getDataRetentionStatus(),
      lastUpdated: new Date()
    };

    // Regulation breakdown
    for (const regulation of Object.values(ComplianceRegulation)) {
      dashboard.regulationBreakdown[regulation] = await this.getComplianceStatus(regulation);
    }

    return dashboard;
  }

  /**
   * Private helper methods
   */
  private initializeComplianceRequirements(): void {
    const requirements: ComplianceRequirement[] = [
      // GDPR Requirements
      {
        id: 'gdpr_data_protection',
        regulation: ComplianceRegulation.GDPR,
        name: 'Data Protection by Design and Default',
        description: 'Implement appropriate technical and organizational measures',
        category: 'data_protection',
        mandatory: true,
        status: ComplianceStatus.UNDER_REVIEW,
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        evidence: []
      },
      {
        id: 'gdpr_consent',
        regulation: ComplianceRegulation.GDPR,
        name: 'Consent Management',
        description: 'Obtain and manage user consent for data processing',
        category: 'data_protection',
        mandatory: true,
        status: ComplianceStatus.UNDER_REVIEW,
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        evidence: []
      },
      {
        id: 'gdpr_breach_notification',
        regulation: ComplianceRegulation.GDPR,
        name: 'Breach Notification',
        description: 'Notify authorities and individuals of data breaches',
        category: 'data_protection',
        mandatory: true,
        status: ComplianceStatus.UNDER_REVIEW,
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        evidence: []
      },

      // SOX Requirements
      {
        id: 'sox_access_control',
        regulation: ComplianceRegulation.SOX,
        name: 'Access Controls',
        description: 'Implement proper access controls for financial systems',
        category: 'access_control',
        mandatory: true,
        status: ComplianceStatus.UNDER_REVIEW,
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        evidence: []
      },

      // PCI-DSS Requirements
      {
        id: 'pci_encryption',
        regulation: ComplianceRegulation.PCI_DSS,
        name: 'Encryption of Cardholder Data',
        description: 'Encrypt transmission and storage of cardholder data',
        category: 'encryption',
        mandatory: true,
        status: ComplianceStatus.UNDER_REVIEW,
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        evidence: []
      }
    ];

    for (const requirement of requirements) {
      this.requirements.set(requirement.id, requirement);
    }
  }

  private initializeRetentionPolicies(): void {
    const policies: DataRetentionPolicy[] = [
      {
        dataType: 'user_activity_logs',
        regulation: ComplianceRegulation.GDPR,
        retentionPeriod: 90,
        deletionRequired: false,
        anonymizationAllowed: true,
        legalHold: false
      },
      {
        dataType: 'authentication_logs',
        regulation: ComplianceRegulation.SOX,
        retentionPeriod: 2555, // 7 years
        deletionRequired: false,
        anonymizationAllowed: false,
        legalHold: true
      },
      {
        dataType: 'payment_data',
        regulation: ComplianceRegulation.PCI_DSS,
        retentionPeriod: 365,
        deletionRequired: true,
        anonymizationAllowed: false,
        legalHold: false
      }
    ];

    for (const policy of policies) {
      this.retentionPolicies.set(policy.dataType, policy);
    }
  }

  private calculateOverallStatus(statusCounts: Record<ComplianceStatus, number>): ComplianceStatus {
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    if (total === 0) return ComplianceStatus.UNDER_REVIEW;

    const nonCompliantCount = statusCounts[ComplianceStatus.NON_COMPLIANT] || 0;
    const partiallyCompliantCount = statusCounts[ComplianceStatus.PARTIALLY_COMPLIANT] || 0;
    const compliantCount = statusCounts[ComplianceStatus.COMPLIANT] || 0;

    if (nonCompliantCount > 0) return ComplianceStatus.NON_COMPLIANT;
    if (partiallyCompliantCount > 0) return ComplianceStatus.PARTIALLY_COMPLIANT;
    if (compliantCount === total) return ComplianceStatus.COMPLIANT;

    return ComplianceStatus.UNDER_REVIEW;
  }

  private generateRecommendations(requirements: ComplianceRequirement[]): string[] {
    const recommendations: string[] = [];

    const nonCompliant = requirements.filter(r => r.status === ComplianceStatus.NON_COMPLIANT);
    const partiallyCompliant = requirements.filter(r => r.status === ComplianceStatus.PARTIALLY_COMPLIANT);

    if (nonCompliant.length > 0) {
      recommendations.push(`Address ${nonCompliant.length} non-compliant requirements`);
    }

    if (partiallyCompliant.length > 0) {
      recommendations.push(`Complete ${partiallyCompliant.length} partially compliant requirements`);
    }

    return recommendations;
  }

  private assessDPIARisks(activity: any): any[] {
    const risks = [];

    // High-risk data types
    if (activity.dataTypes.includes('personal') || activity.dataTypes.includes('sensitive')) {
      risks.push({
        level: 'HIGH',
        description: 'Processing of personal or sensitive data',
        likelihood: 'MEDIUM',
        impact: 'HIGH'
      });
    }

    // Large-scale processing
    if (activity.dataTypes.length > 5) {
      risks.push({
        level: 'MEDIUM',
        description: 'Large-scale data processing',
        likelihood: 'HIGH',
        impact: 'MEDIUM'
      });
    }

    return risks;
  }

  private getMitigationMeasures(risks: any[]): string[] {
    const measures = [];

    for (const risk of risks) {
      if (risk.description.includes('personal') || risk.description.includes('sensitive')) {
        measures.push('Implement data minimization techniques');
        measures.push('Ensure encryption of personal data');
        measures.push('Conduct regular security assessments');
      }
    }

    return measures;
  }

  private calculateOverallRisk(risks: any[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (risks.some(r => r.level === 'HIGH')) return 'HIGH';
    if (risks.some(r => r.level === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  private generateDPIARecommendations(risks: any[]): string[] {
    const recommendations = [];

    if (risks.some(r => r.level === 'HIGH')) {
      recommendations.push('Conduct detailed privacy impact assessment');
      recommendations.push('Implement additional security controls');
    }

    recommendations.push('Review data processing necessity');
    recommendations.push('Document legal basis for processing');

    return recommendations;
  }

  private assessGDPRCompliance(activity: any): ComplianceStatus {
    // Simplified GDPR compliance assessment
    if (activity.legalBasis && activity.dataTypes && activity.retentionPeriod) {
      return ComplianceStatus.PARTIALLY_COMPLIANT;
    }
    return ComplianceStatus.NON_COMPLIANT;
  }

  private async getOverallComplianceScore(): Promise<number> {
    const allRequirements = Array.from(this.requirements.values());
    const compliantCount = allRequirements.filter(r => r.status === ComplianceStatus.COMPLIANT).length;

    return Math.round((compliantCount / allRequirements.length) * 100);
  }

  private getUpcomingAssessments(): ComplianceRequirement[] {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return Array.from(this.requirements.values())
      .filter(r => r.nextAssessment <= nextWeek)
      .sort((a, b) => a.nextAssessment.getTime() - b.nextAssessment.getTime());
  }

  private getRecentViolations(): any[] {
    // Return recent compliance violations
    return [];
  }

  private async getDataRetentionStatus(): Promise<Record<string, any>> {
    // Check data retention compliance across all policies
    return {
      totalPolicies: this.retentionPolicies.size,
      compliantPolicies: this.retentionPolicies.size, // Placeholder
      violations: 0,
      lastChecked: new Date()
    };
  }

  private getNextAssessmentDate(): Date {
    const nextAssessments = Array.from(this.requirements.values())
      .map(r => r.nextAssessment)
      .sort((a, b) => a.getTime() - b.getTime());

    return nextAssessments[0] || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
}