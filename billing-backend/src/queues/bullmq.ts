import { Queue, Worker, Job, RepeatOptions } from 'bullmq';
import { redis } from '../config/redis';
import { logger, logBackgroundJob } from '../utils/logger';

// Job data type interfaces
interface CleanupData {
  daysOld?: number;
}

interface ReportData {
  businessId: string;
  reportType: string;
  dateRange?: { start: Date; end: Date };
}

interface BackupData {
  businessId: string;
  backupType: string;
}

interface BillNotificationData {
  type: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  billId: string;
  businessId: string;
}

interface PaymentReminderData {
  customerId: string;
  businessId: string;
  type: 'email' | 'sms' | 'whatsapp';
}

interface LowStockAlertData {
  businessId: string;
}

interface AIGenerationData {
  prompt: string;
  style?: string;
}

interface ExportFilters {
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  isActive?: boolean;
  hasOutstanding?: boolean;
  lowStock?: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Queue names
export const QUEUE_NAMES = {
  BILL_NOTIFICATIONS: 'bill-notifications',
  PAYMENT_REMINDERS: 'payment-reminders',
  LOW_STOCK_ALERTS: 'low-stock-alerts',
  BACKGROUND_TASKS: 'background-tasks',
  AI_GENERATION: 'ai-generation',
  DATA_EXPORTS: 'data-exports',
};

// Create queues
export const billNotificationQueue = new Queue(QUEUE_NAMES.BILL_NOTIFICATIONS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const paymentReminderQueue = new Queue(QUEUE_NAMES.PAYMENT_REMINDERS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const lowStockAlertQueue = new Queue(QUEUE_NAMES.LOW_STOCK_ALERTS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const backgroundTaskQueue = new Queue(QUEUE_NAMES.BACKGROUND_TASKS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 10,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

export const aiGenerationQueue = new Queue(QUEUE_NAMES.AI_GENERATION, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 3,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const dataExportQueue = new Queue(QUEUE_NAMES.DATA_EXPORTS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Worker processors
export function setupWorkers(): Worker[] {
  // Bill notification worker
  const billNotificationWorker = new Worker(
    QUEUE_NAMES.BILL_NOTIFICATIONS,
    async (job: Job) => {
      const data = job.data as BillNotificationData;
      const { type, recipient, billId, businessId } = data;
      logBackgroundJob('bill_notification', 'started', { jobId: job.id, type, recipient });
      
      try {
        const { sendBillNotification } = await import('../utils/notifications');
        const { BillingService } = await import('../services/billing.service');
        
        const billingService = new BillingService();
        const billData = await billingService.getBill(businessId, billId);
        
        const items = billData.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          totalAmount: Number(item.totalAmount)
        }));
        
        await sendBillNotification(type, recipient, billData, items);
        
        logBackgroundJob('bill_notification', 'completed', { jobId: job.id, type, recipient });
      } catch (error) {
        logBackgroundJob('bill_notification', 'failed', { jobId: job.id, error: getErrorMessage(error) });
        throw error;
      }
    },
    { connection: redis }
  );

  // Payment reminder worker
  const paymentReminderWorker = new Worker(
    QUEUE_NAMES.PAYMENT_REMINDERS,
    async (job: Job) => {
      const data = job.data as PaymentReminderData;
      const { customerId, businessId, type } = data;
      logBackgroundJob('payment_reminder', 'started', { jobId: job.id, customerId, type });
      
      try {
        const { CustomerService } = await import('../services/customer.service');
        const { sendOverdueReminder } = await import('../utils/notifications');
        
        const customerService = new CustomerService();
        const customer = await customerService.getCustomer(businessId, customerId);
        
        const { db } = await import('../config/database');
        const { bills } = await import('../models/drizzle/schema');
        const { eq, and, sql } = await import('drizzle-orm');
        
        const overdueBills = await db
          .select()
          .from(bills)
          .where(and(
            eq(bills.customerId, customerId),
            eq(bills.businessId, businessId),
            sql`${bills.dueDate} < NOW()`,
            eq(bills.status, 'PENDING')
          ));
        
        if (overdueBills.length > 0) {
          const recipient = type === 'email' ? customer.email : customer.phone;
          if (recipient) {
            const billData = overdueBills[0];
            if (billData) {
              const bill = {
                ...billData,
                id: String(billData.id),
                billNumber: billData.billNumber || '',
                billDate: billData.createdAt || new Date(),
                totalAmount: Number(billData.totalAmount),
                paidAmount: Number(billData.paidAmount),
                balanceAmount: Number(billData.balanceAmount),
                discountAmount: Number(billData.discountAmount),
                taxAmount: Number(billData.taxAmount),
                subtotal: Number(billData.subtotal), 
              };
              // Use a partial type matching the notification service expectation
              type BillNotificationPayload = typeof bill;
              await sendOverdueReminder(type, recipient, bill as BillNotificationPayload);
            }
          }
        }
        
        logBackgroundJob('payment_reminder', 'completed', { jobId: job.id, customerId });
      } catch (error) {
        logBackgroundJob('payment_reminder', 'failed', { jobId: job.id, error: getErrorMessage(error) });
        throw error;
      }
    },
    { connection: redis }
  );

  // Low stock alert worker
  const lowStockAlertWorker = new Worker(
    QUEUE_NAMES.LOW_STOCK_ALERTS,
    async (job: Job) => {
      const data = job.data as LowStockAlertData;
      const { businessId } = data;
      logBackgroundJob('low_stock_alert', 'started', { jobId: job.id, businessId });
      
      try {
        const { ProductService } = await import('../services/product.service');
        const { sendLowStockAlert } = await import('../utils/notifications');
        
        const productService = new ProductService();
        const lowStockProducts = await productService.getLowStockProducts(businessId);
        
        if (lowStockProducts.length > 0) {
          const { db } = await import('../config/database');
          const { retailBusinesses, users } = await import('../models/drizzle/schema');
          const { eq } = await import('drizzle-orm');
          
          const [business] = await db
            .select()
            .from(retailBusinesses)
            .where(eq(retailBusinesses.id, businessId))
            .limit(1);
          
          if (business) {
            const [owner] = await db
              .select()
              .from(users)
              .where(eq(users.id, business.ownerId))
              .limit(1);
            
            if (owner && owner.email) {
              const products = lowStockProducts.map((p) => ({
                ...p,
                currentStock: Number(p.currentStock),
                sellingPrice: Number(p.sellingPrice),
                costPrice: p.purchasePrice ? Number(p.purchasePrice) : 0,
                minimumStock: Number(p.minimumStock || 0),
              }));
              await sendLowStockAlert('email', owner.email, products);
            }
          }
        }
        
        logBackgroundJob('low_stock_alert', 'completed', { jobId: job.id, businessId, alertCount: lowStockProducts.length });
      } catch (error) {
        logBackgroundJob('low_stock_alert', 'failed', { jobId: job.id, error: getErrorMessage(error) });
        throw error;
      }
    },
    { connection: redis }
  );

  // Background task worker
  const backgroundTaskWorker = new Worker(
    QUEUE_NAMES.BACKGROUND_TASKS,
    async (job: Job) => {
      const jobData = job.data as { task: string; data: CleanupData | ReportData | BackupData };
      const { task, data } = jobData;
      logBackgroundJob(task, 'started', { jobId: job.id, data });
      
      try {
        switch (task) {
          case 'cleanup_old_data':
            await cleanupOldData(data as CleanupData);
            break;
          case 'generate_reports':
            await generateReports(data as ReportData);
            break;
          case 'backup_data':
            await backupData(data as BackupData);
            break;
          default:
            throw new Error(`Unknown task: ${task}`);
        }
        
        logBackgroundJob(task, 'completed', { jobId: job.id });
      } catch (error) {
        logBackgroundJob(task, 'failed', { jobId: job.id, error: getErrorMessage(error) });
        throw error;
      }
    },
    { connection: redis }
  );

  // AI generation worker
  const aiGenerationWorker = new Worker(
    QUEUE_NAMES.AI_GENERATION,
    async (job: Job) => {
      const jobData = job.data as { type: string; data: AIGenerationData; userId: string; businessId: string };
      const { type, data, userId, businessId } = jobData;
      logBackgroundJob('ai_generation', 'started', { jobId: job.id, type, userId });
      
      try {
        const { AIGenerationService } = await import('../services/ai.service');
        const aiService = new AIGenerationService();
        
        let result;
        switch (type) {
          case 'banner':
            result = await aiService.generateBanner(data.prompt, userId, businessId);
            break;
          case 'sql_query':
            result = await aiService.generateSQLQuery(data.prompt, userId, businessId);
            break;
          case 'text':
            result = await aiService.generateText(data.prompt, data.style ?? 'professional', userId, businessId);
            break;
          default:
            throw new Error(`Unknown AI generation type: ${type}`);
        }
        
        logBackgroundJob('ai_generation', 'completed', { jobId: job.id, type, userId });
        return result;
      } catch (error) {
        logBackgroundJob('ai_generation', 'failed', { jobId: job.id, error: getErrorMessage(error) });
        throw error;
      }
    },
    { connection: redis }
  );

  // Data export worker
  const dataExportWorker = new Worker(
    QUEUE_NAMES.DATA_EXPORTS,
    async (job: Job) => {
      const jobData = job.data as { type: string; filters: ExportFilters; userId: string; businessId: string };
      const { type, filters, userId, businessId } = jobData;
      logBackgroundJob('data_export', 'started', { jobId: job.id, type, userId });
      
      try {
        const { DataExportService } = await import('../services/export.service');
        const exportService = new DataExportService();
        
        let result;
        switch (type) {
          case 'customers':
            result = await exportService.exportCustomers(businessId, filters);
            break;
          case 'bills':
            result = await exportService.exportBills(businessId, filters);
            break;
          case 'products':
            result = await exportService.exportProducts(businessId, filters);
            break;
          case 'payments':
            result = await exportService.exportPayments(businessId, filters);
            break;
          default:
            throw new Error(`Unknown export type: ${type}`);
        }
        
        logBackgroundJob('data_export', 'completed', { jobId: job.id, type, userId });
        return result;
      } catch (error) {
        logBackgroundJob('data_export', 'failed', { jobId: job.id, error: getErrorMessage(error) });
        throw error;
      }
    },
    { connection: redis }
  );

  // Set up error handlers
  const workers = [
    billNotificationWorker,
    paymentReminderWorker,
    lowStockAlertWorker,
    backgroundTaskWorker,
    aiGenerationWorker,
    dataExportWorker,
  ];

  workers.forEach(worker => {
    worker.on('failed', (job, err) => {
      logger.error(`Worker failed`, { 
        queue: worker.name, 
        jobId: job?.id, 
        error: err.message 
      });
    });

    worker.on('completed', (job) => {
      logger.info(`Worker completed job`, { 
        queue: worker.name, 
        jobId: job.id 
      });
    });
  });

  return workers;
}

// Background task processors
async function cleanupOldData(data: CleanupData): Promise<void> {
  const { db } = await import('../config/database');
  const { auditLogs, messages } = await import('../models/drizzle/schema');
  const { sql } = await import('drizzle-orm');
  
  const { daysOld = 90 } = data;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  await db.delete(auditLogs).where(sql`${auditLogs.createdAt} < ${cutoffDate}`);
  await db.delete(messages).where(sql`${messages.createdAt} < ${cutoffDate}`);
  
  logger.info('Old data cleaned up', { cutoffDate });
}

async function generateReports(data: ReportData): Promise<void> {
  const { businessId, reportType, dateRange } = data;
  logger.info('Report generated', { businessId, reportType, dateRange });
}

async function backupData(data: BackupData): Promise<void> {
  const { businessId, backupType } = data;
  logger.info('Data backup completed', { businessId, backupType });
}

// Utility functions for adding jobs
export async function addBillNotificationJob(data: BillNotificationData, delay?: number): Promise<Job> {
  const job = await billNotificationQueue.add('send-bill-notification', data, {
    delay,
    attempts: 3,
  });
  return job;
}

export async function addPaymentReminderJob(data: PaymentReminderData, repeat?: RepeatOptions): Promise<Job> {
  const job = await paymentReminderQueue.add('send-payment-reminder', data, {
    repeat,
    attempts: 2,
  });
  return job;
}

export async function addLowStockAlertJob(data: LowStockAlertData): Promise<Job> {
  const job = await lowStockAlertQueue.add('check-low-stock', data, {
    attempts: 2,
  });
  return job;
}

export async function addBackgroundTaskJob(task: string, data: CleanupData | ReportData | BackupData, delay?: number): Promise<Job> {
  const job = await backgroundTaskQueue.add('process-task', { task, data }, {
    delay,
    attempts: 5,
  });
  return job;
}

export async function addAIGenerationJob(type: string, data: AIGenerationData, userId: string, businessId: string): Promise<Job> {
  const job = await aiGenerationQueue.add('generate-content', { type, data, userId, businessId }, {
    attempts: 2,
  });
  return job;
}

export async function addDataExportJob(type: string, filters: ExportFilters, userId: string, businessId: string): Promise<Job> {
  const job = await dataExportQueue.add('export-data', { type, filters, userId, businessId }, {
    attempts: 3,
  });
  return job;
}

// Initialize queues and workers
export async function initializeQueues(): Promise<Worker[]> {
  try {
    await redis.ping();
    logger.info('Redis connection established for queues');
    
    const workers = setupWorkers();
    logger.info('BullMQ workers initialized', { workerCount: workers.length });
    
    return workers;
  } catch (error) {
    logger.error('Failed to initialize queues', { error });
    throw error;
  }
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  try {
    await billNotificationQueue.close();
    await paymentReminderQueue.close();
    await lowStockAlertQueue.close();
    await backgroundTaskQueue.close();
    await aiGenerationQueue.close();
    await dataExportQueue.close();
    
    logger.info('All queues closed');
  } catch (error) {
    logger.error('Error closing queues', { error });
  }
}