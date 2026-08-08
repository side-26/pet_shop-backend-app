jest.mock('#utils/index.js', () => ({
  setErrorResponse: jest.fn((statusCode, data) => {
    const error = new Error(data.message);
    error.statusCode = statusCode;
    error.data = data;
    throw error;
  }),
}));

jest.mock('#entities/petTypes/petTypes.model.js', () => ({
  PetTypeModel: {
    findById: jest.fn(),
  },
}));

jest.mock('./categories.model.js', () => {
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
    CategoryModel: MockModel,
  };
});

import * as categoryUtils from './categories.helpers.js';
import { CategoryModel } from './categories.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

describe('Category Helpers - Unit Tests', () => {
  let mockCategory;
  let mockPetType;

  beforeEach(() => {
    mockPetType = {
      _id: '65a4de97aff1fbb38c437111',
      title: 'Dog',
      isEnabled: true,
    };

    mockCategory = {
      _id: '65a4de97aff1fbb38c437222',
      title: 'Food',
      petType: mockPetType._id,
      enable: true,
      createdBy: '65a4de97aff1fbb38c437952',
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.clearAllMocks();
  });

  test('ensurePetTypeExists returns pet type if exists', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await categoryUtils.ensurePetTypeExists(mockPetType._id);

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findById).toHaveBeenCalledWith(mockPetType._id);
  });

  test('ensurePetTypeExists throws if pet type does not exist', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      categoryUtils.ensurePetTypeExists(mockPetType._id),
    ).rejects.toThrow('نوع حیوان انتخاب شده معتبر نیست');
  });

  test('doesCategoryExist returns category if exists', async () => {
    CategoryModel.findOne.mockResolvedValue(mockCategory);

    const result = await categoryUtils.doesCategoryExist({
      title: 'Food',
      petType: mockPetType._id,
    });

    expect(result).toEqual(mockCategory);

    expect(CategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Food$',
        $options: 'i',
      },
      petType: mockPetType._id,
    });
  });

  test('doesCategoryExist returns null if not exists', async () => {
    CategoryModel.findOne.mockResolvedValue(null);

    const result = await categoryUtils.doesCategoryExist({
      title: 'Toys',
      petType: mockPetType._id,
    });

    expect(result).toBeNull();
  });

  test('doesCategoryExist excludes category id when provided', async () => {
    CategoryModel.findOne.mockResolvedValue(null);

    await categoryUtils.doesCategoryExist({
      title: 'Food',
      petType: mockPetType._id,
      excludeId: mockCategory._id,
    });

    expect(CategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Food$',
        $options: 'i',
      },
      petType: mockPetType._id,
      _id: {
        $ne: mockCategory._id,
      },
    });
  });

  test('getCategoryById returns category', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    const result = await categoryUtils.getCategoryById(mockCategory._id);

    expect(result).toEqual(mockCategory);

    expect(CategoryModel.findById).toHaveBeenCalledWith(mockCategory._id);
  });

  test('getCategoryById throws if not found', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      categoryUtils.getCategoryById(mockCategory._id),
    ).rejects.toThrow('دسته‌بندی یافت نشد');
  });

  test('getCategoryById returns null if not found and throwOnNotFound false', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    const result = await categoryUtils.getCategoryById(mockCategory._id, false);

    expect(result).toBeNull();
  });

  test('createCategory creates new category', async () => {
    const data = {
      title: 'Toys',
      petType: mockPetType._id,
    };

    const userId = '65a4de97aff1fbb38c437952';

    const expected = {
      ...data,
      enable: true,
      createdBy: userId,
    };

    PetTypeModel.findById.mockResolvedValue(mockPetType);
    CategoryModel.findOne.mockResolvedValue(null);

    const instance = {
      ...expected,
      save: jest.fn().mockResolvedValue(expected),
    };

    CategoryModel.mockImplementationOnce(() => instance);

    const result = await categoryUtils.createCategory(data, userId);

    expect(result).toEqual(expected);

    expect(PetTypeModel.findById).toHaveBeenCalledWith(mockPetType._id);

    expect(CategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Toys$',
        $options: 'i',
      },
      petType: mockPetType._id,
    });
  });

  test('createCategory keeps provided enable value', async () => {
    const data = {
      title: 'Toys',
      petType: mockPetType._id,
      enable: false,
    };

    const userId = '65a4de97aff1fbb38c437952';

    PetTypeModel.findById.mockResolvedValue(mockPetType);
    CategoryModel.findOne.mockResolvedValue(null);

    const instance = {
      ...data,
      createdBy: userId,
      save: jest.fn().mockResolvedValue({
        ...data,
        createdBy: userId,
      }),
    };

    CategoryModel.mockImplementationOnce(() => instance);

    const result = await categoryUtils.createCategory(data, userId);

    expect(result.enable).toBe(false);
  });

  test('createCategory throws if category already exists', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);
    CategoryModel.findOne.mockResolvedValue(mockCategory);

    await expect(
      categoryUtils.createCategory(
        {
          title: 'Food',
          petType: mockPetType._id,
        },
        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('updateCategory updates category', async () => {
    const update = {
      title: 'Premium Food',
      petType: mockPetType._id,
    };

    const userId = '65a4de97aff1fbb38c437952';

    const updatedCategory = {
      ...mockCategory,
      ...update,
      updatedBy: userId,
    };

    CategoryModel.findById.mockResolvedValue(mockCategory);
    PetTypeModel.findById.mockResolvedValue(mockPetType);
    CategoryModel.findOne.mockResolvedValue(null);
    CategoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

    const result = await categoryUtils.updateCategory(
      mockCategory._id,
      update,
      userId,
    );

    expect(result.title).toBe('Premium Food');
    expect(result.updatedBy).toBe(userId);

    expect(CategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockCategory._id,
      {
        $set: {
          ...update,
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  test('updateCategory throws if category not found', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      categoryUtils.updateCategory(
        mockCategory._id,
        {
          title: 'Updated',
          petType: mockPetType._id,
        },
        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('دسته‌بندی یافت نشد');
  });

  test('updateCategory throws if pet type not found', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      categoryUtils.updateCategory(
        mockCategory._id,
        {
          title: 'Updated',
          petType: mockPetType._id,
        },
        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('نوع حیوان انتخاب شده معتبر نیست');
  });

  test('updateCategory throws if duplicate category exists', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);
    PetTypeModel.findById.mockResolvedValue(mockPetType);
    CategoryModel.findOne.mockResolvedValue({
      ...mockCategory,
      _id: '65a4de97aff1fbb38c437333',
    });

    await expect(
      categoryUtils.updateCategory(
        mockCategory._id,
        {
          title: 'Food',
          petType: mockPetType._id,
        },
        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('setCategoryEnableStatus sets enable to false', async () => {
    const userId = '65a4de97aff1fbb38c437952';

    CategoryModel.findById.mockResolvedValue(mockCategory);

    CategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockCategory,
      enable: false,
      updatedBy: userId,
    });

    const result = await categoryUtils.setCategoryEnableStatus(
      mockCategory._id,
      false,
      userId,
    );

    expect(result.enable).toBe(false);

    expect(CategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockCategory._id,
      {
        $set: {
          enable: false,
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  test('setCategoryEnableStatus sets enable to true', async () => {
    const userId = '65a4de97aff1fbb38c437952';

    CategoryModel.findById.mockResolvedValue({
      ...mockCategory,
      enable: false,
    });

    CategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockCategory,
      enable: true,
      updatedBy: userId,
    });

    const result = await categoryUtils.setCategoryEnableStatus(
      mockCategory._id,
      true,
      userId,
    );

    expect(result.enable).toBe(true);
  });

  test('setCategoryEnableStatus throws if category not found', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      categoryUtils.setCategoryEnableStatus(
        mockCategory._id,
        false,
        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('دسته‌بندی یافت نشد');
  });

  test('deleteCategoryById deletes category', async () => {
    CategoryModel.findByIdAndDelete.mockResolvedValue(mockCategory);

    const result = await categoryUtils.deleteCategoryById(mockCategory._id);

    expect(result).toEqual(mockCategory);

    expect(CategoryModel.findByIdAndDelete).toHaveBeenCalledWith(
      mockCategory._id,
    );
  });

  test('deleteCategoryById throws if category not found', async () => {
    CategoryModel.findByIdAndDelete.mockResolvedValue(null);

    await expect(
      categoryUtils.deleteCategoryById(mockCategory._id),
    ).rejects.toThrow('دسته‌بندی یافت نشد');
  });

  test('getAllCategories returns enabled by default', async () => {
    const list = [
      mockCategory,
      {
        ...mockCategory,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Toys',
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    CategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await categoryUtils.getAllCategories();

    expect(result).toEqual(list);

    expect(CategoryModel.find).toHaveBeenCalledWith({
      enable: true,
    });

    expect(sortMock).toHaveBeenCalledWith({
      createdAt: 1,
    });
  });

  test('getAllCategories returns all when includeDisabled true', async () => {
    const list = [
      mockCategory,
      {
        ...mockCategory,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Toys',
        enable: false,
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    CategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await categoryUtils.getAllCategories({
      includeDisabled: true,
    });

    expect(result).toEqual(list);

    expect(CategoryModel.find).toHaveBeenCalledWith({});
  });

  test('getAllCategories filters by petType', async () => {
    const list = [mockCategory];

    const sortMock = jest.fn().mockResolvedValue(list);

    CategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await categoryUtils.getAllCategories({
      petType: mockPetType._id,
    });

    expect(result).toEqual(list);

    expect(CategoryModel.find).toHaveBeenCalledWith({
      enable: true,
      petType: mockPetType._id,
    });
  });

  test('formatCategoryResponse formats object', () => {
    const formatted = categoryUtils.formatCategoryResponse(mockCategory);

    expect(formatted).toMatchObject({
      id: mockCategory._id,
      title: mockCategory.title,
      petType: mockCategory.petType,
      enable: mockCategory.enable,
    });

    expect(formatted).toHaveProperty('createdAt');
  });

  test('formatCategoryResponse returns null for null input', () => {
    expect(categoryUtils.formatCategoryResponse(null)).toBeNull();
  });

  test('formatCategoriesResponse formats array', () => {
    const list = [
      mockCategory,
      {
        ...mockCategory,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Toys',
      },
    ];

    const result = categoryUtils.formatCategoriesResponse(list);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
  });
});
