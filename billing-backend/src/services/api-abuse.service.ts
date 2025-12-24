import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export class ApiAbuseService {
  private readonly IMAGE_UPLOAD_LIMIT = 5; // Max 5 images per month per store
  private readonly RATE_LIMIT_WINDOW = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  async checkImageUploadLimit(businessId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    resetTime: Date;
  }> {
    try {
      const key = `image_upload_limit:${businessId}:${this.getCurrentMonthKey()}`;
      
      // Get current count
      const currentCountStr = await redis.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;
      
      // Check if limit exceeded
      const allowed = currentCount < this.IMAGE_UPLOAD_LIMIT;
      
      // Calculate reset time (end of current month)
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetTime = nextMonth;
      
      logger.info('Image upload limit check', {
        businessId,
        currentCount,
        limit: this.IMAGE_UPLOAD_LIMIT,
        allowed,
      });
      
      return {
        allowed,
        currentCount,
        limit: this.IMAGE_UPLOAD_LIMIT,
        resetTime,
      };
    } catch (error) {
      logger.error('Failed to check image upload limit', { error, businessId });
      // Allow upload if we can't check the limit
      return {
        allowed: true,
        currentCount: 0,
        limit: this.IMAGE_UPLOAD_LIMIT,
        resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW),
      };
    }
  }

  async incrementImageUploadCount(businessId: string): Promise<void> {
    try {
      const key = `image_upload_limit:${businessId}:${this.getCurrentMonthKey()}`;
      
      // Increment counter
      const newCount = await redis.incr(key);
      
      // Set expiration if this is the first upload of the month
      if (newCount === 1) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const ttl = Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
        
        await redis.expire(key, ttl);
      }
      
      logger.info('Image upload count incremented', {
        businessId,
        newCount,
        key,
      });
    } catch (error) {
      logger.error('Failed to increment image upload count', { error, businessId });
    }
  }

  async checkGeneralRateLimit(
    identifier: string,
    action: string,
    limit: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    try {
      const key = `rate_limit:${action}:${identifier}`;
      const now = Date.now();
      const window = windowSeconds * 1000;
      
      // Remove old entries
      await redis.zremrangebyscore(key, 0, now - window);
      
      // Count current requests
      const count = await redis.zcard(key);
      
      if (count >= limit) {
        // Get oldest request timestamp for reset time
        const oldestRequests = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetTime = oldestRequests.length > 1 
          ? new Date(Number(oldestRequests[1]) + window)
          : new Date(now + window);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }
      
      // Add current request
      await redis.zadd(key, now, `${now}:${Math.random()}`);
      await redis.expire(key, windowSeconds);
      
      return {
        allowed: true,
        remaining: limit - count - 1,
        resetTime: new Date(now + window),
      };
    } catch (error) {
      logger.error('Failed to check general rate limit', { error, identifier, action });
      // Allow request if we can't check the limit
      return {
        allowed: true,
        remaining: limit,
        resetTime: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  }

  async checkQRCodeGenerationLimit(businessId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    resetTime: Date;
  }> {
    try {
      const key = `qr_generation_limit:${businessId}:${this.getCurrentMonthKey()}`;
      const limit = 1000; // Max 1000 QR codes per month
      
      const currentCountStr = await redis.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;
      
      const allowed = currentCount < limit;
      
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetTime = nextMonth;
      
      logger.info('QR code generation limit check', {
        businessId,
        currentCount,
        limit,
        allowed,
      });
      
      return {
        allowed,
        currentCount,
        limit,
        resetTime,
      };
    } catch (error) {
      logger.error('Failed to check QR code generation limit', { error, businessId });
      return {
        allowed: true,
        currentCount: 0,
        limit: 1000,
        resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW),
      };
    }
  }

  async incrementQRCodeGenerationCount(businessId: string, count: number = 1): Promise<void> {
    try {
      const key = `qr_generation_limit:${businessId}:${this.getCurrentMonthKey()}`;
      
      const newCount = await redis.incrby(key, count);
      
      if (newCount === count) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const ttl = Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
        
        await redis.expire(key, ttl);
      }
      
      logger.info('QR code generation count incremented', {
        businessId,
        newCount,
        count,
      });
    } catch (error) {
      logger.error('Failed to increment QR code generation count', { error, businessId });
    }
  }

  private getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async getUsageStats(businessId: string): Promise<{
    imageUploads: {
      current: number;
      limit: number;
      remaining: number;
    };
    qrCodeGenerations: {
      current: number;
      limit: number;
      remaining: number;
    };
  }> {
    try {
      const imageStats = await this.checkImageUploadLimit(businessId);
      const qrStats = await this.checkQRCodeGenerationLimit(businessId);
      
      return {
        imageUploads: {
          current: imageStats.currentCount,
          limit: imageStats.limit,
          remaining: imageStats.limit - imageStats.currentCount,
        },
        qrCodeGenerations: {
          current: qrStats.currentCount,
          limit: qrStats.limit,
          remaining: qrStats.limit - qrStats.currentCount,
        },
      };
    } catch (error) {
      logger.error('Failed to get usage stats', { error, businessId });
      return {
        imageUploads: {
          current: 0,
          limit: this.IMAGE_UPLOAD_LIMIT,
          remaining: this.IMAGE_UPLOAD_LIMIT,
        },
        qrCodeGenerations: {
          current: 0,
          limit: 1000,
          remaining: 1000,
        },
      };
    }
  }
}