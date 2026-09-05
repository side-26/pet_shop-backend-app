jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('./dashboard.model.js', () => ({
  DashboardModel: {
    aggregateOrders: jest.fn(),
    aggregateCustomers: jest.fn(),
    aggregateProducts: jest.fn(),
    aggregatePets: jest.fn(),
  },
}));

import { DASHBOARD_METRICS, STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { DashboardModel } from './dashboard.model.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    DashboardModel.aggregateOrders.mockResolvedValue({
      summary: {
        orders: 2,
        grossRevenue: 500,
        discountTotal: 50,
        shippingRevenue: 20,
        netRevenue: 470,
        unitsSold: 4,
      },
      ordersByDeliveryState: [{ deliveryState: 0, count: 2 }],
      salesTrend: [{ period: '2026-09-05', orders: 2, revenue: 470 }],
      topSellingItems: [{ itemId: 'product-id', unitsSold: 3 }],
      recentOrders: [{ _id: 'order-id' }],
    });
    DashboardModel.aggregateCustomers.mockResolvedValue({
      total: 10,
      newInPeriod: 2,
    });
    DashboardModel.aggregateProducts.mockResolvedValue({
      total: 8,
      enabled: 7,
      lowStock: 2,
      lowStockItems: [{ itemId: 'product-id', title: 'B', quantity: 2 }],
    });
    DashboardModel.aggregatePets.mockResolvedValue({
      total: 4,
      enabled: 3,
      lowStock: 1,
      lowStockItems: [{ itemId: 'pet-id', title: 'A', quantity: 1 }],
    });
  });

  test('combines dashboard metrics and computes the average order value', async () => {
    const fromDate = new Date('2026-09-01T00:00:00.000Z');
    const result = await DashboardService.getMetrics(
      {
        fromDate,
        toDate: now,
        groupBy: DASHBOARD_METRICS.GROUP_BY.DAY,
        lowStockThreshold: 3,
        topLimit: 10,
        lowStockLimit: 1,
        recentLimit: 1,
      },
      now,
    );

    expect(result.summary).toMatchObject({
      orders: 2,
      netRevenue: 470,
      averageOrderValue: 235,
      customers: { total: 10, newInPeriod: 2 },
      catalog: {
        products: { total: 8, enabled: 7, lowStock: 2 },
        pets: { total: 4, enabled: 3, lowStock: 1 },
      },
    });
    expect(result.lowStockItems).toEqual([
      { itemId: 'pet-id', title: 'A', quantity: 1 },
    ]);
    expect(DashboardModel.aggregateOrders).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate, toDate: now, topLimit: 10 }),
    );
    expect(DashboardModel.aggregateProducts).toHaveBeenCalledWith({
      lowStockThreshold: 3,
      lowStockLimit: 1,
    });
  });

  test('uses the default period and returns zero-safe order summary values', async () => {
    DashboardModel.aggregateOrders.mockResolvedValue({
      summary: {},
      ordersByDeliveryState: [],
      salesTrend: [],
      topSellingItems: [],
      recentOrders: [],
    });

    const result = await DashboardService.getMetrics({}, now);

    expect(result.period).toEqual({
      fromDate: new Date('2026-08-06T12:00:00.000Z'),
      toDate: now,
      groupBy: DASHBOARD_METRICS.GROUP_BY.DAY,
      timeZone: DASHBOARD_METRICS.TIME_ZONE,
    });
    expect(result.summary).toMatchObject({
      orders: 0,
      netRevenue: 0,
      averageOrderValue: 0,
      unitsSold: 0,
    });
  });

  test('maps aggregation failures to the dashboard service error', async () => {
    DashboardModel.aggregateOrders.mockRejectedValue(new Error('db failed'));

    await expect(DashboardService.getMetrics({}, now)).rejects.toThrow(
      'دریافت آمار داشبورد ناموفق بود',
    );
    expect(setErrorResponse).toHaveBeenCalledWith(STATUES.OTHER_PROBLEM, {
      message: 'دریافت آمار داشبورد ناموفق بود',
      error: 'Error: db failed',
    });
  });
});
