import { db } from '../config/database';
import { bills, retailBusinesses } from '../models/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export async function generateBillNumber(businessId: string): Promise<string> {
  // Get business settings
  const [business] = await db
    .select()
    .from(retailBusinesses)
    .where(eq(retailBusinesses.id, businessId))
    .limit(1);

  const settings = business?.settings || {};
  const invoiceSettings = settings.invoiceSettings || {};
  
  const prefix = invoiceSettings.prefix || 'BILL';
  const suffix = invoiceSettings.suffix || '';
  const startingNumber = invoiceSettings.startingNumber || 1;

  // Get the last bill number for this business
  const [lastBill] = await db
    .select({ billNumber: bills.billNumber })
    .from(bills)
    .where(eq(bills.businessId, businessId))
    .orderBy(sql`${bills.billNumber} DESC`)
    .limit(1);

  let nextNumber = startingNumber;
  
  if (lastBill) {
    // Extract number from last bill number
    const lastNumber = parseInt(lastBill.billNumber.replace(prefix, '').replace(suffix, ''));
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format bill number
  const billNumber = `${prefix}${nextNumber.toString().padStart(6, '0')}${suffix}`;
  
  return billNumber;
}

export function calculateBillTotals(items: any[], discountPercent: number = 0, taxPercent: number = 0) {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const item of items) {
    const itemTotal = item.quantity * item.rate;
    const itemDiscount = item.discountPercent ? (itemTotal * item.discountPercent / 100) : 0;
    const itemTax = item.taxPercent ? ((itemTotal - itemDiscount) * item.taxPercent / 100) : 0;
    
    subtotal += itemTotal;
    totalDiscount += itemDiscount;
    totalTax += itemTax;
  }

  // Apply global discount and tax
  const globalDiscount = subtotal * (discountPercent / 100);
  const globalTax = (subtotal - globalDiscount) * (taxPercent / 100);

  const finalSubtotal = subtotal;
  const finalDiscount = totalDiscount + globalDiscount;
  const finalTax = totalTax + globalTax;
  const totalAmount = finalSubtotal - finalDiscount + finalTax;

  return {
    subtotal: finalSubtotal,
    discountAmount: finalDiscount,
    taxAmount: finalTax,
    totalAmount,
  };
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date, format: string = 'DD/MM/YYYY'): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return d.toLocaleDateString();
  }
}

export function calculateDueDate(billDate: Date, creditDays: number): Date {
  const dueDate = new Date(billDate);
  dueDate.setDate(dueDate.getDate() + creditDays);
  return dueDate;
}

export function isOverdue(bill: any): boolean {
  if (bill.status === 'PAID') return false;
  if (!bill.dueDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(bill.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}

export function getBillStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'green';
    case 'PARTIAL':
      return 'orange';
    case 'PENDING':
      return 'blue';
    case 'OVERDUE':
      return 'red';
    case 'CANCELLED':
      return 'gray';
    default:
      return 'black';
  }
}

export function generateBillSummary(bill: any, items: any[]) {
  const itemCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    itemCount,
    totalQuantity,
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    taxAmount: bill.taxAmount,
    totalAmount: bill.totalAmount,
    paidAmount: bill.paidAmount,
    balanceAmount: bill.balanceAmount,
    status: bill.status,
  };
}

export async function getNextBillNumber(businessId: string): Promise<string> {
  const billNumber = await generateBillNumber(businessId);
  return billNumber;
}

export function validateBillData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required');
  }

  for (const item of data.items || []) {
    if (!item.productName || item.productName.trim() === '') {
      errors.push('Product name is required for all items');
      break;
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push('Valid quantity is required for all items');
      break;
    }
    if (!item.rate || item.rate <= 0) {
      errors.push('Valid rate is required for all items');
      break;
    }
  }

  if (data.discountAmount && data.discountAmount < 0) {
    errors.push('Discount amount cannot be negative');
  }

  if (data.taxAmount && data.taxAmount < 0) {
    errors.push('Tax amount cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}