import { Response } from 'express';
import { BillingService } from '../services/billing.service';
import { BusinessRequest } from '../middleware/auth.middleware';
import { 
  createBillSchema, 
  updateBillSchema, 
  billQuerySchema, 
  billPaymentSchema 
} from '../schemas/bill.schema';
import { logApiRequest, logger } from '../utils/logger';
import { getErrorMessage, AppError, BadRequestError, ForbiddenError, NotFoundError } from '../utils/app-errors';
import { ZodError } from 'zod';

const billingService = new BillingService();

export class BillingController {
  
  private handleError(res: Response, error: unknown, defaultMessage: string): Response {
    logger.error(`${defaultMessage}:`, error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    const message = getErrorMessage(error) || defaultMessage;
    return res.status(500).json({
      success: false,
      message
    });
  }

  async createBill(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.business || !req.user) {
        throw new ForbiddenError('Auth required');
      }

      const validation = createBillSchema.safeParse(req.body);
      if (!validation.success) throw new ZodError(validation.error.issues);

      const bill = await billingService.createBill(req.business.id, req.user.id, validation.data, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.status(201).json({ success: true, data: bill });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Create bill error');
    }
  }

  async getBill(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.business) throw new ForbiddenError('Business required');
      
      const { billId } = req.params;
      if (!billId) throw new BadRequestError('Invalid bill ID');

      const bill = await billingService.getBill(req.business.id, billId);
      if (!bill) throw new NotFoundError('Bill not found');
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: bill });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Get bill error');
    }
  }

  async updateBill(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) throw new ForbiddenError('Auth required');
        
        const { billId } = req.params;
        if (!billId) throw new BadRequestError('Invalid bill ID');

        const validation = updateBillSchema.safeParse(req.body);
        if (!validation.success) throw new ZodError(validation.error.issues);

        const result = await billingService.updateBill(req.business.id, req.user.id, billId, validation.data);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: result });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Update bill error');
    }
  }

  async listBills(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business) throw new ForbiddenError('Auth required');
        
        const constructedQuery: Record<string, unknown> = { ...req.query };
        if (req.query.page) constructedQuery.page = Number(req.query.page);
        if (req.query.limit) constructedQuery.limit = Number(req.query.limit);
        if (req.query.minAmount) constructedQuery.minAmount = Number(req.query.minAmount);
        if (req.query.maxAmount) constructedQuery.maxAmount = Number(req.query.maxAmount);
        if (req.query.hasBalance === 'true') constructedQuery.hasBalance = true;

        const validation = billQuerySchema.safeParse(constructedQuery);
        if (!validation.success) throw new ZodError(validation.error.issues);

        const result = await billingService.listBills(req.business.id, validation.data);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: result });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'List bills error');
    }
  }

  async recordPayment(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) throw new ForbiddenError('Auth required');
        
        const { billId } = req.params;
        if (!billId) throw new BadRequestError('Invalid bill ID');

        const validation = billPaymentSchema.safeParse(req.body);
        if (!validation.success) throw new ZodError(validation.error.issues);

        const result = await billingService.recordPayment(req.business.id, req.user.id, billId, validation.data, req);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.status(201).json({ success: true, data: result });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Record payment error');
    }
  }

  async getSuggestions(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business) throw new ForbiddenError('Business required');
        
        const customerId = req.query.customerId as string;
        if (!customerId) throw new BadRequestError('Customer ID is required');

        const suggestions = await billingService.getSuggestions(req.business.id, customerId);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: suggestions });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Get suggestions error');
    }
  }

  async recordBulkPayment(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) throw new ForbiddenError('Auth required');
        
        const body = req.body as { customerId?: string };
        const { customerId } = body;
        
        if (!customerId) throw new BadRequestError('Customer ID is required');

        const validation = billPaymentSchema.safeParse(req.body);
        if (!validation.success) throw new ZodError(validation.error.issues);

        const result = await billingService.recordBulkPayment(req.business.id, req.user.id, customerId, validation.data, req);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.status(201).json({ success: true, data: result });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Record bulk payment error');
    }
  }

  async generateInvoicePdf(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business) throw new ForbiddenError('Auth required');
        const { billId } = req.params;
        if (!billId) throw new BadRequestError('Invalid bill ID');
        
        const { InvoiceService } = await import('../services/invoice.service');
        const invoiceService = new InvoiceService();
        
        const doc = await invoiceService.generateInvoicePdf(req.business.id, billId);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${billId}.pdf`);
        
        doc.pipe(res);
        doc.end();
        
        logApiRequest(req, res, Date.now() - startTime);
    } catch (error: unknown) {
        logApiRequest(req, res, Date.now() - startTime);
        if (!res.headersSent) {
           this.handleError(res, error, 'Generate invoice PDF error');
        }
    }
  }

  async shareBill(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) throw new ForbiddenError('Auth required');
        
        const { billId } = req.params;
        const body = req.body as { email?: string };
        const { email } = body;
        
        if (!billId) throw new BadRequestError('Invalid bill ID');

        // 1. Get Bill
        const bill = await billingService.getBill(req.business.id, billId);
        if (!bill) throw new NotFoundError('Bill not found');
        
        // Define a partial interface for what we expect from the joined service result
        type BillWithCustomer = {
            billNumber: string;
            customer?: {
                email?: string | null;
            } | null;
        };
        
        const billData = bill as unknown as BillWithCustomer;
        const targetEmail = email || billData.customer?.email;
        
        if (!targetEmail) {
            throw new BadRequestError('No email provided and customer has no email on record.');
        }

        // 2. Generate PDF
        const { InvoiceService } = await import('../services/invoice.service');
        const invoiceService = new InvoiceService();
        const doc = await invoiceService.generateInvoicePdf(req.business.id, billId);

        // 3. Buffer
        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        
        const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
        
        doc.end();
        const pdfBuffer = await pdfBufferPromise;

        // 4. Email
        const { sendEmail } = await import('../utils/email');
        await sendEmail({
            to: targetEmail,
            subject: `Invoice ${bill.billNumber} from ${req.business.name}`,
            text: `Dear Customer,\n\nPlease find attached your invoice ${bill.billNumber}.\n\nThank you,\n${req.business.name}`,
            html: `<p>Dear Customer,</p><p>Please find attached your invoice <strong>${bill.billNumber}</strong>.</p>`,
            attachments: [
                {
                    filename: `Invoice-${bill.billNumber}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, message: 'Invoice sent successfully' });

    } catch (error: unknown) {
        logApiRequest(req, res, Date.now() - startTime);
        this.handleError(res, error, 'Share bill error');
    }
  }
}