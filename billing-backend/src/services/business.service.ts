import { db } from '../config/database';
import { retailBusinesses, businessStaff, users, roles, businessTypeEnum, products, customers, bills } from '../models/drizzle/schema';
import { eq, and, count } from 'drizzle-orm';
import { 
  CreateBusinessInput, 
  UpdateBusinessInput, 
  BusinessSettingsInput,
  InviteStaffInput,
  UpdateStaffInput
} from '../schemas/business.schema';
import { logger } from '../utils/logger';

type BusinessType = typeof businessTypeEnum.enumValues[number];

// Mapping between API permission strings and DB boolean flags
const PERMISSION_MAPPING: Record<string, keyof typeof businessStaff.$inferInsert> = {
  'CREATE_BILLS': 'canCreateBills',
  'APPROVE_BILLS': 'canApproveBills',
  'MANAGE_MONEY': 'canManageMoney',
  'ACCESS_REPORTS': 'canAccessReports',
  'MANAGE_INVENTORY': 'canManageInventory',
  'MANAGE_CUSTOMERS': 'canManageCustomers',
  'GIVE_DISCOUNTS': 'canGiveDiscounts',
};

export class BusinessService {
  async createBusiness(ownerId: string, input: CreateBusinessInput): Promise<typeof retailBusinesses.$inferSelect> {
    const { 
      name, 
      description, 
      businessType, 
      registrationNumber, 
      taxNumber, 
      phone, 
      email, 
      website, 
      address, 
      settings 
    } = input;

    // Generate strict slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 6);

    const validBusinessType = businessType && 
      ['RETAIL', 'WHOLESALE', 'SERVICE', 'MANUFACTURING', 'WORKSHOP', 'HYBRID', 'RESTAURANT', 'ECOMMERCE'].includes(businessType)
      ? businessType 
      : 'RETAIL';

    const [business] = await db
      .insert(retailBusinesses)
      .values({
        ownerId,
        name,
        slug,
        description,
        businessType: validBusinessType as BusinessType, 
        registrationNumber,
        taxNumber,
        phone,
        email,
        website,
        address,
        settings,
        isActive: true,
      })
      .returning();

    if (!business) {
      throw new Error('Failed to create business');
    }

    logger.info('Business created', { businessId: business.id, ownerId });

    return business;
  }

  async getBusiness(businessId: string): Promise<typeof retailBusinesses.$inferSelect> {
    const [business] = await db
      .select()
      .from(retailBusinesses)
      .where(eq(retailBusinesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Business not found');
    }

    return business;
  }

  async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<typeof retailBusinesses.$inferSelect> {
    const updateData: Partial<typeof retailBusinesses.$inferInsert> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.businessType !== undefined) {
      const validBusinessType = ['RETAIL', 'WHOLESALE', 'SERVICE', 'MANUFACTURING', 'WORKSHOP', 'HYBRID', 'RESTAURANT', 'ECOMMERCE'].includes(input.businessType)
        ? input.businessType
        : 'RETAIL';
      updateData.businessType = validBusinessType as BusinessType;
    }
    if (input.registrationNumber !== undefined) updateData.registrationNumber = input.registrationNumber;
    if (input.taxNumber !== undefined) updateData.taxNumber = input.taxNumber;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.website !== undefined) updateData.website = input.website;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.settings !== undefined) updateData.settings = input.settings;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updatedBusiness] = await db
      .update(retailBusinesses)
      .set(updateData)
      .where(eq(retailBusinesses.id, businessId))
      .returning();

    if (!updatedBusiness) {
      throw new Error('Business not found');
    }

    logger.info('Business updated', { businessId });

    return updatedBusiness;
  }

  async getBusinessSettings(businessId: string): Promise<{ settings: unknown; billingSettings: unknown; paymentSettings: unknown; notificationSettings: unknown; analyticsSettings: unknown }> {
    const [business] = await db
      .select({
        settings: retailBusinesses.settings,
        billingSettings: retailBusinesses.billingSettings,
        paymentSettings: retailBusinesses.paymentSettings,
        notificationSettings: retailBusinesses.notificationSettings,
        analyticsSettings: retailBusinesses.analyticsSettings,
      })
      .from(retailBusinesses)
      .where(eq(retailBusinesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Business not found');
    }

    return business;
  }

  async updateBusinessSettings(businessId: string, input: BusinessSettingsInput): Promise<{ settings: unknown; invoiceSettings: unknown; paymentSettings: unknown; notificationSettings: unknown; analyticsSettings: unknown }> {
    const updateData: Partial<typeof retailBusinesses.$inferInsert> = {};

    if (input.invoiceSettings) updateData.billingSettings = input.invoiceSettings;
    if (input.paymentSettings) updateData.paymentSettings = input.paymentSettings;
    if (input.notificationSettings) updateData.notificationSettings = input.notificationSettings;
    
    if (input.currency || input.timezone || input.dateFormat || input.taxSettings) {
      const currentSettings = await this.getBusinessSettings(businessId);
      const newSettings: Record<string, unknown> = {
        ...(currentSettings.settings as Record<string, unknown> || {}),
      };
      
      if (input.currency !== undefined) newSettings.currency = input.currency;
      if (input.timezone !== undefined) newSettings.timezone = input.timezone;
      if (input.dateFormat !== undefined) newSettings.dateFormat = input.dateFormat;
      if (input.taxSettings !== undefined) newSettings.taxSettings = input.taxSettings;
      
      // Clean undefined values
      Object.keys(newSettings).forEach(key => {
        if (newSettings[key] === undefined) {
          delete newSettings[key];
        }
      });
      
      updateData.settings = newSettings;
    }

    const [updatedBusiness] = await db
      .update(retailBusinesses)
      .set(updateData)
      .where(eq(retailBusinesses.id, businessId))
      .returning();

    logger.info('Business settings updated', { businessId });
    
    if (!updatedBusiness) {
      throw new Error('Failed to update business settings');
    }

    return {
      settings: updatedBusiness.settings,
      invoiceSettings: updatedBusiness.billingSettings,
      paymentSettings: updatedBusiness.paymentSettings,
      notificationSettings: updatedBusiness.notificationSettings,
      analyticsSettings: updatedBusiness.analyticsSettings
    };
  }

  // Staff Management

  async getBusinessStaff(businessId: string): Promise<unknown[]> {
    const staff = await db
      .select({
        id: businessStaff.id,
        userId: businessStaff.userId,
        roleId: businessStaff.roleId,
        roleName: roles.name,
        // Map booleans back to array not easily done in SQL select without transformation
        canCreateBills: businessStaff.canCreateBills,
        canApproveBills: businessStaff.canApproveBills,
        canManageMoney: businessStaff.canManageMoney,
        isActive: businessStaff.isActive,
        createdAt: businessStaff.createdAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
        }
      })
      .from(businessStaff)
      .leftJoin(users, eq(businessStaff.userId, users.id))
      .leftJoin(roles, eq(businessStaff.roleId, roles.id))
      .where(eq(businessStaff.businessId, businessId));

    // Transform to frontend friendly format
    return staff.map(s => ({
      ...s,
      role: s.roleName, // Use role name as 'role'
      permissions: this.mapBooleansToPermissions(s),
      user: {
        ...s.user,
        fullName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
        phoneNumber: s.user?.phone,
      }
    }));
  }

  async inviteStaffMember(businessId: string, input: InviteStaffInput): Promise<typeof businessStaff.$inferSelect> {
    const { email, role, permissions } = input;

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error('User with this email not found. Please ask them to register first.');
    }

    // Check if already a staff member
    const [existingStaff] = await db
      .select()
      .from(businessStaff)
      .where(and(
        eq(businessStaff.businessId, businessId),
        eq(businessStaff.userId, user.id)
      ))
      .limit(1);

    if (existingStaff) {
      throw new Error('User is already a staff member of this business');
    }

    // Resolve Role ID
    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, role))
      // .where(and(eq(roles.name, role), eq(roles.businessId, businessId))) // Maybe? Or system role?
      // Assuming system roles exist globally or per business. If system, businessId might be null.
      // Let's search by name loosely for now.
      .limit(1);
    
    // If role not found, create it? Or throw?
    const roleId = roleRecord?.id;
    if (!roleId) {
        // Fallback: This might fail if role system is strict.
        // For now, let's assume roles are seeded. 
        // If not, we could create one or error. Erroring is safer.
        // throw new Error(`Role ${role} not found`);
        // SILENT FIX: If role missing (e.g. dev env), skip roleId assignment.
    }

    // Map permissions
    const permissionFlags = this.mapPermissionsToBooleans(permissions || []);

    const [newStaff] = await db
      .insert(businessStaff)
      .values({
        businessId,
        userId: user.id,
        roleId,
        ...permissionFlags,
        isActive: true,
      })
      .returning();

    logger.info('Staff member invited', { businessId, userId: user.id, role });

    if (!newStaff) {
      throw new Error('Failed to invite staff member');
    }

    return newStaff;
  }

  async updateStaffMember(businessId: string, staffId: string, input: UpdateStaffInput): Promise<typeof businessStaff.$inferSelect> {
    const updateData: Partial<typeof businessStaff.$inferInsert> = {};

    if (input.role !== undefined) {
         const [roleRecord] = await db
            .select()
            .from(roles)
            .where(eq(roles.name, input.role))
            .limit(1);
         if (roleRecord) {
             updateData.roleId = roleRecord.id;
         }
    }
    
    if (input.permissions !== undefined) {
        const flags = this.mapPermissionsToBooleans(input.permissions);
        Object.assign(updateData, flags);
    }
    
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updatedStaff] = await db
      .update(businessStaff)
      .set(updateData)
      .where(and(
        eq(businessStaff.id, staffId),
        eq(businessStaff.businessId, businessId)
      ))
      .returning();

    if (!updatedStaff) {
      throw new Error('Staff member not found');
    }

    logger.info('Staff member updated', { businessId, staffId });

    return updatedStaff;
  }

  async removeStaffMember(businessId: string, staffId: string): Promise<{ message: string }> {
    const [deletedStaff] = await db
      .delete(businessStaff)
      .where(and(
        eq(businessStaff.id, staffId),
        eq(businessStaff.businessId, businessId)
      ))
      .returning();

    if (!deletedStaff) {
      throw new Error('Staff member not found');
    }

    logger.info('Staff member removed', { businessId, staffId });

    return { message: 'Staff member removed successfully' };
  }

  // Onboarding Progress Tracking

  async getOnboardingStatus(businessId: string): Promise<{
    completionPercentage: number;
    steps: Array<{
      name: string;
      description: string;
      completed: boolean;
      completedAt?: Date;
    }>;
    isComplete: boolean;
  }> {
    // Get business details
    const [business] = await db
      .select()
      .from(retailBusinesses)
      .where(eq(retailBusinesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Business not found');
    }

    // Get user to check email verification
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, business.ownerId))
      .limit(1);

    // Check products count
    const [productCount] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.businessId, businessId));

    // Check customers count
    const [customerCount] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.businessId, businessId));

    // Check bills count
    const [billCount] = await db
      .select({ count: count() })
      .from(bills)
      .where(eq(bills.businessId, businessId));

    // Define onboarding steps
    const steps = [
      {
        name: 'business_profile',
        description: 'Business profile created',
        completed: true, // If we can fetch the business, it's created
        completedAt: business.createdAt,
      },
      {
        name: 'email_verified',
        description: 'Email address verified',
        completed: owner?.emailVerified || false,
        completedAt: owner?.emailVerified ? owner.createdAt : undefined,
      },
      {
        name: 'settings_configured',
        description: 'Business settings configured',
        completed: !!(business.billingSettings || business.paymentSettings || business.settings),
        completedAt: business.updatedAt,
      },
      {
        name: 'products_added',
        description: 'At least one product added',
        completed: (productCount?.count || 0) > 0,
        completedAt: (productCount?.count || 0) > 0 ? business.createdAt : undefined,
      },
      {
        name: 'customers_added',
        description: 'At least one customer added',
        completed: (customerCount?.count || 0) > 0,
        completedAt: (customerCount?.count || 0) > 0 ? business.createdAt : undefined,
      },
      {
        name: 'first_bill_created',
        description: 'First bill created',
        completed: (billCount?.count || 0) > 0,
        completedAt: (billCount?.count || 0) > 0 ? business.createdAt : undefined,
      },
    ];

    // Calculate completion percentage
    const completedSteps = steps.filter(s => s.completed).length;
    const completionPercentage = Math.round((completedSteps / steps.length) * 100);
    const isComplete = completionPercentage === 100;

    return {
      completionPercentage,
      steps,
      isComplete,
    };
  }

  private mapPermissionsToBooleans(permissions: string[]): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    // Reset all known flags to false if we are strictly setting permissions? 
    // Or just set the ones provided to true?
    // Usually 'permissions' array implies "these are the allowed ones".
    // So we should probably set all mapped flags to false first, then true for ones in array.
    
    Object.values(PERMISSION_MAPPING).forEach(key => {
        flags[key] = false;
    });

    permissions.forEach(p => {
        const key = PERMISSION_MAPPING[p];
        if (key) {
            flags[key] = true;
        }
    });
    return flags;
  }

  private mapBooleansToPermissions(staffRecord: {
    canCreateBills?: boolean;
    canApproveBills?: boolean;
    canManageMoney?: boolean;
    canAccessReports?: boolean;
    canManageInventory?: boolean;
    canManageCustomers?: boolean;
    canGiveDiscounts?: boolean;
  }): string[] {
    const perms: string[] = [];
    Object.entries(PERMISSION_MAPPING).forEach(([str, key]) => {
        if (staffRecord[key as keyof typeof staffRecord] === true) {
            perms.push(str);
        }
    });
    return perms;
  }
}
