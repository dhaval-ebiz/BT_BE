import { Router } from 'express';
import { QrController } from '../controllers/qr.controller';
import { authenticateToken, authorizeBusinessAccess } from '../middleware/auth.middleware';

const router = Router();
const qrController = new QrController();

// All routes require business authentication
router.use(authenticateToken, authorizeBusinessAccess);

// Generate a new batch of QR codes
router.post('/batch', (req, res) => qrController.generateBatch(req, res));

// List QR batches
router.get('/batches', (req, res) => qrController.getBatches(req, res));

export { router as qrRoutes };