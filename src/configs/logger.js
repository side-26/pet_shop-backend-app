import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // ✅ Remove hostname and pid from logs
  base: undefined,

  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
    ],
    censor: '***REDACTED***',
  },

  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'] || 'unknown',
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: (err) => ({
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
    }),
  },

  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: true,
          hideObject: true,
          // ✅ Add UTF-8 support
          messageFormat: true,
          errorProps: '*',
        },
      },

  timestamp: pino.stdTimeFunctions.isoTime,
});

// API logging helpers
logger.api = {
  request: (req, metadata = {}) => {
    logger.info({
      type: 'API_REQUEST',
      req,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },

  success: (req, res, duration, data = {}) => {
    logger.info({
      type: 'API_SUCCESS',
      statusCode: res.statusCode,
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      requestId: req.id,
      userId: req.user?.id,
      responseData: data,
      timestamp: new Date().toISOString(),
    });
  },

  clientError: (req, res, duration, error = {}) => {
    logger.warn({
      type: 'API_CLIENT_ERROR',
      statusCode: res.statusCode,
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      requestId: req.id,
      userId: req.user?.id,
      error: {
        message: error.message,
        code: error.code,
      },
      responseBody: error.responseBody,
      timestamp: new Date().toISOString(),
    });
  },

  serverError: (err, req, res, duration, metadata = {}) => {
    logger.error({
      type: 'API_SERVER_ERROR',
      statusCode: res.statusCode || 500,
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      requestId: req.id,
      userId: req.user?.id,
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code,
      },
      metadata,
      timestamp: new Date().toISOString(),
    });
  },

  error: (err, req, metadata = {}) => {
    logger.error({
      type: 'API_ERROR',
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code,
      },
      method: req?.method,
      url: req?.url,
      body: req?.body,
      requestId: req?.id,
      userId: req?.user?.id,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },
};

// Application logging helpers
logger.app = {
  info: (message, data = {}) => {
    logger.info({
      type: 'APP_INFO',
      message,
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  success: (message, data = {}) => {
    logger.info({
      type: 'APP_SUCCESS',
      message,
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  warn: (message, data = {}) => {
    logger.warn({
      type: 'APP_WARN',
      message,
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  error: (message, error, data = {}) => {
    logger.error({
      type: 'APP_ERROR',
      message,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
      },
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  db: (operation, collection, data = {}) => {
    logger.debug({
      type: 'DATABASE',
      operation,
      collection,
      ...data,
      timestamp: new Date().toISOString(),
    });
  },

  user: (action, userId, data = {}) => {
    logger.info({
      type: 'USER_ACTION',
      action,
      userId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
