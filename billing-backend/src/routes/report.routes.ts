import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateToken, authorizeBusinessAccess, authorizePermission } from '../middleware/auth.middleware';

const router = Router();
const reportController = new ReportController();

// All routes require authentication and business access
router.use(authenticateToken, authorizeBusinessAccess);

// Sales Reports
router.get(
  '/sales',
  authorizePermission('REPORTS_READ'),
  reportController.getSalesReport
);

router.get(
  '/sales/top-products',
  authorizePermission('REPORTS_READ'),
  reportController.getTopSellingProducts
);

// Inventory Reports
router.get(
  '/inventory/valuation',
  authorizePermission('INVENTORY_READ'),
  reportController.getInventoryValuation
);

router.get(
  '/inventory/low-stock',
  authorizePermission('INVENTORY_READ'),
  reportController.getLowStockAlerts
);

// Financial Reports
router.get(
  '/profit-loss',
  authorizePermission('REPORTS_READ'), 
  reportController.getProfitLoss
);

router.get(
  '/tax',
  authorizePermission('REPORTS_READ'),
  reportController.getTaxReport
);

export default router;
