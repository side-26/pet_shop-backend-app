jest.mock('#utils/helpers.js', () => ({
  getPaginationData: jest.fn(),
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('./breeds.model.js', () => ({
  BreedModel: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('#entities/petTypes/petTypes.model.js', () => ({
  PetTypeModel: { findById: jest.fn() },
}));

import { getPaginationData } from '#utils/helpers.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';

import { BreedModel } from './breeds.model.js';
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
const breed = { _id: id, ...data };

describe('BreedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PetTypeModel.findById.mockResolvedValue({ _id: id });
  });

  test('escapeRegex escapes special characters', () => {
    expect(BreedService.escapeRegex('Persian+Cat')).toBe('Persian\\+Cat');
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
    await expect(BreedService.create(data, id)).resolves.toBe(breed);
    expect(BreedModel.create).toHaveBeenCalledWith({ ...data, createdBy: id });
    await expect(BreedService.create(data, id)).rejects.toThrow(
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
      BreedService.update(id, { ...data, title: 'New name' }, id),
    ).resolves.toMatchObject({ title: 'New name' });
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

  test('findAll filters enabled breeds and sorts by title', () => {
    const sort = jest.fn().mockReturnValue('query');
    BreedModel.find.mockReturnValue({ sort });
    expect(BreedService.findAll()).toBe('query');
    expect(BreedModel.find).toHaveBeenCalledWith({ enable: true });
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

  test('format and formatMany return API values', () => {
    expect(BreedService.format(breed)).toMatchObject({ id, title: data.title });
    expect(BreedService.formatMany([breed])).toHaveLength(1);
  });
});
