// import 'module-alias/register';
import express from 'express';
import dotenv from 'dotenv';

import connectDB from '#configs/db.config.js';
import { swaggerUi, specs } from '#configs/swagger.config.js';
import userRoutes from '#entities/users/users.route.js';
import { setAllStatics } from './utils';

// config dotenv
dotenv.config();

const server = express();

// * all middlewares

// express body parser
server.use(express.json());

server.use(express.urlencoded({ extended: false }));

setAllStatics(server);

// swagger route
server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

server.use(userRoutes);

// * end all middlewares
// * DB connect

const DEV_PORT = process.env.PORT || 3000;

connectDB(() => {
  server.listen(DEV_PORT, () => {
    console.log(`🚀 Server running on port ${DEV_PORT}`);
    console.log(`Swagger docs: http://localhost:${DEV_PORT}/api-docs`);
  });
});
