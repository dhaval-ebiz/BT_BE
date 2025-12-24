import { logger } from './logger';
import { sendSMS } from './sms';
import { sendWhatsAppMessage } from './whatsapp';
import { sendEmail } from './email';
import { formatCurrency } from './billing';

// Type interfaces for notification functions
interface NotificationBill {
  id: string;
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
    const subject = `Bill ${bill.billNumber} - ${formatCurrency(bill.totalAmount)}`;
    
    const message = `
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

    switch (type) {
      case 'email':
        await sendEmail({
          to: recipient,
          subject,
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Bill ${bill.billNumber}</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Bill Number:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${bill.billNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${bill.billDate.toLocaleDateString()}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(bill.totalAmount)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Paid Amount:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(bill.paidAmount)}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Balance:</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${formatCurrency(bill.balanceAmount)}</td>
                </tr>
              </table>
              <h3 style="color: #333;">Items:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #333; color: white;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Qty</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Rate</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, index) => `
                    <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                      <td style="padding: 10px; border: 1px solid #ddd;">${item.productName}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.quantity} ${item.unit}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.rate)}</td>
                      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.totalAmount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
                <strong>Thank you for your business!</strong>
              </p>
            </div>
          `,
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
    throw error;
  }
}

export async function sendPaymentConfirmation(
  type: 'email' | 'sms' | 'whatsapp',
  recipient: string,
  payment: NotificationPayment,
  bill: NotificationBill
): Promise<void> {
  try {
    const subject = `Payment Received - ${formatCurrency(payment.amount)}`;
    
    const message = `
Payment Confirmation:
Bill Number: ${bill.billNumber}
Payment Amount: ${formatCurrency(payment.amount)}
Payment Method: ${payment.method}
Payment Date: ${payment.paymentDate.toLocaleDateString()}
Remaining Balance: ${formatCurrency(bill.balanceAmount)}

Thank you for your payment!
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

    logger.info('Payment confirmation sent', { type, recipient, paymentId: payment.id });
  } catch (error) {
    logger.error('Failed to send payment confirmation', { error, type, recipient, paymentId: payment.id });
    throw error;
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
) {
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