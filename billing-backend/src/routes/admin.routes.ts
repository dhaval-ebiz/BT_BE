import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken, authorizeSuperAdmin } from '../middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

// All admin routes require authentication and super admin role
router.use(authenticateToken);
router.use(authorizeSuperAdmin);

// ==================== PLATFORM DASHBOARD ====================

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get platform dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics
 */
router.get('/dashboard', (req, res) => adminController.getDashboardStats(req, res));

// ==================== BUSINESS MANAGEMENT ====================

/**
 * @swagger
 * /api/admin/businesses:
 *   get:
 *     summary: Get all businesses with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of businesses
 */
router.get('/businesses', (req, res) => adminController.getBusinesses(req, res));

/**
 * @swagger
 * /api/admin/businesses/{businessId}:
 *   get:
 *     summary: Get business details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Business details
 */
router.get('/businesses/:businessId', (req, res) => adminController.getBusiness(req, res));

/**
 * @swagger
 * /api/admin/businesses/{businessId}/suspend:
 *   post:
 *     summary: Suspend a business
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Business suspended
 */
router.post('/businesses/:businessId/suspend', (req, res) => adminController.suspendBusiness(req, res));

/**
 * @swagger
 * /api/admin/businesses/{businessId}/activate:
 *   post:
 *     summary: Activate a business
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Business activated
 */
router.post('/businesses/:businessId/activate', (req, res) => adminController.activateBusiness(req, res));

/**
 * @swagger
 * /api/admin/businesses/{businessId}/impersonate:
 *   post:
 *     summary: Impersonate a business (super admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 default: 3600
 *     responses:
 *       200:
 *         description: Impersonation token generated
 */
router.post('/businesses/:businessId/impersonate', (req, res) => adminController.impersonateBusiness(req, res));

// ==================== USER MANAGEMENT ====================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', (req, res) => adminController.getUsers(req, res));

/**
 * @swagger
 * /api/admin/users/{userId}/suspend:
 *   post:
 *     summary: Suspend a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User suspended
 */
router.post('/users/:userId/suspend', (req, res) => adminController.suspendUser(req, res));

/**
 * @swagger
 * /api/admin/users/{userId}/activate:
 *   post:
 *     summary: Activate a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated
 */
router.post('/users/:userId/activate', (req, res) => adminController.activateUser(req, res));

// ==================== PLATFORM ANALYTICS ====================

/**
 * @swagger
 * /api/admin/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Revenue analytics
 */
router.get('/analytics/revenue', (req, res) => adminController.getRevenueAnalytics(req, res));

/**
 * @swagger
 * /api/admin/analytics/users:
 *   get:
 *     summary: Get user growth metrics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: User growth metrics
 */
router.get('/analytics/users', (req, res) => adminController.getUserGrowthMetrics(req, res));

/**
 * @swagger
 * /api/admin/analytics/features:
 *   get:
 *     summary: Get feature usage analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feature usage analytics
 */
router.get('/analytics/features', (req, res) => adminController.getFeatureUsageAnalytics(req, res));

/**
 * @swagger
 * /api/admin/analytics/top-businesses:
 *   get:
 *     summary: Get top businesses by revenue
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top businesses
 */
router.get('/analytics/top-businesses', (req, res) => adminController.getTopBusinesses(req, res));

/**
 * @swagger
 * /api/admin/analytics/churn:
 *   get:
 *     summary: Get churn analysis
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Churn analysis
 */
router.get('/analytics/churn', (req, res) => adminController.getChurnAnalysis(req, res));

// ==================== BROADCAST NOTIFICATIONS ====================

/**
 * @swagger
 * /api/admin/notifications/broadcast:
 *   post:
 *     summary: Broadcast notification to businesses
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target
 *               - message
 *             properties:
 *               target:
 *                 type: string
 *                 enum: [ALL, ACTIVE, INACTIVE, TRIAL]
 *               message:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Broadcast queued successfully
 */
router.post('/notifications/broadcast', (req, res) => adminController.broadcastNotification(req, res));

export { router as adminRoutes };
