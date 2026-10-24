import { z } from 'zod';

import '#configs/zod.config.js';

const { array, object, string } = z;

const iranianPhoneNumberSchema = string().regex(/^09\d{9}$/);

export const simpleSmsBodySchema = object({
  from: string().min(1),
  to: iranianPhoneNumberSchema,
  text: string().min(1),
}).strict();

export const petPurchaseSmsSchema = object({
  name: string().min(1),
  to: iranianPhoneNumberSchema,
  petNames: array(string().min(1)).min(1),
}).strict();
