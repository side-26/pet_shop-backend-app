import { z } from 'zod';

const { string, number, array, object, any } = z;

export const userZodSchema = object({
  firstName: string().optional(),
  lastName: string().optional(),
  phoneNumber: string().min(8, 'حداقل ارقام پسورد 8 کاراکتر میباشد.'),
  password: string().optional(),
  logo: string().optional(), // file path / URL stored as string
  address: string().optional(),
  nationalCode: string().optional(),
  city: string().optional(),
  province: string().optional(),
  age: number().optional(), // new field – number
  orders: array(any()).optional(), // defaults handled by Mongoose
  cart: array(any()).optional(),
});
