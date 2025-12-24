import { z } from 'zod';



const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const billItemSchema = z.object({
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  productName: z.string().min(1, 'Product name is required'),
  productCode: z.string().optional(),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  itemType: z.enum(['PRODUCT', 'SERVICE', 'raw_material', 'composite', 'digital', 'consumable']).default('PRODUCT'),
  unit: z.enum(['KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'DOZEN', 'METER', 'FEET', 'BOX', 'BUNDLE', 'INCH', 'YARD', 'HOUR', 'DAY', 'SERVICE', 'NOT_APPLICABLE', 'TON', 'QUINTAL']),
  quantity: z.number().positive('Quantity must be positive'),
  rate: z.number().min(0, 'Rate must be non-negative'),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  taxPercent: z.number().min(0).max(100).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
});

export const createBillSchema = z.object({
  customerId: z.string().uuid().optional(),
  billDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
  
  // Amounts (Calculated or Overridden)
  subtotal: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().optional(),
  shippingCost: z.number().nonnegative().optional().default(0),
  adjustmentAmount: z.number().optional().default(0), // Can be negative
  roundOffAmount: z.number().optional().default(0),
  totalAmount: z.number().nonnegative().optional(),
  
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  terms: z.string().optional(),
  customerNotes: z.string().optional(),
  
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  requiresApproval: z.boolean().optional(),
  
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'VOID']).default('DRAFT'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'NET_BANKING', 'OTHER']).optional(),
});

export const updateBillSchema = createBillSchema.partial().extend({
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'VOID']).optional(),
  paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'PROCESSING']).optional(),
});

export const billQuerySchema = z.object({
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'VOID']).optional(),
  paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'PROCESSING']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  hasBalance: z.boolean().optional(), // 'true' check, needs explicit string parsing often in query
  sortBy: z.enum(['billDate', 'createdAt', 'totalAmount', 'balanceAmount', 'billNumber']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const billPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'NET_BANKING', 'OTHER']),
  paymentDate: z.string().datetime().optional(), // Defaults to now
  referenceNumber: z.string().max(255).optional(),
  transactionId: z.string().max(255).optional(),
  bankName: z.string().max(255).optional(),
  chequeNumber: z.string().max(100).optional(),
  chequeDate: z.string().datetime().optional(),
  upiId: z.string().max(255).optional(),
  cardLast4: z.string().length(4).optional(),
  notes: z.string().optional(),
  isDeposit: z.boolean().optional().default(false), // To treat as advance? usually false for bill payment
});

export const sendBillSchema = z.object({
  sendEmail: z.boolean().optional(),
  sendSms: z.boolean().optional(),
  sendWhatsapp: z.boolean().optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type BillQueryInput = z.infer<typeof billQuerySchema>;
export type BillPaymentInput = z.infer<typeof billPaymentSchema>;
export type SendBillInput = z.infer<typeof sendBillSchema>;