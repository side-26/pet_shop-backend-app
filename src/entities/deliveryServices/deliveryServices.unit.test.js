jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');
    error.statusCode = statusCode;
    Object.assign(error, options);
    throw error;
  }),
}));

jest.mock('./deliveryServices.model.js', () => {
  const MockModel = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
    return this;
  });
  MockModel.findOne = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();
  MockModel.find = jest.fn();
  return { DeliveryServiceModel: MockModel };
});

import { DeliveryServiceModel } from './deliveryServices.model.js';
import { createDeliveryServiceZodSchema } from './deliveryServices.schema.js';
import { DeliveryServiceService } from './deliveryServices.service.js';

describe('DeliveryServiceService', () => {
  const deliveryService = {
    _id: '65a4de97aff1fbb38c437952',
    title: 'Tehran Express',
    title_fa: 'اکسپرس تهران',
    originCoordinates: [51.389, 35.6892],
    basePrice: 10000,
    packingPrice: 3000,
    pricePerKilometer: 5000,
    isEnable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defaults base price and enable state in the creation schema', () => {
    expect(
      createDeliveryServiceZodSchema.parse({
        title: deliveryService.title,
        title_fa: deliveryService.title_fa,
        originCoordinates: deliveryService.originCoordinates,
        pricePerKilometer: deliveryService.pricePerKilometer,
      }),
    ).toMatchObject({ basePrice: 0, packingPrice: 0, isEnable: true });

    expect(
      createDeliveryServiceZodSchema.parse({
        title: deliveryService.title,
        title_fa: deliveryService.title_fa,
        originCoordinates: deliveryService.originCoordinates,
        pricePerKilometer: deliveryService.pricePerKilometer,
        isEnable: 'false',
      }).isEnable,
    ).toBe(false);
    expect(
      createDeliveryServiceZodSchema.parse({
        title: deliveryService.title,
        title_fa: deliveryService.title_fa,
        originCoordinates: deliveryService.originCoordinates,
        pricePerKilometer: deliveryService.pricePerKilometer,
        isEnable: 'true',
      }).isEnable,
    ).toBe(true);
  });

  test('creates a delivery service with the acting user', async () => {
    DeliveryServiceModel.findOne.mockResolvedValue(null);

    await expect(
      DeliveryServiceService.create(deliveryService, 'admin-id'),
    ).resolves.toMatchObject({
      title: deliveryService.title,
      createdBy: 'admin-id',
    });
  });

  test('rejects duplicate titles case-insensitively', async () => {
    DeliveryServiceModel.findOne.mockResolvedValue(deliveryService);

    await expect(
      DeliveryServiceService.create(deliveryService, 'admin-id'),
    ).rejects.toThrow('قبلاً ثبت شده است');
    expect(DeliveryServiceModel.findOne).toHaveBeenCalledWith({
      title: { $regex: '^Tehran Express$', $options: 'i' },
    });
  });

  test('returns a not-found error when an identifier has no provider', async () => {
    DeliveryServiceModel.findById.mockResolvedValue(null);

    await expect(DeliveryServiceService.findById('missing-id')).rejects.toThrow(
      'یافت نشد',
    );
    await expect(
      DeliveryServiceService.findById('missing-id', false),
    ).resolves.toBeNull();
    DeliveryServiceModel.findById.mockResolvedValue(deliveryService);
    await expect(
      DeliveryServiceService.findById(deliveryService._id),
    ).resolves.toBe(deliveryService);
  });

  test('updates a provider and records the acting user', async () => {
    const mutableDeliveryService = {
      ...deliveryService,
      save: jest.fn().mockResolvedValue(deliveryService),
    };
    DeliveryServiceModel.findById.mockResolvedValue(mutableDeliveryService);
    DeliveryServiceModel.findOne.mockResolvedValue(null);

    await DeliveryServiceService.update(
      deliveryService._id,
      { ...deliveryService, title: 'Updated Express' },
      'seller-id',
    );

    expect(mutableDeliveryService).toMatchObject({
      title: 'Updated Express',
      updatedBy: 'seller-id',
    });
    expect(mutableDeliveryService.save).toHaveBeenCalled();
  });

  test('rejects an update that duplicates another provider title', async () => {
    DeliveryServiceModel.findById.mockResolvedValue(deliveryService);
    DeliveryServiceModel.findOne.mockResolvedValue({ _id: 'another-id' });

    await expect(
      DeliveryServiceService.update(
        deliveryService._id,
        deliveryService,
        'seller-id',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('changes availability with the acting user', async () => {
    const mutableDeliveryService = {
      ...deliveryService,
      save: jest.fn().mockResolvedValue(deliveryService),
    };
    DeliveryServiceModel.findById.mockResolvedValue(mutableDeliveryService);

    await DeliveryServiceService.disable(deliveryService._id, 'seller-id');

    expect(mutableDeliveryService).toMatchObject({
      isEnable: false,
      updatedBy: 'seller-id',
    });
  });

  test('lists only enabled providers by default and can include disabled ones', async () => {
    const sort = jest.fn().mockResolvedValue([deliveryService]);
    DeliveryServiceModel.find.mockReturnValue({ sort });

    await expect(DeliveryServiceService.findAll()).resolves.toEqual([
      deliveryService,
    ]);
    expect(DeliveryServiceModel.find).toHaveBeenCalledWith({ isEnable: true });

    await DeliveryServiceService.findAll({ includeDisabled: true });
    expect(DeliveryServiceModel.find).toHaveBeenLastCalledWith({});

    DeliveryServiceModel.findOne.mockResolvedValue(null);
    await DeliveryServiceService.findOne({ excludeId: 'excluded-id' });
    expect(DeliveryServiceModel.findOne).toHaveBeenLastCalledWith({
      _id: { $ne: 'excluded-id' },
    });
    await DeliveryServiceService.findOne();
    expect(DeliveryServiceModel.findOne).toHaveBeenLastCalledWith({});
    expect(DeliveryServiceService.escapeRegex()).toBe('');
  });

  test('deletes a provider and rejects deletion of a missing provider', async () => {
    DeliveryServiceModel.findByIdAndDelete.mockResolvedValue(deliveryService);
    await expect(
      DeliveryServiceService.delete(deliveryService._id),
    ).resolves.toBe(deliveryService);

    DeliveryServiceModel.findByIdAndDelete.mockResolvedValue(null);
    await expect(DeliveryServiceService.delete('missing-id')).rejects.toThrow(
      'یافت نشد',
    );
  });

  test('calculates a rounded-up kilometre price from the provider origin', () => {
    const quote = DeliveryServiceService.calculateQuote(
      deliveryService,
      [51.398, 35.698],
    );

    expect(quote.distanceKm).toBeGreaterThan(1);
    expect(quote.distanceKm).toBeLessThan(2);
    expect(quote.shippingPrice).toBe(23000);
  });

  test('formats one or many delivery services without exposing Mongoose internals', () => {
    expect(DeliveryServiceService.format(null)).toBeNull();
    expect(DeliveryServiceService.formatMany([deliveryService])).toEqual([
      expect.objectContaining({
        id: deliveryService._id,
        title: deliveryService.title,
        packingPrice: deliveryService.packingPrice,
        pricePerKilometer: deliveryService.pricePerKilometer,
      }),
    ]);
    expect(
      DeliveryServiceService.format({
        toObject: () => deliveryService,
      }),
    ).toMatchObject({ id: deliveryService._id });
  });
});
