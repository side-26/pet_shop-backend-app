import express from 'express';
import { logRequest, logError } from '#middlewares/logger.middleware.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { headerMiddleware } from '#middlewares/header.middleware.js';
import userRoutes from '#entities/users/users.route.js';

const app = express();

// ✅ CORRECT ORDER - Important!
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 1. Header middleware
app.use(headerMiddleware);

// 2. Logging middleware (before routes)
app.use(logRequest);

// 3. Routes
app.use('/api', userRoutes);

// 4. Error handling (after routes)
app.use(logError); // Just marks error as logged
app.use(errorHandler); // Sends response

export default app;
