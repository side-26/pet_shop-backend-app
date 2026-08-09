jest.mock('#entities/products/products.model.js', () => ({
  ProductModel: { find: jest.fn() },
}));
jest.mock('./landing.model.js', () => ({
  LandingModel: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));

import { ProductModel } from '#entities/products/products.model.js';

import { LandingModel } from './landing.model.js';
import { LandingService } from './landing.service.js';

describe('LandingService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('findConfiguration reads the main configuration', async () => {
    LandingModel.findOne.mockResolvedValue({ heroTitle: 'Welcome' });
    await expect(LandingService.findConfiguration()).resolves.toEqual({
      heroTitle: 'Welcome',
    });
    expect(LandingModel.findOne).toHaveBeenCalledWith({ key: 'main' });
  });

  test('get returns configuration and featured products', async () => {
    LandingModel.findOne.mockResolvedValue({
      heroTitle: 'Welcome',
      featuredProductLimit: 4,
    });
    const limit = jest.fn().mockResolvedValue([{ title: 'Food' }]);
    const sort = jest.fn().mockReturnValue({ limit });
    ProductModel.find.mockReturnValue({ sort });

    await expect(LandingService.get()).resolves.toMatchObject({
      heroTitle: 'Welcome',
      featuredProducts: [{ title: 'Food' }],
    });
    expect(limit).toHaveBeenCalledWith(4);
  });

  test('update upserts and formats configuration', async () => {
    LandingModel.findOneAndUpdate.mockResolvedValue({ heroTitle: 'New title' });
    await expect(
      LandingService.update({ heroTitle: 'New title' }, 'user-id'),
    ).resolves.toMatchObject({ heroTitle: 'New title' });
    expect(LandingModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'main' },
      {
        $set: { heroTitle: 'New title', updatedBy: 'user-id' },
        $setOnInsert: { key: 'main' },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
  });
});
