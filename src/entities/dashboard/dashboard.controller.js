import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { dashboardQuerySchema } from './dashboard.schema.js';
import { DashboardService } from './dashboard.service.js';

export const getDashboardMetricsController = async (req, res, next) => {
  try {
    const query = returnFormValidation(dashboardQuerySchema, req.query);
    const metrics = await DashboardService.getMetrics(query);
    setSuccessResponse(res, STATUES.SUCCESS, { data: metrics });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
