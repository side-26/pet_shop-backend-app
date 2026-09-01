jest.mock('#utils/helpers.js', () => ({
  getPaginationData: jest.fn(),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('#entities/petTypes/petTypes.model.js', () => ({
  PetTypeModel: { findById: jest.fn() },
}));

jest.mock('#entities/breeds/breeds.model.js', () => ({
  BreedModel: { findById: jest.fn() },
}));

jest.mock('./pets.model.js', () => ({
  PetModel: {
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
import { BreedModel } from '#entities/breeds/breeds.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { MainImageService } from '#services/mainImage.service.js';

import { PetModel } from './pets.model.js';
import { PetService } from './pets.service.js';

const id = '65a4de97aff1fbb38c437111';
const petTypeId = '65a4de97aff1fbb38c437112';
const breedId = '65a4de97aff1fbb38c437113';
const userId = '65a4de97aff1fbb38c437114';
const petType = {
  _id: petTypeId,
  title: 'Cat',
  description: '',
  isEnabled: true,
};
const breed = {
  _id: breedId,
  title: 'Persian',
  petType: petTypeId,
  ageAverage: '12-17',
  size: 2,
  inEnable: true,
};
const data = {
  title: 'Persian kitten',
  mainImage: 'https://cdn.example.com/main.webp',
  images: ['https://cdn.example.com/one.webp'],
  mainImageThumbnail: 'data:image/webp;base64,AAAA',
  description: 'Friendly kitten',
  petType: petTypeId,
  breed: breedId,
  quantity: 0,
  price: 0,
  discountPercentage: 0,
  inEnable: true,
  slug: 'persian-kitten',
};
const pet = { _id: id, ...data };

describe('PetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PetTypeModel.findById.mockResolvedValue(petType);
    BreedModel.findById.mockResolvedValue(breed);
    PetModel.populate.mockImplementation(async (value) => value);
    MainImageService.upload.mockResolvedValue({
      key: 'pets/main/new.webp',
      mainImage: data.mainImage,
      mainImageThumbnail: data.mainImageThumbnail,
    });
  });

  test('escapeRegex and findOne build safe lookups', async () => {
    expect(PetService.escapeRegex('cat+dog')).toBe('cat\\+dog');
    PetModel.findOne.mockResolvedValue(pet);
    await expect(PetService.findOne({ slug: data.slug })).resolves.toBe(pet);
    expect(PetModel.findOne).toHaveBeenCalledWith({ slug: data.slug });
  });

  test('findById returns a pet and rejects missing pets', async () => {
    PetModel.findById.mockResolvedValueOnce(pet).mockResolvedValueOnce(null);
    await expect(PetService.findById(id)).resolves.toBe(pet);
    await expect(PetService.findById(id)).rejects.toThrow('حیوان یافت نشد');
  });

  test('validateRelations accepts matching relations and rejects each invalid case', async () => {
    await expect(
      PetService.validateRelations(petTypeId, breedId),
    ).resolves.toEqual({ petType, breed });

    PetTypeModel.findById.mockResolvedValueOnce(null);
    await expect(
      PetService.validateRelations(petTypeId, breedId),
    ).rejects.toThrow('نوع حیوان');

    BreedModel.findById.mockResolvedValueOnce(null);
    await expect(
      PetService.validateRelations(petTypeId, breedId),
    ).rejects.toThrow('نژاد انتخاب‌شده وجود ندارد');

    BreedModel.findById.mockResolvedValueOnce({ ...breed, petType: id });
    await expect(
      PetService.validateRelations(petTypeId, breedId),
    ).rejects.toThrow('متعلق');
  });

  test('ensureUniqueSlug accepts a unique slug and rejects duplicates', async () => {
    PetModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(pet);
    await expect(
      PetService.ensureUniqueSlug(data.slug),
    ).resolves.toBeUndefined();
    await expect(PetService.ensureUniqueSlug(data.slug)).rejects.toThrow(
      'نامک',
    );
  });

  test('create validates relations and saves the pet', async () => {
    PetModel.findOne.mockResolvedValue(null);
    PetModel.create.mockResolvedValue(pet);
    await expect(
      PetService.create(data, userId, { buffer: Buffer.from('image') }),
    ).resolves.toBe(pet);
    expect(PetModel.create).toHaveBeenCalledWith({
      ...data,
      createdBy: userId,
    });
  });

  test('updateBaseInfo updates only base fields and validates relations', async () => {
    PetModel.findById.mockResolvedValue(pet);
    PetModel.findByIdAndUpdate.mockResolvedValue({ ...pet, title: 'Edited' });
    await expect(
      PetService.updateBaseInfo(id, { title: 'Edited' }, userId),
    ).resolves.toMatchObject({ title: 'Edited' });
    expect(PetModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { title: 'Edited', updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
  });

  test('updateImages replaces image data and cleans up the previous main image', async () => {
    const imageFile = { buffer: Buffer.from('replacement') };
    const images = ['https://cdn.example.com/two.webp'];
    PetModel.findById.mockResolvedValue(pet);
    PetModel.findByIdAndUpdate.mockResolvedValue({ ...pet, images });
    MainImageService.getStoredKey.mockReturnValue('pets/main/previous.webp');

    await expect(
      PetService.updateImages(id, { images }, userId, imageFile),
    ).resolves.toMatchObject({ images });
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'pets/main/previous.webp',
      { id, userId },
    );
  });

  test('updateImages cleans a newly uploaded image when persistence fails', async () => {
    const persistenceError = new Error('database failed');
    PetModel.findById.mockResolvedValue(pet);
    PetModel.findByIdAndUpdate.mockRejectedValue(persistenceError);

    await expect(
      PetService.updateImages(id, {}, userId, {
        buffer: Buffer.from('replacement'),
      }),
    ).rejects.toBe(persistenceError);
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'pets/main/new.webp',
      { id, userId },
    );
  });

  test('updatePrice changes only price fields', async () => {
    PetModel.findById.mockResolvedValue(pet);
    PetModel.findByIdAndUpdate.mockResolvedValue({
      ...pet,
      price: 100,
      discountPercentage: 5,
    });
    await PetService.updatePrice(
      id,
      { price: 100, discountPercentage: 5 },
      userId,
    );
    expect(PetModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      {
        $set: { price: 100, discountPercentage: 5, updatedBy: userId },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });

  test('setEnableStatus, enable, and disable update visibility', async () => {
    PetModel.findById.mockResolvedValue(pet);
    PetModel.findByIdAndUpdate.mockResolvedValue({ ...pet, inEnable: false });
    await expect(
      PetService.setEnableStatus(id, false, userId),
    ).resolves.toMatchObject({ inEnable: false });

    const status = jest
      .spyOn(PetService, 'setEnableStatus')
      .mockResolvedValue(pet);
    await PetService.enable(id, userId);
    await PetService.disable(id, userId);
    expect(status).toHaveBeenNthCalledWith(1, id, true, userId);
    expect(status).toHaveBeenNthCalledWith(2, id, false, userId);
  });

  test('delete removes a pet and rejects a missing pet', async () => {
    PetModel.findByIdAndDelete
      .mockResolvedValueOnce(pet)
      .mockResolvedValueOnce(null);
    await expect(PetService.delete(id)).resolves.toBe(pet);
    await expect(PetService.delete(id)).rejects.toThrow('حیوان یافت نشد');
  });

  test('management detail populates both relations', async () => {
    PetModel.findById.mockResolvedValue(pet);
    await expect(PetService.findManagementById(id)).resolves.toBe(pet);
    expect(PetModel.populate).toHaveBeenCalledWith(pet, [
      { path: 'petType' },
      { path: 'breed' },
    ]);
  });

  test('section getters return image, price, and populated base information', async () => {
    PetModel.findById.mockResolvedValue(pet);
    await expect(PetService.findImagesById(id)).resolves.toBe(pet);
    await expect(PetService.findPriceById(id)).resolves.toBe(pet);
    await expect(PetService.findBaseInfoById(id)).resolves.toBe(pet);
    expect(PetModel.populate).toHaveBeenCalledWith(pet, [
      { path: 'petType' },
      { path: 'breed' },
    ]);
  });

  test('management and customer lists reuse pagination and populate relations', async () => {
    getPaginationData.mockResolvedValue({
      result: [pet],
      pagination: { totalItems: 1 },
    });
    const management = await PetService.findManagementList({
      page: 1,
      limit: 10,
      title: 'Persian',
      petType: petTypeId,
      breed: breedId,
      quantity: 0,
      isEnable: false,
    });
    expect(management.result).toEqual([pet]);
    expect(getPaginationData).toHaveBeenNthCalledWith(
      1,
      PetModel,
      expect.objectContaining({
        title: { $regex: 'Persian', $options: 'i' },
        petType: petTypeId,
        breed: breedId,
        quantity: 0,
        inEnable: false,
        page: 1,
        limit: 10,
      }),
      '',
      expect.any(Function),
    );

    const customer = await PetService.findCustomerList({ page: 1, limit: 10 });
    expect(customer.result).toEqual([pet]);
    expect(getPaginationData).toHaveBeenLastCalledWith(
      PetModel,
      expect.objectContaining({ inEnable: true, page: 1, limit: 10 }),
      '',
      expect.any(Function),
    );

    await PetService.findCustomerList({
      page: 1,
      limit: 10,
      priceRange: { minimum: 10, maximum: 100 },
    });
    expect(getPaginationData).toHaveBeenLastCalledWith(
      PetModel,
      expect.objectContaining({
        inEnable: true,
        price: { $gte: 10, $lte: 100 },
      }),
      '',
      expect.any(Function),
    );
  });

  test('customer detail returns enabled records and rejects hidden records', async () => {
    PetModel.findOne.mockResolvedValueOnce(pet).mockResolvedValueOnce(null);
    await expect(PetService.findCustomerById(id)).resolves.toBe(pet);
    expect(PetModel.findOne).toHaveBeenCalledWith({ _id: id, inEnable: true });
    await expect(PetService.findCustomerById(id)).rejects.toThrow(
      'حیوان یافت نشد',
    );
  });

  test('formatters expose management, reduced list, and expanded detail DTOs', () => {
    const populatedPet = { ...pet, petType, breed };
    expect(PetService.formatManagement(populatedPet).images).toEqual(
      data.images,
    );
    expect(PetService.formatManagementMany([populatedPet])).toHaveLength(1);

    const list = PetService.formatCustomerList([populatedPet])[0];
    expect(list).not.toHaveProperty('images');
    expect(list.petType).toBe('Cat');
    expect(list.breed).toBe('Persian');

    const detail = PetService.formatCustomerDetail(populatedPet);
    expect(detail.images).toEqual(data.images);
    expect(detail.petType).toMatchObject({ title: 'Cat' });
    expect(detail.breed).toMatchObject({ title: 'Persian' });
    expect(PetService.formatCustomerDetails([populatedPet])).toEqual([detail]);
    expect(PetService.formatImages(populatedPet)).toEqual({
      mainImage: data.mainImage,
      mainImageThumbnail: data.mainImageThumbnail,
      imagesList: data.images,
    });
    expect(PetService.formatPrice(populatedPet)).toEqual({
      price: data.price,
      discountPercentage: data.discountPercentage,
    });
    expect(PetService.formatBaseInfo(populatedPet)).toMatchObject({
      title: data.title,
      quantity: data.quantity,
      petType: expect.objectContaining({ title: 'Cat' }),
      breed: expect.objectContaining({ title: 'Persian' }),
    });
  });
});
