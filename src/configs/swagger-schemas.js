import { z } from 'zod';
import {
  userChangePasswordFormBodyValidation,
  userUpdateLocationInfoSchema,
  userUpdatePersonalInfoSchema,
  userZodSchema,
} from '../entities/users/users.schema.js';

function toOpenApi(zodSchema) {
  const schema = z.toJSONSchema(zodSchema);
  delete schema.$schema; // Remove the $schema property added by zod-to-json-schema
  return schema;
}

export const schemas = {
  // ── User request bodies ──────────────────────────────────────────────────
  CreateUserBody: toOpenApi(userZodSchema),
  UpdateUserPersonalInfoBody: toOpenApi(userUpdatePersonalInfoSchema),
  UpdateUserLocationInfoBody: toOpenApi(userUpdateLocationInfoSchema),
  ChangeUserPasswordBody: toOpenApi(userChangePasswordFormBodyValidation),

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
      data: {
        type: 'object',
        properties: {
          result: { type: 'array', items: {} },
          pagination: {
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
        },
      },
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
