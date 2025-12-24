import { db } from '../config/database';
import { products, productCategories, billItems, bills, productVariants, productUnitEnum, billingStatusEnum } from '../models/drizzle/schema';
import { eq, and, sql, desc, sum, count, gte, lte, SQL, isNull } from 'drizzle-orm';
import { 
  CreateProductInput, 
  UpdateProductInput, 
  ProductQueryInput,
  StockAdjustmentInput 
} from '../schemas/product.schema';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import { AuthenticatedRequest } from '../types/common';

type ProductUnit = typeof productUnitEnum.enumValues[number];
type BillingStatus = typeof billingStatusEnum.enumValues[number];

const auditService = new AuditService();

export class ProductService {
  async createCategory(businessId: string, name: string, description?: string, parentId?: string) {
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

    logger.info('Product category created', { categoryId: category.id, businessId, name });

    return category;
  }

  async updateCategory(businessId: string, categoryId: string, name?: string, description?: string, parentId?: string, isActive?: boolean) {
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

    logger.info('Product category updated', { categoryId, businessId });

    return updatedCategory;
  }

  async deleteCategory(businessId: string, categoryId: string) {
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

    logger.info('Product category deleted', { categoryId, businessId });

    return { message: 'Category deleted successfully' };
  }

  async getCategories(businessId: string, parentId?: string) {
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

  async createProduct(businessId: string, userId: string, input: CreateProductInput, req?: AuthenticatedRequest) {
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
      dimensions,
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

    return product;
  }

  async getProduct(businessId: string, productId: string) {
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

  async updateProduct(businessId: string, userId: string, productId: string, input: UpdateProductInput, req?: AuthenticatedRequest) {
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

    return updatedProduct;
  }

  async deleteProduct(businessId: string, userId: string, productId: string, req?: AuthenticatedRequest) {
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

    return { message: 'Product deleted successfully' };
  }

  async getProducts(businessId: string, query: ProductQueryInput) {
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
    const sortColumn = products[sortBy as keyof typeof products];
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

    const total = countResult.count;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const offset = (page - 1) * limit;

    const productsData = await db
      .select()
      .from(products)
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      products: productsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async adjustStock(businessId: string, userId: string, input: StockAdjustmentInput, req?: AuthenticatedRequest) {
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

  async getLowStockProducts(businessId: string) {
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

  async getProductStats(businessId: string) {
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
      totalProducts: totalProducts.count,
      activeProducts: activeProducts.count,
      lowStockProducts: lowStockProducts.count,
      outOfStockProducts: outOfStockProducts.count,
    };
  }

  async getProductSalesReport(businessId: string, startDate?: Date, endDate?: Date) {
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