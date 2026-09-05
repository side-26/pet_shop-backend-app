import express from 'express';

import { ROLES } from '#configs/constants.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import { getDashboardMetricsController } from './dashboard.controller.js';

const router = express.Router();

router.get(
  '/dashboard/metrics',
  authenticated,
  roleMiddleware(ROLES.ADMIN),
  /*
    #swagger.tags = ['Dashboard']
    #swagger.summary = 'Get admin dashboard metrics'
    #swagger.description = 'Every created order is recognized as a sale. Revenue and top-selling metrics are derived from immutable order snapshots.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['fromDate'] = { in: 'query', schema: { type: 'string', format: 'date-time' } }
    #swagger.parameters['toDate'] = { in: 'query', schema: { type: 'string', format: 'date-time' } }
    #swagger.parameters['groupBy'] = { in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' } }
    #swagger.parameters['lowStockThreshold'] = { in: 'query', schema: { type: 'integer', minimum: 0, maximum: 1000, default: 5 } }
    #swagger.parameters['topLimit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 } }
    #swagger.parameters['lowStockLimit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 } }
    #swagger.parameters['recentLimit'] = { in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 } }
    #swagger.responses[200] = { description: 'Dashboard metrics', content: { "application/json": { schema: { $ref: '#/components/schemas/DashboardMetricsResponse' } } } }
    #swagger.responses[403] = { description: 'Admin role required' }
  */
  getDashboardMetricsController,
);

export default router;
