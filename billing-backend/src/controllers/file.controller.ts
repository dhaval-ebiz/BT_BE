import { Response } from 'express';
import { FileService } from '../services/file.service';
import { logger, logApiRequest } from '../utils/logger';
import { AuditService } from '../services/audit.service';
import { BusinessRequest } from '../middleware/auth.middleware';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

const fileService = new FileService();
const auditService = new AuditService();

export class FileController {
  
  async uploadFile(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.business || !req.user) {
        res.status(401).json({ success: false, message: 'Business authentication required' });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const result = await fileService.uploadFile(req.file, req.business.id, req.user.id, (req.body as { folder?: string }).folder as string);
      
      await auditService.logFileAction(
        'UPLOAD',
        req.business.id,
        req.user.id,
        req.file.originalname,
        req.file.mimetype,
        undefined,
        req
      );

      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Upload file error', { error });
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async uploadMultipleFiles(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.business || !req.user) {
        res.status(401).json({ success: false, message: 'Business authentication required' });
        return;
      }

      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
        return;
      }
      
      const results = await fileService.uploadMultipleFiles(req.files as Express.Multer.File[], req.business.id, req.user.id);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Upload multiple files error', { error });
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async getFile(req: BusinessRequest, res: Response): Promise<void> {
    try {
      if (!req.business) {
        res.status(401).json({ message: 'Auth required' });
        return;
      }

      const { key } = req.params;
      if (!key) {
        res.status(400).json({ success: false, message: 'File key is required' });
        return;
      }
      const download = req.query.download === 'true';

      const urlOrPath = await fileService.getFile(key, req.business.id);

      if (urlOrPath.startsWith('http')) {
        // Redirect to S3 signed URL or absolute URL
        res.redirect(urlOrPath);
        return;
      }
      
      // Serve local file
      if (download) {
        res.download(urlOrPath);
      } else {
        res.sendFile(urlOrPath, { root: '.' }); 
      }
    } catch (error) {
      logger.error('Get file error', { error });
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
  }

  async deleteFile(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      if (!req.business || !req.user) {
        res.status(401).json({ message: 'Auth required' });
        return;
      }

      if (!key) {
        res.status(400).json({ success: false, message: 'File key is required' });
        return;
      }

      await fileService.deleteFile(key, req.business.id);
      
      await auditService.logFileAction(
        'DELETE',
        req.business.id,
        req.user.id,
        key,
        'unknown', // we might not know type without DB lookup
        undefined,
        req
      );

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Delete file error', { error });
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }

  async getSignedUrl(req: BusinessRequest, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      if (!key) {
        res.status(400).json({ success: false, message: 'File key is required' });
        return;
      }
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
      
      const url = await fileService.getSignedUrl(key, expiresIn);
      
      res.json({
        success: true,
        data: {
          url,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
      });
    } catch (error) {
      logger.error('Get signed URL error', { error });
      res.status(500).json({
        success: false,
        message: getErrorMessage(error),
      });
    }
  }
}