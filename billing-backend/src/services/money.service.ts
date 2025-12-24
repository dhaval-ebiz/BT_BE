import { db } from '../config/database';
import { 
  expenses, 
  expenseCategories, 
  payments 
} from '../models/drizzle/schema';
import { eq, and, desc, gte, lte, sql, sum, SQL } from 'drizzle-orm';
import { 
  CreateExpenseInput, 
  CreateExpenseCategoryInput, 
  ExpenseQueryInput 
} from '../schemas/money.schema';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../types/common';

const auditService = new AuditService();

export class MoneyService {
  
  // ================= CATEGORIES =================
  async createCategory(businessId: string, input: CreateExpenseCategoryInput): Promise<typeof expenseCategories.$inferSelect> {
    const [category] = await db.insert(expenseCategories).values({
      businessId,
      ...input,
    }).returning();
    
    if (!category) throw new Error('Failed to create category');

    return category;
  }

  async listCategories(businessId: string, type?: 'EXPENSE' | 'INCOME'): Promise<typeof expenseCategories.$inferSelect[]> {
    const conditions: SQL[] = [eq(expenseCategories.businessId, businessId)];
    if (type) {
        conditions.push(eq(expenseCategories.type, type));
    }
    const condition = and(...conditions);
    return await db.select().from(expenseCategories).where(condition);
  }

  // ================= EXPENSES =================
  async createExpense(businessId: string, userId: string, input: CreateExpenseInput, req?: AuthenticatedRequest): Promise<typeof expenses.$inferSelect> {
    const { date, ...rest } = input;
    
    const [expense] = await db.insert(expenses).values({
        businessId,
        createdBy: userId,
        date: date ? new Date(date) : new Date(),
        ...rest,
        amount: rest.amount.toString(),
        linkedBillId: input.linkedBillId,
        linkedUserId: input.linkedUserId
    }).returning();

    if (!expense) throw new Error('Failed to create expense');

    await auditService.logBusinessAction('EXPENSE_CREATE', businessId, userId, expense.id, undefined, { amount: input.amount }, req);
    return expense;
  }

  async listExpenses(businessId: string, query: ExpenseQueryInput): Promise<{ expenses: Array<{ id: string; amount: string; date: Date; description: string | null; vendor: string | null; category: string | null; paymentMethod: string | null; status: string | null }>; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const { categoryId, startDate, endDate, vendor, minAmount, maxAmount, page = 1, limit = 20 } = query;
    
    const conditions: SQL[] = [eq(expenses.businessId, businessId)];
    
    if (categoryId) conditions.push(eq(expenses.categoryId, categoryId));
    if (vendor) conditions.push(sql`${expenses.vendor} ILIKE ${`%${vendor}%`}`);
    if (startDate) conditions.push(gte(expenses.date, new Date(startDate)));
    if (endDate) conditions.push(lte(expenses.date, new Date(endDate)));
    if (minAmount) conditions.push(gte(expenses.amount, minAmount.toString()));
    if (maxAmount) conditions.push(lte(expenses.amount, maxAmount.toString()));

    const condition = and(...conditions);

    const offset = (page - 1) * limit;

    const [totalRes] = await db.select({ count: sql<number>`count(*)` }).from(expenses).where(condition);
    const total = Number(totalRes?.count || 0);
    const totalPages = Math.ceil(total / limit);

    const data = await db.select({
        id: expenses.id,
        amount: expenses.amount,
        date: expenses.date,
        description: expenses.description,
        vendor: expenses.vendor,
        category: expenseCategories.name,
        paymentMethod: expenses.paymentMethod,
        status: expenses.status
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(condition)
    .orderBy(desc(expenses.date))
    .limit(limit)
    .offset(offset);

    return { expenses: data, pagination: { total, page, limit, totalPages } };
  }

  // ================= SUMMARY =================
  async getFinancialSummary(businessId: string, startDate?: string, endDate?: string): Promise<{ totalIncome: number; totalExpense: number; netIncome: number; period: { start: Date; end: Date } }> {
    const start = startDate ? new Date(startDate) : new Date(0); // Beginning of time
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Total Expenses
    const [expenseRes] = await db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
            and(
                eq(expenses.businessId, businessId),
                gte(expenses.date, start),
                lte(expenses.date, end),
                eq(expenses.status, 'PAID') // Only count paid expenses? Or all? Usually paid for cash flow.
            )
        );

    // 2. Total Income (From Payments table linked to Bills)
    const [incomeRes] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
            and(
                eq(payments.businessId, businessId),
                gte(payments.paymentDate, start),
                lte(payments.paymentDate, end),
                eq(payments.status, 'COMPLETED')
            )
        );

    const totalExpense = parseFloat(expenseRes?.total || '0');
    const totalIncome = parseFloat(incomeRes?.total || '0');
    const netIncome = totalIncome - totalExpense;

    return {
        totalIncome,
        totalExpense,
        netIncome,
        period: { start, end }
    };
  }
}
