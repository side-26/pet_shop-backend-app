import { nanoid } from 'nanoid';
import logger from '#configs/logger.js';

// Request logging middleware
export const logRequest = (req, res, next) => {
  const start = Date.now();

  // Use nanoid for request ID
  req.id = req.headers?.['x-request-id'] || nanoid(21);

  // Store start time
  req._startTime = start;

  // ✅ Initialize error logged flag
  req._errorLogged = false;

  // Log request
  logger.api.request(req);

  // Capture response body for error logging
  let responseBody = null;

  // Override json method
  const originalJson = res.json;
  res.json = function (data) {
    responseBody = data;
    return originalJson.call(this, data);
  };

  // Override send method
  const originalSend = res.send;
  res.send = function (data) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // Log on finish
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Skip logging for health checks
    if (req?.url === '/health') {
      return;
    }

    // ✅ CRITICAL: Skip if error was already logged by logError middleware
    if (req._errorLogged) {
      return;
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error({
        type: 'SERVER_ERROR',
        statusCode: res.statusCode,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        requestId: req.id,
        userId: req.user?.id,
        ip: req.ip,
        responseBody: responseBody,
        timestamp: new Date().toISOString(),
      });
    } else if (res.statusCode >= 400) {
      logger.warn({
        type: 'CLIENT_ERROR',
        statusCode: res.statusCode,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        requestId: req.id,
        userId: req.user?.id,
        ip: req.ip,
        responseBody: responseBody,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.info({
        type: 'SUCCESS',
        statusCode: res.statusCode,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        requestId: req.id,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      });
    }
  });

  next();
};

// Error logging middleware
export const logError = (err, req, res, next) => {
  // ✅ Mark request as error logged
  req._errorLogged = true;

  // If it's a client error (4xx), log as warning
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    err._logged = true;
    err._isClientError = true;

    logger.warn({
      type: 'CLIENT_ERROR',
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      method: req?.method,
      url: req?.url,
      requestId: req?.id,
      userId: req?.user?.id,
      ip: req?.ip,
      body: req?.body,
      timestamp: new Date().toISOString(),
    });

    return next(err);
  }

  // Server errors (5xx) or unexpected errors
  err._logged = true;

  const duration = req?._startTime ? Date.now() - req._startTime : 0;

  logger.error({
    type: 'SERVER_ERROR',
    statusCode: err.statusCode || 500,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
    },
    method: req?.method,
    url: req?.url,
    requestId: req?.id,
    userId: req?.user?.id,
    ip: req?.ip,
    body: req?.body,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });

  next(err);
};
