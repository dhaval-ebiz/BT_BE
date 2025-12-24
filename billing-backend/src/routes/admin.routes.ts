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

export { router as adminRoutes };
