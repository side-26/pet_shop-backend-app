import { z } from 'zod';

import { PAYMENT_STATUSES } from '#configs/constants.js';
import '#configs/zod.config.js';

const { coerce, enum: enumValue, number, object, string } = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);

export const createPaymentSchema = object({
  order: objectIdSchema,
  amount: number().nonnegative(),
  authority: string().trim().min(1).max(200),
  expiresAt: coerce.date(),
});

export const requestPaymentSchema = object({ orderId: objectIdSchema });

export const paymentIdSchema = object({ id: objectIdSchema });

export const paymentAuthoritySchema = object({
  authority: string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i),
});

export const paymentQuerySchema = object({
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['createdAt', 'updatedAt', 'amount', 'expiresAt'])
    .optional()
    .default('createdAt'),
  status: enumValue(Object.values(PAYMENT_STATUSES)).optional(),
});

export const updatePaymentStatusSchema = object({
  status: enumValue(Object.values(PAYMENT_STATUSES)),
  gatewayReferenceId: string().trim().min(1).max(200).optional(),
  paidAt: coerce.date().optional(),
});
