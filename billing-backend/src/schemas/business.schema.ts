import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const createBusinessSchema = z.object({
  name: z.string().min(3, 'Business name must be at least 3 characters'),
  description: z.string().optional(),
  businessType: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
  email: z.string().email('Invalid email address').optional(),
  website: z.string().url('Invalid website URL').optional(),
  address: addressSchema.optional(),
  settings: z.record(z.any()).optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(3, 'Business name must be at least 3 characters').optional(),
  description: z.string().optional(),
  businessType: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
  email: z.string().email('Invalid email address').optional(),
  website: z.string().url('Invalid website URL').optional(),
  address: addressSchema.optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const businessSettingsSchema = z.object({
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  taxSettings: z.object({
    enabled: z.boolean().optional(),
    rate: z.number().min(0).max(100).optional(),
    type: z.enum(['percentage', 'fixed']).optional(),
  }).optional(),
  invoiceSettings: z.object({
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    startingNumber: z.number().positive().optional(),
    terms: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  paymentSettings: z.object({
    allowedMethods: z.array(z.string()).optional(),
    dueDays: z.number().positive().optional(),
    lateFee: z.number().nonnegative().optional(),
  }).optional(),
  notificationSettings: z.object({
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
  }).optional(),
});

export const inviteStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['MANAGER', 'CASHIER', 'VIEWER']),
  permissions: z.array(z.string()).optional(),
});

export const updateStaffSchema = z.object({
  role: z.enum(['MANAGER', 'CASHIER', 'VIEWER']).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;