import { db } from '../config/database';
import { customers, bills, products, payments } from '../models/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { uploadToS3 } from '../utils/s3';
import { format } from 'date-fns';

export class DataExportService {
  async exportCustomers(businessId: string, filters: any): Promise<string> {
    try {
      logger.info('Exporting customers', { businessId, filters });
      
      let query = db
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
        .where(eq(customers.businessId, businessId));

      // Apply filters
      if (filters.isActive !== undefined) {
        query = query.where(eq(customers.isActive, filters.isActive)) as any;
      }

      if (filters.hasOutstanding) {
        query = query.where(sql`${customers.outstandingBalance} > 0`) as any;
      }

      const customersData = await query;
      
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

  async exportBills(businessId: string, filters: any): Promise<string> {
    try {
      logger.info('Exporting bills', { businessId, filters });
      
      let query = db
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
        .where(eq(bills.businessId, businessId));

      // Apply filters
      if (filters.status) {
        query = query.where(eq(bills.status, filters.status)) as any;
      }

      if (filters.customerId) {
        query = query.where(eq(bills.customerId, filters.customerId)) as any;
      }

      if (filters.startDate) {
        query = query.where(sql`${bills.billDate} >= ${new Date(filters.startDate)}`) as any;
      }

      if (filters.endDate) {
        query = query.where(sql`${bills.billDate} <= ${new Date(filters.endDate)}`) as any;
      }

      const billsData = await query;
      
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

  async exportProducts(businessId: string, filters: any): Promise<string> {
    try {
      logger.info('Exporting products', { businessId, filters });
      
      let query = db
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
        .where(eq(products.businessId, businessId));

      // Apply filters
      if (filters.categoryId) {
        query = query.where(eq(products.categoryId, filters.categoryId)) as any;
      }

      if (filters.isActive !== undefined) {
        query = query.where(eq(products.isActive, filters.isActive)) as any;
      }

      if (filters.lowStock) {
        query = query.where(sql`${products.currentStock} <= ${products.minimumStock}`) as any;
      }

      const productsData = await query;
      
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

  async exportPayments(businessId: string, filters: any): Promise<string> {
    try {
      logger.info('Exporting payments', { businessId, filters });
      
      let query = db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          paymentDate: payments.paymentDate,
          amount: payments.amount,
          method: payments.method,
          status: payments.status,
          referenceNumber: payments.referenceNumber,
          customerId: payments.customerId,
          billId: payments.billId,
          notes: payments.notes,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.businessId, businessId));

      // Apply filters
      if (filters.customerId) {
        query = query.where(eq(payments.customerId, filters.customerId)) as any;
      }

      if (filters.status) {
        query = query.where(eq(payments.status, filters.status)) as any;
      }

      if (filters.method) {
        query = query.where(eq(payments.method, filters.method)) as any;
      }

      if (filters.startDate) {
        query = query.where(sql`${payments.paymentDate} >= ${new Date(filters.startDate)}`) as any;
      }

      if (filters.endDate) {
        query = query.where(sql`${payments.paymentDate} <= ${new Date(filters.endDate)}`) as any;
      }

      const paymentsData = await query;
      
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
        'billId',
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

  private convertToCSV(data: any[], columns: string[]): string {
    if (!data || data.length === 0) {
      return columns.join(',') + '\n';
    }
    
    // Header row
    const csvHeader = columns.join(',') + '\n';
    
    // Data rows
    const csvRows = data.map(row => {
      return columns.map(column => {
        let value = row[column];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle objects (like JSON fields)
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        // Convert to string and escape quotes
        value = String(value);
        
        // Escape commas and quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    }).join('\n');
    
    return csvHeader + csvRows + '\n';
  }
}