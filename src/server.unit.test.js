import { createShutdownHandler } from './server.lifecycle.js';

const createServer = (closeImplementation) => ({
  listening: true,
  close: jest.fn(closeImplementation),
  closeAllConnections: jest.fn(),
  closeIdleConnections: jest.fn(),
});

describe('server shutdown lifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('drains HTTP connections before disconnecting MongoDB', async () => {
    const operations = [];
    const server = createServer((callback) => {
      operations.push('http');
      callback();
    });
    const disconnectDatabase = jest.fn(async () => {
      operations.push('mongodb');
    });
    const exit = jest.fn();
    const setExitCode = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase,
      exit,
      setExitCode,
    });

    await shutdown('SIGTERM');

    expect(operations).toEqual(['http', 'mongodb']);
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
    const exit = jest.fn();
    const shutdown = createShutdownHandler({
      server,
      disconnectDatabase,
      exit,
      setExitCode: jest.fn(),
    });

    await shutdown('SIGTERM');

    expect(disconnectDatabase).toHaveBeenCalledTimes(1);
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
});
