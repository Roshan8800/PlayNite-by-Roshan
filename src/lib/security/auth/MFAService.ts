import { signInWithEmailAndPassword, multiFactor, User, PhoneAuthProvider, PhoneMultiFactorGenerator, MultiFactorResolver, MultiFactorError, getMultiFactorResolver } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { securityManager } from '../core/SecurityManager';

/**
 * MFA Provider Types
 */
export enum MFAProvider {
  SMS = 'sms',
  TOTP = 'totp', // Time-based One-Time Password
  EMAIL = 'email'
}

/**
 * MFA Enrollment Data
 */
interface MFAEnrollment {
  uid: string;
  provider: MFAProvider;
  phoneNumber?: string;
  email?: string;
  enrolledAt: Date;
  lastUsed?: Date;
  enabled: boolean;
}

/**
 * MFA Verification Result
 */
interface MFAVerificationResult {
  success: boolean;
  user?: User;
  error?: string;
  retryRequired?: boolean;
}

/**
 * MFA Service for PlayNite
 * Handles multi-factor authentication setup, verification, and management
 */
export class MFAService {
  private enrolledFactors: Map<string, MFAEnrollment[]> = new Map();

  constructor() {
    this.initializeMFAListeners();
  }

  /**
   * Initialize MFA event listeners
   */
  private initializeMFAListeners(): void {
    // Listen for authentication state changes to handle MFA requirements
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.loadUserMFAFactors(user.uid);
      }
    });
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const enrollments = this.enrolledFactors.get(userId) || [];
    return enrollments.some(e => e.enabled);
  }

  /**
   * Check if MFA is required for user/operation
   */
  async isMFARequired(userId: string, operation: string): Promise<boolean> {
    // Check security manager configuration
    return securityManager.getSecurityConfig().mfa.enabled &&
           securityManager.getSecurityConfig().mfa.requiredRoles.includes('admin'); // Simplified check
  }

  /**
   * Enroll user in SMS-based MFA
   */
  async enrollSMSMFA(
    user: User,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; verificationId?: string }> {
    try {
      // Generate phone number hint for MFA
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const recaptchaVerifier = {
        type: 'recaptcha',
        size: 'normal'
      } as any;
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);

      // Store enrollment data temporarily until verification
      const enrollment: MFAEnrollment = {
        uid: user.uid,
        provider: MFAProvider.SMS,
        phoneNumber,
        enrolledAt: new Date(),
        enabled: false
      };

      if (!this.enrolledFactors.has(user.uid)) {
        this.enrolledFactors.set(user.uid, []);
      }
      this.enrolledFactors.get(user.uid)!.push(enrollment);

      return {
        success: true,
        verificationId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS MFA enrollment failed'
      };
    }
  }

  /**
   * Verify SMS MFA enrollment
   */
  async verifySMSMFAEnrollment(
    user: User,
    verificationId: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const phoneCredential = PhoneAuthProvider.credential(verificationId, verificationCode);

      // Enroll the second factor
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneCredential);
      await multiFactor(user).enroll(multiFactorAssertion, 'Phone Number');

      // Update enrollment status
      const enrollments = this.enrolledFactors.get(user.uid) || [];
      const smsEnrollment = enrollments.find(e => e.provider === MFAProvider.SMS && !e.enabled);

      if (smsEnrollment) {
        smsEnrollment.enabled = true;
        smsEnrollment.lastUsed = new Date();
      }

      // Log MFA enrollment
      await securityManager.validateSecurityContext({
        userId: user.uid,
        ipAddress: 'system',
        userAgent: 'system',
        timestamp: new Date(),
        operation: 'mfa_enrollment'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS MFA verification failed'
      };
    }
  }

  /**
   * Authenticate user with MFA challenge
   */
  async authenticateWithMFA(
    email: string,
    password: string,
    mfaCode: string,
    context: any
  ): Promise<MFAVerificationResult> {
    try {
      // First, authenticate with email/password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      // Check if user has MFA enrolled
      const userEnrollments = this.enrolledFactors.get(user.uid) || [];
      const enabledFactors = userEnrollments.filter(e => e.enabled);

      if (enabledFactors.length === 0) {
        return {
          success: true,
          user
        };
      }

      // For now, simulate MFA verification
      // In production, this would verify against enrolled factors
      const isValidMFA = await this.verifyMFACode(user.uid, mfaCode);

      if (!isValidMFA) {
        return {
          success: false,
          error: 'Invalid MFA code',
          retryRequired: true
        };
      }

      // Update last used timestamp
      enabledFactors.forEach(factor => {
        factor.lastUsed = new Date();
      });

      return {
        success: true,
        user
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const firebaseError = error as any;

        // Handle MFA required error
        if (firebaseError.code === 'auth/multi-factor-auth-required') {
          return {
            success: false,
            error: 'MFA verification required',
            retryRequired: true
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Verify MFA code for enrolled user
   */
  private async verifyMFACode(userId: string, code: string): Promise<boolean> {
    // In production, this would verify against actual MFA providers
    // For now, simulate verification
    const enrollments = this.enrolledFactors.get(userId) || [];
    const enabledFactors = enrollments.filter(e => e.enabled);

    if (enabledFactors.length === 0) {
      return true; // No MFA required
    }

    // Simulate TOTP verification
    // In production, use proper TOTP verification
    return code.length === 6 && /^\d+$/.test(code);
  }

  /**
   * Get user's enrolled MFA factors
   */
  async getUserMFAFactors(userId: string): Promise<MFAEnrollment[]> {
    return this.enrolledFactors.get(userId) || [];
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(
    user: User,
    provider: MFAProvider
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const enrollments = this.enrolledFactors.get(user.uid) || [];
      const factorIndex = enrollments.findIndex(e => e.provider === provider && e.enabled);

      if (factorIndex === -1) {
        return {
          success: false,
          error: 'MFA factor not found or already disabled'
        };
      }

      // Remove the factor
      enrollments.splice(factorIndex, 1);

      // Log MFA disable
      await securityManager.validateSecurityContext({
        userId: user.uid,
        ipAddress: 'system',
        userAgent: 'system',
        timestamp: new Date(),
        operation: 'mfa_disabled'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable MFA'
      };
    }
  }

  /**
   * Generate backup codes for MFA
   */
  async generateBackupCodes(user: User, count: number = 10): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substr(2, 8).toUpperCase();
      codes.push(code);
    }

    // Store backup codes (in production, hash them)
    const enrollments = this.enrolledFactors.get(user.uid) || [];
    enrollments.forEach(enrollment => {
      if (!enrollment.enabled) return;
      enrollment.lastUsed = new Date();
    });

    return codes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    // In production, this would check against hashed backup codes in database
    // For now, simulate verification
    return code.length === 8 && /^[A-Z0-9]+$/.test(code);
  }

  /**
   * Load user's MFA factors from storage
   */
  private async loadUserMFAFactors(userId: string): Promise<void> {
    // In production, load from database
    // For now, use in-memory storage
    if (!this.enrolledFactors.has(userId)) {
      this.enrolledFactors.set(userId, []);
    }
  }

  /**
   * Get MFA statistics
   */
  async getMFAStatistics(): Promise<Record<string, any>> {
    const allEnrollments = Array.from(this.enrolledFactors.values()).flat();

    return {
      totalUsers: this.enrolledFactors.size,
      totalEnrollments: allEnrollments.length,
      enabledFactors: allEnrollments.filter(e => e.enabled).length,
      factorsByProvider: allEnrollments.reduce((acc, enrollment) => {
        acc[enrollment.provider] = (acc[enrollment.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      lastUpdated: new Date()
    };
  }

  /**
   * Clean up expired MFA sessions
   */
  cleanupExpiredMFASessions(): void {
    // Clean up any expired MFA verification sessions
    // Implementation would depend on your MFA provider
  }
}

// Export singleton instance
export const mfaService = new MFAService();