import { Response } from 'express';
import { BusinessRequest } from '../middleware/auth.middleware';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { z } from 'zod';

const roleService = new RoleService();
const permissionService = new PermissionService();

// Schemas
const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional().default(''),
  permissions: z.array(z.object({
    resource: z.string(),
    action: z.string(),
    conditions: z.any().optional()
  })).default([])
});

const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.object({
    resource: z.string(),
    action: z.string(),
    conditions: z.any().optional()
  })).optional()
});

export class RoleController {
  
  /**
   * Create a new custom role
   */
  async createRole(req: BusinessRequest, res: Response) {
    try {
      const businessId = req.business?.id || req.user?.businessId;
      const user = req.user;
      
      if (!businessId || !user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const input = createRoleSchema.parse(req.body);

      const role = await roleService.createRole(
        businessId,
        user.id,
        input.name,
        input.description,
        input.permissions
      );

      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating role', error: (error as Error).message });
    }
  }

  /**
   * Get all roles for a business
   */
  async getRoles(req: BusinessRequest, res: Response) {
    try {
      const businessId = req.business?.id || req.user?.businessId;
      if (!businessId) throw new Error('Business context required');
      if (!businessId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const roles = await roleService.getRoles(businessId);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching roles', error: (error as Error).message });
    }
  }

  /**
   * Get role details
   */
  async getRoleDetails(req: BusinessRequest, res: Response) {
    try {
      const { roleId } = req.params;
      const role = await roleService.getRoleDetails(roleId);
      res.json(role);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching role details', error: (error as Error).message });
    }
  }

  /**
   * Update a role
   */
  async updateRole(req: BusinessRequest, res: Response) {
    try {
      const businessId = req.business?.id || req.user?.businessId;
      const user = req.user;
      const { roleId } = req.params;
      
      if (!businessId || !user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const input = updateRoleSchema.parse(req.body);

      const updatedRole = await roleService.updateRole(
        businessId,
        user.id,
        roleId,
        input
      );

      res.json(updatedRole);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Error updating role', error: (error as Error).message });
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(req: BusinessRequest, res: Response) {
    try {
      const businessId = req.business?.id || req.user?.businessId;
      const user = req.user;
      const { roleId } = req.params;

      if (!businessId || !user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await roleService.deleteRole(businessId, user.id, roleId);
      res.json(result);
    } catch (error) {
       res.status(500).json({ message: 'Error deleting role', error: (error as Error).message });
    }
  }

  /**
   * Get available permission definitions
   */
  async getPermissionDefinitions(req: BusinessRequest, res: Response) {
      try {
          const matrix = permissionService.getPermissionMatrix();
          res.json(matrix);
      } catch (error) {
          res.status(500).json({ message: 'Error fetching permissions', error: (error as Error).message });
      }
  }
}
