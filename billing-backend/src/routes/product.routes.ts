import { Router } from 'express';
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
  stockAdjustmentSchema 
} from '../schemas/product.schema';

const router = Router();
const productController = new ProductController();

// Public endpoint - no auth required for QR code scanning
router.post('/qr/scan', (req, res) => {
  // This will be handled by the QR controller
  res.status(404).json({ success: false, message: 'QR scanning endpoint moved to /api/qr/scan' });
});

// Protected routes - require authentication and business access
router.use(authenticateToken);
router.use(authorizeBusinessAccess);

// Product management routes
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