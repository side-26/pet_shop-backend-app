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
  BreedPropertyDefinitionsBody: {
    type: 'object',
    required: ['id', 'propertyDefinitions'],
    properties: {
      id: { type: 'string' },
      propertyDefinitions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['label', 'value'],
          properties: { label: { type: 'string' }, value: {} },
        },
      },
    },
  },
  PetTypePropertyDefinitionsBody: {
    type: 'object',
    required: ['id', 'propertyDefinitions'],
    properties: {
      id: { type: 'string' },
      propertyDefinitions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['label', 'value'],
          properties: {
            label: { type: 'string' },
            value: {},
          },
        },
      },
    },
  },
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
      description: { description: 'Rich-text JSON value.' },
      isEnabled: { type: 'boolean' },
      propertyDefinitions: { type: 'array', items: { type: 'object' } },
    },
  },
  PetTypeUpdateMultipartBody: {
    type: 'object',
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description:
          'Optional replacement image smaller than 1 MB; regenerates thumbnail',
      },
      title: { type: 'string', minLength: 2, maxLength: 20 },
      description: { description: 'Rich-text JSON value.' },
      isEnabled: { type: 'boolean' },
      propertyDefinitions: { type: 'array', items: { type: 'object' } },
    },
  },
  BreedMultipartBody: {
    type: 'object',
    required: [
      'mainImage',
      'title',
      'petType',
      'country',
      'ageAverage',
      'size',
      'activityLevel',
      'enable',
    ],
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description:
          'Required image smaller than 1 MB; regenerates thumbnailImage',
      },
      title: { type: 'string', minLength: 2, maxLength: 100 },
      petType: { type: 'string' },
      country: {
        type: 'string',
        nullable: true,
        minLength: 2,
        maxLength: 100,
      },
      ageAverage: { type: 'string', minLength: 1, maxLength: 50 },
      size: { type: 'integer', enum: [0, 1, 2, 3, 4] },
      activityLevel: {
        type: 'integer',
        nullable: true,
        enum: [0, 1, 2, 3, 4],
      },
      enable: { type: 'boolean' },
      propertyDefinitions: { type: 'array', items: { type: 'object' } },
    },
  },
  BreedUpdateMultipartBody: {
    type: 'object',
    required: [
      'title',
      'petType',
      'country',
      'ageAverage',
      'size',
      'activityLevel',
      'enable',
    ],
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description:
          'Optional replacement image smaller than 1 MB; regenerates thumbnailImage',
      },
      title: { type: 'string', minLength: 2, maxLength: 100 },
      petType: { type: 'string' },
      country: {
        type: 'string',
        nullable: true,
        minLength: 2,
        maxLength: 100,
      },
      ageAverage: { type: 'string', minLength: 1, maxLength: 50 },
      size: { type: 'integer', enum: [0, 1, 2, 3, 4] },
      activityLevel: {
        type: 'integer',
        nullable: true,
        enum: [0, 1, 2, 3, 4],
      },
      enable: { type: 'boolean' },
      propertyDefinitions: { type: 'array', items: { type: 'object' } },
    },
  },
  CategoryMultipartBody: {
    type: 'object',
    required: ['mainImage', 'title', 'petType'],
    properties: {
      mainImage: { type: 'string', format: 'binary' },
      title: { type: 'string', minLength: 2, maxLength: 50 },
      petType: { type: 'string' },
      isEnable: { type: 'boolean' },
    },
  },
  CategoryUpdateMultipartBody: {
    type: 'object',
    required: ['title', 'petType'],
    properties: {
      mainImage: { type: 'string', format: 'binary' },
      title: { type: 'string', minLength: 2, maxLength: 50 },
      petType: { type: 'string' },
      isEnable: { type: 'boolean' },
    },
  },
  MainImageCreateBody: {
    type: 'object',
    required: ['mainImage'],
    properties: {
      mainImage: { type: 'string', format: 'binary' },
      images: {
        type: 'array',
        maxItems: 10,
        items: { type: 'string', format: 'binary' },
      },
      title: { type: 'string' },
      summary: { type: 'string' },
      description: { description: 'Rich-text JSON value.' },
      category: { type: 'string' },
      subCategory: { type: 'string', nullable: true },
      quantity: { type: 'number' },
    },
  },
  PetMainImageCreateBody: {
    type: 'object',
    required: ['mainImage'],
    properties: {
      mainImage: { type: 'string', format: 'binary' },
      title: { type: 'string' },
      images: {
        type: 'array',
        maxItems: 5,
        items: { type: 'string', format: 'binary' },
      },
      summary: { type: 'string' },
      description: { description: 'Rich-text JSON value.' },
      petType: { type: 'string' },
      breed: { type: 'string' },
      quantity: { type: 'number' },
      price: { type: 'number' },
      discountPercentage: { type: 'number' },
      inEnable: { type: 'boolean' },
      slug: { type: 'string' },
    },
  },
  ProductImagesUpdateBody: {
    type: 'object',
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description:
          'Optional replacement image; regenerates mainImageThumbnail',
      },
      images: {
        type: 'array',
        maxItems: 10,
        items: { type: 'string', format: 'binary' },
      },
    },
  },
  ProductPriceUpdateBody: {
    type: 'object',
    properties: {
      price: { type: 'number', minimum: 0 },
      discountPercentage: { type: 'number', minimum: 0, maximum: 100 },
    },
  },
  ProductBaseInfoUpdateBody: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 2, maxLength: 150 },
      summary: { type: 'string' },
      description: { description: 'Rich-text JSON value.' },
      category: { type: 'string' },
      subCategory: { type: 'string', nullable: true },
      quantity: { type: 'integer', minimum: 0 },
    },
  },
  PetImagesUpdateBody: {
    type: 'object',
    required: ['mainImage'],
    properties: {
      mainImage: {
        type: 'string',
        format: 'binary',
        description:
          'Required replacement image; regenerates mainImageThumbnail',
      },
      images: {
        type: 'array',
        maxItems: 5,
        items: { type: 'string', format: 'binary' },
      },
    },
  },
  PetPriceUpdateBody: {
    type: 'object',
    properties: {
      price: { type: 'number', minimum: 0 },
      discountPercentage: { type: 'number', minimum: 0, maximum: 100 },
    },
  },
  PetBaseInfoUpdateBody: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 2, maxLength: 150 },
      summary: { type: 'string' },
      description: { description: 'Rich-text JSON value.' },
      petType: { type: 'string' },
      breed: { type: 'string' },
      quantity: { type: 'integer', minimum: 0 },
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
  CurrentUserResponse: {
    type: 'object',
    required: ['isSuccess', 'data'],
    properties: {
      isSuccess: { type: 'boolean', example: true },
      data: {
        type: 'object',
        required: [
          'userId',
          'firstName',
          'lastName',
          'phoneNumber',
          'role',
          'avatar',
        ],
        properties: {
          userId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string', pattern: '^09\\d{9}$' },
          role: { type: 'string', enum: Object.values(ROLES) },
          avatar: { type: 'string' },
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
  Country: {
    type: 'object',
    required: ['title', 'titleFa', 'logo'],
    properties: {
      title: { type: 'string', example: 'Iran' },
      titleFa: { type: 'string', example: 'ایران' },
      logo: {
        type: 'string',
        format: 'uri',
        example:
          'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
      },
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
  DashboardMetricsResponse: {
    type: 'object',
    required: ['isSuccess', 'data'],
    properties: {
      isSuccess: { type: 'boolean', example: true },
      data: {
        type: 'object',
        required: [
          'period',
          'summary',
          'ordersByDeliveryState',
          'salesTrend',
          'topSellingItems',
          'lowStockItems',
          'recentOrders',
        ],
        properties: {
          period: {
            type: 'object',
            properties: {
              fromDate: { type: 'string', format: 'date-time' },
              toDate: { type: 'string', format: 'date-time' },
              groupBy: { type: 'string', enum: ['day', 'week', 'month'] },
              timeZone: { type: 'string', example: 'Asia/Tehran' },
            },
          },
          summary: {
            type: 'object',
            properties: {
              orders: { type: 'integer' },
              grossRevenue: { type: 'number' },
              discountTotal: { type: 'number' },
              shippingRevenue: { type: 'number' },
              netRevenue: { type: 'number' },
              unitsSold: { type: 'integer' },
              averageOrderValue: { type: 'number' },
              customers: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  newInPeriod: { type: 'integer' },
                },
              },
              catalog: {
                type: 'object',
                properties: {
                  products: { $ref: '#/components/schemas/CatalogMetrics' },
                  pets: { $ref: '#/components/schemas/CatalogMetrics' },
                },
              },
            },
          },
          ordersByDeliveryState: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                deliveryState: { type: 'integer', enum: [0, 1, 2, 3] },
                count: { type: 'integer' },
              },
            },
          },
          salesTrend: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                orders: { type: 'integer' },
                revenue: { type: 'number' },
                unitsSold: { type: 'integer' },
              },
            },
          },
          topSellingItems: {
            type: 'array',
            items: { $ref: '#/components/schemas/DashboardCatalogItem' },
          },
          lowStockItems: {
            type: 'array',
            items: { $ref: '#/components/schemas/DashboardCatalogItem' },
          },
          recentOrders: {
            type: 'array',
            items: { $ref: '#/components/schemas/DashboardRecentOrder' },
          },
        },
      },
    },
  },
  CatalogMetrics: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      enabled: { type: 'integer' },
      lowStock: { type: 'integer' },
    },
  },
  DashboardCatalogItem: {
    type: 'object',
    properties: {
      itemId: { type: 'string' },
      itemType: { type: 'string', enum: ['product', 'pet'] },
      title: { type: 'string' },
      mainImage: { type: 'string', format: 'uri' },
      quantity: { type: 'integer' },
      unitsSold: { type: 'integer' },
      revenue: { type: 'number' },
    },
  },
  DashboardRecentOrder: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      orderNumber: { type: 'string', pattern: '^\\d{9}$' },
      deliveryState: { type: 'integer', enum: [0, 1, 2, 3] },
      totalPrice: { type: 'number' },
      discountPrice: { type: 'number' },
      shippingPrice: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      user: {
        type: 'object',
        nullable: true,
        properties: {
          _id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string' },
        },
      },
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
  CountriesResponse: {
    type: 'object',
    required: ['isSuccess', 'data', 'totalRecords'],
    properties: {
      isSuccess: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/Country' },
      },
      totalRecords: { type: 'integer', example: 249 },
    },
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      isSuccess: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          result: { type: 'array', items: {} },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
        required: ['result', 'pagination'],
      },
    },
    required: ['isSuccess', 'data'],
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
