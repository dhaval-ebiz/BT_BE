import { Request, Response } from 'express';
import { BillApprovalService } from '../services/bill-approval.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const billApprovalService = new BillApprovalService();

// Validation schemas
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

export class BillApprovalController {
  /**
   * Submit a bill for approval
   */
  async submitForApproval(req: Request, res: Response) {
    try {
      const { businessId, billId } = req.params;
      const { requiresApproval = true } = submitApprovalSchema.parse(req.body);
      const userId = req.user!.id;

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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Approve or reject a bill
   */
  async processApproval(req: Request, res: Response) {
    try {
      const { businessId, billId } = req.params;
      const { action, notes } = processApprovalSchema.parse(req.body);
      const userId = req.user!.id;

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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get bills pending approval
   */
  async getBillsPendingApproval(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get bill approval history
   */
  async getBillApprovalHistory(req: Request, res: Response) {
    try {
      const { businessId, billId } = req.params;

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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Bulk approve bills
   */
  async bulkApproveBills(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { billIds, notes } = bulkApprovalSchema.parse(req.body);
      const userId = req.user!.id;

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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Configure approval workflow for business
   */
  async configureApprovalWorkflow(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { enabled, thresholdAmount, autoApproveBelowThreshold } = req.body;

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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
