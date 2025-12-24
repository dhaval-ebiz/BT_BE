import { db } from '../config/database';
import { 
  bills, 
  products, 
  customers 
} from '../models/drizzle/schema';
import { eq, and, desc, gte, sql, sum, count } from 'drizzle-orm';

export class AnalyticsService {

  // ================= DASHBOARD OVERVIEW =================
  async getDashboardStats(businessId: string) {
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
                eq(bills.status, 'PAID') // Or include PARTIAL?
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

    return {
        todaySales: Number(todaySales?.total || 0),
        monthSales: Number(monthSales?.total || 0),
        lowStockItems: Number(lowStock?.count || 0),
        totalReceivables: Number(receivables?.total || 0),
    };
  }

  // ================= SALES GRAPH =================
  async getSalesGraph(businessId: string, range: 'WEEK' | 'MONTH' = 'WEEK') {
    const now = new Date();
    const startDate = new Date();
    
    if (range === 'WEEK') {
        startDate.setDate(now.getDate() - 7);
    } else {
        startDate.setMonth(now.getMonth() - 1);
    }

    // Group by Date
    // Note: Drizzle raw SQL might be needed for efficient date truncation across DB types, 
    // but assuming Postgres: date_trunc('day', created_at)
    
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

    // Fill in missing dates? (Optional, can be done in FE)
    interface SalesDataRow {
      date: Date | string;
      total: string | number;
    }
    
    return (salesData.rows as SalesDataRow[]).map((row) => ({
        date: row.date,
        total: Number(row.total)
    }));
  }

  // ================= TOP PRODUCTS =================
  async getTopSellingProducts(businessId: string, limit: number = 5) {
    // This requires aggregation on bill_items. 
    // Is bill_items exported from schema? Yes (assumed, need to check import or simple join)
    // Actually, products table has 'totalSold' field! We can use that for all-time top.
    // For "Recent" top products, we'd need to join bill_items.
    // Let's use the 'totalSold' field for efficiency for now.

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
  async getLowStockItems(businessId: string, limit: number = 10) {
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
}