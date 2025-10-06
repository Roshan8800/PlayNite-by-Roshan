'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState, EmptyStateType } from '@/components/ui/empty-state';
import { ErrorManager, ErrorCategory, ErrorSeverity } from '@/lib/errors';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Shield, 
  Lock, 
  Database,
  Server,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  errorType?: ErrorCategory;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
  compact?: boolean;
}

export function ErrorFallback({
  error,
  errorType,
  onRetry,
  onGoHome,
  showDetails = false,
  className = '',
  compact = false
}: ErrorFallbackProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const errorManager = ErrorManager.getInstance();

  // Report error to error manager if not already reported
  useEffect(() => {
    if (error) {
      errorManager.reportError(
        error,
        errorType || ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        {
          component: 'ErrorFallback',
          action: 'display',
          metadata: {
            retryCount,
            compact,
            showDetails
          }
        }
      );
    }
  }, [error, errorType, retryCount, compact, showDetails]);

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorConfig = () => {
    if (errorType === ErrorCategory.NETWORK) {
      return {
        icon: <WifiOff className="w-8 h-8 text-orange-500" />,
        title: 'Connection Problem',
        description: 'Please check your internet connection and try again.',
        variant: 'default' as const,
        primaryAction: onRetry ? {
          label: 'Try Again',
          onClick: handleRetry,
          icon: <RefreshCw className="w-4 h-4" />,
          disabled: isRetrying,
          variant: 'outline' as const
        } : undefined
      };
    }

    if (errorType === ErrorCategory.AUTHENTICATION) {
      return {
        icon: <Lock className="w-8 h-8 text-red-500" />,
        title: 'Authentication Required',
        description: 'Please sign in to continue accessing this content.',
        variant: 'destructive' as const,
        primaryAction: {
          label: 'Sign In',
          onClick: () => window.location.href = '/login',
          icon: <Lock className="w-4 h-4" />,
          variant: 'default' as const
        }
      };
    }

    if (errorType === ErrorCategory.AUTHORIZATION) {
      return {
        icon: <Shield className="w-8 h-8 text-yellow-500" />,
        title: 'Access Denied',
        description: 'You don\'t have permission to access this content.',
        variant: 'default' as const,
        primaryAction: onGoHome ? {
          label: 'Go Home',
          onClick: onGoHome,
          icon: <RefreshCw className="w-4 h-4" />,
          variant: 'outline' as const
        } : undefined
      };
    }

    if (errorType === ErrorCategory.DATABASE) {
      return {
        icon: <Database className="w-8 h-8 text-red-500" />,
        title: 'Data Unavailable',
        description: 'We\'re having trouble loading the data. Please try again.',
        variant: 'destructive' as const,
        primaryAction: onRetry ? {
          label: 'Retry',
          onClick: handleRetry,
          icon: <RefreshCw className="w-4 h-4" />,
          disabled: isRetrying,
          variant: 'outline' as const
        } : undefined
      };
    }

    if (errorType === ErrorCategory.EXTERNAL_API) {
      return {
        icon: <Server className="w-8 h-8 text-orange-500" />,
        title: 'Service Unavailable',
        description: 'An external service is temporarily unavailable. Please try again later.',
        variant: 'default' as const,
        primaryAction: onRetry ? {
          label: 'Try Later',
          onClick: handleRetry,
          icon: <Clock className="w-4 h-4" />,
          disabled: isRetrying,
          variant: 'outline' as const
        } : undefined
      };
    }

    // Default error configuration
    return {
      icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      variant: 'destructive' as const,
      primaryAction: onRetry ? {
        label: 'Try Again',
        onClick: handleRetry,
        icon: <RefreshCw className="w-4 h-4" />,
        disabled: isRetrying,
        variant: 'default' as const
      } : undefined,
      secondaryAction: onGoHome ? {
        label: 'Go Home',
        onClick: onGoHome,
        icon: <RefreshCw className="w-4 h-4" />,
        variant: 'outline' as const
      } : undefined
    };
  };

  const config = getErrorConfig();

  if (compact) {
    return (
      <Alert variant={config.variant} className={className}>
        <div className="flex items-center gap-2">
          {config.icon}
          <div className="flex-1">
            <AlertDescription className="text-sm">
              {config.description}
            </AlertDescription>
          </div>
          {config.primaryAction && (
            <Button
              size="sm"
              variant={config.primaryAction.variant}
              onClick={config.primaryAction.onClick}
              disabled={config.primaryAction.disabled}
            >
              {config.primaryAction.icon}
              {config.primaryAction.label}
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          {config.icon}
        </div>
        <CardTitle className="text-gray-900">{config.title}</CardTitle>
        <CardDescription className="text-gray-600">
          {config.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {showDetails && error && (
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">
              Technical Details
            </summary>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-mono text-xs text-red-600 break-all">
                {error.message}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col gap-2">
          {config.primaryAction && (
            <Button
              onClick={config.primaryAction.onClick}
              disabled={config.primaryAction.disabled}
              className="w-full"
            >
              {config.primaryAction.icon}
              {config.primaryAction.label}
              {isRetrying && <RefreshCw className="w-4 h-4 ml-2 animate-spin" />}
            </Button>
          )}

          {config.secondaryAction && (
            <Button
              variant={config.secondaryAction.variant}
              onClick={config.secondaryAction.onClick}
              className="w-full"
            >
              {config.secondaryAction.icon}
              {config.secondaryAction.label}
            </Button>
          )}
        </div>

        {retryCount > 0 && (
          <p className="text-xs text-gray-500 text-center">
            Retry attempts: {retryCount}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized error fallback components
export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      errorType={ErrorCategory.NETWORK}
      onRetry={onRetry}
    />
  );
}

export function AuthErrorFallback() {
  return (
    <ErrorFallback
      errorType={ErrorCategory.AUTHENTICATION}
    />
  );
}

export function PermissionErrorFallback({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorFallback
      errorType={ErrorCategory.AUTHORIZATION}
      onGoHome={onGoHome}
    />
  );
}

export function DatabaseErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      errorType={ErrorCategory.DATABASE}
      onRetry={onRetry}
    />
  );
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const errorManager = ErrorManager.getInstance();

  const handleError = (error: Error | string, category: ErrorCategory = ErrorCategory.UNKNOWN) => {
    return errorManager.reportError(error, category, ErrorSeverity.MEDIUM, {
      component: 'useErrorHandler',
      action: 'handle'
    });
  };

  const withErrorHandling = async <T,>(
    operation: () => Promise<T>,
    category: ErrorCategory = ErrorCategory.UNKNOWN
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error as Error, category);
      throw error;
    }
  };

  return { handleError, withErrorHandling };
}

// Component that shows a success state after error recovery
export function ErrorRecoverySuccess({ 
  message = "Issue resolved successfully!",
  onContinue,
  className = "" 
}: { 
  message?: string;
  onContinue?: () => void;
  className?: string;
}) {
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Problem Solved
        </h3>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {onContinue && (
          <Button onClick={onContinue} className="w-full">
            Continue
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Component for showing maintenance mode
export function MaintenanceMode({ 
  message = "We're currently performing maintenance. Please check back soon.",
  estimatedTime,
  className = "" 
}: { 
  message?: string;
  estimatedTime?: string;
  className?: string;
}) {
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Server className="w-8 h-8 text-blue-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Under Maintenance
        </h3>
        
        <p className="text-gray-600 mb-4">
          {message}
        </p>

        {estimatedTime && (
          <p className="text-sm text-gray-500 mb-6">
            Estimated completion: {estimatedTime}
          </p>
        )}

        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Check Again
        </Button>
      </CardContent>
    </Card>
  );
}
