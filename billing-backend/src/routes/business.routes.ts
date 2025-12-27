import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { 
  authenticateToken,
  authorizeBusinessAccess 
} from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { createBusinessSchema, updateBusinessSchema, businessSettingsSchema } from '../schemas/business.schema';

const router = Router();
const businessController = new BusinessController();

/**
 * @swagger
 * /api/business:
 *   get:
 *     summary: Get all businesses for the authenticated user
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of businesses
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, businessController.getBusinesses);

/**
 * @swagger
 * /api/business:
 *   post:
 *     summary: Create a new business
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Business'
 *     responses:
 *       201:
 *         description: Business created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, validateBody(createBusinessSchema), businessController.createBusiness);

/**
 * @swagger
 * /api/business/{businessId}:
 *   get:
 *     summary: Get business by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Business details
 *       404:
 *         description: Business not found
 */
router.get('/:businessId', authenticateToken, authorizeBusinessAccess, businessController.getBusiness);

/**
 * @swagger
 * /api/business/{businessId}:
 *   put:
 *     summary: Update business
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Business'
 *     responses:
 *       200:
 *         description: Business updated successfully
 *       404:
 *         description: Business not found
 */
router.put('/:businessId', authenticateToken, authorizeBusinessAccess, validateBody(updateBusinessSchema), businessController.updateBusiness);

// Onboarding progress
router.get('/:businessId/onboarding-status', authenticateToken, authorizeBusinessAccess, (req, res) => businessController.getOnboardingStatus(req, res));

/**
 * @swagger
 * /api/business/{businessId}/settings:
 *   get:
 *     summary: Get business settings
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Business settings
 */
router.get('/:businessId/settings', authenticateToken, authorizeBusinessAccess, businessController.getSettings);

/**
 * @swagger
 * /api/business/{businessId}/settings:
 *   put:
 *     summary: Update business settings
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusinessSettings'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/:businessId/settings', authenticateToken, authorizeBusinessAccess, validateBody(businessSettingsSchema), businessController.updateSettings);

/**
 * @swagger
 * /api/business/{businessId}/staff:
 *   get:
 *     summary: Get business staff members
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of staff members
 */
router.get('/:businessId/staff', authenticateToken, authorizeBusinessAccess, businessController.getStaff);

/**
 * @swagger
 * /api/business/{businessId}/staff/invite:
 *   post:
 *     summary: Invite staff member
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [MANAGER, CASHIER, VIEWER]
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Staff member invited successfully
 */
router.post('/:businessId/staff/invite', authenticateToken, authorizeBusinessAccess, businessController.inviteStaff);

/**
 * @swagger
 * /api/business/{businessId}/staff/{userId}:
 *   put:
 *     summary: Update staff member
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [MANAGER, CASHIER, VIEWER]
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 */
router.put('/:businessId/staff/:userId', authenticateToken, authorizeBusinessAccess, businessController.updateStaffRole);

/**
 * @swagger
 * /api/business/{businessId}/staff/{userId}:
 *   delete:
 *     summary: Remove staff member
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff member removed successfully
 */
router.delete('/:businessId/staff/:userId', authenticateToken, authorizeBusinessAccess, businessController.removeStaff);


// ... existing exports ...

// ==================== ROLE ROUTES ====================

import { RoleController } from '../controllers/role.controller';
const roleController = new RoleController();

/**
 * @swagger
 * /api/business/{businessId}/roles:
 *   get:
 *     summary: Get all roles for a business
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/:businessId/roles', authenticateToken, authorizeBusinessAccess, roleController.getRoles);

/**
 * @swagger
 * /api/business/{businessId}/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     resource:
 *                       type: string
 *                     action:
 *                       type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 */
router.post('/:businessId/roles', authenticateToken, authorizeBusinessAccess, roleController.createRole);

/**
 * @swagger
 * /api/business/{businessId}/roles/{roleId}:
 *   get:
 *     summary: Get role details
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role details
 */
router.get('/:businessId/roles/:roleId', authenticateToken, authorizeBusinessAccess, roleController.getRoleDetails);

/**
 * @swagger
 * /api/business/{businessId}/roles/{roleId}:
 *   put:
 *     summary: Update role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.put('/:businessId/roles/:roleId', authenticateToken, authorizeBusinessAccess, roleController.updateRole);

/**
 * @swagger
 * /api/business/{businessId}/roles/{roleId}:
 *   delete:
 *     summary: Delete role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted successfully
 */
router.delete('/:businessId/roles/:roleId', authenticateToken, authorizeBusinessAccess, roleController.deleteRole);

/**
 * @swagger
 * /api/business/{businessId}/permissions/definitions:
 *   get:
 *     summary: Get available permission definitions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Permission definitions
 */
router.get('/:businessId/permissions/definitions', authenticateToken, authorizeBusinessAccess, roleController.getPermissionDefinitions);

export { router as businessRoutes };