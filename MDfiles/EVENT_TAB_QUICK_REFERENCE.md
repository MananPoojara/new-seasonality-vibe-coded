# Events Tab - Quick Reference Card

## 🎯 Quick Access
- **Icon**: ⚡ (Zap)
- **Color**: Violet
- **Route**: `/dashboard/events`
- **Position**: Between Yearly and Scenario tabs

## 📋 Quick Setup

### 1. Basic Analysis (3 steps)
```
1. Select Symbol: NIFTY
2. Select Event: UNION BUDGET DAY
3. Click: ANALYZE EVENTS
```

### 2. Custom Window
```
1. Select Event
2. Adjust sliders:
   - Days Before: 10
   - Days After: 10
3. Click: ANALYZE EVENTS
```

### 3. Trade Configuration
```
Entry Point:
  - T-1_CLOSE (day before)
  - T0_OPEN (event day open)
  - T0_CLOSE (event day close)

Exit Point:
  - T+N_CLOSE (e.g., T+10_CLOSE)
```

## 📊 Statistics Explained

| Metric | What It Means | Good Value |
|--------|---------------|------------|
| **Total Events** | Number of occurrences | More is better (>10) |
| **Win Rate** | % profitable trades | >50% |
| **Avg Return** | Mean profit/loss | Positive |
| **Sharpe Ratio** | Risk-adjusted return | >1.0 (>2.0 excellent) |
| **Profit Factor** | Gross profit / loss | >1.0 (>2.0 excellent) |

## 🎨 Color Coding

| Color | Meaning |
|-------|---------|
| 🟢 Green | Positive returns, wins |
| 🔴 Red | Negative returns, losses |
| 🟣 Violet | Active/selected state |
| ⚪ Gray | Neutral/inactive |

## 🔍 Event Categories

| Category | Examples |
|----------|----------|
| **BUDGET** | Union Budget, State Budget |
| **ELECTION** | General Election, State Election |
| **FESTIVAL** | Diwali, Holi, Christmas |
| **HOLIDAY** | Independence Day, Republic Day |
| **NATIONAL_HOLIDAY** | Gandhi Jayanti, etc. |

## 📈 Chart Features

| Feature | How to Use |
|---------|------------|
| **Drag-to-Select** | Click and drag on chart |
| **Zoom** | Mouse wheel or pinch |
| **Pan** | Disabled during drag-select |
| **Tooltip** | Hover over data points |
| **Clear Selection** | Click ✕ in header |

## 🔧 Common Workflows

### Workflow 1: Find Best Entry Point
```
1. Select event: UNION BUDGET DAY
2. Set window: T-5 to T+5
3. Try different entries:
   - T-1_CLOSE
   - T0_OPEN
   - T0_CLOSE
4. Compare win rates
```

### Workflow 2: Optimize Exit Timing
```
1. Select event
2. Set entry: T-1_CLOSE
3. Try different exits:
   - T+5_CLOSE
   - T+10_CLOSE
   - T+15_CLOSE
4. Compare returns
```

### Workflow 3: Category Analysis
```
1. Select category: BUDGET
2. Leave event name empty
3. Analyze all budget events together
4. View aggregate statistics
```

## 🎯 Pro Tips

1. **Minimum Occurrences**: Set to 5+ for reliable statistics
2. **Window Size**: Start with T-10 to T+10, adjust based on results
3. **Entry Point**: T-1_CLOSE avoids gap risk on event day
4. **Exit Point**: Match your typical holding period
5. **Data Tab**: Check individual occurrences for outliers
6. **MFE/MAE**: Use to set stop-loss and take-profit levels

## ⚠️ Important Notes

- Requires backend Event Analysis Service running
- Needs `special_days` table populated
- Minimum 3 occurrences recommended
- Non-trading days automatically skipped
- Results based on historical data only

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No events showing | Check `special_days` table has data |
| Empty chart | Select event and click ANALYZE EVENTS |
| API error | Verify backend is running |
| No categories | Check database connection |
| Slow loading | Reduce date range or window size |

## 📱 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Clear drag selection |
| `Ctrl/Cmd + Z` | Zoom reset (future) |
| `Tab` | Navigate filters |
| `Enter` | Apply filters |

## 🔗 Related Features

- **Drag-to-Select**: Works on all charts
- **Date Range**: Global filter affects all tabs
- **Symbol Selector**: Shared across tabs
- **Chart Scale**: Linear/Log toggle (future)

## 📞 Quick Help

**Question**: How do I analyze Diwali trading?
**Answer**: 
```
1. Country: INDIA
2. Category: FESTIVAL
3. Event: DIWALI
4. Window: T-10 to T+10
5. Entry: T-1_CLOSE
6. Click: ANALYZE EVENTS
```

**Question**: What's a good Sharpe Ratio?
**Answer**:
- < 0: Poor (losing strategy)
- 0-1: Fair (risky)
- 1-2: Good (acceptable risk)
- > 2: Excellent (low risk)

**Question**: How to find best events?
**Answer**:
1. Select category (e.g., BUDGET)
2. Leave event name empty
3. Analyze all events
4. Sort by win rate in data table
5. Focus on high win rate events

## 🎓 Learning Path

1. **Beginner**: Start with well-known events (Budget, Diwali)
2. **Intermediate**: Experiment with different windows and entries
3. **Advanced**: Compare multiple events, optimize parameters
4. **Expert**: Build trading strategies based on patterns

---

**Need more help?** Check the full documentation:
- `EVENT_TAB_IMPLEMENTATION.md` - Technical details
- `EVENT_TAB_VISUAL_GUIDE.md` - Visual examples
- `EVENT_TAB_COMPLETE_SUMMARY.md` - Complete overview
