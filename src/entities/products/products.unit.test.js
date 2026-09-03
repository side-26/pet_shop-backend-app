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
    uploadImages: jest.fn(),
    cleanup: jest.fn(),
    cleanupMany: jest.fn(),
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
  isEnable: true,
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
  isEnable: true,
  slug: 'premium-cat-food',
};
const product = { _id: id, ...data };

describe('ProductService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    CategoryModel.findById.mockResolvedValue(category);
    SubCategoryModel.findById.mockResolvedValue(subCategory);
    ProductModel.populate.mockImplementation(async (value) => value);
    MainImageService.upload.mockResolvedValue({
      key: 'products/main/new.webp',
      mainImage: data.mainImage,
      mainImageThumbnail: data.mainImageThumbnail,
    });
    MainImageService.uploadImages.mockResolvedValue([
      { key: 'products/images/one.webp', url: data.images[0] },
    ]);
  });

  test('escapeRegex escapes special characters', () => {
    expect(ProductService.escapeRegex('food+cat')).toBe('food\\+cat');
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

  test('create validates and saves the product', async () => {
    ProductModel.create.mockResolvedValue(product);
    await expect(
      ProductService.create(data, userId, { buffer: Buffer.from('image') }, [
        { buffer: Buffer.from('gallery-image') },
      ]),
    ).resolves.toBe(product);
    expect(ProductModel.create).toHaveBeenCalledWith({
      ...data,
      createdBy: userId,
    });
    expect(MainImageService.uploadImages).toHaveBeenCalledWith(
      [{ buffer: Buffer.from('gallery-image') }],
      'products/images',
    );
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
    );
  });

  test('updateImages replaces the full image set and cleans up previous objects', async () => {
    const images = ['https://cdn.example.com/two.webp'];
    ProductModel.findById.mockResolvedValue(product);
    ProductModel.findByIdAndUpdate.mockResolvedValue({ ...product, images });
    MainImageService.uploadImages.mockResolvedValue([
      { key: 'products/images/two.webp', url: images[0] },
    ]);
    MainImageService.getStoredKey
      .mockReturnValueOnce('products/main/previous.webp')
      .mockReturnValueOnce('products/images/previous.webp');

    await expect(
      ProductService.updateImages(
        id,
        userId,
        { buffer: Buffer.from('replacement') },
        [{ buffer: Buffer.from('gallery-replacement') }],
      ),
    ).resolves.toMatchObject({ images });
    expect(MainImageService.cleanupMany).toHaveBeenCalledWith(
      ['products/main/previous.webp', 'products/images/previous.webp'],
      { id, userId },
    );
  });

  test('updatePrice changes only price fields', async () => {
    ProductModel.findById.mockResolvedValue(product);
    ProductModel.findByIdAndUpdate.mockResolvedValue({
      ...product,
      price: 100,
      discountPercentage: 5,
    });
    await ProductService.updatePrice(
      id,
      { price: 100, discountPercentage: 5 },
      userId,
    );
    expect(ProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { price: 100, discountPercentage: 5, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
  });

  test('setEnableStatus, enable, and disable update visibility', async () => {
    ProductModel.findById.mockResolvedValue(product);
    ProductModel.findByIdAndUpdate.mockResolvedValue({
      ...product,
      isEnable: false,
    });
    await expect(
      ProductService.setEnableStatus(id, false, userId),
    ).resolves.toMatchObject({ isEnable: false });
    expect(ProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { isEnable: false, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );

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
    MainImageService.getStoredKey
      .mockReturnValueOnce('products/main/deleted.webp')
      .mockReturnValueOnce('products/images/deleted.webp');
    await expect(ProductService.delete(id)).resolves.toBe(product);
    expect(MainImageService.cleanupMany).toHaveBeenCalledWith(
      ['products/main/deleted.webp', 'products/images/deleted.webp'],
      { id },
    );
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

  test('section getters return product image and price data', async () => {
    ProductModel.findById.mockResolvedValue(product);
    await expect(ProductService.findImagesById(id)).resolves.toBe(product);
    await expect(ProductService.findPriceById(id)).resolves.toBe(product);
    await expect(ProductService.findMainInfoById(id)).resolves.toBe(product);
    expect(ProductModel.populate).toHaveBeenCalledWith(product, [
      { path: 'category' },
      { path: 'subCategory' },
    ]);
    expect(ProductService.formatImages(product)).toMatchObject({
      imagesList: data.images,
    });
    expect(ProductService.formatPrice(product)).toEqual({
      price: data.price,
      discountPercentage: data.discountPercentage,
    });
    expect(ProductService.formatMainInfo(product)).toEqual({
      title: data.title,
      category: categoryId,
      subCategory: subCategoryId,
      quantity: data.quantity,
      summary: undefined,
      description: data.description,
    });
  });

  test('main-info updates reuse product relation validation', async () => {
    ProductModel.findById.mockResolvedValue(product);
    ProductModel.findByIdAndUpdate.mockResolvedValue({
      ...product,
      title: 'Edited product',
    });
    await expect(
      ProductService.updateMainInfo(id, { title: 'Edited product' }, userId),
    ).resolves.toMatchObject({ title: 'Edited product' });
    expect(ProductModel.populate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Edited product' }),
      [{ path: 'category' }, { path: 'subCategory' }],
    );
    expect(ProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { title: 'Edited product', updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
  });

  test('management and customer lists reuse pagination with their filters', async () => {
    getPaginationData.mockResolvedValue({
      result: [product],
      pagination: { totalItems: 1 },
    });
    expect(
      await ProductService.findManagementList({
        title: 'Premium+',
        category: categoryId,
        subCategory: subCategoryId,
        price: 250000,
        quantity: 5,
        isEnable: false,
        page: 1,
        limit: 10,
        includeDisabled: true,
      }),
    ).toMatchObject({ result: [product] });
    expect(
      await ProductService.findCustomerList({ page: 1, limit: 10 }),
    ).toMatchObject({ result: [product] });
    expect(getPaginationData).toHaveBeenNthCalledWith(
      1,
      ProductModel,
      expect.objectContaining({
        title: { $regex: 'Premium\\+', $options: 'i' },
        category: categoryId,
        subCategory: subCategoryId,
        price: 250000,
        quantity: 5,
        isEnable: false,
        page: 1,
        limit: 10,
      }),
      '',
      expect.any(Function),
    );
    expect(getPaginationData).toHaveBeenLastCalledWith(
      ProductModel,
      expect.objectContaining({ isEnable: true, page: 1, limit: 10 }),
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
      isEnable: true,
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
