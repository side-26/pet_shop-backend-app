import { pathToFileURL } from 'node:url';

import { STATUES } from '#configs/constants.js';
import logger from '#configs/logger.js';

import app from './app.js';
import {
  createShutdownHandler,
  registerProcessHandlers,
  startApplication,
} from './server.lifecycle.js';

const PORT = process.env.PORT || 3000;

const listen = (application, port) =>
  new Promise((resolve, reject) => {
    const server = application.listen(port);

    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off('error', handleError);
      resolve(server);
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
  });

export const startServer = async () => {
  const server = await startApplication({
    startHttpServer: () => listen(app, PORT),
  });

  const shutdown = createShutdownHandler({ server });
  registerProcessHandlers(shutdown);
  logger.app.success('سرور با موفقیت راه‌اندازی شد', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`,
    nodeVersion: process.version,
    pid: process.pid,
  });

  return server;
};

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer().catch((error) => {
    logger.app.error('راه‌اندازی سرور ناموفق بود', error, {
      statusCode: STATUES.INTERNAL_SERVER,
    });
    process.exitCode = 1;
  });
}
