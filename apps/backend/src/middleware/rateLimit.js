/**
 * Rate Limiting Middleware
 * Per-user rate limiting based on subscription tier
 */
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { RateLimitError } = require('../utils/errors');
const { redis } = require('../utils/redis');
const { logger } = require('../utils/logger');

/**
 * Custom rate limit store using Redis (optimized)
 */
class RedisStore {
  constructor() {
    this.prefix = 'rl:';
  }

  async increment(key) {
    const redisKey = this.prefix + key;
    // Use INCR with pipelined EXPIRE for better performance
    const multi = redis.multi();
    multi.incr(redisKey);
    multi.expire(redisKey, 3600); // 1 hour window
    const results = await multi.exec();
    const current = results[0][1];

    return {
      totalHits: current,
      resetTime: new Date(Date.now() + 3600000),
    };
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    await redis.decr(redisKey);
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    await redis.del(redisKey);
  }
}

/**
 * Get rate limit based on user's subscription tier
 */
const getRateLimitForTier = (tier) => {
  return config.rateLimits[tier] || config.rateLimits.trial;
};

/**
 * Cache rate limiters by tier (optimization - create once, reuse)
 */
const rateLimiterCache = new Map();

/**
 * Get or create a cached rate limiter for a tier
 */
const getRateLimiter = (tier) => {
  // Check cache first
  if (!rateLimiterCache.has(tier)) {
    const limits = getRateLimitForTier(tier);

    const limiter = rateLimit({
      windowMs: limits.windowMs,
      max: limits.max,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id?.toString() || req.ip;
      },
      handler: (req, res, next) => {
        logger.warn('Rate limit exceeded', {
          userId: req.user?.id,
          ip: req.ip,
          tier,
        });
        next(new RateLimitError(`Rate limit exceeded. Upgrade to ${tier === 'trial' ? 'basic' : 'premium'} for higher limits.`));
      },
      skip: (req) => {
        // Skip rate limiting for admin users
        return req.user?.role === 'admin';
      },
      // Skip successful requests to reduce Redis operations
      skipSuccessfulRequests: true,
    });

    // Cache the limiter
    rateLimiterCache.set(tier, limiter);
  }

  return rateLimiterCache.get(tier);
};

/**
 * Dynamic rate limiter based on subscription (OPTIMIZED with caching)
 */
const dynamicRateLimiter = (req, res, next) => {
  const tier = req.user?.subscriptionTier || 'trial';
  const limiter = getRateLimiter(tier);
  return limiter(req, res, next);
};

/**
 * Strict rate limiter for sensitive endpoints (login, register)
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next) => {
    logger.warn('Strict rate limit exceeded', { ip: req.ip });
    next(new RateLimitError('Too many attempts. Please try again later.'));
  },
});

/**
 * API endpoint rate limiter
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  handler: (req, res, next) => {
    next(new RateLimitError('Too many requests. Please slow down.'));
  },
});

module.exports = {
  dynamicRateLimiter,
  strictRateLimiter,
  apiRateLimiter,
  getRateLimitForTier,
};
