jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    error.statusCode = statusCode;
    Object.assign(error, options);
    throw error;
  }),
}));

function mockCreateModel() {
  return { exists: jest.fn() };
}

jest.mock('#entities/brands/brands.model.js', () => ({
  BrandModel: mockCreateModel(),
}));
jest.mock('#entities/breeds/breeds.model.js', () => ({
  BreedModel: mockCreateModel(),
}));
jest.mock('#entities/categories/categories.model.js', () => ({
  CategoryModel: mockCreateModel(),
}));
jest.mock('#entities/orders/orders.model.js', () => ({
  OrderModel: mockCreateModel(),
}));
jest.mock('#entities/petTypes/petTypes.model.js', () => ({
  PetTypeModel: mockCreateModel(),
}));
jest.mock('#entities/pets/pets.model.js', () => ({
  PetModel: mockCreateModel(),
}));
jest.mock('#entities/products/products.model.js', () => ({
  ProductModel: mockCreateModel(),
}));
jest.mock('#entities/subCategories/subCategories.model.js', () => ({
  SubCategoryModel: mockCreateModel(),
}));
jest.mock('#entities/users/users.model.js', () => ({
  UserModel: mockCreateModel(),
}));

import { BreedModel } from '#entities/breeds/breeds.model.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { UserModel } from '#entities/users/users.model.js';

import { assertEntityIsNotReferenced } from './referenceGuard.service.js';

const models = [
  BreedModel,
  CategoryModel,
  OrderModel,
  PetModel,
  ProductModel,
  SubCategoryModel,
  UserModel,
];

describe('reference guard', () => {
  beforeEach(() => {
    models.forEach((model) => model.exists.mockResolvedValue(null));
  });

  test.each([
    ['petType', PetModel, { petType: 'id' }],
    ['breed', PetModel, { breed: 'id' }],
    ['category', ProductModel, { category: 'id' }],
    ['subCategory', ProductModel, { subCategory: 'id' }],
    ['brand', ProductModel, { brand: 'id' }],
    ['product', OrderModel, { 'items.item': 'id' }],
    ['pet', UserModel, { 'cart.items.item': 'id' }],
    ['user', OrderModel, { user: 'id' }],
  ])('rejects deleting a referenced %s', async (entity, model, query) => {
    model.exists.mockResolvedValueOnce({ _id: 'reference-id' });

    await expect(assertEntityIsNotReferenced(entity, 'id')).rejects.toThrow(
      'امکان حذف وجود ندارد',
    );
    expect(model.exists).toHaveBeenCalledWith(query);
  });

  test('allows deletion when no relation exists', async () => {
    await expect(
      assertEntityIsNotReferenced('brand', 'id'),
    ).resolves.toBeUndefined();
  });
});
