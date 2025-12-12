const jwt = require('jsonwebtoken');
const config = require('../config');
const supabaseService = require('../services/supabaseService');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens from Supabase
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No valid authorization token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Use Supabase to verify the JWT token
    const { data: { user }, error } = await supabaseService.supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Token verification failed:', { error: error?.message });
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }

    // Optionally fetch user profile to ensure user exists
    const userProfile = await supabaseService.getUserProfile(user.id);
    
    // Attach user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: userProfile?.role || 'user',
      profile: userProfile
    };

    logger.info(`Authenticated user: ${user.id}`, { 
      email: user.email,
      role: req.user.role 
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }

    return res.status(500).json({ 
      error: 'Authentication service error' 
    });
  }
};

/**
 * Middleware to make authentication optional
 * Sets req.user if valid token is provided, but doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.supabase.serviceKey);
    const userId = decoded.sub;
    
    if (userId) {
      const userProfile = await supabaseService.getUserProfile(userId);
      req.user = {
        id: userId,
        email: decoded.email,
        role: userProfile?.role || 'user',
        profile: userProfile
      };
    }

    next();
  } catch (error) {
    // On error with optional auth, just continue without user
    logger.warn('Optional auth failed:', error.message);
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required' 
    });
  }

  next();
};

/**
 * Middleware to ensure user owns the resource or has admin access
 */
const requireOwnershipOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (req.user.role === 'admin' || req.user.id === resourceUserId) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Access denied: insufficient permissions' 
    });
  };
};

module.exports = {
  authenticateUser,
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin
};
