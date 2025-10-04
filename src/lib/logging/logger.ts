// Environment detection
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Environment-safe variable access
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

// Conditionally import types only on server-side
let ErrorCategory: any, ErrorSeverity: any;
if (isNode) {
  const errorTypes = require('../errors/types');
  ErrorCategory = errorTypes.ErrorCategory;
  ErrorSeverity = errorTypes.ErrorSeverity;
}

// Browser-compatible logger
const createBrowserLogger = () => {
  const browserTransports = require('./transports').getTransports();
  const browserTransport = browserTransports[0]; // Get the browser console transport

  return {
    info: (message: string, meta?: any) => browserTransport.info(message, { ...meta, service: 'playnite' }),
    warn: (message: string, meta?: any) => browserTransport.warn(message, { ...meta, service: 'playnite' }),
    error: (message: string, meta?: any) => browserTransport.error(message, { ...meta, service: 'playnite' }),
    debug: (message: string, meta?: any) => browserTransport.debug(message, { ...meta, service: 'playnite' }),
    log: (level: string, message: string, meta?: any) => browserTransport.log(level, message, { ...meta, service: 'playnite' })
  };
};

// Server-side winston logger
const createWinstonLogger = () => {
  // Only load winston on server-side to avoid browser bundling issues
  if (!isNode) {
    throw new Error('Winston logger can only be created on server-side');
  }

  const winston = require('winston');
  const { getTransports } = require('./transports');

  return winston.createLogger({
    level: getEnvVar('LOG_LEVEL', 'info'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
    ),
    defaultMeta: {
      service: 'playnite',
      version: getEnvVar('npm_package_version', '1.0.0'),
      environment: getEnvVar('NODE_ENV', 'development')
    },
    transports: getTransports(),
    exitOnError: false
  });
};

// Create the main logger instance based on environment
export const logger = isBrowser ? createBrowserLogger() : createWinstonLogger();

// Import ErrorManager only on server-side to avoid browser bundle issues
let ErrorManager: any;
if (isNode) {
  ErrorManager = require('../errors/ErrorManager').ErrorManager;
}

// Enhanced logging function that integrates with ErrorManager
export const logError = (error: any, context?: any) => {
  // Only use ErrorManager on server-side
  if (isNode && ErrorManager) {
    const errorManager = ErrorManager.getInstance();

    // Determine category and severity from context or error
    const category = context?.category || ErrorCategory?.UNKNOWN;
    const severity = context?.severity || ErrorSeverity?.MEDIUM;

    // Report error to ErrorManager
    const playNiteError = errorManager.reportError(error, category, severity, context);

    // Log with Winston based on severity
    const logLevel = mapSeverityToLogLevel(severity);
    const logData = {
      errorId: playNiteError.id,
      category: playNiteError.category,
      severity: playNiteError.severity,
      context: playNiteError.context,
      stack: playNiteError.originalError?.stack,
      userMessage: playNiteError.userMessage,
      retryable: playNiteError.retryable,
      timestamp: playNiteError.timestamp
    };

    logger.log(logLevel, 'PlayNite Error', logData);

    return playNiteError;
  } else {
    // Browser environment - just log to console
    logger.error('Browser Error', {
      message: error?.message || error,
      stack: error?.stack,
      context
    });
    return null;
  }
};

// Map ErrorSeverity to Winston log levels
const mapSeverityToLogLevel = (severity: any): string => {
  switch (severity) {
    case ErrorSeverity?.CRITICAL:
      return 'error';
    case ErrorSeverity?.HIGH:
      return 'error';
    case ErrorSeverity?.MEDIUM:
      return 'warn';
    case ErrorSeverity?.LOW:
      return 'info';
    default:
      return 'info';
  }
};

// Enhanced logging functions with context
export const logInfo = (message: string, context?: any) => {
  logger.info(message, {
    component: context?.component,
    action: context?.action,
    userId: context?.userId,
    sessionId: context?.sessionId,
    metadata: context?.metadata
  });
};

export const logWarn = (message: string, context?: any) => {
  logger.warn(message, {
    component: context?.component,
    action: context?.action,
    userId: context?.userId,
    sessionId: context?.sessionId,
    metadata: context?.metadata
  });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug(message, {
    component: context?.component,
    action: context?.action,
    userId: context?.userId,
    sessionId: context?.sessionId,
    metadata: context?.metadata
  });
};

// Specialized logging for different components
export const logApiRequest = (method: string, url: string, statusCode?: number, duration?: number, context?: any) => {
  logger.info('API Request', {
    method,
    url,
    statusCode,
    duration,
    component: context?.component || 'api',
    userId: context?.userId,
    sessionId: context?.sessionId
  });
};

export const logDatabaseOperation = (operation: string, collection: string, duration?: number, context?: any) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    duration,
    component: context?.component || 'database',
    userId: context?.userId,
    metadata: context?.metadata
  });
};

export const logUserAction = (action: string, details?: any, context?: any) => {
  logger.info('User Action', {
    action,
    details,
    component: context?.component || 'user-interface',
    userId: context?.userId,
    sessionId: context?.sessionId
  });
};

export const logPerformance = (metric: string, value: number, unit: string, context?: any) => {
  logger.info('Performance Metric', {
    metric,
    value,
    unit,
    component: context?.component || 'performance',
    metadata: context?.metadata
  });
};

// Circuit breaker logging
export const logCircuitBreakerEvent = (category: any, state: string, context?: any) => {
  logger.warn('Circuit Breaker Event', {
    category,
    state,
    component: 'error-manager',
    metadata: context?.metadata
  });
};

// Security event logging
export const logSecurityEvent = (event: string, severity: any, context?: any) => {
  const logLevel = mapSeverityToLogLevel(severity);
  logger.log(logLevel, 'Security Event', {
    event,
    severity,
    component: 'security',
    userId: context?.userId,
    sessionId: context?.sessionId,
    metadata: context?.metadata
  });
};

// Business logic logging
export const logBusinessEvent = (event: string, details?: any, context?: any) => {
  logger.info('Business Event', {
    event,
    details,
    component: context?.component || 'business-logic',
    userId: context?.userId,
    metadata: context?.metadata
  });
};

// Error boundary logging for React components
export const logComponentError = (error: Error, errorInfo: any, context?: any) => {
  logger.error('React Component Error', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    component: context?.component || 'react-component',
    userId: context?.userId,
    sessionId: context?.sessionId,
    metadata: context?.metadata
  });
};
