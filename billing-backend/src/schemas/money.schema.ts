import { z } from 'zod';

export const expenseCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  description: z.string().optional(),
});

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime().optional(), // ISO string
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'NET_BANKING', 'OTHER']).default('CASH'),
  description: z.string().optional(),
  vendor: z.string().max(255).optional(),
  referenceNumber: z.string().max(100).optional(),
  receiptUrl: z.string().url().optional(),
  status: z.enum(['PAID', 'PENDING']).default('PAID'),
  linkedBillId: z.string().uuid().optional(),
  linkedUserId: z.string().uuid().optional(),
});

export const expenseQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  vendor: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export type CreateExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
