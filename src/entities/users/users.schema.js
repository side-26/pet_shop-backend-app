import { z } from 'zod';
import '#configs/zod.config.js';
const { string, number, array, object, any } = z;

export const userZodSchema = object({
  firstName: string().optional(),
  lastName: string().optional(),
  phoneNumber: string().min(11).max(11),
  password: string().min(8),
  logo: string().optional(), // file path / URL stored as string
  address: string().optional(),
  nationalCode: string().optional(),
  city: string().optional(),
  province: string().optional(),
  age: number().optional(), // new field – number
  orders: array(any()).optional(), // defaults handled by Mongoose
  cart: array(any()).optional(),
});

export const userSwaggerSchema = () => {};
