import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';

interface PerformanceMetrics {
  requests: number;
  totalResponseTime: number;
  errors: number;
  slowRequests: number;
}

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        memoryUsed: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    // Update performance metrics in Redis
    const key = `performance:${new Date().toISOString().split('T')[0]}`;
    const field = `${req.method}:${req.route?.path || req.path}`;
    
    try {
      const metrics = await redis.hget(key, field);
      const currentMetrics: PerformanceMetrics = metrics ? JSON.parse(metrics) : {
        requests: 0,
        totalResponseTime: 0,
        errors: 0,
        slowRequests: 0,
      };

      currentMetrics.requests++;
      currentMetrics.totalResponseTime += duration;
      if (res.statusCode >= 400) currentMetrics.errors++;
      if (duration > 1000) currentMetrics.slowRequests++;

      await redis.hset(key, field, JSON.stringify(currentMetrics));
      await redis.expire(key, 7 * 24 * 60 * 60); // Keep for 7 days
    } catch (error) {
      logger.error('Failed to update performance metrics:', error);
    }

    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Memory-Used', `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  next();
}

export function apiMetrics(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to milliseconds
    
    // Log API metrics
    logger.info('API Metrics', {
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}

export function databaseMetrics(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const queryCount = (req as any).queryCount || 0;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const queriesPerSecond = (queryCount / duration) * 1000;

    if (queryCount > 0) {
      logger.info('Database Metrics', {
        method: req.method,
        route: req.route?.path || req.path,
        queryCount,
        queriesPerSecond: queriesPerSecond.toFixed(2),
        duration: `${duration}ms`,
      });
    }
  });

  next();
}

export function cacheMetrics(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  let cacheHits = 0;
  let cacheMisses = 0;

  // Override redis get to track cache metrics
  const originalGet = redis.get.bind(redis);
  redis.get = async (...args: any[]) => {
    const result = await originalGet(...args);
    if (result !== null) {
      cacheHits++;
    } else {
      cacheMisses++;
    }
    return result;
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const totalCacheOps = cacheHits + cacheMisses;
    const hitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0;

    if (totalCacheOps > 0) {
      logger.info('Cache Metrics', {
        method: req.method,
        route: req.route?.path || req.path,
        cacheHits,
        cacheMisses,
        hitRate: `${hitRate.toFixed(2)}%`,
        duration: `${duration}ms`,
      });
    }
  });

  next();
}

export function compressionMetrics(req: Request, res: Response, next: NextFunction) {
  const originalWrite = res.write;
  const originalEnd = res.end;
  let responseSize = 0;

  res.write = (chunk: any) => {
    if (chunk) {
      responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }
    return originalWrite.call(res, chunk);
  };

  res.end = (chunk?: any) => {
    if (chunk) {
      responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }

    const compressionRatio = req.headers['accept-encoding']?.includes('gzip') ? 0.3 : 1;
    const estimatedOriginalSize = Math.round(responseSize / (1 - compressionRatio));
    const savedBytes = estimatedOriginalSize - responseSize;

    if (responseSize > 1024) {
      logger.info('Compression Metrics', {
        method: req.method,
        route: req.route?.path || req.path,
        compressedSize: `${(responseSize / 1024).toFixed(2)}KB`,
        estimatedOriginalSize: `${(estimatedOriginalSize / 1024).toFixed(2)}KB`,
        savedBytes: `${(savedBytes / 1024).toFixed(2)}KB`,
        compressionRatio: `${((savedBytes / estimatedOriginalSize) * 100).toFixed(2)}%`,
      });
    }

    return originalEnd.call(res, chunk);
  };

  next();
}

export function securityMetrics(req: Request, res: Response, next: NextFunction) {
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'strict-transport-security',
    'content-security-policy',
  ];

  res.on('finish', () => {
    const missingHeaders = securityHeaders.filter(header => 
      !res.getHeader(header)
    );

    if (missingHeaders.length > 0) {
      logger.warn('Missing security headers', {
        method: req.method,
        route: req.route?.path || req.path,
        missingHeaders,
      });
    }
  });

  next();
}