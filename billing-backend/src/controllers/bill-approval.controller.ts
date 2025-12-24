import { Response } from 'express';
import { BillApprovalService } from '../services/bill-approval.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/common';
import { getErrorMessage } from '../utils/errors';

const billApprovalService = new BillApprovalService();

// Validation schemas
const pathParamsSchema = z.object({
  businessId: z.string().uuid(),
  billId: z.string().uuid().optional(),
});

const submitApprovalSchema = z.object({
  requiresApproval: z.boolean().optional(),
});

const processApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

const bulkApprovalSchema = z.object({
  billIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
});

const workflowConfigSchema = z.object({
  enabled: z.boolean().optional(),
  thresholdAmount: z.number().optional(),
  autoApproveBelowThreshold: z.boolean().optional(),
});

export class BillApprovalController {
  /**
   * Submit a bill for approval
   */
  async submitForApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, billId } = pathParamsSchema.parse(req.params);
      const { requiresApproval = true } = submitApprovalSchema.parse(req.body);
      
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (!billId) {
        res.status(400).json({ success: false, message: 'Bill ID is required' });
        return;
      }
      const userId = req.user.id;

      const updatedBill = await billApprovalService.submitBillForApproval(
        businessId,
        billId,
        userId,
        requiresApproval
      );

      res.json({
        success: true,
        message: 'Bill submitted for approval successfully',
        data: updatedBill,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error submitting bill for approval', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to submit bill for approval',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Approve or reject a bill
   */
  async processApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, billId } = pathParamsSchema.parse(req.params);
      const { action, notes } = processApprovalSchema.parse(req.body);
      
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (!billId) {
        res.status(400).json({ success: false, message: 'Bill ID is required' });
        return;
      }
      const userId = req.user.id;

      const updatedBill = await billApprovalService.processApproval(
        businessId,
        billId,
        userId,
        action,
        notes
      );

      res.json({
        success: true,
        message: `Bill ${action}d successfully`,
        data: updatedBill,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error processing bill approval', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to process bill approval',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Get bills pending approval
   */
  async getBillsPendingApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = pathParamsSchema.parse(req.params);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const pendingBills = await billApprovalService.getBillsPendingApproval(
        businessId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: pendingBills,
        pagination: {
          limit,
          offset,
          count: pendingBills.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting bills pending approval', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get bills pending approval',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Get bill approval history
   */
  async getBillApprovalHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId, billId } = pathParamsSchema.parse(req.params);
      
      if (!billId) {
        res.status(400).json({ success: false, message: 'Bill ID is required' });
        return;
      }

      const history = await billApprovalService.getBillApprovalHistory(businessId, billId);

      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting bill approval history', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get bill approval history',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Bulk approve bills
   */
  async bulkApproveBills(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = pathParamsSchema.parse(req.params);
      const { billIds, notes } = bulkApprovalSchema.parse(req.body);
      
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const userId = req.user.id;

      const results = await billApprovalService.bulkApproveBills(
        businessId,
        billIds,
        userId,
        notes
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        message: `Bulk approval completed. ${successful} successful, ${failed} failed`,
        data: results,
        summary: {
          successful,
          failed,
          total: results.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error in bulk bill approval', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to process bulk approval',
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Configure approval workflow for business
   */
  async configureApprovalWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { businessId } = pathParamsSchema.parse(req.params);
      const { enabled, thresholdAmount, autoApproveBelowThreshold } = workflowConfigSchema.parse(req.body);

      const config = await billApprovalService.configureApprovalWorkflow(
        businessId,
        enabled,
        thresholdAmount,
        autoApproveBelowThreshold
      );

      res.json({
        success: true,
        message: 'Approval workflow configured successfully',
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error configuring approval workflow', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to configure approval workflow',
        error: getErrorMessage(error),
      });
    }
  }
}
