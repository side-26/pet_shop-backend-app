import { z } from 'zod';

import '#configs/zod.config.js';

import { DELIVERY_WEEK_DAYS } from './deliveryServices.constants.js';

const { array, boolean, number, object, preprocess, string, tuple } = z;

const objectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);
const booleanSchema = preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  boolean(),
);
const longitudeSchema = number().min(-180).max(180);
const latitudeSchema = number().min(-90).max(90);
const timeSchema = string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const getMinutesFromMidnight = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};
const timeRangeSchema = object({
  startsAt: timeSchema,
  endsAt: timeSchema,
}).refine(
  ({ startsAt, endsAt }) =>
    getMinutesFromMidnight(endsAt) - getMinutesFromMidnight(startsAt) === 120,
  { message: 'بازه زمانی ارسال باید دقیقاً دو ساعت باشد' },
);
const scheduleFields = Object.fromEntries(
  DELIVERY_WEEK_DAYS.map((day) => [day, array(timeRangeSchema)]),
);

export const deliveryServiceCoordinatesSchema = tuple([
  longitudeSchema,
  latitudeSchema,
]);

const deliveryServiceFields = {
  title: string().trim().min(2).max(100),
  title_fa: string().trim().min(2).max(100),
  logo: string().trim().url().max(2048),
  originCoordinates: deliveryServiceCoordinatesSchema,
  availability: object(scheduleFields),
  basePrice: number().int().min(0).default(0),
  packingPrice: number().int().min(0).default(0),
  cityLeadDays: number().int().min(0),
  outsideCityLeadDays: number().int().min(0),
  pricePerKilometerInCity: number().int().positive(),
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
export const deliveryServiceAvailableQueryZodSchema = object({
  lat: preprocess((value) => Number(value), latitudeSchema),
  lng: preprocess((value) => Number(value), longitudeSchema),
});
