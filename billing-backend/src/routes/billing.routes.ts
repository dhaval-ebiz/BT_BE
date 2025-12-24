import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authenticateToken, authorizeBusinessAccess } from '../middleware/auth.middleware';

const router = Router();
const billingController = new BillingController();

// All routes require business authentication
router.use(authenticateToken, authorizeBusinessAccess);

// Bulk payment (FIFO allocation)
router.post('/bulk-payment', (req, res) => billingController.recordBulkPayment(req, res));

// Smart Suggestions
router.get('/suggestions', (req, res) => billingController.getSuggestions(req, res));

// Base CRUD
router.post('/', (req, res) => billingController.createBill(req, res));
router.get('/', (req, res) => billingController.listBills(req, res));
router.get('/:billId', (req, res) => billingController.getBill(req, res));
router.put('/:billId', (req, res) => billingController.updateBill(req, res));

// Payments & Actions
router.post('/:billId/payments', (req, res) => billingController.recordPayment(req, res));
router.get('/:billId/invoice', (req, res) => billingController.generateInvoicePdf(req, res));
router.post('/:billId/share', (req, res) => billingController.shareBill(req, res));

export { router as billingRoutes };