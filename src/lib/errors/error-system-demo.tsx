'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ErrorFallback, NetworkErrorFallback, AuthErrorFallback, useErrorHandler } from '@/components/ui/error-fallback';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorManager, ErrorCategory, ErrorSeverity, errorIntegrationService } from '@/lib/errors';
import { withNetworkRetry, CircuitBreakerManager } from '@/lib/errors';

// Demo component that throws errors for testing
function ErrorThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Demo error for testing error boundary');
  }
  return <div className="p-4 bg-green-50 rounded">Component working normally</div>;
}

// Component that demonstrates error handling
function ErrorDemoComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [emptyState, setEmptyState] = useState<EmptyStateType>('no-content');
  const { handleError, withErrorHandling } = useErrorHandler();

  // Initialize error integration service
  useEffect(() => {
    errorIntegrationService.initialize();
  }, []);

  // Demo function that simulates network operations with retry
  const performNetworkOperation = async () => {
    return withNetworkRetry(async () => {
      if (Math.random() < 0.7) { // 70% chance of failure
        throw new Error('Network request failed');
      }
      return 'Success!';
    }, {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt}:`, error.message);
      }
    });
  };

  // Demo function that uses circuit breaker
  const performApiOperation = async () => {
    const circuitBreakerManager = CircuitBreakerManager.getInstance();
    
    return circuitBreakerManager.withCircuitBreaker('demo-api', async () => {
      if (Math.random() < 0.8) { // 80% chance of failure
        throw new Error('API call failed');
      }
      return 'API Success!';
    });
  };

  const handleNetworkDemo = async () => {
    try {
      setNetworkError(false);
      const result = await performNetworkOperation();
      console.log('Network operation result:', result);
    } catch (error) {
      setNetworkError(true);
      handleError(error as Error, ErrorCategory.NETWORK);
    }
  };

  const handleApiDemo = async () => {
    try {
      const result = await performApiOperation();
      console.log('API operation result:', result);
    } catch (error) {
      handleError(error as Error, ErrorCategory.EXTERNAL_API);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Error Management System Demo</CardTitle>
          <CardDescription>
            Test various error scenarios and see how the error management system handles them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleNetworkDemo} variant="outline">
              Test Network Error Handling
            </Button>
            <Button onClick={handleApiDemo} variant="outline">
              Test API Circuit Breaker
            </Button>
          </div>

          {networkError && (
            <NetworkErrorFallback onRetry={handleNetworkDemo} />
          )}
        </CardContent>
      </Card>

      {/* Error Boundary Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Demo</CardTitle>
          <CardDescription>
            Click the button to trigger an error and see how the error boundary handles it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => setShouldThrow(!shouldThrow)}
            variant={shouldThrow ? "destructive" : "outline"}
          >
            {shouldThrow ? 'Fix Error' : 'Trigger Error'}
          </Button>
          
          <ErrorBoundary componentName="ErrorDemoComponent">
            <ErrorThrowingComponent shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </CardContent>
      </Card>

      {/* Empty State Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Empty State Demo</CardTitle>
          <CardDescription>
            Select different empty state scenarios to see how they're displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              'no-content', 'no-search-results', 'no-notifications', 'no-followers',
              'no-videos', 'no-comments', 'network-error', 'loading'
            ].map((type) => (
              <Button
                key={type}
                size="sm"
                variant={emptyState === type ? "default" : "outline"}
                onClick={() => setEmptyState(type as EmptyStateType)}
              >
                {type.replace('-', ' ')}
              </Button>
            ))}
          </div>
          
          <div className="min-h-[200px]">
            <EmptyState 
              type={emptyState}
              onRetry={() => console.log('Retry clicked')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Manager Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Error Manager Statistics</CardTitle>
          <CardDescription>
            Real-time error statistics from the error management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorStatsDisplay />
        </CardContent>
      </Card>
    </div>
  );
}

// Component to display error statistics
function ErrorStatsDisplay() {
  const [stats, setStats] = useState<any>(null);
  const errorManager = ErrorManager.getInstance();

  useEffect(() => {
    const updateStats = () => {
      const errorMetrics = errorManager.getErrorMetrics();
      const recentErrors = errorManager.getRecentErrors(60); // Last hour
      
      setStats({
        totalErrors: errorMetrics.totalErrors,
        recentErrors: recentErrors.length,
        errorsByCategory: errorMetrics.errorsByCategory,
        errorsBySeverity: errorMetrics.errorsBySeverity
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div>Loading statistics...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-4 bg-gray-50 rounded">
        <div className="text-2xl font-bold text-gray-900">{stats.totalErrors}</div>
        <div className="text-sm text-gray-600">Total Errors</div>
      </div>
      <div className="text-center p-4 bg-blue-50 rounded">
        <div className="text-2xl font-bold text-blue-900">{stats.recentErrors}</div>
        <div className="text-sm text-blue-600">Recent (1h)</div>
      </div>
      <div className="text-center p-4 bg-yellow-50 rounded">
        <div className="text-2xl font-bold text-yellow-900">
          {Object.keys(stats.errorsByCategory).length}
        </div>
        <div className="text-sm text-yellow-600">Categories</div>
      </div>
      <div className="text-center p-4 bg-green-50 rounded">
        <div className="text-2xl font-bold text-green-900">
          {Object.keys(stats.errorsBySeverity).length}
        </div>
        <div className="text-sm text-green-600">Severities</div>
      </div>
    </div>
  );
}

// Main demo page component
export function ErrorSystemDemo() {
  return (
    <ErrorBoundary componentName="ErrorSystemDemo">
      <ErrorDemoComponent />
    </ErrorBoundary>
  );
}

export default ErrorSystemDemo;
