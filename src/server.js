// import 'module-alias/register';
import express from 'express';
import dotenv from 'dotenv';

// import swaggerUi from 'swagger-ui-express';

import connectDB from '#configs/db.config.js';
import userRoutes from '#entities/users/users.route.js';
import { headerMiddleware } from '#middlewares/header.middleware.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { setAllStatics } from './utils/index.js';

// config dotenv
dotenv.config();

const server = express();

server.disable('x-powered-by');

// * all middlewares

// express body parser
server.use(express.json());

server.use(express.urlencoded({ extended: false }));

// * header middleware
server.use(headerMiddleware);

setAllStatics(server);

// server.use('/api-docs', ...swaggerUi.serve, swaggerUi.setup(swaggerDocument));

server.use('/api', userRoutes);

server.use(errorHandler);

// * handling Errors

// * end all middlewares
// * DB connect

const DEV_PORT = process.env.PORT || 3000;

connectDB(() => {
  server.listen(DEV_PORT, () => {
    console.log(`🚀 Server running on port ${DEV_PORT}`);
    console.log(`Swagger docs: http://localhost:${DEV_PORT}/api-docs`);
  });
});
