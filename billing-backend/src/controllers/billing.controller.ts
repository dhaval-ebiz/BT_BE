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

const billingService = new BillingService();

export class BillingController {
  
  async createBill(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({ success: false, message: 'Auth required' });
      }

      const validation = createBillSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, errors: validation.error.errors });
      }

      const bill = await billingService.createBill(req.business.id, req.user.id, validation.data, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.status(201).json({ success: true, data: bill });
    } catch (error: any) {
      logger.error('Create bill error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBill(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
      if (!req.business) return res.status(401).json({ success: false });
      
      const { billId } = req.params;
      const bill = await billingService.getBill(req.business.id, billId);
      
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: bill });
      logApiRequest(req, res, Date.now() - startTime);
      res.json({ success: true, data: bill });
    } catch (error: any) {
        logger.error('Get bill error:', error);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateBill(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) return res.status(401).json({ success: false });
        
        const { billId } = req.params;
        const validation = updateBillSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ success: false, errors: validation.error.errors });
        }

        const result = await billingService.updateBill(req.business.id, req.user.id, billId, validation.data);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: result });
    } catch (error: any) {
        logger.error('Update bill error:', error);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async listBills(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business) return res.status(401).json({ success: false });
        
        // Coerce types from query strings if needed, Zod handles basics but numbers need parsing sometimes
        // Assuming body parser or advanced query parser handles basic types, 
        // but for 'minAmount' string -> number conversion might be needed if using express standard behavior without qs lib configuration.
        // For now, passing req.query directly to schema check which allows some coercion if configured or passed correctly.
        
        // Parse query params manually for numbers/booleans if needed:
        const constructedQuery: any = { ...req.query };
        if (req.query.page) constructedQuery.page = Number(req.query.page);
        if (req.query.limit) constructedQuery.limit = Number(req.query.limit);
        if (req.query.minAmount) constructedQuery.minAmount = Number(req.query.minAmount);
        if (req.query.maxAmount) constructedQuery.maxAmount = Number(req.query.maxAmount);
        if (req.query.hasBalance === 'true') constructedQuery.hasBalance = true;

        const validation = billQuerySchema.safeParse(constructedQuery);
        if (!validation.success) {
             return res.status(400).json({ success: false, errors: validation.error.errors });
        }

        const result = await billingService.listBills(req.business.id, validation.data);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, data: result });
    } catch (error: any) {
        logger.error('List bills error:', error);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async recordPayment(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) return res.status(401).json({ success: false });
        
        const { billId } = req.params;
        const validation = billPaymentSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ success: false, errors: validation.error.errors });
        }

        const result = await billingService.recordPayment(req.business.id, req.user.id, billId, validation.data, req);
        
        logApiRequest(req, res, Date.now() - startTime);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        logger.error('Record payment error:', error);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(500).json({ success: false, message: error.message });
    }
  }

  async generateInvoicePdf(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business) return res.status(401).json({ success: false });
        const { billId } = req.params;
        
        // Dynamic import to avoid circular dependency if any, or just new service
        const { InvoiceService } = await import('../services/invoice.service');
        const invoiceService = new InvoiceService();
        
        const doc = await invoiceService.generateInvoicePdf(req.business.id, billId);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${billId}.pdf`);
        
        doc.pipe(res);
        doc.end();
        
        logApiRequest(req, res, Date.now() - startTime);
    } catch (error: any) {
        logger.error('Generate invoice PDF error:', error);
        logApiRequest(req, res, Date.now() - startTime);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
  }

  async shareBill(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    try {
        if (!req.business || !req.user) return res.status(401).json({ success: false });
        
        const { billId } = req.params;
        const { email } = req.body; // Can allow overriding email

        // 1. Get Bill to check existence and customer email if not provided
        const bill = await billingService.getBill(req.business.id, billId);
        
        const targetEmail = email || (bill as any).customer?.email;
        if (!targetEmail) {
            return res.status(400).json({ success: false, message: 'No email provided and customer has no email on record.' });
        }

        // 2. Generate PDF
        // Dynamic import to avoid circular dependency
        const { InvoiceService } = await import('../services/invoice.service');
        const invoiceService = new InvoiceService();
        const doc = await invoiceService.generateInvoicePdf(req.business.id, billId);

        // 3. Convert PDF Stream to Buffer
        const buffers: any[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        
        // Wait for stream to finish
        const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);
        });
        
        doc.end();
        const pdfBuffer = await pdfBufferPromise;

        // 4. Send Email
        const { sendEmail } = await import('../utils/email');
        await sendEmail({
            to: targetEmail,
            subject: `Invoice ${bill.billNumber} from ${req.business.name}`,
            text: `Dear Customer,\n\nPlease find attached your invoice ${bill.billNumber} for amount ${(bill as any).totalAmount}.\n\nThank you,\n${req.business.name}`,
            html: `<p>Dear Customer,</p><p>Please find attached your invoice <strong>${bill.billNumber}</strong> for amount <strong>${(bill as any).totalAmount}</strong>.</p><p>Thank you,<br/>${req.business.name}</p>`,
            attachments: [
                {
                    filename: `Invoice-${bill.billNumber}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        logApiRequest(req, res, Date.now() - startTime);
        res.json({ success: true, message: 'Invoice sent successfully' });

    } catch (error: any) {
        logger.error('Share bill error:', error);
        logApiRequest(req, res, Date.now() - startTime);
        res.status(500).json({ success: false, message: error.message });
    }
  }
}