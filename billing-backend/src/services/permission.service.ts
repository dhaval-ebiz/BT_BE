import { db } from '../config/database';
import { 
  retailBusinesses, 
  businessStaff,
  permissions,
  userPermissionOverrides,
  users
} from '../models/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
// import { AuditService } from './audit.service';

// const auditService = new AuditService();

// Define permission parts to construct Permission string type
export const PERMISSIONS = {
  // Customer Management
  CUSTOMER_CREATE: 'CUSTOMER_CREATE',
  CUSTOMER_READ: 'CUSTOMER_READ',
  CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  CUSTOMER_DELETE: 'CUSTOMER_DELETE',
  
  // Product Management
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_READ: 'PRODUCT_READ',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  
  // Billing
  BILL_CREATE: 'BILL_CREATE',
  BILL_READ: 'BILL_READ',
  BILL_UPDATE: 'BILL_UPDATE',
  BILL_DELETE: 'BILL_DELETE',
  BILL_APPROVE: 'BILL_APPROVE',
  
  // Payments
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PAYMENT_READ: 'PAYMENT_READ',
  PAYMENT_UPDATE: 'PAYMENT_UPDATE',
  PAYMENT_DELETE: 'PAYMENT_DELETE',
  
  // Money Management
  MONEY_DEPOSIT: 'MONEY_DEPOSIT',
  MONEY_WITHDRAW: 'MONEY_WITHDRAW',
  MONEY_TRANSFER: 'MONEY_TRANSFER',
  
  // Analytics
  ANALYTICS_READ: 'ANALYTICS_READ',
  
  // User Management
  USER_CREATE: 'USER_CREATE',
  USER_READ: 'USER_READ',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  
  // Business Settings
  BUSINESS_UPDATE: 'BUSINESS_UPDATE',
  
  // AI Features
  AI_BANNER_GENERATE: 'AI_BANNER_GENERATE',
  AI_TEXT_TO_SQL: 'AI_TEXT_TO_SQL',
  
  // File Management
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DELETE: 'FILE_DELETE',
  
  // QR Code Management
  QR_GENERATE: 'QR_GENERATE',
  QR_READ: 'QR_READ',
  QR_DELETE: 'QR_DELETE',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Helper to map permission string to Resource & Action enums
function parsePermission(permission: Permission): { 
  resource: 'DASHBOARD' | 'CUSTOMERS' | 'MERCHANTS' | 'PRODUCTS' | 'BILLS' | 'PAYMENTS' | 'REPORTS' | 'SETTINGS' | 'USERS' | 'ROLES' | 'MESSAGES' | 'AI_FEATURES' | 'ANALYTICS' | 'MONEY_MANAGEMENT' | 'INVENTORY' | 'APPROVALS' | 'AUDIT_LOGS';
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'MANAGE' | 'VOID';
} | null {
  const parts = permission.split('_');
  const action = parts.pop();
  const resource = parts.join('_');
  
  if (!action) {
    return null;
  }
  
  // Mapping logic - this needs to align with DB Enums
  // permissionResourceEnum: ['DASHBOARD', 'CUSTOMERS', 'MERCHANTS', 'PRODUCTS', 'BILLS', 'PAYMENTS', 'REPORTS', 'SETTINGS', 'USERS', 'ROLES', 'MESSAGES', 'AI_FEATURES', 'ANALYTICS', 'MONEY_MANAGEMENT', 'INVENTORY', 'APPROVALS', 'AUDIT_LOGS']
  // permissionActionEnum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'MANAGE', 'VOID']
  
  // Adjust mappings where strictly necessary
  let mappedResource: 'DASHBOARD' | 'CUSTOMERS' | 'MERCHANTS' | 'PRODUCTS' | 'BILLS' | 'PAYMENTS' | 'REPORTS' | 'SETTINGS' | 'USERS' | 'ROLES' | 'MESSAGES' | 'AI_FEATURES' | 'ANALYTICS' | 'MONEY_MANAGEMENT' | 'INVENTORY' | 'APPROVALS' | 'AUDIT_LOGS' = 'SETTINGS';
  
  if (resource === 'CUSTOMER') mappedResource = 'CUSTOMERS';
  else if (resource === 'PRODUCT') mappedResource = 'PRODUCTS';
  else if (resource === 'BILL') mappedResource = 'BILLS';
  else if (resource === 'PAYMENT') mappedResource = 'PAYMENTS';
  else if (resource === 'USER') mappedResource = 'USERS';
  else if (resource === 'BUSINESS') mappedResource = 'SETTINGS'; // BUSINESS_UPDATE -> SETTINGS_UPDATE
  else if (resource === 'AI_BANNER' || resource === 'AI_TEXT_TO') mappedResource = 'AI_FEATURES';
  else if (resource === 'FILE') mappedResource = 'SETTINGS'; // or default to generic
  else if (resource === 'QR') mappedResource = 'PRODUCTS'; // or similar
  else if (['DASHBOARD', 'CUSTOMERS', 'MERCHANTS', 'PRODUCTS', 'BILLS', 'PAYMENTS', 'REPORTS', 'SETTINGS', 'USERS', 'ROLES', 'MESSAGES', 'AI_FEATURES', 'ANALYTICS', 'MONEY_MANAGEMENT', 'INVENTORY', 'APPROVALS', 'AUDIT_LOGS'].includes(resource)) {
    mappedResource = resource as typeof mappedResource;
  }
  
  const mappedAction = action as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'MANAGE' | 'VOID';
  
  // Simple check if it might be valid (runtime check helps)
  return { resource: mappedResource, action: mappedAction };
}

export class PermissionService {
  
  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string, 
    businessId: string, 
    permission: Permission
  ): Promise<boolean> {
    try {
      // 1. Check for Overrides
      const parsed = parsePermission(permission);
      if (!parsed) return false;

      const [override] = await db
        .select()
        .from(userPermissionOverrides)
        .where(and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.businessId, businessId),
          eq(userPermissionOverrides.resource, parsed.resource),
          eq(userPermissionOverrides.action, parsed.action)
        ))
        .limit(1);

      if (override) {
        // Check expiration
        if (override.expiresAt && override.expiresAt < new Date()) {
          // Expired, ignore override (or strictly should delete/invalidate)
        } else {
           return override.isAllowed;
        }
      }

      // 2. Check Role (via Staff)
      const [staff] = await db
        .select()
        .from(businessStaff)
        .where(and(
          eq(businessStaff.userId, userId),
          eq(businessStaff.businessId, businessId),
          eq(businessStaff.isActive, true)
        ))
        .limit(1);

      if (!staff) {
        // Check if Owner
        const [business] = await db
          .select()
          .from(retailBusinesses)
          .where(eq(retailBusinesses.id, businessId))
          .limit(1);
        
        if (business && business.ownerId === userId) return true;
        
        return false;
      }

      // If user has a roleId
      if (staff.roleId) {
        // Check permissions table
        const [perm] = await db
          .select()
          .from(permissions)
          .where(and(
            eq(permissions.roleId, staff.roleId),
            eq(permissions.resource, parsed.resource),
            eq(permissions.action, parsed.action),
            eq(permissions.isAllowed, true)
          ))
          .limit(1);
          
        if (perm) return true;
      }
      
      // Fallback to legacy boolean flags (backward compatibility)
      if (permission === 'BILL_CREATE' && staff.canCreateBills) return true;
      if (permission === 'BILL_APPROVE' && staff.canApproveBills) return true;
      if ((permission === 'MONEY_DEPOSIT' || permission === 'MONEY_WITHDRAW') && staff.canManageMoney) return true;
      if (permission === 'ANALYTICS_READ' && staff.canAccessReports) return true;
      if ((permission === 'PRODUCT_CREATE' || permission === 'PRODUCT_UPDATE') && staff.canManageInventory) return true;
      if ((permission === 'CUSTOMER_CREATE' || permission === 'CUSTOMER_UPDATE') && staff.canManageCustomers) return true;

      return false;
    } catch (error) {
      logger.error('Error checking permission', { error, userId, businessId, permission });
      return false;
    }
  }

  /**
   * Check multiple permissions
   */
  async hasPermissions(userId: string, businessId: string, perms: Permission[]): Promise<boolean> {
    const results = await Promise.all(perms.map(p => this.hasPermission(userId, businessId, p)));
    return results.every(Boolean);
  }

  /**
   * Get all effective permissions for a user in a business
   */
  async getUserPermissions(userId: string, businessId: string): Promise<string[]> {
    try {
      const effectivePermissions = new Set<string>();

      // 0. Check Owner first (Always has full access)
      const [business] = await db
        .select()
        .from(retailBusinesses)
        .where(eq(retailBusinesses.id, businessId))
        .limit(1);

      if (business && business.ownerId === userId) {
        return Object.values(PERMISSIONS);
      }

      // 1. Get User Role
      const [staff] = await db
        .select()
        .from(businessStaff)
        .where(and(
          eq(businessStaff.userId, userId),
          eq(businessStaff.businessId, businessId),
          eq(businessStaff.isActive, true)
        ))
        .limit(1);

      if (!staff) {
          return [];
      }

      // 2. Add Role Permissions
      if (staff.roleId) {
        const rolePerms = await db
          .select()
          .from(permissions)
          .where(and(
            eq(permissions.roleId, staff.roleId),
            eq(permissions.isAllowed, true)
          ));
        
        // Map back to Permission strings (This is tricky as we store RESOURCE + ACTION)
        // We need to reverse map or constructing strings: RESOURCE_ACTION
        rolePerms.forEach(p => {
           // Construct potential permission string
           // Note: This is an approximation if RESOURCE/ACTION don't strictly match 1:1 with PERMISSIONS keys.
           // However, for UI/Auth checks, we often need the exact string.
           // Let's iterate PERMISSIONS to match resource/action?
           // OR just use "RESOURCE_ACTION" convention.
           const permString = `${p.resource}_${p.action}`;
           effectivePermissions.add(permString); 
        });
      }

      // 3. Apply Overrides
      const overrides = await db
        .select()
        .from(userPermissionOverrides)
        .where(and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.businessId, businessId)
        ));

      overrides.forEach(o => {
          if (o.expiresAt && o.expiresAt < new Date()) return;
          const permString = `${o.resource}_${o.action}`;
          if (o.isAllowed) {
              effectivePermissions.add(permString);
          } else {
              effectivePermissions.delete(permString);
          }
      });

      // 4. Legacy Flags (Backwards Compatibility)
      if (staff.canCreateBills) effectivePermissions.add('BILL_CREATE');
      if (staff.canApproveBills) effectivePermissions.add('BILL_APPROVE');
      if (staff.canManageMoney) {
          effectivePermissions.add('MONEY_DEPOSIT');
          effectivePermissions.add('MONEY_WITHDRAW');
      }
      if (staff.canAccessReports) effectivePermissions.add('ANALYTICS_READ');
      if (staff.canManageInventory) {
          effectivePermissions.add('PRODUCT_CREATE');
          effectivePermissions.add('PRODUCT_UPDATE');
      }
      if (staff.canManageCustomers) {
          effectivePermissions.add('CUSTOMER_CREATE');
          effectivePermissions.add('CUSTOMER_UPDATE');
      }

      return Array.from(effectivePermissions);

    } catch (error) {
      logger.error('Error fetching user permissions', { error, userId, businessId });
      return [];
    }
  }

  async getPermissionMatrix(): Promise<typeof PERMISSIONS> {
    return PERMISSIONS;
  }

  async assignStaffRole(
    businessId: string, 
    _ownerId: string, 
    userId: string, 
    _role: string, 
    _permissions?: string[]
  ): Promise<unknown> {
      // Basic implementation to satisfy interface
      // In a real app, this would validate ownership and update roles
      const [staff] = await db.select().from(businessStaff).where(and(
          eq(businessStaff.businessId, businessId),
          eq(businessStaff.userId, userId)
      ));
      
      if (!staff) throw new Error("Staff member not found");

      // TODO: Map string role to roleId or legacy flags
      
      return staff;
  }

  async removeStaffMember(businessId: string, _ownerId: string, userId: string): Promise<unknown> {
      return db.delete(businessStaff).where(and(
          eq(businessStaff.businessId, businessId),
          eq(businessStaff.userId, userId)
      )).returning();
  }

  async getBusinessStaff(businessId: string, _ownerId: string): Promise<unknown[]> {
      const staff = await db
          .select({
              userId: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              role: users.role, // User system role
              position: businessStaff.position,
              joinedAt: businessStaff.joinedAt,
              isActive: businessStaff.isActive
          })
          .from(businessStaff)
          .leftJoin(users, eq(businessStaff.userId, users.id))
          .where(eq(businessStaff.businessId, businessId));
          
      return staff;
  }

  validatePermissions(permissions: string[]): string[] {
      const validPermissions = Object.values(PERMISSIONS);
      return permissions.filter(p => (validPermissions as string[]).includes(p));
  }
}
