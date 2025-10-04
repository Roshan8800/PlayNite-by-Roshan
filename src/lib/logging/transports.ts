// Environment detection
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Browser-compatible logging (no winston dependency)
export const browserConsoleTransport = {
  log: (level: string, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.log(`${timestamp} [${meta?.service || 'playnite'}] ${level}: ${message}${metaStr}`);
  },
  info: (message: string, meta?: any) => browserConsoleTransport.log('info', message, meta),
  warn: (message: string, meta?: any) => browserConsoleTransport.log('warn', message, meta),
  error: (message: string, meta?: any) => browserConsoleTransport.log('error', message, meta),
  debug: (message: string, meta?: any) => browserConsoleTransport.log('debug', message, meta)
};

// Server-side winston transports (loaded dynamically to avoid browser bundling)
let winstonTransports: any = null;

const loadWinstonTransports = () => {
  if (winstonTransports || !isNode) return winstonTransports;

  try {
    const winston = require('winston');
    const path = require('path');
    const fs = require('fs');

    // Ensure logs directory exists only on server-side
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Development console transport with colors and formatting (server-side only)
    const developmentConsoleTransport = new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, service, ...meta }: any) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      ),
      handleExceptions: true,
      handleRejections: true
    });

    // Production console transport (minimal formatting) (server-side only)
    const productionConsoleTransport = new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      handleExceptions: true,
      handleRejections: true
    });

    // File transport for errors (server-side only)
    const errorFileTransport = new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    });

    // File transport for combined logs (server-side only)
    const combinedFileTransport = new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      handleExceptions: true,
      handleRejections: true
    });

    // Daily rotate file transport for production (server-side only)
    const dailyRotateFileTransport = new winston.transports.File({
      filename: path.join(logsDir, `playnite-${new Date().toISOString().split('T')[0]}.log`),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 20971520, // 20MB
      maxFiles: 14,
      handleExceptions: true,
      handleRejections: true
    });

    winstonTransports = {
      developmentConsoleTransport,
      productionConsoleTransport,
      errorFileTransport,
      combinedFileTransport,
      dailyRotateFileTransport
    };

    return winstonTransports;
  } catch (error) {
    console.error('Failed to load winston transports:', error);
    return null;
  }
};

// Get transports based on environment
export const getTransports = () => {
  // Browser environment - return simple console logger
  if (isBrowser) {
    return [browserConsoleTransport];
  }

  // Server environment - return winston transports
  const transports = loadWinstonTransports();
  if (!transports) {
    return [browserConsoleTransport]; // Fallback to browser transport if winston fails to load
  }

  const transportList: any[] = [];

  // Determine environment - handle both browser and server
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment && transports.developmentConsoleTransport) {
    transportList.push(transports.developmentConsoleTransport);
  } else if (transports.productionConsoleTransport) {
    transportList.push(transports.productionConsoleTransport);

    // Only add file transports on server-side
    if (transports.errorFileTransport) {
      transportList.push(transports.errorFileTransport);
    }
    if (transports.combinedFileTransport) {
      transportList.push(transports.combinedFileTransport);
    }
    if (transports.dailyRotateFileTransport) {
      transportList.push(transports.dailyRotateFileTransport);
    }
  }

  return transportList.length > 0 ? transportList : [browserConsoleTransport];
};

// Export transports for external access (will be null in browser)
export const developmentConsoleTransport = isBrowser ? null : loadWinstonTransports()?.developmentConsoleTransport;
export const productionConsoleTransport = isBrowser ? null : loadWinstonTransports()?.productionConsoleTransport;
export const errorFileTransport = isBrowser ? null : loadWinstonTransports()?.errorFileTransport;
export const combinedFileTransport = isBrowser ? null : loadWinstonTransports()?.combinedFileTransport;
export const dailyRotateFileTransport = isBrowser ? null : loadWinstonTransports()?.dailyRotateFileTransport;