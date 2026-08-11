import { z } from 'zod';

import { ORDER_DELIVERY_STATES } from '#configs/constants.js';
import '#configs/zod.config.js';

const { coerce, enum: enumValue, number, object, string, union } = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);

export const createOrderSchema = object({
  paymentTrackingId: string().trim().min(1).max(200),
});

export const orderIdSchema = object({ id: objectIdSchema });

export const orderQuerySchema = object({
  page: coerce.number().int().min(1).optional().default(1),
  limit: coerce.number().int().min(1).max(100).optional().default(10),
  sort: enumValue(['createdAt', 'updatedAt', 'totalPrice', 'deliveryState'])
    .optional()
    .default('createdAt'),
  deliveryState: coerce
    .number()
    .int()
    .refine((value) => ORDER_DELIVERY_STATES.includes(value))
    .optional(),
});

export const updateDeliveryStateSchema = object({
  deliveryState: number()
    .int()
    .refine((value) => ORDER_DELIVERY_STATES.includes(value)),
});

export const updateShippingInfoSchema = object({
  name: string().trim().min(1).max(150).optional(),
  trackingCode: string().trim().min(1).max(150).optional(),
  estimateDeliveryDate: union([coerce.date(), string().trim().length(0)])
    .transform((value) => (value === '' ? null : value))
    .optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'حداقل یک فیلد اطلاعات ارسال باید ارائه شود',
});
