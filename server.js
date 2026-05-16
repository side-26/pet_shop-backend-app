const express = require('express');
// const cookieParser = require('cookie-parser');

const connectDB = require('./src/configs/db.config');
const { swaggerUi, specs } = require('./src/configs/swagger.config');
const userRoutes = require('./src/entities/users/users.route');
// config dotenv
require('dotenv').config();

const server = express();

// * all middlewares

// express-bodyParser
server.use(express.urlencoded({ extended: false }));
// server.use(cookieParser);

// swagger-route
server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

server.use(userRoutes);

// * end all middlewares
// *DB connect
const DEV_PORT = process.env.PORT || 3000;
connectDB(() => {
  server.listen(DEV_PORT, () => {
    console.log(`🚀 Server running on port ${DEV_PORT}`);
    console.log(`Swagger docs: http://localhost:${DEV_PORT}/api-docs`);
  });
});
