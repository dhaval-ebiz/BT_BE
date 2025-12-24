import { Response } from 'express';
import { AIGenerationService } from '../services/ai.service';
import { BusinessRequest } from '../middleware/auth.middleware';
import { logger, logApiRequest } from '../utils/logger';
import { addAIGenerationJob } from '../queues/bullmq';
import { getErrorMessage, AppError, BadRequestError, ForbiddenError } from '../utils/app-errors';
import { db } from '../config/database';
import { retailBusinesses } from '../models/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';

const aiService = new AIGenerationService();

export class AIController {
  private handleError(res: Response, error: unknown, defaultMessage: string): Response {
    logger.error(`${defaultMessage}:`, error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    const message = getErrorMessage(error) || defaultMessage;
    // Don't expose internal server errors details in production usually, but keeping message for now
    return res.status(500).json({
      success: false,
      message
    });
  }

  async generateBanner(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        throw new ForbiddenError('Business authentication required');
      }

      const body = req.body as { prompt?: string };
      const { prompt } = body;
      
      if (!prompt) {
        throw new BadRequestError('Prompt is required');
      }

      // Check Quota
      const [business] = await db
        .select({
            usedImageQuota: retailBusinesses.usedImageQuota,
            monthlyImageQuota: retailBusinesses.monthlyImageQuota
        })
        .from(retailBusinesses)
        .where(eq(retailBusinesses.id, req.business.id));
      
      if (!business) {
        throw new BadRequestError('Business not found');
      }

      if (business.usedImageQuota >= business.monthlyImageQuota) {
        throw new ForbiddenError(`Monthly image quota exceeded (${business.usedImageQuota}/${business.monthlyImageQuota})`);
      }

      // Add to background job queue for better performance
      const job = await addAIGenerationJob(
        'banner',
        { prompt },
        req.user.id,
        req.business.id
      );

      // Optimistically increment quota or rely on worker to do it? 
      // For now, we will increment it here to prevent rapid-fire abuse, 
      // and if the job fails, the worker can ideally decrement it (or we accept the safe side error).
      await db.update(retailBusinesses)
        .set({ usedImageQuota: sql`${retailBusinesses.usedImageQuota} + 1` })
        .where(eq(retailBusinesses.id, req.business.id));

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: {
          jobId: job.id,
          message: 'Banner generation started',
          quota: {
            used: business.usedImageQuota + 1,
            limit: business.monthlyImageQuota
          }
        },
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Banner generation failed');
    }
  }

  async generateSQLQuery(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        throw new ForbiddenError('Business authentication required');
      }

      const body = req.body as { prompt?: string };
      const { prompt } = body;
      
      if (!prompt) {
        throw new BadRequestError('Prompt is required');
      }

      const query = await aiService.generateSQLQuery(
        prompt,
        req.user.id,
        req.business.id
      );

      // Track AI Usage if we want to limit "Queries" too? 
      // Current schema has `monthlyAiQueryQuota`.
      // Let's implement that check as well.

      const [business] = await db
        .select({
            usedAiQueryQuota: retailBusinesses.usedAiQueryQuota,
            monthlyAiQueryQuota: retailBusinesses.monthlyAiQueryQuota
        })
        .from(retailBusinesses)
        .where(eq(retailBusinesses.id, req.business.id));

        // Soft limit or Hard limit? Let's do Soft for now as SQL is cheap, but tracking is good.
        if (business) {
             await db.update(retailBusinesses)
            .set({ usedAiQueryQuota: sql`${retailBusinesses.usedAiQueryQuota} + 1` })
            .where(eq(retailBusinesses.id, req.business.id));
        }

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: {
          query,
        },
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'SQL query generation failed');
    }
  }

  async generateText(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        throw new ForbiddenError('Business authentication required');
      }

      const body = req.body as { prompt?: string; style?: string };
      const { prompt, style = 'professional' } = body;
      
      if (!prompt) {
        throw new BadRequestError('Prompt is required');
      }

      const text = await aiService.generateText(
        prompt,
        style,
        req.user.id,
        req.business.id
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: {
          text,
        },
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Text generation failed');
    }
  }

  async getGeneratedContent(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        throw new ForbiddenError('Business authentication required');
      }

      const { type, limit = '20' } = req.query as { type?: string; limit?: string };
      const content = await aiService.getGeneratedContent(
        req.business.id,
        type,
        parseInt(limit, 10)
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: content,
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Failed to fetch generated content');
    }
  }

  async deleteGeneratedContent(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        throw new ForbiddenError('Business authentication required');
      }

      const contentId = req.params.contentId;
      if (!contentId) {
        throw new BadRequestError('Content ID is required');
      }
      const result = await aiService.deleteGeneratedContent(
        req.business.id,
        contentId
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Content not found');
    }
  }

  async executeSQLQuery(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        throw new ForbiddenError('Business authentication required');
      }

      const body = req.body as { query?: string };
      const { query } = body;
      
      if (!query) {
        throw new BadRequestError('Query is required');
      }

      const results = await aiService.executeSQLQuery(query, req.business.id);

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: results,
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Query execution failed');
    }
  }
}