import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: [
      'GET /health - Health check',
      'GET /api-docs - API documentation',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login',
      'GET /api/business - Business operations',
      'GET /api/customers - Customer management',
      'GET /api/products - Product management',
      'GET /api/billing - Billing operations',
      'GET /api/dashboard - Dashboard data',
      'GET /api/ai - AI features',
      'POST /api/files/upload - File upload',
    ],
  });
};