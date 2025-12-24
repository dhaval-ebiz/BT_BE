import { Response } from 'express';
import { MoneyManagementService } from '../services/money-management.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/common';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

const moneyService = new MoneyManagementService();

// Validation schemas
const depositSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const withdrawSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  fromCustomerId: z.string().uuid(),
  toCustomerId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  notes: z.string().optional(),
});

const historyQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export class MoneyManagementController {
  /**
   * Deposit money to customer account
   */
  async depositMoney(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const userId = req.user.id;
      const data = depositSchema.parse(req.body);

      const result = await moneyService.depositMoney(businessId, userId, data);

      res.json({
        success: true,
        message: 'Money deposited successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error depositing money', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to deposit money',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Withdraw money from customer account
   */
  async withdrawMoney(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const userId = req.user.id;
      const data = withdrawSchema.parse(req.body);

      const result = await moneyService.withdrawMoney(businessId, userId, data);

      res.json({
        success: true,
        message: 'Money withdrawn successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error withdrawing money', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to withdraw money',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Transfer money between customer accounts
   */
  async transferMoney(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const userId = req.user.id;
      const data = transferSchema.parse(req.body);

      const result = await moneyService.transferMoney(businessId, userId, data);

      res.json({
        success: true,
        message: 'Money transferred successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error transferring money', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to transfer money',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Get customer money history
   */
  async getCustomerMoneyHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, customerId } = req.params;
      if (!businessId || !customerId) {
        res.status(400).json({ success: false, message: 'Business ID and Customer ID are required' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const query = historyQuerySchema.parse(req.query);
      
      const limit = parseInt(query.limit || '50');
      const offset = parseInt(query.offset || '0');
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const result = await moneyService.getCustomerMoneyHistory(
        businessId,
        req.user.id,
        customerId,
        limit,
        offset,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting customer money history', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get customer money history',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Get business money summary
   */
  async getBusinessMoneySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      
      const result = await moneyService.getBusinessMoneySummary(businessId, req.user.id);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting business money summary', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get business money summary',
        error: getErrorMessage(error),
      });
    }
  }
}
