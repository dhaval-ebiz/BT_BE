import { Response } from 'express';
import { ProductService } from '../services/product.service';
import { ProductImageService } from '../services/product-image.service';
// import { ApiAbuseService } from '../services/api-abuse.service';
import { 
  CreateProductInput, 
  UpdateProductInput, 
  ProductQueryInput,
  StockAdjustmentInput 
} from '../schemas/product.schema';
import { logger, logApiRequest } from '../utils/logger';
import { BusinessRequest } from '../middleware/auth.middleware';
import { getErrorMessage } from '../utils/errors';
import multer from 'multer';

const productService = new ProductService();
const productImageService = new ProductImageService();
// const _apiAbuseService = new ApiAbuseService();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 files at once
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

export class ProductController {
  async createProduct(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const input = req.body as CreateProductInput;
      const product = await productService.createProduct(req.business.id, req.user.id, input, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error: unknown) {
      logger.error('Create product error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Product creation failed'),
      });
    }
  }

  async getProduct(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
      }
      const product = await productService.getProduct(req.business.id, productId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error: unknown) {
      logger.error('Get product error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(404).json({
        success: false,
        message: getErrorMessage(error, 'Product not found'),
      });
    }
  }

  async updateProduct(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
      }
      const input = req.body as UpdateProductInput;
      
      const product = await productService.updateProduct(
        req.business.id,
        req.user.id,
        productId,
        input,
        req
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error: unknown) {
      logger.error('Update product error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Product update failed'),
      });
    }
  }

  async deleteProduct(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (typeof productId !== 'string') {
        res.status(400).json({ success: false, message: 'Invalid product ID' });
        return;
      }
      const result = await productService.deleteProduct(req.business.id, req.user.id, productId, req);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Delete product error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Product deletion failed'),
      });
    }
  }

  async getProducts(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const queryInput: ProductQueryInput = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        lowStock: req.query.lowStock !== undefined ? req.query.lowStock === 'true' : undefined,
        unit: typeof req.query.unit === 'string' ? req.query.unit : undefined,
        sortBy: typeof req.query.sortBy === 'string' && ['name', 'createdAt', 'sellingPrice', 'currentStock'].includes(req.query.sortBy) 
          ? (req.query.sortBy as 'name' | 'createdAt' | 'sellingPrice' | 'currentStock') 
          : undefined,
        sortOrder: typeof req.query.sortOrder === 'string' && ['asc', 'desc'].includes(req.query.sortOrder.toLowerCase()) 
          ? (req.query.sortOrder.toLowerCase() as 'asc' | 'desc') 
          : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await productService.getProducts(req.business.id, queryInput);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Get products error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error, 'Failed to fetch products'),
      });
    }
  }

  async adjustStock(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      const input = req.body as StockAdjustmentInput;
      
      const result = await productService.adjustStock(
        req.business.id,
        req.user.id,
        { ...input, productId },
        req
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Adjust stock error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Stock adjustment failed'),
      });
    }
  }

  async getLowStockProducts(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const products = await productService.getLowStockProducts(req.business.id);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: products,
      });
    } catch (error: unknown) {
      logger.error('Get low stock products error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error, 'Failed to fetch low stock products'),
      });
    }
  }

  async getProductStats(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const stats = await productService.getProductStats(req.business.id);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      logger.error('Get product stats error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error, 'Failed to fetch product stats'),
      });
    }
  }

  // Image upload endpoints
  async uploadProductImage(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      const file = req.file;
      
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const body = req.body as { imageType?: string; isPrimary?: string };
      const imageType = (body.imageType as 'MAIN' | 'GALLERY') || 'GALLERY';
      const isPrimary = body.isPrimary === 'true';

      const result = await productImageService.uploadProductImage(
        req.business.id,
        req.user.id,
        productId,
        file,
        imageType,
        isPrimary
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Upload product image error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      const errorMsg = getErrorMessage(error, 'Image upload failed');
      if (errorMsg.includes('limit exceeded')) {
        res.status(429).json({
          success: false,
          message: errorMsg,
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }
  }

  async uploadMultipleProductImages(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
        return;
      }

      const body = req.body as { imageType?: string };
      const imageType = (body.imageType as 'MAIN' | 'GALLERY') || 'GALLERY';

      const result = await productImageService.uploadMultipleImages(
        req.business.id,
        req.user.id,
        productId,
        files,
        imageType
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Upload multiple product images error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      const errorMsg = getErrorMessage(error, 'Image upload failed');
      if (errorMsg.includes('limit exceeded')) {
        res.status(429).json({
          success: false,
          message: errorMsg,
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }
  }

  async getProductImages(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      const imageType = req.query.imageType as 'MAIN' | 'GALLERY' | 'QR_CODE';

      const images = await productImageService.getProductImages(
        req.business.id,
        productId,
        imageType
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: images,
      });
    } catch (error: unknown) {
      logger.error('Get product images error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error, 'Failed to fetch product images'),
      });
    }
  }

  async deleteProductImage(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { imageId } = req.params;
      if (!imageId) {
        res.status(400).json({ success: false, message: 'Image ID is required' });
        return;
      }

      const result = await productImageService.deleteProductImage(
        req.business.id,
        req.user.id,
        imageId
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      logger.error('Delete product image error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error, 'Failed to delete product image'),
      });
    }
  }

  async setPrimaryImage(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { imageId } = req.params;
      if (!imageId) {
        res.status(400).json({ success: false, message: 'Image ID is required' });
        return;
      }

      const image = await productImageService.setPrimaryImage(
        req.business.id,
        req.user.id,
        imageId
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.json({
        success: true,
        data: image,
      });
    } catch (error: unknown) {
      logger.error('Set primary image error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(500).json({
        success: false,
        message: getErrorMessage(error, 'Failed to set primary image'),
      });
    }
  }

  // ==================== CATEGORY MANAGEMENT ====================

  async getCategories(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const categories = await productService.getCategories(req.business.id);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: unknown) {
      logger.error('Get categories error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Failed to fetch categories'),
      });
    }
  }

  async createCategory(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { name, description, parentId } = req.body as {
        name: string;
        description?: string;
        parentId?: string;
      };
      const category = await productService.createCategory(
        req.business.id,
        name,
        description,
        parentId
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error: unknown) {
      logger.error('Create category error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Category creation failed'),
      });
    }
  }

  async updateCategory(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({
          success: false,
          message: 'Category ID is required',
        });
        return;
      }

      const { name, description, parentId, isActive } = req.body as {
        name?: string;
        description?: string;
        parentId?: string;
        isActive?: boolean;
      };
      
      const category = await productService.updateCategory(
        req.business.id,
        categoryId,
        name,
        description,
        parentId,
        isActive
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error: unknown) {
      logger.error('Update category error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Category update failed'),
      });
    }
  }

  async deleteCategory(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({
          success: false,
          message: 'Category ID is required',
        });
        return;
      }

      const result = await productService.deleteCategory(req.business.id, categoryId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: unknown) {
      logger.error('Delete category error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Category deletion failed'),
      });
    }
  }

  // ==================== VARIANT MANAGEMENT ====================

  async getVariants(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
        return;
      }

      const variants = await productService.getVariants(req.business.id, productId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(200).json({
        success: true,
        data: variants,
      });
    } catch (error: unknown) {
      logger.error('Get variants error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Failed to fetch variants'),
      });
    }
  }

  async createVariant(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId } = req.params;
      if (!productId) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
        return;
      }

      const variantData = req.body as Record<string, unknown>;
      const variant = await productService.createVariant(
        req.business.id,
        productId,
        variantData
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(201).json({
        success: true,
        data: variant,
      });
    } catch (error: unknown) {
      logger.error('Create variant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Variant creation failed'),
      });
    }
  }

  async updateVariant(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId, variantId } = req.params;
      if (!productId || !variantId) {
        res.status(400).json({
          success: false,
          message: 'Product ID and Variant ID are required',
        });
        return;
      }

      const variantData = req.body as Record<string, unknown>;
      const variant = await productService.updateVariant(
        req.business.id,
        productId,
        variantId,
        variantData
      );
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error: unknown) {
      logger.error('Update variant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Variant update failed'),
      });
    }
  }

  async deleteVariant(req: BusinessRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
        return;
      }

      const { productId, variantId } = req.params;
      if (!productId || !variantId) {
        res.status(400).json({
          success: false,
          message: 'Product ID and Variant ID are required',
        });
        return;
      }

      const result = await productService.deleteVariant(req.business.id, productId, variantId);
      
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: unknown) {
      logger.error('Delete variant error:', error);
      logApiRequest(req, res, Date.now() - startTime);
      
      res.status(400).json({
        success: false,
        message: getErrorMessage(error, 'Variant deletion failed'),
      });
    }
  }

  // Multer middleware for single file upload
  get uploadSingle(): ReturnType<typeof upload.single> {
    return upload.single('image');
  }

  // Multer middleware for multiple file upload
  get uploadMultiple(): ReturnType<typeof upload.array> {
    return upload.array('images', 10); // Max 10 files
  }
}