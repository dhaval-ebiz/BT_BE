import { Response } from 'express';
import { BusinessService } from '../services/business.service';
import { 
  createBusinessSchema, 
  updateBusinessSchema, 
  businessSettingsSchema,
  inviteStaffSchema,
  updateStaffSchema
} from '../schemas/business.schema';
import { AuthenticatedRequest } from '../types/common';
import { BusinessRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { z } from 'zod';

const businessService = new BusinessService();

// Path params validation
const businessIdSchema = z.object({
  businessId: z.string().uuid(),
});

const staffIdSchema = z.object({
  businessId: z.string().uuid(),
  staffId: z.string().uuid(),
});

export class BusinessController {
  // Business Management
  
  async getBusinesses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        res.status(500).json({ success: false, message: getErrorMessage(error) });
    }
  }

  async createBusiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = createBusinessSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors,
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const business = await businessService.createBusiness(req.user.id, validation.data);

      res.status(201).json({
        success: true,
        data: business,
      });
    } catch (error) {
      logger.error('Create business error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async getBusiness(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const business = await businessService.getBusiness(businessId);

      res.status(200).json({
        success: true,
        data: business,
      });
    } catch (error) {
      logger.error('Get business error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async updateBusiness(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const validation = updateBusinessSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors,
        });
        return;
      }

      const business = await businessService.updateBusiness(businessId, validation.data);

      res.status(200).json({
        success: true,
        data: business,
      });
    } catch (error) {
      logger.error('Update business error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async getSettings(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const settings = await businessService.getBusinessSettings(businessId);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async updateSettings(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const validation = businessSettingsSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors,
        });
        return;
      }

      const settings = await businessService.updateBusinessSettings(businessId, validation.data);

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  // Staff Management

  async getStaff(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const staff = await businessService.getBusinessStaff(businessId);

      res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      logger.error('Get staff error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async inviteStaff(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const validation = inviteStaffSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors,
        });
        return;
      }

      const staff = await businessService.inviteStaffMember(businessId, validation.data);

      res.status(201).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      logger.error('Invite staff error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async updateStaffRole(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId, staffId } = staffIdSchema.parse(req.params);
      const validation = updateStaffSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          errors: validation.error.errors,
        });
        return;
      }

      const staff = await businessService.updateStaffMember(businessId, staffId, validation.data);

      res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      logger.error('Update staff error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async removeStaff(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId, staffId } = staffIdSchema.parse(req.params);

      await businessService.removeStaffMember(businessId, staffId);

      res.status(200).json({
        success: true,
        message: 'Staff member removed successfully',
      });
    } catch (error) {
      logger.error('Remove staff error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  // Onboarding Progress

  async getOnboardingStatus(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { businessId } = businessIdSchema.parse(req.params);
      const status = await businessService.getOnboardingStatus(businessId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Get onboarding status error:', error);
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }
}