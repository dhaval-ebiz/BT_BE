import { Response } from 'express';
import { PermissionService, PERMISSIONS, Permission } from '../services/permission.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/common';

const permissionService = new PermissionService();

// Validation schemas
const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['MANAGER', 'CASHIER', 'VIEWER']),
  permissions: z.array(z.string()).optional(),
});

const removeStaffSchema = z.object({
  userId: z.string().uuid(),
});

export class PermissionController {
  /**
   * Get current user's permissions
   */
  async getMyPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const userId = req.user.id;
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }

      const permissions = await permissionService.getUserPermissions(userId, businessId);

      res.json({
        success: true,
        data: {
          permissions,
          role: req.user.role,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting user permissions', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get user permissions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check specific permission
   */
  async checkPermission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const userId = req.user.id;
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      const { permission } = req.query;

      if (!permission || typeof permission !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Permission parameter is required',
        });
        return;
      }

      if (!Object.values(PERMISSIONS).includes(permission as Permission)) {
        res.status(400).json({
          success: false,
          message: 'Invalid permission value',
        });
        return;
      }

      const hasPermission = await permissionService.hasPermission(userId, businessId, permission as Permission);

      res.json({
        success: true,
        data: {
          permission,
          hasPermission,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error checking permission', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get permission matrix
   */
  async getPermissionMatrix(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const matrix = await permissionService.getPermissionMatrix();

      res.json({
        success: true,
        data: matrix,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting permission matrix', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get permission matrix',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Assign role to staff member
   */
  async assignStaffRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      const ownerId = req.user.id;
      const { userId, role, permissions } = assignRoleSchema.parse(req.body);

      const result = await permissionService.assignStaffRole(
        businessId,
        ownerId,
        userId,
        role,
        permissions
      );

      res.json({
        success: true,
        message: 'Role assigned successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error assigning staff role', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to assign role',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Remove staff member
   */
  async removeStaffMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      const ownerId = req.user.id;
      const { userId } = removeStaffSchema.parse(req.body);

      const result = await permissionService.removeStaffMember(businessId, ownerId, userId);

      res.json({
        success: true,
        message: 'Staff member removed successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error removing staff member', { error });
      res.status(400).json({
        success: false,
        message: 'Failed to remove staff member',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get business staff members
   */
  async getBusinessStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const { businessId } = req.params;
      if (!businessId) {
        res.status(400).json({ success: false, message: 'Business ID is required' });
        return;
      }
      const ownerId = req.user.id;

      const staff = await permissionService.getBusinessStaff(businessId, ownerId);

      res.json({
        success: true,
        data: staff,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting business staff', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get business staff',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate permissions
   */
  async validatePermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const body = req.body as { permissions?: unknown };
      const { permissions } = body;

      if (!Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          message: 'Permissions must be an array',
        });
        return;
      }

      const validPermissions = permissionService.validatePermissions(permissions as string[]);

      res.json({
        success: true,
        data: {
          validPermissions,
          invalidPermissions: (permissions as string[]).filter(p => !validPermissions.includes(p)),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error validating permissions', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to validate permissions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
