import { db } from '../config/database';
import { users, retailBusinesses, bills, userStatusEnum } from '../models/drizzle/schema';
import { eq, and, sql, count, sum, desc, like, or } from 'drizzle-orm';
import { logger } from '../utils/logger';

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
}
