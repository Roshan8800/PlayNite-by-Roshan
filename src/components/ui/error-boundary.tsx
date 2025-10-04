'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorManager, PlayNiteError, ErrorCategory, ErrorSeverity } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: PlayNiteError) => void;
  showErrorDetails?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  playNiteError?: PlayNiteError;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorManager = ErrorManager.getInstance();
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || 'Unknown Component';

    const playNiteError = this.errorManager.reportError(
      error,
      ErrorCategory.UI_COMPONENT,
      ErrorSeverity.HIGH,
      {
        component: componentName,
        action: 'render',
        metadata: {
          errorInfo: errorInfo.componentStack,
          retryCount: this.state.retryCount
        },
        stackTrace: error.stack
      }
    );

    this.setState({
      errorInfo,
      playNiteError
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(playNiteError);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        playNiteError: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    if (this.state.playNiteError) {
      // This would typically open a bug report form or send to error tracking service
      const errorDetails = {
        errorId: this.state.playNiteError.id,
        message: this.state.playNiteError.message,
        component: this.props.componentName,
        timestamp: this.state.playNiteError.timestamp,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // For now, just log to console - in production this would send to bug tracking service
      console.log('Bug report details:', errorDetails);

      // You could also copy to clipboard for easy reporting
      navigator.clipboard?.writeText(JSON.stringify(errorDetails, null, 2));
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const error = this.state.playNiteError;

      return (
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Something went wrong</CardTitle>
            <CardDescription>
              {error?.userMessage || 'An unexpected error occurred while loading this component.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {this.props.showErrorDetails && this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="font-mono text-xs text-red-600 break-all">
                    {this.state.error.message}
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </Button>
              )}

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>

              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={this.handleReportBug}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report Bug
                </Button>
              )}
            </div>

            {error?.recoveryActions && error.recoveryActions.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Suggested actions:</p>
                <div className="flex flex-col gap-2">
                  {error.recoveryActions.map((action) => (
                    <Button
                      key={action.id}
                      onClick={action.action}
                      variant={action.primary ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for functional components to report errors
export function useErrorHandler() {
  const errorManager = ErrorManager.getInstance();

  return (error: Error | string, category: ErrorCategory = ErrorCategory.UI_COMPONENT, context?: any) => {
    return errorManager.reportError(error, category, ErrorSeverity.MEDIUM, context);
  };
}