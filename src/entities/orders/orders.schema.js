import { z } from 'zod';

import { ORDER_STATUSES } from '#configs/constants.js';
import '#configs/zod.config.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createOrderZodSchema = z.object({
  items: z
    .array(
      z.object({
        product: objectIdSchema,
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
  shippingAddress: z.string().trim().min(5).max(500),
});

export const updateOrderStatusZodSchema = z.object({
  status: z.enum(Object.values(ORDER_STATUSES)),
});

export const orderIdSchema = z.object({ id: objectIdSchema });
export const orderQuerySchema = z.object({
  user: objectIdSchema.optional(),
  status: z.enum(Object.values(ORDER_STATUSES)).optional(),
});
