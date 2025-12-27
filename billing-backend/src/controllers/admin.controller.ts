import { Response } from 'express';
import { AdminService } from '../services/admin.service';
import { AuthenticatedRequest } from '../types/common';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/app-errors';

const adminService = new AdminService();

export class AdminController {
  /**
   * Get platform dashboard statistics
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await adminService.getPlatformStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      logger.error('Get platform stats error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch platform statistics',
      });
    }
  }

  /**
   * Get all businesses with filters
   */
  async getBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, plan, search, page = '1', limit = '50' } = req.query;
      
      const result = await adminService.getBusinesses({
        status: status as string | undefined,
        plan: plan as string | undefined,
        search: search as string | undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Get businesses error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch businesses',
      });
    }
  }

  /**
   * Get single business details
   */
  async getBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const business = await adminService.getBusinessById(businessId);
      
      res.json({
        success: true,
        data: business,
      });
    } catch (error: unknown) {
      logger.error('Get business error:', error);
      res.status(404).json({
        success: false,
        message: getErrorMessage(error) || 'Business not found',
      });
    }
  }

  /**
   * Suspend a business
   */
  async suspendBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { reason, notes } = req.body as { reason?: string; notes?: string };
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      await adminService.suspendBusiness(businessId, reason, notes);
      
      res.json({
        success: true,
        message: 'Business suspended successfully',
      });
    } catch (error: unknown) {
      logger.error('Suspend business error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to suspend business',
      });
    }
  }

  /**
   * Activate a business
   */
  async activateBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      await adminService.activateBusiness(businessId);
      
      res.json({
        success: true,
        message: 'Business activated successfully',
      });
    } catch (error: unknown) {
      logger.error('Activate business error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to activate business',
      });
    }
  }

  /**
   * Get all users with filters
   */
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { role, status, search, page = '1', limit = '50' } = req.query;
      
      const result = await adminService.getUsers({
        role: role as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch users',
      });
    }
  }

  /**
   * Suspend a user
   */
  async suspendUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body as { reason?: string };
      
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      await adminService.suspendUser(userId, reason);
      
      res.json({
        success: true,
        message: 'User suspended successfully',
      });
    } catch (error: unknown) {
      logger.error('Suspend user error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to suspend user',
      });
    }
  }

  /**
   * Activate a user
   */
  async activateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      await adminService.activateUser(userId);
      
      res.json({
        success: true,
        message: 'User activated successfully',
      });
    } catch (error: unknown) {
      logger.error('Activate user error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to activate user',
      });
    }
  }

  /**
   * Impersonate a business
   */
  async impersonateBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { reason, duration } = req.body as { reason: string; duration?: number };
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Reason for impersonation is required',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const result = await adminService.impersonateBusiness(
        req.user.id,
        businessId,
        reason,
        duration
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Impersonate business error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to impersonate business',
      });
    }
  }

  // ==================== PLATFORM ANALYTICS ====================

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 12;
      const analytics = await adminService.getRevenueAnalytics(months);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: unknown) {
      logger.error('Get revenue analytics error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch revenue analytics',
      });
    }
  }

  /**
   * Get user growth metrics
   */
  async getUserGrowthMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 12;
      const metrics = await adminService.getUserGrowthMetrics(months);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: unknown) {
      logger.error('Get user growth metrics error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch user growth metrics',
      });
    }
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsageAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const analytics = await adminService.getFeatureUsageAnalytics();
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: unknown) {
      logger.error('Get feature usage analytics error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch feature usage analytics',
      });
    }
  }

  /**
   * Get top businesses
   */
  async getTopBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const topBusinesses = await adminService.getTopBusinesses(limit);
      
      res.json({
        success: true,
        data: topBusinesses,
      });
    } catch (error: unknown) {
      logger.error('Get top businesses error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch top businesses',
      });
    }
  }

  /**
   * Get churn analysis
   */
  async getChurnAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const analysis = await adminService.getChurnAnalysis();
      
      res.json({
        success: true,
        data: analysis,
      });
    } catch (error: unknown) {
      logger.error('Get churn analysis error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch churn analysis',
      });
    }
  }

  /**
   * Broadcast notification
   */
  async broadcastNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { target, message, subject } = req.body as {
        target: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'TRIAL';
        message: string;
        subject?: string;
      };

      if (!target || !message) {
        res.status(400).json({
          success: false,
          message: 'Target and message are required',
        });
        return;
      }

      const result = await adminService.broadcastNotification(target, message, subject);
      
      res.json({
        success: true,
        data: result,
        message: `Broadcast queued for ${result.targetCount} businesses`,
      });
    } catch (error: unknown) {
      logger.error('Broadcast notification error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to broadcast notification',
      });
    }
  }
}
