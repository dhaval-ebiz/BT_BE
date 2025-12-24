import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const createCustomerSchema = z.object({
  customerCode: z.string().min(2, 'Customer code must be at least 2 characters').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  alternatePhone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid alternate phone number').optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  creditLimit: z.number().nonnegative('Credit limit must be non-negative').optional(),
  creditDays: z.number().nonnegative('Credit days must be non-negative').optional(),
  isCreditAllowed: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCustomerSchema = z.object({
  customerCode: z.string().min(2, 'Customer code must be at least 2 characters').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
  alternatePhone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid alternate phone number').optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  creditLimit: z.number().nonnegative('Credit limit must be non-negative').optional(),
  creditDays: z.number().nonnegative('Credit days must be non-negative').optional(),
  isCreditAllowed: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  isCreditAllowed: z.boolean().optional(),
  hasOutstanding: z.boolean().optional(),
  sortBy: z.enum(['firstName', 'createdAt', 'outstandingBalance', 'totalPurchases']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const customerPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  billIds: z.array(z.string().uuid()).optional(),
});

export const customerStatementSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>;
export type CustomerStatementInput = z.infer<typeof customerStatementSchema>;