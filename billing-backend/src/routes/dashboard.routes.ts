import { Router, Request, Response } from 'express';
import { authenticateToken, authorizeBusinessAccess, authorizePermission, BusinessRequest } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

// Shared middleware
const secure = [authenticateToken, authorizeBusinessAccess];

// Stats (Visible to anyone with Reports access)
router.get('/stats', secure, authorizePermission('ANALYTICS', 'READ'), (req: Request, res: Response) => dashboardController.getStats(req as BusinessRequest, res));

// Graphs
router.get('/sales-graph', secure, authorizePermission('ANALYTICS', 'READ'), (req: Request, res: Response) => dashboardController.getSalesGraph(req as BusinessRequest, res));

// Top Products (Might be useful for Inventory managers too, but keeping Reports for now)
router.get('/top-products', secure, authorizePermission('ANALYTICS', 'READ'), (req: Request, res: Response) => dashboardController.getTopProducts(req as BusinessRequest, res));

// Low Stock (Vital for Inventory)
router.get('/low-stock', secure, authorizePermission('PRODUCT', 'UPDATE'), (req: Request, res: Response) => dashboardController.getLowStock(req as BusinessRequest, res));

export { router as dashboardRoutes };