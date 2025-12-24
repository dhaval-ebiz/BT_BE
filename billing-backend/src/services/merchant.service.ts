import { db } from '../config/database';
import { merchants /*, merchantPayments*/ } from '../models/drizzle/schema';
import { eq, and, sql, desc, sum, count, SQL } from 'drizzle-orm';
import { 
  CreateMerchantInput, 
  UpdateMerchantInput, 
  MerchantQueryInput,
  // MerchantPaymentInput 
} from '../schemas/merchant.schema';
import { logger } from '../utils/logger';

export class MerchantService {
  async createMerchant(businessId: string, input: CreateMerchantInput) {
    const {
      merchantCode,
      name,
      contactPerson,
      email,
      phone,
      alternatePhone,
      address,
      bankDetails,
      gstNumber,
      panNumber,
      creditLimit,
      paymentTerms,
      notes,
    } = input;

    // Generate merchant code if not provided
    const finalMerchantCode = merchantCode || await this.generateMerchantCode(businessId);

    // Check if merchant code already exists
    const existingMerchant = await db
      .select()
      .from(merchants)
      .where(and(
        eq(merchants.businessId, businessId),
        eq(merchants.merchantCode, finalMerchantCode)
      ))
      .limit(1);

    if (existingMerchant.length > 0) {
      throw new Error('Merchant with this code already exists');
    }

    // Create merchant
    const [merchant] = await db
      .insert(merchants)
      .values({
        businessId,
        merchantCode: finalMerchantCode,
        ...(input as any),
        contactPerson,
        email,
        phone,
        alternatePhone,
        address,
        accountNumber: bankDetails?.accountNumber,
        bankName: bankDetails?.bankName,
        ifscCode: bankDetails?.ifscCode,
        gstNumber,
        panNumber,
        creditLimit: creditLimit || 0,
        paymentTerms: paymentTerms || 30,
        outstandingBalance: 0,
        totalPurchases: 0,
        totalPayments: 0,
        notes,
        isActive: true,
      })
      .returning();

    logger.info('Merchant created', { merchantId: merchant.id, businessId, merchantCode: finalMerchantCode });

    return merchant;
  }

  async getMerchant(businessId: string, merchantId: string) {
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(and(
        eq(merchants.id, merchantId),
        eq(merchants.businessId, businessId)
      ))
      .limit(1);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    return merchant;
  }

  async updateMerchant(businessId: string, merchantId: string, input: UpdateMerchantInput) {
    const updateData: Partial<typeof merchants.$inferInsert> = {};

    if (input.merchantCode !== undefined) updateData.merchantCode = input.merchantCode;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.contactPerson !== undefined) updateData.contactPerson = input.contactPerson;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.alternatePhone !== undefined) updateData.alternatePhone = input.alternatePhone;
    if (input.address !== undefined) updateData.address = input.address;
    
    // Handle nested bank details mapping to flat structure
    if (input.bankDetails !== undefined) {
      if (input.bankDetails.accountNumber !== undefined) updateData.accountNumber = input.bankDetails.accountNumber;
      if (input.bankDetails.bankName !== undefined) updateData.bankName = input.bankDetails.bankName;
      if (input.bankDetails.ifscCode !== undefined) updateData.ifscCode = input.bankDetails.ifscCode;
    }
    
    if (input.gstNumber !== undefined) updateData.gstNumber = input.gstNumber;
    if (input.panNumber !== undefined) updateData.panNumber = input.panNumber;
    
    // Handle decimal conversions
    if (input.creditLimit !== undefined) updateData.creditLimit = input.creditLimit.toString();
    if (input.paymentTerms !== undefined) updateData.paymentTerms = input.paymentTerms;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updatedMerchant] = await db
      .update(merchants)
      .set(updateData)
      .where(and(
        eq(merchants.id, merchantId),
        eq(merchants.businessId, businessId)
      ))
      .returning();

    if (!updatedMerchant) {
      throw new Error('Merchant not found');
    }

    logger.info('Merchant updated', { merchantId, businessId });

    return updatedMerchant;
  }

  async deleteMerchant(businessId: string, merchantId: string) {
/*
    // Check if merchant has any payments
    const merchantPaymentsData = await db
      .select()
      .from(merchantPayments)
      .where(and(
        eq(merchantPayments.merchantId, merchantId),
        eq(merchantPayments.businessId, businessId)
      ))
      .limit(1);

    if (merchantPaymentsData.length > 0) {
      throw new Error('Cannot delete merchant with existing payments');
    }
    */

    const [deletedMerchant] = await db
      .delete(merchants)
      .where(and(
        eq(merchants.id, merchantId),
        eq(merchants.businessId, businessId)
      ))
      .returning();

    if (!deletedMerchant) {
      throw new Error('Merchant not found');
    }

    logger.info('Merchant deleted', { merchantId, businessId });

    return { message: 'Merchant deleted successfully' };
  }

  async getMerchants(businessId: string, query: MerchantQueryInput) {
    const { 
      search, 
      isActive, 
      hasOutstanding, 
      sortBy = 'name', 
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = query;

    const conditions: SQL[] = [eq(merchants.businessId, businessId)];

    // Apply filters
    if (search) {
      conditions.push(sql`(
        ${merchants.name} ILIKE ${`%${search}%`} OR 
        ${merchants.contactPerson} ILIKE ${`%${search}%`} OR 
        ${merchants.email} ILIKE ${`%${search}%`} OR 
        ${merchants.phone} ILIKE ${`%${search}%`} OR
        ${merchants.merchantCode} ILIKE ${`%${search}%`}
      )`);
    }

    if (isActive !== undefined) {
      conditions.push(eq(merchants.isActive, isActive));
    }

    if (hasOutstanding !== undefined) {
      if (hasOutstanding) {
        conditions.push(sql`${merchants.outstandingBalance} > 0`);
      } else {
        conditions.push(sql`${merchants.outstandingBalance} = 0`);
      }
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(merchants)
      .where(and(...conditions));

    const total = countResult.count;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Apply sorting and pagination
    const validSortColumns = {
      name: merchants.name,
      createdAt: merchants.createdAt,
      updatedAt: merchants.updatedAt,
      outstandingBalance: merchants.outstandingBalance,
      merchantCode: merchants.merchantCode,
    };

    const sortColumn = validSortColumns[sortBy as keyof typeof validSortColumns] || merchants.createdAt;
    
    const merchantsData = await db
      .select()
      .from(merchants)
      .where(and(...conditions))
      .orderBy(sortOrder === 'desc' ? desc(sortColumn) : sortColumn)
      .limit(limit)
      .offset(offset);

    return {
      merchants: merchantsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

/*
  async addMerchantPayment(
    businessId: string,
    merchantId: string,
    userId: string,
    input: any // MerchantPaymentInput
  ) {
    const { amount, method, referenceNumber, notes } = input;

    // Validate merchant
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(and(
        eq(merchants.id, merchantId),
        eq(merchants.businessId, businessId)
      ))
      .limit(1);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Generate payment number
    const paymentNumber = `MERC-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment
    const [payment] = await db
      .insert(merchantPayments)
      .values({
        businessId,
        merchantId,
        paymentNumber,
        paymentDate: new Date(),
        amount,
        method,
        status: 'COMPLETED',
        referenceNumber,
        notes,
        createdBy: userId,
      })
      .returning();

    // Update merchant balance
    await db
      .update(merchants)
      .set({
        outstandingBalance: sql`${merchants.outstandingBalance} - ${amount}`,
        totalPayments: sql`${merchants.totalPayments} + ${amount}`,
      })
      .where(eq(merchants.id, merchantId));

    logger.info('Merchant payment added', { paymentId: payment.id, merchantId, amount });

    return payment;
  }

  async getMerchantPayments(businessId: string, merchantId: string, page: number = 1, limit: number = 20) {
    // Validate merchant
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(and(
        eq(merchants.id, merchantId),
        eq(merchants.businessId, businessId)
      ))
      .limit(1);

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(merchantPayments)
      .where(and(
        eq(merchantPayments.merchantId, merchantId),
        eq(merchantPayments.businessId, businessId)
      ));

    const total = countResult.count;
    const totalPages = Math.ceil(total / limit);

    const payments = await db
      .select()
      .from(merchantPayments)
      .where(and(
        eq(merchantPayments.merchantId, merchantId),
        eq(merchantPayments.businessId, businessId)
      ))
      .orderBy(desc(merchantPayments.paymentDate))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
  */

  async getMerchantStats(businessId: string) {
    const [totalMerchants] = await db
      .select({ count: count() })
      .from(merchants)
      .where(eq(merchants.businessId, businessId));

    const [activeMerchants] = await db
      .select({ count: count() })
      .from(merchants)
      .where(and(
        eq(merchants.businessId, businessId),
        eq(merchants.isActive, true)
      ));

    const [merchantsWithOutstanding] = await db
      .select({ count: count() })
      .from(merchants)
      .where(and(
        eq(merchants.businessId, businessId),
        sql`${merchants.outstandingBalance} > 0`
      ));

    const [totalOutstanding] = await db
      .select({ total: sum(merchants.outstandingBalance) })
      .from(merchants)
      .where(eq(merchants.businessId, businessId));

    return {
      totalMerchants: totalMerchants.count,
      activeMerchants: activeMerchants.count,
      merchantsWithOutstanding: merchantsWithOutstanding.count,
      totalOutstanding: totalOutstanding.total || 0,
    };
  }

  private async generateMerchantCode(businessId: string): Promise<string> {
    const [lastMerchant] = await db
      .select({ merchantCode: merchants.merchantCode })
      .from(merchants)
      .where(eq(merchants.businessId, businessId))
      .orderBy(sql`${merchants.merchantCode} DESC`)
      .limit(1);

    let nextNumber = 1;
    
    if (lastMerchant) {
      const lastNumber = parseInt(lastMerchant.merchantCode.replace(/[^0-9]/g, ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `MERC-${nextNumber.toString().padStart(4, '0')}`;
  }
}