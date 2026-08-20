jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

jest.mock('#configs/logger.js', () => ({
  __esModule: true,
  default: {
    app: {
      error: jest.fn(),
      info: jest.fn(),
      success: jest.fn(),
    },
  },
}));

import { createClient } from 'redis';

import RedisClient from './client.js';

const createMockClient = () => {
  const client = {
    isOpen: false,
    isReady: false,
    close: jest.fn(async () => {
      client.isOpen = false;
      client.isReady = false;
    }),
    connect: jest.fn(async () => {
      client.isOpen = true;
      client.isReady = true;
      return client;
    }),
    destroy: jest.fn(() => {
      client.isOpen = false;
      client.isReady = false;
    }),
    off: jest.fn(),
    on: jest.fn(),
  };

  return client;
};

describe('Redis client lifecycle', () => {
  let client;
  let originalRedisHost;
  let originalRedisPort;
  let originalRedisUrl;

  beforeEach(async () => {
    await RedisClient.disconnect();
    jest.clearAllMocks();

    originalRedisHost = process.env.REDIS_HOST;
    originalRedisPort = process.env.REDIS_PORT;
    originalRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'redis.test';
    process.env.REDIS_PORT = '6380';

    client = createMockClient();
    createClient.mockReturnValue(client);
  });

  afterEach(async () => {
    await RedisClient.disconnect().catch(() => {});

    if (originalRedisHost === undefined) {
      delete process.env.REDIS_HOST;
    } else {
      process.env.REDIS_HOST = originalRedisHost;
    }

    if (originalRedisPort === undefined) {
      delete process.env.REDIS_PORT;
    } else {
      process.env.REDIS_PORT = originalRedisPort;
    }

    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  test('creates one client with the configured host and port', () => {
    const firstClient = RedisClient.getClient();
    const secondClient = RedisClient.getClient();

    expect(firstClient).toBe(client);
    expect(secondClient).toBe(client);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith({
      socket: {
        host: 'redis.test',
        port: 6380,
      },
    });
    expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('prefers REDIS_URL when it is configured', () => {
    process.env.REDIS_URL = 'redis://redis.test:6381/2';

    RedisClient.getClient();

    expect(createClient).toHaveBeenCalledWith({
      url: 'redis://redis.test:6381/2',
    });
  });

  test('connects once when concurrent callers share startup', async () => {
    let finishConnection;
    client.connect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishConnection = () => {
            client.isOpen = true;
            client.isReady = true;
            resolve(client);
          };
        }),
    );

    const firstConnection = RedisClient.connect();
    const secondConnection = RedisClient.connect();

    expect(client.connect).toHaveBeenCalledTimes(1);

    finishConnection();

    await expect(firstConnection).resolves.toBe(client);
    await expect(secondConnection).resolves.toBe(client);
  });

  test('returns an already ready client without reconnecting', async () => {
    client.isOpen = true;
    client.isReady = true;

    await expect(RedisClient.connect()).resolves.toBe(client);

    expect(client.connect).not.toHaveBeenCalled();
  });

  test('closes the connection and removes its owned error listener', async () => {
    await RedisClient.connect();
    const errorHandler = client.on.mock.calls[0][1];

    await RedisClient.disconnect();

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(client.off).toHaveBeenCalledWith('error', errorHandler);

    const replacementClient = createMockClient();
    createClient.mockReturnValue(replacementClient);

    expect(RedisClient.getClient()).toBe(replacementClient);
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  test('does not close a client whose socket was never opened', async () => {
    RedisClient.getClient();

    await RedisClient.disconnect();

    expect(client.close).not.toHaveBeenCalled();
    expect(client.off).toHaveBeenCalledTimes(1);
  });

  test('destroys a partially opened client and preserves a connection error', async () => {
    const connectionError = new Error('connection failed');
    client.connect.mockImplementation(async () => {
      client.isOpen = true;
      throw connectionError;
    });

    await expect(RedisClient.connect()).rejects.toBe(connectionError);

    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(client.off).toHaveBeenCalledTimes(1);
  });

  test('releases the client even when graceful close fails', async () => {
    const closeError = new Error('close failed');

    await RedisClient.connect();
    client.close.mockRejectedValue(closeError);

    await expect(RedisClient.disconnect()).rejects.toBe(closeError);

    expect(client.destroy).toHaveBeenCalledTimes(1);

    const replacementClient = createMockClient();
    createClient.mockReturnValue(replacementClient);

    expect(RedisClient.getClient()).toBe(replacementClient);
  });
});
