import express from 'express';
import { logRequest, logError } from '#middlewares/logger.middleware.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { headerMiddleware } from '#middlewares/header.middleware.js';
import {
  rateLimiterMiddleware,
  securityHeadersMiddleware,
} from '#middlewares/security.middleware.js';

import userRoutes from '#entities/users/users.route.js';
import petTypeRoutes from '#entities/petTypes/petTypes.route.js';
import categoryRoutes from '#entities/categories/categories.route.js';
import subCategoryRoutes from '#entities/subCategories/subCategories.route.js';
import breedRoutes from '#entities/breeds/breeds.route.js';
import petRoutes from '#entities/pets/pets.route.js';
import productRoutes from '#entities/products/products.route.js';

import countryRoutes from './integrations/countries/countries.route.js';

const app = express();

// Security and CORS headers must be present even on a throttled response.
app.use(securityHeadersMiddleware);
app.use(headerMiddleware);
app.use(logRequest);
app.use('/api', rateLimiterMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', userRoutes);
app.use('/api', petTypeRoutes);
app.use('/api', categoryRoutes);
app.use('/api', subCategoryRoutes);
app.use('/api', countryRoutes);
app.use('/api', breedRoutes);
app.use('/api', petRoutes);
app.use('/api', productRoutes);

app.use(logError);
app.use(errorHandler);

export default app;
