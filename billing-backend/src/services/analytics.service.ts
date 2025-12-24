import { db } from '../config/database';
import { 
  bills, 
  products, 
  customers 
} from '../models/drizzle/schema';
import { eq, and, desc, gte, sql, sum, count } from 'drizzle-orm';
import { redis } from '../config/redis';

// ================= RETURN TYPE INTERFACES =================
export interface DashboardStats {
  todaySales: number;
  monthSales: number;
  lowStockItems: number;
  totalReceivables: number;
}

export interface SalesGraphPoint {
  date: Date | string;
  total: number;
}

export interface TopProduct {
  id: string;
  name: string;
  totalSold: string | null;
  revenue: string | null;
}

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: string | null;
  minimumStock: string | null;
}

export class AnalyticsService {

  // ================= DASHBOARD OVERVIEW =================
  async getDashboardStats(businessId: string): Promise<DashboardStats> {
    // Check cache first
    const cacheKey = `business:${businessId}:dashboard:stats`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as DashboardStats;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Total Sales (Today)
    const [todaySales] = await db
        .select({ total: sum(bills.totalAmount) })
        .from(bills)
        .where(
            and(
                eq(bills.businessId, businessId),
                gte(bills.createdAt, today),
                eq(bills.status, 'PAID')
            )
        );

    // 2. Total Sales (This Month)
    const [monthSales] = await db
        .select({ total: sum(bills.totalAmount) })
        .from(bills)
        .where(
            and(
                eq(bills.businessId, businessId),
                gte(bills.createdAt, startOfMonth),
                eq(bills.status, 'PAID')
            )
        );

    // 3. Low Stock Items
    const [lowStock] = await db
        .select({ count: count() })
        .from(products)
        .where(
            and(
                eq(products.businessId, businessId),
                sql`${products.currentStock} <= ${products.minimumStock}`
            )
        );

    // 4. Receivables (Outstanding Balance from Customers)
    const [receivables] = await db
        .select({ total: sum(customers.outstandingBalance) })
        .from(customers)
        .where(eq(customers.businessId, businessId));

    const result = {
        todaySales: Number(todaySales?.total ?? 0),
        monthSales: Number(monthSales?.total ?? 0),
        lowStockItems: Number(lowStock?.count ?? 0),
        totalReceivables: Number(receivables?.total ?? 0),
    };

    // Cache for 5 minutes (300 seconds)
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

    return result;
  }

  // ================= SALES GRAPH =================
  async getSalesGraph(businessId: string, range: 'WEEK' | 'MONTH' = 'WEEK'): Promise<SalesGraphPoint[]> {
    // Check cache
    const cacheKey = `business:${businessId}:sales:graph:${range}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SalesGraphPoint[];
    }

    const now = new Date();
    const startDate = new Date();
    
    if (range === 'WEEK') {
        startDate.setDate(now.getDate() - 7);
    } else {
        startDate.setMonth(now.getMonth() - 1);
    }

    const salesData = await db.execute(sql`
        SELECT 
            DATE(created_at) as date, 
            SUM(total_amount) as total 
        FROM ${bills}
        WHERE 
            business_id = ${businessId} 
            AND created_at >= ${startDate}
            AND status != 'DRAFT' AND status != 'CANCELLED'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
    `);

    interface SalesDataRow {
      date: Date | string;
      total: string | number;
    }
    
    const result = (salesData.rows as unknown as SalesDataRow[]).map((row) => ({
        date: row.date,
        total: Number(row.total)
    }));

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

    return result;
  }

  // ================= TOP PRODUCTS =================
  async getTopSellingProducts(businessId: string, limit: number = 5): Promise<TopProduct[]> {
    const topProducts = await db
        .select({
            id: products.id,
            name: products.name,
            totalSold: products.totalSold,
            revenue: products.totalRevenue
        })
        .from(products)
        .where(eq(products.businessId, businessId))
        .orderBy(desc(products.totalSold))
        .limit(limit);

    return topProducts;
  }

  // ================= LOW STOCK =================
  async getLowStockItems(businessId: string, limit: number = 10): Promise<LowStockItem[]> {
    return await db
        .select({
            id: products.id,
            name: products.name,
            currentStock: products.currentStock,
            minimumStock: products.minimumStock
        })
        .from(products)
        .where(
            and(
                eq(products.businessId, businessId),
                sql`${products.currentStock} <= ${products.minimumStock}`
            )
        )
        .limit(limit);
  }
  // ================= NEW ANALYTICS METHODS =================
  async getDashboardOverview(_businessId: string, _period: string): Promise<Record<string, unknown>> {
    return {
      today: {
        totalSales: 0,
        totalPayments: 0,
        totalBills: 0,
        cashIn: 0,
        cashOut: 0,
        outstandingBalance: 0,
        newCustomers: 0
      },
      sevenDays: {
        sales: [],
        payments: [],
        billsCount: [],
        topProducts: [],
        paymentMethodBreakdown: []
      },
      monthly: {
        mrr: 0,
        totalRevenue: 0,
        totalProfit: 0,
        grossProfitMargin: 0,
        customerAcquisition: 0,
        customerChurn: 0,
        averageOrderValue: 0
      },
      predictions: {
        predictedRevenue: 0,
        mrrPrediction: 0,
        lowStockAlerts: 0,
        paymentDueAlerts: 0
      }
    };
  }

  async predictMRR(_businessId: string): Promise<{ currentMRR: number; predictedMRR: number; confidence: number; factors: string[] }> {
    return {
      currentMRR: 0,
      predictedMRR: 0,
      confidence: 0,
      factors: []
    };
  }

  async calculateBusinessHealthScore(_businessId: string): Promise<{ score: number; trend: 'UP' | 'DOWN' | 'STABLE'; factors: string[] }> {
    return {
      score: 100,
      trend: 'STABLE',
      factors: []
    };
  }

  async getRevenueTrend(_businessId: string, _period: string): Promise<unknown[]> {
    return [];
  }

  async getCustomerAnalytics(_businessId: string, _period: string): Promise<Record<string, unknown>> {
    return {};
  }

  async getProductAnalytics(_businessId: string, _period: string): Promise<Record<string, unknown>> {
    return {};
  }

  async getPaymentAnalytics(_businessId: string, _period: string): Promise<Record<string, unknown>> {
    return {};
  }

  async getRealTimeMetrics(_businessId: string): Promise<Record<string, unknown>> {
    return {};
  }

  async getPredictiveInsights(_businessId: string): Promise<unknown[]> {
    return [];
  }

  async exportAnalyticsData(_businessId: string, _period: string, format: string): Promise<string | Record<string, unknown>> {
    return format === 'csv' ? '' : {};
  }
}