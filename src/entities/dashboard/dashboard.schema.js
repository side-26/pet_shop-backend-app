import { z } from 'zod';

import { DASHBOARD_METRICS } from '#configs/constants.js';
import '#configs/zod.config.js';

const { coerce, enum: enumValue, object } = z;

export const dashboardQuerySchema = object({
  fromDate: coerce.date().optional(),
  toDate: coerce.date().optional(),
  groupBy: enumValue(Object.values(DASHBOARD_METRICS.GROUP_BY))
    .optional()
    .default(DASHBOARD_METRICS.GROUP_BY.DAY),
  lowStockThreshold: coerce
    .number()
    .int()
    .min(0)
    .max(DASHBOARD_METRICS.MAX_LOW_STOCK_THRESHOLD)
    .optional()
    .default(DASHBOARD_METRICS.DEFAULT_LOW_STOCK_THRESHOLD),
  topLimit: coerce
    .number()
    .int()
    .min(1)
    .max(DASHBOARD_METRICS.MAX_LIST_LIMIT)
    .optional()
    .default(DASHBOARD_METRICS.DEFAULT_LIST_LIMIT),
  lowStockLimit: coerce
    .number()
    .int()
    .min(1)
    .max(DASHBOARD_METRICS.MAX_LIST_LIMIT)
    .optional()
    .default(DASHBOARD_METRICS.DEFAULT_LIST_LIMIT),
  recentLimit: coerce
    .number()
    .int()
    .min(1)
    .max(DASHBOARD_METRICS.MAX_LIST_LIMIT)
    .optional()
    .default(DASHBOARD_METRICS.DEFAULT_LIST_LIMIT),
}).refine(
  ({ fromDate, toDate }) => !fromDate || !toDate || fromDate <= toDate,
  {
    path: ['fromDate'],
    message: 'تاریخ شروع نباید بعد از تاریخ پایان باشد',
  },
);
