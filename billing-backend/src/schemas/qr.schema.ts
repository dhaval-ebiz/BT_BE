import { z } from 'zod';

export const generateQrBatchSchema = z.object({
  productId: z.string().uuid().optional(),
  batchName: z.string().min(1, 'Batch name is required').max(255),
  quantity: z.number().int().min(1).max(1000),
  purpose: z.string().max(255).optional(),
  notes: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
});

export const verifyQrSchema = z.object({
  code: z.string().min(1),
  location: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
});

export type GenerateQrBatchInput = z.infer<typeof generateQrBatchSchema>;
export type VerifyQrInput = z.infer<typeof verifyQrSchema>;
