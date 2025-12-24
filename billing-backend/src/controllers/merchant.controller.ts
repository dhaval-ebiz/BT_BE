import { Response } from 'express';
import { MerchantService } from '../services/merchant.service';
import { 
  CreateMerchantInput, 
  UpdateMerchantInput, 
  MerchantQueryInput,
  MerchantPaymentInput 
} from '../schemas/merchant.schema';
import { logger, logApiRequest } from '../utils/logger';
import { AuthenticatedRequest } from '../types/common';

const merchantService = new MerchantService();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class MerchantController {
  async createMerchant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || (req.body as { businessId?: string }).businessId;
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const input = req.body as CreateMerchantInput;
      const merchant = await merchantService.createMerchant(businessId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: merchant,
      });
    } catch (error: unknown) {
      logger.error('Create merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Merchant creation failed',
      });
    }
  }

  async getMerchant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      if (!merchantId) {
        res.status(400).json({ success: false, message: 'Merchant ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const merchant = await merchantService.getMerchant(businessId, merchantId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: merchant,
      });
    } catch (error: unknown) {
      logger.error('Get merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: getErrorMessage(error) || 'Merchant not found',
      });
    }
  }

  async updateMerchant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      if (!merchantId) {
        res.status(400).json({ success: false, message: 'Merchant ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const input = req.body as UpdateMerchantInput;
      const merchant = await merchantService.updateMerchant(businessId, merchantId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: merchant,
      });
    } catch (error: unknown) {
      logger.error('Update merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Merchant update failed',
      });
    }
  }

  async deleteMerchant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      if (!merchantId) {
        res.status(400).json({ success: false, message: 'Merchant ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const result = await merchantService.deleteMerchant(businessId, merchantId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Delete merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Merchant deletion failed',
      });
    }
  }

  async getMerchants(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const query = req.query as unknown as MerchantQueryInput;
      const result = await merchantService.getMerchants(businessId, query);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Get merchants error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch merchants',
      });
    }
  }

  async addMerchantPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      if (!merchantId) {
        res.status(400).json({ success: false, message: 'Merchant ID is required' });
        return;
      }
      const userId = req.user?.id || '';
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const input = req.body as MerchantPaymentInput;
      const payment = await merchantService.addMerchantPayment(businessId, merchantId, userId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error: unknown) {
      logger.error('Add merchant payment error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Payment addition failed',
      });
    }
  }

  async getMerchantPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      if (!merchantId) {
        res.status(400).json({ success: false, message: 'Merchant ID is required' });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const result = await merchantService.getMerchantPayments(businessId, merchantId, page, limit);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Get merchant payments error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: getErrorMessage(error) || 'Merchant not found',
      });
    }
  }

  async getMerchantStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const stats = await merchantService.getMerchantStats(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      logger.error('Get merchant stats error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch merchant statistics',
      });
    }
  }
}