import { Response } from 'express';
import { ProductService } from '../services/product.service';
import { ProductImageService } from '../services/product-image.service';
import { ApiAbuseService } from '../services/api-abuse.service';
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
const _apiAbuseService = new ApiAbuseService();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

export class ProductController {
  async createProduct(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const input: CreateProductInput = req.body;
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

  async getProduct(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
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

  async updateProduct(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
      const input: UpdateProductInput = req.body;
      
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

  async deleteProduct(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
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

  async getProducts(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const queryInput: ProductQueryInput = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        lowStock: req.query.lowStock !== undefined ? req.query.lowStock === 'true' : undefined,
        unit: typeof req.query.unit === 'string' ? req.query.unit : undefined,
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
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

  async adjustStock(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
      const input: StockAdjustmentInput = req.body;
      
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

  async getLowStockProducts(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
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

  async getProductStats(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
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
  async uploadProductImage(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const imageType = (req.body.imageType as 'MAIN' | 'GALLERY') || 'GALLERY';
      const isPrimary = req.body.isPrimary === 'true';

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
        return res.status(429).json({
          success: false,
          message: errorMsg,
        });
      }
      
      res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }
  }

  async uploadMultipleProductImages(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const imageType = (req.body.imageType as 'MAIN' | 'GALLERY') || 'GALLERY';

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
        return res.status(429).json({
          success: false,
          message: errorMsg,
        });
      }
      
      res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }
  }

  async getProductImages(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { productId } = req.params;
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

  async deleteProductImage(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { imageId } = req.params;

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

  async setPrimaryImage(req: BusinessRequest, res: Response) {
    const startTime = Date.now();
    
    try {
      if (!req.business || !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Business authentication required',
        });
      }

      const { imageId } = req.params;

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

  // Multer middleware for single file upload
  get uploadSingle() {
    return upload.single('image');
  }

  // Multer middleware for multiple file upload
  get uploadMultiple() {
    return upload.array('images', 10); // Max 10 files
  }
}