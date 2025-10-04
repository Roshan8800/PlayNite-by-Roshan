/**
 * PlayNite Security Management & Audit System
 *
 * This module provides comprehensive security features including:
 * - Enhanced authentication with MFA support
 * - Advanced RBAC with contextual permissions
 * - Comprehensive audit logging and monitoring
 * - Data protection and encryption systems
 * - Security monitoring and threat detection
 * - Compliance and regulatory reporting features
 */

// Import all security components
import { securityManager } from './core/SecurityManager';
import { authorizationService } from './authorization/AuthorizationService';
import { securityIntegrationService } from './integration/SecurityIntegrationService';
import { ComplianceManager, ComplianceRegulation } from './compliance/ComplianceManager';

// Core Security Management
export { SecurityManager, securityManager } from './core/SecurityManager';
export type { SecurityConfig, SecurityContext, SecurityValidationResult } from './core/SecurityManager';

// Audit and Logging
export { AuditLogger, AuditEventType, AuditSeverity } from './audit/AuditLogger';
export type { AuditEvent, AuditQuery, AuditStatistics } from './audit/AuditLogger';

// Data Protection and Encryption
export { DataProtectionManager, EncryptionAlgorithm, DataClassification } from './data-protection/DataProtectionManager';

// Threat Detection and Monitoring
export { ThreatDetectionEngine, ThreatType, ThreatSeverity } from './monitoring/ThreatDetectionEngine';

// Compliance Management
export { ComplianceManager, ComplianceRegulation, ComplianceStatus } from './compliance/ComplianceManager';

// Enhanced Authentication
export { MFAService, MFAProvider } from './auth/MFAService';

// Advanced Authorization
export { AuthorizationService, authorizationService, Permission } from './authorization/AuthorizationService';

// System Integration
export { SecurityIntegrationService, securityIntegrationService } from './integration/SecurityIntegrationService';

/**
 * Initialize the complete security system
 */
export async function initializeSecuritySystem(): Promise<void> {
  try {
    console.log('Initializing PlayNite Security Management & Audit System...');

    // Initialize security integration service
    await securityIntegrationService.initialize();

    console.log('✅ Security system initialized successfully');
    console.log('🔐 Enhanced authentication and MFA ready');
    console.log('🛡️ Advanced RBAC with contextual permissions active');
    console.log('📋 Comprehensive audit logging enabled');
    console.log('🔒 Data protection and encryption operational');
    console.log('🚨 Threat detection and monitoring active');
    console.log('📊 Compliance reporting system ready');

  } catch (error) {
    console.error('❌ Failed to initialize security system:', error);
    throw error;
  }
}

/**
 * Get security system status
 */
export function getSecuritySystemStatus(): Record<string, any> {
  return {
    timestamp: new Date(),
    integration: securityIntegrationService.getIntegrationStatus(),
    security: {
      config: securityManager.getSecurityConfig(),
      metrics: 'Available via securityManager.getSecurityMetrics()'
    },
    authorization: {
      roles: authorizationService.getAllRoles().length,
      status: 'Active'
    },
    compliance: {
      status: 'Ready',
      regulations: Object.values(ComplianceRegulation)
    }
  };
}

/**
 * Quick security check for operations
 */
export async function quickSecurityCheck(
  userId: string,
  operation: string,
  resource?: string
): Promise<boolean> {
  try {
    const result = await securityManager.validateSecurityContext({
      userId,
      ipAddress: 'system',
      userAgent: 'system',
      timestamp: new Date(),
      operation,
      resource
    });

    return result.allowed;
  } catch (error) {
    console.error('Security check failed:', error);
    return false;
  }
}

/**
 * Export security audit data
 */
export async function exportSecurityAudit(
  startDate: Date,
  endDate: Date
): Promise<any> {
  return securityManager.exportSecurityAudit(startDate, endDate);
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  regulation: ComplianceRegulation,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const complianceManager = new ComplianceManager();
  return complianceManager.generateComplianceReport(regulation, startDate, endDate);
}

// Default export for easy importing
export default {
  initialize: initializeSecuritySystem,
  status: getSecuritySystemStatus,
  check: quickSecurityCheck,
  export: exportSecurityAudit,
  compliance: generateComplianceReport,
  managers: {
    security: securityManager,
    authorization: authorizationService,
    integration: securityIntegrationService
  }
};