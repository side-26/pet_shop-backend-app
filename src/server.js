import app from './app.js';
import logger from '#configs/logger.js';
import connectDB from '#configs/db.config.js';

const PORT = process.env.PORT || 3000;

// ============================================
// SERVER STARTUP
// ============================================

const startServer = () => {
  connectDB(() => {
    const server = app.listen(PORT, () => {
      logger.app.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        url: `http://localhost:${PORT}`,
        nodeVersion: process.version,
        pid: process.pid,
      });

      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      // console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
    });

    // ============================================
    // GRACEFUL SHUTDOWN
    // ============================================

    const gracefulShutdown = (signal) => {
      logger.app.warn('Received shutdown signal', { signal });
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        logger.app.info('Server closed gracefully', {
          uptime: process.uptime(),
          connections: server._connections || 0,
        });
        console.log('👋 Server closed gracefully');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.app.error('Force shutdown after timeout');
        console.log('💥 Force shutdown');
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ============================================
    // UNHANDLED EXCEPTIONS & REJECTIONS
    // ============================================

    process.on('uncaughtException', (error) => {
      logger.app.error('Uncaught exception', error, {
        type: 'uncaughtException',
        stack: error.stack,
      });
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      logger.app.error('Unhandled rejection', error, {
        type: 'unhandledRejection',
        promise: String(promise),
      });
      console.error('💥 Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

    return server;
  });
};

// ============================================
// START THE APPLICATION
// ============================================

startServer();
