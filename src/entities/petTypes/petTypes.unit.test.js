// src/entities/petTypes/petTypes.unit.test.js

jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');

    error.statusCode = statusCode;

    Object.assign(error, options);

    throw error;
  }),
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: {
    upload: jest.fn(),
    cleanup: jest.fn(),
    getStoredKey: jest.fn(),
  },
}));

jest.mock('./petTypes.model.js', () => {
  const MockModel = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);

    this.save = jest.fn().mockResolvedValue(this);

    return this;
  });

  MockModel.findOne = jest.fn();

  MockModel.findById = jest.fn();

  MockModel.find = jest.fn();

  MockModel.findBySlug = jest.fn();

  MockModel.findByIdAndDelete = jest.fn();

  return {
    PetTypeModel: MockModel,
  };
});

jest.mock('./petTypes.cache.store.js', () => {
  const getOrLoad = jest.fn((label, loader) => loader());
  const invalidate = jest.fn();

  return {
    PetTypeCacheStore: class PetTypeCacheStore {
      static getAllLabel(includeDisabled) {
        return includeDisabled ? 'all:with-disabled' : 'all:enabled';
      }

      static getByIdLabel(id) {
        return `id:${id}`;
      }

      static getBySlugLabel(slug) {
        return `slug:${slug}`;
      }

      getOrLoad = getOrLoad;

      invalidate = invalidate;
    },
    __mockPetTypeCacheGetOrLoad: getOrLoad,
    __mockPetTypeCacheInvalidate: invalidate,
  };
});

import { MainImageService } from '#services/mainImage.service.js';

import {
  __mockPetTypeCacheGetOrLoad as mockPetTypeCacheGetOrLoad,
  __mockPetTypeCacheInvalidate as mockPetTypeCacheInvalidate,
} from './petTypes.cache.store.js';
import { PetTypeModel } from './petTypes.model.js';
import {
  createPetTypeZodSchema,
  updatePetTypeZodSchema,
} from './petTypes.schema.js';
import { PetTypeService } from './petTypes.service.js';

describe('Pet type validation', () => {
  test.each([
    ['true', true],
    ['false', false],
  ])('converts multipart isEnabled=%s to %s', (isEnabled, expected) => {
    expect(updatePetTypeZodSchema.parse({ isEnabled }).isEnabled).toBe(
      expected,
    );
  });

  test('keeps the create default when isEnabled is omitted', () => {
    expect(createPetTypeZodSchema.parse({ title: 'Dog' }).isEnabled).toBe(true);
  });
});

describe('PetTypeService - Unit Tests', () => {
  let mockPetType;

  beforeEach(() => {
    mockPetType = {
      _id: '65a4de97aff1fbb38c437952',

      title: 'Dog',

      description: 'Loyal pets',

      mainImage: 'https://cdn.example.com/pet-types/main/dog.webp',

      thumbnail: 'data:image/webp;base64,AAAA',

      isEnabled: true,

      slug: 'dog',

      createdAt: new Date(),

      updatedAt: new Date(),

      save: jest.fn(),
    };

    jest.clearAllMocks();

    mockPetTypeCacheGetOrLoad.mockImplementation((label, loader) => loader());
    mockPetTypeCacheInvalidate.mockResolvedValue(undefined);
    MainImageService.upload.mockResolvedValue({
      key: 'pet-types/main/new.webp',
      mainImage: 'https://cdn.example.com/pet-types/main/new.webp',
      mainImageThumbnail: 'data:image/webp;base64,BBBB',
    });
    MainImageService.cleanup.mockResolvedValue(undefined);
    MainImageService.getStoredKey.mockReturnValue('pet-types/main/dog.webp');
  });

  // =========================================================
  // ESCAPE REGEX
  // =========================================================

  test('escapeRegex escapes regex special characters', () => {
    const result = PetTypeService.escapeRegex('Dog+Cat');

    expect(result).toBe('Dog\\+Cat');
  });

  // =========================================================
  // FIND ONE
  // =========================================================

  test('findOne returns pet type if exists', async () => {
    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    const result = await PetTypeService.findOne({
      title: 'dog',
    });

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^dog$',
        $options: 'i',
      },
    });
  });

  test('findOne returns null if pet type does not exist', async () => {
    PetTypeModel.findOne.mockResolvedValue(null);

    const result = await PetTypeService.findOne({
      title: 'x',
    });

    expect(result).toBeNull();
  });

  test('findOne preserves other filters', async () => {
    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    await PetTypeService.findOne({
      title: 'Dog',

      isEnabled: true,
    });

    expect(PetTypeModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Dog$',
        $options: 'i',
      },

      isEnabled: true,
    });
  });

  // =========================================================
  // FIND BY ID
  // =========================================================

  test('findById returns pet type', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await PetTypeService.findById(mockPetType._id);

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findById).toHaveBeenCalledWith(mockPetType._id);
    expect(mockPetTypeCacheGetOrLoad).toHaveBeenCalledWith(
      `id:${mockPetType._id}`,
      expect.any(Function),
    );
  });

  test('findById throws if not found', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      PetTypeService.findById('65a4de97aff1fbb38c437111'),
    ).rejects.toThrow('نوع حیوان یافت نشد');
  });

  test('findById returns null if not found and throwOnNotFound false', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    const result = await PetTypeService.findById(
      '65a4de97aff1fbb38c437111',
      false,
    );

    expect(result).toBeNull();
  });

  // =========================================================
  // FIND BY SLUG
  // =========================================================

  test('findBySlug returns pet type', async () => {
    PetTypeModel.findBySlug.mockResolvedValue(mockPetType);

    const result = await PetTypeService.findBySlug('dog');

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findBySlug).toHaveBeenCalledWith('dog');
    expect(mockPetTypeCacheGetOrLoad).toHaveBeenCalledWith(
      'slug:dog',
      expect.any(Function),
    );
  });

  test('findBySlug throws if not found', async () => {
    PetTypeModel.findBySlug.mockResolvedValue(null);

    await expect(PetTypeService.findBySlug('missing')).rejects.toThrow(
      'نوع حیوان یافت نشد',
    );
  });

  // =========================================================
  // FIND ALL
  // =========================================================

  test('findAll returns enabled pet types by default', async () => {
    const list = [
      mockPetType,

      {
        ...mockPetType,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Cat',
        slug: 'cat',
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    PetTypeModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await PetTypeService.findAll();

    expect(result).toEqual(list);

    expect(PetTypeModel.find).toHaveBeenCalledWith({
      isEnabled: true,
    });

    expect(sortMock).toHaveBeenCalledWith({
      createdAt: 1,
    });
    expect(mockPetTypeCacheGetOrLoad).toHaveBeenCalledWith(
      'all:enabled',
      expect.any(Function),
    );
  });

  test('findAll returns all when includeDisabled true', async () => {
    const list = [
      mockPetType,

      {
        ...mockPetType,
        _id: '65a4de97aff1fbb38c437333',
        title: 'Cat',
        isEnabled: false,
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    PetTypeModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await PetTypeService.findAll(true);

    expect(result).toEqual(list);

    expect(PetTypeModel.find).toHaveBeenCalledWith({});
    expect(mockPetTypeCacheGetOrLoad).toHaveBeenCalledWith(
      'all:with-disabled',
      expect.any(Function),
    );
  });

  // =========================================================
  // CREATE
  // =========================================================

  test('create creates new pet type', async () => {
    const data = {
      title: 'Cat',

      description: 'Affectionate pets',
    };

    const userId = '65a4de97aff1fbb38c437111';

    PetTypeModel.findOne.mockResolvedValue(null);

    const expected = {
      ...data,

      createdBy: userId,
    };

    const instance = {
      ...expected,

      save: jest.fn().mockResolvedValue({
        ...expected,
        isEnabled: true,
        slug: 'cat',
      }),
    };

    PetTypeModel.mockImplementationOnce(() => instance);

    const result = await PetTypeService.create(data, userId);

    expect(result).toMatchObject({
      title: 'Cat',

      description: 'Affectionate pets',

      createdBy: userId,

      isEnabled: true,

      slug: 'cat',
    });

    expect(PetTypeModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^Cat$',
        $options: 'i',
      },
    });
    expect(mockPetTypeCacheInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cat',
      }),
    );
    expect(MainImageService.upload).toHaveBeenCalledWith(
      undefined,
      'pet-types/main',
    );
  });

  test('create throws if title already exists', async () => {
    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    await expect(
      PetTypeService.create(
        {
          title: 'Dog',
        },
        '65a4de97aff1fbb38c437111',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('create detects duplicate title case-insensitively', async () => {
    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    await expect(
      PetTypeService.create(
        {
          title: 'dog',
        },
        '65a4de97aff1fbb38c437111',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');

    expect(PetTypeModel.findOne).toHaveBeenCalledWith({
      title: {
        $regex: '^dog$',
        $options: 'i',
      },
    });
  });

  // =========================================================
  // UPDATE
  // =========================================================

  test('update preserves the current image when no replacement is provided', async () => {
    const userId = '65a4de97aff1fbb38c437111';

    const update = {
      title: 'Canine',

      description: 'Updated description',
    };

    mockPetType.save.mockResolvedValue({
      ...mockPetType,
      ...update,
      updatedBy: userId,
    });

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    PetTypeModel.findOne.mockResolvedValue(null);

    const result = await PetTypeService.update(mockPetType._id, update, userId);

    expect(result.title).toBe('Canine');

    expect(result.updatedBy).toBe(userId);

    expect(mockPetType.title).toBe('Canine');

    expect(mockPetType.updatedBy).toBe(userId);

    expect(mockPetType.save).toHaveBeenCalled();
    expect(MainImageService.upload).not.toHaveBeenCalled();
    expect(MainImageService.cleanup).not.toHaveBeenCalled();
    expect(mockPetTypeCacheInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Canine',
      }),
    );
  });

  test('update replaces the current image when a new file is provided', async () => {
    const userId = '65a4de97aff1fbb38c437111';
    const imageFile = { buffer: Buffer.from('new image') };

    PetTypeModel.findById.mockResolvedValue(mockPetType);
    mockPetType.save.mockResolvedValue(mockPetType);

    await PetTypeService.update(
      mockPetType._id,
      { description: 'Updated' },
      userId,
      imageFile,
    );

    expect(MainImageService.upload).toHaveBeenCalledWith(
      imageFile,
      'pet-types/main',
    );
    expect(mockPetType.mainImage).toBe(
      'https://cdn.example.com/pet-types/main/new.webp',
    );
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'pet-types/main/dog.webp',
      { id: mockPetType._id, userId },
    );
  });

  test('update throws if pet type not found', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      PetTypeService.update('65a4de97aff1fbb38c437111', {
        title: 'Canine',
      }),
    ).rejects.toThrow('نوع حیوان یافت نشد');
  });

  test('update throws if another pet type has same title', async () => {
    const duplicatePetType = {
      ...mockPetType,

      _id: '65a4de97aff1fbb38c437333',

      title: 'Cat',
    };

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    PetTypeModel.findOne.mockResolvedValue(duplicatePetType);

    await expect(
      PetTypeService.update(
        mockPetType._id,
        {
          title: 'Cat',
        },
        '65a4de97aff1fbb38c437111',
      ),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('update allows keeping same title', async () => {
    const userId = '65a4de97aff1fbb38c437111';

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    mockPetType.save.mockResolvedValue(mockPetType);

    const result = await PetTypeService.update(
      mockPetType._id,
      {
        title: 'Dog',
      },
      userId,
    );

    expect(result).toEqual(mockPetType);

    expect(mockPetType.save).toHaveBeenCalled();
    expect(mockPetTypeCacheInvalidate).toHaveBeenCalledWith(mockPetType);
  });

  // =========================================================
  // PROPERTY DEFINITIONS
  // =========================================================

  test('replacePropertyDefinitions replaces all property definitions', async () => {
    const propertyDefinitions = [
      { label: 'رنگ', value: 'قهوه‌ای' },
      { label: 'وزن', value: 12 },
    ];
    const userId = '65a4de97aff1fbb38c437111';

    PetTypeModel.findById.mockResolvedValue(mockPetType);
    mockPetType.save.mockResolvedValue(mockPetType);

    const result = await PetTypeService.replacePropertyDefinitions(
      mockPetType._id,
      propertyDefinitions,
      userId,
    );

    expect(result).toBe(mockPetType);
    expect(mockPetType.propertyDefinitions).toEqual(propertyDefinitions);
    expect(mockPetType.updatedBy).toBe(userId);
    expect(mockPetType.save).toHaveBeenCalled();
    expect(mockPetTypeCacheInvalidate).toHaveBeenCalledWith(mockPetType);
  });

  test('replacePropertyDefinitions throws when pet type does not exist', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      PetTypeService.replacePropertyDefinitions('65a4de97aff1fbb38c437111', []),
    ).rejects.toThrow('نوع حیوان یافت نشد');
  });

  test('formatPropertyDefinitions returns only label and value', () => {
    const result = PetTypeService.formatPropertyDefinitions({
      propertyDefinitions: [
        { key: 'weight', label: 'وزن', value: 12, valueType: 'number' },
      ],
    });

    expect(result).toEqual([{ label: 'وزن', value: 12 }]);
  });

  // =========================================================
  // DISABLE
  // =========================================================

  test('disable sets isEnabled to false', async () => {
    const userId = '65a4de97aff1fbb38c437111';

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    mockPetType.save.mockImplementation(async () => mockPetType);

    const result = await PetTypeService.disable(mockPetType._id, userId);

    expect(result.isEnabled).toBe(false);

    expect(result.updatedBy).toBe(userId);

    expect(mockPetType.save).toHaveBeenCalled();
    expect(mockPetTypeCacheInvalidate).toHaveBeenCalledWith(mockPetType);
  });

  test('disable throws if pet type not found', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      PetTypeService.disable(
        '65a4de97aff1fbb38c437111',
        '65a4de97aff1fbb38c437222',
      ),
    ).rejects.toThrow('نوع حیوان یافت نشد');
  });

  // =========================================================
  // ENABLE
  // =========================================================

  test('enable sets isEnabled to true', async () => {
    const userId = '65a4de97aff1fbb38c437111';

    mockPetType.isEnabled = false;

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    mockPetType.save.mockImplementation(async () => mockPetType);

    const result = await PetTypeService.enable(mockPetType._id, userId);

    expect(result.isEnabled).toBe(true);

    expect(result.updatedBy).toBe(userId);

    expect(mockPetType.save).toHaveBeenCalled();
  });

  test('enable throws if pet type not found', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      PetTypeService.enable(
        '65a4de97aff1fbb38c437111',
        '65a4de97aff1fbb38c437222',
      ),
    ).rejects.toThrow('نوع حیوان یافت نشد');
  });

  // =========================================================
  // DELETE
  // =========================================================

  test('delete permanently deletes pet type', async () => {
    PetTypeModel.findByIdAndDelete.mockResolvedValue(mockPetType);

    const result = await PetTypeService.delete(mockPetType._id);

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findByIdAndDelete).toHaveBeenCalledWith(
      mockPetType._id,
    );
    expect(mockPetTypeCacheInvalidate).toHaveBeenCalledWith(mockPetType);
  });

  test('delete throws if pet type not found', async () => {
    PetTypeModel.findByIdAndDelete.mockResolvedValue(null);

    await expect(
      PetTypeService.delete('65a4de97aff1fbb38c437111'),
    ).rejects.toThrow('نوع حیوان یافت نشد');
  });

  // =========================================================
  // FORMAT
  // =========================================================

  test('format formats pet type response', () => {
    const result = PetTypeService.format(mockPetType);

    expect(result).toMatchObject({
      id: mockPetType._id,

      title: mockPetType.title,

      description: mockPetType.description,

      mainImage: mockPetType.mainImage,

      thumbnail: mockPetType.thumbnail,

      isEnabled: mockPetType.isEnabled,

      slug: mockPetType.slug,
    });

    expect(result).toHaveProperty('createdAt');

    expect(result).toHaveProperty('updatedAt');
  });

  test('format returns null for null input', () => {
    expect(PetTypeService.format(null)).toBeNull();
  });

  test('formatMany formats array', () => {
    const list = [
      mockPetType,

      {
        ...mockPetType,

        _id: '65a4de97aff1fbb38c437333',

        title: 'Cat',

        slug: 'cat',
      },
    ];

    const result = PetTypeService.formatMany(list);

    expect(result).toHaveLength(2);

    expect(result[0]).toHaveProperty('id');

    expect(result[1].title).toBe('Cat');
  });
});
