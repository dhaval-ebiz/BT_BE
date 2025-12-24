import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { testConnection as testDBConnection } from './config/database';
import { testRedisConnection } from './config/redis';
import { initializeQueues, closeQueues } from './queues/bullmq';
import { logger, logApiRequest } from './utils/logger';
import { swaggerSpec, swaggerUi } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { performanceMonitor, apiMetrics, securityMetrics } from './middleware/performance.middleware';
import { generalRateLimit } from './middleware/rate-limit.middleware';
import { authRoutes } from './routes/auth.routes';
import { adminRoutes } from './routes/admin.routes';
import { businessRoutes } from './routes/business.routes';
import { customerRoutes } from './routes/customer.routes';
import { merchantRoutes } from './routes/merchant.routes';
import { productRoutes } from './routes/product.routes';
import { billingRoutes } from './routes/billing.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { aiRoutes } from './routes/ai.routes';
import { fileRoutes } from './routes/file.routes';
import { qrRoutes } from './routes/qr.routes';
import analyticsRoutes from './routes/analytics.routes';
import billApprovalRoutes from './routes/bill-approval.routes';
import permissionRoutes from './routes/permission.routes';
import { moneyRoutes } from './routes/money.routes';
import moneyManagementRoutes from './routes/money-management.routes';
import reportRoutes from './routes/report.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: false,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Performance monitoring middleware
app.use(performanceMonitor);
app.use(apiMetrics);
app.use(securityMetrics);

// Rate limiting
app.use(generalRateLimit);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version,
  });
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/products', productRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/bill-approval', billApprovalRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/money', moneyRoutes);
app.use('/api/money-management', moneyManagementRoutes);
app.use('/api/reports', reportRoutes);

// Request logging middleware (after routes)
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logApiRequest(req, res, duration);
  });
  next();
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeQueues();
  process.exit(0);
});

// Initialize services and start server
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await testDBConnection();
    
    // Test Redis connection
    await testRedisConnection();
    
    // Initialize BullMQ queues and workers
    await initializeQueues();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Unhandled error starting server:', error);
  process.exit(1);
});