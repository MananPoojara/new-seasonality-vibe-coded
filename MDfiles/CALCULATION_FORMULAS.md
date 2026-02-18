# Seasonality SaaS - Calculation Formulas

**Last Updated:** 2026-02-18  
**Purpose:** Complete guide to all statistical calculations used in the platform

---

## 📊 Basic Return Calculations

### Daily Return (Points)
```
Return (Points) = Close(t) - Close(t-1)
```

### Daily Return (Percentage)
```
Return (%) = ((Close(t) - Close(t-1)) / Close(t-1)) × 100
```

**Example:**
- Yesterday's Close: ₹100
- Today's Close: ₹102
- Return Points: ₹102 - ₹100 = ₹2
- Return %: (₹2 / ₹100) × 100 = 2%

---

## 📈 Cumulative Calculations

### Cumulative Return
```
Cumulative Return(t) = Cumulative Return(t-1) × (1 + Return(t)/100)

Starting Value: 1 (100%)
After Day 1: 1 × (1 + 0.02) = 1.02
After Day 2: 1.02 × (1 - 0.01) = 1.0098
...
Final Cumulative Return = (Final Value - 1) × 100
```

**Example:**
| Day | Return | Cumulative Value | Cumulative Return % |
|-----|--------|------------------|---------------------|
| 1 | +2% | 1.02 | +2.0% |
| 2 | -1% | 1.0098 | +0.98% |
| 3 | +3% | 1.0401 | +4.01% |

### Cumulative Profit (Event Analysis)
```
Cumulative Profit(n) = Σ(Return(i)) for i = 1 to n
```

Simply the running sum of all returns over time.

---

## 📊 Statistics Calculations

### Win Rate (Accuracy)
```
Win Rate = (Number of Positive Returns / Total Number of Returns) × 100
```

**Example:**
- Total trading days: 100
- Positive days: 55
- Win Rate: (55/100) × 100 = 55%

### Average Return
```
Average Return = Σ(Returns) / Total Count
```

### Median Return
```
Median = Middle value when all returns are sorted

For odd count: Median = Value at position (n+1)/2
For even count: Median = (Value at n/2 + Value at (n/2)+1) / 2
```

### Standard Deviation (Volatility)
```
Standard Deviation = √(Σ(Return(i) - Average Return)² / (n - 1))
```

**Example:**
Returns: [2%, -1%, 3%, -2%, 1%]
Average: 0.6%
Variance: [(2-0.6)² + (-1-0.6)² + (3-0.6)² + (-2-0.6)² + (1-0.6)²] / 4
Standard Deviation: √Variance

### Compound Annual Growth Rate (CAGR)
```
CAGR = ((End Value / Start Value)^(1/Number of Years) - 1) × 100
```

**Example:**
- Start Value (5 years ago): ₹100
- End Value (today): ₹161
- CAGR = ((161/100)^(1/5) - 1) × 100 = 10%

### Sharpe Ratio
```
Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation

Where:
- Risk-Free Rate = 0 (or treasury rate, e.g., 4%)
- If Risk-Free Rate = 0:
  Sharpe Ratio = Average Return / Standard Deviation
```

**Example:**
- Average Daily Return: 0.1%
- Standard Deviation: 1.2%
- Sharpe Ratio: 0.1 / 1.2 = 0.083

### Maximum Drawdown (Max DD)
```
Max Drawdown = Maximum Peak-to-Trough Decline

Calculation:
1. Calculate running maximum (peak) at each point
2. Calculate drawdown at each point: (Current - Peak) / Peak × 100
3. Max Drawdown = Minimum (most negative) drawdown
```

**Example:**
| Day | Value | Running Peak | Drawdown |
|-----|-------|--------------|----------|
| 1 | 100 | 100 | 0% |
| 2 | 105 | 105 | 0% |
| 3 | 98 | 105 | -6.67% |
| 4 | 102 | 105 | -2.86% |
| 5 | 95 | 105 | -9.52% | ← Max Drawdown

### Profit Factor
```
Profit Factor = |Sum of Positive Returns| / |Sum of Negative Returns|
```

**Example:**
- Sum of all positive returns: +150%
- Sum of all negative returns: -75%
- Profit Factor: 150 / 75 = 2.0

A Profit Factor > 1 indicates profitability.

---

## 📅 Seasonal Calculations

### Day of Week Statistics
```
For each day (Monday, Tuesday, etc.):

Count = Number of that day in dataset
Avg Return = Σ(Returns on that day) / Count
Win Rate = (Positive returns on that day / Count) × 100
Total Return = Σ(Returns on that day)
```

### Week of Year Statistics
```
For each week (W1, W2, ... W52):

Count = Number of that week across all years
Avg Return = Σ(Returns in that week) / Count
Win Rate = (Positive returns / Count) × 100
```

### Month Statistics
```
For each month (January, February, etc.):

Count = Number of that month in dataset
Avg Return = Σ(Monthly returns) / Count
Win Rate = (Positive months / Count) × 100
```

### Year Statistics
```
For each year:

Count = 1 (one year)
Total Return = (Year End Close - Year Start Close) / Year Start Close × 100
Win Rate = 100% if positive, 0% if negative
```

---

## 🎯 Event Analysis Calculations

### Event Window Returns
```
T-N to T+N Window:

For each occurrence of an event:
  Entry Return = (Entry Price - Previous Close) / Previous Close × 100
  Exit Return = (Exit Price - Entry Price) / Entry Price × 100
  
Where:
  T-10 = 10 days before event
  T0 = Event day
  T+10 = 10 days after event
```

### Average Event Curve
```
For each day in window (T-10 to T+10):
  Avg Return = Σ(Return at that day across all occurrences) / Number of Occurrences
```

### Event Win Rate
```
Event Win Rate = (Positive Event Returns / Total Event Occurrences) × 100
```

### Event Sharpe Ratio
```
Event Sharpe = Average Event Return / Standard Deviation of Event Returns
```

---

## 🔍 Z-Score Calculation

```
Z-Score = (Value - Mean) / Standard Deviation
```

**Interpretation:**
- |Z| < 1: Within 1 standard deviation (typical)
- |Z| < 2: Within 2 standard deviations (unusual)
- |Z| > 2: Outside 2 standard deviations (rare)

**Example:**
- Today's Return: 5%
- Average Return: 0.1%
- Standard Deviation: 1.5%
- Z-Score: (5 - 0.1) / 1.5 = 3.27 (Very unusual!)

---

## 📊 Aggregated Metrics

### Positive/Negative Breakdown
```
Positive Metrics:
- Count = Number of positive returns
- Avg Positive Return = Sum of positive returns / Positive count
- Sum Positive Returns = Sum of all positive returns

Negative Metrics:
- Count = Number of negative returns
- Avg Negative Return = Sum of negative returns / Negative count
- Sum Negative Returns = Sum of all negative returns
```

### Risk-Adjusted Metrics

#### Calmar Ratio
```
Calmar Ratio = CAGR / |Maximum Drawdown|
```

#### Sortino Ratio
```
Sortino Ratio = (Average Return - Risk-Free Rate) / Downside Deviation

Where:
Downside Deviation = √(Σ(Min(Return - Target, 0)²) / n)
```

---

## 🎲 Probability Calculations

### Consecutive Win/Loss Probability
```
Consecutive Wins (Streak):
- Count sequences of consecutive positive returns
- Longest Win Streak = Maximum consecutive wins

Consecutive Losses (Streak):
- Count sequences of consecutive negative returns
- Longest Loss Streak = Maximum consecutive losses
```

### Percentile Rank
```
Percentile = (Number of values below X / Total values) × 100
```

---

## 📈 Superimposed Pattern Calculation

```
For each time unit (week/month) across all years:

1. Group returns by time unit (e.g., all Week 1 returns from all years)
2. Calculate average return for each unit:
   Avg Return = Σ(Returns in unit) / Number of Years
   
3. Calculate cumulative from averages:
   Cumulative(1) = 1 × (1 + AvgReturn(1)/100)
   Cumulative(2) = Cumulative(1) × (1 + AvgReturn(2)/100)
   ...
```

---

## 🔧 Filter Calculations

### Date Range Filtering
```
Include if: Start Date ≤ Record Date ≤ End Date
```

### Year Filtering
```
Include if: Record Year ∈ Selected Years
```

### Month Filtering
```
Include if: Record Month ∈ Selected Months
```

### Day of Week Filtering
```
Include if: DayOfWeek(Record) ∈ Selected Days
```

### Outlier Filtering
```
Remove if: |Z-Score| > Threshold (e.g., 3)

Or:
Remove if: Return < (Q1 - 1.5 × IQR)
Remove if: Return > (Q3 + 1.5 × IQR)

Where:
- Q1 = 25th percentile
- Q3 = 75th percentile
- IQR = Q3 - Q1
```

---

## 🧮 Scenario Analysis Calculations

### Rule-Based Simulation
```
For each rule:
  IF condition matches (e.g., day = Monday)
  THEN execute action (buy/sell/hold)
  
Calculate returns:
  Trade Return = (Exit Price - Entry Price) / Entry Price × 100
  
Cumulative Scenario Return:
  Running sum of all trade returns
```

### Buy & Hold Comparison
```
Buy & Hold Return = (Final Close - Initial Close) / Initial Close × 100

Outperformance = Strategy Return - Buy & Hold Return
```

---

## 📊 Data Quality Metrics

### Data Completeness
```
Completeness = (Actual Records / Expected Records) × 100

Expected Records = Trading Days in Period
```

### Gap Detection
```
Gap = Current Date - Previous Date

If Gap > 3 days (excluding weekends):
  Flag as potential data gap
```

---

## 💡 Interpretation Guidelines

### Win Rate
- **> 60%**: Excellent consistency
- **50-60%**: Good consistency
- **40-50%**: Moderate consistency
- **< 40%**: Low consistency

### Sharpe Ratio
- **> 2.0**: Excellent risk-adjusted returns
- **1.0-2.0**: Good risk-adjusted returns
- **0.5-1.0**: Moderate risk-adjusted returns
- **< 0.5**: Poor risk-adjusted returns

### Maximum Drawdown
- **< 10%**: Low risk
- **10-20%**: Moderate risk
- **20-30%**: High risk
- **> 30%**: Very high risk

### Profit Factor
- **> 2.0**: Excellent profitability
- **1.5-2.0**: Good profitability
- **1.0-1.5**: Marginal profitability
- **< 1.0**: Losing strategy

---

## 📝 Example: Complete Analysis

**Input Data:** 10 days of returns
```
[+2%, -1%, +3%, -2%, +1%, +4%, -3%, +2%, -1%, +5%]
```

**Calculations:**
```
Count: 10
Positive Count: 6
Negative Count: 4

Win Rate: 6/10 × 100 = 60%

Average Return: (2-1+3-2+1+4-3+2-1+5)/10 = 1%

Total Return: Σ(returns) = 10%

Cumulative Return:
  Day 1: 1 × 1.02 = 1.02 → 2%
  Day 2: 1.02 × 0.99 = 1.0098 → 0.98%
  Day 3: 1.0098 × 1.03 = 1.0401 → 4.01%
  ...continuing...
  Final: ~10.5%

Standard Deviation: ~2.45%
Sharpe Ratio: 1/2.45 = 0.41
```

---

## 📚 Related Documentation

- [Software Architecture](./SOFTWARE_ARCHITECTURE.md) - System design
- [API Architecture](./API_ARCHITECTURE.md) - API endpoints
- [Database Design](./DATABASE_DESIGN.md) - Data storage
- [System Design](./SYSTEM_DESIGN.md) - How it works

---

**Note:** All calculations are performed in real-time during API requests. Results are cached for performance but recalculated when filters change.
