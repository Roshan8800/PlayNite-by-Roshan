import { ErrorManager } from './ErrorManager';
import { ErrorCategory, ErrorSeverity, PlayNiteError } from './types';
import { notificationService } from '../services/notification-service';
import { notificationAnalyticsService } from '../services/notification-analytics-service';

export class ErrorIntegrationService {
  private static instance: ErrorIntegrationService;
  private errorManager = ErrorManager.getInstance();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ErrorIntegrationService {
    if (!ErrorIntegrationService.instance) {
      ErrorIntegrationService.instance = new ErrorIntegrationService();
    }
    return ErrorIntegrationService.instance;
  }

  public initialize(): void {
    if (this.isInitialized) return;

    // Listen to error manager events
    this.errorManager.addErrorListener((error) => {
      this.handleError(error);
    });

    this.isInitialized = true;
  }

  private async handleError(error: PlayNiteError): Promise<void> {
    try {
      // Track error analytics
      await this.trackErrorAnalytics(error);

      // Send notifications based on error severity and category
      await this.sendErrorNotifications(error);

      // Log critical errors for admin review
      if (error.severity === ErrorSeverity.CRITICAL) {
        await this.logCriticalError(error);
      }
    } catch (integrationError) {
      console.error('Error in error integration service:', integrationError);
    }
  }

  private async trackErrorAnalytics(error: PlayNiteError): Promise<void> {
    try {
      // Track error occurrence for analytics
      await notificationAnalyticsService.trackNotificationEvent(
        `error_${error.id}`,
        'sent', // Using 'sent' as a generic event for error tracking
        {
          errorCategory: error.category,
          errorSeverity: error.severity,
          errorMessage: error.message,
          userId: error.context.userId,
          component: error.context.component,
          url: error.context.url,
          timestamp: error.timestamp.toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to track error analytics:', error);
    }
  }

  private async sendErrorNotifications(error: PlayNiteError): Promise<void> {
    try {
      // Determine if user should be notified
      const shouldNotifyUser = this.shouldNotifyUser(error);
      
      if (shouldNotifyUser && error.context.userId) {
        await this.sendUserErrorNotification(error);
      }

      // Send admin notifications for critical errors
      if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
        await this.sendAdminErrorNotification(error);
      }
    } catch (error) {
      console.error('Failed to send error notifications:', error);
    }
  }

  private shouldNotifyUser(error: PlayNiteError): boolean {
    // Don't notify users about their own UI component errors unless critical
    if (error.category === ErrorCategory.UI_COMPONENT && error.severity !== ErrorSeverity.CRITICAL) {
      return false;
    }

    // Notify about authentication errors
    if (error.category === ErrorCategory.AUTHENTICATION) {
      return true;
    }

    // Notify about network errors that affect user experience
    if (error.category === ErrorCategory.NETWORK && error.severity !== ErrorSeverity.LOW) {
      return true;
    }

    // Notify about validation errors with user-friendly messages
    if (error.category === ErrorCategory.VALIDATION && error.userMessage) {
      return true;
    }

    return false;
  }

  private async sendUserErrorNotification(error: PlayNiteError): Promise<void> {
    if (!error.context.userId) return;

    try {
      await notificationService.createNotification(
        error.context.userId,
        'system',
        'Error Occurred',
        error.userMessage || 'An error occurred while processing your request.',
        {
          errorId: error.id,
          errorCategory: error.category,
          errorSeverity: error.severity,
          originalError: error.originalError?.message,
          component: error.context.component,
          action: error.context.action,
          canRetry: error.retryable,
          recoveryActions: error.recoveryActions?.map(action => action.label) || []
        },
        {
          priority: this.mapSeverityToPriority(error.severity),
          category: 'system',
          channels: {
            inApp: true,
            push: error.severity === ErrorSeverity.CRITICAL,
            email: false
          }
        }
      );
    } catch (error) {
      console.error('Failed to send user error notification:', error);
    }
  }

  private async sendAdminErrorNotification(error: PlayNiteError): Promise<void> {
    try {
      // Get admin user IDs (this would typically come from a configuration or database)
      const adminUserIds = await this.getAdminUserIds();
      
      for (const adminId of adminUserIds) {
        await notificationService.createNotification(
          adminId,
          'system',
          'Critical Error Alert',
          `A ${error.severity} ${error.category} error occurred: ${error.message}`,
          {
            errorId: error.id,
            errorCategory: error.category,
            errorSeverity: error.severity,
            errorMessage: error.message,
            userId: error.context.userId,
            component: error.context.component,
            url: error.context.url,
            stackTrace: error.context.stackTrace,
            timestamp: error.timestamp.toISOString(),
            affectedUsers: await this.getAffectedUserCount(error)
          },
          {
            priority: 'urgent',
            category: 'system',
            channels: {
              inApp: true,
              push: true,
              email: true
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to send admin error notification:', error);
    }
  }

  private async logCriticalError(error: PlayNiteError): Promise<void> {
    try {
      // Log to external error tracking service (e.g., Sentry, LogRocket)
      console.error('Critical Error Logged:', {
        id: error.id,
        message: error.message,
        category: error.category,
        severity: error.severity,
        context: error.context,
        timestamp: error.timestamp,
        stackTrace: error.context.stackTrace
      });

      // In production, this would send to external services:
      // await this.sendToExternalLoggingService(error);
    } catch (error) {
      console.error('Failed to log critical error:', error);
    }
  }

  private mapSeverityToPriority(severity: ErrorSeverity): 'low' | 'normal' | 'high' | 'urgent' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'urgent';
      case ErrorSeverity.HIGH:
        return 'high';
      case ErrorSeverity.MEDIUM:
        return 'normal';
      case ErrorSeverity.LOW:
        return 'low';
      default:
        return 'normal';
    }
  }

  private async getAdminUserIds(): Promise<string[]> {
    // This would typically query a database or configuration for admin users
    // For now, return empty array - implement based on your user management system
    return [];
  }

  private async getAffectedUserCount(error: PlayNiteError): Promise<number> {
    // This would analyze the error to determine how many users might be affected
    // For now, return 1 if it's a user-specific error, or estimate based on error type
    if (error.context.userId) {
      return 1;
    }
    
    // For system-wide errors, you might want to estimate based on active users
    return 0;
  }

  // Public method to manually report errors with integration
  public async reportErrorWithIntegration(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: any = {}
  ): Promise<PlayNiteError> {
    const playNiteError = this.errorManager.reportError(error, category, severity, context);
    await this.handleError(playNiteError);
    return playNiteError;
  }

  // Get error analytics for a specific period
  public async getErrorAnalytics(
    userId?: string,
    period: 'day' | 'week' | 'month' | 'year' = 'week'
  ) {
    try {
      if (userId) {
        return await notificationAnalyticsService.getNotificationAnalytics(userId, period);
      }
      
      // For admin view, aggregate across all users
      return await this.getAggregatedErrorAnalytics(period);
    } catch (error) {
      console.error('Failed to get error analytics:', error);
      return null;
    }
  }

  private async getAggregatedErrorAnalytics(period: string) {
    // This would aggregate error analytics across all users
    // For now, return a placeholder structure
    return {
      period,
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      topErrorTypes: [],
      averageResolutionTime: 0,
      userImpact: 0
    };
  }

  // Clean up old error records
  public cleanupOldErrors(daysToKeep: number = 30): void {
    // This would clean up old error records from storage
    // Implementation depends on your storage strategy
    console.log(`Cleaning up errors older than ${daysToKeep} days`);
  }
}

// Export singleton instance
export const errorIntegrationService = ErrorIntegrationService.getInstance();
