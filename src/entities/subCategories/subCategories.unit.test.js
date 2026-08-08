jest.mock('#utils/index.js', () => ({
  setErrorResponse: jest.fn((statusCode, data) => {
    const error = new Error(data.message);

    error.statusCode = statusCode;
    error.data = data;

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

  MockModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  });

  MockModel.findByIdAndUpdate = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();

  return {
    SubCategoryModel: MockModel,
  };
});

import { CategoryModel } from '#entities/categories/categories.model.js';

import * as subCategoryUtils from './subCategories.helpers.js';
import { SubCategoryModel } from './subCategories.model.js';

describe('SubCategory Helpers - Unit Tests', () => {
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
      categoryID: mockCategory._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.clearAllMocks();
  });

  // =========================================================
  // ensureCategoryExists
  // =========================================================

  test('ensureCategoryExists returns category if exists', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    const result = await subCategoryUtils.ensureCategoryExists(
      mockCategory._id,
    );

    expect(result).toEqual(mockCategory);

    expect(CategoryModel.findById).toHaveBeenCalledWith(mockCategory._id);
  });

  test('ensureCategoryExists throws if category does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      subCategoryUtils.ensureCategoryExists(mockCategory._id),
    ).rejects.toThrow('دسته‌بندی انتخاب شده معتبر نیست');
  });

  // =========================================================
  // doesSubCategoryExist
  // =========================================================

  test('doesSubCategoryExist returns sub category if exists', async () => {
    SubCategoryModel.findOne.mockResolvedValue(mockSubCategory);

    const result = await subCategoryUtils.doesSubCategoryExist({
      title: 'Dry Food',
      categoryID: mockCategory._id,
    });

    expect(result).toEqual(mockSubCategory);

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Dry Food$',
        $options: 'i',
      },
      categoryID: mockCategory._id,
    });
  });

  test('doesSubCategoryExist returns null if not exists', async () => {
    SubCategoryModel.findOne.mockResolvedValue(null);

    const result = await subCategoryUtils.doesSubCategoryExist({
      title: 'Wet Food',
      categoryID: mockCategory._id,
    });

    expect(result).toBeNull();
  });

  test('doesSubCategoryExist performs case insensitive title search', async () => {
    SubCategoryModel.findOne.mockResolvedValue(mockSubCategory);

    await subCategoryUtils.doesSubCategoryExist({
      title: 'dry food',
      categoryID: mockCategory._id,
    });

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^dry food$',
        $options: 'i',
      },
      categoryID: mockCategory._id,
    });
  });

  test('doesSubCategoryExist excludes current id when excludeId exists', async () => {
    SubCategoryModel.findOne.mockResolvedValue(null);

    await subCategoryUtils.doesSubCategoryExist({
      title: 'Dry Food',
      categoryID: mockCategory._id,
      excludeId: mockSubCategory._id,
    });

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Dry Food$',
        $options: 'i',
      },
      categoryID: mockCategory._id,
      _id: {
        $ne: mockSubCategory._id,
      },
    });
  });

  // =========================================================
  // getSubCategoryById
  // =========================================================

  test('getSubCategoryById returns sub category', async () => {
    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    const result = await subCategoryUtils.getSubCategoryById(
      mockSubCategory._id,
    );

    expect(result).toEqual(mockSubCategory);

    expect(SubCategoryModel.findById).toHaveBeenCalledWith(mockSubCategory._id);
  });

  test('getSubCategoryById throws if not found', async () => {
    SubCategoryModel.findById.mockResolvedValue(null);

    await expect(
      subCategoryUtils.getSubCategoryById(mockSubCategory._id),
    ).rejects.toThrow('زیر دسته‌بندی یافت نشد');
  });

  test('getSubCategoryById returns null when throwOnNotFound is false', async () => {
    SubCategoryModel.findById.mockResolvedValue(null);

    const result = await subCategoryUtils.getSubCategoryById(
      mockSubCategory._id,
      false,
    );

    expect(result).toBeNull();
  });

  // =========================================================
  // createSubCategory
  // =========================================================

  test('createSubCategory creates new sub category', async () => {
    const data = {
      title: 'Wet Food',
      categoryID: mockCategory._id,
    };

    const expected = {
      ...data,
    };

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(null);

    const instance = {
      ...expected,
      save: jest.fn().mockResolvedValue(expected),
    };

    SubCategoryModel.mockImplementationOnce(() => instance);

    const result = await subCategoryUtils.createSubCategory(data);

    expect(result).toEqual(expected);

    expect(CategoryModel.findById).toHaveBeenCalledWith(mockCategory._id);

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Wet Food$',
        $options: 'i',
      },
      categoryID: mockCategory._id,
    });
  });

  test('createSubCategory throws if category does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      subCategoryUtils.createSubCategory({
        title: 'Wet Food',
        categoryID: mockCategory._id,
      }),
    ).rejects.toThrow('دسته‌بندی انتخاب شده معتبر نیست');
  });

  test('createSubCategory throws if duplicate exists', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(mockSubCategory);

    await expect(
      subCategoryUtils.createSubCategory({
        title: 'Dry Food',
        categoryID: mockCategory._id,
      }),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  // =========================================================
  // updateSubCategory
  // =========================================================

  test('updateSubCategory updates sub category', async () => {
    const update = {
      title: 'Premium Dry Food',
      categoryID: mockCategory._id,
    };

    const expected = {
      ...mockSubCategory,
      ...update,
    };

    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(null);

    SubCategoryModel.findByIdAndUpdate.mockResolvedValue(expected);

    const result = await subCategoryUtils.updateSubCategory(
      mockSubCategory._id,
      update,
    );

    expect(result.title).toBe('Premium Dry Food');

    expect(SubCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockSubCategory._id,
      {
        $set: {
          ...update,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  test('updateSubCategory throws if sub category does not exist', async () => {
    SubCategoryModel.findById.mockResolvedValue(null);

    await expect(
      subCategoryUtils.updateSubCategory(mockSubCategory._id, {
        title: 'Updated',
        categoryID: mockCategory._id,
      }),
    ).rejects.toThrow('زیر دسته‌بندی یافت نشد');
  });

  test('updateSubCategory throws if category does not exist', async () => {
    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      subCategoryUtils.updateSubCategory(mockSubCategory._id, {
        title: 'Updated',
        categoryID: mockCategory._id,
      }),
    ).rejects.toThrow('دسته‌بندی انتخاب شده معتبر نیست');
  });

  test('updateSubCategory throws if duplicate exists', async () => {
    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue({
      _id: '65a4de97aff1fbb38c437333',
      title: 'Wet Food',
      categoryID: mockCategory._id,
    });

    await expect(
      subCategoryUtils.updateSubCategory(mockSubCategory._id, {
        title: 'Wet Food',
        categoryID: mockCategory._id,
      }),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('updateSubCategory excludes itself from duplicate query', async () => {
    SubCategoryModel.findById.mockResolvedValue(mockSubCategory);

    CategoryModel.findById.mockResolvedValue(mockCategory);

    SubCategoryModel.findOne.mockResolvedValue(null);

    SubCategoryModel.findByIdAndUpdate.mockResolvedValue(mockSubCategory);

    await subCategoryUtils.updateSubCategory(mockSubCategory._id, {
      title: 'Dry Food',
      categoryID: mockCategory._id,
    });

    expect(SubCategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Dry Food$',
        $options: 'i',
      },
      categoryID: mockCategory._id,
      _id: {
        $ne: mockSubCategory._id,
      },
    });
  });

  // =========================================================
  // deleteSubCategoryById
  // =========================================================

  test('deleteSubCategoryById deletes sub category', async () => {
    SubCategoryModel.findByIdAndDelete.mockResolvedValue(mockSubCategory);

    const result = await subCategoryUtils.deleteSubCategoryById(
      mockSubCategory._id,
    );

    expect(result).toEqual(mockSubCategory);

    expect(SubCategoryModel.findByIdAndDelete).toHaveBeenCalledWith(
      mockSubCategory._id,
    );
  });

  test('deleteSubCategoryById throws if not found', async () => {
    SubCategoryModel.findByIdAndDelete.mockResolvedValue(null);

    await expect(
      subCategoryUtils.deleteSubCategoryById(mockSubCategory._id),
    ).rejects.toThrow('زیر دسته‌بندی یافت نشد');
  });

  // =========================================================
  // getAllSubCategories
  // =========================================================

  test('getAllSubCategories returns all sub categories', async () => {
    const list = [
      mockSubCategory,
      {
        ...mockSubCategory,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Wet Food',
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    SubCategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await subCategoryUtils.getAllSubCategories();

    expect(result).toEqual(list);

    expect(SubCategoryModel.find).toHaveBeenCalledWith({});

    expect(sortMock).toHaveBeenCalledWith({
      createdAt: 1,
    });
  });

  test('getAllSubCategories filters by categoryID', async () => {
    const list = [mockSubCategory];

    const sortMock = jest.fn().mockResolvedValue(list);

    SubCategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await subCategoryUtils.getAllSubCategories({
      categoryID: mockCategory._id,
    });

    expect(result).toEqual(list);

    expect(SubCategoryModel.find).toHaveBeenCalledWith({
      categoryID: mockCategory._id,
    });
  });

  // =========================================================
  // response formatting
  // =========================================================

  test('formatSubCategoryResponse formats object', () => {
    const formatted =
      subCategoryUtils.formatSubCategoryResponse(mockSubCategory);

    expect(formatted).toMatchObject({
      id: mockSubCategory._id,
      title: mockSubCategory.title,
      categoryID: mockSubCategory.categoryID,
    });

    expect(formatted).toHaveProperty('createdAt');
    expect(formatted).toHaveProperty('updatedAt');
  });

  test('formatSubCategoryResponse returns null for null input', () => {
    expect(subCategoryUtils.formatSubCategoryResponse(null)).toBeNull();
  });

  test('formatSubCategoriesResponse formats array', () => {
    const list = [
      mockSubCategory,
      {
        ...mockSubCategory,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Wet Food',
      },
    ];

    const result = subCategoryUtils.formatSubCategoriesResponse(list);

    expect(result).toHaveLength(2);

    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('categoryID');
  });
});
