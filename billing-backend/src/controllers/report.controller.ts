import { Response } from 'express';
import { BusinessRequest } from '../middleware/auth.middleware';
import { ReportService } from '../services/report.service';
import { AuditService } from '../services/audit.service';
import { z } from 'zod';

const reportService = new ReportService();
const auditService = new AuditService();

// Schema for date range queries
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(), // ISO format
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['DAY', 'WEEK', 'MONTH']).optional().default('DAY'),
  limit: z.string().transform(Number).optional().default('5'),
});

export class ReportController {

  async getSalesReport(req: BusinessRequest, res: Response) {
    try {
      const businessId = req.business?.id;
      const user = req.user;
      const { startDate, endDate, granularity } = dateRangeSchema.parse(req.query);

      const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1)); // Default last month
      const end = endDate ? new Date(endDate) : new Date();

      const report = await reportService.getSalesReport(businessId!, start, end, granularity);

      await auditService.logAction({
        businessId: businessId!,
        userId: user!.id,
        action: 'VIEW_SALES_REPORT',
        entityType: 'REPORT',
        entityId: 'SALES',
        metadata: { startDate: start, endDate: end, granularity }
      });

      res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('Error fetching sales report:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sales report' });
    }
  }

  async getTopSellingProducts(req: BusinessRequest, res: Response) {
      try {
        const businessId = req.business?.id;
        const { startDate, endDate, limit } = dateRangeSchema.parse(req.query);
  
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();
  
        const report = await reportService.getTopSellingProducts(businessId!, start, end, limit);
  
        res.status(200).json({ success: true, data: report });
      } catch (error) {
        console.error('Error fetching top selling products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch top selling products' });
      }
  }

  async getInventoryValuation(req: BusinessRequest, res: Response) {
    try {
        const businessId = req.business?.id;
        const user = req.user;

        const report = await reportService.getInventoryValuation(businessId!);

        await auditService.logAction({
            businessId: businessId!,
            userId: user!.id,
            action: 'VIEW_INVENTORY_REPORT',
            entityType: 'REPORT',
            entityId: 'INVENTORY_VALUATION'
        });

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error('Error fetching inventory valuation:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory valuation' });
    }
  }

  async getLowStockAlerts(req: BusinessRequest, res: Response) {
      try {
          const businessId = req.business?.id;
          const report = await reportService.getLowStockAlerts(businessId!);
          res.status(200).json({ success: true, data: report });
      } catch (error) {
          console.error('Error fetching low stock alerts:', error);
          res.status(500).json({ success: false, message: 'Failed to fetch low stock alerts' });
      }
  }

  async getProfitLoss(req: BusinessRequest, res: Response) {
      try {
        const businessId = req.business?.id;
        const user = req.user;
        const { startDate, endDate } = dateRangeSchema.parse(req.query);
  
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();
  
        const report = await reportService.getProfitLoss(businessId!, start, end);
  
        await auditService.logAction({
            businessId: businessId!,
            userId: user!.id,
            action: 'VIEW_PNL_REPORT',
            entityType: 'REPORT',
            entityId: 'PROFIT_LOSS',
            metadata: { startDate: start, endDate: end }
        });
  
        res.status(200).json({ success: true, data: report });
      } catch (error) {
        console.error('Error fetching profit loss report:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profit loss report' });
      }
  }

  async getTaxReport(req: BusinessRequest, res: Response) {
    try {
      const businessId = req.business?.id;
      const user = req.user;
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate) : new Date();

      const report = await reportService.getTaxReport(businessId!, start, end);

      await auditService.logAction({
        businessId: businessId!,
        userId: user!.id,
        action: 'VIEW_TAX_REPORT',
        entityType: 'REPORT',
        entityId: 'TAX',
        metadata: { startDate: start, endDate: end }
      });

      res.status(200).json({ success: true, data: report });
    } catch (error) {
      console.error('Error fetching tax report:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tax report' });
    }
  }
}
