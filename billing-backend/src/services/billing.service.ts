import { db } from '../config/database';
import { 
  bills, 
  billItems, 
  products, 
  payments, 
  paymentAllocations,
  billingStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  recurringFrequencyEnum,
  productUnitEnum
} from '../models/drizzle/schema';
import { eq, and, sql, desc, count, gte, lte, SQL } from 'drizzle-orm';
import { 
  CreateBillInput, 
  UpdateBillInput, 
  BillQueryInput, 
  BillPaymentInput 
} from '../schemas/bill.schema';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../types/common';

type BillingStatus = typeof billingStatusEnum.enumValues[number];
type PaymentMethod = typeof paymentMethodEnum.enumValues[number];
type PaymentStatus = typeof paymentStatusEnum.enumValues[number];
type RecurringFrequency = typeof recurringFrequencyEnum.enumValues[number];
type ProductUnit = typeof productUnitEnum.enumValues[number];

interface ProcessedBillItem {
  productId?: string;
  variantId?: string;
  productName: string;
  productCode?: string;
  description?: string;
  itemType: string;
  hsnCode?: string;
  sacCode?: string;
  unit: ProductUnit;
  quantity: number;
  rate: number;
  discountPercent?: number;
  discountAmount: string;
  taxPercent?: number;
  taxAmount: string;
  subtotal: string;
  totalAmount: string;
}

const auditService = new AuditService();

export class BillingService {
  
  // Helper to generate next Bill Number
  private async generateBillNumber(businessId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const prefix = `INV-${year}`;
    
    const [lastBill] = await db
      .select({ billNumber: bills.billNumber })
      .from(bills)
      .where(and(
        eq(bills.businessId, businessId),
        sql`${bills.billNumber} LIKE ${`${prefix}-%`}`
      ))
      .orderBy(desc(bills.createdAt))
      .limit(1);

    if (lastBill) {
      const lastSequence = parseInt(lastBill.billNumber.split('-').pop() || '0', 10);
      return `${prefix}-${(lastSequence + 1).toString().padStart(5, '0')}`;
    }
    
    return `${prefix}-00001`;
  }

  // Helper to generate Payment Number
  private async generatePaymentNumber(businessId: string): Promise<string> {
    const prefix = `PAY-${new Date().getFullYear()}`;
    const [lastPayment] = await db
        .select({ paymentNumber: payments.paymentNumber })
        .from(payments)
        .where(and(
            eq(payments.businessId, businessId),
            sql`${payments.paymentNumber} LIKE ${`${prefix}-%`}`
        ))
        .orderBy(desc(payments.createdAt))
        .limit(1);

    if (lastPayment) {
        const lastSequence = parseInt(lastPayment.paymentNumber.split('-').pop() || '0', 10);
        return `${prefix}-${(lastSequence + 1).toString().padStart(5, '0')}`;
    }
    return `${prefix}-00001`;
  }

  async createBill(businessId: string, userId: string, input: CreateBillInput, req?: AuthenticatedRequest) {
    const { 
      items, customerId, billDate, dueDate, 
      paymentMethod, status = 'DRAFT', 
      requiresApproval = false,
      shippingCost = 0, adjustmentAmount = 0, roundOffAmount = 0,
      billingAddress, shippingAddress, notes, terms, internalNotes, customerNotes,
      isRecurring, recurringFrequency
    } = input;

    // 1. Calculate Totals & Item Details
    let calculatedSubtotal = 0;
    let calculatedTotalTax = 0;
    let calculatedTotalDiscount = 0;
    const processedItems: ProcessedBillItem[] = [];

    for (const item of items) {
      const rate = item.rate;
      const quantity = item.quantity;
      let existingProduct = null;
      const existingVariant = null;

      // Validate Product Stock if linked
      if (item.productId) {
        [existingProduct] = await db.select().from(products).where(eq(products.id, item.productId));
        if (existingProduct) {
            // Check stock logic could go here, but for now we allow draft/pending even if low stock
        }
      }
      
      // Calculate Item Subtotal & Tax
      // Formula: (Rate * Qty) - Discount + Tax = Total
      // Note: Tax is usually on (Rate * Qty - Discount)
      
      const grossAmount = rate * quantity;
      
      // Discount
      let itemDiscount = item.discountAmount || 0;
      if (item.discountPercent && item.discountPercent > 0) {
        itemDiscount = (grossAmount * item.discountPercent) / 100;
      }
      
      const taxableAmount = grossAmount - itemDiscount;
      
      // Tax
      let itemTax = item.taxAmount || 0;
      if (item.taxPercent && item.taxPercent > 0) {
        itemTax = (taxableAmount * item.taxPercent) / 100;
      }
      
      const itemTotal = taxableAmount + itemTax;

      calculatedSubtotal += grossAmount;
      calculatedTotalDiscount += itemDiscount;
      calculatedTotalTax += itemTax;
      
      processedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName || existingProduct?.name || 'Unknown Item',
        productCode: item.productCode,
        description: item.description,
        itemType: item.itemType,
        hsnCode: item.hsnCode,
        sacCode: item.sacCode,
        unit: (item.unit || existingProduct?.unit || 'PIECE') as ProductUnit,
        quantity: item.quantity,
        rate: item.rate,
        discountPercent: item.discountPercent,
        discountAmount: itemDiscount.toFixed(2),
        taxPercent: item.taxPercent,
        taxAmount: itemTax.toFixed(2),
        subtotal: taxableAmount.toFixed(2),
        totalAmount: itemTotal.toFixed(2),
      });
    }

    // 2. Bill Level Calculations
    // Input might provide overrides for total tax/discount, but usually we aggregate items
    // If input.discountAmount provided for whole bill, logic gets complex (pro-rate vs separate line). 
    // For simplicity, we trust item-level aggregation + bill level fields if needed.
    // Here we strictly summation from items + global shipping/adjustments.
    
    // Check if input overrides exist, else use calculated
    const finalSubtotal = (input.subtotal !== undefined) ? input.subtotal : calculatedSubtotal;
    const finalTax = (input.taxAmount !== undefined) ? input.taxAmount : calculatedTotalTax;
    const finalDiscount = (input.discountAmount !== undefined) ? input.discountAmount : calculatedTotalDiscount;

    const grandTotal = finalSubtotal - finalDiscount + finalTax + shippingCost + adjustmentAmount + roundOffAmount;

    return await db.transaction(async (tx) => {
      // 3. Create Bill
      const billNumber = await this.generateBillNumber(businessId);
      
      const [bill] = await tx.insert(bills).values({
        businessId,
        customerId,
        billNumber,
        billDate: new Date(billDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status as BillingStatus,
        paymentStatus: 'PENDING' as PaymentStatus,
        approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
        requiresApproval,
        
        subtotal: finalSubtotal.toString(),
        taxAmount: finalTax.toString(),
        discountAmount: finalDiscount.toString(),
        totalAmount: grandTotal.toString(),
        balanceAmount: grandTotal.toString(), // Initially fully unpaid
        paidAmount: '0',
        
        shippingCost: shippingCost.toString(),
        adjustmentAmount: adjustmentAmount.toString(),
        roundOffAmount: roundOffAmount.toString(),
        
        billingAddress,
        shippingAddress,
        
        notes,
        terms,
        internalNotes,
        customerNotes,
        
        paymentMethod: paymentMethod ? (paymentMethod as PaymentMethod) : undefined,
        
        createdBy: userId,
        isRecurring: isRecurring || false,
        recurringFrequency: recurringFrequency ? (recurringFrequency as RecurringFrequency) : undefined,
      }).returning();

      // 4. Create Bill Items
      for (const item of processedItems) {
        await tx.insert(billItems).values({
          billId: bill.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          productCode: item.productCode,
          description: item.description,
          itemType: item.itemType,
          hsnCode: item.hsnCode,
          sacCode: item.sacCode,
          unit: item.unit,
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
          discountPercent: (item.discountPercent || 0).toString(),
          discountAmount: item.discountAmount.toString(),
          taxPercent: (item.taxPercent || 0).toString(),
          taxAmount: item.taxAmount.toString(),
          subtotal: item.subtotal.toString(),
          totalAmount: item.totalAmount.toString(),
        });

        // 5. Decrement Stock (if Product exists and Bill Status matches)
        // Usually Stock is deducted on 'CREATED' or 'CONFIRMED', or 'PAID'.
        // Let's assume deducted on valid status (not Draft/Void).
        if (item.productId &&  status !== 'DRAFT' && status !== 'VOID' && status !== 'CANCELLED') {
             await tx.execute(
                 sql`UPDATE ${products} 
                     SET current_stock = current_stock - ${item.quantity} 
                     WHERE id = ${item.productId}`
             );
             // If variant logic existed, would update variant stock too
        }
      }

      await auditService.logBillAction('CREATE', businessId, userId, bill.id, undefined, bill, req);
      logger.info('Bill created', { billId: bill.id, billNumber });

      return bill;
    });
  }

  async getBill(businessId: string, billId: string) {
    const bill = await db.query.bills.findFirst({
        where: and(eq(bills.id, billId), eq(bills.businessId, businessId)),
        with: {
            customer: true, // Need relations defined in schema for this to work perfectly, else manual join
            createdBy: true,
        }
    });

    if (!bill) throw new Error('Bill not found');

    const items = await db.select().from(billItems).where(eq(billItems.billId, billId));
    const billPayments = await db
        .select({
            payment: payments,
            allocation: paymentAllocations
        })
        .from(paymentAllocations)
        .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
        .where(eq(paymentAllocations.billId, billId));

    return { ...bill, items, payments: billPayments.map(bp => ({ ...bp.payment, allocation: bp.allocation })) };
  }

  async listBills(businessId: string, query: BillQueryInput) {
    const { 
        search, customerId, status, paymentStatus, 
        startDate, endDate, minAmount, maxAmount, 
        hasBalance, sortBy = 'billDate', sortOrder = 'desc',
        page = 1, limit = 20
    } = query;

    const conditions: SQL[] = [eq(bills.businessId, businessId)];

    if (search) {
        conditions.push(sql`${bills.billNumber} ILIKE ${`%${search}%`}`);
    }
    if (customerId) {
        conditions.push(eq(bills.customerId, customerId));
    }
    if (status) {
        conditions.push(eq(bills.status, status as BillingStatus));
    }
    if (paymentStatus) {
        conditions.push(eq(bills.paymentStatus, paymentStatus as PaymentStatus));
    }
    if (startDate) {
        conditions.push(gte(bills.billDate, new Date(startDate)));
    }
    if (endDate) {
        conditions.push(lte(bills.billDate, new Date(endDate)));
    }
    
    // Balance check
    if (hasBalance) {
        conditions.push(sql`${bills.balanceAmount} > 0`);
    }

    const condition = and(...conditions);

    // Sort
    let order;
    const col = bills[sortBy as keyof typeof bills];
    if (col) {
        order = sortOrder === 'asc' ? col : desc(col);
    } else {
        order = desc(bills.createdAt);
    }

    // Pagination
    const offset = (page - 1) * limit;

    const [totalRes] = await db.select({ count: count() }).from(bills).where(condition);
    const total = totalRes.count;
    const totalPages = Math.ceil(total / limit);

    const data = await db
        .select()
        .from(bills)
        .where(condition)
        .orderBy(order)
        .limit(limit)
        .offset(offset);

    return {
        bills: data,
        pagination: { page, limit, total, totalPages }
    };
  }

  async updateBill(businessId: string, userId: string, billId: string, input: UpdateBillInput) {
    const { 
        status, 
        notes, terms, internalNotes, customerNotes,
        billingAddress, shippingAddress
    } = input;

    // Fetch existing bill
    const [existingBill] = await db
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.businessId, businessId)));

    if (!existingBill) throw new Error('Bill not found');

    // Only allow meaningful updates if DRAFT or PENDING (or strictly DRAFT depending on policy)
    // If it's PAID, we shouldn't allow changing amounts easily without Voiding.
    // For now, we allow updating text fields always, and status if provided.
    
    // NOTE: Full item update logic is complex (re-stocking, diffing). 
    // Excluding item updates for this iteration unless critical. 
    // User plan said "Handle status changes".

    const updateData: {
      status?: BillingStatus;
      notes?: string | null;
      terms?: string | null;
      internalNotes?: string | null;
      customerNotes?: string | null;
      billingAddress?: Record<string, unknown> | null;
      shippingAddress?: Record<string, unknown> | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status as BillingStatus;
    }
    if (notes !== undefined) {
      updateData.notes = notes ?? existingBill.notes;
    }
    if (terms !== undefined) {
      updateData.terms = terms ?? existingBill.terms;
    }
    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes ?? existingBill.internalNotes;
    }
    if (customerNotes !== undefined) {
      updateData.customerNotes = customerNotes ?? existingBill.customerNotes;
    }
    if (billingAddress !== undefined) {
      updateData.billingAddress = billingAddress ?? existingBill.billingAddress;
    }
    if (shippingAddress !== undefined) {
      updateData.shippingAddress = shippingAddress ?? existingBill.shippingAddress;
    }

    await db.update(bills)
        .set(updateData)
        .where(eq(bills.id, billId));

    await auditService.logBillAction('UPDATE', businessId, userId, billId, existingBill, input);
    return { ...existingBill, ...input };
  }

  async recordPayment(businessId: string, userId: string, billId: string, input: BillPaymentInput, req?: AuthenticatedRequest) {
    const { amount, method, paymentDate, referenceNumber, notes } = input;

    const [bill] = await db.select().from(bills).where(and(eq(bills.id, billId), eq(bills.businessId, businessId)));
    if (!bill) throw new Error('Bill not found');

    const currentBalance = parseFloat(bill.balanceAmount); // Assuming string in DB, need valid number
    if (currentBalance <= 0) throw new Error('Bill is already fully paid');
    
    if (amount <= 0) throw new Error('Payment amount must be positive');

    // Start Transaction
    return await db.transaction(async (tx) => {
        const paymentNumber = await this.generatePaymentNumber(businessId);
        
        // 1. Create Payment Record
        const [payment] = await tx.insert(payments).values({
            businessId,
            customerId: bill.customerId,
            paymentNumber,
            paymentDate: new Date(paymentDate || Date.now()),
            amount: amount.toString(),
            method: method as PaymentMethod,
            status: 'COMPLETED',
            allocatedAmount: amount.toString(), // Fully allocated to this bill for now
            unallocatedAmount: '0',
            referenceNumber,
            notes,
            createdBy: userId
        }).returning();

        // 2. Create Allocation
        // If amount > balance, we effectively have overpayment or unallocated (logic simplifies to strict here)
        // For now, assuming exact or partial payment against specific bill.
        
        const allocationAmount = Math.min(amount, currentBalance);
        
        await tx.insert(paymentAllocations).values({
            paymentId: payment.id,
            billId: bill.id,
            allocatedAmount: allocationAmount.toString(),
            billBalanceBefore: currentBalance.toString(),
            billBalanceAfter: (currentBalance - allocationAmount).toString(),
        });

        // 3. Update Bill
        const newPaidAmount = (parseFloat(bill.paidAmount) + allocationAmount).toFixed(2);
        const newBalance = (parseFloat(bill.totalAmount) - parseFloat(newPaidAmount)).toFixed(2);
        
        let newStatus: BillingStatus = bill.status as BillingStatus;
        let newPaymentStatus: PaymentStatus = bill.paymentStatus as PaymentStatus;
        
        if (parseFloat(newBalance) <= 0.01) { // Floating point safety
             newStatus = 'PAID' as BillingStatus;
             newPaymentStatus = 'COMPLETED' as PaymentStatus;
        } else {
             newStatus = 'PARTIAL' as BillingStatus;
             newPaymentStatus = 'PENDING' as PaymentStatus;
        }

        await tx.update(bills)
            .set({ 
                paidAmount: newPaidAmount, 
                balanceAmount: newBalance,
                status: newStatus,
                paymentStatus: newPaymentStatus
            })
            .where(eq(bills.id, billId));

        await auditService.logPaymentAction('CREATE', businessId, userId, payment.id, undefined, payment, req);
        await auditService.logBillAction('PAY', businessId, userId, billId, { balance: currentBalance }, { balance: newBalance }, req);

        return { payment, newBalance, newStatus };
    });
  }
}