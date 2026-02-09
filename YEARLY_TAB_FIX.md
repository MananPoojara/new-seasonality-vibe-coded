# Yearly Tab Fix - Chart Not Showing

## Problem Identified ✅

The backend was returning data in this structure:
```javascript
{
  chartData: [
    { date: "2002-01-01", returnPercentage: 3.26, cumulative: 103.26 }
    // Only has cumulative data, NO OHLC!
  ],
  tableData: [
    { date: "2002-01-01", open: 1000, high: 1100, low: 950, close: 1050, returnPercentage: 3.26 }
    // Has OHLC data!
  ]
}
```

The candlestick chart needs **OHLC (Open, High, Low, Close)** data, but we were passing `chartData` which only had cumulative returns.

## Solution Applied ✅

Changed the chart to use `tableData` instead of `chartData`:

```typescript
// BEFORE (Wrong - no OHLC data)
<CandlestickChart data={symbolData.chartData} />

// AFTER (Correct - has OHLC data)
<CandlestickChart data={symbolData.tableData || symbolData.data || symbolData.chartData} />
```

Also updated:
- Data table to use `tableData`
- CSV export to use `tableData` with OHLC columns

## What Changed:

### File: `apps/frontend/src/app/(dashboard)/dashboard/yearly/page.tsx`

1. **Chart Component**: Now uses `tableData` (has OHLC)
2. **Data Table**: Now uses `tableData` (has OHLC)
3. **CSV Export**: Now exports OHLC columns instead of just cumulative

## Expected Result:

Now you should see:
- ✅ Green/Red candlesticks for each year
- ✅ Hover tooltip showing OHLC + Return %
- ✅ Data table with Year, Open, High, Low, Close, Return %
- ✅ CSV export with all OHLC columns

## Test It:

1. Refresh the page (Ctrl+R or Cmd+R)
2. Select NIFTY symbol
3. Click "APPLY FILTERS"
4. You should now see candlesticks! 🎉

The chart should show 6 candles (one for each year: 2002, 2004, 2012, 2014, 2022, 2024).
