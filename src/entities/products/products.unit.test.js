jest.mock('#utils/helpers.js', () => ({
  getPaginationData: jest.fn(),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('#entities/categories/categories.model.js', () => ({
  CategoryModel: { findById: jest.fn() },
}));

jest.mock('#entities/subCategories/subCategories.model.js', () => ({
  SubCategoryModel: { findById: jest.fn() },
}));

jest.mock('./products.model.js', () => ({
  ProductModel: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    populate: jest.fn(),
  },
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: {
    upload: jest.fn(),
    cleanup: jest.fn(),
    getStoredKey: jest.fn(),
  },
}));

import { getPaginationData } from '#utils/helpers.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { MainImageService } from '#services/mainImage.service.js';

import { ProductModel } from './products.model.js';
import { ProductService } from './products.service.js';

const id = '65a4de97aff1fbb38c437111';
const categoryId = '65a4de97aff1fbb38c437112';
const subCategoryId = '65a4de97aff1fbb38c437113';
const userId = '65a4de97aff1fbb38c437114';
const category = {
  _id: categoryId,
  title: 'Food',
  enable: true,
};
const subCategory = {
  _id: subCategoryId,
  title: 'Dry Food',
  category: categoryId,
};
const data = {
  title: 'Premium cat food',
  mainImage: 'https://cdn.example.com/main.webp',
  images: ['https://cdn.example.com/one.webp'],
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
  description: 'Complete food',
  category: categoryId,
  subCategory: subCategoryId,
  quantity: 0,
  price: 0,
  discountPercentage: 0,
  enable: true,
  slug: 'premium-cat-food',
};
const product = { _id: id, ...data };

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CategoryModel.findById.mockResolvedValue(category);
    SubCategoryModel.findById.mockResolvedValue(subCategory);
    ProductModel.populate.mockImplementation(async (value) => value);
    MainImageService.upload.mockResolvedValue({
      key: 'products/main/new.webp',
      mainImage: data.mainImage,
      mainImageThumbnail: data.mainImageThumbnail,
    });
  });

  test('escapeRegex and findOne build safe lookups', async () => {
    expect(ProductService.escapeRegex('food+cat')).toBe('food\\+cat');
    ProductModel.findOne.mockResolvedValue(product);
    await expect(ProductService.findOne({ slug: data.slug })).resolves.toBe(
      product,
    );
    expect(ProductModel.findOne).toHaveBeenCalledWith({ slug: data.slug });
  });

  test('findById returns a product and rejects missing products', async () => {
    ProductModel.findById
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce(null);
    await expect(ProductService.findById(id)).resolves.toBe(product);
    await expect(ProductService.findById(id)).rejects.toThrow('محصول یافت نشد');
  });

  test('validateRelations supports an optional subCategory', async () => {
    await expect(
      ProductService.validateRelations(categoryId, subCategoryId),
    ).resolves.toEqual({ category, subCategory });
    await expect(
      ProductService.validateRelations(categoryId, null),
    ).resolves.toEqual({ category, subCategory: null });
    expect(SubCategoryModel.findById).toHaveBeenCalledTimes(1);
  });

  test('validateRelations rejects missing and mismatched relations', async () => {
    CategoryModel.findById.mockResolvedValueOnce(null);
    await expect(
      ProductService.validateRelations(categoryId, subCategoryId),
    ).rejects.toThrow('دسته‌بندی انتخاب‌شده وجود ندارد');

    SubCategoryModel.findById.mockResolvedValueOnce(null);
    await expect(
      ProductService.validateRelations(categoryId, subCategoryId),
    ).rejects.toThrow('زیر دسته‌بندی انتخاب‌شده وجود ندارد');

    SubCategoryModel.findById.mockResolvedValueOnce({
      ...subCategory,
      category: id,
    });
    await expect(
      ProductService.validateRelations(categoryId, subCategoryId),
    ).rejects.toThrow('متعلق');
  });

  test('ensureUniqueSlug accepts unique slugs and rejects duplicates', async () => {
    ProductModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(product);
    await expect(
      ProductService.ensureUniqueSlug(data.slug),
    ).resolves.toBeUndefined();
    await expect(ProductService.ensureUniqueSlug(data.slug)).rejects.toThrow(
      'نامک',
    );
  });

  test('create validates and saves the product', async () => {
    ProductModel.findOne.mockResolvedValue(null);
    ProductModel.create.mockResolvedValue(product);
    await expect(
      ProductService.create(data, userId, { buffer: Buffer.from('image') }),
    ).resolves.toBe(product);
    expect(ProductModel.create).toHaveBeenCalledWith({
      ...data,
      createdBy: userId,
    });
  });

  test('update validates effective relations and edit delegates', async () => {
    ProductModel.findById.mockResolvedValue(product);
    ProductModel.findByIdAndUpdate.mockResolvedValue({
      ...product,
      subCategory: null,
    });
    await expect(
      ProductService.update(id, { subCategory: null }, userId),
    ).resolves.toMatchObject({ subCategory: null });
    expect(ProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { subCategory: null, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );

    jest.spyOn(ProductService, 'update').mockResolvedValue(product);
    await ProductService.edit(id, { price: 1 }, userId);
    expect(ProductService.update).toHaveBeenCalledWith(
      id,
      { price: 1 },
      userId,
      undefined,
    );
  });

  test('setEnableStatus, enable, and disable update visibility', async () => {
    ProductModel.findById.mockResolvedValue(product);
    ProductModel.findByIdAndUpdate.mockResolvedValue({
      ...product,
      enable: false,
    });
    await expect(
      ProductService.setEnableStatus(id, false, userId),
    ).resolves.toMatchObject({ enable: false });

    const status = jest
      .spyOn(ProductService, 'setEnableStatus')
      .mockResolvedValue(product);
    await ProductService.enable(id, userId);
    await ProductService.disable(id, userId);
    expect(status).toHaveBeenNthCalledWith(1, id, true, userId);
    expect(status).toHaveBeenNthCalledWith(2, id, false, userId);
  });

  test('delete removes products and rejects missing products', async () => {
    ProductModel.findByIdAndDelete
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce(null);
    await expect(ProductService.delete(id)).resolves.toBe(product);
    await expect(ProductService.delete(id)).rejects.toThrow('محصول یافت نشد');
  });

  test('management detail populates both relations', async () => {
    ProductModel.findById.mockResolvedValue(product);
    await expect(ProductService.findManagementById(id)).resolves.toBe(product);
    expect(ProductModel.populate).toHaveBeenCalledWith(product, [
      { path: 'category' },
      { path: 'subCategory' },
    ]);
  });

  test('management and customer lists reuse pagination', async () => {
    getPaginationData.mockResolvedValue({
      result: [product],
      pagination: { totalItems: 1 },
    });
    expect(
      await ProductService.findManagementList({
        page: 1,
        limit: 10,
        includeDisabled: true,
      }),
    ).toMatchObject({ result: [product] });
    expect(
      await ProductService.findCustomerList({ page: 1, limit: 10 }),
    ).toMatchObject({ result: [product] });
    expect(getPaginationData).toHaveBeenLastCalledWith(
      ProductModel,
      expect.objectContaining({ enable: true, page: 1, limit: 10 }),
      '',
      expect.any(Function),
    );
  });

  test('customer detail returns enabled products and rejects hidden ones', async () => {
    ProductModel.findOne
      .mockResolvedValueOnce(product)
      .mockResolvedValueOnce(null);
    await expect(ProductService.findCustomerById(id)).resolves.toBe(product);
    expect(ProductModel.findOne).toHaveBeenCalledWith({
      _id: id,
      enable: true,
    });
    await expect(ProductService.findCustomerById(id)).rejects.toThrow(
      'محصول یافت نشد',
    );
  });

  test('formatters keep management data and separate customer DTOs', () => {
    const populated = { ...product, category, subCategory };
    expect(ProductService.formatManagement(populated).images).toEqual(
      data.images,
    );
    expect(ProductService.formatManagementMany([populated])).toHaveLength(1);

    const list = ProductService.formatCustomerList([populated])[0];
    expect(list).not.toHaveProperty('images');
    expect(list.category).toBe('Food');
    expect(list.subCategory).toBe('Dry Food');

    const detail = ProductService.formatCustomerDetail(populated);
    expect(detail.images).toEqual(data.images);
    expect(detail.category).toMatchObject({ title: 'Food' });
    expect(detail.subCategory).toMatchObject({ title: 'Dry Food' });

    expect(
      ProductService.formatCustomerDetail({
        ...product,
        category,
        subCategory: null,
      }).subCategory,
    ).toBeNull();
  });
});
