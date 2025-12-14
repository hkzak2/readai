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
    
    // In development, allow all origins
    if (config.nodeEnv === 'development' || config.corsAllowAll) {
      return callback(null, origin);
    }
    
    // Allow Replit domains
    if (origin.includes('.replit.dev') || origin.includes('.repl.co') || origin.includes('127.0.0.1') || origin.includes('localhost')) {
      return callback(null, origin);
    }
    
    // Check if the origin is in our allowedOrigins array
    if (config.allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, origin);
    }
    
    // Default: allow the origin (permissive for development)
    return callback(null, origin);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
});

module.exports = corsMiddleware;
