jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'request-id'),
  customAlphabet: jest.fn(() => () => '123456789'),
}));

import request from 'supertest';

import app from '../app.js';

describe('OpenAPI and Scalar documentation', () => {
  test('GET /openapi.json returns the generated OpenAPI contract', async () => {
    const response = await request(app).get('/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      openapi: '3.0.0',
      info: {
        title: 'Pet-shop API Documentation',
        version: '1.0.0',
      },
    });
    expect(Object.keys(response.body.paths).length).toBeGreaterThan(0);
    expect(response.body.paths).toEqual(
      expect.objectContaining({
        '/cart/add': expect.any(Object),
        '/orders': expect.any(Object),
        '/products': expect.any(Object),
        '/pets': expect.any(Object),
      }),
    );
    expect(response.body.components.securitySchemes.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  test('groups every API operation by its route collection', async () => {
    const response = await request(app).get('/openapi.json');
    const collectionNames = response.body.tags.map(({ name }) => name);
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

    expect(response.body.servers[0].url).toMatch(/\/api$/);
    expect(collectionNames).toEqual(
      expect.arrayContaining([
        '/cart',
        '/orders',
        '/pets',
        '/products',
        '/users',
        '/wishlist',
      ]),
    );

    Object.entries(response.body.paths).forEach(([apiPath, pathItem]) => {
      const [collection] = apiPath.split('/').filter(Boolean);
      const collectionName = `/${collection}`;

      httpMethods.forEach((method) => {
        if (pathItem[method]) {
          expect(pathItem[method].tags).toEqual([collectionName]);
        }
      });
    });
  });

  test('GET /docs serves Scalar using the machine-readable endpoint', async () => {
    const response = await request(app).get('/docs');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/html/);
    expect(response.text).toContain('/openapi.json');
    expect(response.text.toLowerCase()).toContain('scalar');
    expect(response.headers['content-security-policy']).toContain(
      'https://cdn.jsdelivr.net',
    );
  });

  test('the former Swagger UI route is not served', async () => {
    const response = await request(app).get('/api-docs');

    expect(response.status).toBe(404);
    expect(response.text.toLowerCase()).not.toContain('swagger ui');
  });
});
