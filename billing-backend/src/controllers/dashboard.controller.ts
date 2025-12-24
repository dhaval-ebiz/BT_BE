import { Response } from 'express';
import { BusinessRequest } from '../middleware/auth.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { logger, logApiRequest } from '../utils/logger';

const analyticsService = new AnalyticsService();

export class DashboardController {

  async getStats(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business) return res.status(401).json({ success: false });

        const stats = await analyticsService.getDashboardStats(req.business.id);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: stats });
    } catch (error: any) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async getSalesGraph(req: BusinessRequest, res: Response) {
    try {
        if (!req.business) return res.status(401).json({ success: false });
        
        const { range } = req.query; // WEEK, MONTH
        const data = await analyticsService.getSalesGraph(req.business.id, range as 'WEEK' | 'MONTH' || 'WEEK');
        
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTopProducts(req: BusinessRequest, res: Response) {
    try {
        if (!req.business) return res.status(401).json({ success: false });
        
        const { limit } = req.query;
        const data = await analyticsService.getTopSellingProducts(req.business.id, limit ? Number(limit) : 5);
        
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async getLowStock(req: BusinessRequest, res: Response) {
     try {
        if (!req.business) return res.status(401).json({ success: false });
        
        const { limit } = req.query;
        const data = await analyticsService.getLowStockItems(req.business.id, limit ? Number(limit) : 10);
        
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
  }
}