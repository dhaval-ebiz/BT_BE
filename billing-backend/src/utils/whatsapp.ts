import axios from 'axios';
import { logger } from './logger';

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface WhatsAppMessageResponse {
  messages?: Array<{ id: string }>;
}

interface WhatsAppProfileResponse {
  display_name?: string;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp service not configured');
    }

    // Validate and format phone number
    const validatedPhone = validateWhatsAppPhoneNumber(to);
    if (!validatedPhone) {
      throw new Error('Invalid WhatsApp phone number format');
    }

    const response = await axios.post<WhatsAppMessageResponse>(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: validatedPhone,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp message sent successfully', { 
      messageId: response.data.messages?.[0]?.id, 
      to: validatedPhone 
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp message', { error, to });
    throw error;
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  parameters: string[] = [],
  language: string = 'en'
): Promise<void> {
  try {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp service not configured');
    }

    const validatedPhone = validateWhatsAppPhoneNumber(to);
    if (!validatedPhone) {
      throw new Error('Invalid WhatsApp phone number format');
    }

    const components = parameters.map((param) => ({
      type: 'body',
      parameters: [
        {
          type: 'text',
          text: param,
        },
      ],
    }));

    const response = await axios.post<WhatsAppMessageResponse>(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: validatedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language,
          },
          components,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp template sent successfully', { 
      messageId: response.data.messages?.[0]?.id, 
      to: validatedPhone,
      templateName 
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp template', { error, to, templateName });
    throw error;
  }
}

export async function sendWhatsAppMedia(
  to: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'image' | 'document' | 'video' | 'audio' = 'image'
): Promise<void> {
  try {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp service not configured');
    }

    const validatedPhone = validateWhatsAppPhoneNumber(to);
    if (!validatedPhone) {
      throw new Error('Invalid WhatsApp phone number format');
    }

    const response = await axios.post<WhatsAppMessageResponse>(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: validatedPhone,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp media sent successfully', { 
      messageId: response.data.messages?.[0]?.id, 
      to: validatedPhone,
      mediaType 
    });
  } catch (error) {
    logger.error('Failed to send WhatsApp media', { error, to, mediaType });
    throw error;
  }
}

export function validateWhatsAppPhoneNumber(phone: string): string | null {
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

export async function testWhatsAppConnection(): Promise<boolean> {
  try {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      logger.warn('WhatsApp service not configured');
      return false;
    }
    
    // Try to fetch phone number info to verify connection
    const response = await axios.get<WhatsAppProfileResponse>(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        },
      }
    );
    
    logger.info('WhatsApp service connection verified', { 
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
      displayName: response.data.display_name 
    });
    return true;
  } catch (error) {
    logger.error('WhatsApp service connection failed', { error });
    return false;
  }
}

export async function getWhatsAppTemplates(): Promise<unknown> {
  try {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp service not configured');
    }

    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        },
      }
    );

    return response.data as unknown;
  } catch (error) {
    logger.error('Failed to fetch WhatsApp templates', { error });
    throw error;
  }
}