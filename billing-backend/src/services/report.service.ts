import { db } from '../config/database';
import { 
  bills, 
  billItems, 
  products, 
  productVariants, 
  expenses,
} from '../models/drizzle/schema';
import { and, eq, sql, between, desc } from 'drizzle-orm';

export class ReportService {

  // ==================== SALES REPORT ====================
  async getSalesReport(businessId: string, startDate: Date, endDate: Date, granularity: 'DAY' | 'WEEK' | 'MONTH' = 'DAY') {
    // Determine the date truncation part based on granularity
    let datePart = 'day';
    if (granularity === 'WEEK') datePart = 'week';
    if (granularity === 'MONTH') datePart = 'month';

    const salesData = await db
      .select({
        period: sql`DATE_TRUNC(${datePart}, ${bills.createdAt})`.as('period'),
        totalBills: sql<number>`count(${bills.id})`.mapWith(Number),
        totalRevenue: sql<number>`sum(${bills.totalAmount})`.mapWith(Number),
        PaidAmount: sql<number>`sum(${bills.paidAmount})`.mapWith(Number),
        totalTax: sql<number>`sum(${bills.taxAmount})`.mapWith(Number),
      })
      .from(bills)
      .where(
        and(
          eq(bills.businessId, businessId),
          between(bills.createdAt, startDate, endDate),
          eq(bills.status, 'PAID') // Considering only PAID or PARTIAL could be better, but sticking to PAID for realized revenue or maybe allow filter
        )
      )
      .groupBy(sql`DATE_TRUNC(${datePart}, ${bills.createdAt})`)
      .orderBy(sql`DATE_TRUNC(${datePart}, ${bills.createdAt})`);

    // Calculate aggregations
    const summary = salesData.reduce((acc, curr) => ({
        totalRevenue: acc.totalRevenue + curr.totalRevenue,
        totalBills: acc.totalBills + curr.totalBills,
        totalTax: acc.totalTax + curr.totalTax
    }), { totalRevenue: 0, totalBills: 0, totalTax: 0 });

    return {
      summary,
      breakdown: salesData
    };
  }

  async getTopSellingProducts(businessId: string, startDate: Date, endDate: Date, limit: number = 5) {
    return await db
      .select({
        productId: billItems.productId,
        productName: billItems.productName,
        totalQuantity: sql<number>`sum(${billItems.quantity})`.mapWith(Number),
        totalRevenue: sql<number>`sum(${billItems.totalAmount})`.mapWith(Number),
      })
      .from(billItems)
      .leftJoin(bills, eq(billItems.billId, bills.id))
      .where(
        and(
          eq(bills.businessId, businessId),
          between(bills.createdAt, startDate, endDate),
          eq(bills.status, 'PAID')
        )
      )
      .groupBy(billItems.productId, billItems.productName)
      .orderBy(desc(sql`sum(${billItems.totalAmount})`))
      .limit(limit);
  }

  // ==================== INVENTORY REPORT ====================
  async getInventoryValuation(businessId: string) {
    // Current stock valuation based on product variants
    // Valuation = Stock Quantity * Purchase Price (Average Cost ideally, but using purchasePrice from variant for now)

    const inventoryData = await db
      .select({
        variantId: productVariants.id,
        productName: products.name,
        variantName: productVariants.variantName,
        stockQuantity: productVariants.stockQuantity,
        purchasePrice: productVariants.purchasePrice,
        valuation: sql<number>`(${productVariants.stockQuantity} * COALESCE(${productVariants.purchasePrice}, 0))`.mapWith(Number)
      })
      .from(productVariants)
      .leftJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
            eq(products.businessId, businessId),
            eq(productVariants.isActive, true)
        )
      );

    const totalValuation = inventoryData.reduce((sum, item) => sum + item.valuation, 0);
    const totalItems = inventoryData.reduce((sum, item) => sum + Number(item.stockQuantity), 0);

    return {
      totalValuation,
      totalItems,
      breakdown: inventoryData
    };
  }

  async getLowStockAlerts(businessId: string) {
    return await db
      .select({
        productId: products.id,
        productName: products.name,
        variantName: productVariants.variantName,
        currentStock: productVariants.stockQuantity,
        minimumStock: productVariants.minimumStock,
      })
      .from(productVariants)
      .leftJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(products.businessId, businessId),
          eq(productVariants.isActive, true),
          sql`${productVariants.stockQuantity} <= ${productVariants.minimumStock}`
        )
      );
  }

  // ==================== PROFIT & LOSS ====================
  async getProfitLoss(businessId: string, startDate: Date, endDate: Date) {
    // 1. Revenue (Sales)
    const revenueResult = await db
      .select({
        totalRevenue: sql<number>`sum(${bills.totalAmount})`.mapWith(Number),
        totalDiscounts: sql<number>`sum(${bills.discountAmount})`.mapWith(Number),
      })
      .from(bills)
      .where(
        and(
            eq(bills.businessId, businessId),
            between(bills.createdAt, startDate, endDate),
            eq(bills.status, 'PAID')
        )
      );
    
    const revenue = revenueResult[0]?.totalRevenue || 0;
    const discounts = revenueResult[0]?.totalDiscounts || 0;

    // 2. COGS (Cost of Goods Sold)
    // We need to sum (quantity * costPrice) for all items in PAID bills in this period
    // Note: This relies on `costPrice` being correctly populated in `billItems` at time of sale
    const cogsResult = await db
      .select({
        totalCOGS: sql<number>`sum(${billItems.quantity} * COALESCE(${billItems.costPrice}, 0))`.mapWith(Number)
      })
      .from(billItems)
      .leftJoin(bills, eq(billItems.billId, bills.id))
      .where(
        and(
            eq(bills.businessId, businessId),
            between(bills.createdAt, startDate, endDate),
            eq(bills.status, 'PAID')
        )
      );
    
    const cogs = cogsResult[0]?.totalCOGS || 0;

    // 3. Expenses (Operating Expenses)
    const expensesResult = await db
      .select({
        totalExpenses: sql<number>`sum(${expenses.amount})`.mapWith(Number)
      })
      .from(expenses)
      .where(
        and(
            eq(expenses.businessId, businessId),
            between(expenses.date, startDate, endDate)
        )
      );
    
    const operatingExpenses = expensesResult[0]?.totalExpenses || 0;

    // Calculations
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;
    
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      discounts,
      cogs,
      grossProfit,
      grossMargin: Number(grossMargin.toFixed(2)),
      operatingExpenses,
      netProfit,
      netMargin: Number(netMargin.toFixed(2))
    };
  }

  // ==================== TAX REPORT ====================
  async getTaxReport(businessId: string, startDate: Date, endDate: Date) {
    // 1. Output Tax (Collected from Sales)
    // We get total tax collected, and can also break it down by rate if needed.
    // For now, let's just get total Tax from bills.
    
    // Total Output Tax
    const outputTaxResult = await db
      .select({
        totalTax: sql<number>`sum(${bills.taxAmount})`.mapWith(Number),
        taxableAmount: sql<number>`sum(${bills.subtotal} - ${bills.discountAmount})`.mapWith(Number)
      })
      .from(bills)
      .where(
        and(
          eq(bills.businessId, businessId),
          between(bills.createdAt, startDate, endDate),
          eq(bills.status, 'PAID')
        )
      );

    // Breakdown by Tax Rate (from billItems)
    const taxBreakdown = await db
      .select({
        taxRate: billItems.taxPercent,
        totalTaxAmount: sql<number>`sum(${billItems.taxAmount})`.mapWith(Number),
        totalTaxableAmount: sql<number>`sum(${billItems.subtotal})`.mapWith(Number)
      })
      .from(billItems)
      .leftJoin(bills, eq(billItems.billId, bills.id))
      .where(
        and(
          eq(bills.businessId, businessId),
          between(bills.createdAt, startDate, endDate),
          eq(bills.status, 'PAID'),
          sql`${billItems.taxPercent} > 0`
        )
      )
      .groupBy(billItems.taxPercent)
      .orderBy(billItems.taxPercent);

    return {
      totalOutputTax: outputTaxResult[0]?.totalTax || 0,
      totalTaxableRevenue: outputTaxResult[0]?.taxableAmount || 0,
      breakdown: taxBreakdown
    };
  }
}
