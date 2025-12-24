import { db } from '../config/database';
import { auditLogs } from '../models/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/common';

export interface AuditLogData {
  businessId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async logAction(data: AuditLogData): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        businessId: data.businessId,
        userId: data.userId,
        // Since actionType is required in schema but not in AuditLogData interface (legacy/refactor issue),
        // we map action to actionType or use a default if strict mapping isn't ready.
        // Assuming action corresponds to actionType enum or similar.
        // Schema says: action varchar(100), actionType varchar(50)
        action: data.action,
        actionType: (data.action.split('_')[0] || 'GENERAL').toUpperCase().substring(0, 50),
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: data.oldValues,
        newValues: data.newValues,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    } catch (error) {
      logger.error('Failed to log audit action', { error, data });
      // Don't throw, audit logging shouldn't break main flow
    }
  }

  async getAuditLogs(
    businessId?: string,
    userId?: string,
    entityType?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: typeof auditLogs.$inferSelect[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const conditions = [];

    if (businessId) conditions.push(eq(auditLogs.businessId, businessId));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (startDate) conditions.push(sql`${auditLogs.createdAt} >= ${startDate}`);
    if (endDate) conditions.push(sql`${auditLogs.createdAt} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(countResult?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const offset = (page - 1) * limit;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getEntityHistory(
    entityType: string,
    entityId: string,
    businessId?: string
  ): Promise<typeof auditLogs.$inferSelect[]> {
    const conditions = [
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId)
    ];

    if (businessId) {
      conditions.push(eq(auditLogs.businessId, businessId));
    }

    const whereClause = and(...conditions);

    return await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt));
  }

  async getUserActivity(
    userId: string,
    businessId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: typeof auditLogs.$inferSelect[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const conditions = [eq(auditLogs.userId, userId)];

    if (businessId) {
      conditions.push(eq(auditLogs.businessId, businessId));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(countResult?.count || 0);
    const totalPages = Math.ceil(total / limit);

    const offset = (page - 1) * limit;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // Helper methods for common audit actions
  async logCustomerAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW',
    businessId: string,
    userId: string,
    customerId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'CUSTOMER',
      entityId: customerId,
      oldValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logBillAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'SEND' | 'PAY' | 'SUBMIT_FOR_APPROVAL' | 'APPROVE_BILL' | 'REJECT_BILL',
    businessId: string,
    userId: string,
    billId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    notes?: string,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'BILL',
      entityId: billId,
      oldValues,
      newValues: notes ? { ...newValues, notes } : newValues,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logBusinessAction(
    action: string,
    businessId: string,
    userId: string,
    targetId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
     await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'BUSINESS',
      entityId: targetId,
      oldValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logProductAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'STOCK_ADJUST',
    businessId: string,
    userId: string,
    productId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'PRODUCT',
      entityId: productId,
      oldValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logPaymentAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'REFUND',
    businessId: string,
    userId: string,
    paymentId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'PAYMENT',
      entityId: paymentId,
      oldValues,
      newValues,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logAuthAction(
    action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET' | 'ACCOUNT_LOCKED',
    userId: string,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      userId,
      action,
      entityType: 'AUTH',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logAIAction(
    action: 'BANNER_GENERATE' | 'SQL_GENERATE' | 'TEXT_GENERATE',
    businessId: string,
    userId: string,
    prompt: string,
    result?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'AI',
      oldValues: { prompt },
      newValues: { result },
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logFileAction(
    action: 'UPLOAD' | 'DELETE' | 'VIEW',
    businessId: string,
    userId: string,
    fileName: string,
    fileType: string,
    metadata?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action,
      entityType: 'FILE',
      entityId: fileName,
      newValues: { fileType },
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }

  async logSecurityEvent(
    event: 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED',
    businessId?: string,
    userId?: string,
    details?: Record<string, unknown>,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await this.logAction({
      businessId,
      userId,
      action: event,
      entityType: 'SECURITY',
      newValues: details,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });
  }
}