
import { db } from '../src/config/database';
import { AuthService } from '../src/services/auth.service';
import { BusinessService } from '../src/services/business.service';
import { RoleService } from '../src/services/role.service';
import { PermissionService } from '../src/services/permission.service';
import { users, retailBusinesses, businessStaff } from '../src/models/drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const authService = new AuthService();
  const businessService = new BusinessService();
  const roleService = new RoleService();
  const permissionService = new PermissionService();

  console.log('--- STARTING RBAC TEST ---');

  // 1. Setup User & Business
  console.log('1. Creating Owner...');
  const ownerEmail = `owner_${Date.now()}@test.com`;
  const owner = await authService.register({
    email: ownerEmail,
    password: 'password123',
    firstName: 'Test',
    lastName: 'Owner',
    businessName: `Test Business ${Date.now()}`,
    phone: `999${Date.now().toString().slice(-7)}`
  });
  
  const ownerId = owner.user.id;
  const business = await db.query.retailBusinesses.findFirst({
      where: eq(retailBusinesses.ownerId, ownerId)
  });
  
  if (!business) throw new Error('Business creation failed');
  const businessId = business.id;
  console.log('   Owner & Business Created:', businessId);

  // 2. Create Staff User
  console.log('2. Creating Staff User...');
  const staffEmail = `staff_${Date.now()}@test.com`;
  const staff = await authService.register({
    email: staffEmail,
    password: 'password123',
    firstName: 'Staff',
    lastName: 'Member',
    phone: `888${Date.now().toString().slice(-7)}`
  });
  const staffId = staff.user.id;
  console.log('   Staff Created:', staffId);

  // 3. Create Custom Role
  console.log('3. Creating Custom Role "Inventory Manager"...');
  const customRole = await roleService.createRole(
      businessId,
      ownerId,
      'Inventory Manager',
      'Manages inventory only',
      [
          { resource: 'PRODUCTS', action: 'READ' },
          { resource: 'PRODUCTS', action: 'CREATE' },
          { resource: 'PRODUCTS', action: 'UPDATE' }
      ]
  );
  console.log('   Role Created:', customRole.id);

  // 4. Assign Role to Staff (Manual DB insert or via service if updated)
  // Since businessService.inviteStaffMember relies on role NAME lookup and mapping, let's use explicit DB insert for test accuracy or update businessService logic?
  // Ideally we use BusinessService, but it's currently hardcoded to Enums.
  // I will directly insert to business_staff to simulate "Assign Role" with the new system.
  console.log('4. Assigning Role to Staff...');
  await db.insert(businessStaff).values({
      businessId,
      userId: staffId,
      roleId: customRole.id,
      isActive: true,
      // Legacy flags - should correlate ideally, but testing RBAC specifically
      canManageInventory: true
  });
  console.log('   Role Assigned.');

  // 5. Verify Permissions
  console.log('5. Verifying Permissions...');
  
  const canReadProducts = await permissionService.hasPermission(staffId, businessId, 'PRODUCT_READ');
  console.log('   Has PRODUCT_READ:', canReadProducts); // Should be true

  const canCreateProducts = await permissionService.hasPermission(staffId, businessId, 'PRODUCT_CREATE');
  console.log('   Has PRODUCT_CREATE:', canCreateProducts); // Should be true

  const canCreateBill = await permissionService.hasPermission(staffId, businessId, 'BILL_CREATE');
  console.log('   Has BILL_CREATE:', canCreateBill); // Should be false

  if (canReadProducts && canCreateProducts && !canCreateBill) {
      console.log('   SUCCESS: Permissions matched expected role!');
  } else {
      console.error('   FAILURE: Permissions did not match.');
  }

  // 6. Test Override
  console.log('6. Testing Override...');
  // Grant BILL_CREATE via override (placeholder logic simulation since I didn't verify Override service method yet, but PermissionService checks it)
  // I'll manually insert override
  const { userPermissionOverrides } = await import('../src/models/drizzle/schema');
  await db.insert(userPermissionOverrides).values({
      userId: staffId,
      businessId,
      resource: 'BILLS',
      action: 'CREATE',
      isAllowed: true
  });

  const canCreateBillAfterOverride = await permissionService.hasPermission(staffId, businessId, 'BILL_CREATE');
  console.log('   Has BILL_CREATE (After Override):', canCreateBillAfterOverride); // Should be true

  if (canCreateBillAfterOverride) {
       console.log('   SUCCESS: Override worked!');
  } else {
       console.error('   FAILURE: Override did not work.');
  }

  console.log('--- TEST COMPLETE ---');
  process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
