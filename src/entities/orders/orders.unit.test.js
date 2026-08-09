jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: (statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  },
}));
jest.mock('#entities/products/products.model.js', () => ({
  ProductModel: { find: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('./orders.model.js', () => ({
  OrderModel: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

import { ORDER_STATUSES, ROLES } from '#configs/constants.js';
import { ProductModel } from '#entities/products/products.model.js';

import { OrderModel } from './orders.model.js';
import { OrderService } from './orders.service.js';

const userId = '65a4de97aff1fbb38c437111';
const productId = '65a4de97aff1fbb38c437112';
const orderId = '65a4de97aff1fbb38c437113';
const requester = { id: userId, role: ROLES.CUSTOMER };
const order = {
  _id: orderId,
  user: { toString: () => userId },
  items: [],
  status: ORDER_STATUSES.PENDING,
};

describe('OrderService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('findById returns an owned order', async () => {
    OrderModel.findById.mockResolvedValue(order);
    await expect(OrderService.findById(orderId, requester)).resolves.toBe(
      order,
    );
  });

  test('findById rejects missing and unauthorized orders', async () => {
    OrderModel.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(order);
    await expect(OrderService.findById(orderId, requester)).rejects.toThrow(
      'Order not found',
    );
    await expect(
      OrderService.findById(orderId, { id: productId, role: ROLES.CUSTOMER }),
    ).rejects.toThrow('You cannot access this order');
  });

  test('findAll scopes customers to their own orders', () => {
    const sort = jest.fn().mockReturnValue('query');
    OrderModel.find.mockReturnValue({ sort });
    expect(OrderService.findAll({}, requester)).toBe('query');
    expect(OrderModel.find).toHaveBeenCalledWith({ user: userId });
  });

  test('create snapshots products, total, and decrements stock', async () => {
    const product = {
      _id: { toString: () => productId },
      title: 'Food',
      price: 10,
      stock: 5,
    };
    ProductModel.find.mockResolvedValue([product]);
    ProductModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    OrderModel.create.mockImplementation(async (value) => value);

    const result = await OrderService.create(
      {
        items: [{ product: productId, quantity: 2 }],
        shippingAddress: 'Tehran address',
      },
      requester,
    );
    expect(result.totalAmount).toBe(20);
    expect(ProductModel.updateOne).toHaveBeenCalled();
  });

  test('create rejects unavailable products and insufficient stock', async () => {
    ProductModel.find.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        _id: { toString: () => productId },
        title: 'Food',
        price: 10,
        stock: 0,
      },
    ]);
    const data = {
      items: [{ product: productId, quantity: 1 }],
      shippingAddress: 'Tehran address',
    };
    await expect(OrderService.create(data, requester)).rejects.toThrow(
      'One or more products are unavailable',
    );
    await expect(OrderService.create(data, requester)).rejects.toThrow(
      'Insufficient product stock',
    );
  });

  test('updateStatus updates an accessible order', async () => {
    OrderModel.findById.mockResolvedValue(order);
    OrderModel.findByIdAndUpdate.mockResolvedValue({
      ...order,
      status: ORDER_STATUSES.PROCESSING,
    });
    await expect(
      OrderService.updateStatus(orderId, ORDER_STATUSES.PROCESSING, requester),
    ).resolves.toMatchObject({ status: ORDER_STATUSES.PROCESSING });
  });

  test('delete removes an accessible order', async () => {
    OrderModel.findById.mockResolvedValue(order);
    OrderModel.findByIdAndDelete.mockResolvedValue(order);
    await expect(OrderService.delete(orderId, requester)).resolves.toBe(order);
  });

  test('format and formatMany produce API values', () => {
    expect(OrderService.format(order)).toMatchObject({ id: orderId });
    expect(OrderService.formatMany([order])).toHaveLength(1);
  });
});
