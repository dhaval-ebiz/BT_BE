import OpenAI from 'openai';
import { db } from '../config/database';
import { aiGeneratedContent } from '../models/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger, aiLogger } from '../utils/logger';
import { uploadToS3 } from '../utils/s3';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIGenerationService {
  async generateBanner(prompt: string, userId: string, businessId: string): Promise<string> {
    try {
      aiLogger.info('Generating banner', { prompt: prompt.substring(0, 100), userId, businessId });
      
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `Create a professional promotional banner for a retail business: ${prompt}`,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      const imageUrl = response.data[0].url;
      
      if (!imageUrl) {
        throw new Error('No image generated');
      }

      // Download and upload to S3
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);
      
      const fileName = `banners/${businessId}/${Date.now()}.png`;
      const s3Url = await uploadToS3(buffer, fileName, 'image/png');

      // Save to database
      await db.insert(aiGeneratedContent).values({
        businessId,
        userId,
        type: 'banner',
        prompt,
        content: s3Url,
        metadata: {
          model: 'dall-e-3',
          size: '1024x1024',
          originalUrl: imageUrl,
        },
      });

      aiLogger.info('Banner generated successfully', { userId, businessId, s3Url });
      
      return s3Url;
    } catch (error) {
      aiLogger.error('Failed to generate banner', { error, userId, businessId });
      throw error;
    }
  }

  async generateSQLQuery(prompt: string, userId: string, businessId: string): Promise<string> {
    try {
      aiLogger.info('Generating SQL query', { prompt: prompt.substring(0, 100), userId, businessId });
      
      // Define the database schema for the AI
      const schemaDescription = `
Database Schema:
- users: id, email, firstName, lastName, role, status, createdAt
- retail_businesses: id, ownerId, name, slug, isActive, createdAt
- customers: id, businessId, customerCode, firstName, lastName, email, phone, outstandingBalance, totalPurchases, isActive
- merchants: id, businessId, merchantCode, name, contactPerson, email, phone, outstandingBalance, totalPurchases, isActive
- products: id, businessId, categoryId, productCode, name, unit, purchasePrice, sellingPrice, currentStock, minimumStock, isActive
- bills: id, businessId, customerId, billNumber, billDate, totalAmount, paidAmount, balanceAmount, status
- payments: id, businessId, customerId, billId, amount, method, status, paymentDate

Important Rules:
1. Always filter by businessId = '${businessId}'
2. Use proper SQL syntax for PostgreSQL
3. Use ILIKE for case-insensitive searches
4. Always include proper JOIN conditions
5. Use parameterized queries when possible
6. Only SELECT data, never modify data
7. Return readable column names using AS
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a SQL expert. Generate safe, read-only SQL queries based on the user request. ${schemaDescription}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const sqlQuery = response.choices[0].message.content;
      
      if (!sqlQuery) {
        throw new Error('No SQL query generated');
      }

      // Add guardrails to prevent dangerous operations
      const dangerousKeywords = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'ALTER', 'CREATE'];
      const upperQuery = sqlQuery.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
          throw new Error('Query contains dangerous operations. Only SELECT queries are allowed.');
        }
      }

      // Ensure businessId filter is present
      if (!sqlQuery.includes('businessId') && !sqlQuery.includes("business_id")) {
        throw new Error('Query must include businessId filter for security.');
      }

      // Save to database
      await db.insert(aiGeneratedContent).values({
        businessId,
        userId,
        type: 'sql_query',
        prompt,
        content: sqlQuery,
        metadata: {
          model: 'gpt-4',
          verified: true,
        },
      });

      aiLogger.info('SQL query generated successfully', { userId, businessId });
      
      return sqlQuery;
    } catch (error) {
      aiLogger.error('Failed to generate SQL query', { error, userId, businessId });
      throw error;
    }
  }

  async generateText(prompt: string, style: string = 'professional', userId: string, businessId: string): Promise<string> {
    try {
      aiLogger.info('Generating text', { prompt: prompt.substring(0, 100), style, userId, businessId });
      
      const stylePrompts = {
        professional: 'Generate professional business text in a formal tone',
        casual: 'Generate friendly and casual text',
        marketing: 'Generate persuasive marketing copy',
        technical: 'Generate clear and technical documentation',
      };

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `${stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.professional}. Keep it concise and relevant.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const generatedText = response.choices[0].message.content;
      
      if (!generatedText) {
        throw new Error('No text generated');
      }

      // Save to database
      await db.insert(aiGeneratedContent).values({
        businessId,
        userId,
        type: 'text',
        prompt,
        content: generatedText,
        metadata: {
          model: 'gpt-4',
          style,
        },
      });

      aiLogger.info('Text generated successfully', { userId, businessId, length: generatedText.length });
      
      return generatedText;
    } catch (error) {
      aiLogger.error('Failed to generate text', { error, userId, businessId });
      throw error;
    }
  }

  async getGeneratedContent(businessId: string, type?: string, limit: number = 20) {
    let query = db
      .select()
      .from(aiGeneratedContent)
      .where(eq(aiGeneratedContent.businessId, businessId))
      .orderBy(desc(aiGeneratedContent.createdAt))
      .limit(limit);

    if (type) {
      query = query.where(eq(aiGeneratedContent.type, type)) as any;
    }

    return await query;
  }

  async deleteGeneratedContent(businessId: string, contentId: string) {
    const [deletedContent] = await db
      .delete(aiGeneratedContent)
      .where(and(
        eq(aiGeneratedContent.id, contentId),
        eq(aiGeneratedContent.businessId, businessId)
      ))
      .returning();

    if (!deletedContent) {
      throw new Error('Content not found');
    }

    logger.info('AI generated content deleted', { contentId, businessId });

    return { message: 'Content deleted successfully' };
  }

  async executeSQLQuery(query: string, businessId: string): Promise<any> {
    try {
      // Verify the query is safe
      const dangerousKeywords = ['DELETE', 'UPDATE', 'INSERT', 'DROP', 'ALTER', 'CREATE'];
      const upperQuery = query.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
          throw new Error('Query contains dangerous operations. Only SELECT queries are allowed.');
        }
      }

      // Ensure businessId filter is present
      if (!query.includes('businessId') && !query.includes("business_id")) {
        throw new Error('Query must include businessId filter for security.');
      }

      // Execute the query
      const result = await db.execute(sql.raw(query));
      
      aiLogger.info('SQL query executed successfully', { businessId, rowCount: result.rows?.length || 0 });
      
      return result;
    } catch (error) {
      aiLogger.error('Failed to execute SQL query', { error, businessId });
      throw error;
    }
  }
}