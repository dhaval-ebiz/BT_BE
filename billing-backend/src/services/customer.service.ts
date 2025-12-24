import { db } from '../config/database';
import { customers, payments, bills, paymentMethodEnum, billingStatusEnum } from '../models/drizzle/schema';
import { eq, and, sql, desc, sum, count, gte, lte, SQL } from 'drizzle-orm';
import { 
  CreateCustomerInput, 
  UpdateCustomerInput, 
  CustomerQueryInput,
  CustomerPaymentInput,
  CustomerStatementInput 
} from '../schemas/customer.schema';
import { logger } from '../utils/logger';
import { sendWelcomeMessage } from '../utils/notifications';

type PaymentMethod = typeof paymentMethodEnum.enumValues[number];
type BillingStatus = typeof billingStatusEnum.enumValues[number];

export class CustomerService {
  async createCustomer(businessId: string, input: CreateCustomerInput) {
    const {
      customerCode,
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      billingAddress,
      shippingAddress,
      creditLimit,
      creditDays,
      isCreditAllowed,
      notes,
      tags,
    } = input;

    // Generate customer code if not provided
    const finalCustomerCode = customerCode || await this.generateCustomerCode(businessId);

    // Check if customer code already exists
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(and(
        eq(customers.businessId, businessId),
        eq(customers.customerCode, finalCustomerCode)
      ))
      .limit(1);

    if (existingCustomer.length > 0) {
      throw new Error('Customer with this code already exists');
    }

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        businessId,
        customerCode: finalCustomerCode,
        firstName,
        lastName,
        email,
        phone,
        alternatePhone,
        billingAddress,
        shippingAddress,
        creditLimit: creditLimit || 0,
        creditDays: creditDays || 0,
        isCreditAllowed: isCreditAllowed || false,
        outstandingBalance: 0,
        totalPurchases: 0,
        totalPayments: 0,
        notes,
        tags: tags || [],
        isActive: true,
      })
      .returning();

    // Send welcome message if phone or email is provided
    if (phone) {
      try {
        await sendWelcomeMessage('sms', phone, businessId, firstName);
      } catch (error) {
        logger.warn('Failed to send welcome SMS', { error, customerId: customer.id });
      }
    }

    if (email) {
      try {
        await sendWelcomeMessage('email', email, businessId, firstName);
      } catch (error) {
        logger.warn('Failed to send welcome email', { error, customerId: customer.id });
      }
    }

    logger.info('Customer created', { customerId: customer.id, businessId, customerCode: finalCustomerCode });

    return customer;
  }

  async getCustomer(businessId: string, customerId: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(
        eq(customers.id, customerId),
        eq(customers.businessId, businessId)
      ))
      .limit(1);

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  async updateCustomer(businessId: string, customerId: string, input: UpdateCustomerInput) {
    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      alternatePhone?: string;
      billingAddress?: Record<string, unknown>;
      shippingAddress?: Record<string, unknown>;
      creditLimit?: string;
      creditDays?: number;
      isCreditAllowed?: boolean;
      notes?: string;
      tags?: string[];
      isActive?: boolean;
    } = {};

    // Only update provided fields
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.alternatePhone !== undefined) updateData.alternatePhone = input.alternatePhone;
    if (input.billingAddress !== undefined) updateData.billingAddress = input.billingAddress;
    if (input.shippingAddress !== undefined) updateData.shippingAddress = input.shippingAddress;
    if (input.creditLimit !== undefined) updateData.creditLimit = input.creditLimit.toString();
    if (input.creditDays !== undefined) updateData.creditDays = input.creditDays;
    if (input.isCreditAllowed !== undefined) updateData.isCreditAllowed = input.isCreditAllowed;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updatedCustomer] = await db
      .update(customers)
      .set(updateData)
      .where(and(
        eq(customers.id, customerId),
        eq(customers.businessId, businessId)
      ))
      .returning();

    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }

    logger.info('Customer updated', { customerId, businessId });

    return updatedCustomer;
  }

  async deleteCustomer(businessId: string, customerId: string) {
    // Check if customer has any bills
    const customerBills = await db
      .select()
      .from(bills)
      .where(and(
        eq(bills.customerId, customerId),
        eq(bills.businessId, businessId)
      ))
      .limit(1);

    if (customerBills.length > 0) {
      throw new Error('Cannot delete customer with existing bills');
    }

    const [deletedCustomer] = await db
      .delete(customers)
      .where(and(
        eq(customers.id, customerId),
        eq(customers.businessId, businessId)
      ))
      .returning();

    if (!deletedCustomer) {
      throw new Error('Customer not found');
    }

    logger.info('Customer deleted', { customerId, businessId });

    return { message: 'Customer deleted successfully' };
  }

  async getCustomers(businessId: string, query: CustomerQueryInput) {
    const { 
      search, 
      isActive, 
      isCreditAllowed, 
      hasOutstanding, 
      sortBy = 'firstName', 
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = query;

    const conditions: SQL[] = [eq(customers.businessId, businessId)];

    // Apply filters
    if (search) {
      conditions.push(
        sql`${customers.firstName} ILIKE ${`%${search}%`} OR 
            ${customers.lastName} ILIKE ${`%${search}%`} OR 
            ${customers.email} ILIKE ${`%${search}%`} OR 
            ${customers.phone} ILIKE ${`%${search}%`} OR
            ${customers.customerCode} ILIKE ${`%${search}%`}`
      );
    }

    if (isActive !== undefined) {
      conditions.push(eq(customers.isActive, isActive));
    }

    if (isCreditAllowed !== undefined) {
      conditions.push(eq(customers.isCreditAllowed, isCreditAllowed));
    }

    if (hasOutstanding !== undefined) {
      if (hasOutstanding) {
        conditions.push(sql`${customers.outstandingBalance} > 0`);
      } else {
        conditions.push(sql`${customers.outstandingBalance} = 0`);
      }
    }

    const whereCondition = and(...conditions);

    // Apply sorting
    const sortColumn = customers[sortBy as keyof typeof customers];
    let orderByClause;
    if (sortColumn) {
      orderByClause = sortOrder === 'desc' ? desc(sortColumn) : sortColumn;
    } else {
      orderByClause = desc(customers.createdAt);
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(whereCondition);

    const total = countResult.count;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const offset = (page - 1) * limit;

    const customersData = await db
      .select()
      .from(customers)
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      customers: customersData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async addCustomerPayment(
    businessId: string,
    customerId: string,
    userId: string,
    input: CustomerPaymentInput
  ) {
    const { amount, method, referenceNumber, notes, billIds } = input;

    // Validate customer
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(
        eq(customers.id, customerId),
        eq(customers.businessId, businessId)
      ))
      .limit(1);

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Generate payment number
    const paymentNumber = `CUST-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment
    const [payment] = await db
      .insert(payments)
      .values({
        businessId,
        customerId,
        billId: billIds && billIds.length > 0 ? billIds[0] : null,
        paymentNumber,
        paymentDate: new Date(),
        amount,
        method: method as PaymentMethod,
        status: 'COMPLETED',
        referenceNumber,
        notes,
        createdBy: userId,
      })
      .returning();

    // Update customer balance
    await db
      .update(customers)
      .set({
        outstandingBalance: sql`${customers.outstandingBalance} - ${amount}`,
        totalPayments: sql`${customers.totalPayments} + ${amount}`,
      })
      .where(eq(customers.id, customerId));

    // Update bills if billIds are provided
    if (billIds && billIds.length > 0) {
      for (const billId of billIds) {
        const [bill] = await db
          .select()
          .from(bills)
          .where(and(
            eq(bills.id, billId),
            eq(bills.customerId, customerId),
            eq(bills.businessId, businessId)
          ))
          .limit(1);

        if (bill) {
          const newPaidAmount = bill.paidAmount + amount;
          const newBalanceAmount = bill.totalAmount - newPaidAmount;
          let newStatus: BillingStatus = bill.status as BillingStatus;

          if (newBalanceAmount <= 0) {
            newStatus = 'PAID' as BillingStatus;
          } else if (newPaidAmount > 0) {
            newStatus = 'PARTIAL' as BillingStatus;
          }

          await db
            .update(bills)
            .set({
              paidAmount: newPaidAmount.toString(),
              balanceAmount: newBalanceAmount.toString(),
              status: newStatus,
            })
            .where(eq(bills.id, billId));
        }
      }
    }

    logger.info('Customer payment added', { paymentId: payment.id, customerId, amount });

    return payment;
  }

  async getCustomerStatement(businessId: string, customerId: string, input: CustomerStatementInput) {
    const { startDate, endDate } = input;

    // Get customer details
    const customer = await this.getCustomer(businessId, customerId);

    // Get bills
    const billConditions: SQL[] = [
      eq(bills.customerId, customerId),
      eq(bills.businessId, businessId)
    ];

    if (startDate) {
      billConditions.push(gte(bills.billDate, new Date(startDate)));
    }

    if (endDate) {
      billConditions.push(lte(bills.billDate, new Date(endDate)));
    }

    const customerBills = await db
      .select()
      .from(bills)
      .where(and(...billConditions))
      .orderBy(bills.billDate);

    // Get payments
    const paymentConditions: SQL[] = [
      eq(payments.customerId, customerId),
      eq(payments.businessId, businessId)
    ];

    if (startDate) {
      paymentConditions.push(gte(payments.paymentDate, new Date(startDate)));
    }

    if (endDate) {
      paymentConditions.push(lte(payments.paymentDate, new Date(endDate)));
    }

    const customerPayments = await db
      .select()
      .from(payments)
      .where(and(...paymentConditions))
      .orderBy(payments.paymentDate);

    // Calculate opening balance
    let openingBalance = 0;
    if (startDate) {
      const [openingBills] = await db
        .select({ total: sum(bills.totalAmount) })
        .from(bills)
        .where(and(
          eq(bills.customerId, customerId),
          eq(bills.businessId, businessId),
          sql`${bills.billDate} < ${new Date(startDate)}`
        ));

      const [openingPayments] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(and(
          eq(payments.customerId, customerId),
          eq(payments.businessId, businessId),
          sql`${payments.paymentDate} < ${new Date(startDate)}`
        ));

      openingBalance = (openingBills.total || 0) - (openingPayments.total || 0);
    }

    // Combine and sort transactions
    const transactions = [
      ...customerBills.map(bill => ({
        date: bill.billDate,
        type: 'BILL' as const,
        description: `Bill ${bill.billNumber}`,
        debit: bill.totalAmount,
        credit: 0,
        balance: 0, // Will be calculated
      })),
      ...customerPayments.map(payment => ({
        date: payment.paymentDate,
        type: 'PAYMENT' as const,
        description: `Payment ${payment.paymentNumber}`,
        debit: 0,
        credit: payment.amount,
        balance: 0, // Will be calculated
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = openingBalance;
    for (const transaction of transactions) {
      runningBalance += transaction.debit - transaction.credit;
      transaction.balance = runningBalance;
    }

    return {
      customer,
      openingBalance,
      transactions,
      closingBalance: runningBalance,
      period: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    };
  }

  async getCustomerStats(businessId: string) {
    const [totalCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.businessId, businessId));

    const [activeCustomers] = await db
      .select({ count: count() })
      .from(customers)
      .where(and(
        eq(customers.businessId, businessId),
        eq(customers.isActive, true)
      ));

    const [customersWithOutstanding] = await db
      .select({ count: count() })
      .from(customers)
      .where(and(
        eq(customers.businessId, businessId),
        sql`${customers.outstandingBalance} > 0`
      ));

    const [totalOutstanding] = await db
      .select({ total: sum(customers.outstandingBalance) })
      .from(customers)
      .where(eq(customers.businessId, businessId));

    return {
      totalCustomers: totalCustomers.count,
      activeCustomers: activeCustomers.count,
      customersWithOutstanding: customersWithOutstanding.count,
      totalOutstanding: totalOutstanding.total || 0,
    };
  }

  private async generateCustomerCode(businessId: string): Promise<string> {
    const [lastCustomer] = await db
      .select({ customerCode: customers.customerCode })
      .from(customers)
      .where(eq(customers.businessId, businessId))
      .orderBy(sql`${customers.customerCode} DESC`)
      .limit(1);

    let nextNumber = 1;
    
    if (lastCustomer) {
      const lastNumber = parseInt(lastCustomer.customerCode.replace(/[^0-9]/g, ''));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `CUST-${nextNumber.toString().padStart(4, '0')}`;
  }
}