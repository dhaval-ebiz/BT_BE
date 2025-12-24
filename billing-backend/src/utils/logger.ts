import winston from 'winston';
import path from 'path';
import { Request, Response } from 'express';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'billing-backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      tailable: true,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      tailable: true,
    }),
    
    // API access logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'access.log'),
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    
    // Performance logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'performance.log'),
      level: 'info',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Security logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'security.log'),
      level: 'warn',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create a separate logger for database queries
export const dbLogger = winston.createLogger({
  level: process.env.DB_LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'database.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  dbLogger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create a separate logger for authentication events
export const authLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'auth' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'auth.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'security.log'),
      level: 'warn',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  authLogger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create a separate logger for background jobs
export const jobLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'jobs' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'jobs.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  jobLogger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Create a separate logger for AI operations
export const aiLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'ai' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'ai.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  aiLogger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Utility functions for structured logging
export const logApiRequest = (req: Request, res: Response, duration: number): void => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as Request & { user?: { id: string } }).user?.id,
    businessId: (req as Request & { business?: { id: string } }).business?.id,
  });
};

export const logDatabaseQuery = (query: string, duration: number, error?: Error): void => {
  dbLogger.info('Database Query', {
    query: query.substring(0, 500), // Limit query length
    duration: `${duration}ms`,
    error: error?.message,
  });
};

export const logAuthEvent = (event: string, userId: string, metadata?: Record<string, unknown>): void => {
  authLogger.info('Auth Event', {
    event,
    userId,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, unknown>): void => {
  authLogger.warn('Security Event', {
    event,
    severity,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logBackgroundJob = (jobName: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, unknown>): void => {
  jobLogger.info('Background Job', {
    jobName,
    status,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

export const logAiOperation = (operation: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, unknown>): void => {
  aiLogger.info('AI Operation', {
    operation,
    status,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

// Error logging with stack trace
export const logError = (error: Error, context?: Record<string, unknown>): void => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, unknown>): void => {
  logger.info('Performance', {
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString(),
  });
};