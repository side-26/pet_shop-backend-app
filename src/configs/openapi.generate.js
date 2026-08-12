import swaggerAutogen from 'swagger-autogen';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { schemas } from './openapi-schemas.js';

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
].map((route) => path.join(configDirectory, route));

await swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc);

const openapiDocument = JSON.parse(readFileSync(outputFile, 'utf8'));
const taggedOpenapiDocument = addCollectionTags(openapiDocument);

writeFileSync(
  outputFile,
  `${JSON.stringify(taggedOpenapiDocument, null, 2)}\n`,
);
console.log('سند OpenAPI با موفقیت تولید شد');
