// src/entities/categories/categories.unit.test.js

jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');

    error.statusCode = statusCode;

    Object.assign(error, options);

    throw error;
  }),
}));

jest.mock('#entities/petTypes/petTypes.model.js', () => ({
  PetTypeModel: {
    findById: jest.fn(),
  },
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: {
    upload: jest.fn().mockResolvedValue({
      key: 'categories/main/image.webp',
      mainImage: 'https://cdn.example.com/categories/main/image.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
    }),
    cleanup: jest.fn(),
    getStoredKey: jest.fn(),
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

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { CategoryModel } from './categories.model.js';

import { CategoryService } from './categories.service.js';

describe('CategoryService - Unit Tests', () => {
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
      isEnable: true,
      createdBy: '65a4de97aff1fbb38c437952',
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.clearAllMocks();
  });

  // =========================================================
  // ESCAPE REGEX
  // =========================================================

  test('escapeRegex escapes special regex characters', () => {
    const result = CategoryService.escapeRegex('Food+Toy');

    expect(result).toBe('Food\\+Toy');
  });

  // =========================================================
  // ENSURE PET TYPE EXISTS
  // =========================================================

  test('ensurePetTypeExists returns pet type if exists', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await CategoryService.ensurePetTypeExists(mockPetType._id);

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findById).toHaveBeenCalledWith(mockPetType._id);
  });

  test('ensurePetTypeExists throws if pet type does not exist', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      CategoryService.ensurePetTypeExists(mockPetType._id),
    ).rejects.toThrow('نوع حیوان انتخاب شده معتبر نیست');
  });

  // =========================================================
  // FIND ONE
  // =========================================================

  test('findOne returns category if exists', async () => {
    CategoryModel.findOne.mockResolvedValue(mockCategory);

    const result = await CategoryService.findOne({
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

  test('findOne returns null if category does not exist', async () => {
    CategoryModel.findOne.mockResolvedValue(null);

    const result = await CategoryService.findOne({
      title: 'Toys',
      petType: mockPetType._id,
    });

    expect(result).toBeNull();
  });

  test('findOne preserves excludeId', async () => {
    CategoryModel.findOne.mockResolvedValue(null);

    await CategoryService.findOne({
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

  test('findOne preserves non-title filters', async () => {
    CategoryModel.findOne.mockResolvedValue(mockCategory);

    await CategoryService.findOne({
      petType: mockPetType._id,
    });

    expect(CategoryModel.findOne).toHaveBeenCalledWith({
      petType: mockPetType._id,
    });
  });

  // =========================================================
  // FIND BY ID
  // =========================================================

  test('findById returns category', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    const result = await CategoryService.findById(mockCategory._id);

    expect(result).toEqual(mockCategory);

    expect(CategoryModel.findById).toHaveBeenCalledWith(mockCategory._id);
  });

  test('findById throws if id is missing', async () => {
    await expect(CategoryService.findById()).rejects.toThrow(
      'شناسه دسته‌بندی معتبر نیست',
    );
  });

  test('findById throws if category does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(CategoryService.findById(mockCategory._id)).rejects.toThrow(
      'دسته‌بندی یافت نشد',
    );
  });

  test('findById returns null when throwOnNotFound is false', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    const result = await CategoryService.findById(mockCategory._id, false);

    expect(result).toBeNull();
  });

  // =========================================================
  // CREATE
  // =========================================================

  test('create creates new category', async () => {
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

    const result = await CategoryService.create(data, userId);

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

  test('create uses default enable=true', async () => {
    const data = {
      title: 'Toys',
      petType: mockPetType._id,
    };

    const userId = '65a4de97aff1fbb38c437952';

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    CategoryModel.findOne.mockResolvedValue(null);

    const instance = {
      ...data,

      enable: true,

      createdBy: userId,

      save: jest.fn().mockResolvedValue({
        ...data,
        enable: true,
        createdBy: userId,
      }),
    };

    CategoryModel.mockImplementationOnce(() => instance);

    const result = await CategoryService.create(data, userId);

    expect(result.enable).toBe(true);
  });

  test('create keeps provided enable=false', async () => {
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

    const result = await CategoryService.create(data, userId);

    expect(result.enable).toBe(false);
  });

  test('create throws if pet type does not exist', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      CategoryService.create(
        {
          title: 'Toys',
          petType: mockPetType._id,
        },

        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('نوع حیوان انتخاب شده معتبر نیست');
  });

  test('create throws if category already exists', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);

    CategoryModel.findOne.mockResolvedValue(mockCategory);

    await expect(
      CategoryService.create(
        {
          title: 'Food',
          petType: mockPetType._id,
        },

        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('create checks duplicate title case-insensitively', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);

    CategoryModel.findOne.mockResolvedValue(mockCategory);

    await expect(
      CategoryService.create(
        {
          title: 'food',
          petType: mockPetType._id,
        },

        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');

    expect(CategoryModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^food$',
        $options: 'i',
      },

      petType: mockPetType._id,
    });
  });

  // =========================================================
  // UPDATE
  // =========================================================

  test('update updates category', async () => {
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

    const result = await CategoryService.update(
      mockCategory._id,
      update,
      userId,
    );

    expect(result.title).toBe('Premium Food');

    expect(result.updatedBy).toBe(userId);

    expect(CategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockCategory._id,

      expect.objectContaining({
        $set: expect.objectContaining({
          ...update,
          mainImage: expect.any(String),
          mainThumbnailImage: expect.any(String),
          updatedBy: userId,
        }),
      }),

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  test('update throws if category does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      CategoryService.update(
        mockCategory._id,

        {
          title: 'Updated',
          petType: mockPetType._id,
        },

        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('دسته‌بندی یافت نشد');
  });

  test('update throws if pet type does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      CategoryService.update(
        mockCategory._id,

        {
          title: 'Updated',
          petType: mockPetType._id,
        },

        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('نوع حیوان انتخاب شده معتبر نیست');
  });

  test('update throws if duplicate category exists', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    CategoryModel.findOne.mockResolvedValue({
      ...mockCategory,
      _id: '65a4de97aff1fbb38c437333',
    });

    await expect(
      CategoryService.update(
        mockCategory._id,

        {
          title: 'Food',
          petType: mockPetType._id,
        },

        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('update excludes current category from duplicate query', async () => {
    CategoryModel.findById.mockResolvedValue(mockCategory);

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    CategoryModel.findOne.mockResolvedValue(null);

    CategoryModel.findByIdAndUpdate.mockResolvedValue(mockCategory);

    await CategoryService.update(
      mockCategory._id,

      {
        title: 'Food',
        petType: mockPetType._id,
      },

      '65a4de97aff1fbb38c437952',
    );

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

  // =========================================================
  // SET ENABLE STATUS
  // =========================================================

  test('setEnableStatus sets enable=false', async () => {
    const userId = '65a4de97aff1fbb38c437952';

    CategoryModel.findById.mockResolvedValue(mockCategory);

    CategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockCategory,
      isEnable: false,
      updatedBy: userId,
    });

    const result = await CategoryService.setEnableStatus(
      mockCategory._id,
      false,
      userId,
    );

    expect(result.isEnable).toBe(false);

    expect(CategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockCategory._id,

      {
        $set: {
          isEnable: false,
          updatedBy: userId,
        },
      },

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  test('setEnableStatus sets enable=true', async () => {
    const userId = '65a4de97aff1fbb38c437952';

    CategoryModel.findById.mockResolvedValue({
      ...mockCategory,
      isEnable: false,
    });

    CategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockCategory,
      isEnable: true,
      updatedBy: userId,
    });

    const result = await CategoryService.setEnableStatus(
      mockCategory._id,
      true,
      userId,
    );

    expect(result.isEnable).toBe(true);
  });

  test('setEnableStatus throws if category does not exist', async () => {
    CategoryModel.findById.mockResolvedValue(null);

    await expect(
      CategoryService.setEnableStatus(
        mockCategory._id,
        false,
        '65a4de97aff1fbb38c437952',
      ),
    ).rejects.toThrow('دسته‌بندی یافت نشد');
  });

  // =========================================================
  // ENABLE
  // =========================================================

  test('enable enables category', async () => {
    const userId = '65a4de97aff1fbb38c437952';

    CategoryModel.findById.mockResolvedValue({
      ...mockCategory,
      isEnable: false,
    });

    CategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockCategory,
      isEnable: true,
      updatedBy: userId,
    });

    const result = await CategoryService.enable(mockCategory._id, userId);

    expect(result.isEnable).toBe(true);

    expect(CategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockCategory._id,

      {
        $set: {
          isEnable: true,
          updatedBy: userId,
        },
      },

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  // =========================================================
  // DISABLE
  // =========================================================

  test('disable disables category', async () => {
    const userId = '65a4de97aff1fbb38c437952';

    CategoryModel.findById.mockResolvedValue(mockCategory);

    CategoryModel.findByIdAndUpdate.mockResolvedValue({
      ...mockCategory,
      isEnable: false,
      updatedBy: userId,
    });

    const result = await CategoryService.disable(mockCategory._id, userId);

    expect(result.isEnable).toBe(false);

    expect(CategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      mockCategory._id,

      {
        $set: {
          isEnable: false,
          updatedBy: userId,
        },
      },

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  });

  // =========================================================
  // DELETE
  // =========================================================

  test('delete deletes category', async () => {
    CategoryModel.findByIdAndDelete.mockResolvedValue(mockCategory);

    const result = await CategoryService.delete(mockCategory._id);

    expect(result).toEqual(mockCategory);

    expect(CategoryModel.findByIdAndDelete).toHaveBeenCalledWith(
      mockCategory._id,
    );
  });

  test('delete throws if category does not exist', async () => {
    CategoryModel.findByIdAndDelete.mockResolvedValue(null);

    await expect(CategoryService.delete(mockCategory._id)).rejects.toThrow(
      'دسته‌بندی یافت نشد',
    );
  });

  // =========================================================
  // FIND ALL
  // =========================================================

  test('findAll returns enabled categories by default', async () => {
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

    const result = await CategoryService.findAll();

    expect(result).toEqual(list);

    expect(CategoryModel.find).toHaveBeenCalledWith({
      isEnable: true,
    });

    expect(sortMock).toHaveBeenCalledWith({
      createdAt: 1,
    });
  });

  test('findAll returns all categories when includeDisabled=true', async () => {
    const list = [
      mockCategory,

      {
        ...mockCategory,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Toys',
        isEnable: false,
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    CategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await CategoryService.findAll({
      includeDisabled: true,
    });

    expect(result).toEqual(list);

    expect(CategoryModel.find).toHaveBeenCalledWith({});
  });

  test('findAll filters by petType', async () => {
    const list = [mockCategory];

    const sortMock = jest.fn().mockResolvedValue(list);

    CategoryModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await CategoryService.findAll({
      petType: mockPetType._id,
    });

    expect(result).toEqual(list);

    expect(CategoryModel.find).toHaveBeenCalledWith({
      isEnable: true,
      petType: mockPetType._id,
    });
  });

  // =========================================================
  // FORMAT
  // =========================================================

  test('format formats category response', () => {
    const formatted = CategoryService.format(mockCategory);

    expect(formatted).toMatchObject({
      id: mockCategory._id,
      title: mockCategory.title,
      petType: mockCategory.petType,
      isEnable: mockCategory.isEnable,
    });

    expect(formatted).toHaveProperty('createdAt');
  });

  test('format returns null for null input', () => {
    expect(CategoryService.format(null)).toBeNull();
  });

  test('format supports mongoose-style toObject', () => {
    const document = {
      toObject: jest.fn(() => ({
        ...mockCategory,
      })),
    };

    const result = CategoryService.format(document);

    expect(document.toObject).toHaveBeenCalled();

    expect(result.title).toBe('Food');
  });

  test('formatMany formats category array', () => {
    const list = [
      mockCategory,

      {
        ...mockCategory,

        _id: '65a4de97aff1fbb38c437333',

        title: 'Toys',
      },
    ];

    const result = CategoryService.formatMany(list);

    expect(result).toHaveLength(2);

    expect(result[0]).toHaveProperty('id');

    expect(result[1].title).toBe('Toys');
  });
});
