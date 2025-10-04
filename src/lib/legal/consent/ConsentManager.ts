import { securityManager } from '../../security/core/SecurityManager';
import { AuditLogger, AuditEventType } from '../../security/audit/AuditLogger';
import {
  UserConsent,
  ConsentType,
  ConsentStatus,
  ConsentRecord,
  LegalDocument,
  LegalEvent,
  LegalEventType
} from '../types';

/**
 * Consent Manager
 * Handles comprehensive consent management and tracking for PlayNite
 */
export class ConsentManager {
  private consents: Map<string, UserConsent> = new Map();
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private auditLogger: AuditLogger;
  private events: LegalEvent[] = [];

  constructor() {
    this.auditLogger = new AuditLogger();
    this.initializeDefaultConsents();
  }

  /**
   * Grant user consent for a specific document
   */
  async grantConsent(
    userId: string,
    documentId: string,
    consentType: ConsentType = ConsentType.EXPLICIT,
    metadata?: Record<string, any>
  ): Promise<UserConsent> {
    // Security validation
    const securityContext = {
      userId,
      ipAddress: metadata?.ipAddress || 'unknown',
      userAgent: metadata?.userAgent || 'unknown',
      timestamp: new Date(),
      operation: 'GRANT_CONSENT',
      resource: `consent:${documentId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const consent: UserConsent = {
      id: consentId,
      userId,
      documentId,
      documentVersion: metadata?.documentVersion || '1.0.0',
      consentType,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      expiresAt: metadata?.expiresAt,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      metadata
    };

    this.consents.set(consentId, consent);

    // Create consent record for tracking
    const consentRecord: ConsentRecord = {
      id: `record_${consentId}`,
      userId,
      consentType: consentType.toString(),
      purpose: metadata?.purpose || 'General platform usage',
      legalBasis: metadata?.legalBasis || 'Consent',
      dataCategories: metadata?.dataCategories || ['basic_profile'],
      thirdParties: metadata?.thirdParties,
      retentionPeriod: metadata?.retentionPeriod,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      expiresAt: metadata?.expiresAt,
      withdrawalMethod: 'user_dashboard'
    };

    this.consentRecords.set(consentRecord.id, consentRecord);

    // Log the consent grant
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId,
      operation: 'GRANT_CONSENT',
      resource: documentId,
      metadata: {
        consentType,
        documentId,
        ipAddress: metadata?.ipAddress,
        gdpr: true
      },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.CONSENT_GRANTED, {
      userId,
      documentId,
      consentType,
      consentId
    });

    return consent;
  }

  /**
   * Revoke user consent
   */
  async revokeConsent(
    userId: string,
    consentId: string,
    reason?: string
  ): Promise<void> {
    const consent = this.consents.get(consentId);
    if (!consent) {
      throw new Error(`Consent not found: ${consentId}`);
    }

    if (consent.userId !== userId) {
      throw new Error('User can only revoke their own consent');
    }

    // Security validation
    const securityContext = {
      userId,
      ipAddress: 'unknown',
      userAgent: 'unknown',
      timestamp: new Date(),
      operation: 'REVOKE_CONSENT',
      resource: `consent:${consentId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    // Update consent status
    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    this.consents.set(consentId, consent);

    // Update consent record
    const recordId = `record_${consentId}`;
    const record = this.consentRecords.get(recordId);
    if (record) {
      record.status = ConsentStatus.REVOKED;
      record.revokedAt = new Date();
      this.consentRecords.set(recordId, record);
    }

    // Log the consent revocation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId,
      operation: 'REVOKE_CONSENT',
      resource: consent.documentId,
      metadata: {
        consentId,
        reason,
        gdpr: true
      },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.CONSENT_REVOKED, {
      userId,
      consentId,
      documentId: consent.documentId,
      reason
    });
  }

  /**
   * Check if user has valid consent for a document
   */
  async hasValidConsent(
    userId: string,
    documentId: string,
    purpose?: string
  ): Promise<{
    hasConsent: boolean;
    consent?: UserConsent;
    reason?: string;
  }> {
    // Find all consents for this user and document
    const userConsents = Array.from(this.consents.values()).filter(
      consent => consent.userId === userId && consent.documentId === documentId
    );

    if (userConsents.length === 0) {
      return {
        hasConsent: false,
        reason: 'No consent found for this document'
      };
    }

    // Find the most recent valid consent
    const validConsent = userConsents
      .filter(consent =>
        consent.status === ConsentStatus.GRANTED &&
        (!consent.expiresAt || consent.expiresAt > new Date())
      )
      .sort((a, b) => (b.grantedAt?.getTime() || 0) - (a.grantedAt?.getTime() || 0))[0];

    if (!validConsent) {
      return {
        hasConsent: false,
        reason: 'No valid consent found (expired or revoked)'
      };
    }

    // Check if consent covers the specific purpose
    if (purpose) {
      const record = this.consentRecords.get(`record_${validConsent.id}`);
      if (record && !this.consentCoversPurpose(record, purpose)) {
        return {
          hasConsent: false,
          consent: validConsent,
          reason: `Consent does not cover purpose: ${purpose}`
        };
      }
    }

    return {
      hasConsent: true,
      consent: validConsent
    };
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return Array.from(this.consents.values()).filter(
      consent => consent.userId === userId
    );
  }

  /**
   * Get consent statistics
   */
  async getConsentStatistics(): Promise<Record<string, any>> {
    const consents = Array.from(this.consents.values());
    const records = Array.from(this.consentRecords.values());

    const stats = {
      totalConsents: consents.length,
      activeConsents: consents.filter(c => c.status === ConsentStatus.GRANTED).length,
      revokedConsents: consents.filter(c => c.status === ConsentStatus.REVOKED).length,
      expiredConsents: consents.filter(c =>
        c.expiresAt && c.expiresAt <= new Date() && c.status === ConsentStatus.GRANTED
      ).length,
      consentsByType: {} as Record<ConsentType, number>,
      consentsByDocument: {} as Record<string, number>,
      recentGrants: consents.filter(c =>
        c.grantedAt && c.grantedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      recentRevocations: consents.filter(c =>
        c.revokedAt && c.revokedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    };

    // Count by type
    for (const consent of consents) {
      stats.consentsByType[consent.consentType] =
        (stats.consentsByType[consent.consentType] || 0) + 1;
      stats.consentsByDocument[consent.documentId] =
        (stats.consentsByDocument[consent.documentId] || 0) + 1;
    }

    return stats;
  }

  /**
   * Check consent compliance for GDPR and other regulations
   */
  async checkConsentCompliance(): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const consents = Array.from(this.consents.values());

    // Check for missing consent records
    for (const consent of consents) {
      const recordId = `record_${consent.id}`;
      if (!this.consentRecords.has(recordId)) {
        issues.push(`Missing consent record for consent ${consent.id}`);
      }
    }

    // Check for expired consents that haven't been cleaned up
    const expiredConsents = consents.filter(c =>
      c.expiresAt && c.expiresAt <= new Date() && c.status === ConsentStatus.GRANTED
    );

    if (expiredConsents.length > 0) {
      issues.push(`${expiredConsents.length} expired consents need cleanup`);
      recommendations.push('Implement automated cleanup of expired consents');
    }

    // Check for consents without proper metadata
    const incompleteConsents = consents.filter(c =>
      !c.ipAddress || !c.userAgent || !c.grantedAt
    );

    if (incompleteConsents.length > 0) {
      issues.push(`${incompleteConsents.length} consents missing required metadata`);
      recommendations.push('Ensure all consents capture complete metadata');
    }

    // Check consent withdrawal mechanisms
    const records = Array.from(this.consentRecords.values());
    const recordsWithoutWithdrawal = records.filter(r => !r.withdrawalMethod);

    if (recordsWithoutWithdrawal.length > 0) {
      issues.push(`${recordsWithoutWithdrawal.length} consent records missing withdrawal method`);
      recommendations.push('Implement clear consent withdrawal mechanisms');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate consent report for a user
   */
  async generateUserConsentReport(userId: string): Promise<{
    userId: string;
    totalConsents: number;
    activeConsents: number;
    consents: UserConsent[];
    records: ConsentRecord[];
    generatedAt: Date;
  }> {
    const consents = await this.getUserConsents(userId);
    const records = Array.from(this.consentRecords.values()).filter(
      record => record.userId === userId
    );

    return {
      userId,
      totalConsents: consents.length,
      activeConsents: consents.filter(c => c.status === ConsentStatus.GRANTED).length,
      consents,
      records,
      generatedAt: new Date()
    };
  }

  /**
   * Bulk consent operations for data portability
   */
  async exportUserConsents(userId: string): Promise<{
    consents: UserConsent[];
    records: ConsentRecord[];
    exportMetadata: {
      exportedAt: Date;
      exportedBy: string;
      format: string;
      recordCount: number;
    };
  }> {
    const consents = await this.getUserConsents(userId);
    const records = Array.from(this.consentRecords.values()).filter(
      record => record.userId === userId
    );

    // Log the export
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId,
      operation: 'EXPORT_USER_CONSENTS',
      metadata: {
        recordCount: consents.length,
        gdpr: true,
        dataPortability: true
      },
      success: true
    });

    return {
      consents,
      records,
      exportMetadata: {
        exportedAt: new Date(),
        exportedBy: 'system',
        format: 'json',
        recordCount: consents.length
      }
    };
  }

  /**
   * Delete all user consents (right to be forgotten)
   */
  async deleteUserConsents(userId: string, reason: string = 'GDPR Right to be Forgotten'): Promise<void> {
    const consents = await this.getUserConsents(userId);

    for (const consent of consents) {
      await this.revokeConsent(userId, consent.id, reason);
    }

    // Remove consent records
    for (const record of this.consentRecords.values()) {
      if (record.userId === userId) {
        this.consentRecords.delete(record.id);
      }
    }

    // Log the deletion
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_MODIFICATION,
      userId,
      operation: 'DELETE_USER_CONSENTS',
      metadata: {
        reason,
        consentCount: consents.length,
        gdpr: true,
        rightToBeForgotten: true
      },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.CONSENT_REVOKED, {
      userId,
      action: 'BULK_DELETE',
      reason,
      count: consents.length
    });
  }

  /**
   * Get consent expiry notifications
   */
  async getExpiringConsents(daysAhead: number = 30): Promise<UserConsent[]> {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    return Array.from(this.consents.values()).filter(consent =>
      consent.expiresAt &&
      consent.expiresAt <= futureDate &&
      consent.status === ConsentStatus.GRANTED
    );
  }

  /**
   * Renew expiring consent
   */
  async renewConsent(
    userId: string,
    consentId: string,
    newExpiryDate?: Date
  ): Promise<UserConsent> {
    const consent = this.consents.get(consentId);
    if (!consent) {
      throw new Error(`Consent not found: ${consentId}`);
    }

    if (consent.userId !== userId) {
      throw new Error('User can only renew their own consent');
    }

    // Update consent
    consent.expiresAt = newExpiryDate;
    consent.status = ConsentStatus.GRANTED;
    this.consents.set(consentId, consent);

    // Update record
    const recordId = `record_${consentId}`;
    const record = this.consentRecords.get(recordId);
    if (record) {
      record.expiresAt = newExpiryDate;
      record.status = ConsentStatus.GRANTED;
      this.consentRecords.set(recordId, record);
    }

    // Log the renewal
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId,
      operation: 'RENEW_CONSENT',
      resource: consent.documentId,
      metadata: {
        consentId,
        newExpiryDate,
        gdpr: true
      },
      success: true
    });

    return consent;
  }

  /**
   * Private helper methods
   */
  private initializeDefaultConsents(): void {
    // Initialize with empty collections - consents are user-specific
  }

  private consentCoversPurpose(record: ConsentRecord, purpose: string): boolean {
    // Simple purpose matching - in a real implementation, this would be more sophisticated
    return record.purpose.toLowerCase().includes(purpose.toLowerCase()) ||
           purpose.toLowerCase().includes(record.purpose.toLowerCase());
  }

  private recordEvent(type: LegalEventType, details: Record<string, any>): void {
    const event: LegalEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      details,
      source: 'ConsentManager'
    };

    this.events.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }
}