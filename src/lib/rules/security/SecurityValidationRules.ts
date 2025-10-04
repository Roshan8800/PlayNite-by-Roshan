import { RuleDefinition, RuleContext, ValidationResult, ValidationError, ValidationWarning } from '../types';

/**
 * Security validation rules for authentication, authorization, and data access permissions
 */
export class SecurityValidationRules {
  /**
   * Rule: Authentication validation
   */
  static readonly AUTHENTICATION: RuleDefinition = {
    id: 'security_authentication_validation',
    name: 'Authentication Validation',
    description: 'Validates user authentication and session security',
    category: 'security',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['login', 'logout', 'refresh_token', 'validate_session']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.auth',
        config: {
          requireValidCredentials: true,
          checkPasswordStrength: true,
          validateSessionToken: true,
          checkDeviceFingerprint: true,
          maxLoginAttempts: 5,
          lockoutDuration: 900000, // 15 minutes
          requireMFAForSensitive: true
        }
      }
    ],
    tags: ['authentication', 'login', 'security']
  };

  /**
   * Rule: Authorization and permissions validation
   */
  static readonly AUTHORIZATION: RuleDefinition = {
    id: 'security_authorization_validation',
    name: 'Authorization and Permissions Validation',
    description: 'Validates user permissions and access rights',
    category: 'security',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['access_resource', 'modify_data', 'delete_content', 'admin_action']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.authorization',
        config: {
          requireValidPermissions: true,
          checkRoleHierarchy: true,
          validateResourceOwnership: true,
          requireAdminForSensitive: true,
          checkIPWhitelist: false,
          validateAPIToken: true,
          maxPermissionsPerRole: 50
        }
      }
    ],
    tags: ['authorization', 'permissions', 'access']
  };

  /**
   * Rule: Data access and privacy validation
   */
  static readonly DATA_ACCESS: RuleDefinition = {
    id: 'security_data_access_validation',
    name: 'Data Access and Privacy Validation',
    description: 'Validates data access permissions and privacy compliance',
    category: 'security',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['read_data', 'write_data', 'export_data', 'share_data']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.access',
        config: {
          respectPrivacySettings: true,
          requireConsentForSharing: true,
          checkDataClassification: true,
          validateDataRetention: true,
          requireEncryptionForSensitive: true,
          checkGDPRCompliance: true,
          maxDataExportSize: 100 * 1024 * 1024 // 100MB
        }
      }
    ],
    tags: ['data-access', 'privacy', 'compliance']
  };

  /**
   * Rule: Session security validation
   */
  static readonly SESSION_SECURITY: RuleDefinition = {
    id: 'security_session_validation',
    name: 'Session Security Validation',
    description: 'Validates session security and token management',
    category: 'security',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'data.session',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.session',
        config: {
          maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
          requireSecureConnection: true,
          checkSessionHijacking: true,
          validateRefreshToken: true,
          maxConcurrentSessions: 5,
          requireReauthForSensitive: true,
          monitorSuspiciousActivity: true
        }
      }
    ],
    tags: ['session', 'security', 'tokens']
  };

  /**
   * Rule: API security validation
   */
  static readonly API_SECURITY: RuleDefinition = {
    id: 'security_api_validation',
    name: 'API Security Validation',
    description: 'Validates API access and request security',
    category: 'security',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.request',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.request',
        config: {
          requireValidAPIKey: true,
          checkRateLimiting: true,
          validateRequestSignature: true,
          requireHTTPS: true,
          checkRequestSize: true,
          validateContentType: true,
          maxRequestsPerMinute: 1000,
          requireOriginValidation: true
        }
      }
    ],
    tags: ['api', 'security', 'requests']
  };

  /**
   * Rule: Account security monitoring
   */
  static readonly ACCOUNT_MONITORING: RuleDefinition = {
    id: 'security_account_monitoring',
    name: 'Account Security Monitoring',
    description: 'Monitors account activity for security threats',
    category: 'security',
    priority: 80,
    enabled: true,
    conditions: [
      {
        field: 'data.user.id',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.activity',
        config: {
          detectSuspiciousLogins: true,
          monitorFailedAttempts: true,
          checkUnusualActivity: true,
          requireNotificationForNewDevices: true,
          trackLoginLocations: true,
          detectBruteForce: true,
          maxFailedAttempts: 5,
          alertOnSecurityEvents: true
        }
      }
    ],
    tags: ['monitoring', 'threat-detection', 'alerts']
  };

  /**
   * Rule: Data encryption and protection
   */
  static readonly DATA_PROTECTION: RuleDefinition = {
    id: 'security_data_protection',
    name: 'Data Encryption and Protection',
    description: 'Validates data encryption and protection measures',
    category: 'security',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.sensitive',
        operator: 'equals',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.protection',
        config: {
          requireEncryptionAtRest: true,
          requireEncryptionInTransit: true,
          validateKeyStrength: true,
          checkDataMasking: true,
          requireSecureDeletion: true,
          validateBackupEncryption: true,
          checkComplianceStandards: true
        }
      }
    ],
    tags: ['encryption', 'protection', 'compliance']
  };

  /**
   * Rule: Access logging and audit trail
   */
  static readonly AUDIT_LOGGING: RuleDefinition = {
    id: 'security_audit_logging',
    name: 'Access Logging and Audit Trail',
    description: 'Validates access logging and maintains audit trails',
    category: 'security',
    priority: 75,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['create', 'read', 'update', 'delete', 'login', 'logout']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.audit',
        config: {
          requireActivityLogging: true,
          logSensitiveOperations: true,
          maintainAuditTrail: true,
          requireImmutableLogs: true,
          maxLogRetentionPeriod: 365, // days
          requireLogEncryption: true,
          enableRealTimeMonitoring: true
        }
      }
    ],
    tags: ['logging', 'audit', 'compliance']
  };

  /**
   * Get all security validation rules
   */
  static getAllRules(): RuleDefinition[] {
    return [
      this.AUTHENTICATION,
      this.AUTHORIZATION,
      this.DATA_ACCESS,
      this.SESSION_SECURITY,
      this.API_SECURITY,
      this.ACCOUNT_MONITORING,
      this.DATA_PROTECTION,
      this.AUDIT_LOGGING
    ];
  }

  /**
   * Get rules by tag
   */
  static getRulesByTag(tag: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.tags?.includes(tag)
    );
  }

  /**
   * Get rules by category
   */
  static getRulesByCategory(category: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.category === category
    );
  }
}

/**
 * Security validation utilities
 */
export class SecurityValidationUtils {
  /**
   * Validate authentication credentials
   */
  static validateAuthentication(credentials: {
    email?: string;
    username?: string;
    password: string;
  }, config: {
    requireValidCredentials?: boolean;
    checkPasswordStrength?: boolean;
    maxLoginAttempts?: number;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      requireValidCredentials = true,
      checkPasswordStrength = true,
      maxLoginAttempts = 5
    } = config;

    // Validate email or username presence
    if (!credentials.email && !credentials.username) {
      errors.push({
        field: 'credentials',
        code: 'MISSING_IDENTIFIER',
        message: 'Email or username is required',
        severity: 'error',
        value: credentials
      });
    }

    // Validate password presence
    if (!credentials.password) {
      errors.push({
        field: 'credentials.password',
        code: 'MISSING_PASSWORD',
        message: 'Password is required',
        severity: 'error',
        value: credentials.password
      });
    }

    // Check password strength if enabled
    if (checkPasswordStrength && credentials.password) {
      const passwordValidation = this.validatePasswordStrength(credentials.password);
      errors.push(...passwordValidation.errors);
      warnings.push(...passwordValidation.warnings);
    }

    // In a real implementation, you'd check:
    // - Login attempt limits
    // - Account lockout status
    // - Credential validation against database
    // - Device fingerprinting

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate authorization permissions
   */
  static validateAuthorization(userId: string, resource: string, action: string, config: {
    requireValidPermissions?: boolean;
    checkRoleHierarchy?: boolean;
    validateResourceOwnership?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      requireValidPermissions = true,
      checkRoleHierarchy = true,
      validateResourceOwnership = true
    } = config;

    // In a real implementation, you'd check:
    // - User permissions against resource requirements
    // - Role-based access control
    // - Resource ownership validation
    // - Permission hierarchy

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data access permissions
   */
  static validateDataAccess(userId: string, dataType: string, operation: string, config: {
    respectPrivacySettings?: boolean;
    requireConsentForSharing?: boolean;
    checkDataClassification?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      respectPrivacySettings = true,
      requireConsentForSharing = true,
      checkDataClassification = true
    } = config;

    // In a real implementation, you'd check:
    // - Data classification level
    // - User consent for data sharing
    // - Privacy settings compliance
    // - Data retention policies

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate session security
   */
  static validateSession(sessionToken: string, config: {
    maxSessionDuration?: number;
    requireSecureConnection?: boolean;
    checkSessionHijacking?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxSessionDuration = 24 * 60 * 60 * 1000,
      requireSecureConnection = true,
      checkSessionHijacking = true
    } = config;

    if (!sessionToken) {
      errors.push({
        field: 'session',
        code: 'INVALID_SESSION',
        message: 'Valid session token is required',
        severity: 'error',
        value: sessionToken
      });
    }

    // In a real implementation, you'd check:
    // - Session token validity
    // - Session expiration
    // - Secure connection requirements
    // - Session hijacking indicators

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate API request security
   */
  static validateAPIRequest(request: {
    apiKey?: string;
    signature?: string;
    timestamp?: number;
    userAgent?: string;
  }, config: {
    requireValidAPIKey?: boolean;
    checkRateLimiting?: boolean;
    validateRequestSignature?: boolean;
    requireHTTPS?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      requireValidAPIKey = true,
      checkRateLimiting = true,
      validateRequestSignature = true,
      requireHTTPS = true
    } = config;

    // Validate API key presence
    if (requireValidAPIKey && !request.apiKey) {
      errors.push({
        field: 'request.apiKey',
        code: 'MISSING_API_KEY',
        message: 'Valid API key is required',
        severity: 'error',
        value: request.apiKey
      });
    }

    // In a real implementation, you'd check:
    // - API key validity
    // - Request signature validation
    // - Rate limiting
    // - HTTPS requirement

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate password strength
   */
  private static validatePasswordStrength(password: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (password.length < 8) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_TOO_SHORT',
        message: 'Password must be at least 8 characters long',
        severity: 'error',
        value: password
      });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_UPPERCASE',
        message: 'Password must contain at least one uppercase letter',
        severity: 'error',
        value: password
      });
    }

    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_LOWERCASE',
        message: 'Password must contain at least one lowercase letter',
        severity: 'error',
        value: password
      });
    }

    if (!/\d/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_NUMBERS',
        message: 'Password must contain at least one number',
        severity: 'error',
        value: password
      });
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_SPECIAL',
        message: 'Password must contain at least one special character',
        severity: 'error',
        value: password
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for suspicious activity
   */
  static detectSuspiciousActivity(activity: {
    userId: string;
    action: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // In a real implementation, you'd check:
    // - Unusual login times
    // - Multiple failed login attempts
    // - Login from unusual locations
    // - Suspicious user agents
    // - Rapid successive actions

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}