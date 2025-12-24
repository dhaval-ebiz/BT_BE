import { Router } from 'express';
import { authenticateToken, authorizeBusinessAccess, authorizePermission } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

// Shared middleware
const secure = [authenticateToken, authorizeBusinessAccess];

// Stats (Visible to anyone with Reports access)
router.get('/stats', secure, authorizePermission('ANALYTICS_READ'), (req, res) => dashboardController.getStats(req, res));

// Graphs
router.get('/sales-graph', secure, authorizePermission('ANALYTICS_READ'), (req, res) => dashboardController.getSalesGraph(req, res));

// Top Products (Might be useful for Inventory managers too, but keeping Reports for now)
router.get('/top-products', secure, authorizePermission('ANALYTICS_READ'), (req, res) => dashboardController.getTopProducts(req, res));

// Low Stock (Vital for Inventory)
router.get('/low-stock', secure, authorizePermission('PRODUCT_UPDATE'), (req, res) => dashboardController.getLowStock(req, res));

export { router as dashboardRoutes };