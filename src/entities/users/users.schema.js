import { any, z } from 'zod';
import '#configs/zod.config.js';
import { ROLES } from '#configs/constants.js';
const { string, number, array, object, email, boolean, url, enum: zEnum } = z;

export const userZodSchema = object({
  firstName: string().optional(),
  lastName: string().optional(),
  phoneNumber: string().min(11).max(11),
  password: string().min(8),
  avatar: string().optional(), // file path / URL stored as string
  address: string().optional(),
  isEnable: boolean().optional(),
  nationalCode: string().optional(),
  postalCode: string()
    .transform((val) => (val === '' ? undefined : val))
    .optional()
    .refine((val) => val === undefined || /^\d{10}$/.test(val), {
      message: 'کد پستی باید دقیقاً ۱۰ رقم باشد', // This message will be overridden by the error map if we don't return issue.message, but it's optional.
    }),
  city: string().optional(),
  role: zEnum([...Object.values(ROLES)])
    .optional()
    .default(ROLES.CUSTOMER),
  province: string().optional(),
  age: number().nullable().optional(), // new field – number
  orders: array(any()).optional(), // defaults handled by Mongoose
  cart: array(any()).optional(),
});

export const userChangePasswordFormBodyValidation = object({
  password: string().min(8),
  oldPassword: string().min(8),
  repeatPassword: string().min(8),
  userId: string(),
}).refine((data) => data.password === data.repeatPassword, {
  message: 'کلمه عبور و تکرار کلمه عبور مشابه نیستند.',
  path: ['repeatPassword'],
});

export const userRefreshTokenSchema = object({
  refreshToken: string().min(1),
});

export const userUpdatePersonalInfoSchema = z.object({
  userId: string(),
  firstName: string().min(2),
  lastName: string().min(2),
  email: email(),
  nationalCode: string().length(10),
  age: number().int().min(4),
  avatar: url().optional(),
  role: zEnum(Object.values(ROLES)).optional(),
});

export const userUpdateLocationInfoSchema = z.object({
  userId: string(),
  address: string().min(5),
  city: string().min(2),
  province: string().min(2),
  postalCode: string(),
});

export const userSwaggerSchema = () => {};
