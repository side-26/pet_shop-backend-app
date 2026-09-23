import { readFileSync } from 'fs';

import { RATE_LIMIT, STATUES } from './constants.js';

const openapiDocument = JSON.parse(
  readFileSync('src/configs/openapi.json', 'utf8'),
);
const userRouterCollections = new Set(['users', 'cart', 'wishlist']);
const httpMethods = ['get', 'post', 'put', 'patch', 'delete'];

const userRouterOperations = Object.entries(openapiDocument.paths).flatMap(
  ([apiPath, pathItem]) => {
    const [collection] = apiPath.split('/').filter(Boolean);
    if (!userRouterCollections.has(collection)) return [];

    return httpMethods.flatMap((method) => {
      const operation = pathItem[method];

      return operation ? [{ apiPath, method, operation }] : [];
    });
  },
);

const getOperation = (apiPath, method) =>
  userRouterOperations.find(
    (operation) => operation.apiPath === apiPath && operation.method === method,
  ).operation;

describe('users-router OpenAPI rate-limit contracts', () => {
  test('documents a 429 response for every users-router operation', () => {
    expect(userRouterOperations).toHaveLength(28);

    userRouterOperations.forEach(({ operation }) => {
      expect(
        operation.responses[String(STATUES.TOO_MANY_REQUESTS)],
      ).toBeDefined();
    });
  });

  test('documents standard, paginated, login, and dynamic-route policies', () => {
    const standardResponse = getOperation('/users/{id}', 'get').responses[
      String(STATUES.TOO_MANY_REQUESTS)
    ];
    const paginatedResponse = getOperation('/users/paginate', 'get').responses[
      String(STATUES.TOO_MANY_REQUESTS)
    ];
    const loginResponse = getOperation('/users/login', 'post').responses[
      String(STATUES.TOO_MANY_REQUESTS)
    ];

    expect(standardResponse.headers['RateLimit-Limit'].example).toBe(
      RATE_LIMIT.USER_MAX_REQUESTS,
    );
    expect(standardResponse.headers['Retry-After'].example).toBe(
      RATE_LIMIT.USER_WINDOW_SECONDS,
    );
    expect(paginatedResponse.headers['RateLimit-Limit'].example).toBe(
      RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS,
    );
    expect(paginatedResponse.headers['Retry-After'].example).toBe(
      RATE_LIMIT.USER_PAGINATE_WINDOW_SECONDS,
    );
    expect(loginResponse.headers['RateLimit-Limit'].example).toBe(
      RATE_LIMIT.LOGIN_MAX_REQUESTS,
    );
    expect(loginResponse.headers['Retry-After'].example).toBe(
      RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    );
  });

  test('documents the admin-only user deletion contract', () => {
    const operation = getOperation('/users/{id}', 'delete');

    expect(operation.security).toEqual([{ bearerAuth: [] }]);
    expect(operation.responses).toEqual(
      expect.objectContaining({
        [STATUES.SUCCESS]: expect.any(Object),
        [STATUES.UN_AUTHORIZED]: expect.any(Object),
        [STATUES.NO_ACCESS]: expect.any(Object),
        [STATUES.NOT_FOUND]: expect.any(Object),
        [STATUES.METHOD_NOT_ALLOWED]: expect.any(Object),
        [STATUES.BAD_FORM_VALIDATION]: expect.any(Object),
        [STATUES.TOO_MANY_REQUESTS]: expect.any(Object),
      }),
    );
  });
});
