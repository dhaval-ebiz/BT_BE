import { z } from 'zod';

// Category Schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Product Variant Schema
const variantAttributeSchema = z.record(z.string()); // {"size": "Large", "color": "Red"}

export const createVariantSchema = z.object({
  variantName: z.string().min(1).max(100),
  attributes: variantAttributeSchema,
  sku: z.string().max(255).optional(),
  barcode: z.string().max(255).optional(),
  priceAdjustment: z.number().optional().default(0),
  purchasePrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  mrp: z.number().optional(),
  stockQuantity: z.number().optional().default(0),
  minimumStock: z.number().optional(),
  weight: z.number().optional(),
  isDefault: z.boolean().optional(),
});

// Product Schema
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  categoryId: z.string().uuid().optional(),
  productCode: z.string().max(100).optional(), // Generated if not provided
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  
  productType: z.enum(['PHYSICAL_PRODUCT', 'RAW_MATERIAL', 'SERVICE', 'COMPOSITE', 'DIGITAL', 'CONSUMABLE']).default('PHYSICAL_PRODUCT'),
  trackQuantity: z.boolean().default(true),
  trackCost: z.boolean().default(true),
  
  // Specific for services
  isService: z.boolean().default(false),
  serviceDuration: z.number().int().optional(),
  serviceCategory: z.string().optional(),
  
  // Units & Pricing
  unit: z.enum(['KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'DOZEN', 'METER', 'FEET', 'BOX', 'BUNDLE', 'INCH', 'YARD', 'HOUR', 'DAY', 'SERVICE', 'NOT_APPLICABLE', 'TON', 'QUINTAL']),
  purchasePrice: z.number().min(0).optional().default(0),
  sellingPrice: z.number().min(0),
  mrp: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  minSellingPrice: z.number().min(0).optional(),
  maxDiscountPercent: z.number().min(0).max(100).optional(),
  
  // Tax
  taxPercent: z.number().min(0).max(100).optional(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  isTaxable: z.boolean().default(true),
  taxCategory: z.string().optional(),
  
  // Inventory
  currentStock: z.number().optional().default(0),
  minimumStock: z.number().optional(),
  maximumStock: z.number().optional(),
  reorderPoint: z.number().optional(),
  reorderQuantity: z.number().optional(),
  
  // IDs
  barcode: z.string().max(255).optional(),
  sku: z.string().max(255).optional(),
  
  // Physical
  weight: z.number().optional(),
  weightUnit: z.string().optional(),
  dimensions: z.any().optional(), // jsonb
  
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  
  specifications: z.any().optional(), // jsonb
  features: z.any().optional(), // jsonb
  tags: z.any().optional(), // jsonb
  
  // Variants
  hasVariants: z.boolean().default(false),
  variants: z.array(createVariantSchema).optional(),
  
  images: z.array(z.string().url()).optional(),
  primaryImage: z.string().url().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid().optional(), // Often in param, but good to have
  quantity: z.number(), // Can be negative for removal
  reason: z.string().min(1),
  notes: z.string().optional(),
  adjustmentType: z.enum(['ADD', 'SUBTRACT', 'SET']), // Simplified for UI
  type: z.enum(['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'EXPIRED', 'CONSUMPTION', 'PRODUCTION']).optional(), // Detailed type for audit
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  unit: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'sellingPrice', 'currentStock']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;