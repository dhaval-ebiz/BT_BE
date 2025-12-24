import { Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { 
  CreateCustomerInput, 
  UpdateCustomerInput, 
  CustomerQueryInput,
  CustomerPaymentInput,
  CustomerStatementInput 
} from '../schemas/customer.schema';
import { logger, logApiRequest } from '../utils/logger';
import { AuthenticatedRequest } from '../types/common';

const customerService = new CustomerService();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class CustomerController {
  async createCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'User not authenticated',
        });
        return;
      }

      const input = req.body as CreateCustomerInput;
      const customer = await customerService.createCustomer(businessId, req.user.id, input, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error: unknown) {
      logger.error('Create customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Customer creation failed',
      });
    }
  }

  async getCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      if (!customerId) {
        res.status(400).json({ success: false, message: 'Customer ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const customer = await customerService.getCustomer(businessId, customerId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: customer,
      });
    } catch (error: unknown) {
      logger.error('Get customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: getErrorMessage(error) || 'Customer not found',
      });
    }
  }

  async updateCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      if (!customerId) {
        res.status(400).json({ success: false, message: 'Customer ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'User not authenticated',
        });
        return;
      }

      const input = req.body as UpdateCustomerInput;
      const customer = await customerService.updateCustomer(businessId, req.user.id, customerId, input, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: customer,
      });
    } catch (error: unknown) {
      logger.error('Update customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Customer update failed',
      });
    }
  }

  async deleteCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      if (!customerId) {
        res.status(400).json({ success: false, message: 'Customer ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'User not authenticated',
        });
        return;
      }

      const result = await customerService.deleteCustomer(businessId, req.user.id, customerId, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Delete customer error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Customer deletion failed',
      });
    }
  }

  async getCustomers(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const query = req.query as unknown as CustomerQueryInput;
      const result = await customerService.getCustomers(businessId, query);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Get customers error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch customers',
      });
    }
  }

  async addCustomerPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      if (!customerId) {
        res.status(400).json({ success: false, message: 'Customer ID is required' });
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

      const input = req.body as CustomerPaymentInput;
      const payment = await customerService.addCustomerPayment(businessId, customerId, userId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error: unknown) {
      logger.error('Add customer payment error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Payment addition failed',
      });
    }
  }

  async getCustomerStatement(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const customerId = req.params.customerId;
      if (!customerId) {
        res.status(400).json({ success: false, message: 'Customer ID is required' });
        return;
      }
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      const input = req.query as unknown as CustomerStatementInput;
      const statement = await customerService.getCustomerStatement(businessId, customerId, input);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: statement,
      });
    } catch (error: unknown) {
      logger.error('Get customer statement error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to generate statement',
      });
    }
  }

  async getCustomerStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const stats = await customerService.getCustomerStats(businessId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      logger.error('Get customer stats error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch customer statistics',
      });
    }
  }

  async getIndividualCustomerStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const businessId = req.user?.businessId || req.query.businessId as string;
      const { customerId } = req.params;
      
      if (!businessId) {
        res.status(400).json({
          success: false,
          message: 'Business ID is required',
        });
        return;
      }

      if (!customerId) {
        res.status(400).json({
          success: false,
          message: 'Customer ID is required',
        });
        return;
      }

      const stats = await customerService.getIndividualCustomerStats(businessId, customerId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      logger.error('Get individual customer stats error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error) || 'Failed to fetch customer stats',
      });
    }
  }
}