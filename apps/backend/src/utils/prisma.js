/**
 * Prisma Client Singleton
 * Optimized for production performance
 */
const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

// Connection pool configuration for better performance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? [{ emit: 'event', level: 'error' }] // Only log errors in production
    : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }], // Log queries in dev
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Fast connection with retry logic
const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return;
    } catch (error) {
      if (i === retries - 1) {
        logger.error('Database connection failed after retries', error);
        throw error;
      }
      logger.warn(`Database connection failed, retrying (${i + 1}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second retry delay
    }
  }
};

// Initialize connection
connectWithRetry();

// Only log database errors (not all events)
prisma.$on('error', (e) => {
  logger.error('Database error', { error: e.message });
});

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect();
};

process.on('beforeExit', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = prisma;
