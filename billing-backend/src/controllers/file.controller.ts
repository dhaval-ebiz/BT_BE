import { Response } from 'express';
import { getErrorMessage } from '../utils/errors';
import { FileService } from '../services/file.service';
import { logger, logApiRequest } from '../utils/logger';
import { AuditService } from '../services/audit.service';
import { BusinessRequest } from '../middleware/auth.middleware';

const fileService = new FileService();
const auditService = new AuditService();

export class FileController {
  
  async uploadFile(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
      if (!req.business) {
        return res.status(401).json({ success: false, message: 'Business authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const result = await fileService.uploadFile(req.file, req.business.id, req.user!.id, req.body.folder);
      
      await auditService.logFileAction(
        'UPLOAD',
        req.business.id,
        req.user!.id,
        req.file.originalname,
        req.file.mimetype,
        req
      );

      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Upload file error', { error });
      res.status(500).json({
        success: false,
        message: error.message || 'File upload failed',
      });
    }
  }

  async uploadMultipleFiles(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
      if (!req.business) {
         return res.status(401).json({ success: false, message: 'Business authentication required' });
      }

      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }
      
      const results = await fileService.uploadMultipleFiles(req.files as Express.Multer.File[], req.business.id, req.user!.id);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: results,
      });
    } catch (error: unknown) {
      logger.error('Upload multiple files error', { error });
      res.status(500).json({
        success: false,
        message: error.message || 'Files upload failed',
      });
    }
  }

  async getFile(req: BusinessRequest, res: Response) {
    try {
      const { key } = req.params;
      const download = req.query.download === 'true';
      if (!req.business) return res.status(401).json({ message: 'Auth required' });

      const urlOrPath = await fileService.getFile(key, req.business.id);

      if (urlOrPath.startsWith('http')) {
        // Redirect to S3 signed URL or absolute URL
        return res.redirect(urlOrPath);
      }
      
      // Serve local file
      if (download) {
        res.download(urlOrPath);
      } else {
        res.sendFile(urlOrPath, { root: '.' }); 
      }
    } catch (error: unknown) {
      logger.error('Get file error', { error });
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
  }

  async deleteFile(req: BusinessRequest, res: Response) {
    try {
      const { key } = req.params;
      if (!req.business) return res.status(401).json({ message: 'Auth required' });

      await fileService.deleteFile(key, req.business.id);
      
      await auditService.logFileAction(
        'DELETE',
        req.business.id,
        req.user!.id,
        key,
        'unknown', // we might not know type without DB lookup
        req
      );

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error: unknown) {
      logger.error('Delete file error', { error });
      res.status(500).json({
        success: false,
        message: error.message || 'File deletion failed',
      });
    }
  }

  async getSignedUrl(req: BusinessRequest, res: Response) {
    try {
      const { key } = req.params;
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
      
      const url = await fileService.getSignedUrl(key, expiresIn);
      
      res.json({
        success: true,
        data: {
          url,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
      });
    } catch (error: unknown) {
      logger.error('Get signed URL error', { error });
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate signed URL',
      });
    }
  }
}