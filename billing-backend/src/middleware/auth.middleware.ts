import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { users, businessStaff, retailBusinesses } from '../models/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, JWTPayload } from '../types/common';
import { PermissionService, Permission } from '../services/permission.service';

export interface BusinessRequest extends AuthenticatedRequest {
  business?: {
    id: string;
    name: string;
    ownerId: string;
  };
}

const permissionService = new PermissionService();

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    if (!decoded.userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
      return;
    }
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Account is not active',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to authorize super admin access
 * Super admins have platform-wide access to all businesses and system features
 */
export const authorizeSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
    return;
  }

  next();
};

export const authorizeBusinessAccess = async (
  req: BusinessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = req.params as Record<string, string>;
    const body = req.body as Record<string, string>;
    const query = req.query as Record<string, string>;
    const businessId = params.businessId || body.businessId || query.businessId;
    
    if (!businessId) {
      res.status(400).json({
        success: false,
        message: 'Business ID is required',
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Super admin can access any business
    if (req.user.role === 'SUPER_ADMIN') {
      req.business = { 
        id: businessId,
        name: '',
        ownerId: ''
      };
      // Super admin implicitly has all permissions? 
      // Ideally yes, but for now we might leave it undefined or fetch all.
      // Let's assume Resource Auth handles Super Admin bypass separately (it does).
      return next();
    }

    // Check if user is owner of the business
    const [business] = await db
      .select()
      .from(retailBusinesses)
      .where(eq(retailBusinesses.id, businessId))
      .limit(1);

    if (!business) {
      res.status(404).json({
        success: false,
        message: 'Business not found',
      });
      return;
    }

    if (business.ownerId === req.user.id) {
      req.business = {
        id: business.id,
        name: business.name,
        ownerId: business.ownerId
      };
      req.user.businessId = businessId;
      
      // Fetch permissions for Owner (likely ALL permissions)
      try {
        req.user.permissions = await permissionService.getUserPermissions(req.user.id, businessId);
      } catch (permError) {
        logger.error('Failed to load owner permissions', { error: permError });
        res.status(500).json({ success: false, message: 'Authorization error' });
        return;
      }
      
      return next();
    }

    // Check if user is staff member of the business
    const [staffMember] = await db
      .select()
      .from(businessStaff)
      .where(
        and(
          eq(businessStaff.businessId, businessId),
          eq(businessStaff.userId, req.user.id),
          eq(businessStaff.isActive, true)
        )
      )
      .limit(1);

    if (!staffMember) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to access this business.',
      });
      return;
    }

    req.business = {
      id: business.id,
      name: business.name,
      ownerId: business.ownerId
    };
    req.user.businessId = businessId;

    // Fetch permissions for Staff
    try {
      req.user.permissions = await permissionService.getUserPermissions(req.user.id, businessId);
    } catch (permError) {
        logger.error('Failed to load staff permissions', { error: permError });
        res.status(500).json({ success: false, message: 'Authorization error' });
        return;
    }

    next();
  } catch (error) {
    logger.error('Business authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed',
    });
  }
};

export const authorizePermission = (resource: string, action: string) => {
  return async (req: BusinessRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!req.business?.id) {
       res.status(400).json({
         success: false,
         message: 'Business context required',
       });
       return;
    }

    try {
      const permission = `${resource}:${action}` as Permission;
      const hasAccess = await permissionService.hasPermission(
        req.user.id, 
        req.business.id, 
        permission
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${resource}:${action}`,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    if (!decoded.userId) {
      return next();
    }
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user && user.status === 'ACTIVE') {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

export const rateLimitByUser = (maxRequests: number, windowMs: number): ((req: AuthenticatedRequest, res: Response, next: NextFunction) => void) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip || 'unknown';
    const now = Date.now();
    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      if (userId !== 'unknown') {
        requests.set(userId, {
          count: 1,
          resetTime: now + windowMs,
        });
      }
      return next();
    }

    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
      return;
    }

    userRequests.count++;
    next();
  };
};