import swaggerAutogen from 'swagger-autogen';
import { schemas } from './swagger-schemas.js';

const doc = {
  info: {
    version: '1.0.0',
    title: 'Pet-shop API Documentation',
    description: 'Express API with Swagger',
  },
  servers: [
    {
      url: `http://localhost:8080/api`,
      description: 'local server',
    },
  ],
  components: {
    '@schemas': schemas,
  },
};

const outputFile = './swagger-output.json';
const routes = [
  '../entities/users/users.route.js',
  // '../entities/products/products.route.js', // add when implemented
  // '../entities/orders/orders.route.js',     // add when implemented
];

swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc).then(async () => {
  await import('../server.js');
});
