jest.mock('#entities/orders/orders.model.js', () => ({
  OrderModel: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('#entities/orders/orders.service.js', () => ({
  OrderService: {
    createCheckoutSnapshot: jest.fn(),
    createOrderFromCheckout: jest.fn(),
    releasePreparedOrderReservation: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: jest.fn(() => 'fixed-authority') })),
  randomUUID: jest.fn(() => 'reference-id'),
}));

jest.mock('#utils/helpers.js', () => ({
  getPaginationData: jest.fn(),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('./payments.model.js', () => ({
  PaymentModel: {
    db: { startSession: jest.fn() },
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    populate: jest.fn(),
  },
}));

import { PAYMENT_STATUSES, STATUES } from '#configs/constants.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { OrderService } from '#entities/orders/orders.service.js';
import { getPaginationData } from '#utils/helpers.js';

import { PaymentModel } from './payments.model.js';
import { PaymentService } from './payments.service.js';

describe('PaymentService', () => {
  const userId = '65a4de97aff1fbb38c437952';
  const orderId = '65a4de97aff1fbb38c437953';
  const paymentGatewayEnvironment = {
    PAYMENT_GETWAY_URL: process.env.PAYMENT_GETWAY_URL,
    FRONTEND_APP_URL: process.env.FRONTEND_APP_URL,
    FRONTEND_PAYMENT_RESULT_URL: process.env.FRONTEND_PAYMENT_RESULT_URL,
  };
  const actor = { userId, role: 'customer' };
  const data = {
    order: orderId,
    amount: 1000,
    authority: 'AUTH-123',
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  };

  beforeAll(() => {
    process.env.PAYMENT_GETWAY_URL = 'http://localhost:3001/pet-shop-app';
    process.env.FRONTEND_APP_URL = 'http://localhost:3000';
    process.env.FRONTEND_PAYMENT_RESULT_URL =
      'http://localhost:3000/order/result/:authority';
  });

  afterAll(() => {
    for (const [name, value] of Object.entries(paymentGatewayEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  beforeEach(() => jest.clearAllMocks());

  test('creates a payment only for an order owned by the authenticated user', async () => {
    OrderModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ user: { toString: () => userId } }),
    });
    PaymentModel.create.mockResolvedValue({
      _id: 'payment-id',
      ...data,
      user: userId,
    });

    await expect(
      PaymentService.createPayment(actor, data),
    ).resolves.toMatchObject({ user: userId });
    expect(PaymentModel.create).toHaveBeenCalledWith({ ...data, user: userId });
  });

  test('rejects a missing order and another user order', async () => {
    OrderModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });
    await expect(
      PaymentService.createPayment(actor, data),
    ).rejects.toMatchObject({
      statusCode: STATUES.NOT_FOUND,
      message: 'سفارش یافت نشد',
    });

    OrderModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest
        .fn()
        .mockResolvedValue({ user: { toString: () => 'another-user' } }),
    });
    await expect(
      PaymentService.createPayment(actor, data),
    ).rejects.toMatchObject({
      statusCode: STATUES.NO_ACCESS,
      message: 'دسترسی به پرداخت این سفارش مجاز نیست',
    });
  });

  test('creates a trusted gateway payment request from an owned prepared order', async () => {
    OrderModel.findOne.mockResolvedValue({
      _id: orderId,
      paymentStatus: 'pending_payment',
      paymentExpiresAt: new Date(Date.now() + 60_000),
      totalPrice: 1000,
      discountPrice: 100,
      shippingPrice: 50,
    });
    PaymentModel.findOne.mockResolvedValue(null);
    PaymentModel.create.mockResolvedValue({ id: 'payment-id' });

    await expect(
      PaymentService.requestPayment(actor, orderId),
    ).resolves.toEqual({
      paymentId: 'payment-id',
      authority: 'fixed-authority',
      gatewayUrl: 'http://localhost:3001/pet-shop-app/fixed-authority',
    });
    expect(PaymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: userId,
        order: orderId,
        amount: 950,
        authority: 'fixed-authority',
        status: PAYMENT_STATUSES.PENDING,
        expiresAt: expect.any(Date),
      }),
    );
  });

  test('does not create a gateway payment request for an expired prepared order', async () => {
    const session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    PaymentModel.db.startSession.mockResolvedValue(session);
    PaymentModel.updateMany.mockResolvedValue({});
    OrderService.releasePreparedOrderReservation.mockResolvedValue(null);
    OrderModel.findOne.mockResolvedValue({
      _id: orderId,
      paymentStatus: 'pending_payment',
      paymentExpiresAt: new Date(Date.now() - 1),
    });

    await expect(PaymentService.requestPayment(actor, orderId)).rejects.toThrow(
      'مهلت پرداخت سفارش منقضی شده است',
    );
    expect(PaymentModel.create).not.toHaveBeenCalled();
  });

  test('scopes a payment lookup and list to the authenticated user', async () => {
    const payment = { _id: 'payment-id', user: userId };
    PaymentModel.findOne.mockResolvedValue(payment);
    await expect(
      PaymentService.getUserPayment(actor, 'payment-id'),
    ).resolves.toBe(payment);
    expect(PaymentModel.findOne).toHaveBeenCalledWith({
      _id: 'payment-id',
      user: userId,
    });

    const result = { result: [], pagination: {} };
    getPaginationData.mockResolvedValue(result);
    await expect(
      PaymentService.getUserPayments(actor, { page: 1 }),
    ).resolves.toBe(result);
    expect(getPaginationData).toHaveBeenCalledWith(
      PaymentModel,
      { page: 1, user: userId },
      '',
      expect.any(Function),
    );
  });

  test('returns only gateway-safe payment data for a valid authority', async () => {
    PaymentModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        status: PAYMENT_STATUSES.PENDING,
        amount: 950,
      }),
    });

    await expect(
      PaymentService.getGatewayPayment('a'.repeat(64)),
    ).resolves.toEqual({
      status: PAYMENT_STATUSES.PENDING,
      finalPrice: 950,
      companyName: 'پت شاپ پرشین',
      appUrl: 'http://localhost:3000',
    });
    expect(PaymentModel.findOne).toHaveBeenCalledWith({
      authority: 'a'.repeat(64),
    });
  });

  test('reports an unknown gateway authority as not found', async () => {
    PaymentModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });
    await expect(
      PaymentService.getGatewayPayment('b'.repeat(64)),
    ).rejects.toMatchObject({ statusCode: STATUES.NOT_FOUND });
  });

  test('marks an unexpired pending gateway payment as paid', async () => {
    const paymentId = 'payment-id';
    const session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    PaymentModel.db.startSession.mockResolvedValue(session);
    OrderModel.findOneAndUpdate.mockResolvedValue({ _id: 'order-id' });
    PaymentModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: paymentId,
        status: PAYMENT_STATUSES.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
        checkoutSnapshot: { cart: {}, order: {} },
      }),
    });
    PaymentModel.findOneAndUpdate.mockResolvedValue({ _id: paymentId });

    await expect(
      PaymentService.payGatewayPayment('a'.repeat(64)),
    ).resolves.toEqual({
      success: true,
      callbackUrl:
        'http://localhost:3000/order/result/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(PaymentModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: paymentId, status: PAYMENT_STATUSES.PENDING },
      {
        $set: {
          status: PAYMENT_STATUSES.PAID,
          gatewayReferenceId: 'reference-id',
          paidAt: expect.any(Date),
          order: 'order-id',
        },
      },
      expect.any(Object),
    );
    expect(session.endSession).toHaveBeenCalled();
  });

  test('rejects expired and already processed gateway payments', async () => {
    const expirySession = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn(),
    };
    PaymentModel.db.startSession.mockResolvedValue(expirySession);
    PaymentModel.updateMany.mockResolvedValue({});
    OrderService.releasePreparedOrderReservation.mockResolvedValue(null);
    PaymentModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'payment-id',
        status: PAYMENT_STATUSES.PENDING,
        expiresAt: new Date(Date.now() - 1),
      }),
    });
    await expect(
      PaymentService.payGatewayPayment('a'.repeat(64)),
    ).rejects.toMatchObject({ statusCode: STATUES.EXPIRED });

    PaymentModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'payment-id',
        status: PAYMENT_STATUSES.PAID,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    });
    await expect(
      PaymentService.payGatewayPayment('a'.repeat(64)),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
  });

  test('cancels a pending checkout payment without creating an Order', async () => {
    PaymentModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'payment-id',
        status: PAYMENT_STATUSES.PENDING,
      }),
    });
    PaymentModel.findOneAndUpdate.mockResolvedValue({ _id: 'payment-id' });

    await expect(
      PaymentService.cancelGatewayPayment('a'.repeat(64)),
    ).rejects.toMatchObject({
      statusCode: STATUES.BAD_REQUEST,
      message: 'پرداخت ناموفق بود و سفارش لغو شد',
    });
    expect(OrderModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('hides a missing or unowned payment as not found', async () => {
    PaymentModel.findOne.mockResolvedValue(null);
    await expect(
      PaymentService.getUserPayment(actor, 'payment-id'),
    ).rejects.toMatchObject({
      statusCode: STATUES.NOT_FOUND,
      message: 'پرداخت یافت نشد',
    });
  });

  test('lists payments with management-safe user data', async () => {
    getPaginationData.mockResolvedValue({ result: [{}], pagination: {} });
    PaymentModel.populate.mockResolvedValue([
      { user: { phoneNumber: '0912' } },
    ]);
    const result = await PaymentService.getPayments({ page: 1 });
    expect(result.result[0].user.phoneNumber).toBe('0912');
    expect(PaymentModel.populate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ path: 'user' }),
    );
  });

  test('sets paidAt for paid payments and clears it for non-paid statuses', async () => {
    PaymentModel.findByIdAndUpdate.mockResolvedValue({
      status: PAYMENT_STATUSES.PAID,
    });
    await PaymentService.updatePaymentStatus('payment-id', {
      status: PAYMENT_STATUSES.PAID,
    });
    expect(PaymentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'payment-id',
      {
        $set: expect.objectContaining({
          status: PAYMENT_STATUSES.PAID,
          paidAt: expect.any(Date),
        }),
      },
      expect.any(Object),
    );

    PaymentModel.findByIdAndUpdate.mockResolvedValue({
      status: PAYMENT_STATUSES.FAILED,
    });
    await PaymentService.updatePaymentStatus('payment-id', {
      status: PAYMENT_STATUSES.FAILED,
    });
    expect(PaymentModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      'payment-id',
      { $set: { status: PAYMENT_STATUSES.FAILED, paidAt: null } },
      expect.any(Object),
    );
  });

  test('reports a missing payment while updating status', async () => {
    PaymentModel.findByIdAndUpdate.mockResolvedValue(null);
    await expect(
      PaymentService.updatePaymentStatus('payment-id', {
        status: PAYMENT_STATUSES.PENDING,
      }),
    ).rejects.toMatchObject({ statusCode: STATUES.NOT_FOUND });
  });
});
