/**
 * Common types used throughout the application
 * All types are strictly typed with no 'any' allowed
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ==================== EXPRESS TYPES ====================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    businessId?: string;
    staffId?: string;
    permissions?: string[];
  };
  businessId?: string;
}

export type RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AsyncRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

// ==================== PAGINATION TYPES ====================

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy: string;
  order: 'ASC' | 'DESC';
}

// ==================== FILTER TYPES ====================

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface CommonFilters extends DateRangeFilter {
  search?: string;
  status?: string;
  isActive?: boolean;
}

export interface BillFilters extends CommonFilters {
  customerId?: string;
  paymentStatus?: string;
  approvalStatus?: string;
  createdBy?: string;
  minAmount?: string;
  maxAmount?: string;
}

export interface ProductFilters extends CommonFilters {
  categoryId?: string;
  productType?: string;
  trackQuantity?: boolean;
  lowStock?: boolean;
  minPrice?: string;
  maxPrice?: string;
}

export interface CustomerFilters extends CommonFilters {
  customerType?: string;
  isVip?: boolean;
  isBlacklisted?: boolean;
  hasOutstanding?: boolean;
}

export interface PaymentFilters extends CommonFilters {
  customerId?: string;
  method?: string;
  status?: string;
  minAmount?: string;
  maxAmount?: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
}

// ==================== DATABASE TYPES ====================

export type DatabaseTransaction = {
  execute: <T>(query: string, params?: unknown[]) => Promise<T>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};

// ==================== FILE UPLOAD TYPES ====================

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag?: string;
}

// ==================== JWT TYPES ====================

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  businessId?: string;
  staffId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ==================== PERMISSION TYPES ====================

export type PermissionResource =
  | 'DASHBOARD'
  | 'CUSTOMERS'
  | 'MERCHANTS'
  | 'PRODUCTS'
  | 'BILLS'
  | 'PAYMENTS'
  | 'REPORTS'
  | 'SETTINGS'
  | 'USERS'
  | 'ROLES'
  | 'MESSAGES'
  | 'AI_FEATURES'
  | 'ANALYTICS'
  | 'MONEY_MANAGEMENT'
  | 'INVENTORY'
  | 'APPROVALS'
  | 'AUDIT_LOGS';

export type PermissionAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'MANAGE'
  | 'VOID';

export interface PermissionCondition {
  own_data_only?: boolean;
  max_amount?: number;
  require_approval_above?: number;
  [key: string]: unknown;
}

// ==================== BILLING TYPES ====================

export interface BillCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  adjustmentAmount: number;
  roundOffAmount: number;
  totalAmount: number;
}

export interface BillItemCalculation {
  quantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
}

// ==================== PAYMENT ALLOCATION TYPES ====================

export interface PaymentAllocationInput {
  billId: string;
  amount: number;
  allocationOrder: number;
}

export interface PaymentAllocationResult {
  paymentId: string;
  allocations: Array<{
    billId: string;
    allocatedAmount: number;
    billBalanceBefore: number;
    billBalanceAfter: number;
    billStatus: string;
  }>;
  unallocatedAmount: number;
}

// ==================== SMART SUGGESTION TYPES ====================

export interface SmartSuggestionItem {
  productId: string;
  productName: string;
  suggestedQuantity: number;
  lastPrice: number;
  avgPrice: number;
  purchaseCount: number;
  lastPurchaseDate: Date | null;
  confidence: number;
}

export interface SmartSuggestionResponse {
  customerId: string;
  customerName: string;
  suggestions: SmartSuggestionItem[];
}

// ==================== ANALYTICS TYPES ====================

export interface DashboardMetrics {
  today: {
    totalSales: number;
    totalPayments: number;
    totalBills: number;
    cashIn: number;
    cashOut: number;
    outstandingBalance: number;
    newCustomers: number;
  };
  sevenDays: {
    sales: Array<{ date: string; amount: number }>;
    payments: Array<{ date: string; amount: number }>;
    billsCount: Array<{ date: string; count: number }>;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
    paymentMethodBreakdown: Array<{ method: string; amount: number; count: number }>;
  };
  monthly: {
    mrr: number;
    totalRevenue: number;
    totalProfit: number;
    grossProfitMargin: number;
    customerAcquisition: number;
    customerChurn: number;
    averageOrderValue: number;
  };
  predictions: {
    predictedRevenue: number;
    mrrPrediction: number;
    lowStockAlerts: number;
    paymentDueAlerts: number;
  };
}

// ==================== MESSAGE TYPES ====================

export type MessageType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

export interface MessageTemplateVariables {
  [key: string]: string | number | Date;
}

// ==================== AI TYPES ====================

export type AIContentType = 'BANNER' | 'SQL_QUERY' | 'TEXT' | 'IMAGE' | 'PROMOTION' | 'DESCRIPTION' | 'SOCIAL_POST';

export interface AIGenerationRequest {
  type: AIContentType;
  prompt: string;
  businessId: string;
  userId: string;
}

export interface AIGenerationResponse {
  id: string;
  type: AIContentType;
  content?: string;
  imageUrl?: string;
  tokensUsed?: number;
  cost?: number;
  generationTime?: number;
}

// ==================== QR CODE TYPES ====================

export interface QRCodeData {
  businessId: string;
  productId?: string;
  variantId?: string;
  price?: number;
  qrCode: string;
  [key: string]: unknown;
}

export interface QRCodeBatchInput {
  batchName: string;
  productId?: string;
  variantId?: string;
  quantity: number;
  price?: number;
  purpose?: string;
}

// ==================== STOCK MOVEMENT TYPES ====================

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'DAMAGE'
  | 'EXPIRED'
  | 'CONSUMPTION'
  | 'PRODUCTION';

// ==================== MONEY TRANSACTION TYPES ====================

export type MoneyTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'BILL_PAYMENT'
  | 'ADVANCE_PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

// ==================== VALIDATION TYPES ====================

export type ZodSchema<T> = z.ZodType<T>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ path: string; message: string }>;
}

// ==================== AUDIT TYPES ====================

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'APPROVE' | 'REJECT' | 'EXPORT';

export interface AuditLogInput {
  businessId?: string;
  userId?: string;
  action: string;
  actionType: AuditActionType;
  entityType: string;
  entityId?: string;
  entityName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

// ==================== EXPORT TYPES ====================

export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  dateRange?: DateRangeFilter;
  filters?: Record<string, unknown>;
}

// ==================== UTILITY TYPES ====================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ==================== ENVIRONMENT TYPES ====================

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  GUPSHUP_API_KEY?: string;
  OPENAI_API_KEY?: string;
  FRONTEND_URL: string;
  [key: string]: string | undefined;
}

