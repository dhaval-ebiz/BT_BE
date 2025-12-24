import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || 'anonymous',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const now = Date.now();
      const window = Math.ceil(windowMs / 1000);

      // Use Redis pipeline for better performance
      const pipeline = redis.pipeline();
      
      // Add current timestamp to sorted set
      pipeline.zadd(key, now, `${now}:${Math.random()}`);
      
      // Remove entries outside the window
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      
      // Count entries in the window
      pipeline.zcard(key);
      
      // Set expiration
      pipeline.expire(key, window);
      
      const results = await pipeline.exec();
      const count = results?.[2]?.[1] as number || 0;

      if (count > max) {
        // Remove the entry we just added since it's over the limit
        await redis.zrem(key, `${now}:${Math.random()}`);
        
        const resetTime = Math.ceil((now + windowMs) / 1000);
        
        res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil((resetTime - now / 1000)),
          limit: max,
          window: windowMs,
        });
        return;
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
}

export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => {
    // Rate limit by both IP and email for auth endpoints
    const body = req.body as Record<string, string>;
    const email = body.email || 'anonymous';
    return `${req.ip}:${email}`;
  },
});

export const apiKeyRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour for API keys
  message: 'API key rate limit exceeded',
  keyGenerator: (req: Request) => {
    return req.headers['x-api-key'] as string || req.ip || 'anonymous';
  },
});

export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please slow down',
});

export const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload rate limit exceeded, please try again later',
});

export const webhookRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhooks per minute
  message: 'Webhook rate limit exceeded',
});