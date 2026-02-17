/**
 * Event Analysis Service
 * Institutional-grade event-based seasonality analysis
 * Analyzes market behavior around recurring events (holidays, budgets, elections, festivals)
 */

const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const crypto = require('crypto');

class EventAnalysisService {
  /**
   * Main event analysis function
   */
  static async analyzeEvents(params) {
    const startTime = Date.now();
    
    try {
      // 1. Validate parameters
      this.validateParams(params);
      
      // 2. Check cache
      const cacheKey = this.generateCacheKey(params);
      const cached = await this.checkCache(cacheKey);
      if (cached) {
        return { ...cached, meta: { ...cached.meta, cached: true } };
      }
      
      // 3. Get ticker
      const ticker = await this.getTicker(params.symbol);
      
      // 4. Get event occurrences
      const events = await this.getEventOccurrences(params);
      
      if (events.length < (params.filters?.minOccurrences || 5)) {
        throw new Error(`Insufficient event occurrences. Found ${events.length}, minimum ${params.filters?.minOccurrences || 5} required.`);
      }
      
      // 5. Extract price data for each event
      const eventOccurrences = await this.extractEventPriceData(
        ticker.id,
        events,
        params.windowConfig
      );
      
      // 6. Calculate event trades
      const trades = this.calculateEventTrades(
        eventOccurrences,
        params.tradeConfig
      );
      
      // 7. Calculate average event curve
      const averageEventCurve = this.calculateAverageEventCurve(eventOccurrences);
      
      // 8. Calculate aggregated metrics
      const aggregatedMetrics = this.calculateAggregatedMetrics(trades);
      
      // 9. Generate equity curve
      const equityCurve = this.calculateEquityCurve(trades);
      
      // 10. Analyze distribution
      const distribution = this.analyzeDistribution(trades);
      
      const result = {
        success: true,
        data: {
          symbol: params.symbol,
          eventSummary: {
            totalEventsFound: events.length,
            eventsAnalyzed: eventOccurrences.length,
            dateRange: {
              start: params.startDate,
              end: params.endDate
            }
          },
          averageEventCurve,
          eventOccurrences: trades,
          aggregatedMetrics,
          equityCurve,
          distribution
        },
        meta: {
          processingTime: Date.now() - startTime,
          cacheKey,
          cached: false
        }
      };
      
      // 11. Cache result
      await this.cacheResult(cacheKey, params, result);
      
      return result;
      
    } catch (error) {
      logger.error('Event analysis error:', error);
      throw error;
    }
  }
  
  /**
   * Validate input parameters
   */
  static validateParams(params) {
    if (!params.symbol) throw new Error('Symbol is required');
    if (!params.startDate || !params.endDate) throw new Error('Date range is required');
    if (!params.eventNames && !params.eventCategories) {
      throw new Error('Either eventNames or eventCategories must be provided');
    }
  }
  
  /**
   * Generate cache key
   */
  static generateCacheKey(params) {
    const keyString = JSON.stringify({
      symbol: params.symbol,
      eventNames: params.eventNames?.sort(),
      eventCategories: params.eventCategories?.sort(),
      startDate: params.startDate,
      endDate: params.endDate,
      windowConfig: params.windowConfig,
      tradeConfig: params.tradeConfig
    });
    return crypto.createHash('md5').update(keyString).digest('hex');
  }
  
  /**
   * Check cache for existing result
   */
  static async checkCache(cacheKey) {
    // Cache implementation would go here
    // For now, return null (no cache)
    return null;
  }
  
  /**
   * Get ticker by symbol
   */
  static async getTicker(symbol) {
    const ticker = await prisma.ticker.findUnique({
      where: { symbol: symbol.toUpperCase() }
    });
    
    if (!ticker) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    
    return ticker;
  }
  
  /**
   * Get event occurrences based on filters
   */
  static async getEventOccurrences(params) {
    const whereClause = {
      date: {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate)
      }
    };
    
    // Filter by event names or categories
    if (params.eventNames && params.eventNames.length > 0) {
      whereClause.name = {
        in: params.eventNames.map(n => n.toUpperCase())
      };
    } else if (params.eventCategories && params.eventCategories.length > 0) {
      whereClause.category = {
        in: params.eventCategories.map(c => c.toUpperCase())
      };
    }
    
    // Filter by country
    if (params.country) {
      whereClause.country = params.country.toUpperCase();
    }
    
    // Exclude specific years
    if (params.filters?.excludeYears && params.filters.excludeYears.length > 0) {
      whereClause.year = {
        notIn: params.filters.excludeYears
      };
    }
    
    const events = await prisma.specialDay.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });
    
    return events;
  }
  
  /**
   * Extract price data for event windows
   */
  static async extractEventPriceData(tickerId, events, windowConfig) {
    const { daysBefore = 10, daysAfter = 10, includeEventDay = true } = windowConfig;
    
    const eventOccurrences = [];
    
    for (const event of events) {
      try {
        // Get price data around event
        const priceData = await this.getPriceDataWindow(
          tickerId,
          event.date,
          daysBefore,
          daysAfter
        );
        
        if (priceData.length === 0) {
          logger.warn(`No price data for event ${event.name} on ${event.date}`);
          continue;
        }
        
        // Align to relative timeline
        const alignedData = this.alignToRelativeTimeline(
          priceData,
          event.date,
          includeEventDay
        );
        
        eventOccurrences.push({
          eventName: event.name,
          eventDate: event.date,
          year: event.year,
          category: event.category,
          priceData: alignedData
        });
        
      } catch (error) {
        logger.error(`Error processing event ${event.name} on ${event.date}:`, error);
      }
    }
    
    return eventOccurrences;
  }
  
  /**
   * Get price data window around event date
   */
  static async getPriceDataWindow(tickerId, eventDate, daysBefore, daysAfter) {
    // Calculate approximate date range (will be filtered to trading days)
    const startDate = new Date(eventDate);
    startDate.setDate(startDate.getDate() - (daysBefore * 2)); // Buffer for weekends
    
    const endDate = new Date(eventDate);
    endDate.setDate(endDate.getDate() + (daysAfter * 2)); // Buffer for weekends
    
    const priceData = await prisma.dailySeasonalityData.findMany({
      where: {
        tickerId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        open: true,
        high: true,
        low: true,
        close: true,
        volume: true,
        returnPercentage: true
      }
    });
    
    return priceData;
  }
  
  /**
   * Align price data to relative timeline
   */
  static alignToRelativeTimeline(priceData, eventDate, includeEventDay) {
    const eventDateObj = new Date(eventDate);
    const aligned = [];
    
    priceData.forEach(day => {
      const dayDate = new Date(day.date);
      const diffTime = dayDate - eventDateObj;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      // Calculate relative day based on trading days
      const relativeDay = this.calculateRelativeDay(priceData, day.date, eventDate);
      
      if (!includeEventDay && relativeDay === 0) {
        return; // Skip event day if not included
      }
      
      aligned.push({
        relativeDay,
        date: day.date,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume,
        return: day.returnPercentage || 0
      });
    });
    
    return aligned.sort((a, b) => a.relativeDay - b.relativeDay);
  }
  
  /**
   * Calculate relative trading day
   */
  static calculateRelativeDay(priceData, targetDate, eventDate) {
    const targetDateObj = new Date(targetDate);
    const eventDateObj = new Date(eventDate);
    
    if (targetDateObj.getTime() === eventDateObj.getTime()) {
      return 0;
    }
    
    // Count trading days between target and event
    let count = 0;
    const isAfter = targetDateObj > eventDateObj;
    
    const sortedData = [...priceData].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    for (const day of sortedData) {
      const dayDate = new Date(day.date);
      
      if (isAfter) {
        if (dayDate > eventDateObj && dayDate <= targetDateObj) {
          count++;
        }
      } else {
        if (dayDate >= targetDateObj && dayDate < eventDateObj) {
          count++;
        }
      }
    }
    
    return isAfter ? count : -count;
  }
  
  /**
   * Calculate event trades
   */
  static calculateEventTrades(eventOccurrences, tradeConfig) {
    const { entryType = 'T-1_CLOSE', daysAfter = 10 } = tradeConfig;
    
    const trades = [];
    
    for (const event of eventOccurrences) {
      const trade = this.calculateSingleEventTrade(event, entryType, daysAfter);
      if (trade) {
        trades.push(trade);
      }
    }
    
    return trades;
  }
  
  /**
   * Calculate single event trade
   */
  static calculateSingleEventTrade(event, entryType, daysAfter) {
    // Determine entry price and date
    let entryPrice, entryDate, entryDay;
    
    switch (entryType) {
      case 'T-1_CLOSE':
        entryDay = event.priceData.find(d => d.relativeDay === -1);
        if (!entryDay) return null;
        entryPrice = entryDay.close;
        entryDate = entryDay.date;
        break;
      case 'T0_OPEN':
        entryDay = event.priceData.find(d => d.relativeDay === 0);
        if (!entryDay) return null;
        entryPrice = entryDay.open;
        entryDate = entryDay.date;
        break;
      case 'T0_CLOSE':
        entryDay = event.priceData.find(d => d.relativeDay === 0);
        if (!entryDay) return null;
        entryPrice = entryDay.close;
        entryDate = entryDay.date;
        break;
      default:
        return null;
    }
    
    // Determine exit price and date
    const exitDay = event.priceData.find(d => d.relativeDay === daysAfter);
    if (!exitDay) return null;
    
    const exitPrice = exitDay.close;
    const exitDate = exitDay.date;
    
    // Calculate metrics
    const absoluteReturn = exitPrice - entryPrice;
    const percentageReturn = (absoluteReturn / entryPrice) * 100;
    
    // Calculate MFE (Max Favorable Excursion)
    const pricesInWindow = event.priceData
      .filter(d => d.relativeDay >= 0 && d.relativeDay <= daysAfter)
      .map(d => d.high);
    const maxPrice = Math.max(...pricesInWindow);
    const mfe = ((maxPrice - entryPrice) / entryPrice) * 100;
    
    // Calculate MAE (Max Adverse Excursion)
    const lowPrices = event.priceData
      .filter(d => d.relativeDay >= 0 && d.relativeDay <= daysAfter)
      .map(d => d.low);
    const minPrice = Math.min(...lowPrices);
    const mae = ((minPrice - entryPrice) / entryPrice) * 100;
    
    return {
      eventName: event.eventName,
      eventDate: event.eventDate,
      year: event.year,
      category: event.category,
      startDate: event.priceData[0]?.date,
      endDate: event.priceData[event.priceData.length - 1]?.date,
      entryDate,
      entryPrice,
      exitDate,
      exitPrice,
      absoluteReturn,
      returnPercentage: percentageReturn,
      mfe,
      mae,
      holdingDays: daysAfter,
      isProfitable: percentageReturn > 0
    };
  }
  
  /**
   * Calculate average event curve
   */
  static calculateAverageEventCurve(eventOccurrences) {
    const relativeDayMap = new Map();
    
    // Group by relative day
    eventOccurrences.forEach(event => {
      event.priceData.forEach(day => {
        if (!relativeDayMap.has(day.relativeDay)) {
          relativeDayMap.set(day.relativeDay, []);
        }
        relativeDayMap.get(day.relativeDay).push(day.return);
      });
    });
    
    // Calculate statistics for each relative day
    const averageCurve = [];
    for (const [relativeDay, returns] of relativeDayMap.entries()) {
      averageCurve.push({
        relativeDay,
        avgReturn: this.mean(returns),
        medianReturn: this.median(returns),
        stdDev: this.standardDeviation(returns),
        count: returns.length,
        minReturn: Math.min(...returns),
        maxReturn: Math.max(...returns)
      });
    }
    
    return averageCurve.sort((a, b) => a.relativeDay - b.relativeDay);
  }
  
  /**
   * Calculate aggregated metrics
   */
  static calculateAggregatedMetrics(trades) {
    const validTrades = trades.filter(t => t !== null);
    if (validTrades.length === 0) {
      return null;
    }
    
    const returns = validTrades.map(t => t.returnPercentage);
    const profitableTrades = validTrades.filter(t => t.isProfitable);
    
    // Win rate
    const winRate = (profitableTrades.length / validTrades.length) * 100;
    
    // Return statistics
    const avgReturn = this.mean(returns);
    const medianReturn = this.median(returns);
    const stdDev = this.standardDeviation(returns);
    
    // Best/Worst
    const bestTrade = validTrades.reduce((best, t) => 
      t.returnPercentage > best.returnPercentage ? t : best
    );
    const worstTrade = validTrades.reduce((worst, t) => 
      t.returnPercentage < worst.returnPercentage ? t : worst
    );
    
    // Profit factor
    const grossProfit = profitableTrades.reduce((sum, t) => sum + t.returnPercentage, 0);
    const grossLoss = Math.abs(
      validTrades.filter(t => !t.isProfitable)
        .reduce((sum, t) => sum + t.returnPercentage, 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    
    // Expectancy
    const expectancy = avgReturn;
    
    // Max drawdown
    const equityCurve = this.calculateEquityCurve(validTrades);
    const maxDrawdownInfo = this.calculateMaxDrawdown(equityCurve);
    
    // Sharpe ratio (assuming risk-free rate = 0)
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    
    // Sortino ratio (downside deviation)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0 
      ? this.standardDeviation(downsideReturns) 
      : stdDev;
    const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;
    
    // Total return (cumulative)
    const totalReturn = equityCurve[equityCurve.length - 1].equity - 100;
    
    // CAGR (approximate)
    const years = (new Date(validTrades[validTrades.length - 1].eventDate) - 
                   new Date(validTrades[0].eventDate)) / (365.25 * 24 * 60 * 60 * 1000);
    const cagr = years > 0 ? (Math.pow(equityCurve[equityCurve.length - 1].equity / 100, 1 / years) - 1) * 100 : 0;
    
    return {
      totalEvents: validTrades.length,
      dateRange: {
        start: validTrades[0].eventDate,
        end: validTrades[validTrades.length - 1].eventDate
      },
      winRate: parseFloat(winRate.toFixed(2)),
      avgReturn: parseFloat(avgReturn.toFixed(2)),
      medianReturn: parseFloat(medianReturn.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      bestEvent: {
        date: bestTrade.eventDate,
        return: parseFloat(bestTrade.returnPercentage.toFixed(2))
      },
      worstEvent: {
        date: worstTrade.eventDate,
        return: parseFloat(worstTrade.returnPercentage.toFixed(2))
      },
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdownInfo.maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      cagr: parseFloat(cagr.toFixed(2))
    };
  }
  
  /**
   * Calculate equity curve
   */
  static calculateEquityCurve(trades) {
    let equity = 100;
    const curve = [{ date: null, equity: 100, trade: null }];
    
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.eventDate) - new Date(b.eventDate)
    );
    
    sortedTrades.forEach(trade => {
      equity = equity * (1 + trade.returnPercentage / 100);
      
      curve.push({
        date: trade.exitDate,
        eventDate: trade.eventDate,
        equity: parseFloat(equity.toFixed(2)),
        trade: {
          return: trade.returnPercentage,
          eventName: trade.eventName
        }
      });
    });
    
    return curve;
  }
  
  /**
   * Calculate max drawdown
   */
  static calculateMaxDrawdown(equityCurve) {
    let maxEquity = equityCurve[0].equity;
    let maxDrawdown = 0;
    let drawdownStart = null;
    let drawdownEnd = null;
    
    equityCurve.forEach((point, index) => {
      if (point.equity > maxEquity) {
        maxEquity = point.equity;
      }
      
      const drawdown = ((maxEquity - point.equity) / maxEquity) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        drawdownEnd = point.date;
        
        for (let i = index - 1; i >= 0; i--) {
          if (equityCurve[i].equity === maxEquity) {
            drawdownStart = equityCurve[i].date;
            break;
          }
        }
      }
    });
    
    return {
      maxDrawdown,
      drawdownStart,
      drawdownEnd,
      finalEquity: equityCurve[equityCurve.length - 1].equity
    };
  }
  
  /**
   * Analyze return distribution
   */
  static analyzeDistribution(trades) {
    const returns = trades.map(t => t.returnPercentage);
    
    // Create histogram
    const histogram = this.createHistogram(returns, 20);
    
    // Identify outliers
    const mean = this.mean(returns);
    const stdDev = this.standardDeviation(returns);
    const outliers = trades.filter(t => 
      Math.abs(t.returnPercentage - mean) > 2 * stdDev
    ).map(t => ({
      eventDate: t.eventDate,
      eventName: t.eventName,
      return: t.returnPercentage
    }));
    
    // Percentiles
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const percentiles = {
      p10: sortedReturns[Math.floor(sortedReturns.length * 0.1)],
      p25: sortedReturns[Math.floor(sortedReturns.length * 0.25)],
      p50: sortedReturns[Math.floor(sortedReturns.length * 0.5)],
      p75: sortedReturns[Math.floor(sortedReturns.length * 0.75)],
      p90: sortedReturns[Math.floor(sortedReturns.length * 0.9)]
    };
    
    return {
      histogram,
      outliers,
      percentiles: {
        p10: parseFloat(percentiles.p10?.toFixed(2) || 0),
        p25: parseFloat(percentiles.p25?.toFixed(2) || 0),
        p50: parseFloat(percentiles.p50?.toFixed(2) || 0),
        p75: parseFloat(percentiles.p75?.toFixed(2) || 0),
        p90: parseFloat(percentiles.p90?.toFixed(2) || 0)
      },
      skewness: parseFloat(this.calculateSkewness(returns).toFixed(2)),
      kurtosis: parseFloat(this.calculateKurtosis(returns).toFixed(2))
    };
  }
  
  /**
   * Create histogram
   */
  static createHistogram(values, binCount) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0).map((_, i) => ({
      bin: `${(min + i * binSize).toFixed(1)} to ${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0,
      range: {
        min: min + i * binSize,
        max: min + (i + 1) * binSize
      }
    }));
    
    values.forEach(value => {
      const binIndex = Math.min(
        Math.floor((value - min) / binSize),
        binCount - 1
      );
      bins[binIndex].count++;
    });
    
    return bins;
  }
  
  /**
   * Cache result
   */
  static async cacheResult(cacheKey, params, result) {
    // Cache implementation would go here
    // For now, skip caching
    return;
  }
  
  // Statistical helper functions
  static mean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  static median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
  
  static standardDeviation(values) {
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
  
  static calculateSkewness(values) {
    const n = values.length;
    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    
    const sum = values.reduce((acc, val) => 
      acc + Math.pow((val - mean) / stdDev, 3), 0
    );
    
    return (n / ((n - 1) * (n - 2))) * sum;
  }
  
  static calculateKurtosis(values) {
    const n = values.length;
    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    
    const sum = values.reduce((acc, val) => 
      acc + Math.pow((val - mean) / stdDev, 4), 0
    );
    
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }
}

module.exports = EventAnalysisService;
