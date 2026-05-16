import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pet-shop API Documentation',
      version: '1.0.0',
      description: 'Express API with Swagger',
    },
    servers: [
      {
        url: `http://localhost:8080`,
        description: 'Dev server',
      },
    ],
  },
  apis: ['./src/entities/**/*.js'], // مسیر فایل‌های route شما
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
