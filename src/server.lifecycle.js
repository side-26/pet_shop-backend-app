import { SERVER_LIFECYCLE } from '#configs/constants.js';
import { disconnectDB } from '#configs/db.config.js';
import logger from '#configs/logger.js';

const closeHttpServer = (server) =>
  new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });

    // Explicitly drain keep-alive connections on Node versions where close()
    // does not do so automatically.
    server.closeIdleConnections?.();
  });

const closeResources = async (server, disconnectDatabase) => {
  const errors = [];

  try {
    await closeHttpServer(server);
  } catch (error) {
    errors.push(error);
  }

  try {
    await disconnectDatabase();
  } catch (error) {
    errors.push(error);
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'بستن منابع برنامه ناموفق بود');
  }
};

export const createShutdownHandler = ({
  server,
  disconnectDatabase = disconnectDB,
  timeoutMs = SERVER_LIFECYCLE.SHUTDOWN_TIMEOUT_MS,
  exit = process.exit.bind(process),
  setExitCode = (code) => {
    process.exitCode = code;
  },
}) => {
  let shutdownPromise;

  const forceShutdown = (reason, error) => {
    logger.app.error('خاموش‌سازی اجباری برنامه انجام شد', error, { reason });
    server.closeAllConnections?.();
    exit(1);
  };

  return (reason, { exitCode = 0, error } = {}) => {
    if (shutdownPromise) {
      logger.app.warn('درخواست دوم خاموش‌سازی دریافت شد', { reason });
      forceShutdown(reason, error);
      return shutdownPromise;
    }

    logger.app.warn('خاموش‌سازی تدریجی برنامه آغاز شد', { reason });

    shutdownPromise = (async () => {
      let timeoutId;
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('مهلت خاموش‌سازی برنامه به پایان رسید'));
        }, timeoutMs);
        timeoutId.unref?.();
      });

      try {
        await Promise.race([
          closeResources(server, disconnectDatabase),
          timeout,
        ]);
        setExitCode(exitCode);
        logger.app.info('برنامه با موفقیت خاموش شد', {
          reason,
          uptime: process.uptime(),
        });
      } catch (shutdownError) {
        forceShutdown(reason, shutdownError);
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return shutdownPromise;
  };
};

export const registerProcessHandlers = (shutdown) => {
  const handlers = {
    SIGTERM: () => void shutdown('SIGTERM'),
    SIGINT: () => void shutdown('SIGINT'),
    uncaughtException: (error) => {
      logger.app.error('خطای مدیریت‌نشده رخ داد', error, {
        type: 'uncaughtException',
      });
      void shutdown('uncaughtException', { exitCode: 1, error });
    },
    unhandledRejection: (reason) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      logger.app.error('رد شدن مدیریت‌نشده Promise رخ داد', error, {
        type: 'unhandledRejection',
      });
      void shutdown('unhandledRejection', { exitCode: 1, error });
    },
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    process.on(event, handler);
  });

  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      process.off(event, handler);
    });
  };
};
