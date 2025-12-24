import { Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { logger, logApiRequest } from '../utils/logger';
import { z, ZodError } from 'zod';
import { AuthenticatedRequest } from '../types/common';
import { getErrorMessage, AppError } from '../utils/app-errors';

const analyticsService = new AnalyticsService();

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

const businessIdSchema = z.object({
  businessId: z.string().uuid(),
});

export class AnalyticsController {

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
    return res.status(500).json({
      success: false,
      message
    });
  }

  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const overview = await analyticsService.getDashboardOverview(businessId, period);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: overview,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving dashboard overview');
    }
  }

  /**
   * Get MRR prediction with factors
   */
  async getMRREPrediction(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const prediction = await analyticsService.predictMRR(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: prediction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving MRR prediction');
    }
  }

  /**
   * Get business health score
   */
  async getBusinessHealthScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const healthScore = await analyticsService.calculateBusinessHealthScore(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: healthScore,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error calculating business health score');
    }
  }

  /**
   * Get revenue trend analysis
   */
  async getRevenueTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const trend = await analyticsService.getRevenueTrend(businessId, period);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: trend,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving revenue trend');
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const analytics = await analyticsService.getCustomerAnalytics(businessId, period);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving customer analytics');
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const analytics = await analyticsService.getProductAnalytics(businessId, period);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving product analytics');
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d' } = dateRangeSchema.parse(req.query);

      const analytics = await analyticsService.getPaymentAnalytics(businessId, period);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving payment analytics');
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const metrics = await analyticsService.getRealTimeMetrics(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving real-time metrics');
    }
  }

  /**
   * Get predictive insights
   */
  async getPredictiveInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      
      const insights = await analyticsService.getPredictiveInsights(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: insights,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error retrieving predictive insights');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const { period = '30d', format = 'json' } = dateRangeSchema.parse(req.query);

      const data = await analyticsService.exportAnalyticsData(businessId, period, format);
      
      logApiRequest(req, res, Date.now() - startTime);

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
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Error exporting analytics data');
    }
  }
}
