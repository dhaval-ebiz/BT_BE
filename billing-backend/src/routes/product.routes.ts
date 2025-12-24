import { Router, Request, Response } from 'express';
import { ProductController } from '../controllers/product.controller';
import { 
  authenticateToken, 
  authorizeBusinessAccess, 
  authorizeRole 
} from '../middleware/auth.middleware';
import { 
  authorizeProductAccess 
} from '../middleware/resource-auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { 
  createProductSchema, 
  updateProductSchema, 
  productQuerySchema,
  stockAdjustmentSchema,
  createCategorySchema,
  updateCategorySchema,
  createVariantSchema
} from '../schemas/product.schema';

const router = Router();
const productController = new ProductController();

// Public endpoint - no auth required for QR code scanning
router.post('/qr/scan', (_req: Request, res: Response) => {
  // This will be handled by the QR controller
  res.status(404).json({ success: false, message: 'QR scanning endpoint moved to /api/qr/scan' });
});

// Protected routes - require authentication and business access
router.use(authenticateToken);
router.use(authorizeBusinessAccess);

// ==================== CATEGORY ROUTES ====================

router.get(
  '/categories',
  authorizeRole('RETAIL_OWNER', 'MANAGER', 'CASHIER', 'VIEWER'),
  (req, res) => productController.getCategories(req, res)
);

router.post(
  '/categories',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  validateBody(createCategorySchema),
  (req, res) => productController.createCategory(req, res)
);

router.put(
  '/categories/:categoryId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  validateBody(updateCategorySchema),
  (req, res) => productController.updateCategory(req, res)
);

router.delete(
  '/categories/:categoryId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  (req, res) => productController.deleteCategory(req, res)
);

// ==================== VARIANT ROUTES ====================

router.get(
  '/:productId/variants',
  authorizeRole('RETAIL_OWNER', 'MANAGER', 'CASHIER', 'VIEWER'),
  (req, res) => productController.getVariants(req, res)
);

router.post(
  '/:productId/variants',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  validateBody(createVariantSchema),
  (req, res) => productController.createVariant(req, res)
);

router.put(
  '/:productId/variants/:variantId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  validateBody(createVariantSchema.partial()),
  (req, res) => productController.updateVariant(req, res)
);

router.delete(
  '/:productId/variants/:variantId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  (req, res) => productController.deleteVariant(req, res)
);

// ==================== PRODUCT ROUTES ====================

router.post(
  '/',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  validateBody(createProductSchema),
  productController.createProduct
);

router.get(
  '/',
  authorizeRole('RETAIL_OWNER', 'MANAGER', 'CASHIER', 'VIEWER'),
  validateQuery(productQuerySchema),
  productController.getProducts
);

router.get(
  '/stats',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  productController.getProductStats
);

router.get(
  '/low-stock',
  authorizeRole('RETAIL_OWNER', 'MANAGER', 'CASHIER'),
  productController.getLowStockProducts
);

router.get(
  '/:productId',
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_VIEW' }),
  productController.getProduct
);

router.put(
  '/:productId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_MANAGE' }),
  validateBody(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:productId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_MANAGE' }),
  productController.deleteProduct
);

router.post(
  '/:productId/stock-adjust',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_MANAGE' }),
  validateBody(stockAdjustmentSchema),
  productController.adjustStock
);

// Product image routes
router.post(
  '/:productId/images',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_MANAGE' }),
  productController.uploadSingle,
  productController.uploadProductImage
);

router.post(
  '/:productId/images/bulk',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_MANAGE' }),
  productController.uploadMultiple,
  productController.uploadMultipleProductImages
);

router.get(
  '/:productId/images',
  authorizeProductAccess({ allowBusinessOwner: true, requiredPermission: 'PRODUCT_VIEW' }),
  productController.getProductImages
);

router.delete(
  '/images/:imageId',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  productController.deleteProductImage
);

router.patch(
  '/images/:imageId/primary',
  authorizeRole('RETAIL_OWNER', 'MANAGER'),
  productController.setPrimaryImage
);

export { router as productRoutes };