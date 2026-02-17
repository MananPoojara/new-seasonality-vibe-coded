/**
 * Event Analysis Routes
 * API endpoints for event-based seasonality analysis
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const EventAnalysisService = require('../services/EventAnalysisService');
const { logger } = require('../utils/logger');
const prisma = require('../utils/prisma');

/**
 * POST /api/analysis/events
 * Main event analysis endpoint
 */
router.post('/',
  authenticateToken,
  async (req, res, next) => {
    try {
      const params = {
        symbol: req.body.symbol,
        eventNames: req.body.eventNames,
        eventCategories: req.body.eventCategories,
        country: req.body.country || 'INDIA',
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        windowConfig: req.body.windowConfig || {
          daysBefore: 10,
          daysAfter: 10,
          includeEventDay: true
        },
        tradeConfig: req.body.tradeConfig || {
          entryType: 'T-1_CLOSE',
          daysAfter: 10
        },
        filters: req.body.filters || {
          minOccurrences: 5
        }
      };
      
      const result = await EventAnalysisService.analyzeEvents(params);
      
      res.json(result);
      
    } catch (error) {
      logger.error('Event analysis error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/analysis/events/categories
 * Get available event categories with counts
 */
router.get('/categories',
  authenticateToken,
  async (req, res, next) => {
    try {
      const categories = await prisma.specialDay.groupBy({
        by: ['category', 'country'],
        _count: {
          id: true
        },
        orderBy: {
          category: 'asc'
        }
      });
      
      res.json({
        success: true,
        data: categories.map(cat => ({
          category: cat.category,
          country: cat.country,
          count: cat._count.id
        }))
      });
      
    } catch (error) {
      logger.error('Error fetching event categories:', error);
      next(error);
    }
  }
);

/**
 * GET /api/analysis/events/names
 * Get available event names with occurrence counts
 */
router.get('/names',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { category, country } = req.query;
      
      const whereClause = {};
      if (category) whereClause.category = category.toUpperCase();
      if (country) whereClause.country = country.toUpperCase();
      
      const events = await prisma.specialDay.groupBy({
        by: ['name', 'category', 'country'],
        where: whereClause,
        _count: {
          id: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      res.json({
        success: true,
        data: events.map(event => ({
          name: event.name,
          category: event.category,
          country: event.country,
          occurrences: event._count.id
        }))
      });
      
    } catch (error) {
      logger.error('Error fetching event names:', error);
      next(error);
    }
  }
);

/**
 * GET /api/analysis/events/occurrences/:name
 * Get all occurrences of a specific event
 */
router.get('/occurrences/:name',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { name } = req.params;
      const { startDate, endDate } = req.query;
      
      const whereClause = {
        name: name.toUpperCase()
      };
      
      if (startDate && endDate) {
        whereClause.date = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }
      
      const occurrences = await prisma.specialDay.findMany({
        where: whereClause,
        orderBy: { date: 'asc' }
      });
      
      res.json({
        success: true,
        data: occurrences,
        count: occurrences.length
      });
      
    } catch (error) {
      logger.error('Error fetching event occurrences:', error);
      next(error);
    }
  }
);

/**
 * POST /api/analysis/events/compare
 * Compare event vs non-event days
 */
router.post('/compare',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { symbol, eventNames, startDate, endDate } = req.body;
      
      // Get event dates
      const events = await prisma.specialDay.findMany({
        where: {
          name: { in: eventNames.map(n => n.toUpperCase()) },
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        select: { date: true }
      });
      
      const eventDates = events.map(e => e.date.toISOString().split('T')[0]);
      
      // Get ticker
      const ticker = await prisma.ticker.findUnique({
        where: { symbol: symbol.toUpperCase() }
      });
      
      if (!ticker) {
        return res.status(404).json({
          success: false,
          error: 'Symbol not found'
        });
      }
      
      // Get all trading days
      const allDays = await prisma.dailySeasonalityData.findMany({
        where: {
          tickerId: ticker.id,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        select: {
          date: true,
          returnPercentage: true
        }
      });
      
      // Separate event and non-event days
      const eventDays = allDays.filter(day => 
        eventDates.includes(day.date.toISOString().split('T')[0])
      );
      const nonEventDays = allDays.filter(day => 
        !eventDates.includes(day.date.toISOString().split('T')[0])
      );
      
      // Calculate statistics
      const eventReturns = eventDays.map(d => d.returnPercentage || 0);
      const nonEventReturns = nonEventDays.map(d => d.returnPercentage || 0);
      
      const eventStats = {
        count: eventDays.length,
        avgReturn: EventAnalysisService.mean(eventReturns),
        stdDev: EventAnalysisService.standardDeviation(eventReturns),
        winRate: (eventReturns.filter(r => r > 0).length / eventReturns.length) * 100
      };
      
      const nonEventStats = {
        count: nonEventDays.length,
        avgReturn: EventAnalysisService.mean(nonEventReturns),
        stdDev: EventAnalysisService.standardDeviation(nonEventReturns),
        winRate: (nonEventReturns.filter(r => r > 0).length / nonEventReturns.length) * 100
      };
      
      res.json({
        success: true,
        data: {
          eventDays: eventStats,
          nonEventDays: nonEventStats,
          comparison: {
            returnDifference: eventStats.avgReturn - nonEventStats.avgReturn,
            winRateDifference: eventStats.winRate - nonEventStats.winRate
          }
        }
      });
      
    } catch (error) {
      logger.error('Error comparing event vs non-event days:', error);
      next(error);
    }
  }
);

module.exports = router;
