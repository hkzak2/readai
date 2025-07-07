const logger = require('../utils/logger');
const config = require('../config');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  } else if (err.message && err.message.includes('429')) {
    statusCode = 429;
    message = 'API rate limit exceeded. Please try again later.';
  } else if (err.message && err.message.includes('quota')) {
    statusCode = 429;
    message = 'API quota exceeded. Please try again later or use a different API key.';
  }

  const errorResponse = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  // Include error details in development
  if (config.nodeEnv === 'development') {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
