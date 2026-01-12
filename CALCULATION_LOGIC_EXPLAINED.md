# 📊 Calculation Logic Explained - Like You're 10 Years Old!

## 🎯 What Are We Doing?

Imagine you have a diary where you write down the price of your favorite toy (NIFTY) every day. Now you want to:
1. See how the price changed each day
2. Group days into weeks and months
3. Calculate if the price went up or down

---

## 📁 The 5 Files We Create

| File | What It Is | Example |
|------|-----------|---------|
| **1_Daily.csv** | Every single day's data | Monday, Tuesday, Wednesday... |
| **2_MondayWeekly.csv** | Week starting from Monday | Week 1, Week 2, Week 3... |
| **3_ExpiryWeekly.csv** | Week ending on Thursday (expiry day) | Expiry Week 1, 2, 3... |
| **4_Monthly.csv** | Each month's data | January, February, March... |
| **5_Yearly.csv** | Each year's data | 2020, 2021, 2022... |

---

## 🔢 Basic Input Data (What We Start With)

The original CSV file has these columns:
```
Date, Ticker, Open, High, Low, Close, Volume, OpenInterest
```

**Example NIFTY Row:**
```
01-01-2024, NIFTY, 21700, 21850, 21650, 21800, 1000000, 50000
```

| Field | Meaning | Example |
|-------|---------|---------|
| Date | The day | January 1, 2024 |
| Ticker | Stock name | NIFTY |
| Open | Price when market opened | ₹21,700 |
| High | Highest price that day | ₹21,850 |
| Low | Lowest price that day | ₹21,650 |
| Close | Price when market closed | ₹21,800 |
| Volume | How many shares traded | 10,00,000 |
| OpenInterest | Futures contracts open | 50,000 |

---

## 🧮 NEW FIELDS WE CALCULATE (Not in Original CSV!)

### 1️⃣ Return Points & Return Percentage

**What is it?** How much the price changed from yesterday.

**Formula:**
```
Return Points = Today's Close - Yesterday's Close
Return Percentage = (Return Points / Yesterday's Close) × 100
```

**Example:**
```
Yesterday Close: ₹21,800
Today Close:     ₹22,000

Return Points = 22,000 - 21,800 = +200 points
Return Percentage = (200 / 21,800) × 100 = +0.92%
```

**Python Code:**
```python
symbolDailyData['ReturnPoints'] = symbolDailyData['Close'] - symbolDailyData['Close'].shift(1)
symbolDailyData['ReturnPercentage'] = round((symbolDailyData['ReturnPoints'] / symbolDailyData['Close'].shift(1)*100), 2)
```

**JavaScript Code:**
```javascript
record.returnPoints = record.close - prevRecord.close;
record.returnPercentage = Math.round((record.returnPoints / prevRecord.close) * 100 * 100) / 100;
```

---

### 2️⃣ Positive Day/Week/Month/Year

**What is it?** Did the price go UP or DOWN?

**Formula:**
```
Positive = Return Points > 0
```

**Example:**
```
Return Points = +200  →  PositiveDay = TRUE ✅
Return Points = -150  →  PositiveDay = FALSE ❌
```

---

### 3️⃣ Calendar Day vs Trading Day

**Calendar Day:** The actual date number (1st, 2nd, 3rd...)
**Trading Day:** Only counting days when market was OPEN

**Example for January 2024:**
```
Date        | Calendar Day | Trading Day | Why?
------------|--------------|-------------|------------------
Jan 1 (Mon) | 1            | -           | Holiday (no trading)
Jan 2 (Tue) | 2            | 1           | First trading day
Jan 3 (Wed) | 3            | 2           | Second trading day
Jan 4 (Thu) | 4            | 3           | Third trading day
Jan 5 (Fri) | 5            | 4           | Fourth trading day
Jan 6 (Sat) | 6            | -           | Weekend
Jan 7 (Sun) | 7            | -           | Weekend
Jan 8 (Mon) | 8            | 5           | Fifth trading day
```

**Python Code:**
```python
symbolDailyData['CalenderMonthDay'] = symbolDailyData['Date'].dt.day
symbolDailyData['CalenderYearDay'] = symbolDailyData['Date'].dt.dayofyear

# Trading day is calculated by counting actual trading days
for i in range(1, len(symbolDailyData)):
    if (symbolDailyData.loc[i, 'Date'].month != symbolDailyData.loc[i-1, 'Date'].month):
        symbolDailyData.loc[i, 'TradingMonthDay'] = 1  # Reset at new month
    else:
        symbolDailyData.loc[i, 'TradingMonthDay'] = symbolDailyData.loc[i - 1, 'TradingMonthDay'] + 1
```

---

### 4️⃣ Even/Odd Fields

**What is it?** Is the number divisible by 2?

**Formula:**
```
Even = (Number % 2) == 0
```

**Example:**
```
Day 2  → Even = TRUE  (2 ÷ 2 = 1, no remainder)
Day 3  → Even = FALSE (3 ÷ 2 = 1.5, has remainder)
Day 4  → Even = TRUE  (4 ÷ 2 = 2, no remainder)
```

**We calculate Even for:**
- CalendarMonthDay, CalendarYearDay
- TradingMonthDay, TradingYearDay
- WeekNumberMonthly, WeekNumberYearly
- Month, Year

---

### 5️⃣ Week Number (Monthly & Yearly)

**What is it?** Which week of the month/year is this?

**Example:**
```
January 2024:
Week 1: Jan 1-7
Week 2: Jan 8-14
Week 3: Jan 15-21
Week 4: Jan 22-28
Week 5: Jan 29-31

So Jan 15 is in WeekNumberMonthly = 3
```

**Python Code:**
```python
for i in range(1, len(symbolMondayWeeklyData)):
    if (symbolMondayWeeklyData.loc[i, 'Date'].month != symbolMondayWeeklyData.loc[i-1, 'Date'].month):
        symbolMondayWeeklyData.loc[i, 'WeekNumberMonthly'] = 1  # New month starts at week 1
    else:
        symbolMondayWeeklyData.loc[i, 'WeekNumberMonthly'] = symbolMondayWeeklyData.loc[i-1, 'WeekNumberMonthly'] + 1
```

---

## 📅 How Weekly Data is Created

### Monday Weekly (W-SUN resampling)

**What it means:** Group all days from Monday to Sunday into one week.

```
Mon  Tue  Wed  Thu  Fri  Sat  Sun
 ↓    ↓    ↓    ↓    ↓    ↓    ↓
[=========== ONE WEEK ===========]
```

**Aggregation Rules:**
| Field | Rule | Meaning |
|-------|------|---------|
| Open | FIRST | Monday's opening price |
| High | MAX | Highest price of the week |
| Low | MIN | Lowest price of the week |
| Close | LAST | Friday's closing price |
| Volume | SUM | Total volume of all days |
| OpenInterest | LAST | Friday's open interest |

**Python Code:**
```python
symbolMondayWeeklyData = symbolDailyData.resample('W-SUN').apply(columnLogic)
symbolMondayWeeklyData['Date'] = symbolMondayWeeklyData['Date'] - pd.tseries.frequencies.to_offset("6D")
```

**JavaScript Code:**
```javascript
generateMondayWeeklyData() {
    this.symbolDailyData.forEach(record => {
        const monday = this.getMondayOfWeek(record.date);
        // First record of week: use its open
        // All records: update high (max), low (min), close (last), volume (sum)
    });
}
```

---

### Expiry Weekly (W-THU resampling)

**What it means:** Group days ending on Thursday (options expiry day in India).

```
Fri  Sat  Sun  Mon  Tue  Wed  Thu
 ↓    ↓    ↓    ↓    ↓    ↓    ↓
[========= EXPIRY WEEK =========]
                              ↑
                         Expiry Day!
```

**Python Code:**
```python
symbolExpiryWeeklyData = symbolDailyData.resample('W-THU').apply(columnLogic)
```

**Expiry Date Calculation for Daily Records:**
```python
# If today is Friday, expiry is next Thursday (6 days later)
# Otherwise, expiry is this Thursday
symbolDailyData['ExpiryWeeklyDate'] = symbolDailyData['Date'].apply(
    lambda x: (x + pd.tseries.frequencies.to_offset(str(6) + 'D')) if (x.weekday() == 4)
    else (x + pd.tseries.frequencies.to_offset(str(3-x.weekday()) + 'D'))
)
```

**Visual Example:**
```
Today is Monday (weekday=0): Thursday is 3 days away → 3-0 = 3 days
Today is Tuesday (weekday=1): Thursday is 2 days away → 3-1 = 2 days
Today is Wednesday (weekday=2): Thursday is 1 day away → 3-2 = 1 day
Today is Thursday (weekday=3): Thursday is today → 3-3 = 0 days
Today is Friday (weekday=4): Next Thursday is 6 days away → special case!
```

---

## 📊 Complete Field List Comparison

### Daily Table Fields

| Field | In Original CSV? | How Calculated |
|-------|-----------------|----------------|
| date | ✅ Yes | From input |
| ticker | ✅ Yes | From input |
| open | ✅ Yes | From input |
| high | ✅ Yes | From input |
| low | ✅ Yes | From input |
| close | ✅ Yes | From input |
| volume | ✅ Yes | From input |
| openInterest | ✅ Yes | From input |
| weekday | ❌ No | `date.day_name()` |
| calendarMonthDay | ❌ No | `date.day` (1-31) |
| calendarYearDay | ❌ No | `date.dayofyear` (1-366) |
| tradingMonthDay | ❌ No | Count of trading days in month |
| tradingYearDay | ❌ No | Count of trading days in year |
| evenCalendarMonthDay | ❌ No | `calendarMonthDay % 2 == 0` |
| evenCalendarYearDay | ❌ No | `calendarYearDay % 2 == 0` |
| evenTradingMonthDay | ❌ No | `tradingMonthDay % 2 == 0` |
| evenTradingYearDay | ❌ No | `tradingYearDay % 2 == 0` |
| returnPoints | ❌ No | `close - previousClose` |
| returnPercentage | ❌ No | `(returnPoints / previousClose) * 100` |
| positiveDay | ❌ No | `returnPoints > 0` |
| mondayWeeklyDate | ❌ No | Monday of current week |
| mondayWeekNumberMonthly | ❌ No | From Monday weekly data |
| mondayWeekNumberYearly | ❌ No | From Monday weekly data |
| evenMondayWeekNumberMonthly | ❌ No | `mondayWeekNumberMonthly % 2 == 0` |
| evenMondayWeekNumberYearly | ❌ No | `mondayWeekNumberYearly % 2 == 0` |
| mondayWeeklyReturnPoints | ❌ No | From Monday weekly data |
| mondayWeeklyReturnPercentage | ❌ No | From Monday weekly data |
| positiveMondayWeek | ❌ No | `mondayWeeklyReturnPoints > 0` |
| expiryWeeklyDate | ❌ No | Thursday of expiry week |
| expiryWeekNumberMonthly | ❌ No | From Expiry weekly data |
| expiryWeekNumberYearly | ❌ No | From Expiry weekly data |
| evenExpiryWeekNumberMonthly | ❌ No | `expiryWeekNumberMonthly % 2 == 0` |
| evenExpiryWeekNumberYearly | ❌ No | `expiryWeekNumberYearly % 2 == 0` |
| expiryWeeklyReturnPoints | ❌ No | From Expiry weekly data |
| expiryWeeklyReturnPercentage | ❌ No | From Expiry weekly data |
| positiveExpiryWeek | ❌ No | `expiryWeeklyReturnPoints > 0` |
| evenMonth | ❌ No | `month % 2 == 0` |
| monthlyReturnPoints | ❌ No | From Monthly data |
| monthlyReturnPercentage | ❌ No | From Monthly data |
| positiveMonth | ❌ No | `monthlyReturnPoints > 0` |
| evenYear | ❌ No | `year % 2 == 0` |
| yearlyReturnPoints | ❌ No | From Yearly data |
| yearlyReturnPercentage | ❌ No | From Yearly data |
| positiveYear | ❌ No | `yearlyReturnPoints > 0` |

---

## 🔄 Processing Order (Very Important!)

The calculations MUST happen in this order:

```
1. Prepare Daily Data (format dates, add weekday)
        ↓
2. Generate Yearly Data (resample daily → yearly)
        ↓
3. Calculate Yearly Fields (returns, even year)
        ↓
4. Generate Monthly Data (resample daily → monthly)
        ↓
5. Calculate Monthly Fields (returns, link to yearly)
        ↓
6. Generate Monday Weekly Data (resample daily → weekly)
        ↓
7. Calculate Monday Weekly Fields (returns, week numbers, link to monthly/yearly)
        ↓
8. Generate Expiry Weekly Data (resample daily → weekly)
        ↓
9. Calculate Expiry Weekly Fields (returns, week numbers, link to monthly/yearly)
        ↓
10. Calculate Daily Fields (all the extra fields, link to weekly/monthly/yearly)
```

**Why this order?** Because daily data needs to look up values from weekly, monthly, and yearly data!

---

## 🎯 Real NIFTY Example

### Input (Original CSV):
```csv
Date,Ticker,Open,High,Low,Close,Volume,OpenInterest
01-01-2024,NIFTY,21700,21850,21650,21800,1000000,50000
02-01-2024,NIFTY,21800,22000,21750,21950,1200000,52000
03-01-2024,NIFTY,21950,22100,21900,22050,1100000,51000
```

### Output (Daily Table with Calculated Fields):
```csv
Date,Ticker,Open,High,Low,Close,Volume,OpenInterest,Weekday,CalendarMonthDay,TradingMonthDay,ReturnPoints,ReturnPercentage,PositiveDay,...
01-01-2024,NIFTY,21700,21850,21650,21800,1000000,50000,Monday,1,NULL,NULL,NULL,NULL,...
02-01-2024,NIFTY,21800,22000,21750,21950,1200000,52000,Tuesday,2,1,150,0.69,TRUE,...
03-01-2024,NIFTY,21950,22100,21900,22050,1100000,51000,Wednesday,3,2,100,0.46,TRUE,...
```

### Calculation Breakdown for Jan 2:
```
ReturnPoints = 21950 - 21800 = 150
ReturnPercentage = (150 / 21800) × 100 = 0.69%
PositiveDay = 150 > 0 = TRUE
CalendarMonthDay = 2 (2nd day of month)
TradingMonthDay = 1 (first trading day, Jan 1 was holiday)
EvenCalendarMonthDay = 2 % 2 == 0 = TRUE
EvenTradingMonthDay = 1 % 2 == 0 = FALSE
```

---

## 🆚 Python vs JavaScript Comparison

| Feature | Python | JavaScript |
|---------|--------|------------|
| Date Handling | `pd.to_datetime()` | `new Date()` |
| Resampling | `df.resample('W-SUN')` | Manual Map grouping |
| Shift | `df['Close'].shift(1)` | `prevRecord.close` |
| Day of Week | `date.weekday()` (0=Mon) | `date.getDay()` (0=Sun) |
| Round | `round(x, 2)` | `Math.round(x * 100) / 100` |

---

## ✅ Summary

The new software calculates **30+ additional fields** that don't exist in the original CSV:
- Return calculations (points & percentage)
- Positive/Negative indicators
- Calendar vs Trading day numbers
- Even/Odd indicators
- Week numbers (monthly & yearly)
- Cross-timeframe data (daily linking to weekly/monthly/yearly)

All these calculations follow the **exact same logic** in both Python and JavaScript!
