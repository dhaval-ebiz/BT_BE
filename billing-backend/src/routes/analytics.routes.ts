import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateToken, authorizeBusinessAccess } from '../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// All analytics routes require authentication and business access
router.use(authenticateToken);
router.use('/:businessId', authorizeBusinessAccess);

/**
 * @swagger
 * /api/analytics/{businessId}/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardOverview'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/dashboard', analyticsController.getDashboardOverview);

/**
 * @swagger
 * /api/analytics/{businessId}/mrr-prediction:
 *   get:
 *     summary: Get MRR prediction with factors
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: MRR prediction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MRRPrediction'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/mrr-prediction', analyticsController.getMRREPrediction);

/**
 * @swagger
 * /api/analytics/{businessId}/health-score:
 *   get:
 *     summary: Get business health score
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business health score retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BusinessHealthScore'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/health-score', analyticsController.getBusinessHealthScore);

/**
 * @swagger
 * /api/analytics/{businessId}/revenue-trend:
 *   get:
 *     summary: Get revenue trend analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for trend analysis
 *     responses:
 *       200:
 *         description: Revenue trend retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RevenueTrend'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/revenue-trend', analyticsController.getRevenueTrend);

/**
 * @swagger
 * /api/analytics/{businessId}/customer-analytics:
 *   get:
 *     summary: Get customer analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Customer analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CustomerAnalytics'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/customer-analytics', analyticsController.getCustomerAnalytics);

/**
 * @swagger
 * /api/analytics/{businessId}/product-analytics:
 *   get:
 *     summary: Get product analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Product analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProductAnalytics'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/product-analytics', analyticsController.getProductAnalytics);

/**
 * @swagger
 * /api/analytics/{businessId}/payment-analytics:
 *   get:
 *     summary: Get payment analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Payment analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentAnalytics'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/payment-analytics', analyticsController.getPaymentAnalytics);

/**
 * @swagger
 * /api/analytics/{businessId}/real-time:
 *   get:
 *     summary: Get real-time metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Real-time metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RealTimeMetrics'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/real-time', analyticsController.getRealTimeMetrics);

/**
 * @swagger
 * /api/analytics/{businessId}/predictive-insights:
 *   get:
 *     summary: Get predictive insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Predictive insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PredictiveInsights'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/predictive-insights', analyticsController.getPredictiveInsights);

/**
 * @swagger
 * /api/analytics/{businessId}/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period for export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/:businessId/export', analyticsController.exportAnalyticsData);

export default router;
