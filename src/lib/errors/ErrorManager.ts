import {
  ErrorCategory,
  ErrorSeverity,
  PlayNiteError,
  ErrorContext,
  RecoveryAction,
  ErrorMetrics,
  CircuitBreakerState,
  RetryConfig
} from './types';

export class ErrorManager {
  private static instance: ErrorManager;
  private errors: Map<string, PlayNiteError> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorListeners: Array<(error: PlayNiteError) => void> = [];
  private retryConfigs: Map<ErrorCategory, RetryConfig> = new Map();

  private constructor() {
    this.initializeDefaultRetryConfigs();
  }

  public static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  private initializeDefaultRetryConfigs(): void {
    const defaultConfigs: Partial<Record<ErrorCategory, RetryConfig>> = {
      [ErrorCategory.NETWORK]: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.EXTERNAL_API]
      },
      [ErrorCategory.EXTERNAL_API]: {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 8000,
        backoffMultiplier: 2.5
      },
      [ErrorCategory.DATABASE]: {
        maxAttempts: 2,
        baseDelay: 500,
        maxDelay: 3000,
        backoffMultiplier: 2
      }
    };

    Object.entries(defaultConfigs).forEach(([category, config]) => {
      if (config) {
        this.retryConfigs.set(category as ErrorCategory, config);
      }
    });
  }

  public reportError(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {}
  ): PlayNiteError {
    const errorId = this.generateErrorId();
    const playNiteError: PlayNiteError = {
      id: errorId,
      message: typeof error === 'string' ? error : error.message,
      category,
      severity,
      context: {
        timestamp: new Date(),
        ...context
      },
      originalError: typeof error === 'object' ? error : undefined,
      retryable: this.isRetryable(category),
      timestamp: new Date()
    };

    // Add user-friendly message based on category
    playNiteError.userMessage = this.getUserFriendlyMessage(playNiteError);

    // Add recovery actions
    playNiteError.recoveryActions = this.getRecoveryActions(playNiteError);

    // Store error
    this.errors.set(errorId, playNiteError);

    // Update circuit breaker
    this.updateCircuitBreaker(category);

    // Log error
    this.logError(playNiteError);

    // Notify listeners
    this.notifyListeners(playNiteError);

    return playNiteError;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isRetryable(category: ErrorCategory): boolean {
    const config = this.retryConfigs.get(category);
    return config !== undefined && config.maxAttempts > 1;
  }

  private getUserFriendlyMessage(error: PlayNiteError): string {
    const messages: Partial<Record<ErrorCategory, string>> = {
      [ErrorCategory.NETWORK]: 'Connection problem. Please check your internet and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Please sign in to continue.',
      [ErrorCategory.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [ErrorCategory.DATABASE]: 'Data temporarily unavailable. Please try again.',
      [ErrorCategory.FILE_SYSTEM]: 'File operation failed. Please try again.',
      [ErrorCategory.EXTERNAL_API]: 'External service temporarily unavailable.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.UI_COMPONENT]: 'Something went wrong with the interface. Please refresh the page.',
      [ErrorCategory.BUSINESS_LOGIC]: 'Operation not allowed. Please check your data.',
      [ErrorCategory.SYSTEM]: 'System error occurred. Please try again later.'
    };

    return messages[error.category] || 'An unexpected error occurred. Please try again.';
  }

  private getRecoveryActions(error: PlayNiteError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.category) {
      case ErrorCategory.NETWORK:
        actions.push({
          id: 'retry',
          label: 'Try Again',
          action: () => this.retryOperation(error),
          primary: true
        });
        actions.push({
          id: 'check_connection',
          label: 'Check Connection',
          action: () => window.location.reload()
        });
        break;

      case ErrorCategory.AUTHENTICATION:
        actions.push({
          id: 'login',
          label: 'Sign In',
          action: () => { window.location.href = '/login'; },
          primary: true
        });
        break;

      case ErrorCategory.UI_COMPONENT:
        actions.push({
          id: 'refresh',
          label: 'Refresh Page',
          action: () => window.location.reload(),
          primary: true
        });
        break;

      default:
        actions.push({
          id: 'retry',
          label: 'Try Again',
          action: () => this.retryOperation(error),
          primary: true
        });
    }

    return actions;
  }

  private async retryOperation(error: PlayNiteError): Promise<void> {
    // This would be implemented by the calling code
    // The error context should contain the original operation
    if (error.context.metadata?.retryFunction) {
      await error.context.metadata.retryFunction();
    }
  }

  private updateCircuitBreaker(category: ErrorCategory): void {
    const key = category;
    const state = this.circuitBreakers.get(key) || {
      isOpen: false,
      failureCount: 0
    };

    state.failureCount++;
    state.lastFailureTime = new Date();

    // Open circuit after 5 failures
    if (state.failureCount >= 5) {
      state.isOpen = true;
      // Set next retry time (30 seconds from now)
      state.nextRetryTime = new Date(Date.now() + 30000);
    }

    this.circuitBreakers.set(key, state);
  }

  public canAttemptOperation(category: ErrorCategory): boolean {
    const state = this.circuitBreakers.get(category);
    if (!state?.isOpen) return true;

    if (state.nextRetryTime && new Date() >= state.nextRetryTime) {
      // Reset circuit breaker for retry
      state.isOpen = false;
      state.failureCount = 0;
      this.circuitBreakers.set(category, state);
      return true;
    }

    return false;
  }

  private logError(error: PlayNiteError): void {
    const logData = {
      id: error.id,
      message: error.message,
      category: error.category,
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('PlayNite Error:', logData);
    }

    // In production, this would send to logging service
    // this.sendToLoggingService(logData);
  }

  private notifyListeners(error: PlayNiteError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  public addErrorListener(listener: (error: PlayNiteError) => void): void {
    this.errorListeners.push(listener);
  }

  public removeErrorListener(listener: (error: PlayNiteError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  public getErrorsByCategory(category: ErrorCategory): PlayNiteError[] {
    return Array.from(this.errors.values()).filter(error => error.category === category);
  }

  public getErrorsBySeverity(severity: ErrorSeverity): PlayNiteError[] {
    return Array.from(this.errors.values()).filter(error => error.severity === severity);
  }

  public getRecentErrors(minutes: number = 60): PlayNiteError[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return Array.from(this.errors.values()).filter(error => error.timestamp >= cutoffTime);
  }

  public getErrorMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values());
    const recentErrors = this.getRecentErrors(60); // Last hour

    const errorsByCategory = errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      averageResolutionTime: 0, // Would be calculated from resolved errors
      retrySuccessRate: 0 // Would be calculated from retry attempts
    };
  }

  public resolveError(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
    }
  }

  public clearResolvedErrors(): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.resolved) {
        this.errors.delete(id);
      }
    }
  }
}