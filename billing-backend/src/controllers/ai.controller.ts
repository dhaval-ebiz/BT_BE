import { Response } from 'express';
import { AIGenerationService } from '../services/ai.service';
import { BusinessRequest } from '../middleware/auth.middleware';
import { logger, logApiRequest } from '../utils/logger';
import { addAIGenerationJob } from '../queues/bullmq';

const aiService = new AIGenerationService();

export class AIController {
  async generateBanner(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required',
        });
      }

      // Add to background job queue for better performance
      const job = await addAIGenerationJob(
        'banner',
        { prompt },
        req.user.id,
        req.business.id
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: {
          jobId: job.id,
          message: 'Banner generation started',
        },
      });
    } catch (error: any) {
      logger.error('Generate banner error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Banner generation failed',
      });
    }
  }

  async generateSQLQuery(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required',
        });
      }

      const query = await aiService.generateSQLQuery(
        prompt,
        req.user.id,
        req.business.id
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: {
          query,
        },
      });
    } catch (error: any) {
      logger.error('Generate SQL query error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'SQL query generation failed',
      });
    }
  }

  async generateText(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { prompt, style = 'professional' } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required',
        });
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
    } catch (error: any) {
      logger.error('Generate text error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Text generation failed',
      });
    }
  }

  async getGeneratedContent(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { type, limit = 20 } = req.query;
      const content = await aiService.getGeneratedContent(
        req.business.id,
        type as string,
        parseInt(limit as string)
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      logger.error('Get generated content error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch generated content',
      });
    }
  }

  async deleteGeneratedContent(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const contentId = req.params.contentId;
      const result = await aiService.deleteGeneratedContent(
        req.business.id,
        contentId
      );

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Delete generated content error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: error.message || 'Content not found',
      });
    }
  }

  async executeSQLQuery(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required',
        });
      }

      const results = await aiService.executeSQLQuery(query, req.business.id);

      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      logger.error('Execute SQL query error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Query execution failed',
      });
    }
  }
}