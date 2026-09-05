jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: { uploadImage: jest.fn() },
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    deleteObject: jest.fn(),
    getObjectKeyFromUrl: jest.fn(),
  },
}));

import { MainImageService } from '#services/mainImage.service.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';

import { ImagesService } from './images.service.js';

describe('ImagesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploads one optimized image under the management image prefix', async () => {
    const imageFile = { buffer: Buffer.from('source-image') };
    MainImageService.uploadImage.mockResolvedValue({
      key: 'management/images/generated.webp',
      url: 'https://cdn.example.test/management/images/generated.webp',
    });

    await expect(ImagesService.upload(imageFile)).resolves.toBe(
      'https://cdn.example.test/management/images/generated.webp',
    );
    expect(MainImageService.uploadImage).toHaveBeenCalledWith(
      imageFile,
      'management/images',
    );
  });

  test('deletes only a public URL owned by the configured bucket', async () => {
    const imageUrl =
      'https://cdn.example.test/management/images/generated.webp';
    ObjectStorageService.getObjectKeyFromUrl.mockReturnValue(
      'management/images/generated.webp',
    );
    ObjectStorageService.deleteObject.mockResolvedValue();

    await expect(ImagesService.delete(imageUrl)).resolves.toBeUndefined();
    expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
      'management/images/generated.webp',
    );

    ObjectStorageService.getObjectKeyFromUrl.mockImplementationOnce(() => {
      throw new TypeError('outside bucket');
    });
    await expect(
      ImagesService.delete('https://attacker.example/image.webp'),
    ).rejects.toThrow('نشانی تصویر متعلق به فضای ذخیره‌سازی نیست');
    expect(ObjectStorageService.deleteObject).toHaveBeenCalledTimes(1);
  });
});
