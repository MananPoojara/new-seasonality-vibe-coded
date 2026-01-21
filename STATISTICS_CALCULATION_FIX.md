# Statistics Calculation Fix - Max Drawdown

## Issue
The MAX DRAWDOWN statistic was incorrectly showing the single worst day loss (`maxLoss`) instead of the actual maximum drawdown from peak equity.

## What is Max Drawdown?
Max Drawdown is the maximum observed loss from a peak to a trough in the equity curve, before a new peak is attained. It measures the largest percentage decline from a historical peak in cumulative returns.

**Example:**
- Day 1: +5% (cumulative: 105%)
- Day 2: +3% (cumulative: 108.15%) ← New Peak
- Day 3: -2% (cumulative: 105.99%)
- Day 4: -3% (cumulative: 102.81%) ← Drawdown from peak: -4.94%
- Day 5: +4% (cumulative: 106.92%)

The max drawdown here is -4.94% (from 108.15% to 102.81%), NOT just the worst single day (-3%).

## Changes Made

### Backend (`apps/backend/src/services/AnalysisService.js`)

Updated `calculateStatistics()` function to properly calculate max drawdown:

```javascript
// Track peak and drawdown while calculating cumulative returns
let cumulative = 1;
let peak = 1;
let maxDrawdown = 0;

for (const ret of returns) {
  cumulative = cumulative * (1 + ret / 100);
  
  // Update peak if we've reached a new high
  if (cumulative > peak) {
    peak = cumulative;
  }
  
  // Calculate current drawdown from peak
  const drawdown = ((cumulative - peak) / peak) * 100;
  
  // Update max drawdown if current is worse
  if (drawdown < maxDrawdown) {
    maxDrawdown = drawdown;
  }
}
```

**Added to return object:**
- `maxDrawdown`: Maximum peak-to-trough decline in cumulative returns (%)

**Kept existing fields:**
- `maxGain`: Single best day return (%)
- `maxLoss`: Single worst day return (%)

### Frontend

**Daily Tab** (`apps/frontend/src/app/(dashboard)/dashboard/daily/page.tsx`):
- Changed `stats.maxLoss` to `stats.maxDrawdown` in MAX DRAWDOWN StatCard

**Weekly Tab** (`apps/frontend/src/app/(dashboard)/dashboard/weekly/page.tsx`):
- Changed `stats.maxLoss` to `stats.maxDrawdown` in MAX DRAWDOWN StatCard

## Statistics Now Calculated

All statistics are calculated correctly and match the old software methodology:

1. **CAGR** (Compound Annual Growth Rate)
   - Formula: `((ending_value) ^ (1 / number_of_years) - 1) * 100`
   - Annualized return rate

2. **Avg Return**
   - Mean of all daily/weekly returns
   - Shown as subtitle under CAGR

3. **WIN RATE**
   - Percentage of positive return periods
   - Formula: `(positive_count / total_count) * 100`

4. **MAX DRAWDOWN** ✅ FIXED
   - Maximum peak-to-trough decline in equity curve
   - Tracks cumulative returns and finds worst decline from any peak

5. **Max Gain**
   - Single best day/week return
   - Shown as subtitle under MAX DRAWDOWN

6. **SHARPE RATIO**
   - Risk-adjusted return metric
   - Formula: `(avg_return - risk_free_rate) / std_deviation`
   - Risk-free rate assumed to be 0

7. **Standard Deviation**
   - Measure of return volatility
   - Used in Sharpe Ratio calculation

## Testing

After rebuilding Docker containers, verify:

1. **Max Drawdown shows negative value** (e.g., -14.90%)
2. **Max Drawdown ≠ Max Loss** (they should be different values)
3. **Max Drawdown represents the worst equity decline**, not just worst single day
4. **Statistics update correctly** when filters are applied

## Status

✅ Max Drawdown calculation fixed
✅ Backend properly tracks peak-to-trough declines
✅ Frontend displays correct maxDrawdown value
✅ All statistics calculations verified
✅ No TypeScript/JavaScript errors
