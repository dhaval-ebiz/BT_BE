import { db } from '../config/database';
import { productImages, products } from '../models/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { uploadToS3, deleteFromS3 } from '../utils/s3';
import { ApiAbuseService } from './api-abuse.service';
import { AuditService } from './audit.service';

const apiAbuseService = new ApiAbuseService();
const auditService = new AuditService();

export class ProductImageService {
  async uploadProductImage(
    businessId: string,
    userId: string,
    productId: string,
    file: Express.Multer.File,
    imageType: 'MAIN' | 'GALLERY' = 'GALLERY',
    isPrimary: boolean = false
  ): Promise<{ image: typeof productImages.$inferSelect; remainingImages: number }> {
    try {
      // Check image upload limit
      const rateLimit = await apiAbuseService.checkImageUploadLimit(businessId);
      
      if (!rateLimit.allowed) {
        throw new Error(`Image upload limit exceeded. Limit: ${rateLimit.limit} images per month`);
      }

      // Verify product belongs to business
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.businessId, businessId)
        ))
        .limit(1);

      if (!product) {
        throw new Error('Product not found or access denied');
      }

      // Upload image to S3
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `products/${businessId}/${productId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      const imageUrl = await uploadToS3(
        file.buffer,
        fileName,
        file.mimetype,
        true // Make image public
      );

      // If this should be primary, unset other primary images
      if (isPrimary) {
        await db
          .update(productImages)
          .set({ isPrimary: false })
          .where(eq(productImages.productId, productId));
      }

      // Save image record to database
      const [imageRecord] = await db
        .insert(productImages)
        .values({
          productId,
          imageUrl,
          imageType,
          isPrimary,
          metadata: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: userId,
          },
        })
        .returning();

      // Update image upload count
      await apiAbuseService.incrementImageUploadCount(businessId);

      // Log audit
      await auditService.logFileAction(
        'UPLOAD',
        businessId,
        userId,
        fileName,
        'PRODUCT_IMAGE',
        { productId, imageType, isPrimary }
      );

      if (!imageRecord) {
        throw new Error('Failed to create image record');
      }

      logger.info('Product image uploaded', {
        businessId,
        productId,
        imageId: imageRecord.id,
        imageUrl,
        remainingImages: rateLimit.limit - rateLimit.currentCount - 1,
      });

      return {
        image: imageRecord,
        remainingImages: rateLimit.limit - rateLimit.currentCount - 1,
      };
    } catch (error) {
      logger.error('Failed to upload product image', { error, businessId, productId });
      throw error;
    }
  }

  async getProductImages(
    businessId: string,
    productId: string,
    imageType?: 'MAIN' | 'GALLERY' | 'QR_CODE'
  ): Promise<typeof productImages.$inferSelect[]> {
    try {
      // Verify product belongs to business
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, productId),
          eq(products.businessId, businessId)
        ))
        .limit(1);

      if (!product) {
        throw new Error('Product not found or access denied');
      }

      const conditions = imageType
        ? and(eq(productImages.productId, productId), eq(productImages.imageType, imageType))
        : eq(productImages.productId, productId);

      const images = await db
        .select()
        .from(productImages)
        .where(conditions)
        .orderBy(desc(productImages.isPrimary), desc(productImages.createdAt));

      return images;
    } catch (error) {
      logger.error('Failed to get product images', { error, businessId, productId });
      throw error;
    }
  }

  async deleteProductImage(
    businessId: string,
    userId: string,
    imageId: string
  ): Promise<{ message: string }> {
    try {
      // Get image record
      const [image] = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, imageId))
        .limit(1);

      if (!image) {
        throw new Error('Image not found');
      }

      if (!image.productId) throw new Error('Image is orphaned (no product ID)');

      // Verify product belongs to business
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, image.productId),
          eq(products.businessId, businessId)
        ))
        .limit(1);

      if (!product) {
        throw new Error('Access denied: Product not found');
      }

      // Delete from S3
      const fileKey = image.imageUrl.split('/').slice(-4).join('/');
      await deleteFromS3(fileKey);

      // Delete from database
      await db.delete(productImages).where(eq(productImages.id, imageId));

      // Log audit
      await auditService.logFileAction(
        'DELETE',
        businessId,
        userId,
        fileKey,
        'PRODUCT_IMAGE',
        { productId: product.id, imageId }
      );

      logger.info('Product image deleted', { businessId, imageId, fileKey });

      return { message: 'Image deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete product image', { error, businessId, imageId });
      throw error;
    }
  }

  async setPrimaryImage(
    businessId: string,
    _userId: string,
    imageId: string
  ): Promise<typeof productImages.$inferSelect> {
    try {
      // Get image record
      const [image] = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, imageId))
        .limit(1);

      if (!image) {
        throw new Error('Image not found');
      }

      if (!image.productId) throw new Error('Image is orphaned (no product ID)');

      // Verify product belongs to business
      const [product] = await db
        .select()
        .from(products)
        .where(and(
          eq(products.id, image.productId),
          eq(products.businessId, businessId)
        ))
        .limit(1);

      if (!product) {
        throw new Error('Access denied: Product not found');
      }

      if (!image.productId) throw new Error('Image is orphaned (no product ID)');

      // Unset all other primary images for this product
      await db
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, image.productId));

      // Set this image as primary
      const [updatedImage] = await db
        .update(productImages)
        .set({ isPrimary: true })
        .where(eq(productImages.id, imageId))
        .returning();

      if (!updatedImage) {
        throw new Error('Failed to update image');
      }

      logger.info('Primary image set', { businessId, imageId, productId: product.id });

      return updatedImage;
    } catch (error) {
      logger.error('Failed to set primary image', { error, businessId, imageId });
      throw error;
    }
  }

  async uploadMultipleImages(
    businessId: string,
    userId: string,
    productId: string,
    files: Express.Multer.File[],
    imageType: 'MAIN' | 'GALLERY' = 'GALLERY'
  ): Promise<{ images: typeof productImages.$inferSelect[]; uploadedCount: number; remainingImages: number }> {
    try {
      // Check rate limit for all images
      const rateLimit = await apiAbuseService.checkImageUploadLimit(businessId);
      
      if (rateLimit.currentCount + files.length > rateLimit.limit) {
        throw new Error(`Image upload limit exceeded. Cannot upload ${files.length} images. Remaining: ${rateLimit.limit - rateLimit.currentCount}`);
      }

      const uploadedImages = [];

      for (const file of files) {
        const result = await this.uploadProductImage(
          businessId,
          userId,
          productId,
          file,
          imageType,
          false // Don't set as primary for bulk uploads
        );
        uploadedImages.push(result.image);
      }

      return {
        images: uploadedImages,
        uploadedCount: files.length,
        remainingImages: rateLimit.limit - rateLimit.currentCount - files.length,
      };
    } catch (error) {
      logger.error('Failed to upload multiple product images', { error, businessId, productId });
      throw error;
    }
  }
}