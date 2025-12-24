import * as nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer | string }>;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Billing System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { messageId: info.messageId, to: options.to });
  } catch (error) {
    logger.error('Failed to send email', { error, to: options.to });
    throw error;
  }
}

export async function sendBulkEmail(emails: EmailOptions[]): Promise<void> {
  try {
    const promises = emails.map(email => sendEmail(email));
    await Promise.all(promises);
    logger.info('Bulk emails sent successfully', { count: emails.length });
  } catch (error) {
    logger.error('Failed to send bulk emails', { error, count: emails.length });
    throw error;
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info('Email service connection verified');
    return true;
  } catch (error) {
    logger.error('Email service connection failed', { error });
    return false;
  }
}