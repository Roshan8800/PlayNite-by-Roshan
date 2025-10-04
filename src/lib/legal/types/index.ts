/**
 * Legal Compliance System Types
 * Defines interfaces and types for the legal compliance system
 */

// Terms and Policy Types
export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  isActive: boolean;
  language: string;
  jurisdiction?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export enum LegalDocumentType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  COOKIE_POLICY = 'COOKIE_POLICY',
  DATA_PROCESSING_AGREEMENT = 'DATA_PROCESSING_AGREEMENT',
  END_USER_LICENSE_AGREEMENT = 'END_USER_LICENSE_AGREEMENT',
  ACCEPTABLE_USE_POLICY = 'ACCEPTABLE_USE_POLICY',
  COMMUNITY_GUIDELINES = 'COMMUNITY_GUIDELINES'
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  content: string;
  changes: string[];
  effectiveDate: Date;
  createdAt: Date;
  createdBy: string;
}

// Consent Management Types
export interface UserConsent {
  id: string;
  userId: string;
  documentId: string;
  documentVersion: string;
  consentType: ConsentType;
  status: ConsentStatus;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export enum ConsentType {
  EXPLICIT = 'EXPLICIT',
  IMPLICIT = 'IMPLICIT',
  OPT_IN = 'OPT_IN',
  OPT_OUT = 'OPT_OUT'
}

export enum ConsentStatus {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING'
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  thirdParties?: string[];
  retentionPeriod?: number;
  status: ConsentStatus;
  grantedAt: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  withdrawalMethod?: string;
}

// Policy Enforcement Types
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  isActive: boolean;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum PolicyCategory {
  DATA_PROCESSING = 'DATA_PROCESSING',
  USER_CONTENT = 'USER_CONTENT',
  PRIVACY = 'PRIVACY',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  ACCESS_CONTROL = 'ACCESS_CONTROL'
}

export enum PolicySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface PolicyCondition {
  field: string;
  operator: PolicyOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

export enum PolicyOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  REGEX = 'REGEX'
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR'
}

export interface PolicyAction {
  type: PolicyActionType;
  parameters?: Record<string, any>;
  message?: string;
}

export enum PolicyActionType {
  BLOCK = 'BLOCK',
  WARN = 'WARN',
  LOG = 'LOG',
  NOTIFY = 'NOTIFY',
  REDACT = 'REDACT',
  ANONYMIZE = 'ANONYMIZE',
  DELETE = 'DELETE'
}

export interface PolicyViolation {
  id: string;
  ruleId: string;
  userId?: string;
  resourceId?: string;
  resourceType: string;
  violationType: string;
  severity: PolicySeverity;
  description: string;
  detectedAt: Date;
  status: ViolationStatus;
  actions: PolicyAction[];
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export enum ViolationStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

// Compliance Monitoring Types
export interface ComplianceAudit {
  id: string;
  name: string;
  description: string;
  regulation: string;
  status: AuditStatus;
  startDate: Date;
  endDate?: Date;
  findings: AuditFinding[];
  recommendations: string[];
  createdAt: Date;
  createdBy: string;
}

export enum AuditStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface AuditFinding {
  id: string;
  category: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  evidence: string[];
  status: FindingStatus;
  remediation?: string;
  dueDate?: Date;
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum FindingStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ACCEPTED_RISK = 'ACCEPTED_RISK'
}

export interface ComplianceReport {
  id: string;
  title: string;
  period: { start: Date; end: Date };
  regulations: string[];
  overallStatus: ComplianceStatus;
  summary: ComplianceSummary;
  details: ComplianceDetail[];
  generatedAt: Date;
  generatedBy: string;
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}

export interface ComplianceSummary {
  totalRequirements: number;
  compliantRequirements: number;
  nonCompliantRequirements: number;
  partiallyCompliantRequirements: number;
  underReviewRequirements: number;
}

export interface ComplianceDetail {
  regulation: string;
  requirement: string;
  status: ComplianceStatus;
  evidence: string[];
  notes?: string;
  lastAssessed: Date;
  nextAssessment?: Date;
}

// Data Governance Types
export interface DataInventory {
  id: string;
  name: string;
  description: string;
  dataCategories: DataCategory[];
  collectionPoints: DataCollectionPoint[];
  processingActivities: DataProcessingActivity[];
  retentionPolicies: DataRetentionPolicy[];
  accessControls: DataAccessControl[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataCategory {
  id: string;
  name: string;
  description: string;
  sensitivity: DataSensitivity;
  regulations: string[];
  retentionPeriod?: number;
}

export enum DataSensitivity {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED'
}

export interface DataCollectionPoint {
  id: string;
  name: string;
  type: CollectionPointType;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
}

export enum CollectionPointType {
  USER_INPUT = 'USER_INPUT',
  AUTOMATIC_COLLECTION = 'AUTOMATIC_COLLECTION',
  THIRD_PARTY = 'THIRD_PARTY',
  DERIVED = 'DERIVED'
}

export interface DataProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  processors: string[];
  retentionPeriod: number;
  securityMeasures: string[];
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  dataCategory: string;
  retentionPeriod: number;
  deletionMethod: DeletionMethod;
  legalHold: boolean;
  exceptions?: string[];
}

export enum DeletionMethod {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  LEGAL_HOLD = 'LEGAL_HOLD'
}

export interface DataAccessControl {
  id: string;
  dataCategory: string;
  accessLevel: AccessLevel;
  roles: string[];
  conditions?: string[];
  justification: string;
}

export enum AccessLevel {
  READ = 'READ',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
  NO_ACCESS = 'NO_ACCESS'
}

// Legal Integration Types
export interface LegalRequirement {
  id: string;
  name: string;
  description: string;
  regulation: string;
  category: string;
  mandatory: boolean;
  status: ComplianceStatus;
  implementationStatus: ImplementationStatus;
  dueDate?: Date;
  assignedTo?: string;
  dependencies?: string[];
}

export enum ImplementationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED'
}

export interface LegalRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  mitigation: string[];
  owner: string;
  dueDate?: Date;
}

export enum RiskCategory {
  COMPLIANCE = 'COMPLIANCE',
  PRIVACY = 'PRIVACY',
  SECURITY = 'SECURITY',
  OPERATIONAL = 'OPERATIONAL',
  REPUTATIONAL = 'REPUTATIONAL'
}

export enum RiskProbability {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum RiskImpact {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum RiskStatus {
  IDENTIFIED = 'IDENTIFIED',
  ASSESSED = 'ASSESSED',
  MITIGATED = 'MITIGATED',
  ACCEPTED = 'ACCEPTED',
  CLOSED = 'CLOSED'
}

// System Integration Types
export interface LegalEvent {
  id: string;
  type: LegalEventType;
  timestamp: Date;
  userId?: string;
  resourceId?: string;
  details: Record<string, any>;
  source: string;
}

export enum LegalEventType {
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  COMPLIANCE_BREACH = 'COMPLIANCE_BREACH',
  DATA_BREACH = 'DATA_BREACH',
  LEGAL_HOLD = 'LEGAL_HOLD',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED'
}

export interface LegalNotification {
  id: string;
  type: NotificationType;
  recipient: string;
  subject: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  sentAt?: Date;
  readAt?: Date;
}

export enum NotificationType {
  CONSENT_EXPIRY = 'CONSENT_EXPIRY',
  POLICY_UPDATE = 'POLICY_UPDATE',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  DATA_BREACH = 'DATA_BREACH',
  LEGAL_HOLD = 'LEGAL_HOLD'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}