import { NextRequest, NextResponse } from 'next/server';
import { RuleEngine } from '../core/RuleEngine';
import { RuleContext, RuleCategory } from '../types';
import { ContentValidationRules } from '../content';
import { UserManagementRules } from '../user';
import { BusinessLogicRules } from '../business';
import { SecurityValidationRules } from '../security';
import { PerformanceRules } from '../performance';

/**
 * Middleware configuration for rule application
 */
export interface RuleMiddlewareConfig {
  enabledCategories: RuleCategory[];
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  enableMetrics: boolean;
  skipPaths: string[];
  requireAuthPaths: string[];
  adminOnlyPaths: string[];
}

/**
 * Rule middleware for automatic rule application
 */
export class RuleMiddleware {
  private ruleEngine: RuleEngine;
  private config: RuleMiddlewareConfig;

  constructor(config: Partial<RuleMiddlewareConfig> = {}) {
    this.config = {
      enabledCategories: ['content', 'user', 'business', 'security', 'performance'],
      enableRequestLogging: true,
      enableResponseLogging: true,
      enableMetrics: true,
      skipPaths: ['/api/health', '/favicon.ico', '/robots.txt'],
      requireAuthPaths: ['/api/protected', '/api/admin'],
      adminOnlyPaths: ['/api/admin'],
      ...config
    };

    this.ruleEngine = new RuleEngine({
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      maxExecutionTime: 5000,
      enableParallelExecution: true,
      maxParallelRules: 10,
      enableMetrics: this.config.enableMetrics,
      logLevel: 'info'
    });

    this.initializeRules();
  }

  /**
   * Initialize all rules in the engine
   */
  private initializeRules(): void {
    // Register all rule definitions
    const allRules = [
      ...ContentValidationRules.getAllRules(),
      ...UserManagementRules.getAllRules(),
      ...BusinessLogicRules.getAllRules(),
      ...SecurityValidationRules.getAllRules(),
      ...PerformanceRules.getAllRules()
    ];

    for (const rule of allRules) {
      if (this.config.enabledCategories.includes(rule.category)) {
        this.ruleEngine.registerRule(rule);
      }
    }
  }

  /**
   * Process incoming request with rule validation
   */
  async processRequest(request: NextRequest, context?: any): Promise<{
    isValid: boolean;
    errors: any[];
    warnings: any[];
    modifiedRequest?: NextRequest;
  }> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Skip rule processing for configured paths
    if (this.shouldSkipPath(path)) {
      return { isValid: true, errors: [], warnings: [] };
    }

    try {
      // Create rule context from request
      const ruleContext = await this.createRuleContext(request, context);

      // Execute relevant rules based on path and method
      const results = await this.executeRelevantRules(ruleContext);

      // Combine all results
      const allErrors = results.flatMap(r => r.result.errors);
      const allWarnings = results.flatMap(r => r.result.warnings);

      // Log request if enabled
      if (this.config.enableRequestLogging) {
        this.logRequest(path, request.method, allErrors, allWarnings);
      }

      return {
        isValid: allErrors.filter(e => e.severity === 'error').length === 0,
        errors: allErrors,
        warnings: allWarnings
      };
    } catch (error) {
      console.error('Rule middleware error:', error);
      return {
        isValid: false,
        errors: [{
          field: 'middleware',
          code: 'PROCESSING_ERROR',
          message: 'Error processing request through rule engine',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Process response with rule validation
   */
  async processResponse(response: NextResponse, context?: any): Promise<{
    isValid: boolean;
    errors: any[];
    warnings: any[];
    modifiedResponse?: NextResponse;
  }> {
    try {
      // Create rule context from response
      const ruleContext = await this.createResponseRuleContext(response, context);

      // Execute response-related rules
      const results = await this.executeResponseRules(ruleContext);

      // Combine all results
      const allErrors = results.flatMap(r => r.result.errors);
      const allWarnings = results.flatMap(r => r.result.warnings);

      // Log response if enabled
      if (this.config.enableResponseLogging) {
        this.logResponse(response.status, allErrors, allWarnings);
      }

      return {
        isValid: allErrors.filter(e => e.severity === 'error').length === 0,
        errors: allErrors,
        warnings: allWarnings
      };
    } catch (error) {
      console.error('Rule middleware response error:', error);
      return {
        isValid: false,
        errors: [{
          field: 'middleware',
          code: 'RESPONSE_PROCESSING_ERROR',
          message: 'Error processing response through rule engine',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Get rule engine statistics
   */
  getStats() {
    return this.ruleEngine.getStats();
  }

  /**
   * Clear rule engine cache
   */
  clearCache(): void {
    this.ruleEngine.clearCache();
  }

  private shouldSkipPath(path: string): boolean {
    return this.config.skipPaths.some(skipPath =>
      path.startsWith(skipPath) || path === skipPath
    );
  }

  private async createRuleContext(request: NextRequest, context?: any): Promise<RuleContext> {
    const body = await this.parseRequestBody(request);
    const user = context?.user || this.extractUserFromRequest(request);

    return {
      request: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body
      },
      user,
      data: body,
      metadata: {
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent'),
        ipAddress: this.getClientIP(request),
        path: new URL(request.url).pathname
      }
    };
  }

  private async createResponseRuleContext(response: NextResponse, context?: any): Promise<RuleContext> {
    return {
      data: {
        response: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        }
      },
      user: context?.user,
      metadata: {
        timestamp: new Date(),
        processingTime: Date.now() - (context?.startTime || Date.now())
      }
    };
  }

  private async parseRequestBody(request: NextRequest): Promise<any> {
    try {
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        return await request.json();
      }

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        return Object.fromEntries(formData.entries());
      }

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const data: any = {};

        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            data[key] = {
              name: value.name,
              size: value.size,
              type: value.type,
              lastModified: value.lastModified
            };
          } else {
            data[key] = value;
          }
        }

        return data;
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractUserFromRequest(request: NextRequest): any {
    // Extract user from JWT token, session, or other auth mechanism
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // In a real implementation, you'd decode and validate the JWT
      // For now, return a basic user object
      return {
        id: 'anonymous',
        role: 'guest'
      };
    }

    return null;
  }

  private getClientIP(request: NextRequest): string {
    // Try to get real IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    return 'unknown';
  }

  /**
   * Execute relevant rules for a given context (public method for external access)
   */
  async executeRulesForContext(context: RuleContext): Promise<any[]> {
    return this.executeRelevantRules(context);
  }

  private async executeRelevantRules(context: RuleContext): Promise<any[]> {
    const results = [];

    // Determine which rule categories to execute based on request
    const path = context.request?.url || '';
    const method = context.request?.method || '';

    // Execute security rules for all requests
    if (this.config.enabledCategories.includes('security')) {
      const securityResults = await this.ruleEngine.executeRules(context, 'security');
      results.push(...securityResults);
    }

    // Execute user rules for authenticated requests
    if (context.user && this.config.enabledCategories.includes('user')) {
      const userResults = await this.ruleEngine.executeRules(context, 'user');
      results.push(...userResults);
    }

    // Execute content rules for content-related paths
    if (this.isContentPath(path) && this.config.enabledCategories.includes('content')) {
      const contentResults = await this.ruleEngine.executeRules(context, 'content');
      results.push(...contentResults);
    }

    // Execute business rules for social/business paths
    if (this.isBusinessPath(path) && this.config.enabledCategories.includes('business')) {
      const businessResults = await this.ruleEngine.executeRules(context, 'business');
      results.push(...businessResults);
    }

    // Execute performance rules for all requests
    if (this.config.enabledCategories.includes('performance')) {
      const performanceResults = await this.ruleEngine.executeRules(context, 'performance');
      results.push(...performanceResults);
    }

    return results;
  }

  private async executeResponseRules(context: RuleContext) {
    // Execute response-related rules
    if (this.config.enabledCategories.includes('performance')) {
      return await this.ruleEngine.executeRules(context, 'performance');
    }

    return [];
  }

  private isContentPath(path: string): boolean {
    const contentPaths = ['/api/content', '/api/posts', '/api/images', '/api/videos'];
    return contentPaths.some(contentPath => path.startsWith(contentPath));
  }

  private isBusinessPath(path: string): boolean {
    const businessPaths = ['/api/social', '/api/friends', '/api/follow', '/api/engage'];
    return businessPaths.some(businessPath => path.startsWith(businessPath));
  }

  private logRequest(path: string, method: string, errors: any[], warnings: any[]): void {
    const level = errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warn' : 'info');

    console.log(`[${level.toUpperCase()}] ${method} ${path}`, {
      errors: errors.length,
      warnings: warnings.length,
      timestamp: new Date().toISOString()
    });
  }

  private logResponse(status: number, errors: any[], warnings: any[]): void {
    const level = status >= 400 ? 'error' : (warnings.length > 0 ? 'warn' : 'info');

    console.log(`[${level.toUpperCase()}] Response ${status}`, {
      errors: errors.length,
      warnings: warnings.length,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Next.js API route wrapper with rule middleware
 */
export function withRuleMiddleware(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  config?: Partial<RuleMiddlewareConfig>
) {
  const middleware = new RuleMiddleware(config);

  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    // Process request through rule engine
    const requestResult = await middleware.processRequest(request, context);

    if (!requestResult.isValid) {
      return NextResponse.json(
        {
          error: 'Request validation failed',
          errors: requestResult.errors,
          warnings: requestResult.warnings
        },
        { status: 400 }
      );
    }

    try {
      // Execute original handler
      const response = await handler(request, context);

      // Process response through rule engine
      const responseResult = await middleware.processResponse(response, context);

      if (!responseResult.isValid) {
        console.warn('Response validation failed:', responseResult.errors);
      }

      return response;
    } catch (error) {
      console.error('Handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Express.js style middleware for custom servers
 */
export function createRuleMiddleware(config?: Partial<RuleMiddlewareConfig>) {
  const middleware = new RuleMiddleware(config);

  return async (req: any, res: any, next: () => void) => {
    try {
      // Create rule context from Express request
      const ruleContext: RuleContext = {
        request: {
          method: req.method,
          url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          headers: req.headers,
          body: req.body
        },
        user: req.user,
        data: req.body,
        metadata: {
          timestamp: new Date(),
          userAgent: req.get('user-agent'),
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          path: req.originalUrl
        }
      };

      const results = await middleware.executeRulesForContext(ruleContext);
      const result = {
        isValid: results.every(r => r.result.isValid),
        errors: results.flatMap(r => r.result.errors),
        warnings: results.flatMap(r => r.result.warnings)
      };

      if (!result.isValid) {
        res.status(400).json({
          error: 'Request validation failed',
          errors: result.errors,
          warnings: result.warnings
        });
        return;
      }

      // Store context for response processing
      res.locals.ruleContext = {
        startTime: Date.now(),
        user: req.user
      };

      // Override res.end to process response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
      // Process response context for logging
      const responseContext: RuleContext = {
        data: {
          response: {
            status: res.statusCode,
            headers: res.getHeaders()
          }
        },
        user: res.locals.ruleContext?.user,
        metadata: {
          timestamp: new Date(),
          processingTime: Date.now() - (res.locals.ruleContext?.startTime || Date.now())
        }
      };

      // Execute response rules for monitoring
      middleware.executeRulesForContext(responseContext).catch(console.error);

        originalEnd.call(this, chunk, encoding);
      };

      next();
    } catch (error) {
      console.error('Rule middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}