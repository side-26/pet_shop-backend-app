jest.mock('#configs/arvanCloud.config.js', () => ({
  arvanS3: { send: jest.fn() },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'generated-id'),
}));

import { nanoid } from 'nanoid';

import { arvanS3 } from '#configs/arvanCloud.config.js';
import { OBJECT_STORAGE } from '#configs/constants.js';

import { ObjectStorageService } from './objectStorage.service.js';

const mockSend = arvanS3.send;

describe('ObjectStorageService', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnvironment,
      ARVAN_BUCKET: 'pet-shop',
      ARVAN_ENDPOINT: 'https://s3.example.test',
    };
    delete process.env.ARVAN_PUBLIC_BASE_URL;
    mockSend.mockResolvedValue({});
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('creates an object key with nanoid', () => {
    expect(ObjectStorageService.createObjectKey('/pets/images/', '.WEBP')).toBe(
      'pets/images/generated-id.webp',
    );
    expect(nanoid).toHaveBeenCalledWith(OBJECT_STORAGE.DEFAULT_ID_LENGTH);
  });

  it('uploads an object and returns its normalized key', async () => {
    const body = Buffer.from('image');

    await expect(
      ObjectStorageService.uploadObject({
        key: '/users/id/avatar.webp/',
        body,
        contentType: 'image/webp',
      }),
    ).resolves.toBe('users/id/avatar.webp');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].input).toEqual({
      Bucket: 'pet-shop',
      Key: 'users/id/avatar.webp',
      Body: body,
      ContentType: 'image/webp',
      CacheControl: OBJECT_STORAGE.DEFAULT_CACHE_CONTROL,
    });
  });

  it('deletes one object', async () => {
    await ObjectStorageService.deleteObject('users/id/avatar.webp');

    expect(mockSend.mock.calls[0][0].input).toEqual({
      Bucket: 'pet-shop',
      Key: 'users/id/avatar.webp',
    });
  });

  it('deletes multiple objects in one request', async () => {
    await ObjectStorageService.deleteObjects([
      'pets/one.webp',
      'pets/two.webp',
    ]);

    expect(mockSend.mock.calls[0][0].input).toEqual({
      Bucket: 'pet-shop',
      Delete: {
        Objects: [{ Key: 'pets/one.webp' }, { Key: 'pets/two.webp' }],
        Quiet: true,
      },
    });
  });

  it('does not send a delete request for an empty list', async () => {
    await ObjectStorageService.deleteObjects([]);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('builds URLs from a configured public base URL', () => {
    process.env.ARVAN_PUBLIC_BASE_URL = 'https://cdn.example.test/';

    expect(ObjectStorageService.buildPublicUrl('pets/image.webp')).toBe(
      'https://cdn.example.test/pets/image.webp',
    );
  });

  it('falls back to the bucket endpoint URL', () => {
    expect(ObjectStorageService.buildPublicUrl('pets/image.webp')).toBe(
      'https://pet-shop.s3.example.test/pets/image.webp',
    );
  });

  it('rejects unsafe object keys and missing configuration', async () => {
    expect(() => ObjectStorageService.createObjectKey('../pets')).toThrow(
      'Directory is invalid',
    );

    delete process.env.ARVAN_BUCKET;
    await expect(
      ObjectStorageService.uploadObject({
        key: 'pets/image.webp',
        body: Buffer.from('image'),
        contentType: 'image/webp',
      }),
    ).rejects.toThrow('ARVAN_BUCKET is not configured');
  });
});
