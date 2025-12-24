import { db } from '../config/database';
import {
  customers,
  bills,
  payments,
  paymentAllocations,
  paymentMethodEnum,
  billingStatusEnum,
  paymentStatusEnum,
} from '../models/drizzle/schema';
import { eq, and, sql, desc, sum, count, gte, lte, SQL } from 'drizzle-orm';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
  CustomerPaymentInput,
  CustomerStatementInput,
} from '../schemas/customer.schema';
import { logger } from '../utils/logger';
import { sendWelcomeMessage } from '../utils/notifications';

type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
type BillingStatus = (typeof billingStatusEnum.enumValues)[number];
type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

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

    const finalCustomerCode =
      customerCode ?? (await this.generateCustomerCode(businessId));

    const existingCustomer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.businessId, businessId),
          eq(customers.customerCode, finalCustomerCode),
        ),
      )
      .limit(1);

    if (existingCustomer.length > 0) {
      throw new Error('Customer with this code already exists');
    }

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
        creditLimit: creditLimit ?? 0,
        creditDays: creditDays ?? 0,
        isCreditAllowed: isCreditAllowed ?? false,
        outstandingBalance: 0,
        totalPurchases: 0,
        totalPayments: 0,
        notes,
        tags: tags ?? [],
        isActive: true,
      })
      .returning();

    if (phone) {
      void sendWelcomeMessage('sms', phone, businessId, firstName).catch(
        (error: unknown) => {
          logger.warn('Failed to send welcome SMS', {
            error,
            customerId: customer.id,
          });
        },
      );
    }

    if (email) {
      void sendWelcomeMessage('email', email, businessId, firstName).catch(
        (error: unknown) => {
          logger.warn('Failed to send welcome email', {
            error,
            customerId: customer.id,
          });
        },
      );
    }

    logger.info('Customer created', {
      customerId: customer.id,
      businessId,
      customerCode: finalCustomerCode,
    });

    return customer;
  }

  async getCustomer(businessId: string, customerId: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.businessId, businessId)),
      )
      .limit(1);

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  async updateCustomer(
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ) {
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

    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.alternatePhone !== undefined)
      updateData.alternatePhone = input.alternatePhone;
    if (input.billingAddress !== undefined)
      updateData.billingAddress = input.billingAddress;
    if (input.shippingAddress !== undefined)
      updateData.shippingAddress = input.shippingAddress;
    if (input.creditLimit !== undefined)
      updateData.creditLimit = input.creditLimit.toString();
    if (input.creditDays !== undefined)
      updateData.creditDays = input.creditDays;
    if (input.isCreditAllowed !== undefined)
      updateData.isCreditAllowed = input.isCreditAllowed;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updatedCustomer] = await db
      .update(customers)
      .set(updateData)
      .where(
        and(eq(customers.id, customerId), eq(customers.businessId, businessId)),
      )
      .returning();

    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }

    logger.info('Customer updated', { customerId, businessId });

    return updatedCustomer;
  }

  async deleteCustomer(businessId: string, customerId: string) {
    const customerBills = await db
      .select()
      .from(bills)
      .where(
        and(eq(bills.customerId, customerId), eq(bills.businessId, businessId)),
      )
      .limit(1);

    if (customerBills.length > 0) {
      throw new Error('Cannot delete customer with existing bills');
    }

    const [deletedCustomer] = await db
      .delete(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.businessId, businessId)),
      )
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
      limit = 20,
    } = query;

    const conditions: SQL[] = [eq(customers.businessId, businessId)];

    if (search) {
      conditions.push(
        sql`${customers.firstName} ILIKE ${`%${search}%`} OR 
            ${customers.lastName} ILIKE ${`%${search}%`} OR 
            ${customers.email} ILIKE ${`%${search}%`} OR 
            ${customers.phone} ILIKE ${`%${search}%`} OR
            ${customers.customerCode} ILIKE ${`%${search}%`}`,
      );
    }

    if (isActive !== undefined) {
      conditions.push(eq(customers.isActive, isActive));
    }

    if (isCreditAllowed !== undefined) {
      conditions.push(eq(customers.isCreditAllowed, isCreditAllowed));
    }

    if (hasOutstanding !== undefined) {
      conditions.push(
        hasOutstanding
          ? sql`${customers.outstandingBalance} > 0`
          : sql`${customers.outstandingBalance} = 0`,
      );
    }

    const whereCondition = and(...conditions);

    const sortColumn = customers[sortBy as keyof typeof customers];
    const orderByClause =
      sortColumn !== undefined
        ? sortOrder === 'desc'
          ? desc(sortColumn)
          : sortColumn
        : desc(customers.createdAt);

    const [countResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(whereCondition);

    const total = Number(countResult.count);
    const totalPages = Math.ceil(total / limit);
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
    input: CustomerPaymentInput,
  ) {
    const { amount, method, referenceNumber, notes, billIds } = input;

    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, customerId), eq(customers.businessId, businessId)),
      )
      .limit(1);

    if (!customer) {
      throw new Error('Customer not found');
    }

    const customerOutstanding = parseFloat(
      customer.outstandingBalance.toString(),
    );
    const customerTotalPayments = parseFloat(
      customer.totalPayments.toString(),
    );

    let targetBills: (typeof bills.$inferSelect)[] = [];
    let totalSelectedBalance = 0;

    if (billIds && billIds.length > 0) {
      const billsForCustomer = await db
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.businessId, businessId),
            eq(bills.customerId, customerId),
            sql`${bills.id} = ANY(${billIds})`,
          ),
        );

      const billsById = new Map(billsForCustomer.map((b) => [b.id, b]));
      targetBills = billIds
        .map((id) => billsById.get(id))
        .filter((b): b is (typeof billsForCustomer)[number] => {
          if (!b) return false;
          const balance = parseFloat(b.balanceAmount.toString());
          return balance > 0;
        });

      totalSelectedBalance = targetBills.reduce(
        (sumBalance, b) => sumBalance + parseFloat(b.balanceAmount.toString()),
        0,
      );

      if (amount - totalSelectedBalance > 0.01) {
        throw new Error(
          'Payment amount exceeds total balance of selected bills. Reduce amount or select more bills.',
        );
      }
    }

    return db.transaction(async (tx) => {
      const prefix = `CUST-PAY-${new Date().getFullYear()}`;
      const [lastPayment] = await tx
        .select({ paymentNumber: payments.paymentNumber })
        .from(payments)
        .where(
          and(
            eq(payments.businessId, businessId),
            sql`${payments.paymentNumber} LIKE ${`${prefix}-%`}`,
          ),
        )
        .orderBy(desc(payments.createdAt))
        .limit(1);

      const nextSequence =
        lastPayment !== undefined
          ? parseInt(lastPayment.paymentNumber.split('-').pop() ?? '0', 10) + 1
          : 1;
      const paymentNumber = `${prefix}-${nextSequence
        .toString()
        .padStart(5, '0')}`;

      const [payment] = await tx
        .insert(payments)
        .values({
          businessId,
          customerId,
          paymentNumber,
          paymentDate: new Date(),
          amount: amount.toString(),
          method: method as PaymentMethod,
          status: 'COMPLETED' as PaymentStatus,
          allocatedAmount: '0',
          unallocatedAmount: amount.toString(),
          referenceNumber,
          notes,
          createdBy: userId,
        })
        .returning();

      let remaining = amount;
      let allocated = 0;
      let allocationOrder = 1;

      for (const bill of targetBills) {
        if (remaining <= 0) break;

        const billBalance = parseFloat(bill.balanceAmount.toString());
        if (billBalance <= 0) {
          continue;
        }

        const allocationAmount = Math.min(remaining, billBalance);
        const billBalanceAfter = billBalance - allocationAmount;

        await tx.insert(paymentAllocations).values({
          paymentId: payment.id,
          billId: bill.id,
          allocatedAmount: allocationAmount.toString(),
          billBalanceBefore: billBalance.toString(),
          billBalanceAfter: billBalanceAfter.toString(),
          allocationDate: new Date(),
          allocationOrder,
        });

        allocationOrder += 1;

        const newPaidAmount = (
          parseFloat(bill.paidAmount.toString()) + allocationAmount
        ).toFixed(2);
        const newBalanceAmount = billBalanceAfter.toFixed(2);

        let newStatus: BillingStatus = bill.status as BillingStatus;
        let newPaymentStatus: PaymentStatus =
          bill.paymentStatus as PaymentStatus;

        if (parseFloat(newBalanceAmount) <= 0.01) {
          newStatus = 'PAID';
          newPaymentStatus = 'COMPLETED';
        } else if (parseFloat(newPaidAmount) > 0) {
          newStatus = 'PARTIAL';
          newPaymentStatus = 'PENDING';
        }

        await tx
          .update(bills)
          .set({
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus,
            paymentStatus: newPaymentStatus,
          })
          .where(eq(bills.id, bill.id));

        allocated += allocationAmount;
        remaining -= allocationAmount;
      }

      await tx
        .update(payments)
        .set({
          allocatedAmount: allocated.toFixed(2),
          unallocatedAmount: remaining.toFixed(2),
        })
        .where(eq(payments.id, payment.id));

      const newOutstanding = (customerOutstanding - allocated).toFixed(2);
      const newTotalPayments = (customerTotalPayments + amount).toFixed(2);

      await tx
        .update(customers)
        .set({
          outstandingBalance: newOutstanding,
          totalPayments: newTotalPayments,
        })
        .where(eq(customers.id, customerId));

      logger.info('Customer payment added', {
        paymentId: payment.id,
        customerId,
        amount,
        allocated,
        remaining,
      });

      return {
        ...payment,
        allocatedAmount: allocated.toFixed(2),
        unallocatedAmount: remaining.toFixed(2),
      };
    });
  }

  async getCustomerStatement(
    businessId: string,
    customerId: string,
    input: CustomerStatementInput,
  ) {
    const { startDate, endDate } = input;

    const customer = await this.getCustomer(businessId, customerId);

    const billConditions: SQL[] = [
      eq(bills.customerId, customerId),
      eq(bills.businessId, businessId),
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

    const paymentConditions: SQL[] = [
      eq(payments.customerId, customerId),
      eq(payments.businessId, businessId),
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

    let openingBalance = 0;
    if (startDate) {
      const [openingBills] = await db
        .select({ total: sum(bills.totalAmount) })
        .from(bills)
        .where(
          and(
            eq(bills.customerId, customerId),
            eq(bills.businessId, businessId),
            sql`${bills.billDate} < ${new Date(startDate)}`,
          ),
        );

      const [openingPayments] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            eq(payments.customerId, customerId),
            eq(payments.businessId, businessId),
            sql`${payments.paymentDate} < ${new Date(startDate)}`,
          ),
        );

      openingBalance =
        Number(openingBills?.total ?? 0) - Number(openingPayments?.total ?? 0);
    }

    const transactions = [
      ...customerBills.map((bill) => ({
        date: bill.billDate,
        type: 'BILL' as const,
        description: `Bill ${bill.billNumber}`,
        debit: Number(bill.totalAmount),
        credit: 0,
        balance: 0,
      })),
      ...customerPayments.map((payment) => ({
        date: payment.paymentDate,
        type: 'PAYMENT' as const,
        description: `Payment ${payment.paymentNumber}`,
        debit: 0,
        credit: Number(payment.amount),
        balance: 0,
      })),
    ].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

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
      .where(
        and(
          eq(customers.businessId, businessId),
          eq(customers.isActive, true),
        ),
      );

    const [customersWithOutstanding] = await db
      .select({ count: count() })
      .from(customers)
      .where(
        and(
          eq(customers.businessId, businessId),
          sql`${customers.outstandingBalance} > 0`,
        ),
      );

    const [totalOutstanding] = await db
      .select({ total: sum(customers.outstandingBalance) })
      .from(customers)
      .where(eq(customers.businessId, businessId));

    return {
      totalCustomers: Number(totalCustomers.count),
      activeCustomers: Number(activeCustomers.count),
      customersWithOutstanding: Number(customersWithOutstanding.count),
      totalOutstanding: Number(totalOutstanding.total ?? 0),
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
      const lastNumber = Number(
        lastCustomer.customerCode.replace(/[^0-9]/g, ''),
      );
      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `CUST-${nextNumber.toString().padStart(4, '0')}`;
  }
}


