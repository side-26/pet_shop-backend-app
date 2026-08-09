import express from 'express';
import { logRequest, logError } from '#middlewares/logger.middleware.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { headerMiddleware } from '#middlewares/header.middleware.js';
import userRoutes from '#entities/users/users.route.js';
import petRoutes from '#entities/pet/pet.route.js';
import petTypeRoutes from '#entities/petTypes/petTypes.route.js';
import categoryRoutes from '#entities/categories/categories.route.js';
import landingRoutes from '#entities/landing/landing.route.js';
import orderRoutes from '#entities/orders/orders.route.js';
import productRoutes from '#entities/products/products.route.js';
import subCategoryRoutes from '#entities/subCategories/subCategories.route.js';
import countryRoutes from './integrations/countries/countries.route.js';

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
app.use('/api', petTypeRoutes);
app.use('/api', petRoutes);
app.use('/api', categoryRoutes);
app.use('/api', subCategoryRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', landingRoutes);
app.use('/api', countryRoutes);

// 4. Error handling (after routes)
app.use(logError); // Just marks error as logged
app.use(errorHandler); // Sends response

export default app;
