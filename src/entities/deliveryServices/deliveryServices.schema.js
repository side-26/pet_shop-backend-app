import { z } from 'zod';

import '#configs/zod.config.js';

const { boolean, number, object, preprocess, string, tuple } = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);
const longitudeSchema = number().min(-180).max(180);
const latitudeSchema = number().min(-90).max(90);

export const deliveryServiceCoordinatesSchema = tuple([
  longitudeSchema,
  latitudeSchema,
]);

const deliveryServiceFields = {
  title: string().trim().min(2).max(100),
  title_fa: string().trim().min(2).max(100),
  originCoordinates: deliveryServiceCoordinatesSchema,
  basePrice: number().int().min(0).default(0),
  pricePerKilometer: number().int().positive(),
  isEnable: booleanSchema.optional().default(true),
};

export const createDeliveryServiceZodSchema = object(deliveryServiceFields);
export const updateDeliveryServiceZodSchema = object(deliveryServiceFields);
export const deliveryServiceIdZodSchema = object({ id: objectIdSchema });
export const deliveryServiceQueryZodSchema = object({
  includeDisabled: string()
    .optional()
    .transform((value) => value === 'true'),
});
