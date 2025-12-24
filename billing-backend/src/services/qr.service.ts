import { db } from '../config/database';
import { qrCodeBatches, products } from '../models/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { GenerateQrBatchInput } from '../schemas/qr.schema';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const auditService = new AuditService();

export class QrService {
  async generateBatch(businessId: string, userId: string, input: GenerateQrBatchInput, req?: any) {
    const { productId, batchName, quantity, purpose, notes, expiryDate } = input;

    // Verify product if provided
    if (productId) {
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.businessId, businessId)
        ))
        .limit(1);

      if (!product) {
        throw new Error('Product not found');
      }
    }

    const batchCode = `BATCH-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const [batch] = await db
      .insert(qrCodeBatches)
      .values({
        businessId,
        productId,
        batchCode,
        batchName,
        totalCodes: quantity,
        activeCodes: quantity,
        purpose,
        notes,
        expiredAt: expiryDate ? new Date(expiryDate) : undefined,
      })
      .returning();

    // Generate codes
    const codes: string[] = [];
    for (let i = 0; i < quantity; i++) {
        const uniqueId = uuidv4();
        // Format: {type: 'prod', bid: businessId, pid: productId, uid: uniqueId, batch: batchCode}
        // Minimized: p|bid|pid|uid|batch
        const payload = JSON.stringify({
            t: 'p',
            b: businessId,
            p: productId,
            u: uniqueId,
            bc: batchCode
        });
        const qrDataUrl = await QRCode.toDataURL(payload);
        codes.push(qrDataUrl);
    }

    await auditService.logBusinessAction(businessId, userId, 'QR_BATCH_CREATE', 'QR_CODE', batch.id, { batchName, quantity }, req);
    logger.info('QR Batch created', { batchId: batch.id, businessId, quantity });

    return {
        batch,
        codes // Return data URLs for frontend to render/print
    };
  }

  async getBatches(businessId: string, productId?: string) {
    let query = db
      .select()
      .from(qrCodeBatches)
      .where(eq(qrCodeBatches.businessId, businessId))
      .orderBy(desc(qrCodeBatches.createdAt));

    if (productId) {
      query = query.where(eq(qrCodeBatches.productId, productId)) as any;
    }

    return await query;
  }
}