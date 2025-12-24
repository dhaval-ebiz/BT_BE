import { Response } from 'express';
import { BusinessRequest } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { logger, logApiRequest } from '../utils/logger';

const analyticsService = new AnalyticsService();

export class DashboardController {

  async getStats(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business) {
            res.status(401).json({ success: false });
            return;
        }

        const stats = await analyticsService.getDashboardStats(req.business.id);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: stats });
    } catch (error: unknown) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async getSalesGraph(req: BusinessRequest, res: Response): Promise<void> {
    try {
        if (!req.business) {
            res.status(401).json({ success: false });
            return;
        }
        
        const { range } = req.query; // WEEK, MONTH
        const data = await analyticsService.getSalesGraph(req.business.id, range as 'WEEK' | 'MONTH' || 'WEEK');
        
        res.json({ success: true, data });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async getTopProducts(req: BusinessRequest, res: Response): Promise<void> {
    try {
        if (!req.business) {
            res.status(401).json({ success: false });
            return;
        }
        
        const { limit } = req.query;
        const data = await analyticsService.getTopSellingProducts(req.business.id, limit ? Number(limit) : 5);
        
        res.json({ success: true, data });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  async getLowStock(req: BusinessRequest, res: Response): Promise<void> {
     try {
        if (!req.business) {
            res.status(401).json({ success: false });
            return;
        }
        
        const { limit } = req.query;
        const data = await analyticsService.getLowStockItems(req.business.id, limit ? Number(limit) : 10);
        
        res.json({ success: true, data });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
  }
}