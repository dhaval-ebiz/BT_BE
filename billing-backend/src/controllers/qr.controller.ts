import { Response } from 'express';
import { QrService } from '../services/qr.service';
import { BusinessRequest } from '../middleware/auth.middleware';
import { generateQrBatchSchema } from '../schemas/qr.schema';
import { logApiRequest } from '../utils/logger';
import { logger } from '../utils/logger';

const qrService = new QrService();

export class QrController {
  async generateBatch(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      // Validate input
      const validation = generateQrBatchSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          errors: validation.error.errors,
        });
      }

      const result = await qrService.generateBatch(req.business.id, req.user.id, validation.data, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Generate QR batch error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getBatches(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.query;
      const batches = await qrService.getBatches(req.business.id, productId as string);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: batches,
      });
    } catch (error: any) {
      logger.error('Get QR batches error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}