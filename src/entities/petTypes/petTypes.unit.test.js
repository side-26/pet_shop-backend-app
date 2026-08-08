// src/entities/petTypes/petTypes.unit.test.js

jest.mock('#utils/index.js', () => ({
  setErrorResponse: jest.fn((statusCode, data) => {
    const error = new Error(data.message);
    error.statusCode = statusCode;
    error.data = data;
    throw error;
  }),
}));

jest.mock('./petTypes.model.js', () => {
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
  MockModel.create = jest.fn();
  MockModel.findByIdAndUpdate = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();
  MockModel.countDocuments = jest.fn();
  MockModel.findBySlug = jest.fn();

  return { PetTypeModel: MockModel };
});

import * as petTypeUtils from './petTypes.helpers.js';
import { PetTypeModel } from './petTypes.model.js';

describe('PetType Helpers - Unit Tests', () => {
  let mockPetType;

  beforeEach(() => {
    mockPetType = {
      _id: '65a4de97aff1fbb38c437952',
      title: 'Dog',
      description: 'Loyal pets',
      isEnabled: true,
      slug: 'dog',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(this),
    };

    jest.clearAllMocks();
  });

  test('doesPetTypeExist returns pet type if exists', async () => {
    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.doesPetTypeExist({
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

  test('doesPetTypeExist returns null if not exists', async () => {
    PetTypeModel.findOne.mockResolvedValue(null);

    const result = await petTypeUtils.doesPetTypeExist({
      title: 'x',
    });

    expect(result).toBeNull();
  });

  test('doesPetTypeExist preserves other filters', async () => {
    PetTypeModel.findOne.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.doesPetTypeExist({
      title: 'Dog',
      isEnabled: true,
    });

    expect(result).toEqual(mockPetType);

    expect(PetTypeModel.findOne).toHaveBeenCalledWith({
      isEnabled: true,
      title: {
        $regex: '^Dog$',
        $options: 'i',
      },
    });
  });

  test('getPetTypeById returns pet type', async () => {
    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.getPetTypeById(mockPetType._id);

    expect(result).toEqual(mockPetType);
  });

  test('getPetTypeById throws if not found', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(petTypeUtils.getPetTypeById('invalid')).rejects.toThrow(
      'نوع حیوان یافت نشد',
    );
  });

  test('getPetTypeById returns null if not found and throwOnNotFound false', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    const result = await petTypeUtils.getPetTypeById('invalid', false);

    expect(result).toBeNull();
  });

  test('createPetType creates new pet type', async () => {
    const data = {
      title: 'Cat',
    };

    const userId = 'user123';

    const expected = {
      ...data,
      slug: 'cat',
      isEnabled: true,
      createdBy: userId,
    };

    const instance = {
      ...expected,
      save: jest.fn().mockResolvedValue(expected),
    };

    PetTypeModel.mockImplementationOnce(() => instance);

    const result = await petTypeUtils.createPetType(data, userId);

    expect(result).toEqual(expected);
  });

  test('updatePetType updates pet type', async () => {
    const update = {
      title: 'Canine',
    };

    const userId = 'user456';

    mockPetType.save.mockResolvedValue({
      ...mockPetType,
      ...update,
      updatedBy: userId,
    });

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.updatePetType(
      mockPetType._id,
      update,
      userId,
    );

    expect(result.title).toBe('Canine');
    expect(result.updatedBy).toBe(userId);
  });

  test('updatePetType throws if not found', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(petTypeUtils.updatePetType('invalid', {})).rejects.toThrow(
      'نوع حیوان یافت نشد',
    );
  });

  test('disablePetType sets isEnabled to false', async () => {
    const userId = 'user789';

    mockPetType.save.mockResolvedValue({
      ...mockPetType,
      isEnabled: false,
      updatedBy: userId,
    });

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.disablePetType(mockPetType._id, userId);

    expect(result.isEnabled).toBe(false);
  });

  test('enablePetType sets isEnabled to true', async () => {
    const userId = 'user101';

    mockPetType.isEnabled = false;

    mockPetType.save.mockResolvedValue({
      ...mockPetType,
      isEnabled: true,
      updatedBy: userId,
    });

    PetTypeModel.findById.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.enablePetType(mockPetType._id, userId);

    expect(result.isEnabled).toBe(true);
  });

  test('getAllPetTypes returns enabled by default', async () => {
    const list = [
      mockPetType,
      {
        title: 'Cat',
        isEnabled: true,
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    PetTypeModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await petTypeUtils.getAllPetTypes(false);

    expect(result).toEqual(list);

    expect(PetTypeModel.find).toHaveBeenCalledWith({
      isEnabled: true,
    });
  });

  test('getAllPetTypes returns all when includeDisabled true', async () => {
    const list = [
      mockPetType,
      {
        title: 'Cat',
        isEnabled: false,
      },
    ];

    const sortMock = jest.fn().mockResolvedValue(list);

    PetTypeModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await petTypeUtils.getAllPetTypes(true);

    expect(result).toEqual(list);

    expect(PetTypeModel.find).toHaveBeenCalledWith({});
  });

  test('getPetTypeBySlug returns pet type', async () => {
    PetTypeModel.findBySlug.mockResolvedValue(mockPetType);

    const result = await petTypeUtils.getPetTypeBySlug('dog');

    expect(result).toEqual(mockPetType);
  });

  test('formatPetTypeResponse formats object', () => {
    const formatted = petTypeUtils.formatPetTypeResponse(mockPetType);

    expect(formatted).toMatchObject({
      id: mockPetType._id,
      title: mockPetType.title,
      isEnabled: mockPetType.isEnabled,
      slug: mockPetType.slug,
    });

    expect(formatted).toHaveProperty('createdAt');
  });

  test('formatPetTypeResponse returns null for null input', () => {
    expect(petTypeUtils.formatPetTypeResponse(null)).toBeNull();
  });

  test('formatPetTypesResponse formats array', () => {
    const list = [
      mockPetType,
      {
        ...mockPetType,
        title: 'Cat',
      },
    ];

    const result = petTypeUtils.formatPetTypesResponse(list);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('id');
  });
});
