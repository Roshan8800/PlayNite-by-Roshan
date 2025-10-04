// Main logger instance and configuration
export { logger } from './logger';

// Error logging integration with ErrorManager
export { logError } from './logger';

// Enhanced logging functions with context
export {
  logInfo,
  logWarn,
  logDebug
} from './logger';

// Specialized logging functions
export {
  logApiRequest,
  logDatabaseOperation,
  logUserAction,
  logPerformance,
  logCircuitBreakerEvent,
  logSecurityEvent,
  logBusinessEvent,
  logComponentError
} from './logger';

// Transport configurations (for advanced usage)
export {
  developmentConsoleTransport,
  productionConsoleTransport,
  errorFileTransport,
  combinedFileTransport,
  dailyRotateFileTransport,
  getTransports
} from './transports';

// Re-export types for convenience
export type { ErrorCategory, ErrorSeverity } from '../errors/types';

// Logger configuration interface for advanced usage
export interface LoggerConfig {
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDirectory?: string;
  maxSize?: number;
  maxFiles?: number;
}

// Import transports for ES modules
import { getTransports } from './transports';

// Utility function to configure logger at runtime
export const configureLogger = (config: LoggerConfig) => {
  // Remove existing transports
  logger.transports.forEach((transport: any) => {
    logger.remove(transport);
  });

  // Add new transports based on config
  const transports = getTransports();

  transports.forEach((transport: any) => {
    logger.add(transport);
  });

  // Update log level if provided
  if (config.level) {
    logger.level = config.level;
  }
};

// Utility function to create child loggers for specific modules
export const createModuleLogger = (moduleName: string, defaultContext?: any) => {
  return {
    info: (message: string, context?: any) =>
      logger.info(message, { ...defaultContext, ...context, module: moduleName }),

    warn: (message: string, context?: any) =>
      logger.warn(message, { ...defaultContext, ...context, module: moduleName }),

    error: (message: string, context?: any) =>
      logger.error(message, { ...defaultContext, ...context, module: moduleName }),

    debug: (message: string, context?: any) =>
      logger.debug(message, { ...defaultContext, ...context, module: moduleName })
  };
};

// Environment detection for server-side HTTP logging
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Middleware function for HTTP request logging (server-side only)
export const httpRequestLogger = (req: any, res: any, next: any) => {
  // Only run on server-side
  if (!isNode) {
    if (next) next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get ? req.get('User-Agent') : undefined
    });
  });

  if (next) next();
};

// Import functions for default export
import { logger, logError, logInfo, logWarn, logDebug } from './logger';

// Default export for convenience
export default {
  logger: () => logger,
  logError,
  logInfo,
  logWarn,
  logDebug
};