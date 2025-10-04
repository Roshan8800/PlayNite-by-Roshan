import { ErrorManager } from './ErrorManager';
import { ErrorCategory, RetryConfig } from './types';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

export class RetryManager {
  private errorManager = ErrorManager.getInstance();

  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryCondition = () => true,
      onRetry
    } = options;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if we should retry this error
        if (attempt === maxAttempts || !retryCondition(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );

        // Report retry attempt to error manager
        this.errorManager.reportError(
          `Retry attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
          ErrorCategory.NETWORK,
          undefined, // severity will be auto-determined
          {
            action: 'retry',
            metadata: {
              attempt,
              maxAttempts,
              delay,
              originalError: error.message
            }
          }
        );

        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, error);
        }

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    const { failureThreshold = 5, resetTimeout = 30000 } = options;
    this.options = { ...options, failureThreshold, resetTimeout };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= (this.options.resetTimeout || 30000);
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= (this.options.failureThreshold || 5)) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorManager = ErrorManager.getInstance();

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, options));
    }
    return this.circuitBreakers.get(name)!;
  }

  async withCircuitBreaker<T>(
    name: string,
    operation: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(name, options);
    
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      // Report circuit breaker events to error manager
      this.errorManager.reportError(
        `Circuit breaker '${name}' prevented operation: ${error.message}`,
        ErrorCategory.SYSTEM,
        undefined,
        {
          action: 'circuit_breaker',
          metadata: {
            circuitBreakerName: name,
            state: circuitBreaker.getState(),
            failureCount: circuitBreaker.getFailureCount()
          }
        }
      );
      throw error;
    }
  }
}

// Utility function for common retry scenarios
export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const retryManager = new RetryManager();
  
  return retryManager.withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and 5xx status codes
      return (
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        error.message?.includes('fetch') ||
        (error.status && error.status >= 500)
      );
    },
    ...options
  });
}

// Utility function for API calls with circuit breaker
export async function withApiProtection<T>(
  apiName: string,
  operation: () => Promise<T>
): Promise<T> {
  const circuitBreakerManager = CircuitBreakerManager.getInstance();
  
  return circuitBreakerManager.withCircuitBreaker(
    `api_${apiName}`,
    operation,
    {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000
    }
  );
}

// Combined utility for API calls with both retry and circuit breaker
export async function robustApiCall<T>(
  apiName: string,
  operation: () => Promise<T>,
  retryOptions?: Partial<RetryOptions>
): Promise<T> {
  return withApiProtection(apiName, () => 
    withNetworkRetry(operation, retryOptions)
  );
}
