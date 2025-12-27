import { db } from '../config/database';
import { users, retailBusinesses, bills, userStatusEnum } from '../models/drizzle/schema';
import { eq, and, sql, count, sum, desc, like, or } from 'drizzle-orm';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

type UserStatus = typeof userStatusEnum.enumValues[number];

export class AdminService {
  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(): Promise<{
    totalBusinesses: number;
    activeBusinesses: number;
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    monthlyRevenue: number;
  }> {
    // Total businesses
    const [totalBusinessesResult] = await db
      .select({ count: count() })
      .from(retailBusinesses);

    // Active businesses
    const [activeBusinessesResult] = await db
      .select({ count: count() })
      .from(retailBusinesses)
      .where(eq(retailBusinesses.isActive, true));

    // Total users
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    // Active users
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE' as UserStatus));

    // Total revenue (sum of all paid bills)
    const [totalRevenueResult] = await db
      .select({ total: sum(bills.totalAmount) })
      .from(bills)
      .where(eq(bills.status, 'PAID'));

    // Monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyRevenueResult] = await db
      .select({ total: sum(bills.totalAmount) })
      .from(bills)
      .where(and(
        eq(bills.status, 'PAID'),
        sql`${bills.billDate} >= ${startOfMonth.toISOString()}`
      ));

    return {
      totalBusinesses: totalBusinessesResult?.count || 0,
      activeBusinesses: activeBusinessesResult?.count || 0,
      totalUsers: totalUsersResult?.count || 0,
      activeUsers: activeUsersResult?.count || 0,
      totalRevenue: Number(totalRevenueResult?.total || 0),
      monthlyRevenue: Number(monthlyRevenueResult?.total || 0),
    };
  }

  /**
   * Get all businesses with pagination and filters
   */
  async getBusinesses(filters: {
    status?: string;
    plan?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{
    businesses: Array<typeof retailBusinesses.$inferSelect>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { status, search, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    
    if (status === 'active') {
      conditions.push(eq(retailBusinesses.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(retailBusinesses.isActive, false));
    }

    if (search) {
      conditions.push(
        like(retailBusinesses.name, `%${search}%`)
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const businesses = await db
      .select()
      .from(retailBusinesses)
      .where(whereClause)
      .orderBy(desc(retailBusinesses.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(retailBusinesses)
      .where(whereClause);

    const total = totalResult?.count || 0;

    return {
      businesses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get business by ID
   */
  async getBusinessById(businessId: string): Promise<typeof retailBusinesses.$inferSelect> {
    const [business] = await db
      .select()
      .from(retailBusinesses)
      .where(eq(retailBusinesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Business not found');
    }

    return business;
  }

  /**
   * Suspend a business
   */
  async suspendBusiness(businessId: string, reason?: string, notes?: string): Promise<void> {
    const [business] = await db
      .update(retailBusinesses)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(retailBusinesses.id, businessId))
      .returning();

    if (!business) {
      throw new Error('Business not found');
    }

    logger.info('Business suspended', { businessId, reason, notes });
  }

  /**
   * Activate a business
   */
  async activateBusiness(businessId: string): Promise<void> {
    const [business] = await db
      .update(retailBusinesses)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(retailBusinesses.id, businessId))
      .returning();

    if (!business) {
      throw new Error('Business not found');
    }

    logger.info('Business activated', { businessId });
  }

  /**
   * Get all users with pagination and filters
   */
  async getUsers(filters: {
    role?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{
    users: Array<typeof users.$inferSelect>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { role, status, search, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    
    if (role) {
      // Type assertion needed for dynamic role comparison
      conditions.push(sql`${users.role} = ${role}`);
    }

    if (status) {
      conditions.push(eq(users.status, status as UserStatus));
    }

    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const usersList = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = totalResult?.count || 0;

    return {
      users: usersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason?: string): Promise<void> {
    const [user] = await db
      .update(users)
      .set({
        status: 'SUSPENDED' as UserStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error('User not found');
    }

    logger.info('User suspended', { userId, reason });
  }

  /**
   * Activate a user
   */
  async activateUser(userId: string): Promise<void> {
    const [user] = await db
      .update(users)
      .set({
        status: 'ACTIVE' as UserStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error('User not found');
    }

    logger.info('User activated', { userId });
  }

  /**
   * Impersonate a business for support/debugging
   */
  async impersonateBusiness(
    adminId: string,
    businessId: string,
    reason: string,
    duration: number = 3600 // 1 hour default
  ): Promise<{
    impersonationToken: string;
    expiresAt: Date;
    businessId: string;
    businessName: string;
  }> {
    // Verify business exists
    const [business] = await db
      .select()
      .from(retailBusinesses)
      .where(eq(retailBusinesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Business not found');
    }

    // Get admin user details
    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1);

    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new Error('Only super admins can impersonate businesses');
    }

    // Generate impersonation token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const expiresAt = new Date(Date.now() + duration * 1000);
    
    const tokenPayload = {
      userId: business.ownerId,
      businessId: business.id,
      impersonatedBy: adminId,
      impersonatedByEmail: admin.email,
      isImpersonation: true,
      reason,
    };

    const impersonationToken = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: duration,
    });

    // Log impersonation action
    logger.warn('Business impersonation started', {
      adminId,
      adminEmail: admin.email,
      businessId,
      businessName: business.name,
      reason,
      duration,
      expiresAt,
    });

    return {
      impersonationToken,
      expiresAt,
      businessId: business.id,
      businessName: business.name,
    };
  }

  // ==================== PLATFORM ANALYTICS ====================

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(months: number = 12): Promise<{
    totalRevenue: number;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    averageMonthlyRevenue: number;
    growthRate: number;
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get monthly revenue
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${bills.billDate}, 'YYYY-MM')`,
        revenue: sum(bills.totalAmount),
      })
      .from(bills)
      .where(and(
        eq(bills.status, 'PAID'),
        sql`${bills.billDate} >= ${startDate.toISOString()}`
      ))
      .groupBy(sql`TO_CHAR(${bills.billDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${bills.billDate}, 'YYYY-MM')`);

    const monthlyRevenue = monthlyData.map(d => ({
      month: d.month,
      revenue: Number(d.revenue || 0),
    }));

    const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
    const averageMonthlyRevenue = monthlyRevenue.length > 0 ? totalRevenue / monthlyRevenue.length : 0;

    // Calculate growth rate (last month vs previous month)
    const growthRate = monthlyRevenue.length >= 2
      ? ((monthlyRevenue[monthlyRevenue.length - 1].revenue - monthlyRevenue[monthlyRevenue.length - 2].revenue) / 
         monthlyRevenue[monthlyRevenue.length - 2].revenue) * 100
      : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      averageMonthlyRevenue,
      growthRate,
    };
  }

  /**
   * Get user growth metrics
   */
  async getUserGrowthMetrics(months: number = 12): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    monthlyGrowth: Array<{ month: string; newUsers: number }>;
    retentionRate: number;
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Total and active users
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'ACTIVE' as typeof userStatusEnum.enumValues[number]));

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [newUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${startOfMonth.toISOString()}`);

    // Monthly growth
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${users.createdAt}, 'YYYY-MM')`,
        newUsers: count(),
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${startDate.toISOString()}`)
      .groupBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`);

    const monthlyGrowth = monthlyData.map(d => ({
      month: d.month,
      newUsers: Number(d.newUsers || 0),
    }));

    // Simple retention rate (active users / total users)
    const retentionRate = totalUsersResult?.count 
      ? ((activeUsersResult?.count || 0) / totalUsersResult.count) * 100
      : 0;

    return {
      totalUsers: totalUsersResult?.count || 0,
      activeUsers: activeUsersResult?.count || 0,
      newUsersThisMonth: newUsersResult?.count || 0,
      monthlyGrowth,
      retentionRate,
    };
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsageAnalytics(): Promise<{
    totalBills: number;
    totalProducts: number;
    totalCustomers: number;
    qrCodesGenerated: number;
    averageBillsPerBusiness: number;
  }> {
    // These would ideally come from usage tracking tables
    // For now, using basic aggregations
    const [billsResult] = await db
      .select({ count: count() })
      .from(bills);

    const [businessesResult] = await db
      .select({ count: count() })
      .from(retailBusinesses);

    const averageBillsPerBusiness = businessesResult?.count 
      ? (billsResult?.count || 0) / businessesResult.count
      : 0;

    return {
      totalBills: billsResult?.count || 0,
      totalProducts: 0, // Would need products table query
      totalCustomers: 0, // Would need customers table query
      qrCodesGenerated: 0, // Would need QR tracking
      averageBillsPerBusiness,
    };
  }

  /**
   * Get top businesses by revenue
   */
  async getTopBusinesses(limit: number = 10): Promise<Array<{
    businessId: string;
    businessName: string;
    totalRevenue: number;
    billCount: number;
  }>> {
    const topBusinesses = await db
      .select({
        businessId: bills.businessId,
        businessName: retailBusinesses.name,
        totalRevenue: sum(bills.totalAmount),
        billCount: count(),
      })
      .from(bills)
      .innerJoin(retailBusinesses, eq(bills.businessId, retailBusinesses.id))
      .where(eq(bills.status, 'PAID'))
      .groupBy(bills.businessId, retailBusinesses.name)
      .orderBy(desc(sum(bills.totalAmount)))
      .limit(limit);

    return topBusinesses.map(b => ({
      businessId: b.businessId,
      businessName: b.businessName,
      totalRevenue: Number(b.totalRevenue || 0),
      billCount: Number(b.billCount || 0),
    }));
  }

  /**
   * Get churn analysis
   */
  async getChurnAnalysis(): Promise<{
    inactiveBusinesses: number;
    churnRate: number;
    inactiveThisMonth: number;
  }> {
    const [totalBusinessesResult] = await db
      .select({ count: count() })
      .from(retailBusinesses);

    const [inactiveBusinessesResult] = await db
      .select({ count: count() })
      .from(retailBusinesses)
      .where(eq(retailBusinesses.isActive, false));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [inactiveThisMonthResult] = await db
      .select({ count: count() })
      .from(retailBusinesses)
      .where(and(
        eq(retailBusinesses.isActive, false),
        sql`${retailBusinesses.updatedAt} >= ${startOfMonth.toISOString()}`
      ));

    const churnRate = totalBusinessesResult?.count
      ? ((inactiveBusinessesResult?.count || 0) / totalBusinessesResult.count) * 100
      : 0;

    return {
      inactiveBusinesses: inactiveBusinessesResult?.count || 0,
      churnRate,
      inactiveThisMonth: inactiveThisMonthResult?.count || 0,
    };
  }

  // ==================== BROADCAST NOTIFICATIONS ====================

  /**
   * Broadcast notification to businesses
   */
  async broadcastNotification(
    target: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'TRIAL',
    message: string,
    subject?: string
  ): Promise<{
    notificationId: string;
    targetCount: number;
    sentCount: number;
  }> {
    // Filter businesses by target
    let whereClause;
    
    switch (target) {
      case 'ACTIVE':
        whereClause = eq(retailBusinesses.isActive, true);
        break;
      case 'INACTIVE':
        whereClause = eq(retailBusinesses.isActive, false);
        break;
      case 'ALL':
      default:
        whereClause = undefined;
        break;
    }

    const targetBusinesses = await db
      .select({
        id: retailBusinesses.id,
        name: retailBusinesses.name,
        email: retailBusinesses.email,
        ownerId: retailBusinesses.ownerId,
      })
      .from(retailBusinesses)
      .where(whereClause);

    const notificationId = `broadcast-${Date.now()}`;
    const targetCount = targetBusinesses.length;

    // Log broadcast
    logger.info('Broadcast notification initiated', {
      notificationId,
      target,
      targetCount,
      subject,
      messageLength: message.length,
    });

    // In production, this would queue notifications via BullMQ
    // For now, just return the metrics
    return {
      notificationId,
      targetCount,
      sentCount: 0, // Would be updated by queue processor
    };
  }
}
