import { db } from '../config/database';
import { messageTemplates } from '../models/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

export class MessageTemplateService {
  
  /**
   * Get a specific template for a business, channel, and trigger (name)
   * Falls back to System templates if no custom template exists.
   */
  async getTemplate(businessId: string, templateName: string, channel: 'WHATSAPP' | 'SMS' | 'EMAIL'): Promise<typeof messageTemplates.$inferSelect | null> {
    // 1. Try to find custom template for this business
    const [customTemplate] = await db
        .select()
        .from(messageTemplates)
        .where(and(
            eq(messageTemplates.businessId, businessId),
            eq(messageTemplates.name, templateName),
            // eq(messageTemplates.channel, channel), // Schema uses enum, need to match exact string or enum
            eq(messageTemplates.isActive, true)
        ));
    
    if (customTemplate && customTemplate.channel === channel) {
        return customTemplate;
    }

    // 2. Try to find system default template
    const [systemTemplate] = await db
        .select()
        .from(messageTemplates)
        .where(and(
            eq(messageTemplates.isSystem, true),
            eq(messageTemplates.name, templateName),
            // eq(messageTemplates.channel, channel),
            eq(messageTemplates.isActive, true)
        ));

    if (systemTemplate && systemTemplate.channel === channel) {
        return systemTemplate;
    }

    return null;
  }

  /**
   * Replace {{variables}} in content with actual data
   */
  processTemplate(content: string, variables: TemplateVariables): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Create or Update a template
   */
  async upsertTemplate(businessId: string, input: {
    name: string;
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
    content: string;
    subject?: string;
    description?: string;
    variables?: Record<string, unknown>;
  }): Promise<typeof messageTemplates.$inferSelect> {
    const existing = await this.getTemplate(businessId, input.name, input.channel);

    if (existing && !existing.isSystem) {
        // Update
        const [updated] = await db.update(messageTemplates)
            .set({
                content: input.content,
                subject: input.subject,
                updatedAt: new Date()
            })
            .where(eq(messageTemplates.id, existing.id))
            .returning();
        if (!updated) {
            throw new Error('Failed to update template');
        }
        return updated;
    } else {
        // Create new
        const [created] = await db.insert(messageTemplates).values({
            businessId,
            name: input.name,
            channel: input.channel,
            type: input.channel, // Redundant field in schema
            content: input.content,
            subject: input.subject,
            description: input.description,
            variables: input.variables,
            isSystem: false,
            isActive: true
        }).returning();
        if (!created) {
            throw new Error('Failed to create template');
        }
        return created;
    }
  }

  /**
   * Initialize default templates for a business (Optional)
   */
  async seedDefaultTemplates(businessId: string): Promise<void> {
    // Logic to copy system templates to business templates if needed
    // For now, getTemplate falls back to system, so this might not be strictly necessary
    // unless we want them to edit a copy.
    logger.info('Seeding default templates for business', { businessId });
  }
}
