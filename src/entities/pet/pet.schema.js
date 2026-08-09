import { z } from 'zod';

import '#configs/zod.config.js';

const mongoObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createPetZodSchema = z.object({
  name: z.string().trim().min(1).max(80),
  petType: mongoObjectIdSchema,
  age: z.number().min(0).max(200).optional(),
  description: z.string().trim().max(1000).optional().default(''),
  properties: z.record(z.string(), z.unknown()).optional().default({}),
  isEnabled: z.boolean().optional().default(true),
});

export const updatePetZodSchema = createPetZodSchema.partial();

export const petIdSchema = z.object({ id: mongoObjectIdSchema });

export const petQuerySchema = z.object({
  petType: mongoObjectIdSchema.optional(),
  includeDisabled: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});
