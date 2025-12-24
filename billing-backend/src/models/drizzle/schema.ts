import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, pgEnum, unique, index, primaryKey, AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ==================== ENUMS ====================

export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'RETAIL_OWNER', 'MANAGER', 'CASHIER', 'VIEWER', 'ACCOUNTANT']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'DELETED']);
export const billingStatusEnum = pgEnum('billing_status', ['DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'VOID']);
export const approvalStatusEnum = pgEnum('approval_status', ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'NET_BANKING', 'OTHER']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'PROCESSING']);
export const productUnitEnum = pgEnum('product_unit', [
  'KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'DOZEN', 'METER', 'FEET', 
  'BOX', 'BUNDLE', 'INCH', 'YARD', 'HOUR', 'DAY', 'SERVICE', 'NOT_APPLICABLE', 'TON', 'QUINTAL'
]);
export const productTypeEnum = pgEnum('product_type', [
  'PHYSICAL_PRODUCT', 'RAW_MATERIAL', 'SERVICE', 'COMPOSITE', 'DIGITAL', 'CONSUMABLE'
]);
export const messageTypeEnum = pgEnum('message_type', ['WHATSAPP', 'SMS', 'EMAIL', 'PUSH']);
export const messageStatusEnum = pgEnum('message_status', ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ']);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'PAYMENT', 'REFUND', 
  'ADJUSTMENT', 'BILL_PAYMENT', 'ADVANCE_PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE'
]);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'EXPIRED', 'CONSUMPTION', 'PRODUCTION'
]);
export const aiContentTypeEnum = pgEnum('ai_content_type', ['BANNER', 'SQL_QUERY', 'TEXT', 'IMAGE', 'PROMOTION', 'DESCRIPTION', 'SOCIAL_POST']);
export const permissionResourceEnum = pgEnum('permission_resource', [
  'DASHBOARD', 'CUSTOMERS', 'MERCHANTS', 'PRODUCTS', 'BILLS', 'PAYMENTS', 
  'REPORTS', 'SETTINGS', 'USERS', 'ROLES', 'MESSAGES', 'AI_FEATURES', 
  'ANALYTICS', 'MONEY_MANAGEMENT', 'INVENTORY', 'APPROVALS', 'AUDIT_LOGS'
]);
export const permissionActionEnum = pgEnum('permission_action', ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'MANAGE', 'VOID']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE', 'CUSTOM']);
export const notificationChannelEnum = pgEnum('notification_channel', ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH']);
export const businessTypeEnum = pgEnum('business_type', [
  'RETAIL', 'WHOLESALE', 'SERVICE', 'MANUFACTURING', 'WORKSHOP', 'HYBRID', 'RESTAURANT', 'ECOMMERCE'
]);
export const inventoryMethodEnum = pgEnum('inventory_method', ['FIFO', 'LIFO', 'AVERAGE', 'SPECIFIC', 'NONE']);
export const recurringFrequencyEnum = pgEnum('recurring_frequency', ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
export const analyticsGranularityEnum = pgEnum('analytics_granularity', ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);

// ==================== USERS & AUTHENTICATION ====================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  role: userRoleEnum('role').notNull().default('RETAIL_OWNER'),
  status: userStatusEnum('status').notNull().default('PENDING'),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: varchar('last_login_ip', { length: 45 }),
  loginAttempts: integer('login_attempts').notNull().default(0),
  lockUntil: timestamp('lock_until'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiresAt: timestamp('password_reset_expires_at'),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationExpiresAt: timestamp('email_verification_expires_at'),
  phoneVerificationToken: varchar('phone_verification_token', { length: 10 }),
  phoneVerificationExpiresAt: timestamp('phone_verification_expires_at'),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorBackupCodes: jsonb('two_factor_backup_codes'),
  avatar: text('avatar'),
  timezone: varchar('timezone', { length: 100 }).default('Asia/Kolkata'),
  language: varchar('language', { length: 10 }).default('en'),
  preferences: jsonb('preferences'),
  metadata: jsonb('metadata'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  phoneIdx: index('users_phone_idx').on(table.phone),
  roleIdx: index('users_role_idx').on(table.role),
  statusIdx: index('users_status_idx').on(table.status),
  deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
}));

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  accessToken: text('access_token'),
  deviceId: varchar('device_id', { length: 255 }),
  deviceName: varchar('device_name', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').notNull().default(true),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  refreshTokenIdx: index('user_sessions_refresh_token_idx').on(table.refreshToken),
  isActiveIdx: index('user_sessions_is_active_idx').on(table.isActive),
  expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expiresAt),
}));

export const qrCodes = pgTable('qr_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => qrCodeBatches.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  
  qrCode: varchar('qr_code', { length: 255 }).notNull().unique(),
  qrData: jsonb('qr_data').notNull(),
  qrImageUrl: text('qr_image_url'),
  qrFormat: varchar('qr_format', { length: 50 }).default('png'),
  
  isActive: boolean('is_active').notNull().default(true),
  isUsed: boolean('is_used').notNull().default(false),
  usedAt: timestamp('used_at'),
  usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
  usedInBillId: uuid('used_in_bill_id').references(() => bills.id, { onDelete: 'set null' }),
  scanCount: integer('scan_count').notNull().default(0),
  lastScannedAt: timestamp('last_scanned_at'),
  
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessCodeIdx: index('qr_codes_business_code_idx').on(table.businessId, table.qrCode),
  businessIdx: index('qr_codes_business_idx').on(table.businessId),
  batchIdx: index('qr_codes_batch_idx').on(table.batchId),
  productIdx: index('qr_codes_product_idx').on(table.productId),
  qrCodeIdx: index('qr_codes_qr_code_idx').on(table.qrCode),
  isActiveIdx: index('qr_codes_is_active_idx').on(table.isActive),
}));

// ==================== BILLS/INVOICES ====================

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
  
  billNumber: varchar('bill_number', { length: 100 }).notNull(),
  billType: varchar('bill_type', { length: 50 }).notNull().default('SALE'),
  billDate: timestamp('bill_date').notNull(),
  dueDate: timestamp('due_date'),
  
  status: billingStatusEnum('status').notNull().default('DRAFT'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('NOT_REQUIRED'),
  
  // Amounts
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull().default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  shippingCost: decimal('shipping_cost', { precision: 15, scale: 2 }).notNull().default('0.00'),
  adjustmentAmount: decimal('adjustment_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  roundOffAmount: decimal('round_off_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  balanceAmount: decimal('balance_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Payment
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentStatus: paymentStatusEnum('payment_status').default('PENDING'),
  paymentDueDate: timestamp('payment_due_date'),
  
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  terms: text('terms'),
  customerNotes: text('customer_notes'),
  
  // Approval workflow
  requiresApproval: boolean('requires_approval').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by').references(() => users.id, { onDelete: 'set null' }),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  
  // Messaging
  whatsappSent: boolean('whatsapp_sent').notNull().default(false),
  whatsappSentAt: timestamp('whatsapp_sent_at'),
  smsSent: boolean('sms_sent').notNull().default(false),
  smsSentAt: timestamp('sms_sent_at'),
  emailSent: boolean('email_sent').notNull().default(false),
  emailSentAt: timestamp('email_sent_at'),
  
  // Recurring
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringFrequency: recurringFrequencyEnum('recurring_frequency'),
  parentBillId: uuid('parent_bill_id').references((): AnyPgColumn => bills.id, { onDelete: 'set null' }),
  
  voidedAt: timestamp('voided_at'),
  voidedBy: uuid('voided_by').references(() => users.id, { onDelete: 'set null' }),
  voidReason: text('void_reason'),
  
  metadata: jsonb('metadata'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessBillNumberIdx: unique('bills_business_bill_number_idx').on(table.businessId, table.billNumber),
  businessIdx: index('bills_business_idx').on(table.businessId),
  customerIdx: index('bills_customer_idx').on(table.customerId),
  statusIdx: index('bills_status_idx').on(table.status),
  approvalStatusIdx: index('bills_approval_status_idx').on(table.approvalStatus),
  billDateIdx: index('bills_bill_date_idx').on(table.billDate),
  dueDateIdx: index('bills_due_date_idx').on(table.dueDate),
  paymentStatusIdx: index('bills_payment_status_idx').on(table.paymentStatus),
  createdByIdx: index('bills_created_by_idx').on(table.createdBy),
  balanceAmountIdx: index('bills_balance_amount_idx').on(table.balanceAmount),
  deletedAtIdx: index('bills_deleted_at_idx').on(table.deletedAt),
}));

export const billApprovalHistory = pgTable('bill_approval_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  
  action: varchar('action', { length: 50 }).notNull(), // SUBMITTED, APPROVED, REJECTED
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  
  notes: text('notes'),
  
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  
  oldApprovalStatus: varchar('old_approval_status', { length: 50 }),
  newApprovalStatus: varchar('new_approval_status', { length: 50 }),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  billIdx: index('bill_approval_history_bill_idx').on(table.billId),
  performedByIdx: index('bill_approval_history_performed_by_idx').on(table.performedBy),
}));

// Comprehensive bill history for tracking all changes
export const billHistory = pgTable('bill_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  
  action: varchar('action', { length: 50 }).notNull(), // CREATED, UPDATED, STATUS_CHANGED, FINALIZED, VOIDED, DELETED, DUPLICATED, SENT
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Change details
  fieldName: varchar('field_name', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  
  // Status changes
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  
  // Full snapshot (optional, for major changes)
  billSnapshot: jsonb('bill_snapshot'),
  
  // Notes
  notes: text('notes'),
  description: text('description'),
  
  // IP and device tracking
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  billIdx: index('bill_history_bill_idx').on(table.billId),
  performedByIdx: index('bill_history_performed_by_idx').on(table.performedBy),
  actionIdx: index('bill_history_action_idx').on(table.action),
  createdAtIdx: index('bill_history_created_at_idx').on(table.createdAt),
}));

export const billItems = pgTable('bill_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  
  itemType: varchar('item_type', { length: 50 }).notNull().default('PRODUCT'),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productCode: varchar('product_code', { length: 100 }),
  description: text('description'),
  hsnCode: varchar('hsn_code', { length: 50 }),
  sacCode: varchar('sac_code', { length: 50 }),
  
  unit: productUnitEnum('unit').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 15, scale: 2 }).notNull(),
  
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0.00'),
  discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }).default('0.00'),
  
  taxPercent: decimal('tax_percent', { precision: 5, scale: 2 }).default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).default('0.00'),
  
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  
  // Cost tracking for profitability
  costPrice: decimal('cost_price', { precision: 15, scale: 2 }),
  
  sortOrder: integer('sort_order').default(0),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  billIdx: index('bill_items_bill_idx').on(table.billId),
  productIdx: index('bill_items_product_idx').on(table.productId),
}));

// ==================== PAYMENTS ====================

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
  
  paymentNumber: varchar('payment_number', { length: 100 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  unallocatedAmount: decimal('unallocated_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  
  referenceNumber: varchar('reference_number', { length: 255 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  
  bankName: varchar('bank_name', { length: 255 }),
  chequeNumber: varchar('cheque_number', { length: 100 }),
  chequeDate: timestamp('cheque_date'),
  
  upiId: varchar('upi_id', { length: 255 }),
  cardLast4: varchar('card_last4', { length: 4 }),
  cardBrand: varchar('card_brand', { length: 50 }),
  
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  receiptUrl: text('receipt_url'),
  
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  
  metadata: jsonb('metadata'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessPaymentNumberIdx: unique('payments_business_payment_number_idx').on(table.businessId, table.paymentNumber),
  businessIdx: index('payments_business_idx').on(table.businessId),
  customerIdx: index('payments_customer_idx').on(table.customerId),
  statusIdx: index('payments_status_idx').on(table.status),
  methodIdx: index('payments_method_idx').on(table.method),
  paymentDateIdx: index('payments_payment_date_idx').on(table.paymentDate),
  deletedAtIdx: index('payments_deleted_at_idx').on(table.deletedAt),
}));

export const paymentAllocations = pgTable('payment_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  billId: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'restrict' }),
  
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
  billBalanceBefore: decimal('bill_balance_before', { precision: 15, scale: 2 }).notNull(),
  billBalanceAfter: decimal('bill_balance_after', { precision: 15, scale: 2 }).notNull(),
  
  allocationDate: timestamp('allocation_date').notNull().defaultNow(),
  allocationOrder: integer('allocation_order').notNull().default(1), // Order of allocation
  notes: text('notes'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paymentBillIdx: unique('payment_allocations_payment_bill_idx').on(table.paymentId, table.billId),
  paymentIdx: index('payment_allocations_payment_idx').on(table.paymentId),
  billIdx: index('payment_allocations_bill_idx').on(table.billId),
}));

// ==================== ANALYTICS & REPORTING ====================

export const dailySalesSummary = pgTable('daily_sales_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  summaryDate: timestamp('summary_date').notNull(),
  
  totalBills: integer('total_bills').notNull().default(0),
  totalSales: decimal('total_sales', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalPayments: decimal('total_payments', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalRefunds: decimal('total_refunds', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalDiscounts: decimal('total_discounts', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalTax: decimal('total_tax', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // By payment method
  cashSales: decimal('cash_sales', { precision: 15, scale: 2 }).notNull().default('0.00'),
  cardSales: decimal('card_sales', { precision: 15, scale: 2 }).notNull().default('0.00'),
  upiSales: decimal('upi_sales', { precision: 15, scale: 2 }).notNull().default('0.00'),
  creditSales: decimal('credit_sales', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Customer metrics
  newCustomers: integer('new_customers').notNull().default(0),
  returningCustomers: integer('returning_customers').notNull().default(0),
  uniqueCustomers: integer('unique_customers').notNull().default(0),
  
  averageBillValue: decimal('average_bill_value', { precision: 15, scale: 2 }).notNull().default('0.00'),
  highestBillAmount: decimal('highest_bill_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  lowestBillAmount: decimal('lowest_bill_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessDateIdx: unique('daily_sales_summary_business_date_idx').on(table.businessId, table.summaryDate),
  businessIdx: index('daily_sales_summary_business_idx').on(table.businessId),
  summaryDateIdx: index('daily_sales_summary_date_idx').on(table.summaryDate),
}));

// NEW: Comprehensive analytics table
export const businessAnalytics = pgTable('business_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  
  periodType: analyticsGranularityEnum('period_type').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Revenue metrics
  totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }).notNull().default('0.00'),
  grossProfit: decimal('gross_profit', { precision: 15, scale: 2 }).notNull().default('0.00'),
  grossProfitMargin: decimal('gross_profit_margin', { precision: 5, scale: 2 }).notNull().default('0.00'),
  
  // Bills
  totalBills: integer('total_bills').notNull().default(0),
  paidBills: integer('paid_bills').notNull().default(0),
  partialBills: integer('partial_bills').notNull().default(0),
  overdueBills: integer('overdue_bills').notNull().default(0),
  
  // Customer metrics
  totalCustomers: integer('total_customers').notNull().default(0),
  newCustomers: integer('new_customers').notNull().default(0),
  activeCustomers: integer('active_customers').notNull().default(0),
  churnedCustomers: integer('churned_customers').notNull().default(0),
  
  // Product metrics
  topSellingProducts: jsonb('top_selling_products'), // [{productId, quantity, revenue}]
  lowStockProducts: jsonb('low_stock_products'),
  
  // Financial health
  averageOrderValue: decimal('average_order_value', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalOutstanding: decimal('total_outstanding', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalAdvances: decimal('total_advances', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Predictions
  predictedRevenue: decimal('predicted_revenue', { precision: 15, scale: 2 }),
  mrrPrediction: decimal('mrr_prediction', { precision: 15, scale: 2 }),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessPeriodIdx: unique('business_analytics_business_period_idx').on(table.businessId, table.periodType, table.periodStart),
  businessIdx: index('business_analytics_business_idx').on(table.businessId),
  periodTypeIdx: index('business_analytics_period_type_idx').on(table.periodType),
}));

// ==================== MESSAGES & NOTIFICATIONS ====================

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'set null' }),
  
  type: messageTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  
  recipient: varchar('recipient', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  
  subject: varchar('subject', { length: 500 }),
  content: text('content').notNull(),
  htmlContent: text('html_content'),
  
  status: messageStatusEnum('status').notNull().default('PENDING'),
  
  provider: varchar('provider', { length: 100 }),
  providerId: varchar('provider_id', { length: 255 }),
  providerResponse: jsonb('provider_response'),
  
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  failedAt: timestamp('failed_at'),
  
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  
  cost: decimal('cost', { precision: 10, scale: 4 }),
  attachments: jsonb('attachments'),
  
  scheduledFor: timestamp('scheduled_for'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('messages_business_idx').on(table.businessId),
  customerIdx: index('messages_customer_idx').on(table.customerId),
  billIdx: index('messages_bill_idx').on(table.billId),
  statusIdx: index('messages_status_idx').on(table.status),
  scheduledForIdx: index('messages_scheduled_for_idx').on(table.scheduledFor),
}));

// ==================== AI FEATURES ====================

export const aiGeneratedContent = pgTable('ai_generated_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  type: aiContentTypeEnum('type').notNull(),
  prompt: text('prompt').notNull(),
  content: text('content'),
  imageUrl: text('image_url'),
  
  model: varchar('model', { length: 100 }),
  provider: varchar('provider', { length: 100 }),
  
  tokensUsed: integer('tokens_used'),
  cost: decimal('cost', { precision: 10, scale: 6 }),
  generationTime: integer('generation_time'),
  
  status: varchar('status', { length: 50 }).notNull().default('COMPLETED'),
  errorMessage: text('error_message'),
  
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('ai_content_business_idx').on(table.businessId),
  userIdx: index('ai_content_user_idx').on(table.userId),
  typeIdx: index('ai_content_type_idx').on(table.type),
  createdAtIdx: index('ai_content_created_at_idx').on(table.createdAt),
}));

// ==================== AUDIT & SECURITY ====================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => retailBusinesses.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  action: varchar('action', { length: 100 }).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(),
  
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  entityName: varchar('entity_name', { length: 255 }),
  
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changes: jsonb('changes'),
  
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestId: varchar('request_id', { length: 100 }),
  
  severity: varchar('severity', { length: 20 }).notNull().default('INFO'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('audit_logs_business_idx').on(table.businessId),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
  entityIdIdx: index('audit_logs_entity_id_idx').on(table.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  identifierType: varchar('identifier_type', { length: 50 }).notNull(),
  
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  requestCount: integer('request_count').notNull().default(0),
  maxRequests: integer('max_requests').notNull(),
  
  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
  
  isBlocked: boolean('is_blocked').notNull().default(false),
  blockedUntil: timestamp('blocked_until'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  identifierEndpointIdx: unique('rate_limits_identifier_endpoint_idx').on(table.identifier, table.endpoint, table.windowStart),
  identifierIdx: index('rate_limits_identifier_idx').on(table.identifier),
}));



// ==================== ROLES & PERMISSIONS ====================

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  priority: integer('priority').notNull().default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessNameIdx: index('roles_business_name_idx').on(table.businessId, table.name),
  businessIdx: index('roles_business_idx').on(table.businessId),
  isSystemIdx: index('roles_is_system_idx').on(table.isSystem),
}));

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  resource: permissionResourceEnum('resource').notNull(),
  action: permissionActionEnum('action').notNull(),
  conditions: jsonb('conditions'), // {"own_data_only": true, "max_amount": 10000}
  isAllowed: boolean('is_allowed').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  roleResourceActionIdx: unique('permissions_role_resource_action_idx').on(table.roleId, table.resource, table.action),
  roleIdx: index('permissions_role_idx').on(table.roleId),
  resourceIdx: index('permissions_resource_idx').on(table.resource),
}));

export const userPermissionOverrides = pgTable('user_permission_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  resource: permissionResourceEnum('resource').notNull(),
  action: permissionActionEnum('action').notNull(),
  isAllowed: boolean('is_allowed').notNull(),
  reason: text('reason'),
  expiresAt: timestamp('expires_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userBusinessResourceActionIdx: unique('user_perm_override_unique').on(table.userId, table.businessId, table.resource, table.action),
  userBusinessIdx: index('user_perm_override_user_business_idx').on(table.userId, table.businessId),
}));

// ==================== RETAIL BUSINESSES ====================

export const retailBusinesses = pgTable('retail_businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  businessType: businessTypeEnum('business_type').notNull().default('RETAIL'),
  industryType: varchar('industry_type', { length: 100 }),
  
  // Inventory settings
  tracksInventory: boolean('tracks_inventory').notNull().default(true),
  inventoryMethod: inventoryMethodEnum('inventory_method').notNull().default('FIFO'),
  allowNegativeStock: boolean('allow_negative_stock').notNull().default(false),
  lowStockAlertEnabled: boolean('low_stock_alert_enabled').notNull().default(true),
  
  // Business behavior settings
  autoNumbering: boolean('auto_numbering').notNull().default(true),
  billPrefix: varchar('bill_prefix', { length: 20 }).default('INV'),
  billNumberFormat: varchar('bill_number_format', { length: 50 }).default('{PREFIX}-{YEAR}-{NUMBER}'),
  nextBillNumber: integer('next_bill_number').notNull().default(1),
  
  // Pricing & tax settings
  defaultTaxRate: decimal('default_tax_rate', { precision: 5, scale: 2 }).default('0.00'),
  taxInclusive: boolean('tax_inclusive').notNull().default(false),
  enableRounding: boolean('enable_rounding').notNull().default(true),
  roundingPrecision: integer('rounding_precision').default(0), // 0 = nearest whole, 1 = 0.5, 2 = 0.25
  
  // Service-based settings
  isServiceBased: boolean('is_service_based').notNull().default(false),
  serviceCategories: jsonb('service_categories'),
  allowMaterialInService: boolean('allow_material_in_service').notNull().default(true),
  
  // Registration details
  registrationNumber: varchar('registration_number', { length: 100 }),
  taxNumber: varchar('tax_number', { length: 100 }),
  gstNumber: varchar('gst_number', { length: 50 }),
  panNumber: varchar('pan_number', { length: 20 }),
  
  // Contact information
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: text('website'),
  
  // Branding
  logo: text('logo'),
  coverImage: text('cover_image'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3B82F6'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#10B981'),
  
  // Addresses
  address: jsonb('address'),
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  
  // Operating details
  businessHours: jsonb('business_hours'),
  holidays: jsonb('holidays'),
  socialMedia: jsonb('social_media'),
  
  // Settings & configurations
  settings: jsonb('settings'),
  billingSettings: jsonb('billing_settings'),
  paymentSettings: jsonb('payment_settings'),
  notificationSettings: jsonb('notification_settings'),
  analyticsSettings: jsonb('analytics_settings'),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  isSuspended: boolean('is_suspended').notNull().default(false),
  suspensionReason: text('suspension_reason'),
  
  // Subscription
  subscriptionPlan: subscriptionPlanEnum('subscription_plan').notNull().default('FREE'),
  subscriptionStartedAt: timestamp('subscription_started_at'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  trialEndsAt: timestamp('trial_ends_at'),
  
  // Quotas
  monthlyImageQuota: integer('monthly_image_quota').notNull().default(5),
  usedImageQuota: integer('used_image_quota').notNull().default(0),
  lastImageQuotaReset: timestamp('last_image_quota_reset').defaultNow(),
  monthlyAiQueryQuota: integer('monthly_ai_query_quota').notNull().default(100),
  usedAiQueryQuota: integer('used_ai_query_quota').notNull().default(0),
  lastAiQuotaReset: timestamp('last_ai_quota_reset').defaultNow(),
  
  metadata: jsonb('metadata'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index('retail_businesses_owner_idx').on(table.ownerId),
  slugIdx: index('retail_businesses_slug_idx').on(table.slug),
  activeIdx: index('retail_businesses_active_idx').on(table.isActive),
  businessTypeIdx: index('retail_businesses_business_type_idx').on(table.businessType),
  tracksInventoryIdx: index('retail_businesses_tracks_inventory_idx').on(table.tracksInventory),
  subscriptionPlanIdx: index('retail_businesses_subscription_plan_idx').on(table.subscriptionPlan),
  deletedAtIdx: index('retail_businesses_deleted_at_idx').on(table.deletedAt),
}));

// ==================== BUSINESS STAFF ====================

export const businessStaff = pgTable('business_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  position: varchar('position', { length: 100 }),
  department: varchar('department', { length: 100 }),
  employeeCode: varchar('employee_code', { length: 50 }),
  
  // Compensation
  salary: decimal('salary', { precision: 15, scale: 2 }),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
  commissionType: varchar('commission_type', { length: 50 }), // PER_SALE, PERCENTAGE, TIERED
  
  // Employment dates
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  leftAt: timestamp('left_at'),
  
  // Permissions
  isActive: boolean('is_active').notNull().default(true),
  canCreateBills: boolean('can_create_bills').notNull().default(true),
  canApproveBills: boolean('can_approve_bills').notNull().default(false),
  canManageMoney: boolean('can_manage_money').notNull().default(false),
  canAccessReports: boolean('can_access_reports').notNull().default(false),
  canManageInventory: boolean('can_manage_inventory').notNull().default(false),
  canManageCustomers: boolean('can_manage_customers').notNull().default(true),
  canGiveDiscounts: boolean('can_give_discounts').notNull().default(true),
  
  // Limits
  maxBillAmount: decimal('max_bill_amount', { precision: 15, scale: 2 }),
  maxDiscountPercent: decimal('max_discount_percent', { precision: 5, scale: 2 }).default('0.00'),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 15, scale: 2 }),
  
  // Working hours
  workingHours: jsonb('working_hours'),
  weeklyHours: integer('weekly_hours'),
  
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessUserIdx: unique('business_staff_business_user_idx').on(table.businessId, table.userId),
  businessIdx: index('business_staff_business_idx').on(table.businessId),
  userIdx: index('business_staff_user_idx').on(table.userId),
  roleIdx: index('business_staff_role_idx').on(table.roleId),
  isActiveIdx: index('business_staff_is_active_idx').on(table.isActive),
}));

// ==================== CUSTOMERS ====================

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  customerCode: varchar('customer_code', { length: 50 }).notNull(),
  
  // Personal information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  companyName: varchar('company_name', { length: 255 }),
  customerType: varchar('customer_type', { length: 50 }).default('INDIVIDUAL'), // INDIVIDUAL, BUSINESS
  
  // Contact information
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  alternatePhone: varchar('alternate_phone', { length: 20 }),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  
  // Important dates
  dateOfBirth: timestamp('date_of_birth'),
  anniversary: timestamp('anniversary'),
  
  // Addresses
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  
  // Tax information
  gstNumber: varchar('gst_number', { length: 50 }),
  panNumber: varchar('pan_number', { length: 20 }),
  
  // Financial tracking
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }).default('0.00'),
  outstandingBalance: decimal('outstanding_balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalPurchases: decimal('total_purchases', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalPayments: decimal('total_payments', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Wallet/Advance payments
  walletBalance: decimal('wallet_balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalDeposits: decimal('total_deposits', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalWithdrawals: decimal('total_withdrawals', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Credit management
  creditDays: integer('credit_days').default(0),
  isCreditAllowed: boolean('is_credit_allowed').notNull().default(false),
  
  // Communication preferences
  preferredPaymentMethod: paymentMethodEnum('preferred_payment_method'),
  preferredCommunicationChannel: notificationChannelEnum('preferred_communication_channel'),
  sendWhatsappBills: boolean('send_whatsapp_bills').notNull().default(true),
  sendSmsBills: boolean('send_sms_bills').notNull().default(false),
  sendEmailBills: boolean('send_email_bills').notNull().default(false),
  
  // Loyalty program
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  loyaltyTier: varchar('loyalty_tier', { length: 50 }),
  lifetimeValue: decimal('lifetime_value', { precision: 15, scale: 2 }).default('0.00'),
  
  // Marketing
  notes: text('notes'),
  tags: jsonb('tags'),
  customFields: jsonb('custom_fields'),
  source: varchar('source', { length: 100 }),
  referredBy: uuid('referred_by').references((): AnyPgColumn => customers.id, { onDelete: 'set null' }),
  
  // Purchase behavior
  lastPurchaseDate: timestamp('last_purchase_date'),
  totalBillsCount: integer('total_bills_count').notNull().default(0),
  avgBillAmount: decimal('avg_bill_amount', { precision: 15, scale: 2 }).default('0.00'),
  frequentProducts: jsonb('frequent_products'), // Array of product IDs
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  isBlacklisted: boolean('is_blacklisted').notNull().default(false),
  blacklistReason: text('blacklist_reason'),
  isVip: boolean('is_vip').notNull().default(false),
  
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessCodeIdx: unique('customers_business_code_idx').on(table.businessId, table.customerCode),
  businessIdx: index('customers_business_idx').on(table.businessId),
  phoneIdx: index('customers_phone_idx').on(table.phone),
  emailIdx: index('customers_email_idx').on(table.email),
  whatsappIdx: index('customers_whatsapp_idx').on(table.whatsappNumber),
  outstandingIdx: index('customers_outstanding_idx').on(table.outstandingBalance),
  walletIdx: index('customers_wallet_idx').on(table.walletBalance),
  isActiveIdx: index('customers_is_active_idx').on(table.isActive),
  isVipIdx: index('customers_is_vip_idx').on(table.isVip),
  deletedAtIdx: index('customers_deleted_at_idx').on(table.deletedAt),
}));

// NEW: Customer purchase patterns for smart suggestions
export const customerPurchasePatterns = pgTable('customer_purchase_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  
  // Purchase frequency
  purchaseCount: integer('purchase_count').notNull().default(1),
  lastPurchaseDate: timestamp('last_purchase_date').notNull(),
  firstPurchaseDate: timestamp('first_purchase_date').notNull(),
  avgPurchaseInterval: integer('avg_purchase_interval'), // Days
  
  // Pricing patterns
  avgQuantity: decimal('avg_quantity', { precision: 10, scale: 2 }),
  avgPrice: decimal('avg_price', { precision: 15, scale: 2 }),
  lastPrice: decimal('last_price', { precision: 15, scale: 2 }),
  
  // Prediction data
  predictedNextPurchase: timestamp('predicted_next_purchase'),
  confidence: decimal('confidence', { precision: 5, scale: 2 }), // 0-100
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  customerProductIdx: unique('customer_purchase_patterns_customer_product_idx').on(table.customerId, table.productId),
  businessIdx: index('customer_purchase_patterns_business_idx').on(table.businessId),
  customerIdx: index('customer_purchase_patterns_customer_idx').on(table.customerId),
  productIdx: index('customer_purchase_patterns_product_idx').on(table.productId),
  lastPurchaseDateIdx: index('customer_purchase_patterns_last_purchase_idx').on(table.lastPurchaseDate),
}));

// ==================== MERCHANTS/SUPPLIERS ====================

export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  merchantCode: varchar('merchant_code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  
  // Contact information
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  alternatePhone: varchar('alternate_phone', { length: 20 }),
  whatsappNumber: varchar('whatsapp_number', { length: 20 }),
  website: text('website'),
  
  // Address
  address: jsonb('address'),
  
  // Banking details
  accountNumber: varchar('account_number', { length: 100 }),
  accountHolderName: varchar('account_holder_name', { length: 255 }),
  bankName: varchar('bank_name', { length: 255 }),
  branchName: varchar('branch_name', { length: 255 }),
  ifscCode: varchar('ifsc_code', { length: 20 }),
  swiftCode: varchar('swift_code', { length: 20 }),
  
  // Tax details
  gstNumber: varchar('gst_number', { length: 50 }),
  panNumber: varchar('pan_number', { length: 20 }),
  taxNumber: varchar('tax_number', { length: 100 }),
  
  // Financial tracking
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }).default('0.00'),
  outstandingBalance: decimal('outstanding_balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalPurchases: decimal('total_purchases', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalPayments: decimal('total_payments', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Terms & conditions
  paymentTerms: integer('payment_terms').default(30), // Days
  deliveryTerms: text('delivery_terms'),
  returnPolicy: text('return_policy'),
  
  // Performance tracking
  rating: decimal('rating', { precision: 3, scale: 2 }),
  totalOrders: integer('total_orders').notNull().default(0),
  avgDeliveryTime: integer('avg_delivery_time'), // Days
  onTimeDeliveryRate: decimal('on_time_delivery_rate', { precision: 5, scale: 2 }), // Percentage
  
  // Categories they supply
  categories: jsonb('categories'),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  isPreferred: boolean('is_preferred').notNull().default(false),
  
  notes: text('notes'),
  tags: jsonb('tags'),
  metadata: jsonb('metadata'),
  
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessCodeIdx: unique('merchants_business_code_idx').on(table.businessId, table.merchantCode),
  businessIdx: index('merchants_business_idx').on(table.businessId),
  phoneIdx: index('merchants_phone_idx').on(table.phone),
  emailIdx: index('merchants_email_idx').on(table.email),
  outstandingIdx: index('merchants_outstanding_idx').on(table.outstandingBalance),
  isActiveIdx: index('merchants_is_active_idx').on(table.isActive),
  isPreferredIdx: index('merchants_is_preferred_idx').on(table.isPreferred),
  deletedAtIdx: index('merchants_deleted_at_idx').on(table.deletedAt),
}));

// ==================== PRODUCT MANAGEMENT ====================

export const productCategories = pgTable('product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id').references((): AnyPgColumn => productCategories.id, { onDelete: 'cascade' }),
  categoryType: varchar('category_type', { length: 50 }).notNull().default('PRODUCT'), // PRODUCT, SERVICE, MATERIAL
  
  // Display
  image: text('image'),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 7 }),
  sortOrder: integer('sort_order').default(0),
  
  // Tax settings
  defaultTaxRate: decimal('default_tax_rate', { precision: 5, scale: 2 }),
  
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessNameIdx: unique('product_categories_business_name_idx').on(table.businessId, table.name),
  businessIdx: index('product_categories_business_idx').on(table.businessId),
  parentIdx: index('product_categories_parent_idx').on(table.parentId),
  slugIdx: index('product_categories_slug_idx').on(table.slug),
  categoryTypeIdx: index('product_categories_category_type_idx').on(table.categoryType),
}));

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  productCode: varchar('product_code', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 500 }),
  
  // Product classification
  productType: productTypeEnum('product_type').notNull().default('PHYSICAL_PRODUCT'),
  trackQuantity: boolean('track_quantity').notNull().default(true),
  trackCost: boolean('track_cost').notNull().default(true),
  
  // Service-specific
  isService: boolean('is_service').notNull().default(false),
  serviceDuration: integer('service_duration'), // Minutes
  serviceCategory: varchar('service_category', { length: 100 }),
  
  // Composite pricing (Service + Materials)
  includesMaterial: boolean('includes_material').notNull().default(false),
  materialCost: decimal('material_cost', { precision: 15, scale: 2 }).default('0.00'),
  laborCost: decimal('labor_cost', { precision: 15, scale: 2 }).default('0.00'),
  
  // Unit and pricing
  unit: productUnitEnum('unit').notNull(),
  purchasePrice: decimal('purchase_price', { precision: 15, scale: 2 }).default('0.00'),
  sellingPrice: decimal('selling_price', { precision: 15, scale: 2 }).notNull().default('0.00'),
  mrp: decimal('mrp', { precision: 15, scale: 2 }),
  wholesalePrice: decimal('wholesale_price', { precision: 15, scale: 2 }),
  minSellingPrice: decimal('min_selling_price', { precision: 15, scale: 2 }), // Cannot sell below this
  maxDiscountPercent: decimal('max_discount_percent', { precision: 5, scale: 2 }).default('100.00'),
  
  // Tax
  taxPercent: decimal('tax_percent', { precision: 5, scale: 2 }).default('0.00'),
  hsnCode: varchar('hsn_code', { length: 50 }),
  sacCode: varchar('sac_code', { length: 50 }),
  isTaxable: boolean('is_taxable').notNull().default(true),
  taxCategory: varchar('tax_category', { length: 100 }),
  
  // Inventory
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).default('0.00'),
  minimumStock: decimal('minimum_stock', { precision: 10, scale: 2 }),
  maximumStock: decimal('maximum_stock', { precision: 10, scale: 2 }),
  reorderPoint: decimal('reorder_point', { precision: 10, scale: 2 }),
  reorderQuantity: decimal('reorder_quantity', { precision: 10, scale: 2 }),
  
  // Identification
  barcode: varchar('barcode', { length: 255 }),
  sku: varchar('sku', { length: 255 }),
  upc: varchar('upc', { length: 50 }),
  ean: varchar('ean', { length: 50 }),
  isbn: varchar('isbn', { length: 50 }),
  qrCode: text('qr_code'),
  
  // Physical properties
  weight: decimal('weight', { precision: 10, scale: 3 }),
  weightUnit: varchar('weight_unit', { length: 20 }).default('kg'),
  dimensions: jsonb('dimensions'), // {length, width, height, unit}
  
  // Images
  images: jsonb('images'), // Array of URLs
  primaryImage: text('primary_image'),
  thumbnailImage: text('thumbnail_image'),
  
  // Variants
  hasVariants: boolean('has_variants').notNull().default(false),
  variantAttributes: jsonb('variant_attributes'), // ["size", "color"]
  
  // Additional info
  brand: varchar('brand', { length: 255 }),
  manufacturer: varchar('manufacturer', { length: 255 }),
  countryOfOrigin: varchar('country_of_origin', { length: 100 }),
  specifications: jsonb('specifications'),
  features: jsonb('features'),
  tags: jsonb('tags'),
  
  // SEO
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  metaKeywords: text('meta_keywords'),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  isAvailableOnline: boolean('is_available_online').notNull().default(false),
  
  // Tracking
  viewCount: integer('view_count').notNull().default(0),
  totalSold: decimal('total_sold', { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }).notNull().default('0.00'),
  lastSoldAt: timestamp('last_sold_at'),
  lastRestockedAt: timestamp('last_restocked_at'),
  
  // Profitability
  profitMargin: decimal('profit_margin', { precision: 5, scale: 2 }),
  averageCost: decimal('average_cost', { precision: 15, scale: 2 }), // For AVERAGE costing method
  
  metadata: jsonb('metadata'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessCodeIdx: unique('products_business_code_idx').on(table.businessId, table.productCode),
  businessIdx: index('products_business_idx').on(table.businessId),
  categoryIdx: index('products_category_idx').on(table.categoryId),
  productTypeIdx: index('products_product_type_idx').on(table.productType),
  trackQuantityIdx: index('products_track_quantity_idx').on(table.trackQuantity),
  isServiceIdx: index('products_is_service_idx').on(table.isService),
  barcodeIdx: index('products_barcode_idx').on(table.barcode),
  skuIdx: index('products_sku_idx').on(table.sku),
  slugIdx: index('products_slug_idx').on(table.slug),
  isActiveIdx: index('products_is_active_idx').on(table.isActive),
  currentStockIdx: index('products_current_stock_idx').on(table.currentStock),
  deletedAtIdx: index('products_deleted_at_idx').on(table.deletedAt),
}));

// NEW: Service pricing templates
export const servicePricingTemplates = pgTable('service_pricing_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Base service cost
  baseServiceCost: decimal('base_service_cost', { precision: 15, scale: 2 }).notNull(),
  
  // Material components (can be variable)
  includedMaterials: jsonb('included_materials'), // [{productId, quantity, price, isVariable}]
  allowMaterialModification: boolean('allow_material_modification').notNull().default(true),
  
  // Pricing variations
  pricingTiers: jsonb('pricing_tiers'), // [{name, minQuantity, price}]
  
  // Time estimates
  estimatedDuration: integer('estimated_duration'), // Minutes
  
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('service_pricing_templates_business_idx').on(table.businessId),
  productIdx: index('service_pricing_templates_product_idx').on(table.productId),
  isActiveIdx: index('service_pricing_templates_is_active_idx').on(table.isActive),
}));

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantName: varchar('variant_name', { length: 100 }).notNull(),
  attributes: jsonb('attributes').notNull(), // {"size": "Large", "color": "Red"}
  sku: varchar('sku', { length: 255 }),
  barcode: varchar('barcode', { length: 255 }),
  
  // Pricing
  priceAdjustment: decimal('price_adjustment', { precision: 15, scale: 2 }).default('0.00'),
  purchasePrice: decimal('purchase_price', { precision: 15, scale: 2 }),
  sellingPrice: decimal('selling_price', { precision: 15, scale: 2 }),
  mrp: decimal('mrp', { precision: 15, scale: 2 }),
  
  // Inventory
  stockQuantity: decimal('stock_quantity', { precision: 10, scale: 2 }).notNull().default('0.00'),
  minimumStock: decimal('minimum_stock', { precision: 10, scale: 2 }),
  
  // Physical
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'),
  
  // Images
  images: jsonb('images'),
  primaryImage: text('primary_image'),
  
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').default(0),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_variants_product_idx').on(table.productId),
  skuIdx: index('product_variants_sku_idx').on(table.sku),
  barcodeIdx: index('product_variants_barcode_idx').on(table.barcode),
  isActiveIdx: index('product_variants_is_active_idx').on(table.isActive),
}));

export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  imageType: varchar('image_type', { length: 50 }).notNull().default('PRODUCT'),
  isPrimary: boolean('is_primary').notNull().default(false),
  sortOrder: integer('sort_order').default(0),
  altText: varchar('alt_text', { length: 255 }),
  caption: text('caption'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  width: integer('width'),
  height: integer('height'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_images_product_idx').on(table.productId),
  variantIdx: index('product_images_variant_idx').on(table.variantId),
  typeIdx: index('product_images_type_idx').on(table.imageType),
  isPrimaryIdx: index('product_images_is_primary_idx').on(table.isPrimary),
}));

// ==================== QR CODE MANAGEMENT ====================

export const qrCodeBatches = pgTable('qr_code_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  batchCode: varchar('batch_code', { length: 100 }).notNull(),
  batchName: varchar('batch_name', { length: 255 }).notNull(),
  totalCodes: integer('total_codes').notNull(),
  usedCodes: integer('used_codes').notNull().default(0),
  activeCodes: integer('active_codes').notNull().default(0),
  purpose: varchar('purpose', { length: 255 }),
  notes: text('notes'),
  expiredAt: timestamp('expired_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('qr_code_batches_business_idx').on(table.businessId),
  productIdx: index('qr_code_batches_product_idx').on(table.productId),
  batchCodeIdx: index('qr_code_batches_batch_code_idx').on(table.batchCode),
}));

// ==================== MONEY MANAGEMENT ====================

export const expenseCategories = pgTable('expense_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(), // Rent, Salary, Internet
  type: varchar('type', { length: 50 }).notNull().default('EXPENSE'), // EXPENSE, INCOME
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false), // e.g. 'Bill Payment' automatic category
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    businessIdx: index('expense_categories_business_idx').on(table.businessId),
    typeIdx: index('expense_categories_type_idx').on(table.type),
}));

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => expenseCategories.id, { onDelete: 'set null' }),
  
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  date: timestamp('date').notNull().defaultNow(),
  
  description: text('description'),
  paymentMethod: paymentMethodEnum('payment_method').notNull().default('CASH'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  
  receiptUrl: text('receipt_url'),
  vendor: varchar('vendor', { length: 255 }), // Who was paid?
  
  // Linkages
  linkedBillId: uuid('linked_bill_id').references(() => bills.id, { onDelete: 'set null' }), // If paid for a specific supplier bill
  linkedUserId: uuid('linked_user_id').references(() => users.id, { onDelete: 'set null' }), // Reimbursements, Salary, etc.
  
  status: varchar('status', { length: 50 }).notNull().default('PAID'), // PAID, PENDING
  
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    businessIdx: index('expenses_business_idx').on(table.businessId),
    categoryIdx: index('expenses_category_idx').on(table.categoryId),
    dateIdx: index('expenses_date_idx').on(table.date),
}));

// ==================== STOCK MOVEMENTS & INVENTORY TRACKING ====================

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  
  movementType: stockMovementTypeEnum('movement_type').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  
  // Stock levels
  stockBefore: decimal('stock_before', { precision: 10, scale: 2 }).notNull(),
  stockAfter: decimal('stock_after', { precision: 10, scale: 2 }).notNull(),
  
  // Cost tracking
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }),
  
  // References
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'set null' }),
  billItemId: uuid('bill_item_id').references(() => billItems.id, { onDelete: 'set null' }),
  purchaseOrderId: uuid('purchase_order_id').references((): AnyPgColumn => purchaseOrders.id, { onDelete: 'set null' }),
  
  // Notes
  reason: varchar('reason', { length: 255 }),
  notes: text('notes'),
  
  // Tracking
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  movementDate: timestamp('movement_date').notNull().defaultNow(),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('stock_movements_business_idx').on(table.businessId),
  productIdx: index('stock_movements_product_idx').on(table.productId),
  variantIdx: index('stock_movements_variant_idx').on(table.variantId),
  movementTypeIdx: index('stock_movements_type_idx').on(table.movementType),
  billIdx: index('stock_movements_bill_idx').on(table.billId),
  movementDateIdx: index('stock_movements_date_idx').on(table.movementDate),
}));

// ==================== MONEY TRANSACTIONS ====================

export const moneyTransactions = pgTable('money_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  
  transactionType: transactionTypeEnum('transaction_type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  
  // References
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'set null' }),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  
  // Balance tracking
  previousBalance: decimal('previous_balance', { precision: 15, scale: 2 }),
  newBalance: decimal('new_balance', { precision: 15, scale: 2 }),
  
  // Payment details
  method: paymentMethodEnum('method'),
  referenceNumber: varchar('reference_number', { length: 255 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  
  // Account tracking (for transfers)
  fromAccount: varchar('from_account', { length: 100 }),
  toAccount: varchar('to_account', { length: 100 }),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('COMPLETED'), // COMPLETED, PENDING, FAILED, CANCELLED
  
  // Notes
  description: text('description'),
  notes: text('notes'),
  
  // Tracking
  performedBy: uuid('performed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  transactionDate: timestamp('transaction_date').notNull().defaultNow(),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('money_transactions_business_idx').on(table.businessId),
  customerIdx: index('money_transactions_customer_idx').on(table.customerId),
  merchantIdx: index('money_transactions_merchant_idx').on(table.merchantId),
  billIdx: index('money_transactions_bill_idx').on(table.billId),
  paymentIdx: index('money_transactions_payment_idx').on(table.paymentId),
  transactionTypeIdx: index('money_transactions_type_idx').on(table.transactionType),
  statusIdx: index('money_transactions_status_idx').on(table.status),
  transactionDateIdx: index('money_transactions_date_idx').on(table.transactionDate),
}));

// ==================== CUSTOMER WALLET TRANSACTIONS ====================

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // DEPOSIT, WITHDRAWAL, USED_IN_BILL, REFUND
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  
  // Balance tracking
  balanceBefore: decimal('balance_before', { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }).notNull(),
  
  // References
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'set null' }),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  moneyTransactionId: uuid('money_transaction_id').references(() => moneyTransactions.id, { onDelete: 'set null' }),
  
  // Payment method (for deposits)
  paymentMethod: paymentMethodEnum('payment_method'),
  referenceNumber: varchar('reference_number', { length: 255 }),
  
  // Notes
  description: text('description'),
  notes: text('notes'),
  
  // Tracking
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  transactionDate: timestamp('transaction_date').notNull().defaultNow(),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessCustomerIdx: index('wallet_transactions_business_customer_idx').on(table.businessId, table.customerId),
  customerIdx: index('wallet_transactions_customer_idx').on(table.customerId),
  billIdx: index('wallet_transactions_bill_idx').on(table.billId),
  paymentIdx: index('wallet_transactions_payment_idx').on(table.paymentId),
  transactionDateIdx: index('wallet_transactions_date_idx').on(table.transactionDate),
}));

// ==================== MESSAGE TEMPLATES ====================

export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  type: messageTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  
  // Template content
  subject: varchar('subject', { length: 500 }),
  content: text('content').notNull(),
  htmlContent: text('html_content'),
  
  // Variables that can be used in template
  variables: jsonb('variables'), // ["customerName", "billNumber", "amount"]
  
  // Usage
  isSystem: boolean('is_system').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  
  // Defaults
  isDefault: boolean('is_default').notNull().default(false),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('message_templates_business_idx').on(table.businessId),
  typeIdx: index('message_templates_type_idx').on(table.type),
  channelIdx: index('message_templates_channel_idx').on(table.channel),
  isActiveIdx: index('message_templates_active_idx').on(table.isActive),
  isDefaultIdx: index('message_templates_default_idx').on(table.isDefault),
}));

// ==================== SECURITY EVENTS ====================

export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  eventType: varchar('event_type', { length: 100 }).notNull(), // LOGIN_FAILED, UNAUTHORIZED_ACCESS, PASSWORD_CHANGE, SESSION_REVOKED, DATA_EXPORT, etc.
  severity: varchar('severity', { length: 20 }).notNull().default('INFO'), // INFO, WARNING, CRITICAL
  
  // Event details
  description: text('description').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  location: jsonb('location'), // {country, city, coordinates}
  
  // Request details
  endpoint: varchar('endpoint', { length: 500 }),
  method: varchar('method', { length: 10 }),
  requestId: varchar('request_id', { length: 100 }),
  
  // Additional context
  metadata: jsonb('metadata'),
  resolved: boolean('resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('security_events_business_idx').on(table.businessId),
  userIdx: index('security_events_user_idx').on(table.userId),
  eventTypeIdx: index('security_events_type_idx').on(table.eventType),
  severityIdx: index('security_events_severity_idx').on(table.severity),
  createdAtIdx: index('security_events_created_at_idx').on(table.createdAt),
  resolvedIdx: index('security_events_resolved_idx').on(table.resolved),
}));

// ==================== PURCHASE ORDERS ====================

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'restrict' }),
  
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  orderDate: timestamp('order_date').notNull().defaultNow(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  
  // Amounts
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull().default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  shippingCost: decimal('shipping_cost', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  balanceAmount: decimal('balance_amount', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  paymentStatus: varchar('payment_status', { length: 50 }).default('PENDING'), // PENDING, PARTIAL, PAID
  
  // Delivery tracking
  trackingNumber: varchar('tracking_number', { length: 255 }),
  carrier: varchar('carrier', { length: 100 }),
  
  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  
  // Tracking
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
  
  metadata: jsonb('metadata'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessOrderNumberIdx: unique('purchase_orders_business_order_number_idx').on(table.businessId, table.orderNumber),
  businessIdx: index('purchase_orders_business_idx').on(table.businessId),
  merchantIdx: index('purchase_orders_merchant_idx').on(table.merchantId),
  statusIdx: index('purchase_orders_status_idx').on(table.status),
  orderDateIdx: index('purchase_orders_date_idx').on(table.orderDate),
  deletedAtIdx: index('purchase_orders_deleted_at_idx').on(table.deletedAt),
}));

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  
  productName: varchar('product_name', { length: 255 }).notNull(),
  productCode: varchar('product_code', { length: 100 }),
  
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: decimal('received_quantity', { precision: 10, scale: 2 }).notNull().default('0.00'),
  
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  taxPercent: decimal('tax_percent', { precision: 5, scale: 2 }).default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).default('0.00'),
  
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('purchase_order_items_order_idx').on(table.purchaseOrderId),
  productIdx: index('purchase_order_items_product_idx').on(table.productId),
}));

// ==================== BANK RECONCILIATION ====================

export const reconciliations = pgTable('reconciliations', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  
  reconciliationDate: timestamp('reconciliation_date').notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 100 }),
  
  // Balances
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).notNull(),
  closingBalance: decimal('closing_balance', { precision: 15, scale: 2 }).notNull(),
  bookBalance: decimal('book_balance', { precision: 15, scale: 2 }).notNull(),
  bankBalance: decimal('bank_balance', { precision: 15, scale: 2 }).notNull(),
  
  // Discrepancies
  totalDeposits: decimal('total_deposits', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalWithdrawals: decimal('total_withdrawals', { precision: 15, scale: 2 }).notNull().default('0.00'),
  outstandingDeposits: decimal('outstanding_deposits', { precision: 15, scale: 2 }).notNull().default('0.00'),
  outstandingWithdrawals: decimal('outstanding_withdrawals', { precision: 15, scale: 2 }).notNull().default('0.00'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, IN_PROGRESS, RECONCILED, DISPUTED
  
  // Notes
  notes: text('notes'),
  discrepancies: jsonb('discrepancies'), // Array of unmatched transactions
  
  // Tracking
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  reconciledBy: uuid('reconciled_by').references(() => users.id, { onDelete: 'set null' }),
  reconciledAt: timestamp('reconciled_at'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('reconciliations_business_idx').on(table.businessId),
  reconciliationDateIdx: index('reconciliations_date_idx').on(table.reconciliationDate),
  statusIdx: index('reconciliations_status_idx').on(table.status),
}));

export const reconciliationTransactions = pgTable('reconciliation_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reconciliationId: uuid('reconciliation_id').notNull().references(() => reconciliations.id, { onDelete: 'cascade' }),
  
  // Transaction reference
  moneyTransactionId: uuid('money_transaction_id').references(() => moneyTransactions.id, { onDelete: 'set null' }),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  
  // Bank statement data
  bankTransactionId: varchar('bank_transaction_id', { length: 255 }),
  bankTransactionDate: timestamp('bank_transaction_date'),
  bankAmount: decimal('bank_amount', { precision: 15, scale: 2 }),
  bankDescription: text('bank_description'),
  
  // Matching status
  isMatched: boolean('is_matched').notNull().default(false),
  matchedAt: timestamp('matched_at'),
  matchedBy: uuid('matched_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Discrepancy
  discrepancyAmount: decimal('discrepancy_amount', { precision: 15, scale: 2 }),
  discrepancyReason: text('discrepancy_reason'),
  
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  reconciliationIdx: index('reconciliation_transactions_reconciliation_idx').on(table.reconciliationId),
  moneyTransactionIdx: index('reconciliation_transactions_money_transaction_idx').on(table.moneyTransactionId),
  paymentIdx: index('reconciliation_transactions_payment_idx').on(table.paymentId),
  isMatchedIdx: index('reconciliation_transactions_matched_idx').on(table.isMatched),
}));

// ==================== STAFF ACTIVITY TRACKING ====================

export const staffActivity = pgTable('staff_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => businessStaff.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  activityType: varchar('activity_type', { length: 100 }).notNull(), // BILL_CREATED, PAYMENT_RECORDED, CUSTOMER_ADDED, PRODUCT_UPDATED, etc.
  
  // Entity reference
  entityType: varchar('entity_type', { length: 100 }),
  entityId: uuid('entity_id'),
  
  // Activity details
  description: text('description'),
  action: varchar('action', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, VIEW, APPROVE, etc.
  
  // Metrics
  billAmount: decimal('bill_amount', { precision: 15, scale: 2 }),
  paymentAmount: decimal('payment_amount', { precision: 15, scale: 2 }),
  
  // Location
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Timestamp
  activityDate: timestamp('activity_date').notNull().defaultNow(),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  businessStaffIdx: index('staff_activity_business_staff_idx').on(table.businessId, table.staffId),
  staffIdx: index('staff_activity_staff_idx').on(table.staffId),
  userIdx: index('staff_activity_user_idx').on(table.userId),
  activityTypeIdx: index('staff_activity_type_idx').on(table.activityType),
  entityTypeIdx: index('staff_activity_entity_type_idx').on(table.entityType, table.entityId),
  activityDateIdx: index('staff_activity_date_idx').on(table.activityDate),
}));

// ==================== USER INVITATIONS ====================

export const userInvitations = pgTable('user_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => retailBusinesses.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  
  // Invitation details
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  
  // Invitation token
  invitationToken: varchar('invitation_token', { length: 255 }).notNull().unique(),
  invitationLink: text('invitation_link'),
  
  // Role assignment
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  position: varchar('position', { length: 100 }),
  department: varchar('department', { length: 100 }),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, ACCEPTED, REJECTED, EXPIRED, CANCELLED
  acceptedAt: timestamp('accepted_at'),
  acceptedBy: uuid('accepted_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Expiry
  expiresAt: timestamp('expires_at').notNull(),
  
  // Notes
  message: text('message'),
  notes: text('notes'),
  
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('user_invitations_business_idx').on(table.businessId),
  invitationTokenIdx: index('user_invitations_token_idx').on(table.invitationToken),
  emailIdx: index('user_invitations_email_idx').on(table.email),
  phoneIdx: index('user_invitations_phone_idx').on(table.phone),
  statusIdx: index('user_invitations_status_idx').on(table.status),
  expiresAtIdx: index('user_invitations_expires_at_idx').on(table.expiresAt),
}));