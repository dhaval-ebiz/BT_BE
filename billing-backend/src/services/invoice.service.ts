import PDFDocument from 'pdfkit';
import { BillingService } from './billing.service';
import { retailBusinesses } from '../models/drizzle/schema';
import { db } from '../config/database';
import { eq } from 'drizzle-orm';

// Interface for bill items used in invoice
interface InvoiceItem {
  productName: string;
  quantity: string | number;
  rate: string | number;
  totalAmount: string | number;
}

// Interface for bill with relations
interface BillWithRelations {
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  items?: InvoiceItem[];
}

const billingService = new BillingService();

export class InvoiceService {
  
  async generateInvoicePdf(businessId: string, billId: string): Promise<PDFKit.PDFDocument> {
    const bill = await billingService.getBill(businessId, billId);
    
    // Fetch Business Details for Header
    const [business] = await db.select().from(retailBusinesses).where(eq(retailBusinesses.id, businessId));
    
    const doc = new PDFDocument({ margin: 50 });

    // HEADER
    doc
      .fontSize(20)
      .text(business?.name || 'Business Name', 50, 50)
      .fontSize(10)
      .text(business?.description || '', 50, 75)
      .text(`Phone: ${business?.phone || ''}`, 50, 90)
      .text(`Email: ${business?.email || ''}`, 50, 105)
      .moveDown();

    // If address/contact info is missing in schema, we'll verify where it is later.
    // For now, removing lines that cause type errors.


    // INVOICE DETAILS
    doc
      .fontSize(16)
      .text('INVOICE', 400, 50, { align: 'right' })
      .fontSize(10)
      .text(`Invoice #: ${bill.billNumber}`, 400, 75, { align: 'right' })
      .text(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, 400, 90, { align: 'right' })
      .text(`Due Date: ${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}`, 400, 105, { align: 'right' })
      .text(`Status: ${bill.status}`, 400, 120, { align: 'right' });

    doc.moveDown(2);

    // BILL TO
    const customer = (bill as unknown as BillWithRelations).customer;
    doc
        .fontSize(12).text('Bill To:', 50, 150)
        .fontSize(10)
        .text(customer?.name || 'Walk-in Customer', 50, 165)
        .text(customer?.phone || '', 50, 180)
        .text(customer?.email || '', 50, 195);
        
    // ITEMS TABLE HEADER
    const tableTop = 250;
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 250, tableTop, { width: 50, align: 'right' });
    doc.text('Rate', 300, tableTop, { width: 70, align: 'right' });
    doc.text('Total', 400, tableTop, { width: 70, align: 'right' });
    doc.font('Helvetica');
    
    doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();

    // ITEMS
    let y = tableTop + 25;
    const items: InvoiceItem[] = (bill as unknown as BillWithRelations).items || [];
    
    for (const item of items) {
        doc.text(item.productName, 50, y);
        doc.text(item.quantity, 250, y, { width: 50, align: 'right' });
        doc.text(item.rate, 300, y, { width: 70, align: 'right' });
        doc.text(item.totalAmount, 400, y, { width: 70, align: 'right' });
        y += 20;
    }
    
    doc.moveTo(50, y).lineTo(500, y).stroke();
    y += 10;

    // TOTALS
    const rightColX = 400;
    
    doc.text('Subtotal:', 300, y, { width: 90, align: 'right' });
    doc.text(bill.subtotal, rightColX, y, { width: 70, align: 'right' });
    y += 15;
    
    if (parseFloat(bill.discountAmount) > 0) {
        doc.text('Discount:', 300, y, { width: 90, align: 'right' });
        doc.text(`-${bill.discountAmount}`, rightColX, y, { width: 70, align: 'right' });
        y += 15;
    }
    
    if (parseFloat(bill.taxAmount) > 0) {
        doc.text('Tax:', 300, y, { width: 90, align: 'right' });
        doc.text(bill.taxAmount, rightColX, y, { width: 70, align: 'right' });
        y += 15;
    }

    doc.font('Helvetica-Bold');
    doc.text('Grand Total:', 300, y, { width: 90, align: 'right' });
    doc.text(bill.totalAmount, rightColX, y, { width: 70, align: 'right' });
    doc.font('Helvetica');
    y += 25;

    // FOOTER
    doc.fontSize(10).text('Thank you for your business!', 50, y + 50, { align: 'center', width: 500 });

    return doc;
  }
}
