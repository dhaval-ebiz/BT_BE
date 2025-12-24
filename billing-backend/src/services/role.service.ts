import { db } from '../config/database';
import { roles, permissions, businessStaff } from '../models/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export class RoleService {
  /**
   * Create a new custom role for a business
   */
  async createRole(
    businessId: string,
    userId: string, // User performing the action
    name: string,
    description: string,
    rolePermissions: { resource: string; action: string; conditions?: any }[]
  ) {
    try {
      // Create role
      const [newRole] = await db
        .insert(roles)
        .values({
          businessId,
          name: name.toUpperCase().replace(/\s+/g, '_'),
          displayName: name,
          description,
          isSystem: false,
          isActive: true
        })
        .returning();

      // Add permissions
      if (rolePermissions.length > 0) {
        await db.insert(permissions).values(
          rolePermissions.map((p) => ({
            roleId: newRole.id,
            resource: p.resource as any,
            action: p.action as any,
            conditions: p.conditions,
            isAllowed: true
          }))
        );
      }

      await auditService.logBusinessAction('CREATE_ROLE', businessId, userId, newRole.id, null, { name, permissions: rolePermissions });
      
      return newRole;
    } catch (error) {
      logger.error('Error creating role', { error, businessId, name });
      throw error;
    }
  }

  /**
   * Get all roles for a business
   */
  async getRoles(businessId: string) {
    try {
      const businessRoles = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.businessId, businessId),
            eq(roles.isActive, true)
          )
        )
        .orderBy(desc(roles.createdAt));

      // Also fetch system roles? 
      // Current design: system roles might have businessId = null
      const systemRoles = await db
        .select()
        .from(roles)
        .where(and(eq(roles.isSystem, true), eq(roles.isActive, true)));

      return [...systemRoles, ...businessRoles];
    } catch (error) {
      logger.error('Error fetching roles', { error, businessId });
      throw error;
    }
  }

  /**
   * Get role details with permissions
   */
  async getRoleDetails(roleId: string) {
    try {
      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (!role) {
        throw new Error('Role not found');
      }

      const rolePerms = await db
        .select()
        .from(permissions)
        .where(eq(permissions.roleId, roleId));

      return { ...role, permissions: rolePerms };
    } catch (error) {
      logger.error('Error fetching role details', { error, roleId });
      throw error;
    }
  }

  /**
   * Update a role and its permissions
   */
  async updateRole(
    businessId: string,
    userId: string,
    roleId: string,
    params: {
        name?: string;
        description?: string;
        permissions?: { resource: string; action: string; conditions?: any }[];
    }
  ) {
    try {
      const [existingRole] = await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.businessId, businessId)))
        .limit(1);

      if (!existingRole) {
          throw new Error('Role not found or cannot be modified');
      }

      if (existingRole.isSystem) {
          throw new Error('System roles cannot be modified');
      }

      // Update role details
      if (params.name || params.description) {
          await db
            .update(roles)
            .set({
                name: params.name ? params.name.toUpperCase().replace(/\s+/g, '_') : undefined,
                displayName: params.name,
                description: params.description,
                updatedAt: new Date()
            })
            .where(eq(roles.id, roleId));
      }

      // Update permissions (replace all)
      if (params.permissions) {
          // Delete existing
          await db
            .delete(permissions)
            .where(eq(permissions.roleId, roleId));
        
          // Insert new
          if (params.permissions.length > 0) {
            await db.insert(permissions).values(
                params.permissions.map((p) => ({
                    roleId: roleId,
                    resource: p.resource as any,
                    action: p.action as any,
                    conditions: p.conditions,
                    isAllowed: true
                }))
            );
          }
      }

      await auditService.logBusinessAction('UPDATE_ROLE', businessId, userId, roleId, existingRole, params);

      return this.getRoleDetails(roleId);
    } catch (error) {
        logger.error('Error updating role', { error, businessId, roleId });
        throw error;
    }
  }

  /**
   * Delete a custom role
   */
  async deleteRole(businessId: string, userId: string, roleId: string) {
      try {
        const [existingRole] = await db
            .select()
            .from(roles)
            .where(and(eq(roles.id, roleId), eq(roles.businessId, businessId)))
            .limit(1);

        if (!existingRole) {
            throw new Error('Role not found');
        }

        if (existingRole.isSystem) {
            throw new Error('System roles cannot be deleted');
        }

        // Check if assigned to any staff
        const assignedStaff = await db
            .select()
            .from(businessStaff)
            .where(eq(businessStaff.roleId, roleId))
            .limit(1);
        
        if (assignedStaff.length > 0) {
            throw new Error('Cannot delete role that is assigned to staff members');
        }

        // Soft delete
        await db
            .update(roles)
            .set({ isActive: false, name: `${existingRole.name}_DELETED_${Date.now()}` })
            .where(eq(roles.id, roleId));

        await auditService.logBusinessAction('DELETE_ROLE', businessId, userId, roleId, existingRole, { isActive: false });
        
        return { message: 'Role deleted successfully' };
      } catch (error) {
        logger.error('Error deleting role', { error, businessId, roleId });
        throw error;
      }
  }
}
