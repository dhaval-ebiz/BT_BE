import { Response } from 'express';
import { QrService } from '../services/qr.service';
import { BusinessRequest } from '../middleware/auth.middleware';
import { generateQrBatchSchema } from '../schemas/qr.schema';
import { logger, logApiRequest } from '../utils/logger';
import { getErrorMessage, AppError, BadRequestError, ForbiddenError, NotFoundError } from '../utils/app-errors';
import { db } from '../config/database';
import { products, qrCodes, productVariants } from '../models/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ZodError } from 'zod';

const qrService = new QrService();

export class QrController {

  private handleError(res: Response, error: unknown, defaultMessage: string): Response {
    logger.error(`${defaultMessage}:`, error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    const message = getErrorMessage(error) || defaultMessage;
    return res.status(500).json({
      success: false,
      message
    });
  }

  async generateBatch(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.business || !req.user) {
        throw new ForbiddenError('Business authentication required');
      }

      const validation = generateQrBatchSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ZodError(validation.error.issues);
      }

      const result = await qrService.generateBatch(req.business.id, req.user.id, validation.data, req);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Generate QR batch error');
    }
  }

  async getBatches(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      if (!req.business) {
        throw new ForbiddenError('Business authentication required');
      }

      const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
      const batches = await qrService.getBatches(req.business.id, productId);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: batches,
      });
    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Get QR batches error');
    }
  }

  async scanQr(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      // Note: Assuming scanning can be done by authenticated staff.
      // If public scanning is needed (e.g. customer self-scan), we would relax the Auth check 
      // but might limit data returned. For now, enforcing Auth as per 'shop owner mass add' flow.
      if (!req.business) {
         throw new ForbiddenError('Authentication required');
      }

      const { code } = req.params;
      if (!code) {
        throw new BadRequestError('QR Code is required');
      }

      // 1. Try to find in qr_codes table (Generated Batch codes)
      // We join with products to get product details
      const [qrEntry] = await db
        .select({
            qr: qrCodes,
            product: products,
            variant: productVariants
        })
        .from(qrCodes)
        .leftJoin(products, eq(qrCodes.productId, products.id))
        .leftJoin(productVariants, eq(qrCodes.variantId, productVariants.id))
        .where(
            and(
                eq(qrCodes.qrCode, code), 
                eq(qrCodes.businessId, req.business.id)
            )
        )
        .limit(1);

      if (qrEntry && qrEntry.product) {
        // Found valid mapped QR
        res.json({
            success: true,
            data: {
                type: 'BATCH_QR',
                product: qrEntry.product,
                variant: qrEntry.variant,
                qrInfo: qrEntry.qr
            }
        });
        return;
      }

      // 2. Fallback: Try to find if the code matches a Product's barcode field or SKU directly?
      // "User can add item with image qr code can scan to get its price"
      // If the code scanned IS the product code/barcode:
      const [productEntry] = await db
        .select()
        .from(products)
        .where(
            and(
                eq(products.businessId, req.business.id),
                eq(products.qrCode, code) // Check specific QR code field on product
            )
        )
        .limit(1);
      
      if (productEntry) {
         res.json({
            success: true,
            data: {
                type: 'PRODUCT_DIRECT_QR',
                product: productEntry,
            }
         });
         return;
      }

      // 3. Fallback: Simple Barcode match?
      const [barcodeMatch] = await db
        .select()
        .from(products)
        .where(
            and(
                eq(products.businessId, req.business.id),
                eq(products.barcode, code)
            )
        )
        .limit(1);

      if (barcodeMatch) {
         res.json({
            success: true,
            data: {
                type: 'BARCODE_MATCH',
                product: barcodeMatch,
            }
         });
         return;
      }

      throw new NotFoundError('QR Code not recognized');

    } catch (error: unknown) {
      logApiRequest(req, res, Date.now() - startTime);
      this.handleError(res, error, 'Scan QR error');
    }
  }
}