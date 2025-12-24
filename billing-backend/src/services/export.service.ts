import { db } from '../config/database';
import { customers, bills, products, payments } from '../models/drizzle/schema';
import { eq, sql, and, SQL } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { uploadToS3 } from '../utils/s3';
import { format } from 'date-fns';

// Filter interfaces for each export type
interface CustomerExportFilters {
  isActive?: boolean;
  hasOutstanding?: boolean;
}

interface BillExportFilters {
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

interface ProductExportFilters {
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
}

interface PaymentExportFilters {
  customerId?: string;
  status?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
}

export class DataExportService {
  async exportCustomers(businessId: string, filters: CustomerExportFilters): Promise<string> {
    try {
      logger.info('Exporting customers', { businessId, filters });
      
      const conditions: SQL[] = [eq(customers.businessId, businessId)];

      // Apply filters
      if (filters.isActive !== undefined) {
        conditions.push(eq(customers.isActive, filters.isActive));
      }

      if (filters.hasOutstanding) {
        conditions.push(sql`${customers.outstandingBalance} > 0`);
      }

      const customersData = await db
        .select({
          id: customers.id,
          customerCode: customers.customerCode,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          outstandingBalance: customers.outstandingBalance,
          totalPurchases: customers.totalPurchases,
          totalPayments: customers.totalPayments,
          creditLimit: customers.creditLimit,
          isCreditAllowed: customers.isCreditAllowed,
          isActive: customers.isActive,
          createdAt: customers.createdAt,
          billingAddress: customers.billingAddress,
          shippingAddress: customers.shippingAddress,
        })
        .from(customers)
        .where(and(...conditions));
      
      // Convert to CSV
      const csv = this.convertToCSV(customersData, [
        'id',
        'customerCode',
        'firstName',
        'lastName',
        'email',
        'phone',
        'outstandingBalance',
        'totalPurchases',
        'totalPayments',
        'creditLimit',
        'isCreditAllowed',
        'isActive',
        'createdAt',
      ]);

      const fileName = `exports/customers_${businessId}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      const s3Url = await uploadToS3(Buffer.from(csv), fileName, 'text/csv');
      
      logger.info('Customers exported successfully', { businessId, fileName, recordCount: customersData.length });
      
      return s3Url;
    } catch (error) {
      logger.error('Failed to export customers', { error, businessId });
      throw error;
    }
  }

  async exportBills(businessId: string, filters: BillExportFilters): Promise<string> {
    try {
      logger.info('Exporting bills', { businessId, filters });
      
      const conditions: SQL[] = [eq(bills.businessId, businessId)];

      // Apply filters
      if (filters.status) {
        conditions.push(sql`${bills.status} = ${filters.status}`);
      }

      if (filters.customerId) {
        conditions.push(eq(bills.customerId, filters.customerId));
      }

      if (filters.startDate) {
        conditions.push(sql`${bills.billDate} >= ${new Date(filters.startDate)}`);
      }

      if (filters.endDate) {
        conditions.push(sql`${bills.billDate} <= ${new Date(filters.endDate)}`);
      }

      const billsData = await db
        .select({
          id: bills.id,
          billNumber: bills.billNumber,
          billDate: bills.billDate,
          dueDate: bills.dueDate,
          status: bills.status,
          subtotal: bills.subtotal,
          discountAmount: bills.discountAmount,
          taxAmount: bills.taxAmount,
          totalAmount: bills.totalAmount,
          paidAmount: bills.paidAmount,
          balanceAmount: bills.balanceAmount,
          customerId: bills.customerId,
          notes: bills.notes,
          createdAt: bills.createdAt,
        })
        .from(bills)
        .where(and(...conditions));
      
      // Convert to CSV
      const csv = this.convertToCSV(billsData, [
        'id',
        'billNumber',
        'billDate',
        'dueDate',
        'status',
        'subtotal',
        'discountAmount',
        'taxAmount',
        'totalAmount',
        'paidAmount',
        'balanceAmount',
        'customerId',
        'notes',
        'createdAt',
      ]);

      const fileName = `exports/bills_${businessId}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      const s3Url = await uploadToS3(Buffer.from(csv), fileName, 'text/csv');
      
      logger.info('Bills exported successfully', { businessId, fileName, recordCount: billsData.length });
      
      return s3Url;
    } catch (error) {
      logger.error('Failed to export bills', { error, businessId });
      throw error;
    }
  }

  async exportProducts(businessId: string, filters: ProductExportFilters): Promise<string> {
    try {
      logger.info('Exporting products', { businessId, filters });
      
      const conditions: SQL[] = [eq(products.businessId, businessId)];

      // Apply filters
      if (filters.categoryId) {
        conditions.push(eq(products.categoryId, filters.categoryId));
      }

      if (filters.isActive !== undefined) {
        conditions.push(eq(products.isActive, filters.isActive));
      }

      if (filters.lowStock) {
        conditions.push(sql`${products.currentStock} <= ${products.minimumStock}`);
      }

      const productsData = await db
        .select({
          id: products.id,
          productCode: products.productCode,
          name: products.name,
          description: products.description,
          unit: products.unit,
          purchasePrice: products.purchasePrice,
          sellingPrice: products.sellingPrice,
          mrp: products.mrp,
          currentStock: products.currentStock,
          minimumStock: products.minimumStock,
          categoryId: products.categoryId,
          barcode: products.barcode,
          sku: products.sku,
          hsnCode: products.hsnCode,
          isActive: products.isActive,
          isTaxable: products.isTaxable,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(and(...conditions));
      
      // Convert to CSV
      const csv = this.convertToCSV(productsData, [
        'id',
        'productCode',
        'name',
        'description',
        'unit',
        'purchasePrice',
        'sellingPrice',
        'mrp',
        'currentStock',
        'minimumStock',
        'categoryId',
        'barcode',
        'sku',
        'hsnCode',
        'isActive',
        'isTaxable',
        'createdAt',
      ]);

      const fileName = `exports/products_${businessId}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      const s3Url = await uploadToS3(Buffer.from(csv), fileName, 'text/csv');
      
      logger.info('Products exported successfully', { businessId, fileName, recordCount: productsData.length });
      
      return s3Url;
    } catch (error) {
      logger.error('Failed to export products', { error, businessId });
      throw error;
    }
  }

  async exportPayments(businessId: string, filters: PaymentExportFilters): Promise<string> {
    try {
      logger.info('Exporting payments', { businessId, filters });
      
      const conditions: SQL[] = [eq(payments.businessId, businessId)];

      // Apply filters
      if (filters.customerId) {
        conditions.push(eq(payments.customerId, filters.customerId));
      }

      if (filters.status) {
        conditions.push(sql`${payments.status} = ${filters.status}`);
      }

      if (filters.method) {
        conditions.push(sql`${payments.method} = ${filters.method}`);
      }

      if (filters.startDate) {
        conditions.push(sql`${payments.paymentDate} >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${payments.paymentDate} <= ${new Date(filters.endDate)}`);
      }

      const paymentsData = await db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          paymentDate: payments.paymentDate,
          amount: payments.amount,
          method: payments.method,
          status: payments.status,
          referenceNumber: payments.referenceNumber,
          customerId: payments.customerId,
          notes: payments.notes,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(and(...conditions));
      
      // Convert to CSV
      const csv = this.convertToCSV(paymentsData, [
        'id',
        'paymentNumber',
        'paymentDate',
        'amount',
        'method',
        'status',
        'referenceNumber',
        'customerId',
        'notes',
        'createdAt',
      ]);

      const fileName = `exports/payments_${businessId}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      const s3Url = await uploadToS3(Buffer.from(csv), fileName, 'text/csv');
      
      logger.info('Payments exported successfully', { businessId, fileName, recordCount: paymentsData.length });
      
      return s3Url;
    } catch (error) {
      logger.error('Failed to export payments', { error, businessId });
      throw error;
    }
  }

  async generateFullBusinessExport(businessId: string): Promise<string> {
    try {
      logger.info('Generating full business export', { businessId });
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const exports: { [key: string]: string } = {};
      
      // Export all data types
      try {
        exports.customers = await this.exportCustomers(businessId, {});
      } catch (error) {
        logger.warn('Failed to export customers', { error });
        exports.customers = 'Error exporting customers';
      }
      
      try {
        exports.bills = await this.exportBills(businessId, {});
      } catch (error) {
        logger.warn('Failed to export bills', { error });
        exports.bills = 'Error exporting bills';
      }
      
      try {
        exports.products = await this.exportProducts(businessId, {});
      } catch (error) {
        logger.warn('Failed to export products', { error });
        exports.products = 'Error exporting products';
      }
      
      try {
        exports.payments = await this.exportPayments(businessId, {});
      } catch (error) {
        logger.warn('Failed to export payments', { error });
        exports.payments = 'Error exporting payments';
      }
      
      // Create a summary file
      const summary = {
        exportDate: new Date().toISOString(),
        businessId,
        exports,
        recordCounts: {
          customers: exports.customers.includes('Error') ? 0 : 'See CSV file',
          bills: exports.bills.includes('Error') ? 0 : 'See CSV file',
          products: exports.products.includes('Error') ? 0 : 'See CSV file',
          payments: exports.payments.includes('Error') ? 0 : 'See CSV file',
        },
      };
      
      const summaryFileName = `exports/summary_${businessId}_${timestamp}.json`;
      const summaryS3Url = await uploadToS3(
        Buffer.from(JSON.stringify(summary, null, 2)),
        summaryFileName,
        'application/json'
      );
      
      logger.info('Full business export completed', { businessId, summaryFileName });
      
      return summaryS3Url;
    } catch (error) {
      logger.error('Failed to generate full business export', { error, businessId });
      throw error;
    }
  }

  private convertToCSV(data: Record<string, unknown>[], columns: string[]): string {
    if (!data || data.length === 0) {
      return columns.join(',') + '\n';
    }
    
    // Header row
    const csvHeader = columns.join(',') + '\n';
    
    // Data rows
    const csvRows = data.map(row => {
      return columns.map(column => {
        let value: unknown = row[column];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle objects (like JSON fields)
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        // Convert to string and escape quotes
        let strValue = String(value);
        
        // Escape commas and quotes
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          strValue = `"${strValue.replace(/"/g, '""')}"`;
        }
        
        return strValue;
      }).join(',');
    }).join('\n');
    
    return csvHeader + csvRows + '\n';
  }
}