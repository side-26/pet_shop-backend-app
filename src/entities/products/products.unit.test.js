jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: (statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  },
}));

jest.mock('#entities/categories/categories.model.js', () => ({
  CategoryModel: { findById: jest.fn() },
}));
jest.mock('#entities/subCategories/subCategories.model.js', () => ({
  SubCategoryModel: { findOne: jest.fn() },
}));
jest.mock('./products.model.js', () => ({
  ProductModel: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

import { CategoryModel } from '#entities/categories/categories.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';

import { ProductModel } from './products.model.js';
import { ProductService } from './products.service.js';

const id = '65a4de97aff1fbb38c437111';
const subCategoryId = '65a4de97aff1fbb38c437112';
const product = {
  _id: id,
  title: 'Cat food',
  category: id,
  price: 10,
  stock: 5,
  isEnabled: true,
};

describe('ProductService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('ensureRelations validates category and matching sub-category', async () => {
    CategoryModel.findById.mockResolvedValue({ _id: id });
    SubCategoryModel.findOne.mockResolvedValue({ _id: subCategoryId });
    await expect(
      ProductService.ensureRelations({
        category: id,
        subCategory: subCategoryId,
      }),
    ).resolves.toBeUndefined();
    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      _id: subCategoryId,
      category: id,
    });
  });

  test('ensureRelations rejects a missing category', async () => {
    CategoryModel.findById.mockResolvedValue(null);
    await expect(
      ProductService.ensureRelations({ category: id }),
    ).rejects.toThrow('Selected category does not exist');
  });

  test('findById returns a product and rejects a missing product', async () => {
    ProductModel.findById
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce(null);
    await expect(ProductService.findById(id)).resolves.toBe(product);
    await expect(ProductService.findById(id)).rejects.toThrow(
      'Product not found',
    );
  });

  test('findAll builds filters and sorting', () => {
    const sort = jest.fn().mockReturnValue('query');
    ProductModel.find.mockReturnValue({ sort });
    expect(ProductService.findAll({ category: id })).toBe('query');
    expect(ProductModel.find).toHaveBeenCalledWith({
      category: id,
      isEnabled: true,
    });
  });

  test('create validates relations and creates a product', async () => {
    CategoryModel.findById.mockResolvedValue({ _id: id });
    ProductModel.findOne.mockResolvedValue(null);
    ProductModel.create.mockResolvedValue(product);
    await expect(ProductService.create(product, id)).resolves.toBe(product);
    expect(ProductModel.create).toHaveBeenCalledWith({
      ...product,
      createdBy: id,
    });
  });

  test('create rejects duplicate product titles', async () => {
    CategoryModel.findById.mockResolvedValue({ _id: id });
    ProductModel.findOne.mockResolvedValue(product);
    await expect(ProductService.create(product, id)).rejects.toThrow(
      'A product with this title already exists in the category',
    );
  });

  test('update validates current relations and updates', async () => {
    ProductModel.findById.mockResolvedValue(product);
    CategoryModel.findById.mockResolvedValue({ _id: id });
    ProductModel.findByIdAndUpdate.mockResolvedValue({ ...product, price: 20 });
    await expect(ProductService.update(id, { price: 20 }, id)).resolves.toEqual(
      {
        ...product,
        price: 20,
      },
    );
  });

  test('delete returns deleted product and rejects missing product', async () => {
    ProductModel.findByIdAndDelete
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce(null);
    await expect(ProductService.delete(id)).resolves.toBe(product);
    await expect(ProductService.delete(id)).rejects.toThrow(
      'Product not found',
    );
  });

  test('format and formatMany produce API values', () => {
    expect(ProductService.format(product)).toMatchObject({
      id,
      title: product.title,
    });
    expect(ProductService.formatMany([product])).toHaveLength(1);
  });
});
