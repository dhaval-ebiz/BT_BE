import { logger } from './logger';
import { sendSMS } from './sms';
import { sendWhatsAppMessage } from './whatsapp';
import { sendEmail } from './email';
import { formatCurrency } from './billing';
import { MessageTemplateService, TemplateVariables } from '../services/message-template.service';

const templateService = new MessageTemplateService();

// Type interfaces for notification functions
interface NotificationBill {
  id: string;
  businessId: string;
  billNumber: string;
  billDate: Date;
  dueDate?: Date | null;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
}

interface NotificationBillItem {
  productName: string;
  quantity: number;
  unit: string;
  rate: number | string;
  totalAmount: number | string;
}

interface NotificationPayment {
  id: string;
  amount: number | string;
  method: string;
  paymentDate: Date;
}

interface NotificationProduct {
  name: string;
  productCode: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
}

export async function sendBillNotification(
  type: 'email' | 'sms' | 'whatsapp',
  recipient: string,
  bill: NotificationBill,
  items: NotificationBillItem[]
): Promise<void> {
  try {
    const channelMap = {
      'email': 'EMAIL',
      'sms': 'SMS',
      'whatsapp': 'WHATSAPP'
    } as const;
    
    // Attempt to fetch custom template
    const template = await templateService.getTemplate(bill.businessId, 'BILL_CREATED', channelMap[type]);
    
    let subject = `Bill ${bill.billNumber} - ${formatCurrency(bill.totalAmount)}`;
    let message = '';

    if (template) {
      const variables: TemplateVariables = {
        billNumber: bill.billNumber,
        billDate: bill.billDate.toLocaleDateString(),
        dueDate: bill.dueDate?.toLocaleDateString() || '',
        totalAmount: formatCurrency(bill.totalAmount),
        paidAmount: formatCurrency(bill.paidAmount),
        balanceAmount: formatCurrency(bill.balanceAmount),
        customerName: 'Customer', // Would need to be passed in
        businessName: 'Our Business', // Would need method to fetch business name or pass it in
        itemsList: items.map(item => `${item.productName} (${item.quantity} ${item.unit})`).join(', ')
      };
      
      message = templateService.processTemplate(template.content, variables);
      if (template.subject) {
        subject = templateService.processTemplate(template.subject, variables);
      }
    } else {
      // Fallback Default Message
      message = `
Bill Details:
Bill Number: ${bill.billNumber}
Date: ${bill.billDate.toLocaleDateString()}
Total Amount: ${formatCurrency(bill.totalAmount)}
Paid Amount: ${formatCurrency(bill.paidAmount)}
Balance: ${formatCurrency(bill.balanceAmount)}

Items:
${items.map(item => `${item.productName} - ${item.quantity} ${item.unit} @ ${formatCurrency(item.rate)} = ${formatCurrency(item.totalAmount)}`).join('\n')}

Thank you for your business!
      `.trim();
    }

    switch (type) {
      case 'email':
        await sendEmail({
          to: recipient,
          subject,
          text: message,
          // HTML fallback logic omitted for brevity, logic could be expanded to support HTML templates
        });
        break;
        
      case 'sms':
        await sendSMS(recipient, `${subject}\n\n${message}`);
        break;
        
      case 'whatsapp':
        await sendWhatsAppMessage(recipient, `${subject}\n\n${message}`);
        break;
    }

    logger.info('Bill notification sent', { type, recipient, billId: bill.id });
  } catch (error) {
    logger.error('Failed to send bill notification', { error, type, recipient, billId: bill.id });
    // Don't throw to avoid blocking main flow
  }
}

export async function sendPaymentConfirmation(
  type: 'email' | 'sms' | 'whatsapp',
  recipient: string,
  payment: NotificationPayment,
  bill: NotificationBill
): Promise<void> {
  try {
    const channelMap = { 'email': 'EMAIL', 'sms': 'SMS', 'whatsapp': 'WHATSAPP' } as const;
    const template = await templateService.getTemplate(bill.businessId, 'PAYMENT_RECEIVED', channelMap[type]);

    let subject = `Payment Received - ${formatCurrency(payment.amount)}`;
    let message = '';

    if (template) {
       const variables: TemplateVariables = {
          billNumber: bill.billNumber,
          paymentAmount: formatCurrency(payment.amount),
          paymentMethod: payment.method,
          paymentDate: payment.paymentDate.toLocaleDateString(),
          balanceAmount: formatCurrency(bill.balanceAmount)
       };
       message = templateService.processTemplate(template.content, variables);
       if (template.subject) subject = templateService.processTemplate(template.subject, variables);
    } else {
       message = `
Payment Confirmation:
Bill Number: ${bill.billNumber}
Payment Amount: ${formatCurrency(payment.amount)}
Payment Method: ${payment.method}
Payment Date: ${payment.paymentDate.toLocaleDateString()}
Remaining Balance: ${formatCurrency(bill.balanceAmount)}

Thank you for your payment!
      `.trim();
    }

    switch (type) {
      case 'email':
        await sendEmail({ to: recipient, subject, text: message });
        break;
      case 'sms':
        await sendSMS(recipient, `${subject}\n\n${message}`);
        break;
      case 'whatsapp':
        await sendWhatsAppMessage(recipient, `${subject}\n\n${message}`);
        break;
    }

    logger.info('Payment confirmation sent', { type, recipient, paymentId: payment.id });
  } catch (error) {
    logger.error('Failed to send payment confirmation', { error, type, recipient, paymentId: payment.id });
  }
}

export async function sendOverdueReminder(
  type: 'email' | 'sms' | 'whatsapp',
  recipient: string,
  bill: NotificationBill
): Promise<void> {
  try {
    const subject = `Overdue Bill Reminder - ${bill.billNumber}`;
    
    const message = `
Overdue Bill Reminder:
Bill Number: ${bill.billNumber}
Bill Date: ${bill.billDate.toLocaleDateString()}
Total Amount: ${formatCurrency(bill.totalAmount)}
Outstanding Balance: ${formatCurrency(bill.balanceAmount)}
Due Date: ${bill.dueDate?.toLocaleDateString() || 'N/A'}

Please make the payment at your earliest convenience.

Thank you!
    `.trim();

    switch (type) {
      case 'email':
        await sendEmail({
          to: recipient,
          subject,
          text: message,
        });
        break;
        
      case 'sms':
        await sendSMS(recipient, `${subject}\n\n${message}`);
        break;
        
      case 'whatsapp':
        await sendWhatsAppMessage(recipient, `${subject}\n\n${message}`);
        break;
    }

    logger.info('Overdue reminder sent', { type, recipient, billId: bill.id });
  } catch (error) {
    logger.error('Failed to send overdue reminder', { error, type, recipient, billId: bill.id });
    throw error;
  }
}

export async function sendLowStockAlert(
  type: 'email' | 'sms' | 'whatsapp',
  recipient: string,
  products: NotificationProduct[]
): Promise<void> {
  try {
    const subject = 'Low Stock Alert';
    
    const message = `
Low Stock Alert:

The following products are running low on stock:

${products.map(product => 
      `${product.name} (Code: ${product.productCode})
Current Stock: ${product.currentStock} ${product.unit}
Minimum Stock: ${product.minimumStock} ${product.unit}
`
    ).join('\n')}

Please restock these items soon.
    `.trim();

    switch (type) {
      case 'email':
        await sendEmail({
          to: recipient,
          subject,
          text: message,
        });
        break;
        
      case 'sms':
        await sendSMS(recipient, `${subject}\n\n${message}`);
        break;
        
      case 'whatsapp':
        await sendWhatsAppMessage(recipient, `${subject}\n\n${message}`);
        break;
    }

    logger.info('Low stock alert sent', { type, recipient, productCount: products.length });
  } catch (error) {
    logger.error('Failed to send low stock alert', { error, type, recipient });
    throw error;
  }
}

export async function sendWelcomeMessage(
  type: 'email' | 'sms' | 'whatsapp',
  recipient: string,
  businessName: string,
  customerName: string
): Promise<void> {
  try {
    const subject = `Welcome to ${businessName}`;
    
    const message = `
Dear ${customerName},

Welcome to ${businessName}! 

We're excited to have you as our customer. You can now:
- View your bills and payment history
- Make payments online
- Track your account balance
- Receive notifications for new bills

If you have any questions, feel free to contact us.

Thank you for choosing ${businessName}!
    `.trim();

    switch (type) {
      case 'email':
        await sendEmail({
          to: recipient,
          subject,
          text: message,
        });
        break;
        
      case 'sms':
        await sendSMS(recipient, `${subject}\n\n${message}`);
        break;
        
      case 'whatsapp':
        await sendWhatsAppMessage(recipient, `${subject}\n\n${message}`);
        break;
    }

    logger.info('Welcome message sent', { type, recipient, businessName });
  } catch (error) {
    logger.error('Failed to send welcome message', { error, type, recipient });
    throw error;
  }
}