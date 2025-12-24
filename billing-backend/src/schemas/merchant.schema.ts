import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const bankDetailsSchema = z.object({
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  branch: z.string().optional(),
});

export const createMerchantSchema = z.object({
  merchantCode: z.string().min(2, 'Merchant code must be at least 2 characters').optional(),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
  alternatePhone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid alternate phone number').optional(),
  address: addressSchema.optional(),
  bankDetails: bankDetailsSchema.optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  creditLimit: z.number().nonnegative('Credit limit must be non-negative').optional(),
  paymentTerms: z.number().positive('Payment terms must be positive').optional(),
  notes: z.string().optional(),
});

export const updateMerchantSchema = z.object({
  merchantCode: z.string().min(2, 'Merchant code must be at least 2 characters').optional(),
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
  alternatePhone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid alternate phone number').optional(),
  address: addressSchema.optional(),
  bankDetails: bankDetailsSchema.optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  creditLimit: z.number().nonnegative('Credit limit must be non-negative').optional(),
  paymentTerms: z.number().positive('Payment terms must be positive').optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const merchantQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  hasOutstanding: z.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'outstandingBalance', 'totalPurchases']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const merchantPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
export type MerchantQueryInput = z.infer<typeof merchantQuerySchema>;
export type MerchantPaymentInput = z.infer<typeof merchantPaymentSchema>;