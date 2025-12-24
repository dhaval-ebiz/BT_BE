import { Router } from 'express';
import { BillApprovalController } from '../controllers/bill-approval.controller';
import { authenticateToken, authorizeBusinessAccess, authorizeRole } from '../middleware/auth.middleware';

const router = Router();
const billApprovalController = new BillApprovalController();

// All bill approval routes require authentication and business access
router.use(authenticateToken);
router.use('/:businessId', authorizeBusinessAccess);

/**
 * @swagger
 * /api/bill-approval/{businessId}/bills/{billId}/submit:
 *   post:
 *     summary: Submit a bill for approval
 *     tags: [Bill Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bill ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requiresApproval:
 *                 type: boolean
 *                 description: Whether the bill requires approval
 *     responses:
 *       200:
 *         description: Bill submitted for approval successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Bill'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/:businessId/bills/:billId/submit', billApprovalController.submitForApproval);

/**
 * @swagger
 * /api/bill-approval/{businessId}/bills/{billId}/process:
 *   post:
 *     summary: Approve or reject a bill
 *     tags: [Bill Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Approval action
 *               notes:
 *                 type: string
 *                 description: Optional approval notes
 *     responses:
 *       200:
 *         description: Bill processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Bill'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/:businessId/bills/:billId/process', 
  authorizeRole('RETAIL_OWNER', 'SUPER_ADMIN'), 
  billApprovalController.processApproval
);

/**
 * @swagger
 * /api/bill-approval/{businessId}/pending:
 *   get:
 *     summary: Get bills pending approval
 *     tags: [Bill Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Bills pending approval retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BillWithCreator'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/pending', 
  authorizeRole('RETAIL_OWNER', 'SUPER_ADMIN', 'MANAGER'), 
  billApprovalController.getBillsPendingApproval
);

/**
 * @swagger
 * /api/bill-approval/{businessId}/bills/{billId}/history:
 *   get:
 *     summary: Get bill approval history
 *     tags: [Bill Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill approval history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BillApprovalHistory'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/bills/:billId/history', billApprovalController.getBillApprovalHistory);

/**
 * @swagger
 * /api/bill-approval/{businessId}/bulk-approve:
 *   post:
 *     summary: Bulk approve multiple bills
 *     tags: [Bill Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - billIds
 *             properties:
 *               billIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of bill IDs to approve
 *               notes:
 *                 type: string
 *                 description: Optional approval notes
 *     responses:
 *       200:
 *         description: Bulk approval processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/:businessId/bulk-approve', 
  authorizeRole('RETAIL_OWNER', 'SUPER_ADMIN'), 
  billApprovalController.bulkApproveBills
);

/**
 * @swagger
 * /api/bill-approval/{businessId}/configure:
 *   post:
 *     summary: Configure approval workflow for business
 *     tags: [Bill Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable/disable approval workflow
 *               thresholdAmount:
 *                 type: number
 *                 description: Amount threshold for requiring approval
 *               autoApproveBelowThreshold:
 *                 type: boolean
 *                 description: Auto-approve bills below threshold
 *     responses:
 *       200:
 *         description: Approval workflow configured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/:businessId/configure', 
  authorizeRole('RETAIL_OWNER', 'SUPER_ADMIN'), 
  billApprovalController.configureApprovalWorkflow
);

export default router;
