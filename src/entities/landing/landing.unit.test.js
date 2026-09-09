jest.mock('./landing.model.js', () => ({
  LandingModel: {
    findPetBySlug: jest.fn(),
    findFeaturedPetTypes: jest.fn(),
    findAllPetTypes: jest.fn(),
    findMostDiscountedProducts: jest.fn(),
    findMostPopularProducts: jest.fn(),
    findProductBySlug: jest.fn(),
  },
}));

jest.mock('#entities/pets/pets.helpers.js', () => ({
  formatCustomerPetDetail: jest.fn((pet) => ({
    id: pet._id,
    title: pet.title,
  })),
}));

jest.mock('#entities/products/products.helpers.js', () => ({
  formatCustomerProductDetail: jest.fn((product) => ({
    id: product._id,
    title: product.title,
  })),
}));

import { LandingModel } from './landing.model.js';
import { LandingService } from './landing.service.js';

const petType = {
  _id: 'pet-type-id',
  title: 'گربه',
  mainImage: 'https://cdn.example.com/cat.webp',
  thumbnail: 'data:image/webp;base64,AAAA',
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
const pet = {
  _id: 'pet-id',
  title: 'گربه پرشین',
  mainImage: 'https://cdn.example.com/persian.webp',
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
  images: ['https://cdn.example.com/persian-gallery.webp'],
  description: 'توضیحات گربه',
  petType: petType,
  breed: { _id: 'breed-id', title: 'پرشین' },
  quantity: 1,
  price: 1000000,
  discountPercentage: 10,
  inEnable: true,
  slug: 'persian-cat',
};
const fullProduct = {
  ...product,
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
  images: ['https://cdn.example.com/food-gallery.webp'],
  description: 'توضیحات محصول',
  category: { _id: 'category-id', title: 'غذا' },
  subCategory: { _id: 'subcategory-id', title: 'غذای خشک' },
  quantity: 1,
  isEnable: true,
  slug: 'cat-food',
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
        thumbnail: petType.thumbnail,
        summary: petType.description,
      },
    ]);
  });

  test('formats every enabled pet type', async () => {
    LandingModel.findAllPetTypes.mockResolvedValue([petType]);

    await expect(LandingService.getAllPetTypes()).resolves.toHaveLength(1);
    expect(LandingModel.findAllPetTypes).toHaveBeenCalledTimes(1);
  });

  test('returns full enabled pet and product details by slug', async () => {
    LandingModel.findPetBySlug.mockResolvedValue(pet);
    LandingModel.findProductBySlug.mockResolvedValue(fullProduct);

    await expect(LandingService.getPetBySlug(pet.slug)).resolves.toEqual(
      expect.objectContaining({
        title: pet.title,
      }),
    );
    await expect(
      LandingService.getProductBySlug(fullProduct.slug),
    ).resolves.toEqual(
      expect.objectContaining({
        title: fullProduct.title,
      }),
    );
    expect(LandingModel.findPetBySlug).toHaveBeenCalledWith(pet.slug);
    expect(LandingModel.findProductBySlug).toHaveBeenCalledWith(
      fullProduct.slug,
    );
  });

  test('rejects unavailable slug details as not found', async () => {
    LandingModel.findPetBySlug.mockResolvedValue(null);
    LandingModel.findProductBySlug.mockResolvedValue(null);

    await expect(LandingService.getPetBySlug('missing-pet')).rejects.toThrow(
      'حیوان یافت نشد',
    );
    await expect(
      LandingService.getProductBySlug('missing-product'),
    ).rejects.toThrow('محصول یافت نشد');
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
      discountPrice: 40000,
    };
    await expect(LandingService.getMostDiscountedProducts(2)).resolves.toEqual([
      expected,
    ]);
    await expect(LandingService.getMostPopularProducts()).resolves.toEqual([
      expected,
    ]);
    expect(LandingModel.findMostDiscountedProducts).toHaveBeenCalledWith(2);
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
