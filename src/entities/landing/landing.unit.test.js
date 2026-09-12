jest.mock('./landing.model.js', () => ({
  LandingModel: {
    findPetBySlug: jest.fn(),
    findFeaturedPetTypes: jest.fn(),
    findAllPetTypes: jest.fn(),
    findHighestPricedPets: jest.fn(),
    findHighestPricedAvailablePets: jest.fn(),
    findMostPopularPets: jest.fn(),
    findRecentlyUpdatedPets: jest.fn(),
    findMostWishlistedPetIds: jest.fn(),
    findPetsByIds: jest.fn(),
    findMostDiscountedProducts: jest.fn(),
    findMostPopularProducts: jest.fn(),
    findMostPurchasedProduct: jest.fn(),
    findMostDiscountedProduct: jest.fn(),
    findCheapestProduct: jest.fn(),
    findMostWishlistedProduct: jest.fn(),
    findProductBySlug: jest.fn(),
  },
}));

jest.mock('#entities/pets/pets.helpers.js', () => ({
  formatCustomerPetDetail: jest.fn((pet) => ({
    id: pet._id,
    title: pet.title,
  })),
  formatCustomerPetListItem: jest.fn((pet) => ({
    id: pet._id,
    title: pet.title,
    mainImage: pet.mainImage,
    mainImageThumbnail: pet.mainImageThumbnail,
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
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
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
const highestPricedPet = {
  ...pet,
  _id: 'highest-priced-pet-id',
  title: 'گربه گران‌قیمت',
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

  test('returns pets most commonly wishlisted by non-management users', async () => {
    LandingModel.findMostWishlistedPetIds.mockResolvedValue([
      { petId: pet._id },
    ]);
    LandingModel.findPetsByIds.mockResolvedValue([pet]);
    LandingModel.findHighestPricedPets.mockResolvedValue([]);

    await expect(LandingService.getMostPopularPets()).resolves.toEqual([
      {
        id: pet._id,
        title: pet.title,
        mainImage: pet.mainImage,
        mainImageThumbnail: pet.mainImageThumbnail,
      },
    ]);
    expect(LandingModel.findPetsByIds).toHaveBeenCalledWith([pet._id]);
    expect(LandingModel.findMostPopularPets).not.toHaveBeenCalled();
  });

  test('falls back to sales volume and supplements sparse results by price', async () => {
    LandingModel.findMostWishlistedPetIds.mockResolvedValue([]);
    LandingModel.findMostPopularPets.mockResolvedValue([pet]);
    LandingModel.findHighestPricedPets.mockResolvedValue([highestPricedPet]);

    await expect(LandingService.getMostPopularPets()).resolves.toEqual([
      expect.objectContaining({ id: pet._id }),
      expect.objectContaining({ id: highestPricedPet._id }),
    ]);
    expect(LandingModel.findMostPopularPets).toHaveBeenCalledWith(5);
    expect(LandingModel.findHighestPricedPets).toHaveBeenCalledWith(
      [pet._id],
      4,
    );
  });

  test('supplements recently updated pets with highest-priced available pets', async () => {
    LandingModel.findRecentlyUpdatedPets.mockResolvedValue([pet]);
    LandingModel.findHighestPricedAvailablePets.mockResolvedValue([
      highestPricedPet,
    ]);

    await expect(LandingService.getRecentlyUpdatedPets()).resolves.toEqual([
      {
        id: pet._id,
        title: pet.title,
        mainImage: pet.mainImage,
        mainImageThumbnail: pet.mainImageThumbnail,
      },
      {
        id: highestPricedPet._id,
        title: highestPricedPet.title,
        mainImage: highestPricedPet.mainImage,
        mainImageThumbnail: highestPricedPet.mainImageThumbnail,
      },
    ]);
    expect(LandingModel.findRecentlyUpdatedPets).toHaveBeenCalledTimes(1);
    expect(LandingModel.findHighestPricedAvailablePets).toHaveBeenCalledWith(
      [pet._id],
      4,
    );
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
      mainImageThumbnail: product.mainImageThumbnail,
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

  test('returns distinct featured products in selection-priority order', async () => {
    const purchased = { ...product, _id: 'purchased-id', title: 'پرفروش' };
    const discounted = {
      ...product,
      _id: 'discounted-id',
      title: 'تخفیف‌دار',
    };
    const cheapest = { ...product, _id: 'cheapest-id', title: 'ارزان' };
    const wishlisted = { ...product, _id: 'wishlisted-id', title: 'دلخواه' };
    LandingModel.findMostPurchasedProduct.mockResolvedValue([purchased]);
    LandingModel.findMostDiscountedProduct.mockResolvedValue(discounted);
    LandingModel.findCheapestProduct.mockResolvedValue(cheapest);
    LandingModel.findMostWishlistedProduct.mockResolvedValue([wishlisted]);

    await expect(LandingService.getFeaturedProducts()).resolves.toEqual([
      expect.objectContaining({
        tag: 'mostPurchased',
        product: expect.objectContaining({ id: purchased._id }),
      }),
      expect.objectContaining({
        tag: 'mostDiscounted',
        product: expect.objectContaining({ id: discounted._id }),
      }),
      expect.objectContaining({
        tag: 'cheapest',
        product: expect.objectContaining({ id: cheapest._id }),
      }),
      expect.objectContaining({
        tag: 'mostWishlisted',
        product: expect.objectContaining({ id: wishlisted._id }),
      }),
    ]);
    expect(LandingModel.findMostDiscountedProduct).toHaveBeenCalledWith([
      purchased._id,
    ]);
    expect(LandingModel.findCheapestProduct).toHaveBeenCalledWith([
      purchased._id,
      discounted._id,
    ]);
    expect(LandingModel.findMostWishlistedProduct).toHaveBeenCalledWith([
      purchased._id,
      discounted._id,
      cheapest._id,
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
