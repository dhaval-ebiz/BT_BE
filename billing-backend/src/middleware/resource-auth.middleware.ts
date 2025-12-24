import { Response, NextFunction } from 'express';
import { db } from '../config/database';
import { 
  customers, 
  merchants, 
  products, 
  bills, 
  payments
} from '../models/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { BusinessRequest } from './auth.middleware';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

const auditService = new AuditService();

export interface ResourceAuthOptions {
  resourceType: 'CUSTOMER' | 'MERCHANT' | 'PRODUCT' | 'BILL' | 'PAYMENT';
  resourceIdParam?: string;
  resourceIdBody?: string;
  allowSuperAdmin?: boolean;
  allowBusinessOwner?: boolean;
  requiredPermission?: string;
}

export function authorizeResourceAccess(options: ResourceAuthOptions) {
  return async (req: BusinessRequest, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params[options.resourceIdParam || 'id'] || 
                        req.body[options.resourceIdBody || 'id'];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: `${options.resourceType} ID is required`,
        });
      }

      if (!req.user || !req.business) {
        return res.status(401).json({
          success: false,
          message: 'Authentication and business authorization required',
        });
      }

      // Super admin bypass
      if (options.allowSuperAdmin && req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Business owner bypass
      if (options.allowBusinessOwner && req.user.role === 'RETAIL_OWNER') {
        return next();
      }

      // Check specific permissions for staff
      if (req.user.role === 'MANAGER' || req.user.role === 'CASHIER') {
        if (options.requiredPermission && !req.user.permissions?.includes(options.requiredPermission)) {
          // Log unauthorized access attempt
          await auditService.logSecurityEvent(
            'UNAUTHORIZED_ACCESS',
            req.business.id,
            req.user.id,
            {
              resourceType: options.resourceType,
              resourceId,
              requiredPermission: options.requiredPermission,
              userPermissions: req.user.permissions,
            },
            req
          );

          return res.status(403).json({
            success: false,
            message: `Access denied. Required permission: ${options.requiredPermission}`,
          });
        }
      }

      // Verify resource belongs to the business
      const hasAccess = await verifyResourceOwnership(
        options.resourceType,
        resourceId,
        req.business.id
      );

      if (!hasAccess) {
        // Log unauthorized access attempt
        await auditService.logSecurityEvent(
          'UNAUTHORIZED_ACCESS',
          req.business.id,
          req.user.id,
          {
            resourceType: options.resourceType,
            resourceId,
            reason: 'Resource does not belong to business',
          },
          req
        );

        return res.status(403).json({
          success: false,
          message: `Access denied. ${options.resourceType} not found or access restricted.`,
        });
      }

      next();
    } catch (error) {
      logger.error('Resource authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
}

async function verifyResourceOwnership(
  resourceType: string,
  resourceId: string,
  businessId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'CUSTOMER': {
        const [customer] = await db
          .select()
          .from(customers)
          .where(and(
            eq(customers.id, resourceId),
            eq(customers.businessId, businessId)
          ))
          .limit(1);
        return !!customer;
      }

      case 'MERCHANT': {
        const [merchant] = await db
          .select()
          .from(merchants)
          .where(and(
            eq(merchants.id, resourceId),
            eq(merchants.businessId, businessId)
          ))
          .limit(1);
        return !!merchant;
      }

      case 'PRODUCT': {
        const [product] = await db
          .select()
          .from(products)
          .where(and(
            eq(products.id, resourceId),
            eq(products.businessId, businessId)
          ))
          .limit(1);
        return !!product;
      }

      case 'BILL': {
        const [bill] = await db
          .select()
          .from(bills)
          .where(and(
            eq(bills.id, resourceId),
            eq(bills.businessId, businessId)
          ))
          .limit(1);
        return !!bill;
      }

      case 'PAYMENT': {
        const [payment] = await db
          .select()
          .from(payments)
          .where(and(
            eq(payments.id, resourceId),
            eq(payments.businessId, businessId)
          ))
          .limit(1);
        return !!payment;
      }

      default:
        return false;
    }
  } catch (error) {
    logger.error('Error verifying resource ownership:', error);
    return false;
  }
}

// Convenience middleware for common scenarios
export const authorizeCustomerAccess = (options?: { 
  allowSuperAdmin?: boolean;
  allowBusinessOwner?: boolean;
  requiredPermission?: string;
}) => {
  return authorizeResourceAccess({
    resourceType: 'CUSTOMER',
    allowSuperAdmin: options?.allowSuperAdmin,
    allowBusinessOwner: options?.allowBusinessOwner,
    requiredPermission: options?.requiredPermission || 'CUSTOMER_MANAGE',
  });
};

export const authorizeMerchantAccess = (options?: {
  allowSuperAdmin?: boolean;
  allowBusinessOwner?: boolean;
  requiredPermission?: string;
}) => {
  return authorizeResourceAccess({
    resourceType: 'MERCHANT',
    allowSuperAdmin: options?.allowSuperAdmin,
    allowBusinessOwner: options?.allowBusinessOwner,
    requiredPermission: options?.requiredPermission || 'MERCHANT_MANAGE',
  });
};

export const authorizeProductAccess = (options?: {
  allowSuperAdmin?: boolean;
  allowBusinessOwner?: boolean;
  requiredPermission?: string;
}) => {
  return authorizeResourceAccess({
    resourceType: 'PRODUCT',
    allowSuperAdmin: options?.allowSuperAdmin,
    allowBusinessOwner: options?.allowBusinessOwner,
    requiredPermission: options?.requiredPermission || 'PRODUCT_MANAGE',
  });
};

export const authorizeBillAccess = (options?: {
  allowSuperAdmin?: boolean;
  allowBusinessOwner?: boolean;
  requiredPermission?: string;
}) => {
  return authorizeResourceAccess({
    resourceType: 'BILL',
    allowSuperAdmin: options?.allowSuperAdmin,
    allowBusinessOwner: options?.allowBusinessOwner,
    requiredPermission: options?.requiredPermission || 'BILL_MANAGE',
  });
};

export const authorizePaymentAccess = (options?: {
  allowSuperAdmin?: boolean;
  allowBusinessOwner?: boolean;
  requiredPermission?: string;
}) => {
  return authorizeResourceAccess({
    resourceType: 'PAYMENT',
    allowSuperAdmin: options?.allowSuperAdmin,
    allowBusinessOwner: options?.allowBusinessOwner,
    requiredPermission: options?.requiredPermission || 'PAYMENT_MANAGE',
  });
};

// Middleware to check if user can access their own data
export function authorizeOwnDataAccess(req: BusinessRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const requestedUserId = req.params.userId || req.body.userId;

  if (!userId || !requestedUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  // Users can always access their own data
  if (userId === requestedUserId) {
    return next();
  }

  // Super admin can access any user data
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  // Business owners can access their staff data
  if (req.user?.role === 'RETAIL_OWNER' && req.business) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own data.',
  });
}