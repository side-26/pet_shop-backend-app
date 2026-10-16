jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('#utils/image.helpers.js', () => ({
  createBlurThumbnail: jest.fn(),
  formatImageFile: jest.fn(),
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    createObjectKey: jest.fn(),
    uploadObject: jest.fn(),
    buildPublicUrl: jest.fn(),
    deleteObject: jest.fn(),
    getObjectKeyFromUrl: jest.fn(),
  },
}));

import { ObjectStorageService } from '#services/objectStorage.service.js';
import { createBlurThumbnail, formatImageFile } from '#utils/image.helpers.js';

import { MainImageService } from './mainImage.service.js';

describe('MainImageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formatImageFile.mockResolvedValue(Buffer.from('webp'));
    createBlurThumbnail.mockResolvedValue('data:image/webp;base64,AAAA');
    ObjectStorageService.createObjectKey.mockReturnValue(
      'products/main/a.webp',
    );
    ObjectStorageService.uploadObject.mockResolvedValue('products/main/a.webp');
    ObjectStorageService.deleteObject.mockResolvedValue(undefined);
    ObjectStorageService.buildPublicUrl.mockReturnValue(
      'https://cdn.example.com/products/main/a.webp',
    );
  });

  test('processes the original buffer and returns an uploaded URL with its Data URL placeholder', async () => {
    const buffer = Buffer.from('original');

    await expect(
      MainImageService.upload({ buffer }, 'products/main'),
    ).resolves.toEqual({
      key: 'products/main/a.webp',
      mainImage: 'https://cdn.example.com/products/main/a.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
    });
    expect(formatImageFile).toHaveBeenCalledWith(buffer, 'webp');
    expect(createBlurThumbnail).toHaveBeenCalledWith(buffer);
  });

  test('rejects a missing or invalid original image before upload', async () => {
    await expect(MainImageService.prepare()).rejects.toThrow(
      'تصویر اصلی باید ارسال شود',
    );
    formatImageFile.mockRejectedValueOnce(new Error('invalid'));
    await expect(
      MainImageService.upload({ buffer: Buffer.from('bad') }, 'pets/main'),
    ).rejects.toThrow('تصویر اصلی ارسال‌شده معتبر نیست');
    expect(ObjectStorageService.uploadObject).not.toHaveBeenCalled();
  });

  test('optimizes and uploads gallery images in parallel', async () => {
    const files = [
      { buffer: Buffer.from('first') },
      { buffer: Buffer.from('second') },
    ];

    await expect(
      MainImageService.uploadImages(files, 'pets/images'),
    ).resolves.toEqual([
      {
        key: 'products/main/a.webp',
        url: 'https://cdn.example.com/products/main/a.webp',
      },
      {
        key: 'products/main/a.webp',
        url: 'https://cdn.example.com/products/main/a.webp',
      },
    ]);
    expect(formatImageFile).toHaveBeenCalledTimes(2);
    expect(createBlurThumbnail).not.toHaveBeenCalled();
    expect(ObjectStorageService.uploadObject).toHaveBeenCalledTimes(2);
  });

  test('cleans successful gallery uploads when another upload fails', async () => {
    ObjectStorageService.uploadObject
      .mockResolvedValueOnce('pets/images/first.webp')
      .mockRejectedValueOnce(new Error('upload failed'));

    await expect(
      MainImageService.uploadImages(
        [{ buffer: Buffer.from('first') }, { buffer: Buffer.from('second') }],
        'pets/images',
      ),
    ).rejects.toThrow('upload failed');
    expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
      'pets/images/first.webp',
    );
  });
});
