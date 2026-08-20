import { createClient } from 'redis';

import logger from '#configs/logger.js';

const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;

const getClientOptions = () => {
  const url = process.env.REDIS_URL?.trim();

  if (url) {
    return { url };
  }

  const configuredPort = Number.parseInt(process.env.REDIS_PORT, 10);

  return {
    socket: {
      host: process.env.REDIS_HOST?.trim() || DEFAULT_REDIS_HOST,
      port: Number.isInteger(configuredPort)
        ? configuredPort
        : DEFAULT_REDIS_PORT,
    },
  };
};

class RedisClient {
  static #client;
  static #connectPromise;
  static #disconnectPromise;
  static #errorHandler;

  static #releaseClient(client) {
    if (this.#client !== client) {
      return;
    }

    if (this.#errorHandler) {
      client.off('error', this.#errorHandler);
    }

    this.#client = undefined;
    this.#errorHandler = undefined;
  }

  static getClient() {
    if (!this.#client) {
      const client = createClient(getClientOptions());
      const handleError = (error) => {
        logger.app.error('خطای سرویس Redis رخ داد', error);
      };

      client.on('error', handleError);
      this.#client = client;
      this.#errorHandler = handleError;
    }

    return this.#client;
  }

  static async connect() {
    if (this.#disconnectPromise) {
      await this.#disconnectPromise;
    }

    const client = this.getClient();

    if (client.isReady) {
      return client;
    }

    if (!this.#connectPromise) {
      const connection = client
        .connect()
        .then(() => {
          logger.app.success('اتصال به Redis برقرار شد');
          return client;
        })
        .catch((error) => {
          try {
            if (client.isOpen) {
              client.destroy();
            }
          } catch (cleanupError) {
            logger.app.error(
              'پاک‌سازی اتصال ناموفق Redis با خطا مواجه شد',
              cleanupError,
            );
          } finally {
            this.#releaseClient(client);
          }

          logger.app.error('اتصال به Redis برقرار نشد', error);
          throw error;
        });
      const trackedConnection = connection.finally(() => {
        if (this.#connectPromise === trackedConnection) {
          this.#connectPromise = undefined;
        }
      });

      this.#connectPromise = trackedConnection;
    }

    return this.#connectPromise;
  }

  static async disconnect() {
    if (this.#disconnectPromise) {
      return this.#disconnectPromise;
    }

    const client = this.#client;

    if (!client) {
      return;
    }

    const disconnection = (async () => {
      try {
        if (this.#connectPromise) {
          await this.#connectPromise;
        }

        if (client.isOpen) {
          try {
            await client.close();
            logger.app.info('اتصال Redis بسته شد');
          } catch (error) {
            try {
              if (client.isOpen) {
                client.destroy();
              }
            } catch (cleanupError) {
              logger.app.error(
                'پاک‌سازی اجباری اتصال Redis با خطا مواجه شد',
                cleanupError,
              );
            }

            throw error;
          }
        }
      } finally {
        this.#releaseClient(client);
      }
    })();
    const trackedDisconnection = disconnection.finally(() => {
      if (this.#disconnectPromise === trackedDisconnection) {
        this.#disconnectPromise = undefined;
      }
    });

    this.#disconnectPromise = trackedDisconnection;
    return this.#disconnectPromise;
  }
}

export default RedisClient;
