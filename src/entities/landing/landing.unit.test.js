jest.mock('./landing.model.js', () => ({
  LandingModel: {
    findFeaturedPetTypes: jest.fn(),
    findAllPetTypes: jest.fn(),
    findMostDiscountedProducts: jest.fn(),
    findMostPopularProducts: jest.fn(),
  },
}));

import { LandingModel } from './landing.model.js';
import { LandingService } from './landing.service.js';

const petType = {
  _id: 'pet-type-id',
  title: 'گربه',
  mainImage: 'https://cdn.example.com/cat.webp',
  description: 'لوازم مخصوص گربه',
};
const product = {
  _id: 'product-id',
  title: 'غذای گربه',
  mainImage: 'https://cdn.example.com/food.webp',
  summary: 'غذای کامل',
  price: 200000,
  discountPercentage: 20,
};

describe('LandingService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('formats the bounded featured pet types section', async () => {
    LandingModel.findFeaturedPetTypes.mockResolvedValue([petType]);

    await expect(LandingService.getFeaturedPetTypes()).resolves.toEqual([
      {
        id: petType._id,
        title: petType.title,
        mainImage: petType.mainImage,
        summary: petType.description,
      },
    ]);
  });

  test('formats every enabled pet type', async () => {
    LandingModel.findAllPetTypes.mockResolvedValue([petType]);

    await expect(LandingService.getAllPetTypes()).resolves.toHaveLength(1);
    expect(LandingModel.findAllPetTypes).toHaveBeenCalledTimes(1);
  });

  test('formats discounted and popular product sections', async () => {
    LandingModel.findMostDiscountedProducts.mockResolvedValue([product]);
    LandingModel.findMostPopularProducts.mockResolvedValue([product]);

    const expected = {
      id: product._id,
      title: product.title,
      mainImage: product.mainImage,
      summary: product.summary,
      price: product.price,
      discountPercentage: product.discountPercentage,
    };
    await expect(LandingService.getMostDiscountedProducts()).resolves.toEqual([
      expected,
    ]);
    await expect(LandingService.getMostPopularProducts()).resolves.toEqual([
      expected,
    ]);
  });

  test('propagates source-query failures', async () => {
    LandingModel.findMostPopularProducts.mockRejectedValue(
      new Error('db failed'),
    );

    await expect(LandingService.getMostPopularProducts()).rejects.toThrow(
      'db failed',
    );
  });
});
