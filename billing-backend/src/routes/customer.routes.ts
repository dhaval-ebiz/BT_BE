import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { 
  authenticateToken 
} from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { 
  createCustomerSchema, 
  updateCustomerSchema, 
  customerQuerySchema,
  customerPaymentSchema,
  customerStatementSchema 
} from '../schemas/customer.schema';

const router = Router();
const customerController = new CustomerController();

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers for a business
 *     tags: [Customers]
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
 *         description: List of customers
 */
router.get('/', authenticateToken, validateQuery(customerQuerySchema), customerController.getCustomers);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, validateBody(createCustomerSchema), customerController.createCustomer);

/**
 * @swagger
 * /api/customers/stats:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer statistics
 */
router.get('/stats', authenticateToken, customerController.getCustomerStats);

/**
 * @swagger
 * /api/customers/{customerId}/stats:
 *   get:
 *     summary: Get individual customer statistics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer statistics
 */
router.get('/:customerId/stats', authenticateToken, customerController.getIndividualCustomerStats);

/**
 * @swagger
 * /api/customers/{customerId}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get('/:customerId', authenticateToken, customerController.getCustomer);

/**
 * @swagger
 * /api/customers/{customerId}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.put('/:customerId', authenticateToken, validateBody(updateCustomerSchema), customerController.updateCustomer);

/**
 * @swagger
 * /api/customers/{customerId}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       400:
 *         description: Cannot delete customer with existing bills
 */
router.delete('/:customerId', authenticateToken, customerController.deleteCustomer);

/**
 * @swagger
 * /api/customers/{customerId}/payments:
 *   post:
 *     summary: Add payment for customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
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
 *               billIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Payment added successfully
 *       400:
 *         description: Validation error
 */
router.post('/:customerId/payments', authenticateToken, validateBody(customerPaymentSchema), customerController.addCustomerPayment);

/**
 * @swagger
 * /api/customers/{customerId}/statement:
 *   get:
 *     summary: Get customer statement
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Customer statement
 */
router.get('/:customerId/statement', authenticateToken, validateQuery(customerStatementSchema), customerController.getCustomerStatement);

export { router as customerRoutes };