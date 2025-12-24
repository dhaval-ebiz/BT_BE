import { Router } from 'express';
import { MerchantController } from '../controllers/merchant.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { 
  createMerchantSchema, 
  updateMerchantSchema, 
  merchantQuerySchema,
  merchantPaymentSchema 
} from '../schemas/merchant.schema';

const router = Router();
const merchantController = new MerchantController();

/**
 * @swagger
 * /api/merchants:
 *   get:
 *     summary: Get all merchants for a business
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: hasOutstanding
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of merchants
 */
router.get('/', authenticateToken, validateQuery(merchantQuerySchema), merchantController.getMerchants);

/**
 * @swagger
 * /api/merchants:
 *   post:
 *     summary: Create a new merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Merchant'
 *     responses:
 *       201:
 *         description: Merchant created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, validateBody(createMerchantSchema), merchantController.createMerchant);

/**
 * @swagger
 * /api/merchants/stats:
 *   get:
 *     summary: Get merchant statistics
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Merchant statistics
 */
router.get('/stats', authenticateToken, merchantController.getMerchantStats);

/**
 * @swagger
 * /api/merchants/{merchantId}:
 *   get:
 *     summary: Get merchant by ID
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Merchant details
 *       404:
 *         description: Merchant not found
 */
router.get('/:merchantId', authenticateToken, merchantController.getMerchant);

/**
 * @swagger
 * /api/merchants/{merchantId}:
 *   put:
 *     summary: Update merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Merchant'
 *     responses:
 *       200:
 *         description: Merchant updated successfully
 *       404:
 *         description: Merchant not found
 */
router.put('/:merchantId', authenticateToken, validateBody(updateMerchantSchema), merchantController.updateMerchant);

/**
 * @swagger
 * /api/merchants/{merchantId}:
 *   delete:
 *     summary: Delete merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Merchant deleted successfully
 *       400:
 *         description: Cannot delete merchant with existing payments
 */
router.delete('/:merchantId', authenticateToken, merchantController.deleteMerchant);

/**
 * @swagger
 * /api/merchants/{merchantId}/payments:
 *   post:
 *     summary: Add payment for merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               method:
 *                 type: string
 *                 enum: [CASH, CARD, UPI, BANK_TRANSFER, CHEQUE, DIGITAL_WALLET]
 *               referenceNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment added successfully
 *       400:
 *         description: Validation error
 */
router.post('/:merchantId/payments', authenticateToken, validateBody(merchantPaymentSchema), merchantController.addMerchantPayment);

/**
 * @swagger
 * /api/merchants/{merchantId}/payments:
 *   get:
 *     summary: Get merchant payments
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/:merchantId/payments', authenticateToken, merchantController.getMerchantPayments);

export { router as merchantRoutes };