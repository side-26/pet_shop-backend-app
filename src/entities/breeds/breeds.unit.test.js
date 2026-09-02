jest.mock('#utils/helpers.js', () => ({
  getPaginationData: jest.fn(),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
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

jest.mock('./breeds.model.js', () => ({
  BreedModel: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findBySlug: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('#entities/petTypes/petTypes.model.js', () => ({
  PetTypeModel: { findById: jest.fn() },
}));

import { getPaginationData } from '#utils/helpers.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { MainImageService } from '#services/mainImage.service.js';

import { BreedModel } from './breeds.model.js';
import {
  createBreedZodSchema,
  breedQuerySchema,
  replaceBreedPropertyDefinitionsZodSchema,
} from './breeds.schema.js';
import { BreedService } from './breeds.service.js';

const id = '65a4de97aff1fbb38c437111';
const data = {
  title: 'Persian Cat',
  petType: id,
  country: 'Iran',
  ageAverage: '12-17 years',
  size: 2,
  activityLevel: null,
  enable: true,
};
const imageFile = { buffer: Buffer.from('image'), mimetype: 'image/png' };
const uploadedImage = {
  key: 'breeds/main/generated.webp',
  mainImage: 'https://cdn.example.com/breeds/main/generated.webp',
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
};
const breed = {
  _id: id,
  ...data,
  mainImage: uploadedImage.mainImage,
  thumbnailImage: uploadedImage.mainImageThumbnail,
  slug: 'persian-cat',
  propertyDefinitions: [],
  save: jest.fn(),
};

describe('BreedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PetTypeModel.findById.mockResolvedValue({ _id: id });
    MainImageService.upload.mockResolvedValue(uploadedImage);
    MainImageService.cleanup.mockResolvedValue(undefined);
    MainImageService.getStoredKey.mockReturnValue('breeds/main/previous.webp');
  });

  test('escapeRegex escapes special characters', () => {
    expect(BreedService.escapeRegex('Persian+Cat')).toBe('Persian\\+Cat');
  });

  test('validates full property definitions and range values', () => {
    const fullDefinition = {
      key: 'coatColor',
      label: 'رنگ پوشش',
      valueType: 'enum',
      options: ['سفید', 'مشکی'],
    };
    const parsed = createBreedZodSchema.parse({
      ...data,
      propertyDefinitions: [fullDefinition],
    });
    expect(parsed.propertyDefinitions[0].required).toBe(false);
    expect(
      createBreedZodSchema.safeParse({
        ...data,
        propertyDefinitions: [{ ...fullDefinition, options: [] }],
      }).success,
    ).toBe(false);
    expect(
      replaceBreedPropertyDefinitionsZodSchema.safeParse({
        id,
        propertyDefinitions: [{ label: 'رنگ پوشش', value: 'سفید' }],
      }).success,
    ).toBe(true);
  });

  test('validates and coerces paginated-list filters', () => {
    expect(
      breedQuerySchema.parse({
        activityLevel: '3',
        country: 'Iran',
        petType: id,
        size: '2',
        title: 'Persian',
      }),
    ).toMatchObject({
      activityLevel: 3,
      country: 'Iran',
      petType: id,
      size: 2,
      title: 'Persian',
    });
    expect(breedQuerySchema.safeParse({ size: '5' }).success).toBe(false);
    expect(breedQuerySchema.safeParse({ activityLevel: '-1' }).success).toBe(
      false,
    );
  });

  test('findOne builds a case-insensitive title query', async () => {
    BreedModel.findOne.mockResolvedValue(breed);
    await expect(BreedService.findOne({ title: data.title })).resolves.toBe(
      breed,
    );
    expect(BreedModel.findOne).toHaveBeenCalledWith({
      title: { $regex: '^Persian Cat$', $options: 'i' },
    });
  });

  test('findById returns a breed and rejects a missing breed', async () => {
    BreedModel.findById
      .mockResolvedValueOnce(breed)
      .mockResolvedValueOnce(null);
    await expect(BreedService.findById(id)).resolves.toBe(breed);
    await expect(BreedService.findById(id)).rejects.toThrow('نژاد یافت نشد');
  });

  test('findBySlug returns an enabled breed and rejects a missing slug', async () => {
    BreedModel.findBySlug
      .mockResolvedValueOnce(breed)
      .mockResolvedValueOnce(null);

    await expect(BreedService.findBySlug(breed.slug)).resolves.toBe(breed);
    expect(BreedModel.findBySlug).toHaveBeenCalledWith(breed.slug);
    await expect(BreedService.findBySlug('missing')).rejects.toThrow(
      'نژاد یافت نشد',
    );
  });

  test('ensurePetTypeExists accepts an existing type and rejects a missing type', async () => {
    await expect(BreedService.ensurePetTypeExists(id)).resolves.toEqual({
      _id: id,
    });
    PetTypeModel.findById.mockResolvedValue(null);
    await expect(BreedService.ensurePetTypeExists(id)).rejects.toThrow(
      'نوع حیوان انتخاب‌شده وجود ندارد',
    );
  });

  test('create saves a unique breed and rejects duplicates', async () => {
    BreedModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(breed);
    BreedModel.create.mockResolvedValue(breed);
    await expect(BreedService.create(data, id, imageFile)).resolves.toBe(breed);
    expect(BreedModel.create).toHaveBeenCalledWith({
      ...data,
      mainImage: uploadedImage.mainImage,
      thumbnailImage: uploadedImage.mainImageThumbnail,
      createdBy: id,
    });
    await expect(BreedService.create(data, id, imageFile)).rejects.toThrow(
      'نژادی با این عنوان برای نوع حیوان انتخاب‌شده وجود دارد',
    );
  });

  test('update saves a unique edited breed', async () => {
    BreedModel.findById.mockResolvedValue(breed);
    BreedModel.findOne.mockResolvedValue(null);
    BreedModel.findByIdAndUpdate.mockResolvedValue({
      ...breed,
      title: 'New name',
    });
    await expect(
      BreedService.update(id, { ...data, title: 'New name' }, id, imageFile),
    ).resolves.toMatchObject({ title: 'New name' });
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'breeds/main/previous.webp',
      { id, userId: id },
    );
  });

  test('update preserves the current image when no replacement is provided', async () => {
    BreedModel.findById.mockResolvedValue(breed);
    BreedModel.findOne.mockResolvedValue(null);
    BreedModel.findByIdAndUpdate.mockResolvedValue(breed);

    await BreedService.update(id, data, id);

    expect(MainImageService.upload).not.toHaveBeenCalled();
    expect(MainImageService.cleanup).not.toHaveBeenCalled();
    expect(BreedModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      {
        $set: {
          ...data,
          updatedBy: id,
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });

  test('create cleans up a new upload when persistence fails', async () => {
    BreedModel.findOne.mockResolvedValue(null);
    BreedModel.create.mockRejectedValue(new Error('database failed'));

    await expect(BreedService.create(data, id, imageFile)).rejects.toThrow(
      'database failed',
    );
    expect(MainImageService.cleanup).toHaveBeenCalledWith(uploadedImage.key, {
      userId: id,
    });
  });

  test('setEnableStatus changes the enabled state', async () => {
    BreedModel.findById.mockResolvedValue(breed);
    BreedModel.findByIdAndUpdate.mockResolvedValue({ ...breed, enable: false });
    await expect(
      BreedService.setEnableStatus(id, false, id),
    ).resolves.toMatchObject({
      enable: false,
    });
  });

  test('replacePropertyDefinitions saves replacement values and formats them', async () => {
    const propertyDefinitions = [{ label: 'رنگ', value: 'سفید' }];
    BreedModel.findById.mockResolvedValue(breed);
    breed.save.mockResolvedValue(breed);

    await expect(
      BreedService.replacePropertyDefinitions(id, propertyDefinitions, id),
    ).resolves.toBe(breed);
    expect(breed.propertyDefinitions).toEqual(propertyDefinitions);
    expect(breed.updatedBy).toBe(id);
    expect(BreedService.formatPropertyDefinitions(breed)).toEqual(
      propertyDefinitions,
    );
  });

  test('enable and disable delegate to setEnableStatus', async () => {
    const setEnableStatus = jest
      .spyOn(BreedService, 'setEnableStatus')
      .mockResolvedValue(breed);
    await BreedService.enable(id, id);
    await BreedService.disable(id, id);
    expect(setEnableStatus).toHaveBeenNthCalledWith(1, id, true, id);
    expect(setEnableStatus).toHaveBeenNthCalledWith(2, id, false, id);
  });

  test('delete removes a breed and rejects a missing breed', async () => {
    BreedModel.findByIdAndDelete
      .mockResolvedValueOnce(breed)
      .mockResolvedValueOnce(null);
    await expect(BreedService.delete(id)).resolves.toBe(breed);
    await expect(BreedService.delete(id)).rejects.toThrow('نژاد یافت نشد');
  });

  test('findAll filters enabled breeds by pet type and sorts by title', () => {
    const sort = jest.fn().mockReturnValue('query');
    BreedModel.find.mockReturnValue({ sort });
    expect(BreedService.findAll()).toBe('query');
    expect(BreedModel.find).toHaveBeenCalledWith({ enable: true });

    expect(BreedService.findAll({ petType: id })).toBe('query');
    expect(BreedModel.find).toHaveBeenLastCalledWith({
      enable: true,
      petType: id,
    });
  });

  test('findAllWithPagination delegates to the shared pagination helper', () => {
    getPaginationData.mockReturnValue('paginated');
    expect(BreedService.findAllWithPagination({ page: 2, limit: 5 })).toBe(
      'paginated',
    );
    expect(getPaginationData).toHaveBeenCalledWith(
      BreedModel,
      expect.objectContaining({ enable: true, page: 2, limit: 5 }),
      '',
      expect.any(Function),
    );
  });

  test('findAllWithPagination applies title, pet type, country, size, and activity level filters', () => {
    getPaginationData.mockReturnValue('paginated');

    BreedService.findAllWithPagination({
      activityLevel: 3,
      country: 'Iran',
      petType: id,
      size: 2,
      title: 'Persian',
    });

    expect(getPaginationData).toHaveBeenCalledWith(
      BreedModel,
      expect.objectContaining({
        activityLevel: 3,
        country: { $regex: 'Iran', $options: 'i' },
        enable: true,
        petType: id,
        size: 2,
        title: { $regex: 'Persian', $options: 'i' },
      }),
      '',
      expect.any(Function),
    );
  });

  test('format and formatMany return API values', () => {
    expect(BreedService.format(breed)).toMatchObject({ id, title: data.title });
    expect(BreedService.formatMany([breed])).toHaveLength(1);
  });
});
