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
  async createCategory(businessId: string, input: CreateExpenseCategoryInput) {
    const [category] = await db.insert(expenseCategories).values({
      businessId,
      ...input,
    }).returning();
    return category;
  }

  async listCategories(businessId: string, type?: 'EXPENSE' | 'INCOME') {
    const conditions: SQL[] = [eq(expenseCategories.businessId, businessId)];
    if (type) {
        conditions.push(eq(expenseCategories.type, type));
    }
    const condition = and(...conditions);
    return await db.select().from(expenseCategories).where(condition);
  }

  // ================= EXPENSES =================
  async createExpense(businessId: string, userId: string, input: CreateExpenseInput, req?: AuthenticatedRequest) {
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

    await auditService.logBusinessAction('EXPENSE_CREATE', businessId, userId, JSON.stringify({ expenseId: expense.id, amount: input.amount }), req);
    return expense;
  }

  async listExpenses(businessId: string, query: ExpenseQueryInput) {
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
    const total = Number(totalRes.count);
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
  async getFinancialSummary(businessId: string, startDate?: string, endDate?: string) {
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
