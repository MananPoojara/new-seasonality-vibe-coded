# Scenario Tab - Calculation Verification Questions

## Overview
The scenario tab calculations are based on the old software (`old-software/tabs/dailyTimeFrame_scenario.py`). Below are questions to verify if the implementation matches your requirements.

## 1. Historic Trending Days

### Current Implementation:
```javascript
// Finds days after N consecutive bullish/bearish days
// Calculates returns from T-dayRange to T+dayRange
// Computes superimposed (compounded) returns
```

### Questions:

**Q1.1:** In the old software (line 1280), it uses `getHistoricTrendingDays()` which checks `ReturnPoints` (not `ReturnPercentage`). Should we:
- [ ] Use `returnPoints` field from database?
- [ ] Use `returnPercentage` as currently implemented?
- [ ] Calculate points from percentage?

**Q1.2:** The superimposed returns calculation - should it be:
- [ ] Compounded (current): `cumulative = cumulative * (1 + return/100)`
- [ ] Simple sum: `cumulative = cumulative + return`
- [ ] Something else?

**Q1.3:** When finding consecutive days, should we:
- [ ] Reset counter after finding a match (current implementation)
- [ ] Allow overlapping sequences?
- [ ] Skip N days after finding a match?

**Q1.4:** The "Date(T)" in the table - should it be:
- [ ] The last day of the consecutive sequence (current)
- [ ] The first day of the consecutive sequence?
- [ ] The day after the sequence?

## 2. Trending Streak

### Current Implementation:
```javascript
// Tracks consecutive days meeting criteria (> or < threshold)
// Records streaks when they end and length >= minimum
// Calculates percent change from start to end
```

### Questions:

**Q2.1:** The old software has complex logic with week/month/year inputs (lines 1420-1450). Should we:
- [ ] Keep simple implementation (current)
- [ ] Add week-based streak tracking?
- [ ] Add month-based streak tracking?
- [ ] Add year-based streak tracking?

**Q2.2:** The streak table in old software has columns for:
- Week Date, Week Close, Week Percent
- Month Date, Month Close, Month Percent  
- Year Date, Year Close, Year Percent

Should we add these columns?
- [ ] Yes, add all multi-timeframe columns
- [ ] No, keep simple daily streak only (current)

**Q2.3:** The `trendingStreakPercent` parameter - should it be:
- [ ] Minimum percent change per day (current interpretation)
- [ ] Total percent change for entire streak?
- [ ] Something else?

## 3. Momentum Ranking

### Current Implementation:
```javascript
// Placeholder - returns empty array
```

### Questions:

**Q3.1:** The old software loads symbols from `./Watchlist/Watchlist.csv`. Should we:
- [ ] Create a Watchlist table in database?
- [ ] Use a predefined list of symbols?
- [ ] Allow user to select symbols?
- [ ] Load from external file?

**Q3.2:** ATR (Average True Range) calculation - the old software calculates:
```python
ATR_Percentage = max(
    abs(High - Low),
    abs(High - PrevClose),
    abs(Low - PrevClose)
) / PrevClose * 100
```

Should we:
- [ ] Add High/Low fields to daily data?
- [ ] Calculate from existing data?
- [ ] Skip ATR calculation?

**Q3.3:** The ranking columns in old software:
- Recent N Days (1, 2, etc.)
- Recent M Months (1, 2, etc.)
- ATR Percentage
- Average of Rankings
- Dual Average (ATR + Time period)

Should we implement:
- [ ] All columns as in old software?
- [ ] Simplified version with fewer columns?
- [ ] Customizable columns?

**Q3.4:** The `watchlistMomentumTrendType` parameter:
- 0 = Bullish (all positive)
- 1 = Bearish (all negative)
- -1 = Any

Should we:
- [ ] Keep this logic?
- [ ] Change to string values ('Bullish', 'Bearish', 'Any')?
- [ ] Add more trend types?

## 4. Watchlist Analysis

### Current Implementation:
```javascript
// Placeholder - returns null
```

### Questions:

**Q4.1:** The old software shows a bar chart with multiple timeframes:
- Recent Week
- Recent Month 1
- Recent Month 2
- Recent Month 3

Should we:
- [ ] Implement exactly as old software?
- [ ] Make timeframes configurable?
- [ ] Add more timeframes?

**Q4.2:** The chart width calculation in old software:
```python
width = max(400, watchlistSymbolCount * 180)
```

Should we:
- [ ] Use same formula?
- [ ] Make it responsive?
- [ ] Fixed width?

**Q4.3:** Should the watchlist analysis:
- [ ] Use same watchlist as Momentum Ranking?
- [ ] Allow separate watchlist selection?
- [ ] Support multiple watchlists?

## 5. Filter Integration

### Questions:

**Q5.1:** The old software has percentage change filters for:
- Daily
- Monday Weekly
- Expiry Weekly
- Monthly
- Yearly

Each with a toggle switch and range slider. Should we:
- [ ] Add these to the Outlier Filters section (current)?
- [ ] Create separate "Percentage Change Filters" section?
- [ ] Keep as is?

**Q5.2:** The old software has specific filters for:
- Expiry Week Number (Monthly/Yearly)
- Monday Week Number (Monthly/Yearly)

Should we:
- [ ] Add these as separate inputs?
- [ ] Keep in general Week Filters (current)?
- [ ] Make them more prominent?

**Q5.3:** The decade years filter - old software allows selecting multiple (1-10). Should we:
- [ ] Add multi-select dropdown?
- [ ] Keep in Year Filters as checkboxes?
- [ ] Current implementation is sufficient?

## 6. Data Table Display

### Questions:

**Q6.1:** The old software shows statistics rows at the bottom:
- All Count
- Pos Count / Neg Count
- Avg Return All / Pos / Neg
- Sum Return All / Pos / Neg
- Superimposed Returns

Should we:
- [ ] Add these as table footer rows?
- [ ] Show in separate statistics panel (current)?
- [ ] Both?

**Q6.2:** The table styling in old software uses:
- Fixed headers
- Sortable columns
- Conditional formatting (colors for positive/negative)
- Download button

Should we add:
- [ ] All these features?
- [ ] Just basic table (current)?
- [ ] Prioritize which features?

## 7. Performance & Caching

### Questions:

**Q7.1:** The old software recalculates on every filter change. Should we:
- [ ] Cache results (current implementation)?
- [ ] Recalculate every time?
- [ ] Cache with shorter TTL?

**Q7.2:** For large datasets (10+ years), should we:
- [ ] Add pagination?
- [ ] Limit results to top N?
- [ ] Show all results (current)?

## 8. Chart Visualizations

### Questions:

**Q8.1:** The Historic Trend chart in old software uses Plotly with:
- Area chart
- Crosshair
- Hover tooltips
- Zoom/pan
- Vertical lines at T-1 and T+1

Should we use:
- [ ] Lightweight Charts (like other tabs)?
- [ ] Recharts?
- [ ] Chart.js?
- [ ] Plotly (same as old software)?

**Q8.2:** The Watchlist Analysis chart is a grouped bar chart. Should we use:
- [ ] Recharts (good for bar charts)?
- [ ] Chart.js?
- [ ] Plotly?

## 9. Download Functionality

### Questions:

**Q9.1:** The old software has download buttons for:
- Historic Trend Data Table
- Trending Streak Data Table
- Momentum Ranking Data Table

Should we:
- [ ] Add download buttons to each section?
- [ ] Single "Download All" button?
- [ ] Download as CSV, Excel, or both?

**Q9.2:** The downloaded filename format in old software:
```
Youngturtle_historicalTrendingDays.csv
Youngturtle_TrendingDayStreak.csv
Youngturtle_momentumBasedRanking.csv
```

Should we:
- [ ] Keep "Youngturtle" prefix?
- [ ] Use symbol name instead?
- [ ] Add timestamp?
- [ ] Format: `{symbol}_{section}_{date}.csv`?

## 10. Error Handling

### Questions:

**Q10.1:** When no data matches filters, should we:
- [ ] Show "No data available" message (current)?
- [ ] Show empty chart/table?
- [ ] Suggest removing filters?

**Q10.2:** When calculation fails, should we:
- [ ] Show error message?
- [ ] Log to console and show generic error?
- [ ] Retry automatically?

## How to Answer These Questions

Please review each section and indicate your preferences. For example:

```
Q1.1: Use returnPercentage ✓
Q1.2: Compounded ✓
Q1.3: Reset counter after finding match ✓
...
```

Or provide additional context:

```
Q3.1: Create Watchlist table in database
- Table should have: id, name, symbols (JSON array)
- User can create/edit watchlists in UI
- Default watchlist: NIFTY50 stocks
```

## Priority Questions

If you want to start with the most important questions:

**High Priority:**
- Q1.1 (ReturnPoints vs ReturnPercentage)
- Q1.2 (Superimposed calculation method)
- Q3.1 (Watchlist data source)
- Q3.2 (ATR calculation)
- Q8.1 (Chart library choice)

**Medium Priority:**
- Q2.1 (Multi-timeframe streaks)
- Q5.1 (Percentage change filters)
- Q6.1 (Statistics display)
- Q9.1 (Download functionality)

**Low Priority:**
- Q1.3 (Overlapping sequences)
- Q5.3 (Decade years UI)
- Q9.2 (Filename format)
- Q10.1 (Error messages)
