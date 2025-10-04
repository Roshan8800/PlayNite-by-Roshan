import { RuleDefinition, RuleContext, ValidationResult, ValidationError, ValidationWarning } from '../types';

/**
 * User management validation rules for registration, profiles, and social interactions
 */
export class UserManagementRules {
  /**
   * Rule: User registration validation
   */
  static readonly USER_REGISTRATION: RuleDefinition = {
    id: 'user_registration_validation',
    name: 'User Registration Validation',
    description: 'Validates user registration data including email, username, and password',
    category: 'user',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'equals',
        value: 'register'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.user',
        config: {
          requireEmail: true,
          requireUsername: true,
          requirePassword: true,
          minAge: 13,
          maxAge: 120,
          checkEmailDomain: true,
          checkUsernameAvailability: true
        }
      }
    ],
    tags: ['registration', 'validation', 'user']
  };

  /**
   * Rule: Profile update validation
   */
  static readonly PROFILE_UPDATE: RuleDefinition = {
    id: 'user_profile_update_validation',
    name: 'Profile Update Validation',
    description: 'Validates user profile updates including display name, bio, and avatar',
    category: 'user',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'equals',
        value: 'update_profile'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.profile',
        config: {
          maxDisplayNameLength: 50,
          maxBioLength: 500,
          requireDisplayName: true,
          allowSpecialChars: false,
          checkProfanity: true
        }
      }
    ],
    tags: ['profile', 'update', 'validation']
  };

  /**
   * Rule: Social interaction rate limiting
   */
  static readonly SOCIAL_RATE_LIMIT: RuleDefinition = {
    id: 'user_social_rate_limit',
    name: 'Social Interaction Rate Limiting',
    description: 'Prevents spam and abuse in social interactions',
    category: 'user',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['follow', 'unfollow', 'like', 'comment', 'share']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.interaction',
        config: {
          maxFollowsPerHour: 50,
          maxLikesPerHour: 100,
          maxCommentsPerHour: 30,
          maxSharesPerHour: 20,
          checkSuspiciousPattern: true,
          requireMinInterval: 1000 // 1 second between actions
        }
      }
    ],
    tags: ['rate-limit', 'social', 'spam']
  };

  /**
   * Rule: Account security validation
   */
  static readonly ACCOUNT_SECURITY: RuleDefinition = {
    id: 'user_account_security',
    name: 'Account Security Validation',
    description: 'Validates account security settings and changes',
    category: 'user',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'in',
        value: ['change_password', 'change_email', 'enable_2fa', 'disable_2fa']
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.security',
        config: {
          requireCurrentPassword: true,
          requireStrongPassword: true,
          requireEmailVerification: true,
          checkPasswordHistory: true,
          maxPasswordAge: 90, // days
          requireReauthForSensitive: true
        }
      }
    ],
    tags: ['security', 'password', 'authentication']
  };

  /**
   * Rule: User content preferences validation
   */
  static readonly CONTENT_PREFERENCES: RuleDefinition = {
    id: 'user_content_preferences',
    name: 'Content Preferences Validation',
    description: 'Validates user content preferences and settings',
    category: 'user',
    priority: 70,
    enabled: true,
    conditions: [
      {
        field: 'data.action',
        operator: 'equals',
        value: 'update_preferences'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.preferences',
        config: {
          validContentTypes: ['posts', 'stories', 'reels', 'images', 'videos'],
          validNotificationSettings: ['push', 'email', 'sms'],
          validPrivacyLevels: ['public', 'friends', 'private'],
          requireValidCategories: true,
          maxCategories: 10
        }
      }
    ],
    tags: ['preferences', 'content', 'privacy']
  };

  /**
   * Rule: User verification status validation
   */
  static readonly VERIFICATION_STATUS: RuleDefinition = {
    id: 'user_verification_status',
    name: 'User Verification Status Validation',
    description: 'Validates actions based on user verification status',
    category: 'user',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.user.verification_status',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.action',
        config: {
          requireVerifiedForSensitive: ['delete_account', 'change_email', 'withdraw_funds'],
          allowUnverifiedForBasic: ['view_content', 'basic_interactions'],
          maxUnverifiedActions: 10,
          verificationGracePeriod: 7 // days
        }
      }
    ],
    tags: ['verification', 'status', 'permissions']
  };

  /**
   * Rule: User age and content restrictions
   */
  static readonly AGE_RESTRICTIONS: RuleDefinition = {
    id: 'user_age_restrictions',
    name: 'Age-based Content Restrictions',
    description: 'Applies age-appropriate content restrictions',
    category: 'user',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.user.age',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.content',
        config: {
          minAgeForAdultContent: 18,
          minAgeForMatureContent: 13,
          restrictExplicitContent: true,
          requireParentalConsent: false,
          ageVerificationRequired: ['alcohol', 'gambling', 'adult_content']
        }
      }
    ],
    tags: ['age', 'restrictions', 'content']
  };

  /**
   * Rule: User account status validation
   */
  static readonly ACCOUNT_STATUS: RuleDefinition = {
    id: 'user_account_status',
    name: 'Account Status Validation',
    description: 'Validates actions based on account status (active, suspended, etc.)',
    category: 'user',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.user.account_status',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.action',
        config: {
          blockedStatuses: ['suspended', 'banned', 'deactivated'],
          restrictedStatuses: ['limited', 'warning'],
          requireActiveFor: ['post_content', 'interact', 'access_premium'],
          allowReadOnlyFor: ['view_content', 'read_comments']
        }
      }
    ],
    tags: ['account', 'status', 'permissions']
  };

  /**
   * Get all user management rules
   */
  static getAllRules(): RuleDefinition[] {
    return [
      this.USER_REGISTRATION,
      this.PROFILE_UPDATE,
      this.SOCIAL_RATE_LIMIT,
      this.ACCOUNT_SECURITY,
      this.CONTENT_PREFERENCES,
      this.VERIFICATION_STATUS,
      this.AGE_RESTRICTIONS,
      this.ACCOUNT_STATUS
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
 * User management validation utilities
 */
export class UserValidationUtils {
  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!email || typeof email !== 'string') {
      errors.push({
        field: 'email',
        code: 'INVALID_EMAIL',
        message: 'Email is required and must be a string',
        severity: 'error',
        value: email
      });
      return { isValid: false, errors, warnings };
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        code: 'INVALID_EMAIL_FORMAT',
        message: 'Email format is invalid',
        severity: 'error',
        value: email
      });
    }

    // Check for suspicious patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      errors.push({
        field: 'email',
        code: 'SUSPICIOUS_EMAIL',
        message: 'Email contains suspicious characters',
        severity: 'error',
        value: email
      });
    }

    // Check email length
    if (email.length > 254) {
      errors.push({
        field: 'email',
        code: 'EMAIL_TOO_LONG',
        message: 'Email address is too long',
        severity: 'error',
        value: email
      });
    }

    // Check for disposable email domains (simplified check)
    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && disposableDomains.some(d => domain.includes(d))) {
      warnings.push({
        field: 'email',
        code: 'DISPOSABLE_EMAIL',
        message: 'Email domain may be temporary',
        suggestion: 'Consider using a permanent email address'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate username
   */
  static validateUsername(username: string, config: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
    checkProfanity?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      minLength = 3,
      maxLength = 30,
      allowSpecialChars = false,
      checkProfanity = true
    } = config;

    if (!username || typeof username !== 'string') {
      errors.push({
        field: 'username',
        code: 'INVALID_USERNAME',
        message: 'Username is required and must be a string',
        severity: 'error',
        value: username
      });
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (username.length < minLength) {
      errors.push({
        field: 'username',
        code: 'USERNAME_TOO_SHORT',
        message: `Username must be at least ${minLength} characters`,
        severity: 'error',
        value: username,
        constraints: { minLength }
      });
    }

    if (username.length > maxLength) {
      errors.push({
        field: 'username',
        code: 'USERNAME_TOO_LONG',
        message: `Username must be at most ${maxLength} characters`,
        severity: 'error',
        value: username,
        constraints: { maxLength }
      });
    }

    // Character validation
    if (!allowSpecialChars) {
      const validPattern = /^[a-zA-Z0-9_]+$/;
      if (!validPattern.test(username)) {
        errors.push({
          field: 'username',
          code: 'INVALID_USERNAME_CHARS',
          message: 'Username can only contain letters, numbers, and underscores',
          severity: 'error',
          value: username
        });
      }
    }

    // Check for profanity (simplified)
    if (checkProfanity) {
      const profanityWords = ['admin', 'moderator', 'system', 'support'];
      const lowerUsername = username.toLowerCase();
      if (profanityWords.some(word => lowerUsername.includes(word))) {
        warnings.push({
          field: 'username',
          code: 'USERNAME_PROFANITY',
          message: 'Username may contain reserved words',
          suggestion: 'Choose a different username'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string, config: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true
    } = config;

    if (!password || typeof password !== 'string') {
      errors.push({
        field: 'password',
        code: 'INVALID_PASSWORD',
        message: 'Password is required',
        severity: 'error',
        value: password
      });
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (password.length < minLength) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_TOO_SHORT',
        message: `Password must be at least ${minLength} characters`,
        severity: 'error',
        value: password,
        constraints: { minLength }
      });
    }

    // Character requirements
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_UPPERCASE',
        message: 'Password must contain at least one uppercase letter',
        severity: 'error',
        value: password
      });
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_LOWERCASE',
        message: 'Password must contain at least one lowercase letter',
        severity: 'error',
        value: password
      });
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_NUMBERS',
        message: 'Password must contain at least one number',
        severity: 'error',
        value: password
      });
    }

    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'PASSWORD_NO_SPECIAL',
        message: 'Password must contain at least one special character',
        severity: 'error',
        value: password
      });
    }

    // Check for common weak patterns
    if (password.toLowerCase().includes('password') || password.includes('123456')) {
      warnings.push({
        field: 'password',
        code: 'PASSWORD_COMMON_PATTERN',
        message: 'Password contains common patterns that may be weak',
        suggestion: 'Choose a more unique password'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check rate limiting for social interactions
   */
  static checkRateLimit(action: string, userId: string, config: {
    maxActionsPerHour?: number;
    timeWindow?: number;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxActionsPerHour = 100,
      timeWindow = 60 * 60 * 1000 // 1 hour
    } = config;

    // In a real implementation, you'd check against a cache or database
    // For now, we'll simulate the check

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}