import twilio from 'twilio';
import { logger } from './logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken && fromPhoneNumber) {
  twilioClient = twilio(accountSid, authToken);
}

export async function sendSMS(to: string, message: string): Promise<void> {
  try {
    if (!twilioClient) {
      throw new Error('SMS service not configured');
    }

    // Validate phone number format
    const validatedPhone = validatePhoneNumber(to);
    if (!validatedPhone) {
      throw new Error('Invalid phone number format');
    }

    const response = await twilioClient.messages.create({
      body: message,
      from: fromPhoneNumber,
      to: validatedPhone,
    });

    logger.info('SMS sent successfully', { messageSid: response.sid, to });
  } catch (error) {
    logger.error('Failed to send SMS', { error, to });
    throw error;
  }
}

export async function sendBulkSMS(recipients: string[], message: string): Promise<void> {
  try {
    const promises = recipients.map(recipient => sendSMS(recipient, message));
    await Promise.all(promises);
    logger.info('Bulk SMS sent successfully', { count: recipients.length });
  } catch (error) {
    logger.error('Failed to send bulk SMS', { error, count: recipients.length });
    throw error;
  }
}

export function validatePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters except + at the start
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + (international format)
  if (cleaned.startsWith('+')) {
    // Must have at least 10 digits after +
    const digitsAfterPlus = cleaned.substring(1);
    if (digitsAfterPlus.length >= 10 && /^\d+$/.test(digitsAfterPlus)) {
      return cleaned;
    }
  } else {
    // Assume Indian number if no country code
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    // If already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]\d{9}$/.test(cleaned.substring(2))) {
      return `+${cleaned}`;
    }
  }
  
  return null;
}

export async function testSMSConnection(): Promise<boolean> {
  try {
    if (!twilioClient) {
      logger.warn('SMS service not configured');
      return false;
    }
    
    // Try to fetch messages to verify connection
    if (!accountSid) throw new Error('Twilio Account SID missing');
    await twilioClient.messages.list({ limit: 1 });
    logger.info('SMS service connection verified');
    return true;
  } catch (error) {
    logger.error('SMS service connection failed', { error });
    return false;
  }
}