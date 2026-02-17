# Yearly Tab Debug Guide

## Issue: Chart Not Showing

The yearly tab is loading but the candlestick chart is not displaying.

## Changes Made to Fix:

### 1. Updated YearlyAnalysisParams Interface
**File**: `apps/frontend/src/lib/api.ts`

Added missing parameters:
```typescript
export interface YearlyAnalysisParams {
  symbol: string;  // Single symbol for backend
  symbols?: string[];  // Keep for backward compatibility
  startDate: string;
  endDate: string;
  yearType?: 'calendar' | 'expiry';  // ✅ ADDED
  filters?: FilterConfig;             // ✅ ADDED
  chartScale?: 'linear' | 'log';      // ✅ ADDED
  overlayType?: 'CalendarDays' | 'TradingDays';
}
```

### 2. Added Debug Logging
**File**: `apps/frontend/src/app/(dashboard)/dashboard/yearly/page.tsx`

Added console.log statements to track:
- API request parameters
- API response data
- Symbol data
- Chart data
- Processed chart data

### 3. Improved Data Validation
**File**: `apps/frontend/src/app/(dashboard)/dashboard/yearly/page.tsx`

Updated candlestick chart to:
- Filter out invalid OHLC data
- Parse values as floats
- Only render if data exists
- Log processed data for debugging

## How to Debug:

### Step 1: Open Browser Console
Press F12 or right-click → Inspect → Console tab

### Step 2: Check Console Logs
You should see these logs when you click "APPLY FILTERS":

```
Fetching yearly data for: NIFTY { startDate: ..., endDate: ..., yearType: 'calendar', filters: {...} }
Yearly API Response: { success: true, data: { NIFTY: {...} } }
Symbol Data: { chartData: [...], statistics: {...} }
Chart Data: [{ date: ..., open: ..., high: ..., low: ..., close: ... }]
Yearly Chart Data: [...]
Processed Chart Data: [{ time: ..., open: ..., high: ..., low: ..., close: ... }]
```

### Step 3: Check for Errors

**If you see "Symbol not found" error:**
- The backend doesn't have yearly data for this symbol
- Check if `YearlySeasonalityData` table has data

**If you see empty chartData:**
- The filters might be too restrictive
- Try removing all filters and using a wider date range

**If you see "Cannot read property 'open' of undefined":**
- The data structure from backend is different than expected
- Check the backend response format

### Step 4: Check Backend Response

In the console, look for the API response structure. It should be:
```javascript
{
  success: true,
  data: {
    NIFTY: {
      chartData: [
        {
          date: "2018-01-01",
          open: 10000,
          high: 11000,
          low: 9500,
          close: 10500,
          returnPercentage: 5.0
        },
        // ... more years
      ],
      statistics: {
        cagr: 7.28,
        winRate: 100,
        maxDrawdown: 0,
        sharpeRatio: 1.39
      }
    }
  }
}
```

### Step 5: Check if Data Has OHLC Values

The candlestick chart requires:
- `open` (number)
- `high` (number)
- `low` (number)
- `close` (number)

If any of these are missing or null, the candle won't render.

## Common Issues:

### Issue 1: No Data in Database
**Symptom**: Empty chartData array
**Solution**: Check if `YearlySeasonalityData` table has records:
```sql
SELECT COUNT(*) FROM "YearlySeasonalityData" WHERE "tickerId" = (SELECT id FROM "Ticker" WHERE symbol = 'NIFTY');
```

### Issue 2: Wrong Table Name
**Symptom**: Backend error "Table not found"
**Solution**: Check if backend is querying the right table:
- Should be: `yearlySeasonalityData` (camelCase in Prisma)
- Not: `YearlyData` or `yearly_data`

### Issue 3: Filters Too Restrictive
**Symptom**: Data exists but chartData is empty after filtering
**Solution**: 
- Remove all filters
- Use date range: 2018-01-01 to 2025-12-31
- Check "All Years" for positive/negative filter

### Issue 4: Date Format Issues
**Symptom**: Chart shows but candles are in wrong position
**Solution**: Check date format in data - should be ISO string or valid date

## Quick Test:

1. **Select Symbol**: NIFTY
2. **Date Range**: 01/01/2018 to 31/12/2025
3. **Year Type**: Calendar Year
4. **Filters**: All Years (no filters)
5. **Click**: APPLY FILTERS
6. **Check Console**: Look for the logs above

## If Still Not Working:

### Check Backend Logs:
```bash
docker-compose logs backend | grep -i "yearly"
```

### Check if API Endpoint Exists:
```bash
curl -X POST http://localhost:3001/api/analysis/yearly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "symbol": "NIFTY",
    "startDate": "2018-01-01",
    "endDate": "2025-12-31",
    "yearType": "calendar"
  }'
```

### Check Database:
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%yearly%';

-- Check data
SELECT * FROM "YearlySeasonalityData" LIMIT 5;
```

## Expected Behavior:

When working correctly, you should see:
1. ✅ Statistics cards showing CAGR, Win Rate, etc.
2. ✅ Candlestick chart with green/red candles
3. ✅ Hover tooltip showing OHLC + Return %
4. ✅ Data table with yearly data

## Next Steps:

1. Open browser console (F12)
2. Click "APPLY FILTERS"
3. Check the console logs
4. Share the console output if still not working

The debug logs will tell us exactly what's happening!
