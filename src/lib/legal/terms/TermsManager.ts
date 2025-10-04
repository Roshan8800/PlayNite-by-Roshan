import { securityManager } from '../../security/core/SecurityManager';
import { AuditLogger, AuditEventType } from '../../security/audit/AuditLogger';
import {
  LegalDocument,
  LegalDocumentType,
  DocumentVersion,
  LegalEvent,
  LegalEventType
} from '../types';

/**
 * Terms Manager
 * Handles dynamic terms of service and privacy policy management
 */
export class TermsManager {
  private documents: Map<string, LegalDocument> = new Map();
  private documentVersions: Map<string, DocumentVersion[]> = new Map();
  private auditLogger: AuditLogger;
  private events: LegalEvent[] = [];

  constructor() {
    this.auditLogger = new AuditLogger();
    this.initializeDefaultDocuments();
  }

  /**
   * Create a new legal document
   */
  async createDocument(document: Omit<LegalDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<LegalDocument> {
    // Security validation
    const securityContext = {
      userId: document.createdBy,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'CREATE_LEGAL_DOCUMENT',
      resource: `document:${document.type}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    const newDocument: LegalDocument = {
      ...document,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.documents.set(newDocument.id, newDocument);

    // Log the creation
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId: document.createdBy,
      operation: 'CREATE_LEGAL_DOCUMENT',
      resource: newDocument.id,
      metadata: { documentType: document.type, version: document.version },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.DOCUMENT_UPDATED, {
      documentId: newDocument.id,
      documentType: document.type,
      action: 'CREATED'
    });

    return newDocument;
  }

  /**
   * Update an existing legal document
   */
  async updateDocument(
    documentId: string,
    updates: Partial<Omit<LegalDocument, 'id' | 'createdAt'>>,
    userId: string
  ): Promise<LegalDocument> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Security validation
    const securityContext = {
      userId,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'UPDATE_LEGAL_DOCUMENT',
      resource: `document:${document.type}:${documentId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    // Create new version before updating
    await this.createDocumentVersion(documentId, document, 'Document updated');

    const updatedDocument: LegalDocument = {
      ...document,
      ...updates,
      updatedAt: new Date()
    };

    this.documents.set(documentId, updatedDocument);

    // Log the update
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_MODIFICATION,
      userId,
      operation: 'UPDATE_LEGAL_DOCUMENT',
      resource: documentId,
      metadata: { documentType: document.type, changes: Object.keys(updates) },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.DOCUMENT_UPDATED, {
      documentId,
      documentType: document.type,
      action: 'UPDATED',
      changes: Object.keys(updates)
    });

    return updatedDocument;
  }

  /**
   * Get a legal document by ID
   */
  async getDocument(documentId: string): Promise<LegalDocument | null> {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get active document by type and language
   */
  async getActiveDocument(type: LegalDocumentType, language: string = 'en'): Promise<LegalDocument | null> {
    for (const document of this.documents.values()) {
      if (document.type === type && document.language === language && document.isActive) {
        return document;
      }
    }
    return null;
  }

  /**
   * Get all documents of a specific type
   */
  async getDocumentsByType(type: LegalDocumentType): Promise<LegalDocument[]> {
    return Array.from(this.documents.values()).filter(doc => doc.type === type);
  }

  /**
   * Create a new version of a document
   */
  async createDocumentVersion(
    documentId: string,
    currentDocument: LegalDocument,
    changes: string
  ): Promise<DocumentVersion> {
    const versions = this.documentVersions.get(documentId) || [];

    // Generate new version number
    const latestVersion = versions.length > 0 ? versions[versions.length - 1].version : '1.0.0';
    const versionParts = latestVersion.split('.').map(Number);
    versionParts[versionParts.length - 1]++;
    const newVersion = versionParts.join('.');

    const documentVersion: DocumentVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      version: newVersion,
      content: currentDocument.content,
      changes: [changes],
      effectiveDate: new Date(),
      createdAt: new Date(),
      createdBy: currentDocument.createdBy
    };

    versions.push(documentVersion);
    this.documentVersions.set(documentId, versions);

    return documentVersion;
  }

  /**
   * Get version history for a document
   */
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.documentVersions.get(documentId) || [];
  }

  /**
   * Publish a document (make it active)
   */
  async publishDocument(documentId: string, userId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Security validation
    const securityContext = {
      userId,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'PUBLISH_LEGAL_DOCUMENT',
      resource: `document:${document.type}:${documentId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    // Deactivate other documents of the same type and language
    for (const doc of this.documents.values()) {
      if (doc.type === document.type && doc.language === document.language && doc.id !== documentId) {
        doc.isActive = false;
        this.documents.set(doc.id, doc);
      }
    }

    // Activate the current document
    document.isActive = true;
    document.effectiveDate = new Date();
    document.updatedAt = new Date();
    this.documents.set(documentId, document);

    // Log the publication
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId,
      operation: 'PUBLISH_LEGAL_DOCUMENT',
      resource: documentId,
      metadata: { documentType: document.type, version: document.version },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.DOCUMENT_UPDATED, {
      documentId,
      documentType: document.type,
      action: 'PUBLISHED'
    });
  }

  /**
   * Archive a document
   */
  async archiveDocument(documentId: string, userId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Security validation
    const securityContext = {
      userId,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation: 'ARCHIVE_LEGAL_DOCUMENT',
      resource: `document:${document.type}:${documentId}`
    };

    const validation = await securityManager.validateSecurityContext(securityContext);
    if (!validation.allowed) {
      throw new Error(`Access denied: ${validation.reason}`);
    }

    document.isActive = false;
    document.updatedAt = new Date();
    this.documents.set(documentId, document);

    // Log the archival
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_MODIFICATION,
      userId,
      operation: 'ARCHIVE_LEGAL_DOCUMENT',
      resource: documentId,
      metadata: { documentType: document.type },
      success: true
    });

    // Record legal event
    this.recordEvent(LegalEventType.DOCUMENT_UPDATED, {
      documentId,
      documentType: document.type,
      action: 'ARCHIVED'
    });
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(): Promise<Record<string, any>> {
    const documents = Array.from(this.documents.values());

    const stats = {
      totalDocuments: documents.length,
      activeDocuments: documents.filter(doc => doc.isActive).length,
      documentsByType: {} as Record<LegalDocumentType, number>,
      documentsByLanguage: {} as Record<string, number>,
      recentUpdates: documents.filter(doc =>
        doc.updatedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      totalVersions: Array.from(this.documentVersions.values())
        .reduce((total, versions) => total + versions.length, 0)
    };

    // Count by type
    for (const doc of documents) {
      stats.documentsByType[doc.type] = (stats.documentsByType[doc.type] || 0) + 1;
      stats.documentsByLanguage[doc.language] = (stats.documentsByLanguage[doc.language] || 0) + 1;
    }

    return stats;
  }

  /**
   * Search documents
   */
  async searchDocuments(query: {
    type?: LegalDocumentType;
    language?: string;
    isActive?: boolean;
    searchTerm?: string;
  }): Promise<LegalDocument[]> {
    let documents = Array.from(this.documents.values());

    if (query.type) {
      documents = documents.filter(doc => doc.type === query.type);
    }

    if (query.language) {
      documents = documents.filter(doc => doc.language === query.language);
    }

    if (typeof query.isActive === 'boolean') {
      documents = documents.filter(doc => doc.isActive === query.isActive);
    }

    if (query.searchTerm) {
      const term = query.searchTerm.toLowerCase();
      documents = documents.filter(doc =>
        doc.title.toLowerCase().includes(term) ||
        doc.content.toLowerCase().includes(term)
      );
    }

    return documents;
  }

  /**
   * Export document for external use
   */
  async exportDocument(documentId: string, format: 'html' | 'pdf' | 'json' = 'json'): Promise<any> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const versions = this.documentVersions.get(documentId) || [];

    const exportData = {
      document,
      versions,
      exportedAt: new Date(),
      format
    };

    // Log the export
    await this.auditLogger.logSecurityEvent({
      type: AuditEventType.DATA_ACCESS,
      userId: 'system',
      operation: 'EXPORT_LEGAL_DOCUMENT',
      resource: documentId,
      metadata: { format },
      success: true
    });

    return exportData;
  }

  /**
   * Validate document content
   */
  async validateDocumentContent(content: string, type: LegalDocumentType): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation rules
    if (!content || content.trim().length === 0) {
      errors.push('Document content cannot be empty');
    }

    if (content.length < 100) {
      warnings.push('Document content is very short');
    }

    // Type-specific validation
    switch (type) {
      case LegalDocumentType.PRIVACY_POLICY:
        if (!content.toLowerCase().includes('privacy')) {
          warnings.push('Privacy policy should contain privacy-related content');
        }
        if (!content.toLowerCase().includes('data')) {
          warnings.push('Privacy policy should mention data handling');
        }
        break;

      case LegalDocumentType.TERMS_OF_SERVICE:
        if (!content.toLowerCase().includes('terms')) {
          warnings.push('Terms of service should contain terms-related content');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get compliance status for documents
   */
  async getComplianceStatus(): Promise<Record<string, any>> {
    const documents = Array.from(this.documents.values());
    const now = new Date();

    // Check for documents that need review (older than 1 year)
    const needsReview = documents.filter(doc =>
      doc.updatedAt < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    );

    // Check for missing critical documents
    const criticalTypes = [
      LegalDocumentType.TERMS_OF_SERVICE,
      LegalDocumentType.PRIVACY_POLICY
    ];

    const missingCritical = criticalTypes.filter(type => {
      return !documents.some(doc => doc.type === type && doc.isActive);
    });

    return {
      totalDocuments: documents.length,
      activeDocuments: documents.filter(doc => doc.isActive).length,
      needsReview: needsReview.length,
      missingCritical: missingCritical.length,
      lastUpdated: now,
      complianceScore: this.calculateComplianceScore(documents, needsReview, missingCritical)
    };
  }

  /**
   * Private helper methods
   */
  private initializeDefaultDocuments(): void {
    // This would typically load from a database or configuration
    // For now, we'll start with empty collections
  }

  private recordEvent(type: LegalEventType, details: Record<string, any>): void {
    const event: LegalEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      details,
      source: 'TermsManager'
    };

    this.events.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private calculateComplianceScore(
    documents: LegalDocument[],
    needsReview: LegalDocument[],
    missingCritical: LegalDocumentType[]
  ): number {
    let score = 100;

    // Deduct points for missing critical documents
    score -= missingCritical.length * 25;

    // Deduct points for documents needing review
    score -= needsReview.length * 5;

    // Deduct points for inactive documents (indicates poor management)
    const inactiveCount = documents.length - documents.filter(doc => doc.isActive).length;
    score -= inactiveCount * 2;

    return Math.max(0, Math.min(100, score));
  }
}