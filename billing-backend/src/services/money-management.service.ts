


import { logger } from '../utils/logger';
import { z } from 'zod';

// const auditService = new AuditService();
// const permissionService = new PermissionService();

// Validation schemas
const depositMoneySchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const withdrawMoneySchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  method: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const transferMoneySchema = z.object({
  fromCustomerId: z.string().uuid(),
  toCustomerId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  notes: z.string().optional(),
});

export class MoneyManagementService {
  /**
   * Deposit money to customer account
   */
  async depositMoney(
    _businessId: string,
    _userId: string,
    _data: z.infer<typeof depositMoneySchema>
  ): Promise<unknown> {
    try {
      /*
      // Check permission
      const hasPermission = await permissionService.hasPermission(
        userId,
        businessId,
        'MONEY_DEPOSIT'
      );

      if (!hasPermission) {
        throw new Error('You do not have permission to deposit money');
      }

      // Get customer and verify business ownership
      const customer = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, data.customerId), eq(customers.businessId, businessId)))
        .limit(1);

      if (!customer.length) {
        throw new Error('Customer not found or does not belong to this business');
      }

      const customerData = customer[0];
      const currentBalance = parseFloat(String(customerData.currentBalance || '0'));
      const currentDeposits = parseFloat(String(customerData.totalDeposits || '0'));
      const newBalance = currentBalance + data.amount;
      const newTotalDeposits = currentDeposits + data.amount;

      // Update customer balance
      await db
        .update(customers)
        .set({
          currentBalance: String(newBalance),
          totalDeposits: String(newTotalDeposits),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, data.customerId));

      // Create money transaction record
      const transaction = await db.insert(moneyTransactions).values({
        businessId,
        customerId: data.customerId,
        type: 'DEPOSIT',
        amount: String(data.amount),
        method: data.method,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        previousBalance: String(currentBalance),
        newBalance: String(newBalance),
        performedBy: userId,
        status: 'COMPLETED',
      }).returning();

      // Audit log
      await auditService.logCustomerAction(
        'MONEY_DEPOSIT',
        businessId,
        userId,
        data.customerId,
        { currentBalance: customerData.currentBalance || 0 },
        { currentBalance: newBalance },
        `Deposited ${data.amount} via ${data.method}`
      );

      logger.info('Money deposited successfully', {
        businessId,
        userId,
        customerId: data.customerId,
        amount: data.amount,
        transactionId: transaction[0].id,
      });

      return {
        transaction: transaction[0],
        customer: {
          ...customerData,
          currentBalance: newBalance,
          totalDeposits: (customerData.totalDeposits || 0) + data.amount,
        },
      };
      */
      throw new Error("Feature disabled due to missing schema");
    } catch (error) {
      logger.error('Error depositing money', { error, businessId: _businessId, userId: _userId, data: _data });
      throw error;
    }
  }

  /**
   * Withdraw money from customer account
   */
  async withdrawMoney(
    _businessId: string,
    _userId: string,
    _data: z.infer<typeof withdrawMoneySchema>
  ): Promise<unknown> {
    try {
      /*
      // Check permission
      // ... (code omitted for brevity in comment)
      */
      throw new Error("Feature disabled");
    } catch (error) {
      logger.error('Error withdrawing money', { error, businessId: _businessId, userId: _userId, data: _data });
      throw error;
    }
  }

  /**
   * Transfer money between customer accounts
   */
  async transferMoney(
    _businessId: string,
    _userId: string,
    _data: z.infer<typeof transferMoneySchema>
  ): Promise<unknown> {
    try {
      /*
      // ... code
      */
      throw new Error("Feature disabled");
    } catch (error) {
      logger.error('Error transferring money', { error, businessId: _businessId, userId: _userId, data: _data });
      throw error;
    }
  }

  /**
   * Get customer balance and transaction history
   */
  async getCustomerMoneyHistory(
    businessId: string,
    _userId: string,
    customerId: string,
    _limit: number = 50,
    _offset: number = 0,
    _startDate?: Date,
    _endDate?: Date
  ): Promise<unknown> {
    try {
      /*
      // Check permission
      const hasPermission = await permissionService.hasPermission(
        userId,
        businessId,
        'CUSTOMER_READ'
      );

      if (!hasPermission) {
        throw new Error('You do not have permission to view customer details');
      }

      // Get customer and verify business ownership
      const customer = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
        .limit(1);

      if (!customer.length) {
        throw new Error('Customer not found or does not belong to this business');
      }

      // Build query for transactions
      let query = db
        .select({
          transaction: moneyTransactions,
          performedByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(moneyTransactions)
        .leftJoin(users, eq(moneyTransactions.performedBy, users.id))
        .where(
          and(
            eq(moneyTransactions.businessId, businessId),
            eq(moneyTransactions.customerId, customerId)
          )
        )
        .orderBy(desc(moneyTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      // Add date filters if provided
      if (startDate || endDate) {
        const conditions = [
          eq(moneyTransactions.businessId, businessId),
          eq(moneyTransactions.customerId, customerId),
        ];

        if (startDate) {
          conditions.push(sql`money_transactions.created_at >= ${startDate}`);
        }
        if (endDate) {
          conditions.push(sql`money_transactions.created_at <= ${endDate}`);
        }

        query = db
          .select({
            transaction: moneyTransactions,
            performedByUser: {
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            },
          })
          .from(moneyTransactions)
          .leftJoin(users, eq(moneyTransactions.performedBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(moneyTransactions.createdAt))
          .limit(limit)
          .offset(offset);
      }

      const transactions = await query;

      // Get transaction statistics
      const stats = await db
        .select({
          totalDeposits: sql<string>`sum(case when ${moneyTransactions.type} = 'DEPOSIT' then ${moneyTransactions.amount} else 0 end)`,
          totalWithdrawals: sql<string>`sum(case when ${moneyTransactions.type} = 'WITHDRAWAL' then ${moneyTransactions.amount} else 0 end)`,
          totalTransfersIn: sql<string>`sum(case when ${moneyTransactions.type} = 'TRANSFER' then ${moneyTransactions.amount} else 0 end)`,
          transactionCount: sql<number>`count(*)`,
        })
        .from(moneyTransactions)
        .where(
          and(
            eq(moneyTransactions.businessId, businessId),
            eq(moneyTransactions.customerId, customerId),
            eq(moneyTransactions.status, 'COMPLETED')
          )
        );

      return {
        customer: customer[0],
        transactions,
        stats: stats[0],
        pagination: {
          limit,
          offset,
          total: stats[0]?.transactionCount || 0,
        },
      };
      */
      throw new Error("Feature disabled");
    } catch (error) {
      logger.error('Error getting customer money history', { error, businessId, customerId });
      throw error;
    }
  }

  /**
   * Get business money summary
   */
  async getBusinessMoneySummary(businessId: string, _userId: string): Promise<unknown> {
    try {
      /*
      // ... code
      */
      throw new Error("Feature disabled");
    } catch (error) {
      logger.error('Error getting business money summary', { error, businessId });
      throw error;
    }
  }
}
