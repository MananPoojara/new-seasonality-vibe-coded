# Scenario Tab - Quick Start Guide

## What is the Scenario Tab?

The Scenario Tab is a powerful analysis tool that helps you discover patterns in market data by applying complex filters and analyzing historical trends. It has 4 main features:

### 1. **Historic Trending Days**
Answers: "What typically happens after N consecutive bullish/bearish days?"
- Shows superimposed returns before and after trending periods
- Helps identify mean reversion or continuation patterns

### 2. **Trending Streak**
Answers: "When did long streaks of up/down days occur?"
- Identifies periods of sustained momentum
- Shows start/end dates and total returns

### 3. **Momentum Ranking** (Coming Soon)
Answers: "Which symbols have the strongest momentum right now?"
- Ranks symbols by recent performance
- Considers multiple timeframes

### 4. **Watchlist Analysis** (Coming Soon)
Answers: "How are my watchlist symbols performing?"
- Visual comparison of returns across symbols
- Multiple timeframe analysis

## How to Use

### Step 1: Access the Tab
Navigate to: **Dashboard → Scenario**

### Step 2: Select Your Symbol
In the left sidebar under "Market Context", choose your symbol (e.g., NIFTY, BANKNIFTY)

### Step 3: Set Date Range
Under "Time Ranges", select:
- Start Date (e.g., 2016-01-01)
- End Date (e.g., 2025-12-31)

### Step 4: Apply Filters (Optional)

**Year Filters:**
- Positive/Negative Years: Only years where the symbol went up/down
- Even/Odd/Leap Years: Filter by year characteristics
- Decade Years: Select specific decade digits (e.g., only years ending in 1, 2, 3)

**Month Filters:**
- Positive/Negative Months: Only months that were up/down
- Even/Odd Months: Filter by month number
- Specific Month: Analyze only one month (e.g., January)

**Week Filters:**
- Expiry/Monday Week: Choose week type
- Positive/Negative Weeks: Filter by week performance
- Even/Odd Weeks: Filter by week number

**Day Filters:**
- Positive/Negative Days: Only up/down days
- Weekdays: Select specific days (Mon-Fri)
- Calendar/Trading Days: Filter by day position in month/year

**Risk Management:**
- Set percentage ranges to remove outliers
- Helps focus on typical behavior

### Step 5: Configure Historic Trend Settings

**Trend Type:**
- Bullish: Look for consecutive up days
- Bearish: Look for consecutive down days

**Consecutive Days:** (2-10)
- How many consecutive days to look for
- Example: 3 = find instances of 3 up days in a row

**Day Range:** (5-25)
- How many days before/after to analyze
- Example: 10 = show T-10 to T+10 days

### Step 6: Click "APPLY FILTERS"

The system will:
1. Load and filter your data
2. Calculate all metrics
3. Display results in the active section

### Step 7: Explore Results

**Historic Trending Days Tab:**
- Chart shows superimposed returns (compounded average)
- Table shows individual occurrences
- Statistics show win rate, average returns, etc.

**Trending Streak Tab:**
- Table shows all streaks found
- Start/End dates and prices
- Total days and percent change

## Example Use Cases

### Use Case 1: Mean Reversion After 3 Down Days
**Question:** "Does NIFTY bounce after 3 consecutive down days?"

**Settings:**
- Symbol: NIFTY
- Date Range: Last 10 years
- Trend Type: Bearish
- Consecutive Days: 3
- Day Range: 10

**Result:** You'll see if there's a tendency to bounce (positive returns) in the days following 3 down days.

### Use Case 2: January Effect
**Question:** "How does NIFTY perform in January after positive years?"

**Settings:**
- Symbol: NIFTY
- Specific Month: January (1)
- Year Filter: Positive Years only
- Trend Type: Bullish
- Consecutive Days: 2

**Result:** Shows if January tends to continue the momentum from positive years.

### Use Case 3: Expiry Week Patterns
**Question:** "What happens after 2 consecutive positive expiry weeks?"

**Settings:**
- Symbol: BANKNIFTY
- Week Type: Expiry
- Week Filter: Positive Weeks only
- Trend Type: Bullish
- Consecutive Days: 2

**Result:** Reveals patterns in expiry week behavior.

## Tips & Tricks

1. **Start Simple**: Begin with just symbol and date range, then add filters gradually

2. **Use Outlier Filters**: Remove extreme days to see typical behavior

3. **Compare Trend Types**: Run analysis for both Bullish and Bearish to see asymmetry

4. **Adjust Consecutive Days**: Try 2, 3, 5 days to find optimal patterns

5. **Seasonal Analysis**: Use Month Filters to find seasonal patterns

6. **Combine Filters**: Mix Year + Month + Week filters for very specific scenarios

## Understanding the Output

### Superimposed Returns Chart
- X-axis: Days relative to the trend (T-10 to T+10)
- Y-axis: Compounded return percentage
- Shows the average path of returns

### Statistics Table
- **All Count**: Total occurrences found
- **Pos Count**: How many times returns were positive
- **Neg Count**: How many times returns were negative
- **Avg Return**: Average return percentage
- **Sum Return**: Total of all returns
- **Win Rate**: Percentage of positive occurrences

### Trending Streak Table
- **Start Date/Close**: When streak began
- **End Date/Close**: When streak ended
- **Total Days**: Length of streak
- **% Change**: Total return during streak

## Performance Notes

- First run may take 5-10 seconds (data loading + calculation)
- Subsequent runs with same filters are cached (instant)
- More filters = faster (less data to process)
- Larger date ranges = slower

## Troubleshooting

**"No data available"**
- Check if symbol has data for selected date range
- Try removing some filters
- Ensure date range is valid

**"System Idle"**
- Click "APPLY FILTERS" button
- Ensure a symbol is selected

**Slow performance**
- Reduce date range
- Add more filters to narrow data
- Clear cache if needed

## Coming Soon

- **Momentum Ranking**: Compare multiple symbols
- **Watchlist Analysis**: Analyze custom watchlists
- **Chart Visualizations**: Interactive charts
- **CSV Export**: Download results
- **Snapshot**: Save chart images

## Questions?

The Scenario Tab uses the same calculation logic as the old software's `dailyTimeFrame_scenario.py` but with a modern, user-friendly interface. All filters work together to help you discover specific market patterns.
