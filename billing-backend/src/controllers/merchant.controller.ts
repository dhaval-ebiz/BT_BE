import { Request, Response } from 'express';
import { MerchantService } from '../services/merchant.service';
import { 
  CreateMerchantInput, 
  UpdateMerchantInput, 
  MerchantQueryInput,
  MerchantPaymentInput 
} from '../schemas/merchant.schema';
import { logger, logApiRequest } from '../utils/logger';

const merchantService = new MerchantService();

export class MerchantController {
  async createMerchant(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.body.businessId;
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: CreateMerchantInput = req.body;
      const merchant = await merchantService.createMerchant(businessId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: merchant,
      });
    } catch (error: any) {
      logger.error('Create merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Merchant creation failed',
      });
    }
  }

  async getMerchant(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const merchant = await merchantService.getMerchant(businessId, merchantId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: merchant,
      });
    } catch (error: any) {
      logger.error('Get merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: error.message || 'Merchant not found',
      });
    }
  }

  async updateMerchant(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: UpdateMerchantInput = req.body;
      const merchant = await merchantService.updateMerchant(businessId, merchantId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: merchant,
      });
    } catch (error: any) {
      logger.error('Update merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Merchant update failed',
      });
    }
  }

  async deleteMerchant(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const result = await merchantService.deleteMerchant(businessId, merchantId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Delete merchant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Merchant deletion failed',
      });
    }
  }

  async getMerchants(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const query: MerchantQueryInput = req.query;
      const result = await merchantService.getMerchants(businessId, query);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get merchants error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch merchants',
      });
    }
  }

  async addMerchantPayment(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      const userId = req.user?.id || '';
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: MerchantPaymentInput = req.body;
      const payment = await merchantService.addMerchantPayment(businessId, merchantId, userId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      logger.error('Add merchant payment error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Payment addition failed',
      });
    }
  }

  async getMerchantPayments(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const merchantId = req.params.merchantId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const result = await merchantService.getMerchantPayments(businessId, merchantId, page, limit);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get merchant payments error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: error.message || 'Merchant not found',
      });
    }
  }

  async getMerchantStats(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const stats = await merchantService.getMerchantStats(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get merchant stats error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch merchant statistics',
      });
    }
  }
}