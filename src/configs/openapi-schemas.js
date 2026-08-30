import { z } from 'zod';

import {
  addCartItemSchema,
  addUserAddressSchema,
  editUserAddressSchema,
  userChangePasswordFormBodyValidation,
  userRegisterSchema,
  userSendOtpSchema,
  userUpdatePersonalInfoSchema,
  userResetPasswordSchema,
  userZodSchema,
} from '../entities/users/users.schema.js';
import {
  createOrderSchema,
  updateDeliveryStateSchema,
} from '../entities/orders/orders.schema.js';
import { ROLES } from './constants.js';

const { toJSONSchema } = z;

function toOpenApi(zodSchema) {
  const schema = toJSONSchema(zodSchema);
  delete schema.$schema; // Remove the $schema property added by zod-to-json-schema
  return schema;
}

export const schemas = {
  PetTypeMultipartBody: {
    type: 'object',
    required: ['mainImage'],
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description: 'Required image smaller than 1 MB; regenerates thumbnail',
      },
      title: { type: 'string', minLength: 2, maxLength: 20 },
      description: { type: 'string', maxLength: 150 },
      isEnabled: { type: 'boolean' },
      propertyDefinitions: { type: 'array', items: { type: 'object' } },
    },
  },
  MainImageCreateBody: {
    type: 'object',
    required: ['mainImage'],
    properties: {
      mainImage: { type: 'string', format: 'binary' },
      title: { type: 'string' },
      images: { type: 'array', items: { type: 'string', format: 'uri' } },
      summary: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      subCategory: { type: 'string', nullable: true },
      petType: { type: 'string' },
      breed: { type: 'string' },
      quantity: { type: 'number' },
      price: { type: 'number' },
      discountPercentage: { type: 'number' },
      enable: { type: 'boolean' },
      slug: { type: 'string' },
    },
  },
  MainImageUpdateBody: {
    type: 'object',
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description:
          'Optional replacement image; regenerates mainImageThumbnail',
      },
      title: { type: 'string' },
      images: { type: 'array', items: { type: 'string', format: 'uri' } },
      summary: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      subCategory: { type: 'string', nullable: true },
      petType: { type: 'string' },
      breed: { type: 'string' },
      quantity: { type: 'number' },
      price: { type: 'number' },
      discountPercentage: { type: 'number' },
      enable: { type: 'boolean' },
      slug: { type: 'string' },
    },
  },
  // ── User request bodies ──────────────────────────────────────────────────
  CreateUserBody: toOpenApi(userZodSchema),
  RegisterUserBody: toOpenApi(userRegisterSchema),
  SendUserOtpBody: toOpenApi(userSendOtpSchema),
  VerifyUserOtpBody: {
    type: 'object',
    additionalProperties: false,
    required: ['phoneNumber', 'otp-code'],
    properties: {
      phoneNumber: { type: 'string', pattern: '^09\\d{9}$' },
      'otp-code': { type: 'string', pattern: '^\\d{6}$' },
      'reset-password': {
        type: 'boolean',
        default: false,
      },
    },
  },
  VerifyUserOtpSuccessResponse: {
    oneOf: [
      {
        type: 'object',
        required: ['isSuccess', 'data'],
        properties: {
          isSuccess: { type: 'boolean', example: true },
          data: {
            type: 'object',
            required: [
              'accessToken',
              'refreshToken',
              'sessionExp',
              'userId',
              'role',
              'accessExp',
            ],
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              sessionExp: { type: 'integer', format: 'int64' },
              userId: { type: 'string' },
              role: { type: 'string' },
              accessExp: { type: 'integer', format: 'int64' },
            },
          },
        },
      },
      {
        type: 'object',
        required: ['isSuccess', 'message', 'data'],
        properties: {
          isSuccess: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'کد تأیید شما معتبر است',
          },
          data: {
            type: 'object',
            required: ['temporaryToken', 'expiry'],
            properties: {
              temporaryToken: { type: 'string' },
              expiry: {
                type: 'integer',
                description: 'Temporary-token lifetime in seconds',
                example: 300,
              },
            },
          },
        },
      },
    ],
  },
  ResetUserPasswordBody: toOpenApi(userResetPasswordSchema),
  ResetUserPasswordSuccessResponse: {
    type: 'object',
    required: ['isSuccess', 'message', 'data'],
    properties: {
      isSuccess: { type: 'boolean', example: true },
      message: {
        type: 'string',
        example: 'کلمه عبور شما با موفقیت بازنشانی شد',
      },
      data: { type: 'boolean', example: true },
    },
  },
  SendUserOtpSuccessResponse: {
    type: 'object',
    required: ['isSuccess', 'message', 'data'],
    properties: {
      isSuccess: { type: 'boolean', example: true },
      message: {
        type: 'string',
        description:
          'Confirms a new OTP or warns that the active OTP must expire before resending',
        example: 'کد تأیید با موفقیت ارسال شد',
      },
      data: {
        type: 'object',
        required: ['remainingSeconds'],
        properties: {
          remainingSeconds: {
            type: 'integer',
            minimum: 0,
            maximum: 120,
            example: 120,
          },
        },
      },
    },
  },
  LoginUserBody: {
    type: 'object',
    additionalProperties: false,
    required: ['phoneNumber', 'password'],
    properties: {
      phoneNumber: { type: 'string', pattern: '^09\\d{9}$' },
      password: { type: 'string', minLength: 8 },
    },
  },
  LoginSuccessResponse: {
    type: 'object',
    required: ['isSuccess', 'message', 'data'],
    properties: {
      isSuccess: { type: 'boolean', example: true },
      message: { type: 'string' },
      data: {
        type: 'object',
        required: [
          'accessToken',
          'refreshToken',
          'sessionExp',
          'userId',
          'role',
          'accessExp',
        ],
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          sessionExp: {
            type: 'integer',
            format: 'int64',
            description:
              'Session expiration as a Unix timestamp in milliseconds',
          },
          userId: { type: 'string' },
          role: { type: 'string', enum: Object.values(ROLES) },
          accessExp: {
            type: 'integer',
            format: 'int64',
            description:
              'Access-token expiration as a Unix timestamp in milliseconds',
          },
        },
      },
    },
  },
  UpdateUserPersonalInfoBody: toOpenApi(userUpdatePersonalInfoSchema),
  AddUserAddressBody: toOpenApi(addUserAddressSchema),
  EditUserAddressBody: toOpenApi(editUserAddressSchema),
  ChangeUserPasswordBody: toOpenApi(userChangePasswordFormBodyValidation),
  AddCartItemBody: toOpenApi(addCartItemSchema),
  CreateOrderBody: toOpenApi(createOrderSchema),
  UpdateOrderDeliveryStateBody: toOpenApi(updateDeliveryStateSchema),
  UpdateOrderShippingInfoBody: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 150 },
      trackingCode: { type: 'string', minLength: 1, maxLength: 150 },
      estimateDeliveryDate: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
    },
  },

  Pagination: {
    type: 'object',
    properties: {
      currentPage: { type: 'integer' },
      totalPages: { type: 'integer' },
      totalItems: { type: 'integer' },
      itemsPerPage: { type: 'integer' },
      hasNextPage: { type: 'boolean' },
      hasPrevPage: { type: 'boolean' },
      nextPage: { type: 'integer', nullable: true },
      prevPage: { type: 'integer', nullable: true },
    },
  },
  Cart: {
    type: 'object',
    properties: {
      totalPrice: { type: 'number' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            item: { type: 'object' },
            itemType: { type: 'string', enum: ['product', 'pet'] },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
      discountPrice: { type: 'number' },
      userAddress: { type: 'string', nullable: true },
      deliveringDateToShipping: {
        type: 'string',
        format: 'date-time',
        nullable: true,
      },
      shippingPrice: { type: 'number' },
      shippingInfo: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          trackingCode: { type: 'string' },
          estimateDeliveryDate: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },
      paymentType: { type: 'integer', enum: [1, 2] },
      instalmentCompany: { type: 'string', nullable: true },
    },
  },
  Order: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      user: { type: 'string' },
      trackingCode: { type: 'string', pattern: '^\\d{9}$' },
      orderNumber: { type: 'string', pattern: '^\\d{9}$' },
      deliveryState: { type: 'integer', enum: [0, 1, 2, 3] },
      paymentTrackingId: { type: 'string' },
      totalPrice: { type: 'number' },
      discountPrice: { type: 'number' },
      shippingPrice: { type: 'number' },
      paymentType: { type: 'integer', enum: [1, 2] },
      items: { type: 'array', items: { type: 'object' } },
      userAddress: { type: 'object' },
      shippingInfo: { type: 'object' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // ── Generic responses ────────────────────────────────────────────────────
  SuccessResponse: {
    type: 'object',
    properties: {
      isSuccess: { type: 'boolean', example: true },
      message: { type: 'string' },
      data: {},
    },
    required: ['isSuccess'],
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      isSuccess: { type: 'boolean', example: true },
      data: { type: 'array', items: {} },
      pagination: { $ref: '#/components/schemas/Pagination' },
    },
    required: ['isSuccess'],
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      isSuccess: { type: 'boolean', example: false },
      message: { type: 'string' },
      data: {},
    },
    required: ['isSuccess'],
  },
};
