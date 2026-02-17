# Events Tab - Visual Guide

## Navigation
```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar Navigation                                          │
├─────────────────────────────────────────────────────────────┤
│  📅 Daily      (blue)                                        │
│  📊 Weekly     (emerald)                                     │
│  📈 Monthly    (purple)                                      │
│  🥧 Yearly     (orange)                                      │
│  ⚡ Events     (violet) ← NEW!                              │
│  ⚡ Scenario   (yellow)                                      │
│  🎯 Election   (red)                                         │
│  🔍 Scanner    (cyan)                                        │
│  📚 Backtester (pink)                                        │
│  🎯 Phenomena  (teal)                                        │
│  🛒 Basket     (indigo)                                      │
└─────────────────────────────────────────────────────────────┘
```

## Page Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚡ NIFTY                                    📅 2020-01-01 → 2024-12-31  ⚙️ 👤 │
│  Event Analysis Engine                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  TOTAL EVENTS │ WIN RATE  │ AVG RETURN │ SHARPE RATIO │ PROFIT FACTOR       │
│      15       │   66.7%   │   +2.45%   │     1.85     │      2.34           │
│  Union Budget │  10 wins  │ Med: 2.1%  │     Good     │  Max DD: -5.2%      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│                    Average Event Pattern Chart                                │
│                                                                               │
│    ┌─────────────────────────────────────────────────────────┐              │
│    │                                                           │              │
│    │         📈 Cumulative Return Pattern                     │              │
│    │                                                           │              │
│    │    5%  ┌─────────────────────────────────────┐          │              │
│    │        │                                       │          │              │
│    │    0%  ├───────────────┬───────────────────────┤         │              │
│    │        │               │                       │          │              │
│    │   -5%  └───────────────┴───────────────────────┘         │              │
│    │        T-10          T0 (Event)            T+10          │              │
│    │                                                           │              │
│    └─────────────────────────────────────────────────────────┘              │
│                                                                               │
│    [Chart] [Data]                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Filter Panel (Left Sidebar)

```
┌─────────────────────────────────────┐
│  🔍 EVENT FILTERS              ←    │
├─────────────────────────────────────┤
│                                     │
│  ▼ MARKET CONTEXT                   │
│  ┌─────────────────────────────┐   │
│  │ Asset Class                  │   │
│  │ [NIFTY ▼]                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ▼ TIME RANGES                      │
│  ┌─────────────────────────────┐   │
│  │ Start: 2020-01-01            │   │
│  │ End:   2024-12-31            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ▼ EVENT SELECTION                  │
│  ┌─────────────────────────────┐   │
│  │ Country: [INDIA ▼]           │   │
│  │ Category: [BUDGET ▼]         │   │
│  │ Event: [UNION BUDGET DAY ▼]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ▶ EVENT WINDOW                     │
│  ┌─────────────────────────────┐   │
│  │ Days Before: 10              │   │
│  │ ├─────●─────────────────┤   │   │
│  │ Days After: 10               │   │
│  │ ├─────●─────────────────┤   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ▶ TRADE CONFIGURATION              │
│  ┌─────────────────────────────┐   │
│  │ Entry: [T-1 Close ▼]         │   │
│  │ Exit: T+10_CLOSE             │   │
│  │ Min Occurrences: 3           │   │
│  │ ├─────●─────────────────┤   │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [▶ ANALYZE EVENTS]                 │
└─────────────────────────────────────┘
```

## Data Table View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Event Date    │ Entry Price │ Exit Price │ Return % │ MFE %  │ MAE %   │
├──────────────────────────────────────────────────────────────────────────┤
│  2020-02-01    │   12,250.00 │  12,550.00 │   +2.45% │ +3.20% │ -0.80%  │
│  2021-02-01    │   14,500.00 │  14,850.00 │   +2.41% │ +2.90% │ -1.20%  │
│  2022-02-01    │   17,200.00 │  17,100.00 │   -0.58% │ +1.50% │ -2.30%  │
│  2023-02-01    │   17,800.00 │  18,400.00 │   +3.37% │ +4.10% │ -0.50%  │
│  2024-02-01    │   21,500.00 │  22,100.00 │   +2.79% │ +3.50% │ -0.90%  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Color Theme

The Events tab uses a **violet** color scheme:
- Primary: `violet-600` (#7C3AED)
- Background: `violet-50` (#F5F3FF)
- Hover: `violet-700` (#6D28D9)
- Border: `violet-200` (#DDD6FE)

## Key Features

### 1. Event Selection
- **Country Filter**: Select market (INDIA, USA, UK)
- **Category Filter**: Filter by event type (BUDGET, ELECTION, FESTIVAL, HOLIDAY, NATIONAL_HOLIDAY)
- **Event Name**: Select specific event (e.g., "UNION BUDGET DAY", "DIWALI", "FED MEETING")

### 2. Event Window Configuration
- **Days Before**: How many trading days before the event to analyze (1-30)
- **Days After**: How many trading days after the event to analyze (1-30)
- Creates a relative timeline: T-10, T-9, ..., T-1, T0 (event), T+1, ..., T+10

### 3. Trade Configuration
- **Entry Point**: When to enter the trade
  - T-1_CLOSE: Close price day before event
  - T0_OPEN: Open price on event day
  - T0_CLOSE: Close price on event day
- **Exit Point**: Custom exit (e.g., T+10_CLOSE)
- **Min Occurrences**: Minimum number of event occurrences required for analysis

### 4. Statistics Display
Five key metrics shown at the top:
1. **Total Events**: Number of event occurrences found
2. **Win Rate**: Percentage of profitable trades
3. **Average Return**: Mean return across all events
4. **Sharpe Ratio**: Risk-adjusted return metric
5. **Profit Factor**: Gross profit / gross loss ratio

### 5. Chart Visualization
- **Average Event Curve**: Shows the average price movement pattern around events
- **Drag-to-Select**: Select specific time ranges within the event window
- **Interactive Tooltips**: Hover to see exact values
- **Zoom & Pan**: Explore the data in detail

### 6. Data Table
- **Event Date**: When the event occurred
- **Entry/Exit Prices**: Trade execution prices
- **Return %**: Profit/loss percentage
- **MFE (Max Favorable Excursion)**: Best price reached during trade
- **MAE (Max Adverse Excursion)**: Worst price reached during trade

## Use Cases

### 1. Budget Day Analysis
```
Event: UNION BUDGET DAY
Window: T-5 to T+5
Entry: T-1 Close
Exit: T+5 Close
Result: Analyze if buying before budget day is profitable
```

### 2. Festival Trading
```
Event: DIWALI
Window: T-10 to T+10
Entry: T-1 Close
Exit: T+10 Close
Result: Discover Diwali rally patterns
```

### 3. Election Impact
```
Category: ELECTION
Window: T-20 to T+20
Entry: T-1 Close
Exit: T+20 Close
Result: Study market behavior around elections
```

### 4. FED Meeting Analysis
```
Event: FED MEETING
Country: USA
Window: T-3 to T+3
Entry: T0 Open
Exit: T+3 Close
Result: Analyze immediate market reaction to FED decisions
```

## Empty States

### No Event Selected
```
┌─────────────────────────────────┐
│                                 │
│         📅                      │
│                                 │
│    Select an Event              │
│                                 │
│  Choose an event or category    │
│  to analyze                     │
│                                 │
└─────────────────────────────────┘
```

### Loading State
```
┌─────────────────────────────────┐
│                                 │
│         ⟳                       │
│                                 │
│    Analyzing events...          │
│                                 │
└─────────────────────────────────┘
```

## Integration with Existing Features

### Drag-to-Select Time Range
- Works seamlessly with the event chart
- Select specific days within the event window
- Refines analysis to focus on selected period
- Shows selection indicator in header: `📅 T-5 → T+2 ✕`

### Global State Management
- Uses `useAnalysisStore` for symbol and date selection
- Uses `useChartSelectionStore` for drag-to-select state
- Maintains consistency with other analysis tabs

### Responsive Design
- Resizable filter panel (200px - 500px)
- Collapsible filter sections
- Mobile-friendly (future enhancement)

## API Endpoints Used

1. `GET /api/analysis/events/categories` - Fetch event categories
2. `GET /api/analysis/events/names` - Fetch event names (filtered)
3. `POST /api/analysis/events` - Perform event analysis
4. `GET /api/analysis/events/occurrences/:name` - Get event occurrences
5. `POST /api/analysis/events/compare` - Compare event vs non-event days

## Next Steps

Users can now:
1. Navigate to the Events tab (⚡ icon)
2. Select a symbol and date range
3. Choose an event or category
4. Configure the event window and trade parameters
5. Click "ANALYZE EVENTS" to see results
6. View statistics, charts, and detailed data
7. Export results (future enhancement)
