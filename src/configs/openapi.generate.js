import swaggerAutogen from 'swagger-autogen';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { schemas } from './openapi-schemas.js';
import { RATE_LIMIT } from './constants.js';
import { API_ROUTE_METHODS } from './routeMethods.config.js';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const httpMethods = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
];

const addCollectionTags = (openapiDocument) => {
  const collectionNames = new Set();

  Object.entries(openapiDocument.paths ?? {}).forEach(([apiPath, pathItem]) => {
    const [collection] = apiPath.split('/').filter(Boolean);

    if (!collection) return;

    const collectionName = `/${collection}`;
    collectionNames.add(collectionName);

    httpMethods.forEach((method) => {
      if (pathItem[method]) pathItem[method].tags = [collectionName];
    });
  });

  openapiDocument.tags = [...collectionNames].sort().map((name) => ({
    name,
    description: `Endpoints under /api${name}`,
  }));

  return openapiDocument;
};

const routeSegmentsMatch = (configuredPath, openapiPath) => {
  const configuredSegments = configuredPath.split('/').filter(Boolean);
  const openapiSegments = openapiPath.split('/').filter(Boolean);

  return (
    configuredSegments.length === openapiSegments.length &&
    configuredSegments.every(
      (segment, index) =>
        (segment.startsWith(':') &&
          /^\{[^}]+\}$/.test(openapiSegments[index])) ||
        segment === openapiSegments[index],
    )
  );
};

const addMethodNotAllowedResponses = (openapiDocument) => {
  Object.entries(openapiDocument.paths ?? {}).forEach(([apiPath, pathItem]) => {
    const configuredRoute = API_ROUTE_METHODS.find(({ path }) =>
      routeSegmentsMatch(path, apiPath),
    );

    if (!configuredRoute) return;

    const allowHeader = configuredRoute.methods.join(', ');
    httpMethods.forEach((method) => {
      if (!pathItem[method]) return;

      pathItem[method].responses ??= {};
      pathItem[method].responses['405'] = {
        description: 'Method not allowed',
        headers: {
          Allow: {
            schema: { type: 'string' },
            example: allowHeader,
          },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      };
    });
  });

  return openapiDocument;
};

const userRouterCollections = new Set(['users', 'cart', 'wishlist']);

const getUserRouteRateLimitPolicy = (apiPath) => {
  if (apiPath === '/users/login') {
    return {
      limit: RATE_LIMIT.LOGIN_MAX_REQUESTS,
      window: RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    };
  }

  if (apiPath === '/users/paginate') {
    return {
      limit: RATE_LIMIT.USER_PAGINATE_MAX_REQUESTS,
      window: RATE_LIMIT.USER_PAGINATE_WINDOW_SECONDS,
    };
  }

  return {
    limit: RATE_LIMIT.USER_MAX_REQUESTS,
    window: RATE_LIMIT.USER_WINDOW_SECONDS,
  };
};

const createRateLimitResponse = ({ limit, window }) => ({
  description: `More than ${limit} requests were sent from the same IP within ${window} seconds`,
  headers: {
    'RateLimit-Limit': {
      schema: { type: 'integer' },
      example: limit,
    },
    'RateLimit-Remaining': {
      schema: { type: 'integer' },
      example: 0,
    },
    'Retry-After': {
      schema: { type: 'integer' },
      description: 'Seconds until the current rate-limit window expires',
      example: window,
    },
  },
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
});

const addUserRouteRateLimitResponses = (openapiDocument) => {
  API_ROUTE_METHODS.forEach(({ path: configuredPath, methods }) => {
    const [collection] = configuredPath.split('/').filter(Boolean);
    if (!userRouterCollections.has(collection)) return;

    const pathEntry = Object.entries(openapiDocument.paths ?? {}).find(
      ([openapiPath]) => routeSegmentsMatch(configuredPath, openapiPath),
    );
    if (!pathEntry) return;

    const [openapiPath, pathItem] = pathEntry;
    const rateLimitResponse = createRateLimitResponse(
      getUserRouteRateLimitPolicy(openapiPath),
    );

    methods.forEach((method) => {
      const operation = pathItem[method.toLowerCase()];
      if (!operation) return;

      operation.responses ??= {};
      operation.responses['429'] = rateLimitResponse;
    });
  });

  return openapiDocument;
};

const doc = {
  info: {
    version: '1.0.0',
    title: 'Pet-shop API Documentation',
    description: 'Pet-shop Express API reference',
  },
  servers: [
    {
      url: `http://localhost:8080/api`,
      description: 'local server',
    },
  ],
  components: {
    '@schemas': schemas,
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const outputFile = path.join(configDirectory, 'openapi.json');
const routes = [
  '../entities/users/users.route.js',
  '../entities/petTypes/petTypes.route.js',
  '../entities/categories/categories.route.js',
  '../entities/subCategories/subCategories.route.js',
  '../entities/breeds/breeds.route.js',
  '../entities/pets/pets.route.js',
  '../entities/products/products.route.js',
  '../entities/orders/orders.route.js',
  '../integrations/countries/countries.route.js',
  '../integrations/locations/locations.route.js',
  '../integrations/reverseGeocoding/reverseGeocoding.route.js',
  '../integrations/otpCode/otpCode.route.js',
].map((route) => path.join(configDirectory, route));

await swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc);

const openapiDocument = JSON.parse(readFileSync(outputFile, 'utf8'));
const taggedOpenapiDocument = addCollectionTags(
  addMethodNotAllowedResponses(addUserRouteRateLimitResponses(openapiDocument)),
);

writeFileSync(
  outputFile,
  `${JSON.stringify(taggedOpenapiDocument, null, 2)}\n`,
);
console.log('سند OpenAPI با موفقیت تولید شد');
