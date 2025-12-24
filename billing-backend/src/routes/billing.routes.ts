import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authenticateToken, authorizeBusinessAccess } from '../middleware/auth.middleware';

const router = Router();
const billingController = new BillingController();

router.use(authenticateToken, authorizeBusinessAccess);

// Core Billing
router.post('/', (req, res) => billingController.createBill(req, res));
router.get('/', (req, res) => billingController.listBills(req, res));
router.get('/:billId', (req, res) => billingController.getBill(req, res));
router.put('/:billId', (req, res) => billingController.updateBill(req, res));

// Payments
router.post('/:billId/payments', (req, res) => billingController.recordPayment(req, res));

// PDF
router.get('/:billId/pdf', (req, res) => billingController.generateInvoicePdf(req, res));
router.post('/:billId/share', (req, res) => billingController.shareBill(req, res));


export { router as billingRoutes };