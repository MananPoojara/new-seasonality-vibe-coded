# 🚀 Event Analysis - Quick Start Guide

## Overview
Analyze market behavior around recurring events (holidays, budgets, elections, festivals) with institutional-grade statistics.

---

## 🎯 Quick Test (3 Steps)

### Step 1: Start Backend
```bash
cd apps/backend
npm start
```

### Step 2: Get Auth Token
```bash
# Login to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

### Step 3: Run Analysis
```bash
curl -X POST http://localhost:3001/api/analysis/events \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "NIFTY",
    "eventNames": ["UNION BUDGET DAY"],
    "startDate": "2010-01-01",
    "endDate": "2024-12-31"
  }'
```

---

## 📊 Example Requests

### 1. Analyze Union Budget Day
```javascript
POST /api/analysis/events

{
  "symbol": "NIFTY",
  "eventNames": ["UNION BUDGET DAY"],
  "startDate": "2010-01-01",
  "endDate": "2024-12-31",
  "windowConfig": {
    "daysBefore": 10,
    "daysAfter": 10
  },
  "tradeConfig": {
    "entryType": "T-1_CLOSE",
    "daysAfter": 10
  }
}
```

**What it does:**
- Finds all Union Budget Days from 2010-2024
- Analyzes 10 days before and after each event
- Simulates buying day before event, selling 10 days after
- Returns win rate, avg return, equity curve, etc.

### 2. Analyze All Festivals
```javascript
POST /api/analysis/events

{
  "symbol": "NIFTY",
  "eventCategories": ["FESTIVAL"],
  "startDate": "2015-01-01",
  "endDate": "2024-12-31"
}
```

**What it does:**
- Analyzes all festival days together
- Shows aggregate statistics
- Compares festival performance

### 3. Get Available Events
```javascript
// Get categories
GET /api/analysis/events/categories

// Get event names
GET /api/analysis/events/names?category=BUDGET

// Get occurrences
GET /api/analysis/events/occurrences/UNION%20BUDGET%20DAY
```

---

## 📋 Response Structure

```javascript
{
  "success": true,
  "data": {
    // Summary
    "eventSummary": {
      "totalEventsFound": 15,
      "eventsAnalyzed": 15
    },
    
    // Average pattern across all events
    "averageEventCurve": [
      { "relativeDay": -10, "avgReturn": 0.2, "stdDev": 1.5 },
      { "relativeDay": -9, "avgReturn": 0.3, "stdDev": 1.2 },
      // ...
      { "relativeDay": 0, "avgReturn": 1.2, "stdDev": 2.1 },
      { "relativeDay": 1, "avgReturn": 0.5, "stdDev": 1.8 }
    ],
    
    // Individual event trades
    "eventOccurrences": [
      {
        "eventName": "UNION BUDGET DAY",
        "eventDate": "2024-02-01",
        "returnPercentage": 3.21,
        "mfe": 4.5,
        "mae": -1.2
      }
    ],
    
    // Aggregate statistics
    "aggregatedMetrics": {
      "totalEvents": 15,
      "winRate": 66.67,
      "avgReturn": 2.45,
      "profitFactor": 2.3,
      "maxDrawdown": -12.5,
      "sharpeRatio": 1.85
    },
    
    // Cumulative equity
    "equityCurve": [
      { "date": null, "equity": 100 },
      { "date": "2010-03-10", "equity": 102.5 }
    ],
    
    // Return distribution
    "distribution": {
      "histogram": [...],
      "outliers": [...],
      "percentiles": { "p50": 2.1 }
    }
  }
}
```

---

## 🎯 Key Metrics Explained

### Win Rate
Percentage of profitable events
```
Win Rate = (Profitable Events / Total Events) × 100
```

### Average Return
Mean return across all events
```
Avg Return = Sum of Returns / Total Events
```

### Profit Factor
Ratio of gross profit to gross loss
```
Profit Factor = Gross Profit / Gross Loss
```
- > 2.0 = Excellent
- > 1.5 = Good
- > 1.0 = Profitable
- < 1.0 = Losing

### Sharpe Ratio
Risk-adjusted return
```
Sharpe Ratio = Avg Return / Std Deviation
```
- > 2.0 = Excellent
- > 1.0 = Good
- > 0.5 = Acceptable

### Max Drawdown
Largest peak-to-trough decline
```
Max Drawdown = (Peak Equity - Trough Equity) / Peak Equity × 100
```

---

## 🔧 Configuration Options

### Entry Types
- `T-1_CLOSE` - Buy at close day before event
- `T0_OPEN` - Buy at open on event day
- `T0_CLOSE` - Buy at close on event day

### Window Configuration
```javascript
"windowConfig": {
  "daysBefore": 10,      // Days before event
  "daysAfter": 10,       // Days after event
  "includeEventDay": true // Include T0
}
```

### Filters
```javascript
"filters": {
  "excludeYears": [2020],  // Exclude specific years
  "minOccurrences": 5      // Minimum events required
}
```

---

## 📊 Frontend Integration

### React Query Example
```javascript
import { useQuery } from '@tanstack/react-query';

function EventAnalysis() {
  const { data, isLoading } = useQuery({
    queryKey: ['event-analysis', 'NIFTY', 'UNION BUDGET DAY'],
    queryFn: async () => {
      const response = await fetch('/api/analysis/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: 'NIFTY',
          eventNames: ['UNION BUDGET DAY'],
          startDate: '2010-01-01',
          endDate: '2024-12-31'
        })
      });
      return response.json();
    }
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Win Rate: {data.data.aggregatedMetrics.winRate}%</h2>
      <h2>Avg Return: {data.data.aggregatedMetrics.avgReturn}%</h2>
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Error: "Symbol not found"
- Check symbol exists in database
- Verify symbol spelling (case-sensitive)

### Error: "Insufficient event occurrences"
- Less than 5 events found
- Adjust date range or event selection

### Error: "No price data"
- Event dates outside available price data
- Check ticker has data for date range

### Slow Response
- Large date range with many events
- Consider narrowing date range
- Caching will help (future enhancement)

---

## 📝 Next Steps

1. **Test with your data**
   - Try different events
   - Experiment with window sizes
   - Test different entry/exit strategies

2. **Build frontend UI**
   - Event selector dropdown
   - Chart visualizations
   - Metrics panel
   - Data table

3. **Optimize**
   - Implement caching
   - Add indexes if needed
   - Monitor performance

---

## 🎓 Best Practices

### Statistical Validity
- Use minimum 5 occurrences
- More events = higher confidence
- Consider excluding outlier years (e.g., 2020 COVID)

### Window Selection
- 10 days before/after is standard
- Adjust based on event type
- Longer windows for major events

### Entry/Exit Strategy
- T-1_CLOSE is most practical
- T0_OPEN requires execution at open
- Test different strategies

---

## 📞 Support

**Documentation:**
- Full Specification: `EVENT_ANALYSIS_SPECIFICATION.md`
- API Reference: `EVENT_ANALYSIS_API_REFERENCE.md`
- Implementation Summary: `EVENT_ANALYSIS_IMPLEMENTATION_SUMMARY.md`

**Need Help?**
1. Check API response for error messages
2. Review logs in backend console
3. Verify authentication token
4. Test with example requests above

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** ${new Date().toISOString().split('T')[0]}
