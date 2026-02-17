# Event Analysis API Reference

## Base URL
```
/api/analysis/events
```

## Authentication
All endpoints require authentication token in header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. POST /api/analysis/events
Main event analysis endpoint - analyzes market behavior around recurring events.

**Request Body:**
```json
{
  "symbol": "NIFTY",
  "eventNames": ["UNION BUDGET DAY", "DIWALI"],
  "eventCategories": ["BUDGET", "FESTIVAL"],
  "country": "INDIA",
  "startDate": "2010-01-01",
  "endDate": "2024-12-31",
  "windowConfig": {
    "daysBefore": 10,
    "daysAfter": 10,
    "includeEventDay": true
  },
  "tradeConfig": {
    "entryType": "T-1_CLOSE",
    "daysAfter": 10
  },
  "filters": {
    "excludeYears": [2020],
    "minOccurrences": 5
  }
}
```

**Parameters:**
- `symbol` (required): Stock/index symbol
- `eventNames` (optional): Array of specific event names
- `eventCategories` (optional): Array of event categories
- `country` (optional): Country filter, default "INDIA"
- `startDate` (required): Analysis start date
- `endDate` (required): Analysis end date
- `windowConfig` (optional): Event window configuration
  - `daysBefore`: Trading days before event (default: 10)
  - `daysAfter`: Trading days after event (default: 10)
  - `includeEventDay`: Include event day in analysis (default: true)
- `tradeConfig` (optional): Trade calculation configuration
  - `entryType`: Entry point - "T-1_CLOSE", "T0_OPEN", "T0_CLOSE" (default: "T-1_CLOSE")
  - `daysAfter`: Exit after N days (default: 10)
- `filters` (optional): Additional filters
  - `excludeYears`: Array of years to exclude
  - `minOccurrences`: Minimum event occurrences required (default: 5)

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "NIFTY",
    "eventSummary": {
      "totalEventsFound": 15,
      "eventsAnalyzed": 15,
      "dateRange": {
        "start": "2010-01-01",
        "end": "2024-12-31"
      }
    },
    "averageEventCurve": [
      {
        "relativeDay": -10,
        "avgReturn": 0.2,
        "medianReturn": 0.15,
        "stdDev": 1.5,
        "count": 15,
        "minReturn": -2.1,
        "maxReturn": 3.5
      }
    ],
    "eventOccurrences": [
      {
        "eventName": "UNION BUDGET DAY",
        "eventDate": "2024-02-01",
        "year": 2024,
        "category": "BUDGET",
        "startDate": "2024-01-18",
        "endDate": "2024-02-15",
        "entryPrice": 21800,
        "exitPrice": 22500,
        "returnPercentage": 3.21,
        "mfe": 4.5,
        "mae": -1.2,
        "holdingDays": 10,
        "isProfitable": true
      }
    ],
    "aggregatedMetrics": {
      "totalEvents": 15,
      "dateRange": {
        "start": "2010-02-26",
        "end": "2024-02-01"
      },
      "winRate": 66.67,
      "avgReturn": 2.45,
      "medianReturn": 2.1,
      "stdDev": 3.2,
      "bestEvent": {
        "date": "2019-07-05",
        "return": 8.5
      },
      "worstEvent": {
        "date": "2020-03-23",
        "return": -5.2
      },
      "profitFactor": 2.3,
      "expectancy": 2.45,
      "maxDrawdown": -12.5,
      "sharpeRatio": 1.85,
      "sortinoRatio": 2.1,
      "totalReturn": 36.75,
      "cagr": 2.4
      }
    },
    "equityCurve": [
      {
        "date": null,
        "equity": 100,
        "trade": null
      },
      {
        "date": "2010-03-10",
        "eventDate": "2010-02-26",
        "equity": 102.5,
        "trade": {
          "return": 2.5,
          "eventName": "UNION BUDGET DAY"
        }
      }
    ],
    "distribution": {
      "histogram": [
        {
          "bin": "-5.0 to -4.0",
          "count": 1,
          "range": {
            "min": -5,
            "max": -4
          }
        }
      ],
      "outliers": [
        {
          "eventDate": "2020-03-23",
          "eventName": "UNION BUDGET DAY",
          "return": -5.2
        }
      ],
      "percentiles": {
        "p10": -1.2,
        "p25": 0.5,
        "p50": 2.1,
        "p75": 4.2,
        "p90": 6.5
      },
      "skewness": 0.45,
      "kurtosis": 2.8
    }
  },
  "meta": {
    "processingTime": 1250,
    "cacheKey": "abc123...",
    "cached": false
  }
}
```

---

### 2. GET /api/analysis/events/categories
Get available event categories with occurrence counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "BUDGET",
      "country": "INDIA",
      "count": 15
    },
    {
      "category": "ELECTION",
      "country": "INDIA",
      "count": 8
    },
    {
      "category": "FESTIVAL",
      "country": "INDIA",
      "count": 120
    }
  ]
}
```

---

### 3. GET /api/analysis/events/names
Get available event names with occurrence counts.

**Query Parameters:**
- `category` (optional): Filter by category
- `country` (optional): Filter by country

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "UNION BUDGET DAY",
      "category": "BUDGET",
      "country": "INDIA",
      "occurrences": 15
    },
    {
      "name": "DIWALI",
      "category": "FESTIVAL",
      "country": "INDIA",
      "occurrences": 25
    }
  ]
}
```

---

### 4. GET /api/analysis/events/occurrences/:name
Get all occurrences of a specific event.

**Path Parameters:**
- `name`: Event name

**Query Parameters:**
- `startDate` (optional): Filter start date
- `endDate` (optional): Filter end date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "UNION BUDGET DAY",
      "date": "2024-02-01T00:00:00.000Z",
      "year": 2024,
      "country": "INDIA",
      "category": "BUDGET",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 15
}
```

---

### 5. POST /api/analysis/events/compare
Compare event days vs non-event days.

**Request Body:**
```json
{
  "symbol": "NIFTY",
  "eventNames": ["UNION BUDGET DAY"],
  "startDate": "2010-01-01",
  "endDate": "2024-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventDays": {
      "count": 15,
      "avgReturn": 1.2,
      "stdDev": 2.5,
      "winRate": 66.67
    },
    "nonEventDays": {
      "count": 3500,
      "avgReturn": 0.05,
      "stdDev": 1.8,
      "winRate": 52.3
    },
    "comparison": {
      "returnDifference": 1.15,
      "winRateDifference": 14.37
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Symbol is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Symbol INVALID not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Usage Examples

### Example 1: Analyze Union Budget Day
```javascript
const response = await fetch('/api/analysis/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    symbol: 'NIFTY',
    eventNames: ['UNION BUDGET DAY'],
    startDate: '2010-01-01',
    endDate: '2024-12-31',
    windowConfig: {
      daysBefore: 10,
      daysAfter: 10
    },
    tradeConfig: {
      entryType: 'T-1_CLOSE',
      daysAfter: 10
    }
  })
});

const data = await response.json();
console.log('Win Rate:', data.data.aggregatedMetrics.winRate);
```

### Example 2: Analyze All Festivals
```javascript
const response = await fetch('/api/analysis/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    symbol: 'NIFTY',
    eventCategories: ['FESTIVAL'],
    startDate: '2015-01-01',
    endDate: '2024-12-31'
  })
});
```

### Example 3: Get Available Events
```javascript
// Get categories
const categories = await fetch('/api/analysis/events/categories', {
  headers: { 'Authorization': 'Bearer <token>' }
});

// Get event names in BUDGET category
const events = await fetch('/api/analysis/events/names?category=BUDGET', {
  headers: { 'Authorization': 'Bearer <token>' }
});
```

---

## Rate Limits
- Standard users: 100 requests/hour
- Premium users: 1000 requests/hour
- Enterprise users: Unlimited

## Notes
- All dates are in ISO 8601 format (YYYY-MM-DD)
- Returns are in percentage
- Prices are in the symbol's native currency
- Trading days automatically exclude weekends and holidays
- Minimum 5 event occurrences required for statistical validity
