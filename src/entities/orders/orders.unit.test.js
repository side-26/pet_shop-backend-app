jest.mock('nanoid', () => {
  let value = 100000000;
  return {
    nanoid: jest.fn(() => String(value++)),
    customAlphabet: jest.fn(() => () => String(value++)),
  };
});

jest.mock('#entities/users/users.service.js', () => ({
  UserService: {
    getCartItems: jest.fn(),
    findById: jest.fn(),
    emptyCart: jest.fn(),
  },
}));

jest.mock('#entities/products/products.service.js', () => ({
  ProductService: { decrementWeightStock: jest.fn() },
}));

jest.mock('#utils/helpers.js', () => ({
  getPaginationData: jest.fn(),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('./orders.model.js', () => ({
  OrderModel: {
    db: { startSession: jest.fn() },
    create: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    populate: jest.fn(),
  },
}));

import { UserService } from '#entities/users/users.service.js';
import { STATUES } from '#configs/constants.js';
import { ProductService } from '#entities/products/products.service.js';
import { getPaginationData } from '#utils/helpers.js';

import { OrderModel } from './orders.model.js';
import { OrderService } from './orders.service.js';

describe('OrderService', () => {
  const userId = '65a4de97aff1fbb38c437952';
  const addressId = '65a4de97aff1fbb38c437953';
  const actor = { userId, role: 'customer' };
  const address = {
    _id: addressId,
    province: 'Tehran',
    city: 'Tehran',
    detailAddress: 'Example address',
    latLng: [35.7219, 51.3347],
    plate: '12',
    unit: null,
    postalCode: '1234567890',
    receiverIsMe: false,
    firstName: 'Ali',
    lastName: 'Ahmadi',
    nationalCode: '1234567890',
    phoneNumber: '09121234567',
  };
  const cart = {
    totalPrice: 200,
    discountPrice: 20,
    items: [
      {
        item: {
          _id: '65a4de97aff1fbb38c437954',
          title: 'Product',
          mainImage: 'https://example.test/main.webp',
          mainImageThumbnail: 'https://example.test/thumb.webp',
          price: 100,
          discountPercentage: 10,
          isEnable: true,
          weights: {
            id: jest.fn(() => ({ metric: 'KG', value: 2 })),
          },
        },
        itemType: 'product',
        quantity: 2,
        weight: '65a4de97aff1fbb38c437955',
      },
    ],
    userAddress: addressId,
    deliveryWindow: {
      id: 'window-id',
      startsAt: new Date('2099-09-01T05:30:00.000Z'),
      endsAt: new Date('2099-09-01T08:30:00.000Z'),
      countryCode: 'IR',
      timezone: 'Asia/Tehran',
      label: 'بازه آزمایشی',
      shippingPrice: 50,
      provider: 'mock-iran-shipping',
    },
    deliveryQuote: {
      id: 'quote-id',
      addressId,
      expiresAt: new Date('2099-08-31T00:00:00.000Z'),
      countryCode: 'IR',
      timezone: 'Asia/Tehran',
      options: [{ id: 'window-id' }],
    },
    deliveringDateToShipping: new Date('2099-09-01T05:30:00.000Z'),
    shippingPrice: 50,
    shippingInfo: {},
    paymentType: 1,
    instalmentCompany: null,
  };

  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    OrderModel.db.startSession.mockResolvedValue(session);
  });

  test('creates an immutable Order snapshot and empties the Cart', async () => {
    UserService.getCartItems.mockResolvedValue(cart);
    UserService.findById.mockResolvedValue({ addresses: [address] });
    UserService.emptyCart.mockResolvedValue({ items: [] });
    OrderModel.create.mockImplementation(async (data) => {
      const orderData = Array.isArray(data) ? data[0] : data;
      const order = { _id: 'order-id', ...orderData };
      return Array.isArray(data) ? [order] : order;
    });

    const order = await OrderService.createOrderFromCart(actor, 'PAY-123');

    expect(order.user).toBe(userId);
    expect(order.paymentTrackingId).toBe('PAY-123');
    expect(order.orderNumber).toMatch(/^\d{9}$/);
    expect(order.trackingCode).toMatch(/^\d{9}$/);
    expect(order.items[0]).toMatchObject({
      quantity: 2,
      price: 100,
      discountPercentage: 10,
      title: 'Product',
    });
    expect(order.userAddress).toMatchObject({
      sourceId: addressId,
      detailAddress: address.detailAddress,
      latLng: address.latLng,
    });
    expect(order.deliveryWindow).toEqual(cart.deliveryWindow);
    expect(UserService.emptyCart).toHaveBeenCalledWith(actor, session);
    expect(ProductService.decrementWeightStock).toHaveBeenCalledWith(
      cart.items[0].item._id,
      cart.items[0].weight,
      cart.items[0].quantity,
      session,
    );
  });

  test('rejects an empty Cart without creating an Order', async () => {
    UserService.getCartItems.mockResolvedValue({ ...cart, items: [] });
    UserService.findById.mockResolvedValue({ addresses: [address] });
    await expect(
      OrderService.createOrderFromCart(actor, 'PAY-123'),
    ).rejects.toThrow('سبد خرید خالی است');
    expect(OrderModel.create).not.toHaveBeenCalled();
  });

  test('rejects checkout when the delivery quote has expired', async () => {
    UserService.getCartItems.mockResolvedValue({
      ...cart,
      deliveryQuote: { ...cart.deliveryQuote, expiresAt: new Date(0) },
    });
    UserService.findById.mockResolvedValue({ addresses: [address] });

    await expect(
      OrderService.createOrderFromCart(actor, 'PAY-123'),
    ).rejects.toThrow('سبد خرید برای ثبت سفارش کامل یا معتبر نیست');
    expect(OrderModel.create).not.toHaveBeenCalled();
  });

  test('ends the transaction session when Cart clearing fails', async () => {
    UserService.getCartItems.mockResolvedValue(cart);
    UserService.findById.mockResolvedValue({ addresses: [address] });
    OrderModel.create.mockResolvedValue([{ _id: 'order-id' }]);
    UserService.emptyCart.mockRejectedValue(new Error('clear failed'));
    session.endSession.mockRejectedValue(new Error('session cleanup failed'));
    await expect(
      OrderService.createOrderFromCart(actor, 'PAY-123'),
    ).rejects.toThrow('clear failed');
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  test('does not empty Cart when Order persistence fails', async () => {
    UserService.getCartItems.mockResolvedValue(cart);
    UserService.findById.mockResolvedValue({ addresses: [address] });
    OrderModel.create.mockRejectedValue(new Error('create failed'));
    await expect(
      OrderService.createOrderFromCart(actor, 'PAY-123'),
    ).rejects.toThrow('create failed');
    expect(UserService.emptyCart).not.toHaveBeenCalled();
  });

  test('retries a bounded numeric identifier collision', async () => {
    OrderModel.create
      .mockRejectedValueOnce(
        Object.assign(new Error('duplicate'), { code: 11000 }),
      )
      .mockResolvedValueOnce({ _id: 'order-id' });
    await expect(OrderService.createWithUniqueIdentifiers({})).resolves.toEqual(
      {
        _id: 'order-id',
      },
    );
    expect(OrderModel.create).toHaveBeenCalledTimes(2);
  });

  test('getUserOrder scopes lookup to the authenticated user', async () => {
    const order = { _id: 'order-id', user: userId };
    OrderModel.findOne.mockResolvedValue(order);
    await expect(OrderService.getUserOrder(actor, 'order-id')).resolves.toBe(
      order,
    );
    expect(OrderModel.findOne).toHaveBeenCalledWith({
      _id: 'order-id',
      user: userId,
    });
  });

  test('getUserOrder hides another user Order as not found', async () => {
    OrderModel.findOne.mockResolvedValue(null);
    await expect(OrderService.getUserOrder(actor, 'order-id')).rejects.toThrow(
      'سفارش یافت نشد',
    );
  });

  test('getUserOrders reuses pagination with user scope', async () => {
    const result = { result: [], pagination: {} };
    getPaginationData.mockResolvedValue(result);
    await expect(
      OrderService.getUserOrders(actor, { page: 1, limit: 10 }),
    ).resolves.toBe(result);
    expect(getPaginationData).toHaveBeenCalledWith(
      OrderModel,
      { page: 1, limit: 10, user: userId },
      '',
      expect.any(Function),
    );
  });

  test('getUserOrderSummary returns counts and the latest purchase date', async () => {
    const latestOrder = { createdAt: new Date('2026-08-09T00:00:00.000Z') };
    OrderModel.countDocuments
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(9);
    OrderModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(latestOrder),
    });

    await expect(OrderService.getUserOrderSummary(actor)).resolves.toEqual({
      orders: 12,
      delivered: 9,
      lastPurchase: latestOrder.createdAt,
    });
  });

  test('getUserOrderSummary returns null latest purchase for a new customer', async () => {
    OrderModel.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    OrderModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(OrderService.getUserOrderSummary(actor)).resolves.toEqual({
      orders: 0,
      delivered: 0,
      lastPurchase: null,
    });
  });

  test('getUserOrderSummary maps persistence failures to a service error', async () => {
    OrderModel.countDocuments.mockRejectedValue(new Error('database down'));

    await expect(OrderService.getUserOrderSummary(actor)).rejects.toMatchObject(
      {
        statusCode: STATUES.OTHER_PROBLEM,
        message: 'دریافت خلاصه سفارش‌های کاربر ناموفق بود',
      },
    );
  });

  test('getOrders paginates and populates management-safe user fields', async () => {
    getPaginationData.mockResolvedValue({ result: [{}], pagination: {} });
    OrderModel.populate.mockResolvedValue([{ user: { phoneNumber: '0912' } }]);
    const result = await OrderService.getOrders({ page: 1 });
    expect(result.result[0].user.phoneNumber).toBe('0912');
    expect(OrderModel.populate).toHaveBeenCalled();
  });

  test.each([0, 1, 2, 3])(
    'updateOrderDeliveryState persists state %s',
    async (deliveryState) => {
      OrderModel.findByIdAndUpdate.mockResolvedValue({ deliveryState });
      await expect(
        OrderService.updateOrderDeliveryState('order-id', deliveryState),
      ).resolves.toMatchObject({ deliveryState });
    },
  );

  test('updateOrderShippingInfo updates only supplied nested fields', async () => {
    OrderModel.findByIdAndUpdate.mockResolvedValue({
      shippingInfo: { name: 'Provider' },
    });
    await OrderService.updateOrderShippingInfo('order-id', {
      name: 'Provider',
    });
    expect(OrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'order-id',
      { $set: { 'shippingInfo.name': 'Provider' } },
      expect.any(Object),
    );
  });
});
