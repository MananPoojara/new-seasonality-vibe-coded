# 📊 Holiday / Event Analysis - Institutional-Grade Specification

## Executive Summary

This specification defines a comprehensive event-based seasonality analysis system that allows users to analyze market behavior around recurring events (holidays, budgets, elections, festivals) with statistical rigor.

**Goal:** Answer "What usually happens before and after this event?" with institutional-grade analytics.

---

## 1. SYSTEM ARCHITECTURE

### 1.1 Data Flow

```
User Selection → Event Filter → Historical Occurrences → Price Data Extraction → 
Event Normalization → Statistical Calculations → Aggregated Metrics → 
Cumulative Equity Curve → Frontend Visualization
```

### 1.2 Core Components

1. **Event Selection Engine** - Filter and retrieve event occurrences
2. **Event Window Calculator** - Define relative time windows around events
3. **Price Data Aligner** - Align price data to relative event timeline
4. **Statistical Calculator** - Compute event-based statistics
5. **Equity Curve Generator** - Build cumulative event equity
6. **Distribution Analyzer** - Analyze return patterns

---

## 2. DATABASE SCHEMA EXTENSIONS

### 2.1 New Table: EventAnalysisCache

```sql
CREATE TABLE event_analysis_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  
  -- Event parameters
  event_names TEXT[],
  event_categories TEXT[],
  symbol VARCHAR(50) NOT NULL,
  country VARCHAR(50),
  
  -- Window configuration
  days_before INTEGER NOT NULL,
  days_after INTEGER NOT NULL,
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Entry/Exit configuration
  entry_type VARCHAR(50), -- 'T-1_CLOSE', 'T0_OPEN', 'T0_CLOSE'
  exit_type VARCHAR(50),  -- 'T+N_CLOSE'
  
  -- Cached results
  event_occurrences JSONB,
  aggregated_metrics JSONB,
  equity_curve JSONB,
  distribution_data JSONB,
  
  -- Metadata
  total_events INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  INDEX idx_cache_key (cache_key),
  INDEX idx_symbol (symbol),
  INDEX idx_created_at (created_at)
);
```

### 2.2 Indexes for Performance

```sql
-- Optimize special_days queries
CREATE INDEX idx_special_days_name_year ON special_days(name, year);
CREATE INDEX idx_special_days_category_country ON special_days(category, country);
CREATE INDEX idx_special_days_date_range ON special_days(date) WHERE date >= '2000-01-01';

-- Optimize daily data queries for event windows
CREATE INDEX idx_daily_data_ticker_date_range ON daily_seasonality_data(ticker_id, date);
```

---

## 3. EVENT SELECTION LOGIC

### 3.1 Filter Parameters

```javascript
{
  eventNames: ['UNION BUDGET DAY', 'DIWALI'],  // Specific events
  eventCategories: ['BUDGET', 'FESTIVAL'],      // Or by category
  country: 'INDIA',
  startDate: '2010-01-01',
  endDate: '2024-12-31',
  excludeYears: [2020],  // Optional: exclude specific years
  minOccurrences: 5       // Minimum occurrences for statistical validity
}
```

### 3.2 Query Strategy

```sql
-- Get all event occurrences matching filters
SELECT 
  id,
  name,
  date,
  year,
  category,
  country
FROM special_days
WHERE 
  (name = ANY($eventNames) OR category = ANY($eventCategories))
  AND country = $country
  AND date BETWEEN $startDate AND $endDate
  AND year != ANY($excludeYears)
ORDER BY date ASC;
```

### 3.3 Event Validation

- Minimum 5 occurrences for statistical validity
- Events must have corresponding price data
- Non-trading days are automatically skipped
- Overlapping events are flagged

---


## 4. EVENT WINDOW DEFINITION

### 4.1 Relative Time Window

For each event occurrence at date T0:
- **Before Event**: T-X trading days (e.g., -10 days)
- **Event Day**: T0
- **After Event**: T+Y trading days (e.g., +10 days)

### 4.2 Trading Day Calculation

```javascript
/**
 * Get N trading days before/after a date
 * Skips weekends and holidays using market calendar
 */
function getTradingDays(referenceDate, offset, tickerId) {
  const query = `
    SELECT date
    FROM daily_seasonality_data
    WHERE ticker_id = $1
      AND date ${offset > 0 ? '>' : '<'} $2
    ORDER BY date ${offset > 0 ? 'ASC' : 'DESC'}
    LIMIT ${Math.abs(offset)}
  `;
  
  return prisma.$queryRaw(query, tickerId, referenceDate);
}
```

### 4.3 Window Configuration

```javascript
{
  daysBefore: 10,      // T-10 to T-1
  daysAfter: 10,       // T+1 to T+10
  includeEventDay: true, // Include T0
  skipWeekends: true,   // Auto-skip non-trading days
  skipHolidays: true    // Auto-skip market holidays
}
```

---

## 5. PRICE DATA EXTRACTION & ALIGNMENT

### 5.1 Data Extraction Strategy

For each event occurrence:

```sql
-- Get price data for event window
WITH event_window AS (
  SELECT 
    date,
    ROW_NUMBER() OVER (ORDER BY date) - 
    (SELECT COUNT(*) FROM daily_seasonality_data 
     WHERE ticker_id = $tickerId 
     AND date <= $eventDate) as relative_day
  FROM daily_seasonality_data
  WHERE ticker_id = $tickerId
    AND date BETWEEN $windowStart AND $windowEnd
)
SELECT 
  d.date,
  d.open,
  d.high,
  d.low,
  d.close,
  d.volume,
  d.return_percentage,
  ew.relative_day
FROM daily_seasonality_data d
JOIN event_window ew ON d.date = ew.date
WHERE d.ticker_id = $tickerId
ORDER BY d.date;
```

### 5.2 Alignment to Relative Timeline

```javascript
// Example output structure
{
  eventName: 'UNION BUDGET DAY',
  eventDate: '2024-02-01',
  year: 2024,
  priceData: [
    { relativeDay: -10, date: '2024-01-18', close: 21500, return: 0.5 },
    { relativeDay: -9,  date: '2024-01-19', close: 21600, return: 0.46 },
    // ...
    { relativeDay: 0,   date: '2024-02-01', close: 22000, return: 1.2 },
    { relativeDay: 1,   date: '2024-02-02', close: 22100, return: 0.45 },
    // ...
    { relativeDay: 10,  date: '2024-02-15', close: 22500, return: 0.3 }
  ]
}
```

---

## 6. CORE CALCULATIONS

### 6.1 Average Event Curve

Calculate average return per relative day across all event occurrences:

```javascript
function calculateAverageEventCurve(eventOccurrences) {
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
  
  // Calculate average for each relative day
  const averageCurve = [];
  for (const [relativeDay, returns] of relativeDayMap.entries()) {
    averageCurve.push({
      relativeDay,
      avgReturn: mean(returns),
      medianReturn: median(returns),
      stdDev: standardDeviation(returns),
      count: returns.length,
      minReturn: Math.min(...returns),
      maxReturn: Math.max(...returns)
    });
  }
  
  return averageCurve.sort((a, b) => a.relativeDay - b.relativeDay);
}
```

### 6.2 Event Trade Statistics

For each event instance, calculate trade metrics:

```javascript
function calculateEventTrade(event, config) {
  const { entryType, exitType, daysAfter } = config;
  
  // Determine entry price
  let entryPrice, entryDate;
  switch (entryType) {
    case 'T-1_CLOSE':
      const t1 = event.priceData.find(d => d.relativeDay === -1);
      entryPrice = t1?.close;
      entryDate = t1?.date;
      break;
    case 'T0_OPEN':
      const t0 = event.priceData.find(d => d.relativeDay === 0);
      entryPrice = t0?.open;
      entryDate = t0?.date;
      break;
    case 'T0_CLOSE':
      const t0c = event.priceData.find(d => d.relativeDay === 0);
      entryPrice = t0c?.close;
      entryDate = t0c?.date;
      break;
  }
  
  // Determine exit price
  const exitDay = event.priceData.find(d => d.relativeDay === daysAfter);
  const exitPrice = exitDay?.close;
  const exitDate = exitDay?.date;
  
  if (!entryPrice || !exitPrice) {
    return null; // Incomplete data
  }
  
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
    entryDate,
    entryPrice,
    exitDate,
    exitPrice,
    absoluteReturn,
    percentageReturn,
    mfe,
    mae,
    holdingDays: daysAfter,
    isProfitable: percentageReturn > 0
  };
}
```

### 6.3 Aggregated Metrics (Seasonax-Style)

```javascript
function calculateAggregatedMetrics(trades) {
  const validTrades = trades.filter(t => t !== null);
  const returns = validTrades.map(t => t.percentageReturn);
  const profitableTrades = validTrades.filter(t => t.isProfitable);
  
  // Win rate
  const winRate = (profitableTrades.length / validTrades.length) * 100;
  
  // Return statistics
  const avgReturn = mean(returns);
  const medianReturn = median(returns);
  const stdDev = standardDeviation(returns);
  
  // Best/Worst
  const bestTrade = validTrades.reduce((best, t) => 
    t.percentageReturn > best.percentageReturn ? t : best
  );
  const worstTrade = validTrades.reduce((worst, t) => 
    t.percentageReturn < worst.percentageReturn ? t : worst
  );
  
  // Profit factor
  const grossProfit = profitableTrades.reduce((sum, t) => sum + t.percentageReturn, 0);
  const grossLoss = Math.abs(
    validTrades.filter(t => !t.isProfitable)
      .reduce((sum, t) => sum + t.percentageReturn, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
  
  // Expectancy
  const expectancy = avgReturn;
  
  // Max drawdown (event-based equity curve)
  const equityCurve = calculateEquityCurve(validTrades);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  
  return {
    totalEvents: validTrades.length,
    winRate,
    avgReturn,
    medianReturn,
    stdDev,
    bestTrade: {
      date: bestTrade.eventDate,
      return: bestTrade.percentageReturn
    },
    worstTrade: {
      date: worstTrade.eventDate,
      return: worstTrade.percentageReturn
    },
    profitFactor,
    expectancy,
    maxDrawdown,
    sharpeRatio: calculateSharpeRatio(returns),
    sortinoRatio: calculateSortinoRatio(returns)
  };
}
```


### 6.4 Cumulative Event Equity Curve

```javascript
function calculateEquityCurve(trades) {
  let equity = 100; // Start with 100 units
  const curve = [{ date: null, equity: 100, trade: null }];
  
  // Sort trades chronologically
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.eventDate) - new Date(b.eventDate)
  );
  
  sortedTrades.forEach(trade => {
    // Compound returns
    equity = equity * (1 + trade.percentageReturn / 100);
    
    curve.push({
      date: trade.exitDate,
      eventDate: trade.eventDate,
      equity,
      trade: {
        return: trade.percentageReturn,
        eventName: trade.eventName
      }
    });
  });
  
  return curve;
}

function calculateMaxDrawdown(equityCurve) {
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
      // Find where this drawdown started
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
```

### 6.5 Return Distribution Analysis

```javascript
function analyzeDistribution(trades) {
  const returns = trades.map(t => t.percentageReturn);
  
  // Create histogram bins
  const bins = createHistogramBins(returns, 20);
  
  // Identify outliers (beyond 2 std dev)
  const mean = calculateMean(returns);
  const stdDev = calculateStdDev(returns);
  const outliers = trades.filter(t => 
    Math.abs(t.percentageReturn - mean) > 2 * stdDev
  );
  
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
    histogram: bins,
    outliers,
    percentiles,
    skewness: calculateSkewness(returns),
    kurtosis: calculateKurtosis(returns)
  };
}
```

---

## 7. DATA TABLE STRUCTURE

### 7.1 Event Occurrences Table

Each row represents one event occurrence:

```javascript
{
  eventName: 'UNION BUDGET DAY',
  eventDate: '2024-02-01',
  year: 2024,
  category: 'BUDGET',
  startDate: '2024-01-18',  // T-10
  endDate: '2024-02-15',    // T+10
  entryPrice: 21800,
  exitPrice: 22500,
  returnPercentage: 3.21,
  absoluteReturn: 700,
  mfe: 4.5,  // Max favorable excursion
  mae: -1.2, // Max adverse excursion
  holdingDays: 10,
  isProfitable: true
}
```

### 7.2 Aggregated Metrics Panel

```javascript
{
  totalEvents: 15,
  dateRange: { start: '2010-01-01', end: '2024-12-31' },
  winRate: 66.67,  // %
  avgReturn: 2.45,  // %
  medianReturn: 2.1, // %
  stdDev: 3.2,
  bestEvent: {
    date: '2019-07-05',
    return: 8.5
  },
  worstEvent: {
    date: '2020-03-23',
    return: -5.2
  },
  profitFactor: 2.3,
  expectancy: 2.45,
  maxDrawdown: -12.5,
  sharpeRatio: 1.85,
  sortinoRatio: 2.1,
  totalReturn: 36.75,  // Cumulative
  cagr: 2.4  // Annualized
}
```

---

## 8. API ENDPOINTS

### 8.1 POST /api/analysis/events

Main endpoint for event analysis:

```javascript
Request Body:
{
  symbol: 'NIFTY',
  eventNames: ['UNION BUDGET DAY', 'DIWALI'],
  eventCategories: ['BUDGET', 'FESTIVAL'],
  country: 'INDIA',
  startDate: '2010-01-01',
  endDate: '2024-12-31',
  windowConfig: {
    daysBefore: 10,
    daysAfter: 10,
    includeEventDay: true
  },
  tradeConfig: {
    entryType: 'T-1_CLOSE',  // or 'T0_OPEN', 'T0_CLOSE'
    exitType: 'T+10_CLOSE',
    daysAfter: 10
  },
  filters: {
    excludeYears: [2020],
    minOccurrences: 5
  }
}

Response:
{
  success: true,
  data: {
    symbol: 'NIFTY',
    eventSummary: {
      totalEventsFound: 15,
      eventsAnalyzed: 15,
      dateRange: { start: '2010-01-01', end: '2024-12-31' }
    },
    averageEventCurve: [
      { relativeDay: -10, avgReturn: 0.2, stdDev: 1.5, count: 15 },
      { relativeDay: -9, avgReturn: 0.3, stdDev: 1.2, count: 15 },
      // ...
      { relativeDay: 0, avgReturn: 1.2, stdDev: 2.1, count: 15 },
      { relativeDay: 1, avgReturn: 0.5, stdDev: 1.8, count: 15 },
      // ...
    ],
    eventOccurrences: [
      {
        eventName: 'UNION BUDGET DAY',
        eventDate: '2024-02-01',
        year: 2024,
        entryPrice: 21800,
        exitPrice: 22500,
        returnPercentage: 3.21,
        mfe: 4.5,
        mae: -1.2
      },
      // ... more occurrences
    ],
    aggregatedMetrics: {
      totalEvents: 15,
      winRate: 66.67,
      avgReturn: 2.45,
      medianReturn: 2.1,
      profitFactor: 2.3,
      maxDrawdown: -12.5,
      sharpeRatio: 1.85
    },
    equityCurve: [
      { date: null, equity: 100 },
      { date: '2010-02-28', equity: 102.5, eventDate: '2010-02-26' },
      { date: '2011-02-28', equity: 105.2, eventDate: '2011-02-28' },
      // ...
    ],
    distribution: {
      histogram: [
        { bin: '-5 to -4', count: 1 },
        { bin: '-4 to -3', count: 0 },
        // ...
      ],
      outliers: [
        { eventDate: '2020-03-23', return: -5.2 }
      ],
      percentiles: {
        p10: -1.2,
        p25: 0.5,
        p50: 2.1,
        p75: 4.2,
        p90: 6.5
      }
    }
  },
  meta: {
    processingTime: 1250,
    cacheKey: 'event_NIFTY_BUDGET_2010_2024',
    cached: false
  }
}
```

### 8.2 GET /api/analysis/events/categories

Get available event categories:

```javascript
Response:
{
  success: true,
  data: [
    { category: 'BUDGET', count: 15, country: 'INDIA' },
    { category: 'ELECTION', count: 8, country: 'INDIA' },
    { category: 'FESTIVAL', count: 120, country: 'INDIA' },
    { category: 'HOLIDAY', count: 50, country: 'INDIA' },
    { category: 'NATIONAL_HOLIDAY', count: 30, country: 'INDIA' }
  ]
}
```

### 8.3 GET /api/analysis/events/names

Get available event names:

```javascript
Response:
{
  success: true,
  data: [
    { name: 'UNION BUDGET DAY', category: 'BUDGET', occurrences: 15 },
    { name: 'DIWALI', category: 'FESTIVAL', occurrences: 25 },
    { name: 'HOLI', category: 'FESTIVAL', occurrences: 25 },
    // ...
  ]
}
```

---


## 9. ADVANCED FEATURES

### 9.1 Event vs Non-Event Days Comparison

Compare returns on event days vs regular trading days:

```javascript
function compareEventVsNonEvent(symbol, eventDates, dateRange) {
  // Get all trading days in range
  const allTradingDays = await getAllTradingDays(symbol, dateRange);
  
  // Separate event days from non-event days
  const eventDays = allTradingDays.filter(day => 
    eventDates.includes(day.date)
  );
  const nonEventDays = allTradingDays.filter(day => 
    !eventDates.includes(day.date)
  );
  
  // Calculate statistics for each group
  const eventStats = calculateStatistics(eventDays.map(d => d.returnPercentage));
  const nonEventStats = calculateStatistics(nonEventDays.map(d => d.returnPercentage));
  
  // Statistical significance test (t-test)
  const tTest = performTTest(
    eventDays.map(d => d.returnPercentage),
    nonEventDays.map(d => d.returnPercentage)
  );
  
  return {
    eventDays: {
      count: eventDays.length,
      avgReturn: eventStats.mean,
      stdDev: eventStats.stdDev,
      winRate: eventStats.winRate
    },
    nonEventDays: {
      count: nonEventDays.length,
      avgReturn: nonEventStats.mean,
      stdDev: nonEventStats.stdDev,
      winRate: nonEventStats.winRate
    },
    comparison: {
      returnDifference: eventStats.mean - nonEventStats.mean,
      isSignificant: tTest.pValue < 0.05,
      pValue: tTest.pValue,
      tStatistic: tTest.tStatistic
    }
  };
}
```

### 9.2 Event Clustering Detection

Identify when multiple events occur close together:

```javascript
function detectEventClusters(events, maxDaysBetween = 5) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  const clusters = [];
  let currentCluster = [sortedEvents[0]];
  
  for (let i = 1; i < sortedEvents.length; i++) {
    const daysBetween = daysDifference(
      sortedEvents[i - 1].date,
      sortedEvents[i].date
    );
    
    if (daysBetween <= maxDaysBetween) {
      currentCluster.push(sortedEvents[i]);
    } else {
      if (currentCluster.length > 1) {
        clusters.push({
          events: currentCluster,
          startDate: currentCluster[0].date,
          endDate: currentCluster[currentCluster.length - 1].date,
          eventCount: currentCluster.length
        });
      }
      currentCluster = [sortedEvents[i]];
    }
  }
  
  // Add last cluster if it has multiple events
  if (currentCluster.length > 1) {
    clusters.push({
      events: currentCluster,
      startDate: currentCluster[0].date,
      endDate: currentCluster[currentCluster.length - 1].date,
      eventCount: currentCluster.length
    });
  }
  
  return clusters;
}
```

### 9.3 Category-Level Aggregation

Analyze all events in a category together:

```javascript
async function analyzeCategoryAggregate(symbol, category, dateRange) {
  // Get all events in category
  const events = await prisma.specialDay.findMany({
    where: {
      category,
      date: {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end)
      }
    }
  });
  
  // Group by event name
  const eventGroups = groupBy(events, 'name');
  
  // Analyze each event type
  const eventAnalyses = await Promise.all(
    Object.entries(eventGroups).map(async ([name, occurrences]) => {
      return {
        eventName: name,
        occurrences: occurrences.length,
        analysis: await analyzeEvent(symbol, name, dateRange)
      };
    })
  );
  
  // Aggregate across all events in category
  const allTrades = eventAnalyses.flatMap(ea => ea.analysis.trades);
  const categoryMetrics = calculateAggregatedMetrics(allTrades);
  
  return {
    category,
    totalEventTypes: eventAnalyses.length,
    totalOccurrences: events.length,
    eventBreakdown: eventAnalyses,
    categoryMetrics
  };
}
```

### 9.4 Overlapping Event Exclusion

Prevent double-counting when events overlap:

```javascript
function excludeOverlappingEvents(events, windowDays) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  const nonOverlapping = [];
  let lastIncludedDate = null;
  
  for (const event of sortedEvents) {
    if (!lastIncludedDate) {
      nonOverlapping.push(event);
      lastIncludedDate = event.date;
      continue;
    }
    
    const daysSinceLastEvent = daysDifference(lastIncludedDate, event.date);
    
    // Only include if outside the window of previous event
    if (daysSinceLastEvent > windowDays * 2) {
      nonOverlapping.push(event);
      lastIncludedDate = event.date;
    } else {
      event.excluded = true;
      event.excludeReason = `Overlaps with event on ${lastIncludedDate}`;
    }
  }
  
  return {
    included: nonOverlapping,
    excluded: sortedEvents.filter(e => e.excluded)
  };
}
```

---

## 10. EDGE CASES & ASSUMPTIONS

### 10.1 Edge Cases

1. **Insufficient Data**
   - Event occurs too close to data start/end
   - Solution: Skip event, log warning

2. **Market Holidays During Window**
   - Non-trading days in event window
   - Solution: Auto-skip, adjust window to next trading day

3. **Corporate Actions**
   - Stock splits, dividends during event window
   - Solution: Use adjusted prices from database

4. **Overlapping Events**
   - Multiple events within same window
   - Solution: Flag and optionally exclude

5. **Missing Price Data**
   - Gaps in price data
   - Solution: Skip event occurrence, log warning

### 10.2 Assumptions

1. **Price Data Quality**
   - Assumes clean, adjusted price data in database
   - No additional adjustments needed

2. **Event Dates**
   - Event dates are accurate
   - Events are properly categorized

3. **Trading Calendar**
   - Market holidays are reflected in price data gaps
   - Weekends are automatically excluded

4. **Statistical Validity**
   - Minimum 5 occurrences for meaningful statistics
   - More occurrences = higher confidence

5. **Return Calculations**
   - Simple returns (not log returns)
   - No transaction costs included
   - No slippage assumptions

---

## 11. PERFORMANCE OPTIMIZATION

### 11.1 Caching Strategy

```javascript
// Generate cache key
function generateCacheKey(params) {
  const key = `event_${params.symbol}_${params.eventNames.join('_')}_${params.startDate}_${params.endDate}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

// Check cache before processing
async function getOrCalculateEventAnalysis(params) {
  const cacheKey = generateCacheKey(params);
  
  // Check cache
  const cached = await prisma.eventAnalysisCache.findUnique({
    where: { cache_key: cacheKey }
  });
  
  if (cached && cached.expires_at > new Date()) {
    return {
      ...cached,
      meta: { cached: true }
    };
  }
  
  // Calculate fresh
  const result = await calculateEventAnalysis(params);
  
  // Store in cache
  await prisma.eventAnalysisCache.create({
    data: {
      cache_key: cacheKey,
      ...params,
      ...result,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  });
  
  return {
    ...result,
    meta: { cached: false }
  };
}
```

### 11.2 Query Optimization

```sql
-- Use CTEs for complex queries
WITH event_dates AS (
  SELECT date, name, category
  FROM special_days
  WHERE name = ANY($eventNames)
    AND date BETWEEN $startDate AND $endDate
),
price_windows AS (
  SELECT 
    ed.date as event_date,
    ed.name as event_name,
    d.date,
    d.close,
    d.return_percentage,
    ROW_NUMBER() OVER (
      PARTITION BY ed.date 
      ORDER BY d.date
    ) - $daysBefore as relative_day
  FROM event_dates ed
  CROSS JOIN LATERAL (
    SELECT date, close, return_percentage
    FROM daily_seasonality_data
    WHERE ticker_id = $tickerId
      AND date BETWEEN ed.date - INTERVAL '$daysBefore days'
                   AND ed.date + INTERVAL '$daysAfter days'
    ORDER BY date
  ) d
)
SELECT * FROM price_windows
ORDER BY event_date, relative_day;
```

### 11.3 Batch Processing

```javascript
// Process events in batches to avoid memory issues
async function processEventsBatch(events, batchSize = 50) {
  const results = [];
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(event => processEvent(event))
    );
    results.push(...batchResults);
    
    // Progress callback
    if (onProgress) {
      onProgress({
        processed: i + batch.length,
        total: events.length,
        percentage: ((i + batch.length) / events.length) * 100
      });
    }
  }
  
  return results;
}
```

---

