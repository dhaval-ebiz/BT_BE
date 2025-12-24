import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { 
  CreateCustomerInput, 
  UpdateCustomerInput, 
  CustomerQueryInput,
  CustomerPaymentInput,
  CustomerStatementInput 
} from '../schemas/customer.schema';
import { logger, logApiRequest } from '../utils/logger';

const customerService = new CustomerService();

export class CustomerController {
  async createCustomer(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.body.businessId;
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: CreateCustomerInput = req.body;
      const customer = await customerService.createCustomer(businessId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      logger.error('Create customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Customer creation failed',
      });
    }
  }

  async getCustomer(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const customer = await customerService.getCustomer(businessId, customerId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      logger.error('Get customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: error.message || 'Customer not found',
      });
    }
  }

  async updateCustomer(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: UpdateCustomerInput = req.body;
      const customer = await customerService.updateCustomer(businessId, customerId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      logger.error('Update customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Customer update failed',
      });
    }
  }

  async deleteCustomer(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const result = await customerService.deleteCustomer(businessId, customerId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Delete customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Customer deletion failed',
      });
    }
  }

  async getCustomers(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const query: CustomerQueryInput = req.query;
      const result = await customerService.getCustomers(businessId, query);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get customers error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch customers',
      });
    }
  }

  async addCustomerPayment(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      const userId = req.user?.id || '';
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: CustomerPaymentInput = req.body;
      const payment = await customerService.addCustomerPayment(businessId, customerId, userId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      logger.error('Add customer payment error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Payment addition failed',
      });
    }
  }

  async getCustomerStatement(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const input: CustomerStatementInput = req.query;
      const statement = await customerService.getCustomerStatement(businessId, customerId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: statement,
      });
    } catch (error: any) {
      logger.error('Get customer statement error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate statement',
      });
    }
  }

  async getCustomerStats(req: Request, res: Response) {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
      }

      const stats = await customerService.getCustomerStats(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get customer stats error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch customer statistics',
      });
    }
  }
}