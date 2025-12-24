import { db } from '../config/database';
import { bills, billApprovalHistory, users, retailBusinesses } from '../models/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { z } from 'zod';

const auditService = new AuditService();
const notificationService = new NotificationService();

// Validation schemas
const _approvalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

const _billSubmissionSchema = z.object({
  billId: z.string().uuid(),
  requiresApproval: z.boolean().default(false),
});

export class BillApprovalService {
  /**
   * Submit a bill for approval
   */
  async submitBillForApproval(
    businessId: string,
    billId: string,
    submittedBy: string,
    requiresApproval: boolean = true
  ) {
    try {
      // Check if bill exists and belongs to the business
      const bill = await db
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.businessId, businessId)))
        .limit(1);

      if (!bill.length) {
        throw new Error('Bill not found or does not belong to this business');
      }

      const existingBill = bill[0];

      // Check if bill can be submitted for approval
      if (existingBill.status !== 'DRAFT') {
        throw new Error('Only draft bills can be submitted for approval');
      }

      // Update bill status and approval workflow
      const updatedBill = await db
        .update(bills)
        .set({
          status: 'PENDING',
          approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
          requiresApproval,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, billId))
        .returning();

      // Create approval history entry
      if (requiresApproval) {
        await db.insert(billApprovalHistory).values({
          billId,
          action: 'SUBMITTED',
          performedBy: submittedBy,
          notes: 'Bill submitted for approval',
          oldStatus: 'DRAFT',
          newStatus: 'PENDING',
          oldApprovalStatus: 'NOT_REQUIRED',
          newApprovalStatus: 'PENDING',
        });

        // Notify business owner for approval
        await this.notifyOwnerForApproval(businessId, billId);
      }

      // Audit log
      await auditService.logBillAction(
        'SUBMIT_FOR_APPROVAL',
        businessId,
        submittedBy,
        billId,
        { status: 'DRAFT', approvalStatus: existingBill.approvalStatus },
        { status: 'PENDING', approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED' }
      );

      logger.info('Bill submitted for approval', {
        billId,
        businessId,
        submittedBy,
        requiresApproval,
      });

      return updatedBill[0];
    } catch (error) {
      logger.error('Error submitting bill for approval', { error, billId, businessId });
      throw error;
    }
  }

  /**
   * Approve or reject a bill
   */
  async processApproval(
    businessId: string,
    billId: string,
    approvedBy: string,
    action: 'approve' | 'reject',
    notes?: string
  ) {
    try {
      // Check if bill exists and belongs to the business
      const bill = await db
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.businessId, businessId)))
        .limit(1);

      if (!bill.length) {
        throw new Error('Bill not found or does not belong to this business');
      }

      const existingBill = bill[0];

      // Check if bill requires approval
      if (!existingBill.requiresApproval || existingBill.approvalStatus !== 'PENDING') {
        throw new Error('This bill does not require approval or is not pending approval');
      }

      // Check if approver has permission
      const approver = await db
        .select()
        .from(users)
        .where(eq(users.id, approvedBy))
        .limit(1);

      if (!approver.length) {
        throw new Error('Approver not found');
      }

      const approverUser = approver[0];
      if (!['RETAIL_OWNER', 'SUPER_ADMIN'].includes(approverUser.role)) {
        throw new Error('Only business owners can approve bills');
      }

      // Process approval/rejection
      const newApprovalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      const newBillStatus = action === 'approve' ? 'PENDING' : 'DRAFT'; // Reset to draft if rejected

      const updatedBill = await db
        .update(bills)
        .set({
          approvalStatus: newApprovalStatus,
          status: newBillStatus,
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bills.id, billId))
        .returning();

      // Create approval history entry
      await db.insert(billApprovalHistory).values({
        billId,
        action: action === 'approve' ? 'APPROVED' : 'REJECTED',
        performedBy: approvedBy,
        notes: notes || `Bill ${action}d`,
        oldStatus: existingBill.status,
        newStatus: newBillStatus,
        oldApprovalStatus: 'PENDING',
        newApprovalStatus,
      });

      // Notify bill creator about the decision
      await this.notifyBillCreator(businessId, billId, action, notes);

      // Audit log
      await auditService.logBillAction(
        action === 'approve' ? 'APPROVE_BILL' : 'REJECT_BILL',
        businessId,
        approvedBy,
        billId,
        { 
          status: existingBill.status, 
          approvalStatus: 'PENDING' 
        },
        { 
          status: newBillStatus, 
          approvalStatus: newApprovalStatus 
        },
        notes
      );

      logger.info('Bill approval processed', {
        billId,
        businessId,
        approvedBy,
        action,
        notes,
      });

      return updatedBill[0];
    } catch (error) {
      logger.error('Error processing bill approval', { error, billId, businessId, action });
      throw error;
    }
  }

  /**
   * Get bills pending approval for a business
   */
  async getBillsPendingApproval(businessId: string, limit: number = 50, offset: number = 0) {
    try {
      const pendingBills = await db
        .select({
          bill: bills,
          createdByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(bills)
        .leftJoin(users, eq(bills.createdBy, users.id))
        .where(
          and(
            eq(bills.businessId, businessId),
            eq(bills.approvalStatus, 'PENDING'),
            eq(bills.requiresApproval, true)
          )
        )
        .orderBy(bills.createdAt)
        .limit(limit)
        .offset(offset);

      return pendingBills;
    } catch (error) {
      logger.error('Error getting bills pending approval', { error, businessId });
      throw error;
    }
  }

  /**
   * Get approval history for a bill
   */
  async getBillApprovalHistory(businessId: string, billId: string) {
    try {
      const history = await db
        .select({
          history: billApprovalHistory,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
          },
        })
        .from(billApprovalHistory)
        .leftJoin(users, eq(billApprovalHistory.performedBy, users.id))
        .where(eq(billApprovalHistory.billId, billId))
        .orderBy(billApprovalHistory.createdAt);

      return history;
      return [];
    } catch (error) {
      logger.error('Error getting bill approval history', { error, billId });
      throw error;
    }
  }

  /**
   * Configure approval workflow for business
   */
  async configureApprovalWorkflow(
    businessId: string,
    enabled: boolean,
    thresholdAmount?: number,
    autoApproveBelowThreshold: boolean = false
  ) {
    try {
      // This would typically update business settings
      // For now, we'll just log the configuration
      logger.info('Approval workflow configured', {
        businessId,
        enabled,
        thresholdAmount,
        autoApproveBelowThreshold,
      });

      return {
        businessId,
        approvalWorkflowEnabled: enabled,
        thresholdAmount,
        autoApproveBelowThreshold,
      };
    } catch (error) {
      logger.error('Error configuring approval workflow', { error, businessId });
      throw error;
    }
  }

  /**
   * Bulk approve multiple bills
   */
  async bulkApproveBills(
    businessId: string,
    billIds: string[],
    approvedBy: string,
    notes?: string
  ) {
    try {
      const results = [];

      for (const billId of billIds) {
        try {
          const result = await this.processApproval(
            businessId,
            billId,
            approvedBy,
            'approve',
            notes
          );
          results.push({ billId, success: true, data: result });
        } catch (error) {
          results.push({ billId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in bulk bill approval', { error, businessId, billIds });
      throw error;
    }
  }

  /**
   * Notify business owner for bill approval
   */
  private async notifyOwnerForApproval(businessId: string, billId: string) {
    try {
      // Get business owner
      const business = await db
        .select()
        .from(retailBusinesses)
        .where(eq(retailBusinesses.id, businessId))
        .limit(1);

      if (business.length) {
        await notificationService.sendNotification({
          type: 'BILL_APPROVAL_REQUEST',
          recipientId: business[0].ownerId,
          businessId,
          entityId: billId,
          entityType: 'BILL',
          title: 'New Bill Requires Approval',
          message: `A new bill has been submitted and requires your approval. Bill ID: ${billId}`,
          priority: 'HIGH',
        });
      }
    } catch (error) {
      logger.error('Error notifying owner for bill approval', { error, businessId, billId });
    }
  }

  /**
   * Notify bill creator about approval decision
   */
  private async notifyBillCreator(
    businessId: string,
    billId: string,
    action: 'approve' | 'reject',
    notes?: string
  ) {
    try {
      const bill = await db
        .select()
        .from(bills)
        .where(eq(bills.id, billId))
        .limit(1);

      if (bill.length && bill[0].createdBy) {
        await notificationService.sendNotification({
          type: action === 'approve' ? 'BILL_APPROVED' : 'BILL_REJECTED',
          recipientId: bill[0].createdBy,
          businessId,
          entityId: billId,
          entityType: 'BILL',
          title: `Bill ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: `Your bill has been ${action}d.${notes ? ` Notes: ${notes}` : ''}`,
          priority: 'MEDIUM',
        });
      }
    } catch (error) {
      logger.error('Error notifying bill creator', { error, businessId, billId, action });
    }
  }
}
