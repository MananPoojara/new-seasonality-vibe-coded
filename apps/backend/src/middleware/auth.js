/**
 * Authentication Middleware
 * JWT-based authentication with API key support and caching
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const config = require('../config');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

// Simple in-memory cache for user data (5 minute TTL)
// Use Redis in production for better scalability
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// API key cache (separate from user cache for API keys)
const apiKeyCache = new Map();
const API_KEY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Get user from cache or database
 */
const getCachedUser = async (userId) => {
  const cacheKey = `user:${userId}`;
  const cached = userCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subscriptionTier: true,
      subscriptionExpiry: true,
      isActive: true,
    },
  });

  if (user) {
    userCache.set(cacheKey, { user, timestamp: Date.now() });
  }

  return user;
};

/**
 * Verify JWT token from Authorization header (optimized)
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    // Try API key authentication first
    if (apiKey) {
      return authenticateApiKey(req, res, next, apiKey);
    }

    // JWT authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // Use cached user lookup
    const user = await getCachedUser(decoded.userId);

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Check subscription expiry
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      user.subscriptionTier = 'trial';
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    next(error);
  }
};

/**
 * Authenticate using API key (OPTIMIZED with caching)
 */
const authenticateApiKey = async (req, res, next, apiKey) => {
  try {
    // Create a hash of the API key for cache lookup (SHA-256 for speed)
    const crypto = require('crypto');
    const apiKeyCacheKey = `apikey:${crypto.createHash('sha256').update(apiKey).digest('hex')}`;

    // Check cache first
    const cached = apiKeyCache.get(apiKeyCacheKey);
    if (cached && Date.now() - cached.timestamp < API_KEY_CACHE_TTL) {
      req.user = cached.user;
      req.apiKey = cached.apiKeyData;

      // Update usage in background (non-blocking)
      prisma.apiKey.update({
        where: { id: cached.apiKeyData.id },
        data: {
          usageToday: { increment: 1 },
          totalUsage: { increment: 1 },
          lastUsed: new Date(),
        },
      }).catch(err => {
        // Don't throw or log - this is just metrics
      });

      return next();
    }

    // Cache miss - query database
    const apiKeys = await prisma.apiKey.findMany({
      where: { isActive: true },
      select: {
        id: true,
        keyHash: true,
        userId: true,
        permissions: true,
        rateLimit: true,
        usageToday: true,
        totalUsage: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            subscriptionTier: true,
            subscriptionExpiry: true,
            isActive: true,
          },
        },
      },
      take: 100, // Limit results to prevent massive queries
    });

    let matchedKey = null;
    // Find matching key
    for (const key of apiKeys) {
      if (await bcrypt.compare(apiKey, key.keyHash)) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      throw new AuthenticationError('Invalid API key');
    }

    if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < new Date()) {
      throw new AuthenticationError('API key expired');
    }

    if (!matchedKey.user.isActive) {
      throw new AuthenticationError('User account inactive');
    }

    const apiKeyData = {
      id: matchedKey.id,
      usageToday: matchedKey.usageToday,
      totalUsage: matchedKey.totalUsage,
      rateLimit: matchedKey.rateLimit,
      expiresAt: matchedKey.expiresAt,
    };

    // Cache the result
    apiKeyCache.set(apiKeyCacheKey, {
      user: matchedKey.user,
      apiKeyData,
      timestamp: Date.now(),
    });

    // Update usage in background (non-blocking)
    prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: {
        usageToday: { increment: 1 },
        totalUsage: { increment: 1 },
        lastUsed: new Date(),
      },
    }).catch(err => {
      // Don't throw or log - this is just metrics
    });

    req.user = matchedKey.user;
    req.apiKey = apiKeyData;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.error('API key authentication error:', { error: error.message });
      next(error);
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }
    return authenticateToken(req, res, next);
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Require specific roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    next();
  };
};

/**
 * Require specific subscription tiers
 */
const requireSubscription = (...tiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!tiers.includes(req.user.subscriptionTier)) {
      return next(new AuthorizationError(`This feature requires ${tiers.join(' or ')} subscription`));
    }
    next();
  };
};

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

/**
 * Compare password
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireSubscription,
  generateTokens,
  hashPassword,
  comparePassword,
};
