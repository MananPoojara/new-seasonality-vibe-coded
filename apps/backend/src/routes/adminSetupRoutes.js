/**
 * Admin Setup Routes - TEMPORARY for initial setup
 * Remove this file after setting up admin users
 */
const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * Promote user to admin
 * TEMPORARY ENDPOINT - Remove after setup
 */
router.post('/promote-to-admin', async (req, res) => {
  try {
    const { email, secret } = req.body;

    // Simple secret check - change this to something secure
    if (secret !== 'CHANGE_ME_TO_SECURE_SECRET') {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid secret' 
      });
    }

    const user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    logger.info(`User promoted to admin: ${user.email}`);

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      user,
    });
  } catch (error) {
    logger.error('Failed to promote user to admin:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * List all users (for debugging)
 */
router.get('/list-users', async (req, res) => {
  try {
    const { secret } = req.query;

    if (secret !== 'CHANGE_ME_TO_SECURE_SECRET') {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid secret' 
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    logger.error('Failed to list users:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
