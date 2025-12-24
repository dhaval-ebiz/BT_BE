import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const analyticsService = new AnalyticsService();

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).optional(),
});

const businessIdSchema = z.object({
  businessId: z.string().uuid(),
});

export class AnalyticsController {
  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const overview = await analyticsService.getDashboardOverview(businessId, period);
      
      logger.info('Dashboard overview retrieved', {
        businessId,
        period,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: overview,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving dashboard overview', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard overview',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get MRR prediction with factors
   */
  async getMRREPrediction(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const prediction = await analyticsService.predictMRR(businessId);
      
      logger.info('MRR prediction retrieved', {
        businessId,
        userId: req.user?.id,
        currentMRR: prediction.currentMRR,
        predictedMRR: prediction.predictedMRR,
      });

      res.json({
        success: true,
        data: prediction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving MRR prediction', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve MRR prediction',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get business health score
   */
  async getBusinessHealthScore(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const healthScore = await analyticsService.calculateBusinessHealthScore(businessId);
      
      logger.info('Business health score retrieved', {
        businessId,
        userId: req.user?.id,
        score: healthScore.score,
        trend: healthScore.trend,
      });

      res.json({
        success: true,
        data: healthScore,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error calculating business health score', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to calculate business health score',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get revenue trend analysis
   */
  async getRevenueTrend(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const trend = await analyticsService.getRevenueTrend(businessId, period);
      
      logger.info('Revenue trend retrieved', {
        businessId,
        period,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: trend,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving revenue trend', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve revenue trend',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const analytics = await analyticsService.getCustomerAnalytics(businessId, period);
      
      logger.info('Customer analytics retrieved', {
        businessId,
        period,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving customer analytics', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve customer analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const analytics = await analyticsService.getProductAnalytics(businessId, period);
      
      logger.info('Product analytics retrieved', {
        businessId,
        period,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving product analytics', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const analytics = await analyticsService.getPaymentAnalytics(businessId, period);
      
      logger.info('Payment analytics retrieved', {
        businessId,
        period,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving payment analytics', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const metrics = await analyticsService.getRealTimeMetrics(businessId);
      
      logger.info('Real-time metrics retrieved', {
        businessId,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving real-time metrics', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve real-time metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get predictive insights
   */
  async getPredictiveInsights(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const insights = await analyticsService.getPredictiveInsights(businessId);
      
      logger.info('Predictive insights retrieved', {
        businessId,
        userId: req.user?.id,
      });

      res.json({
        success: true,
        data: insights,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error retrieving predictive insights', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve predictive insights',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(req: Request, res: Response) {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d', format = 'json' } = dateRangeSchema.extend({
        format: z.enum(['json', 'csv']).optional(),
      }).parse(req.query);

      const data = await analyticsService.exportAnalyticsData(businessId, period, format);
      
      logger.info('Analytics data exported', {
        businessId,
        period,
        format,
        userId: req.user?.id,
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${businessId}-${Date.now()}.csv"`);
        res.send(data);
      } else {
        res.json({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error exporting analytics data', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
