import { db } from '../config/database';
import { products, productCategories, billItems, bills, productVariants, productUnitEnum, billingStatusEnum } from '../models/drizzle/schema';
import { eq, and, sql, desc, sum, count, gte, lte, SQL, isNull, AnyColumn } from 'drizzle-orm';
import { 
  CreateProductInput, 
  UpdateProductInput, 
  ProductQueryInput,
  StockAdjustmentInput 
} from '../schemas/product.schema';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../types/common';
import { redis } from '../config/redis';
import crypto from 'crypto';

type ProductUnit = typeof productUnitEnum.enumValues[number];
type BillingStatus = typeof billingStatusEnum.enumValues[number];

const auditService = new AuditService();

export class ProductService {
  private async getProductVersion(businessId: string): Promise<string> {
    const key = `business:${businessId}:products:version`;
    let version = await redis.get(key);
    if (!version) {
      version = Date.now().toString();
      await redis.set(key, version, 'EX', 7 * 24 * 60 * 60); // 7 days
    }
    return version;
  }

  private async incrementProductVersion(businessId: string): Promise<void> {
    const key = `business:${businessId}:products:version`;
    const version = Date.now().toString();
    await redis.set(key, version, 'EX', 7 * 24 * 60 * 60);
  }

  async createCategory(businessId: string, name: string, description?: string, parentId?: string): Promise<typeof productCategories.$inferSelect> {
    // Check if parent category exists
    if (parentId) {
      const [parentCategory] = await db
        .select()
        .from(productCategories)
        .where(and(
          eq(productCategories.id, parentId),
          eq(productCategories.businessId, businessId)
        ))
        .limit(1);

      if (!parentCategory) {
        throw new Error('Parent category not found');
      }
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const [category] = await db
      .insert(productCategories)
      .values({
        businessId,
        name,
        slug,
        description,
        parentId,
        isActive: true,
      })
      .returning();

    if (!category) {
      throw new Error('Failed to create category');
    }

    // Invalidate product cache as categories might change list views or filters
    await this.incrementProductVersion(businessId);
    
    logger.info('Product category created', { categoryId: category.id, businessId, name });

    return category;
  }

  async updateCategory(businessId: string, categoryId: string, name?: string, description?: string, parentId?: string, isActive?: boolean): Promise<typeof productCategories.$inferSelect> {
    const updateData: {
      name?: string;
      slug?: string;
      description?: string | null;
      parentId?: string | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
        updateData.name = name;
        updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updateData.description = description ?? null;
    if (parentId !== undefined) updateData.parentId = parentId ?? null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedCategory] = await db
      .update(productCategories)
      .set(updateData)
      .where(and(
        eq(productCategories.id, categoryId),
        eq(productCategories.businessId, businessId)
      ))
      .returning();

    if (!updatedCategory) {
      throw new Error('Category not found');
    }

    await this.incrementProductVersion(businessId);

    logger.info('Product category updated', { categoryId, businessId });

    return updatedCategory;
  }

  async deleteCategory(businessId: string, categoryId: string): Promise<{ message: string }> {
    // Check if category has products
    const categoryProducts = await db
      .select()
      .from(products)
      .where(and(
        eq(products.categoryId, categoryId),
        eq(products.businessId, businessId)
      ))
      .limit(1);

    if (categoryProducts.length > 0) {
      throw new Error('Cannot delete category with existing products');
    }

    // Check if category has subcategories
    const subcategories = await db
      .select()
      .from(productCategories)
      .where(and(
        eq(productCategories.parentId, categoryId),
        eq(productCategories.businessId, businessId)
      ))
      .limit(1);

    if (subcategories.length > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    const [deletedCategory] = await db
      .delete(productCategories)
      .where(and(
        eq(productCategories.id, categoryId),
        eq(productCategories.businessId, businessId)
      ))
      .returning();

    if (!deletedCategory) {
      throw new Error('Category not found');
    }

    await this.incrementProductVersion(businessId);

    logger.info('Product category deleted', { categoryId, businessId });

    return { message: 'Category deleted successfully' };
  }

  async getCategories(businessId: string, parentId?: string): Promise<Array<typeof productCategories.$inferSelect & { children: unknown[] }>> {
    // Basic caching for categories (typically low volume/change)
    // For now, relying on DB as volume is usually low (<100)
    // Can implement caching later if needed
    
    const conditions: SQL[] = [
      eq(productCategories.businessId, businessId),
      eq(productCategories.isActive, true)
    ];

    if (parentId) {
      conditions.push(eq(productCategories.parentId, parentId));
    } else {
      conditions.push(isNull(productCategories.parentId));
    }

    const categories = await db
      .select()
      .from(productCategories)
      .where(and(...conditions))
      .orderBy(productCategories.name);

    // Get subcategories for each category
    const categoriesWithChildren = await Promise.all(
      categories.map(async (category) => {
        const children = await this.getCategories(businessId, category.id);
        return {
          ...category,
          children,
        };
      })
    );

    return categoriesWithChildren;
  }

  // ==================== VARIANT MANAGEMENT ====================

  async getVariants(businessId: string, productId: string): Promise<Array<typeof productVariants.$inferSelect>> {
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
      throw new Error('Product not found');
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.createdAt);

    return variants;
  }

  async createVariant(businessId: string, productId: string, variantData: {
    variantName: string;
    attributes: Record<string, string>;
    sku?: string;
    barcode?: string;
    priceAdjustment?: number;
    purchasePrice?: number;
    sellingPrice?: number;
    mrp?: number;
    stockQuantity?: number;
    minimumStock?: number;
    weight?: number;
    isDefault?: boolean;
  }): Promise<typeof productVariants.$inferSelect> {
    // Verify product belongs to business and has variants enabled
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

    if (!product.hasVariants) {
      throw new Error('Product does not support variants');
    }

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        variantName: variantData.variantName,
        attributes: variantData.attributes,
        sku: variantData.sku,
        barcode: variantData.barcode,
        priceAdjustment: (variantData.priceAdjustment || 0).toString(),
        purchasePrice: variantData.purchasePrice?.toString(),
        sellingPrice: variantData.sellingPrice?.toString(),
        mrp: variantData.mrp?.toString(),
        stockQuantity: (variantData.stockQuantity || 0).toString(),
        minimumStock: variantData.minimumStock?.toString(),
        weight: variantData.weight?.toString(),
        isDefault: variantData.isDefault || false,
      })
      .returning();

    if (!variant) {
      throw new Error('Failed to create variant');
    }

    await this.incrementProductVersion(businessId);
    logger.info('Product variant created', { variantId: variant.id, productId, businessId });

    return variant;
  }

  async updateVariant(businessId: string, productId: string, variantId: string, variantData: {
    variantName?: string;
    attributes?: Record<string, string>;
    sku?: string;
    barcode?: string;
    priceAdjustment?: number;
    purchasePrice?: number;
    sellingPrice?: number;
    mrp?: number;
    stockQuantity?: number;
    minimumStock?: number;
    weight?: number;
    isDefault?: boolean;
  }): Promise<typeof productVariants.$inferSelect> {
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
      throw new Error('Product not found');
    }

    const updateData: Record<string, unknown> = {};
    if (variantData.variantName !== undefined) updateData.variantName = variantData.variantName;
    if (variantData.attributes !== undefined) updateData.attributes = variantData.attributes;
    if (variantData.sku !== undefined) updateData.sku = variantData.sku;
    if (variantData.barcode !== undefined) updateData.barcode = variantData.barcode;
    if (variantData.priceAdjustment !== undefined) updateData.priceAdjustment = variantData.priceAdjustment.toString();
    if (variantData.purchasePrice !== undefined) updateData.purchasePrice = variantData.purchasePrice?.toString();
    if (variantData.sellingPrice !== undefined) updateData.sellingPrice = variantData.sellingPrice?.toString();
    if (variantData.mrp !== undefined) updateData.mrp = variantData.mrp?.toString();
    if (variantData.stockQuantity !== undefined) updateData.stockQuantity = variantData.stockQuantity.toString();
    if (variantData.minimumStock !== undefined) updateData.minimumStock = variantData.minimumStock?.toString();
    if (variantData.weight !== undefined) updateData.weight = variantData.weight?.toString();
    if (variantData.isDefault !== undefined) updateData.isDefault = variantData.isDefault;

    const [updatedVariant] = await db
      .update(productVariants)
      .set(updateData)
      .where(and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ))
      .returning();

    if (!updatedVariant) {
      throw new Error('Variant not found');
    }

    await this.incrementProductVersion(businessId);
    logger.info('Product variant updated', { variantId, productId, businessId });

    return updatedVariant;
  }

  async deleteVariant(businessId: string, productId: string, variantId: string): Promise<{ message: string }> {
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
      throw new Error('Product not found');
    }

    const [deletedVariant] = await db
      .delete(productVariants)
      .where(and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ))
      .returning();

    if (!deletedVariant) {
      throw new Error('Variant not found');
    }

    await this.incrementProductVersion(businessId);
    logger.info('Product variant deleted', { variantId, productId, businessId });

    return { message: 'Variant deleted successfully' };
  }

  async createProduct(businessId: string, userId: string, input: CreateProductInput, req?: AuthenticatedRequest): Promise<typeof products.$inferSelect> {
    const {
      productCode,
      name,
      description,
      categoryId,
      unit,
      purchasePrice,
      sellingPrice,
      mrp,
      maxDiscountPercent,
      taxPercent,
      minimumStock,
      currentStock,
      barcode,
      sku,
      hsnCode,
      weight,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dimensions,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      specifications,
      isTaxable,
      hasVariants,
      variants,
    } = input;

    // Validate category if provided
    if (categoryId) {
      const [category] = await db
        .select()
        .from(productCategories)
        .where(and(
          eq(productCategories.id, categoryId),
          eq(productCategories.businessId, businessId)
        ))
        .limit(1);

      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Check if product code already exists
    if (productCode) {
        const existingProduct = await db
        .select()
        .from(products)
        .where(and(
            eq(products.businessId, businessId),
            eq(products.productCode, productCode)
        ))
        .limit(1);

        if (existingProduct.length > 0) {
        throw new Error('Product with this code already exists');
        }
    }

    // Create product
    const [product] = await db
      .insert(products)
      .values({
        businessId,
        categoryId,
        productCode: productCode || `PROD-${Date.now()}`,
        name,
        description,
        unit: unit as ProductUnit,
        purchasePrice: purchasePrice?.toString(),
        sellingPrice: sellingPrice.toString(),
        mrp: mrp?.toString(),
        maxDiscountPercent: (maxDiscountPercent || 0).toString(),
        taxPercent: (taxPercent || 0).toString(),
        minimumStock: (minimumStock || 0).toString(),
        currentStock: (currentStock || 0).toString(),
        barcode,
        sku,
        hsnCode,
        weight: weight?.toString(),
        dimensions: dimensions ? (dimensions as Record<string, unknown>) : null,
        specifications: specifications ? (specifications as Record<string, unknown>) : null,
        isActive: true,
        isTaxable: isTaxable !== undefined ? isTaxable : true,
        hasVariants: hasVariants || false,
      })
      .returning();

    if (!product) {
      throw new Error('Failed to create product');
    }

    // Create variants if provided
    if (hasVariants && variants && variants.length > 0) {
      await Promise.all(variants.map(async (variant) => {
        await db.insert(productVariants).values({
            productId: product.id,
            variantName: variant.variantName,
            attributes: variant.attributes,
            sku: variant.sku,
            barcode: variant.barcode,
            priceAdjustment: (variant.priceAdjustment || 0).toString(),
            purchasePrice: variant.purchasePrice?.toString(),
            sellingPrice: variant.sellingPrice?.toString(),
            mrp: variant.mrp?.toString(),
            stockQuantity: (variant.stockQuantity || 0).toString(),
            minimumStock: variant.minimumStock?.toString(),
            weight: variant.weight?.toString(),
            isDefault: variant.isDefault || false,
            isActive: true,
        });
      }));
    }

    await auditService.logProductAction('CREATE', businessId, userId, product.id, undefined, product, req);
    logger.info('Product created', { productId: product.id, businessId, productCode });

    // Invalidate cache
    await this.incrementProductVersion(businessId);

    return product;
  }

  async getProduct(businessId: string, productId: string): Promise<typeof products.$inferSelect> {
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

    return product;
  }

  async updateProduct(businessId: string, userId: string, productId: string, input: UpdateProductInput, req?: AuthenticatedRequest): Promise<typeof products.$inferSelect> {
    const updateData: {
      productCode?: string;
      name?: string;
      description?: string | null;
      categoryId?: string | null;
      unit?: ProductUnit;
      purchasePrice?: string;
      sellingPrice?: string;
      mrp?: string | null;
      maxDiscountPercent?: string;
      taxPercent?: string;
      minimumStock?: string;
      currentStock?: string;
      barcode?: string | null;
      sku?: string | null;
      hsnCode?: string | null;
      weight?: string | null;
      dimensions?: Record<string, unknown> | null;
      specifications?: Record<string, unknown> | null;
      isActive?: boolean;
      isTaxable?: boolean;
    } = {};

    // Only update provided fields
    if (input.productCode !== undefined) updateData.productCode = input.productCode;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description ?? null;
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId ?? null;
    if (input.unit !== undefined) updateData.unit = input.unit as ProductUnit;
    if (input.purchasePrice !== undefined) updateData.purchasePrice = input.purchasePrice.toString();
    if (input.sellingPrice !== undefined) updateData.sellingPrice = input.sellingPrice.toString();
    if (input.mrp !== undefined) updateData.mrp = input.mrp?.toString() ?? null;
    if (input.maxDiscountPercent !== undefined) updateData.maxDiscountPercent = input.maxDiscountPercent.toString();
    if (input.taxPercent !== undefined) updateData.taxPercent = input.taxPercent.toString();
    if (input.minimumStock !== undefined) updateData.minimumStock = input.minimumStock.toString();
    if (input.currentStock !== undefined) updateData.currentStock = input.currentStock.toString();
    if (input.barcode !== undefined) updateData.barcode = input.barcode ?? null;
    if (input.sku !== undefined) updateData.sku = input.sku ?? null;
    if (input.hsnCode !== undefined) updateData.hsnCode = input.hsnCode ?? null;
    if (input.weight !== undefined) updateData.weight = input.weight?.toString() ?? null;
    if (input.dimensions !== undefined) updateData.dimensions = input.dimensions ? (input.dimensions as Record<string, unknown>) : null;
    if (input.specifications !== undefined) updateData.specifications = input.specifications ? (input.specifications as Record<string, unknown>) : null;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.isTaxable !== undefined) updateData.isTaxable = input.isTaxable;

    // Get old values for audit
    const [oldProduct] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.businessId, businessId)
      ))
      .limit(1);

    if (!oldProduct) {
        throw new Error('Product not found');
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(and(
        eq(products.id, productId),
        eq(products.businessId, businessId)
      ))
      .returning();

    if (!updatedProduct) {
      throw new Error('Product not found');
    }

    await auditService.logProductAction('UPDATE', businessId, userId, productId, oldProduct, updatedProduct, req);
    logger.info('Product updated', { productId, businessId });

    // Invalidate cache
    await this.incrementProductVersion(businessId);

    return updatedProduct;
  }

  async deleteProduct(businessId: string, userId: string, productId: string, req?: AuthenticatedRequest): Promise<{ message: string }> {
    // Check if product is used in any bills
    const productBills = await db
      .select()
      .from(billItems)
      .where(eq(billItems.productId, productId))
      .limit(1);

    if (productBills.length > 0) {
      throw new Error('Cannot delete product used in bills');
    }

    const [productToDelete] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

    const [deletedProduct] = await db
      .delete(products)
      .where(and(
        eq(products.id, productId),
        eq(products.businessId, businessId)
      ))
      .returning();

    if (!deletedProduct) {
      throw new Error('Product not found');
    }

    await auditService.logProductAction('DELETE', businessId, userId, productId, productToDelete, undefined, req);
    logger.info('Product deleted', { productId, businessId });

    // Invalidate cache
    await this.incrementProductVersion(businessId);

    return { message: 'Product deleted successfully' };
  }

  async getProducts(businessId: string, query: ProductQueryInput): Promise<{ products: typeof products.$inferSelect[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    // 1. Check Cache
    const version = await this.getProductVersion(businessId);
    // Create a stable cache key based on query params
    const queryHash = crypto.createHash('md5').update(JSON.stringify(query)).digest('hex');
    const cacheKey = `business:${businessId}:products:v${version}:${queryHash}`;
    
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult) as { products: typeof products.$inferSelect[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    }

    const { 
      search, 
      categoryId, 
      isActive, 
      lowStock, 
      unit,
      sortBy = 'name', 
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = query;

    const conditions: SQL[] = [eq(products.businessId, businessId)];

    // Apply filters
    if (search) {
      conditions.push(
        sql`${products.name} ILIKE ${`%${search}%`} OR 
            ${products.productCode} ILIKE ${`%${search}%`} OR 
            ${products.description} ILIKE ${`%${search}%`} OR
            ${products.barcode} ILIKE ${`%${search}%`} OR
            ${products.sku} ILIKE ${`%${search}%`}`
      );
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (isActive !== undefined) {
      conditions.push(eq(products.isActive, isActive));
    }

    if (unit) {
      conditions.push(eq(products.unit, unit as ProductUnit));
    }

    if (lowStock) {
      conditions.push(sql`${products.currentStock} <= ${products.minimumStock}`);
    }

    const whereCondition = and(...conditions);

    // Apply sorting
    const validSortColumns = ['name', 'price', 'createdAt', 'updatedAt', 'currentStock'];
    const sortField = validSortColumns.includes(sortBy || '') ? sortBy : 'createdAt';
    const sortColumn = products[sortField as keyof typeof products] as unknown as AnyColumn;
    
    let orderByClause;
    if (sortColumn) {
      orderByClause = sortOrder === 'desc' ? desc(sortColumn) : sortColumn;
    } else {
      orderByClause = desc(products.createdAt);
    }

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(products)
      .where(whereCondition);

    const total = countResult?.count ? Number(countResult.count) : 0;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const offset = (page - 1) * limit;

    const productsData = await db
      .select()
      .from(products)
      .where(whereCondition)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .orderBy(orderByClause as any)
      .limit(limit)
      .offset(offset);

    const result = {
      products: productsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    // 2. Set Cache (Expire after 1 hour, or until invalidated)
    // The version key expiration handles long-term cleanup, but good to have explicit TTL
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

    return result;
  }

  async adjustStock(businessId: string, userId: string, input: StockAdjustmentInput, req?: AuthenticatedRequest): Promise<{ product: typeof products.$inferSelect; adjustment: unknown }> {
    const { productId, adjustmentType, quantity, reason, notes } = input;

    if (!productId) {
      throw new Error('Product ID is required for stock adjustment');
    }

    // Get current product
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

    let newStock;
    // Current stock is string/decimal from DB, convert to number
    const currentStock = Number(product.currentStock || 0);
    const qty = Number(quantity);

    switch (adjustmentType) {
      case 'ADD':
        newStock = currentStock + qty;
        break;
      case 'SUBTRACT':
        if (currentStock < qty) {
          throw new Error('Insufficient stock to subtract');
        }
        newStock = currentStock - qty;
        break;
      case 'SET':
        newStock = qty;
        break;
      default:
        throw new Error('Invalid adjustment type');
    }

    // Update product stock
    const [updatedProduct] = await db
      .update(products)
      .set({ currentStock: newStock.toString() })
      .where(and(
        eq(products.id, productId),
        eq(products.businessId, businessId)
      ))
      .returning();

    // Log the adjustment via AuditService
    await auditService.logProductAction(
        'STOCK_ADJUST', 
        businessId, 
        userId, 
        productId, 
        { stock: currentStock }, 
        { stock: newStock, reason, notes, type: input.type || 'ADJUSTMENT' },
        req
    );

    if (!updatedProduct) {
      throw new Error('Failed to update product stock: Product not found');
    }

    // Invalidate cache
    await this.incrementProductVersion(businessId);

    return {
      product: updatedProduct,
      adjustment: {
        productId,
        adjustmentType,
        quantity,
        oldStock: currentStock,
        newStock,
        reason,
        notes,
        userId,
        timestamp: new Date(),
      },
    };
  }

  async getLowStockProducts(businessId: string): Promise<typeof products.$inferSelect[]> {
    const lowStockProducts = await db
      .select()
      .from(products)
      .where(and(
        eq(products.businessId, businessId),
        eq(products.isActive, true),
        sql`${products.currentStock} <= ${products.minimumStock}`,
        sql`${products.minimumStock} > 0`
      ))
      .orderBy(products.name);

    return lowStockProducts;
  }

  async getProductStats(businessId: string): Promise<{ totalProducts: number; activeProducts: number; lowStockProducts: number; outOfStockProducts: number }> {
    // These stats are calculated on demand, often for dashboards. 
    // They can also be cached, but for now we'll focus on the main list.
    const [totalProducts] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.businessId, businessId));

    const [activeProducts] = await db
      .select({ count: count() })
      .from(products)
      .where(and(
        eq(products.businessId, businessId),
        eq(products.isActive, true)
      ));

    const [lowStockProducts] = await db
      .select({ count: count() })
      .from(products)
      .where(and(
        eq(products.businessId, businessId),
        eq(products.isActive, true),
        sql`${products.currentStock} <= ${products.minimumStock}`,
        sql`${products.minimumStock} > 0`
      ));

    const [outOfStockProducts] = await db
      .select({ count: count() })
      .from(products)
      .where(and(
        eq(products.businessId, businessId),
        eq(products.isActive, true),
        sql`${products.currentStock} = 0`
      ));

    return {
      totalProducts: totalProducts?.count ? Number(totalProducts.count) : 0,
      activeProducts: activeProducts?.count ? Number(activeProducts.count) : 0,
      lowStockProducts: lowStockProducts?.count ? Number(lowStockProducts.count) : 0,
      outOfStockProducts: outOfStockProducts?.count ? Number(outOfStockProducts.count) : 0,
    };
  }

  async getProductSalesReport(businessId: string, startDate?: Date, endDate?: Date): Promise<unknown[]> {
    const conditions: SQL[] = [
      eq(bills.businessId, businessId),
      eq(bills.status, 'PAID' as BillingStatus)
    ];

    if (startDate) {
      conditions.push(gte(bills.billDate, startDate));
    }

    if (endDate) {
      conditions.push(lte(bills.billDate, endDate));
    }

    return await db
      .select({
        productId: billItems.productId,
        productName: billItems.productName,
        productCode: billItems.productCode,
        unit: billItems.unit,
        totalQuantity: sum(billItems.quantity),
        totalAmount: sum(billItems.totalAmount),
        billCount: count(billItems.id),
      })
      .from(billItems)
      .innerJoin(bills, eq(billItems.billId, bills.id))
      .where(and(...conditions))
      .groupBy(billItems.productId, billItems.productName, billItems.productCode, billItems.unit)
      .orderBy(desc(sum(billItems.totalAmount)));
  }
}