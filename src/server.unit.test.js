import { createShutdownHandler, startApplication } from './server.lifecycle.js';

const createServer = (closeImplementation) => ({
  listening: true,
  close: jest.fn(closeImplementation),
  closeAllConnections: jest.fn(),
  closeIdleConnections: jest.fn(),
});

describe('server startup lifecycle', () => {
  test('connects MongoDB and Redis before accepting HTTP requests', async () => {
    const operations = [];
    const server = {};
    const connectDatabase = jest.fn(async () => {
      operations.push('mongodb:connect');
    });
    const connectRedis = jest.fn(async () => {
      operations.push('redis:connect');
    });
    const startHttpServer = jest.fn(async () => {
      operations.push('http:listen');
      return server;
    });

    await expect(
      startApplication({
        startHttpServer,
        connectDatabase,
        connectRedis,
        disconnectDatabase: jest.fn(),
        disconnectRedis: jest.fn(),
      }),
    ).resolves.toBe(server);

    expect(operations).toEqual([
      'mongodb:connect',
      'redis:connect',
      'http:listen',
    ]);
  });

  test('disconnects MongoDB and then Redis when Redis startup fails', async () => {
    const startupError = new Error('redis startup failed');
    const operations = [];
    const connectDatabase = jest.fn(async () => {
      operations.push('mongodb:connect');
    });
    const connectRedis = jest.fn(async () => {
      operations.push('redis:connect');
      throw startupError;
    });
    const disconnectDatabase = jest.fn(async () => {
      operations.push('mongodb:disconnect');
    });
    const disconnectRedis = jest.fn(async () => {
      operations.push('redis:disconnect');
    });
    const startHttpServer = jest.fn();

    await expect(
      startApplication({
        startHttpServer,
        connectDatabase,
        connectRedis,
        disconnectDatabase,
        disconnectRedis,
      }),
    ).rejects.toBe(startupError);

    expect(operations).toEqual([
      'mongodb:connect',
      'redis:connect',
      'mongodb:disconnect',
      'redis:disconnect',
    ]);
    expect(startHttpServer).not.toHaveBeenCalled();
  });

  test('disconnects MongoDB and then Redis when HTTP startup fails', async () => {
    const startupError = new Error('listen failed');
    const operations = [];
    const connectDatabase = jest.fn(async () => {
      operations.push('mongodb:connect');
    });
    const connectRedis = jest.fn(async () => {
      operations.push('redis:connect');
    });
    const startHttpServer = jest.fn(async () => {
      operations.push('http:listen');
      throw startupError;
    });
    const disconnectDatabase = jest.fn(async () => {
      operations.push('mongodb:disconnect');
    });
    const disconnectRedis = jest.fn(async () => {
      operations.push('redis:disconnect');
    });

    await expect(
      startApplication({
        startHttpServer,
        connectDatabase,
        connectRedis,
        disconnectDatabase,
        disconnectRedis,
      }),
    ).rejects.toBe(startupError);

    expect(operations).toEqual([
      'mongodb:connect',
      'redis:connect',
      'http:listen',
      'mongodb:disconnect',
      'redis:disconnect',
    ]);
  });
});

describe('server shutdown lifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('disconnects Redis after HTTP and MongoDB resources', async () => {
    const operations = [];
    const server = createServer((callback) => {
      operations.push('http');
      callback();
    });
    const disconnectDatabase = jest.fn(async () => {
      operations.push('mongodb');
    });
    const disconnectRedis = jest.fn(async () => {
      operations.push('redis');
    });
    const exit = jest.fn();
    const setExitCode = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase,
      disconnectRedis,
      exit,
      setExitCode,
    });

    await shutdown('SIGTERM');

    expect(operations).toEqual(['http', 'mongodb', 'redis']);
    expect(server.closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(setExitCode).toHaveBeenCalledWith(0);
    expect(exit).not.toHaveBeenCalled();
  });

  test('uses a failure exit code for a fatal process error', async () => {
    const server = createServer((callback) => callback());
    const setExitCode = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase: jest.fn(),
      disconnectRedis: jest.fn(),
      exit: jest.fn(),
      setExitCode,
    });

    await shutdown('uncaughtException', {
      exitCode: 1,
      error: new Error('fatal'),
    });

    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  test('still attempts MongoDB disconnect when closing HTTP fails', async () => {
    const closeError = new Error('close failed');
    const server = createServer((callback) => callback(closeError));
    const disconnectDatabase = jest.fn();
    const disconnectRedis = jest.fn();
    const exit = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase,
      disconnectRedis,
      exit,
      setExitCode: jest.fn(),
    });

    await shutdown('SIGTERM');

    expect(disconnectDatabase).toHaveBeenCalledTimes(1);
    expect(disconnectRedis).toHaveBeenCalledTimes(1);
    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('forces shutdown when the cleanup deadline expires', async () => {
    jest.useFakeTimers();
    const server = createServer(() => {});
    const exit = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase: jest.fn(),
      disconnectRedis: jest.fn(),
      timeoutMs: 25,
      exit,
      setExitCode: jest.fn(),
    });

    const shutdownPromise = shutdown('SIGTERM');
    await jest.advanceTimersByTimeAsync(25);
    await shutdownPromise;

    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('forces shutdown immediately when a second signal arrives', async () => {
    let finishClosing;
    const server = createServer((callback) => {
      finishClosing = callback;
    });
    const exit = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase: jest.fn(),
      disconnectRedis: jest.fn(),
      exit,
      setExitCode: jest.fn(),
    });

    const firstShutdown = shutdown('SIGTERM');
    shutdown('SIGINT');

    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);

    finishClosing();
    await firstShutdown;
  });

  test('still disconnects Redis when MongoDB disconnect fails', async () => {
    const databaseError = new Error('database disconnect failed');
    const operations = [];
    const server = createServer((callback) => callback());
    const disconnectDatabase = jest.fn(async () => {
      operations.push('mongodb');
      throw databaseError;
    });
    const disconnectRedis = jest.fn(async () => {
      operations.push('redis');
    });
    const exit = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase,
      disconnectRedis,
      exit,
      setExitCode: jest.fn(),
    });

    await shutdown('SIGTERM');

    expect(operations).toEqual(['mongodb', 'redis']);
    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
