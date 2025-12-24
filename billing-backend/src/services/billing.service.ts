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
  isService?: boolean;
  trackQuantity?: boolean;
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

  // Helper to update purchase patterns
  private async updatePurchasePatterns(businessId: string, customerId: string, items: ProcessedBillItem[]): Promise<void> {
    const { customerPurchasePatterns } = await import('../models/drizzle/schema');
    
    for (const item of items) {
        if (!item.productId) continue;

        const [existingPattern] = await db
            .select()
            .from(customerPurchasePatterns)
            .where(and(
                eq(customerPurchasePatterns.businessId, businessId),
                eq(customerPurchasePatterns.customerId, customerId),
                eq(customerPurchasePatterns.productId, item.productId)
            ));
        
        const currentPrice = item.rate.toString();
        const currentQty = item.quantity.toString();
        const now = new Date();

        if (existingPattern) {
            await db.update(customerPurchasePatterns)
                .set({
                    purchaseCount: sql`${customerPurchasePatterns.purchaseCount} + 1`,
                    lastPurchaseDate: now,
                    lastPrice: currentPrice,
                    avgQuantity: sql`(${customerPurchasePatterns.avgQuantity} * ${customerPurchasePatterns.purchaseCount} + ${currentQty}) / (${customerPurchasePatterns.purchaseCount} + 1)`,
                    updatedAt: now
                })
                .where(eq(customerPurchasePatterns.id, existingPattern.id));
        } else {
            await db.insert(customerPurchasePatterns).values({
                businessId,
                customerId,
                productId: item.productId,
                purchaseCount: 1,
                lastPurchaseDate: now,
                firstPurchaseDate: now,
                lastPrice: currentPrice,
                avgQuantity: currentQty,
                avgPrice: currentPrice, 
            });
        }
    }
  }

  async getSuggestions(businessId: string, customerId: string): Promise<Array<{
    productId: string | null;
    lastPrice: string | null;
    lastPurchaseDate: Date | null;
    purchaseCount: number | null;
    avgQuantity: string | null;
    productName: string | null;
    productCode: string | null;
    currentPrice: string | null;
    unit: string | null;
    suggestionReason: string;
  }>> {
    const { customerPurchasePatterns } = await import('../models/drizzle/schema');
    
    const patterns = await db
        .select({
            productId: customerPurchasePatterns.productId,
            lastPrice: customerPurchasePatterns.lastPrice,
            lastPurchaseDate: customerPurchasePatterns.lastPurchaseDate,
            purchaseCount: customerPurchasePatterns.purchaseCount,
            avgQuantity: customerPurchasePatterns.avgQuantity,
            productName: products.name,
            productCode: products.productCode,
            currentPrice: products.sellingPrice,
            unit: products.unit,
        })
        .from(customerPurchasePatterns)
        .leftJoin(products, eq(customerPurchasePatterns.productId, products.id))
        .where(and(
            eq(customerPurchasePatterns.businessId, businessId),
            eq(customerPurchasePatterns.customerId, customerId)
        ))
        // Casting for sort order if needed, but lastPurchaseDate is reliable
        .orderBy(desc(customerPurchasePatterns.lastPurchaseDate))
        .limit(20);

    return patterns.map(p => ({
        ...p,
        suggestionReason: 'Based on purchase history'
    }));
  }

  async createBill(businessId: string, userId: string, input: CreateBillInput, req?: AuthenticatedRequest): Promise<typeof bills.$inferSelect> {
    const { 
      items, customerId, billDate, dueDate, 
      paymentMethod, status = 'DRAFT', 
      requiresApproval = false,
      shippingCost = 0, adjustmentAmount = 0, roundOffAmount = 0,
      billingAddress, shippingAddress, notes, terms, internalNotes, customerNotes,
      isRecurring, recurringFrequency
    } = input;

    let calculatedSubtotal = 0;
    let calculatedTotalTax = 0;
    let calculatedTotalDiscount = 0;
    const processedItems: ProcessedBillItem[] = [];

    for (const item of items) {
      const rate = item.rate;
      const quantity = item.quantity;
      let existingProduct = null;
      if (item.productId) {
        [existingProduct] = await db.select().from(products).where(eq(products.id, item.productId));
      }

      const grossAmount = rate * quantity;
      
      let itemDiscount = item.discountAmount || 0;
      if (item.discountPercent && item.discountPercent > 0) {
        itemDiscount = (grossAmount * item.discountPercent) / 100;
      }
      
      const taxableAmount = grossAmount - itemDiscount;
      
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
        isService: existingProduct?.isService || false,
        trackQuantity: existingProduct?.trackQuantity ?? true
      });
    }
    
    const finalSubtotal = (input.subtotal !== undefined) ? input.subtotal : calculatedSubtotal;
    const finalTax = (input.taxAmount !== undefined) ? input.taxAmount : calculatedTotalTax;
    const finalDiscount = (input.discountAmount !== undefined) ? input.discountAmount : calculatedTotalDiscount;

    const grandTotal = finalSubtotal - finalDiscount + finalTax + shippingCost + adjustmentAmount + roundOffAmount;

    return await db.transaction(async (tx) => {
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
        balanceAmount: grandTotal.toString(),
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
      
      if (!bill) {
        throw new Error('Failed to create bill');
      }

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

        if (item.productId && 
            status !== 'DRAFT' && status !== 'VOID' && status !== 'CANCELLED' && 
            !item.isService && item.trackQuantity) {
             await tx.execute(
                 sql`UPDATE ${products} 
                     SET current_stock = current_stock - ${item.quantity} 
                     WHERE id = ${item.productId}`
             );
        }
      }

      await auditService.logBillAction('CREATE', businessId, userId, bill.id, {}, bill, undefined, req);
      logger.info('Bill created', { billId: bill.id, billNumber });

      if (customerId) {
           await this.updatePurchasePatterns(businessId, customerId, processedItems);
      }

      return bill;
    });
  }

  async getBill(businessId: string, billId: string): Promise<typeof bills.$inferSelect & { items: typeof billItems.$inferSelect[]; payments: (typeof payments.$inferSelect & { allocation: typeof paymentAllocations.$inferSelect })[] }> {
    const bill = await db.query.bills.findFirst({
        where: and(eq(bills.id, billId), eq(bills.businessId, businessId)),
        with: {
            customer: true, 
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

  async listBills(businessId: string, query: BillQueryInput): Promise<{ bills: typeof bills.$inferSelect[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { 
        search, customerId, status, paymentStatus, 
        startDate, endDate, 
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
    if (hasBalance) {
        conditions.push(sql`${bills.balanceAmount} > 0`);
    }

    const condition = and(...conditions);

    const validSortColumns = {
        billDate: bills.billDate,
        createdAt: bills.createdAt,
        totalAmount: bills.totalAmount,
        status: bills.status,
        billNumber: bills.billNumber,
    };

    const sortColumn = validSortColumns[sortBy as keyof typeof validSortColumns] || bills.createdAt;
    const order = sortOrder === 'asc' ? sortColumn : desc(sortColumn);

    const offset = (page - 1) * limit;

    const [totalRes] = await db.select({ count: count() }).from(bills).where(condition);
    const total = totalRes?.count ? Number(totalRes.count) : 0;
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

  async updateBill(businessId: string, userId: string, billId: string, input: UpdateBillInput): Promise<typeof bills.$inferSelect> {
    const { 
        status, 
        notes, terms, internalNotes, customerNotes,
        billingAddress, shippingAddress
    } = input;

    const [existingBill] = await db
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.businessId, businessId)));

    if (!existingBill) throw new Error('Bill not found');

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
    const [updatedBillResult] = await db
        .select()
        .from(bills)
        .where(eq(bills.id, billId));
        
    if (!updatedBillResult) throw new Error('Failed to retrieve updated bill');

    return updatedBillResult;
  }

  async recordPayment(businessId: string, userId: string, billId: string, input: BillPaymentInput, req?: AuthenticatedRequest): Promise<{ payment: typeof payments.$inferSelect; newBalance: string; newStatus: BillingStatus }> {
    const { amount, method, paymentDate, referenceNumber, notes } = input;

    const [bill] = await db.select().from(bills).where(and(eq(bills.id, billId), eq(bills.businessId, businessId)));
    if (!bill) throw new Error('Bill not found');

    const currentBalance = parseFloat(bill.balanceAmount); 
    if (currentBalance <= 0) throw new Error('Bill is already fully paid');
    
    if (amount <= 0) throw new Error('Payment amount must be positive');

    return await db.transaction(async (tx) => {
        const paymentNumber = await this.generatePaymentNumber(businessId);
        
        const [payment] = await tx.insert(payments).values({
            businessId,
            customerId: bill.customerId,
            paymentNumber,
            paymentDate: new Date(paymentDate || Date.now()),
            amount: amount.toString(),
            method: method as PaymentMethod,
            status: 'COMPLETED',
            allocatedAmount: amount.toString(),
            unallocatedAmount: '0',
            referenceNumber,
            notes,
            createdBy: userId
        }).returning();

        if (!payment) {
          throw new Error('Failed to create payment record');
        }

        const allocationAmount = Math.min(amount, currentBalance);
        
        await tx.insert(paymentAllocations).values({
            paymentId: payment.id,
            billId: bill.id,
            allocatedAmount: allocationAmount.toString(),
            billBalanceBefore: currentBalance.toString(),
            billBalanceAfter: (currentBalance - allocationAmount).toString(),
        });

        const newPaidAmount = (parseFloat(bill.paidAmount) + allocationAmount).toFixed(2);
        const newBalance = (parseFloat(bill.totalAmount) - parseFloat(newPaidAmount)).toFixed(2);
        
        let newStatus: BillingStatus = bill.status as BillingStatus;
        let newPaymentStatus: PaymentStatus = bill.paymentStatus as PaymentStatus;
        
        if (parseFloat(newBalance) <= 0.01) {
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
        await auditService.logBillAction('PAY', businessId, userId, billId, { balance: currentBalance }, { balance: newBalance }, undefined, req);

        return { payment, newBalance, newStatus };
    });
  }

  async recordBulkPayment(
    businessId: string, 
    userId: string, 
    customerId: string, 
    input: BillPaymentInput,
    req?: AuthenticatedRequest
  ): Promise<{ payment: typeof payments.$inferSelect; allocations: typeof paymentAllocations.$inferSelect[] }> {
    const { amount, method, paymentDate, referenceNumber, notes } = input;
    
    if (amount <= 0) throw new Error('Payment amount must be positive');

    return await db.transaction(async (tx) => {
        // 1. Create Payment Record (initially unallocated)
        const paymentNumber = await this.generatePaymentNumber(businessId);
        
        const [payment] = await tx.insert(payments).values({
            businessId,
            customerId,
            paymentNumber,
            paymentDate: new Date(paymentDate || Date.now()),
            amount: amount.toString(),
            method: method as PaymentMethod,
            status: 'COMPLETED',
            allocatedAmount: '0', 
            unallocatedAmount: amount.toString(),
            referenceNumber,
            notes,
            createdBy: userId
        }).returning();

        if (!payment) throw new Error('Failed to create payment');

        // 2. Fetch Unpaid Bills (FIFO: ascending date)
        const unpaidBills = await tx
            .select()
            .from(bills)
            .where(and(
                eq(bills.businessId, businessId),
                eq(bills.customerId, customerId),
                sql`${bills.balanceAmount} > 0`,
                // Exclude VOID or CANCELLED just in case
                sql`${bills.status} NOT IN ('VOID', 'CANCELLED')`
            ))
            .orderBy(bills.billDate, bills.createdAt); // Oldest first

        let remainingAmount = amount;
        const allocations = [];

        for (const bill of unpaidBills) {
            if (remainingAmount <= 0) break;

            const billBalance = parseFloat(bill.balanceAmount);
            const canPay = Math.min(remainingAmount, billBalance);
            
            if (canPay > 0) {
                // Apply Allocation
                const safeCanPay = Number(canPay.toFixed(2));
                
                const [allocation] = await tx.insert(paymentAllocations).values({
                    paymentId: payment.id,
                    billId: bill.id,
                    allocatedAmount: safeCanPay.toString(),
                    billBalanceBefore: billBalance.toString(),
                    billBalanceAfter: (billBalance - safeCanPay).toString(),
                }).returning();
                
                if (allocation) {
                    allocations.push(allocation);
                }

                // Update Bill
                const newPaid = (parseFloat(bill.paidAmount) + safeCanPay).toFixed(2);
                const newBal = (parseFloat(bill.totalAmount) - parseFloat(newPaid)).toFixed(2);
                 
                let newStatus = bill.status as BillingStatus;
                let newPaymentStatus = bill.paymentStatus as PaymentStatus;

                if (parseFloat(newBal) <= 0.01) {
                    newStatus = 'PAID';
                    newPaymentStatus = 'COMPLETED';
                } else {
                    newStatus = 'PARTIAL';
                    newPaymentStatus = 'PENDING';
                }

                await tx.update(bills)
                    .set({
                        paidAmount: newPaid,
                        balanceAmount: newBal,
                        status: newStatus,
                        paymentStatus: newPaymentStatus
                    })
                    .where(eq(bills.id, bill.id));

                // Deduct from remaining
                remainingAmount -= safeCanPay;
                remainingAmount = Number(remainingAmount.toFixed(2)); // Float safety
            }
        }

        // 3. Update Payment with final allocated amounts
        const totalAllocated = amount - remainingAmount;
        await tx.update(payments)
            .set({
                allocatedAmount: totalAllocated.toFixed(2),
                unallocatedAmount: remainingAmount.toFixed(2)
            })
            .where(eq(payments.id, payment.id));
        
        await auditService.logPaymentAction('CREATE', businessId, userId, payment.id, undefined, payment, req);

        return { payment, allocations };
    });
  }
}