import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authenticateToken, authorizeBusinessAccess, authorizeRole } from '../middleware/auth.middleware';

const router = Router();
const permissionController = new PermissionController();

// All permission routes require authentication and business access
router.use(authenticateToken);
router.use('/:businessId', authorizeBusinessAccess);

/**
 * @swagger
 * /api/permissions/{businessId}/my-permissions:
 *   get:
 *     summary: Get current user's permissions
 *     tags: [Permissions]
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
 *         description: User permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     role:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/my-permissions', permissionController.getMyPermissions);

/**
 * @swagger
 * /api/permissions/{businessId}/check:
 *   get:
 *     summary: Check specific permission
 *     tags: [Permissions]
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
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission to check
 *     responses:
 *       200:
 *         description: Permission check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     permission:
 *                       type: string
 *                     hasPermission:
 *                       type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/check', permissionController.checkPermission);

/**
 * @swagger
 * /api/permissions/matrix:
 *   get:
 *     summary: Get permission matrix
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission matrix retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: object
 *                     rolePermissions:
 *                       type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/matrix', permissionController.getPermissionMatrix);

/**
 * @swagger
 * /api/permissions/{businessId}/staff/assign-role:
 *   post:
 *     summary: Assign role to staff member
 *     tags: [Permissions]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to assign role to
 *               role:
 *                 type: string
 *                 enum: [MANAGER, CASHIER, VIEWER]
 *                 description: Role to assign
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional custom permissions
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/:businessId/staff/assign-role', 
  authorizeRole(['RETAIL_OWNER', 'SUPER_ADMIN']), 
  permissionController.assignStaffRole
);

/**
 * @swagger
 * /api/permissions/{businessId}/staff/remove:
 *   post:
 *     summary: Remove staff member
 *     tags: [Permissions]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to remove
 *     responses:
 *       200:
 *         description: Staff member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/:businessId/staff/remove', 
  authorizeRole(['RETAIL_OWNER', 'SUPER_ADMIN']), 
  permissionController.removeStaffMember
);

/**
 * @swagger
 * /api/permissions/{businessId}/staff:
 *   get:
 *     summary: Get business staff members
 *     tags: [Permissions]
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
 *         description: Business staff retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/:businessId/staff', 
  authorizeRole(['RETAIL_OWNER', 'SUPER_ADMIN']), 
  permissionController.getBusinessStaff
);

/**
 * @swagger
 * /api/permissions/validate:
 *   post:
 *     summary: Validate permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Permissions to validate
 *     responses:
 *       200:
 *         description: Permissions validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     validPermissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     invalidPermissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/validate', permissionController.validatePermissions);

export default router;
