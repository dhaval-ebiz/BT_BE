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
}
