import { z } from 'zod';

import { ROLES, USER_ITEM_TYPES } from '#configs/constants.js';
import '#configs/zod.config.js';

const {
  any,
  string,
  number,
  array,
  object,
  boolean,
  enum: zEnum,
  email,
  coerce,
  literal,
  url,
} = z;

const iranianPhoneNumberSchema = string().regex(/^09\d{9}$/);
const nationalCodeSchema = string().regex(/^\d{10}$/);
const postalCodeSchema = string().regex(/^\d{10}$/);
const mongoObjectIdSchema = string().regex(/^[0-9a-fA-F]{24}$/);

const addressFields = {
  province: string().trim().min(2),
  city: string().trim().min(2),
  detailAddress: string().trim().min(5),
  plate: string().trim().min(1),
  unit: string().trim().nullable().optional(),
  postalCode: postalCodeSchema,
  receiverIsMe: boolean().optional().default(false),
  firstName: string().trim().min(2).optional(),
  lastName: string().trim().min(2).optional(),
  nationalCode: nationalCodeSchema.optional(),
  phoneNumber: iranianPhoneNumberSchema.optional(),
};

const requireOtherReceiver = (data, context) => {
  if (data.receiverIsMe) return;

  ['firstName', 'lastName', 'nationalCode', 'phoneNumber'].forEach((field) => {
    if (!data[field]) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: 'اطلاعات گیرنده الزامی است',
      });
    }
  });
};

export const userAddressSchema =
  object(addressFields).superRefine(requireOtherReceiver);

export const addUserAddressSchema = userAddressSchema;

export const editUserAddressSchema = object({
  ...addressFields,
  receiverIsMe: boolean().optional(),
}).partial();

export const userAddressIdSchema = object({
  addressId: mongoObjectIdSchema,
});

export const addCartItemSchema = object({
  itemId: mongoObjectIdSchema,
  itemType: zEnum([...Object.values(USER_ITEM_TYPES)]),
  quantity: number().int().min(1),
});

export const addWishlistItemSchema = addCartItemSchema.omit({ quantity: true });

export const cartEntryIdSchema = object({ id: mongoObjectIdSchema });

export const wishlistEntryIdSchema = cartEntryIdSchema;

export const userZodSchema = object({
  firstName: string().optional(),
  lastName: string().optional(),
  phoneNumber: iranianPhoneNumberSchema,
  password: string().min(8),
  email: email().optional().or(literal('')),
  avatar: url().optional().or(literal('')),
  isEnable: boolean().optional(),
  nationalCode: nationalCodeSchema.optional().or(literal('')),
  role: zEnum([...Object.values(ROLES)])
    .optional()
    .default(ROLES.CUSTOMER),
  age: number().nullable().optional(), // new field – number
  orders: array(any()).optional(), // defaults handled by Mongoose
  wishlist: array(any()).optional(),
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

export const userUpdatePersonalInfoSchema = object({
  userId: string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
  firstName: string().trim().min(2).optional(),
  lastName: string().trim().min(2).optional(),
  email: email().optional(),
  nationalCode: string()
    .regex(/^\d{10}$/)
    .optional(),
  age: coerce.number().int().min(4).optional(),
  avatar: string().optional(),
});

export const userSwaggerSchema = () => {};
