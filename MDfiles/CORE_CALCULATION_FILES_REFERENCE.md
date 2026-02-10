# Core Calculation Files Reference Guide

## Quick Navigation

### Original Python Implementation
- **Main File**: `old-software/others/GenerateMultipleFiles.py`
- **Helper Functions**: `old-software/helper.py`
- **UI Components**: `old-software/tabs/` and `old-software/components/`

### Current JavaScript Implementation
- **Main File**: `apps/backend/src/processing/fileGenerator.js`
- **Related Files**: `apps/backend/src/` (processing, utils, services)

---

## Python Implementation Details

### File: `old-software/others/GenerateMultipleFiles.py`

#### Purpose
Generates 5 CSV files from daily OHLCV data with calculated seasonality indicators.

#### Key Functions

##### 1. `generateFiles(symbolDailyData, fileStorePath)` (Line 87)
**Main orchestration function**

Process Flow:
1. Format daily data (lines 100-102)
2. Generate Monday weekly (lines 105-108)
3. Generate Expiry weekly (lines 111-115)
4. Generate Monthly (lines 118-121)
5. Generate Yearly (lines 124-127)
6. Reset indices (lines 130-134)
7. Calculate yearly fields (lines 137-143)
8. Calculate monthly fields (lines 146-157)
9. Calculate Monday weekly fields (lines 160-189)
10. Calculate Expiry weekly fields (lines 192-221)
11. Calculate daily fields (lines 224-330)
12. Save to CSV (lines 333-337)

##### 2. `getYearlyReturns(row)` (Line 30)
**Lookup yearly returns for a given row**

```python
def getYearlyReturns(row):
    global symbolYearlyData
    yearlyReturns = [np.nan, np.nan]
    yearlyRow = symbolYearlyData[symbolYearlyData['Date'] == datetime(row['Date'].year, 1, 1)]
    if (len(yearlyRow) > 0):
        yearlyReturnPoints = yearlyRow['ReturnPoints'].iloc[0]
        yearlyReturnPercentage = yearlyRow['ReturnPercentage'].iloc[0]
        yearlyReturns[0] = yearlyReturnPoints
        yearlyReturns[1] = yearlyReturnPercentage
    return yearlyReturns
```

Returns: `[returnPoints, returnPercentage]`

##### 3. `getMonthlyReturns(row)` (Line 42)
**Lookup monthly returns for a given row**

Similar to `getYearlyReturns()` but matches on year and month.

Returns: `[returnPoints, returnPercentage]`

##### 4. `getMondayWeeklyData(row)` (Line 54)
**Lookup Monday weekly data for a given row**

Returns: `[returnPoints, returnPercentage, weekNumberMonthly, weekNumberYearly]`

##### 5. `getExpiryWeeklyData(row)` (Line 70)
**Lookup Expiry weekly data for a given row**

Returns: `[returnPoints, returnPercentage, weekNumberMonthly, weekNumberYearly]`

#### Column Aggregation Logic (Line 14)
```python
columnLogic = {
    'Ticker': 'first',
    'Open': 'first',
    'High': 'max',
    'Low': 'min',
    'Close': 'last',
    'Volume': 'sum',
    'OpenInterest': 'last',
    'Weekday': 'first'
}
```

#### Key Calculations

**Yearly Fields** (Lines 137-143)
```python
symbolYearlyData['EvenYear'] = ((symbolYearlyData['Date'].dt.year % 2) == 0)
symbolYearlyData['ReturnPoints'] = symbolYearlyData['Close'] - symbolYearlyData['Close'].shift(1)
symbolYearlyData['ReturnPercentage'] = round((symbolYearlyData['ReturnPoints'] / symbolYearlyData['Close'].shift(1)*100), 2)
symbolYearlyData['PositiveYear'] = (symbolYearlyData['ReturnPoints'] > 0)
```

**Monday Weekly Fields** (Lines 160-189)
```python
# Week number calculation (lines 165-173)
for i in range(1, len(symbolMondayWeeklyData)):
    if (symbolMondayWeeklyData.loc[i, 'Date'].month != symbolMondayWeeklyData.loc[i-1, 'Date'].month):
        symbolMondayWeeklyData.loc[i, 'WeekNumberMonthly'] = 1
    else:
        symbolMondayWeeklyData.loc[i, 'WeekNumberMonthly'] = symbolMondayWeeklyData.loc[i-1, 'WeekNumberMonthly'] + 1

# Return calculations (lines 180-182)
symbolMondayWeeklyData['ReturnPoints'] = symbolMondayWeeklyData['Close'] - symbolMondayWeeklyData['Close'].shift(1)
symbolMondayWeeklyData['ReturnPercentage'] = round((symbolMondayWeeklyData['ReturnPoints'] / symbolMondayWeeklyData['Close'].shift(1)*100), 2)
symbolMondayWeeklyData['PositiveWeek'] = (symbolMondayWeeklyData['ReturnPoints'] > 0)
```

**Daily Fields** (Lines 224-330)
```python
# Trading day calculation (lines 250-265)
for i in range(1, len(symbolDailyData)):
    if (symbolDailyData.loc[i, 'Date'].month != symbolDailyData.loc[i-1, 'Date'].month):
        symbolDailyData.loc[i, 'TradingMonthDay'] = 1
    else:
        symbolDailyData.loc[i, 'TradingMonthDay'] = symbolDailyData.loc[i - 1, 'TradingMonthDay'] + 1

# Monday weekly date calculation (line 290)
symbolDailyData['MondayWeeklyDate'] = symbolDailyData['Date'].apply(lambda x: x - pd.tseries.frequencies.to_offset(str(x.weekday()) + 'D'))

# Expiry weekly date calculation (lines 298-301)
symbolDailyData['ExpiryWeeklyDate'] = symbolDailyData['Date'].apply(
    lambda x: (x + pd.tseries.frequencies.to_offset(str(6) + 'D')) if (x.weekday() == 4)
    else (x + pd.tseries.frequencies.to_offset(str(3-x.weekday()) + 'D'))
)
```

#### Input Data Format
```python
# Expected columns in input CSV
Ticker, Date, Open, High, Low, Close, Volume, OpenInterest

# Date format: DD-MM-YYYY (line 360)
dataFile['Date'] = pd.to_datetime(dataFile['Date'], format='%d-%m-%Y')
```

#### Output Files
```
1_Daily.csv          - 40+ columns with daily data and indicators
2_MondayWeekly.csv   - Weekly aggregation (Monday start)
3_ExpiryWeekly.csv   - Weekly aggregation (Friday end)
4_Monthly.csv        - Monthly aggregation
5_Yearly.csv         - Yearly aggregation
```

---

## JavaScript Implementation Details

### File: `apps/backend/src/processing/fileGenerator.js`

#### Purpose
JavaScript port of Python GenerateMultipleFiles.py

#### Key Class: `FileGenerator`

##### Constructor (Line 32)
```javascript
constructor() {
  this.symbolDailyData = [];
  this.symbolMondayWeeklyData = [];
  this.symbolExpiryWeeklyData = [];
  this.symbolMonthlyData = [];
  this.symbolYearlyData = [];
}
```

##### Main Method: `generateFiles(dailyData, symbol)` (Line 40)

Process Flow:
1. Prepare daily data (line 48)
2. Generate timeframe aggregations (lines 51-54)
3. Calculate derived fields (lines 57-60)
4. Return all datasets (lines 62-68)

##### Aggregation Methods

**`prepareDailyData(rawData)`** (Line 75)
- Parses and formats input data
- Sorts by date ascending
- Converts dates to Date objects

**`generateMondayWeeklyData()`** (Line 100)
- Groups daily data by Monday of week
- Uses Map for efficient grouping
- Applies column aggregation logic

**`generateExpiryWeeklyData()`** (Line 130)
- Groups daily data by Friday of week
- Includes startDate field

**`generateMonthlyData()`** (Line 160)
- Groups daily data by month
- Uses month key for grouping

**`generateYearlyData()`** (Line 190)
- Groups daily data by year
- Uses year key for grouping

##### Calculation Methods

**`calculateYearlyFields()`** (Line 220)
```javascript
for (let i = 0; i < this.symbolYearlyData.length; i++) {
  const record = this.symbolYearlyData[i];
  
  record.evenYear = (record.date.getFullYear() % 2) === 0;
  
  if (i > 0) {
    const prevRecord = this.symbolYearlyData[i - 1];
    record.returnPoints = record.close - prevRecord.close;
    record.returnPercentage = Math.round((record.returnPoints / prevRecord.close) * 100 * 100) / 100;
  } else {
    record.returnPoints = null;
    record.returnPercentage = null;
  }
  
  record.positiveYear = record.returnPoints > 0;
}
```

**`calculateMondayWeeklyFields()`** (Line 310)
- Calculates week numbers (monthly and yearly)
- Calculates even week indicators
- Calculates return points and percentages
- Looks up monthly and yearly returns

**`calculateExpiryWeeklyFields()`** (Line 360)
- Same logic as Monday weekly

**`calculateDailyFields()`** (Line 410)
- Calculates calendar and trading day fields
- Calculates all return types (daily, weekly, monthly, yearly)
- Looks up data from all aggregated timeframes

##### Helper Methods

**`getMondayOfWeek(date)`** (Line 550)
```javascript
getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
```

**`getFridayOfWeek(date)`** (Line 560)
```javascript
getFridayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 5) {
    return new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
  } else {
    const diff = 5 - day;
    return new Date(d.getTime() + diff * 24 * 60 * 60 * 1000);
  }
}
```

**`getDayOfYear(date)`** (Line 580)
```javascript
getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
```

**`getYearlyReturns(record)`** (Line 590)
- Finds yearly record matching record's year
- Returns returnPoints and returnPercentage

**`getMonthlyReturns(record)`** (Line 605)
- Finds monthly record matching record's year and month
- Returns returnPoints and returnPercentage

**`getMondayWeeklyData(record)`** (Line 620)
- Finds Monday weekly record matching record's Monday date
- Returns returnPoints, returnPercentage, weekNumberMonthly, weekNumberYearly

**`getExpiryWeeklyData(record)`** (Line 640)
- Finds Expiry weekly record matching record's Friday date
- Returns returnPoints, returnPercentage, weekNumberMonthly, weekNumberYearly

##### CSV Export

**`toCSV(data)`** (Line 660)
```javascript
toCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString().split('T')[0];
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
```

---

## Helper Functions Reference

### Python: `old-software/helper.py`

#### Data Table Statistics (Line 50)
```python
def getDataTableStatistics(allDayReturnPoints1):
    positiveReturnPoints1 = allDayReturnPoints1[allDayReturnPoints1 > 0]
    negativeReturnPoints1 = allDayReturnPoints1[allDayReturnPoints1 < 0]
    allDaysStats = pd.Series({
        'All Count': np.size(allDayReturnPoints1),
        'Avg Return All': np.mean(allDayReturnPoints1),
        'Sum Return All': np.sum(allDayReturnPoints1),
        'Pos Count': np.size(positiveReturnPoints1),
        'Avg Return Pos': np.mean(positiveReturnPoints1),
        'Sum Return Pos': np.sum(positiveReturnPoints1),
        'Neg Count': np.size(negativeReturnPoints1),
        'Avg Return Neg': np.mean(negativeReturnPoints1),
        'Sum Return Neg': np.sum(negativeReturnPoints1)
    })
    return allDaysStats
```

#### Data Table Formatting (Line 75)
```python
def getDataTableForPlot(dataTabel1):
    # Transposes, formats, and calculates accuracy percentages
    # Returns [formatted_data, original_data]
```

#### Filtering (Line 350)
```python
def filterDataFrameFromHelper(symbolNameToPlotValue, chartScaleValue, ...):
    # Comprehensive filtering function with 20+ filter parameters
    # Filters by: year, month, week, day, percentage changes, etc.
```

---

## Calculation Flow Diagram

```
Input: Daily OHLCV Data
    ↓
[Prepare Daily Data]
    ↓
├─→ [Generate Monday Weekly] → [Calculate Monday Weekly Fields]
├─→ [Generate Expiry Weekly] → [Calculate Expiry Weekly Fields]
├─→ [Generate Monthly] → [Calculate Monthly Fields]
└─→ [Generate Yearly] → [Calculate Yearly Fields]
    ↓
[Calculate Daily Fields]
    ├─→ Lookup Yearly Returns
    ├─→ Lookup Monthly Returns
    ├─→ Lookup Monday Weekly Data
    └─→ Lookup Expiry Weekly Data
    ↓
Output: 5 CSV Files
├─→ 1_Daily.csv
├─→ 2_MondayWeekly.csv
├─→ 3_ExpiryWeekly.csv
├─→ 4_Monthly.csv
└─→ 5_Yearly.csv
```

---

## Testing Checklist

### Unit Tests to Create

- [ ] Test Monday calculation (W-SUN offset)
- [ ] Test Friday calculation (W-THU offset)
- [ ] Test return point calculation
- [ ] Test return percentage calculation (2 decimal precision)
- [ ] Test week number reset on month boundary
- [ ] Test week number reset on year boundary
- [ ] Test trading day counter reset on month boundary
- [ ] Test trading day counter reset on year boundary
- [ ] Test even/odd indicators
- [ ] Test cross-timeframe lookups
- [ ] Test null/NaN handling for first records
- [ ] Test leap year day-of-year calculation

### Integration Tests

- [ ] Generate files from sample data
- [ ] Compare Python vs JavaScript output
- [ ] Verify row counts match
- [ ] Verify calculations match exactly
- [ ] Test with edge cases (month/year boundaries)
- [ ] Test with different date ranges

---

## Performance Considerations

### Python Implementation
- Uses pandas for vectorized operations
- Global variables for cross-function data sharing
- Efficient resampling with built-in methods

### JavaScript Implementation
- Uses Map for O(1) lookups during aggregation
- Array.find() for cross-timeframe lookups (O(n))
- Could be optimized with Map-based lookups

### Optimization Opportunities
1. Use Map instead of Array.find() for lookups
2. Cache date calculations
3. Batch process multiple symbols
4. Use typed arrays for large datasets

---

## Common Issues and Solutions

### Issue: Week numbers don't match
**Solution**: Verify Monday/Friday calculation logic matches exactly

### Issue: Return percentages differ by 0.01
**Solution**: Check rounding method - Python uses round(), JavaScript uses Math.round()

### Issue: Null values appear unexpectedly
**Solution**: Verify first record handling - returns should be null for first record

### Issue: Month/year boundaries incorrect
**Solution**: Check date comparison logic - must use exact date matching

---

## References

- **Python Pandas Documentation**: https://pandas.pydata.org/docs/
- **JavaScript Date API**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- **CSV Format**: RFC 4180

