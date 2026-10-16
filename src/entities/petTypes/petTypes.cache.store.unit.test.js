jest.mock('#configs/logger.js', () => ({
  app: {
    warn: jest.fn(),
  },
}));

import logger from '#configs/logger.js';

import { PetTypeCacheStore } from './petTypes.cache.store.js';

describe('PetTypeCacheStore', () => {
  let client;
  let store;

  beforeEach(() => {
    client = {
      del: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };
    store = new PetTypeCacheStore({ client });

    jest.clearAllMocks();
  });

  test('uses stable labels for every public pet-type read shape', () => {
    expect(PetTypeCacheStore.getAllLabel(false)).toBe('all:enabled');
    expect(PetTypeCacheStore.getAllLabel(true)).toBe('all:with-disabled');
    expect(PetTypeCacheStore.getByIdLabel('pet-type-id')).toBe(
      'id:pet-type-id',
    );
    expect(PetTypeCacheStore.getBySlugLabel('dog')).toBe('slug:dog');
  });

  test('returns a cached value without loading MongoDB', async () => {
    const cachedPetType = { _id: 'pet-type-id', title: 'Dog' };
    const loader = jest.fn();
    client.get.mockResolvedValue(JSON.stringify(cachedPetType));

    await expect(store.getOrLoad('id:pet-type-id', loader)).resolves.toEqual(
      cachedPetType,
    );

    expect(loader).not.toHaveBeenCalled();
  });

  test('loads MongoDB and populates a bounded cache entry on a miss', async () => {
    const petType = { _id: 'pet-type-id', title: 'Dog' };
    const loader = jest.fn().mockResolvedValue(petType);
    client.get.mockResolvedValue(null);

    await expect(store.getOrLoad('id:pet-type-id', loader)).resolves.toEqual(
      petType,
    );

    expect(client.set).toHaveBeenCalledWith(
      'pet-types:id:pet-type-id',
      JSON.stringify(petType),
      { EX: 300 },
    );
  });

  test('falls back to MongoDB when Redis is unavailable', async () => {
    const redisError = new Error('Redis unavailable');
    const petType = { _id: 'pet-type-id', title: 'Dog' };
    client.get.mockRejectedValue(redisError);
    client.set.mockRejectedValue(redisError);

    await expect(
      store.getOrLoad('id:pet-type-id', jest.fn().mockResolvedValue(petType)),
    ).resolves.toEqual(petType);

    expect(logger.app.warn).toHaveBeenCalledTimes(2);
  });

  test('invalidates all list entries and the changed detail entries', async () => {
    await store.invalidate({
      _id: 'pet-type-id',
      slug: 'dog',
    });

    expect(client.del).toHaveBeenCalledWith([
      'pet-types:all:enabled',
      'pet-types:all:with-disabled',
      'pet-types:id:pet-type-id',
      'pet-types:slug:dog',
    ]);
  });

  test('logs and absorbs cache cleanup errors after a persisted mutation', async () => {
    client.del.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      store.invalidate({ _id: 'pet-type-id' }),
    ).resolves.toBeUndefined();

    expect(logger.app.warn).toHaveBeenCalledWith(
      'پاک‌سازی کش نوع حیوان در Redis ناموفق بود',
      expect.any(Error),
    );
  });
});
