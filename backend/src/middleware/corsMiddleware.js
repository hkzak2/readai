/**
 * CORS middleware for consistent handling of Cross-Origin Resource Sharing
 */
const cors = require('cors');
const config = require('../config');

/**
 * Dynamic CORS configuration middleware
 * - Allows specified origins
 * - More permissive in development mode
 * - Handles preflight OPTIONS requests
 */
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in our allowedOrigins array
    if (config.allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      // For development, we can be more permissive and check if origin contains localhost
      if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
        return callback(null, true);
      }
      // For production we would be more strict
      return callback(null, config.allowedOrigins[0]);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
});

module.exports = corsMiddleware;
