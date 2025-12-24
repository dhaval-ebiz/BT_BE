import { Router } from 'express';
import { MoneyManagementController } from '../controllers/money-management.controller';
import { authenticateToken, authorizeBusinessAccess } from '../middleware/auth.middleware';

const router = Router();
const moneyController = new MoneyManagementController();

// All money management routes require authentication and business access
router.use(authenticateToken);
router.use('/:businessId', authorizeBusinessAccess);

/**
 * @swagger
 * /api/money/{businessId}/deposit:
 *   post:
 *     summary: Deposit money to customer account
 *     tags: [Money Management]
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
 *               - customerId
 *               - amount
 *               - method
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 description: Customer ID
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Amount to deposit
 *               method:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, BANK_TRANSFER, CHEQUE]
 *                 description: Payment method
 *               referenceNumber:
 *                 type: string
 *                 description: Optional reference number
 *               notes:
 *                 type: string
 *                 description: Optional notes
 *     responses:
 *       200:
 *         description: Money deposited successfully
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
router.post('/:businessId/deposit', moneyController.depositMoney);

/**
 * @swagger
 * /api/money/{businessId}/withdraw:
 *   post:
 *     summary: Withdraw money from customer account
 *     tags: [Money Management]
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
 *               - customerId
 *               - amount
 *               - method
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *                 description: Customer ID
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Amount to withdraw
 *               method:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, BANK_TRANSFER, CHEQUE]
 *                 description: Payment method
 *               referenceNumber:
 *                 type: string
 *                 description: Optional reference number
 *               notes:
 *                 type: string
 *                 description: Optional notes
 *     responses:
 *       200:
 *         description: Money withdrawn successfully
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
router.post('/:businessId/withdraw', moneyController.withdrawMoney);

/**
 * @swagger
 * /api/money/{businessId}/transfer:
 *   post:
 *     summary: Transfer money between customer accounts
 *     tags: [Money Management]
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
 *               - fromCustomerId
 *               - toCustomerId
 *               - amount
 *             properties:
 *               fromCustomerId:
 *                 type: string
 *                 format: uuid
 *                 description: Source customer ID
 *               toCustomerId:
 *                 type: string
 *                 format: uuid
 *                 description: Destination customer ID
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Amount to transfer
 *               notes:
 *                 type: string
 *                 description: Optional notes
 *     responses:
 *       200:
 *         description: Money transferred successfully
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
router.post('/:businessId/transfer', moneyController.transferMoney);

/**
 * @swagger
 * /api/money/{businessId}/customers/{customerId}/history:
 *   get:
 *     summary: Get customer money history
 *     tags: [Money Management]
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
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Customer money history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/customers/:customerId/history', moneyController.getCustomerMoneyHistory);

/**
 * @swagger
 * /api/money/{businessId}/summary:
 *   get:
 *     summary: Get business money summary
 *     tags: [Money Management]
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
 *     responses:
 *       200:
 *         description: Business money summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/summary', moneyController.getBusinessMoneySummary);

export default router;
