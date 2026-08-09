jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');

    error.statusCode = statusCode;

    Object.assign(error, options);

    throw error;
  }),
}));

jest.mock('#entities/categories/categories.model.js', () => ({
  CategoryModel: {
    findById: jest.fn(),
  },
}));

jest.mock('./subCategories.model.js', () => {
  const MockModel = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);

    this.save = jest.fn().mockResolvedValue(this);

    return this;
  });

  MockModel.findOne = jest.fn();

  MockModel.findById = jest.fn();

  MockModel.find = jest.fn();

  MockModel.findByIdAndUpdate = jest.fn();

  MockModel.findByIdAndDelete = jest.fn();

  return {
    SubCategoryModel: MockModel,
  };
});

import { CategoryModel } from '#entities/categories/categories.model.js';

import { SubCategoryModel } from './subCategories.model.js';

import { SubCategoryService } from './subCategories.service.js';

describe('SubCategoryService - Unit Tests', () => {
  let mockCategory;
  let mockSubCategory;

  beforeEach(() => {
    mockCategory = {
      _id: '65a4de97aff1fbb38c437111',

      title: 'Food',
    };

    mockSubCategory = {
      _id: '65a4de97aff1fbb38c437222',

      title: 'Dry Food',

      category: mockCategory._id,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    jest.clearAllMocks();
  });

  test('ensureCategoryExists returns category', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    const result = await SubCategoryService.ensureCategoryExists(
      mockCategory._id,
    );

    expect(result).toEqual(mockCategory);
  });

  test('ensureCategoryExists throws if category not found', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      SubCategoryService.ensureCategoryExists(mockCategory._id),
    ).rejects.toThrow('دسته‌بندی انتخاب شده معتبر نیست');
  });

  test('findOne returns sub category', async () => {
    SubCategoryModel.findOne.mockResolvedValue(mockSubCategory);

    const result = await SubCategoryService.findOne({
      title: 'Dry Food',

      category: mockCategory._id,
    });

    expect(result).toEqual(mockSubCategory);

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Dry Food$',

        $options: 'i',
      },

      category: mockCategory._id,
    });
  });

  test('findOne returns null', async () => {
    SubCategoryModel.findOne.mockResolvedValue(null);

    const result = await SubCategoryService.findOne({
      title: 'Unknown',

      category: mockCategory._id,
    });

    expect(result).toBeNull();
  });

  test('findOne supports excludeId', async () => {
    SubCategoryModel.findOne.mockResolvedValue(null);

    await SubCategoryService.findOne({
      title: 'Dry Food',

      category: mockCategory._id,

      excludeId: mockSubCategory._id,
    });

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Dry Food$',

        $options: 'i',
      },

      category: mockCategory._id,

      _id: {
        $ne: mockSubCategory._id,
      },
    });
  });

  test('findById returns sub category', async () => {
    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    const result = await SubCategoryService.findById(mockSubCategory._id);

    expect(result).toEqual(mockSubCategory);
  });

  test('findById throws when id missing', async () => {
    await expect(SubCategoryService.findById()).rejects.toThrow(
      'شناسه زیر دسته‌بندی معتبر نیست',
    );
  });

  test('findById throws when not found', async () => {
    SubCategoryModel.findById.mockResolvedValue(null);

    await expect(
      SubCategoryService.findById(mockSubCategory._id),
    ).rejects.toThrow('زیر دسته‌بندی یافت نشد');
  });

  test('findById returns null when throwOnNotFound=false', async () => {
    SubCategoryModel.findById.mockResolvedValue(null);

    const result = await SubCategoryService.findById(
      mockSubCategory._id,
      false,
    );

    expect(result).toBeNull();
  });

  test('create creates sub category', async () => {
    const data = {
      title: 'Wet Food',

      category: mockCategory._id,
    };

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(null);

    const instance = {
      ...data,

      save: jest.fn().mockResolvedValue(data),
    };

    SubCategoryModel.mockImplementationOnce(() => instance);

    const result = await SubCategoryService.create(data);

    expect(result).toEqual(data);

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Wet Food$',

        $options: 'i',
      },

      category: mockCategory._id,
    });
  });

  test('create throws if duplicate exists', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(mockSubCategory);

    await expect(
      SubCategoryService.create({
        title: 'Dry Food',

        category: mockCategory._id,
      }),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('update updates sub category', async () => {
    const update = {
      title: 'Premium Food',

      category: mockCategory._id,
    };

    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(null);

    SubCategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockSubCategory,
      ...update,
    });

    const result = await SubCategoryService.update(mockSubCategory._id, update);

    expect(result.title).toBe('Premium Food');

    expect(SubCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockSubCategory._id,

      {
        $set: {
          ...update,
        },
      },

      {
        returnDocument: 'after',

        runValidators: true,
      },
    );
  });

  test('update throws if duplicate exists', async () => {
    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue({
      ...mockSubCategory,

      _id: '65a4de97aff1fbb38c437999',
    });

    await expect(
      SubCategoryService.update(
        mockSubCategory._id,

        {
          title: 'Dry Food',

          category: mockCategory._id,
        },
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('delete deletes sub category', async () => {
    SubCategoryModel.findByIdAndDelete.mockResolvedValue(mockSubCategory);

    const result = await SubCategoryService.delete(mockSubCategory._id);

    expect(result).toEqual(mockSubCategory);
  });

  test('delete throws if not found', async () => {
    SubCategoryModel.findByIdAndDelete.mockResolvedValue(null);

    await expect(
      SubCategoryService.delete(mockSubCategory._id),
    ).rejects.toThrow('زیر دسته‌بندی یافت نشد');
  });

  test('findAll returns all', async () => {
    const list = [mockSubCategory];

    const sort = jest.fn().mockResolvedValue(list);

    SubCategoryModel.find.mockReturnValue({
      sort,
    });

    const result = await SubCategoryService.findAll();

    expect(result).toEqual(list);

    expect(SubCategoryModel.find).toHaveBeenCalledWith({});
  });

  test('findAll filters by category', async () => {
    const list = [mockSubCategory];

    const sort = jest.fn().mockResolvedValue(list);

    SubCategoryModel.find.mockReturnValue({
      sort,
    });

    const result = await SubCategoryService.findAll({
      category: mockCategory._id,
    });

    expect(result).toEqual(list);

    expect(SubCategoryModel.find).toHaveBeenCalledWith({
      category: mockCategory._id,
    });
  });

  test('format returns formatted object', () => {
    const result = SubCategoryService.format(mockSubCategory);

    expect(result).toMatchObject({
      id: mockSubCategory._id,

      title: mockSubCategory.title,

      category: mockSubCategory.category,
    });
  });

  test('format returns null', () => {
    expect(SubCategoryService.format(null)).toBeNull();
  });

  test('formatMany formats array', () => {
    const result = SubCategoryService.formatMany([mockSubCategory]);

    expect(result).toHaveLength(1);

    expect(result[0]).toHaveProperty('category');
  });
});
