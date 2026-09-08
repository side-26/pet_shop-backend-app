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

jest.mock('./brands.model.js', () => {
  const MockModel = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
    return this;
  });
  MockModel.findOne = jest.fn();
  MockModel.findById = jest.fn();
  MockModel.findByIdAndDelete = jest.fn();
  MockModel.find = jest.fn();
  return { BrandModel: MockModel };
});

import { MainImageService } from '#services/mainImage.service.js';

import { BrandModel } from './brands.model.js';
import { createBrandZodSchema } from './brands.schema.js';
import { BrandService } from './brands.service.js';

describe('BrandService', () => {
  const brand = {
    _id: '65a4de97aff1fbb38c437952',
    title: 'Royal Canin',
    title_fa: 'رویال کنین',
    logo: 'https://cdn.example.com/brands/logos/royal-canin.webp',
    thumbnailLogo: 'data:image/webp;base64,AAAA',
    slug: 'royal-canin',
    isEnable: true,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MainImageService.upload.mockResolvedValue({
      key: 'brands/logos/new.webp',
      mainImage: 'https://cdn.example.com/brands/logos/new.webp',
      mainImageThumbnail: 'data:image/webp;base64,BBBB',
    });
    MainImageService.cleanup.mockResolvedValue(undefined);
    MainImageService.getStoredKey.mockReturnValue(
      'brands/logos/royal-canin.webp',
    );
  });

  test('defaults isEnable to true while preserving rich-text description', () => {
    expect(
      createBrandZodSchema.parse({
        title: 'Royal Canin',
        title_fa: 'رویال کنین',
        description: '{"type":"doc","content":[]}',
      }),
    ).toMatchObject({ isEnable: true, description: { type: 'doc' } });
  });

  test('creates a brand without a logo', async () => {
    BrandModel.findOne.mockResolvedValue(null);

    const result = await BrandService.create(
      { title: 'Royal Canin', title_fa: 'رویال کنین', isEnable: true },
      'user-id',
    );

    expect(MainImageService.upload).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      title: 'Royal Canin',
      createdBy: 'user-id',
    });
  });

  test('uploads the optional logo and cleans it up when persistence fails', async () => {
    BrandModel.findOne.mockResolvedValue(null);
    BrandModel.mockImplementationOnce(function (data) {
      Object.assign(this, data);
      this.save = jest.fn().mockRejectedValue(new Error('database failed'));
      return this;
    });

    await expect(
      BrandService.create(
        { title: 'Royal Canin', title_fa: 'رویال کنین' },
        'user-id',
        { buffer: Buffer.from('logo') },
      ),
    ).rejects.toThrow('database failed');

    expect(MainImageService.upload).toHaveBeenCalledWith(
      expect.any(Object),
      'brands/logos',
    );
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'brands/logos/new.webp',
      { userId: 'user-id' },
    );
  });

  test('rejects duplicate titles case-insensitively', async () => {
    BrandModel.findOne.mockResolvedValue(brand);

    await expect(
      BrandService.create({ title: brand.title, title_fa: brand.title_fa }),
    ).rejects.toThrow('قبلاً ثبت شده است');
  });

  test('returns only enabled brands by default', async () => {
    const sort = jest.fn().mockResolvedValue([brand]);
    BrandModel.find.mockReturnValue({ sort });

    await expect(BrandService.findAll()).resolves.toEqual([brand]);
    expect(BrandModel.find).toHaveBeenCalledWith({ isEnable: true });
  });

  test('updates enable status with the acting user', async () => {
    const mutableBrand = { ...brand, save: jest.fn().mockResolvedValue(brand) };
    BrandModel.findById.mockResolvedValue(mutableBrand);

    await BrandService.disable(brand._id, 'admin-id');

    expect(mutableBrand).toMatchObject({
      isEnable: false,
      updatedBy: 'admin-id',
    });
    expect(mutableBrand.save).toHaveBeenCalled();
  });

  test('removes the associated logo after deletion', async () => {
    BrandModel.findByIdAndDelete.mockResolvedValue(brand);

    await expect(BrandService.delete(brand._id)).resolves.toEqual(brand);
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'brands/logos/royal-canin.webp',
      { id: brand._id },
    );
  });
});
