# 🚀 Drag-to-Select Quick Reference Card

## 📦 Installation (Already Done)
```bash
# Dependencies already in package.json
# lightweight-charts ✅
# zustand ✅
# @tanstack/react-query ✅
```

## 🎯 3-Step Integration

### 1️⃣ Import
```tsx
import { CumulativeChartWithDragSelect } from '@/components/charts';
import { useChartSelectionStore } from '@/store/chartSelectionStore';
```

### 2️⃣ Replace Chart
```tsx
<CumulativeChartWithDragSelect
  data={chartData}
  chartScale="linear"
  onRangeSelected={(start, end) => console.log(start, end)}
/>
```

### 3️⃣ Use Selection
```tsx
const { timeRangeSelection } = useChartSelectionStore();
// Access: timeRangeSelection.startDate, timeRangeSelection.endDate
```

## 🔑 Key APIs

### Hook: useChartDragSelect
```tsx
const { selection, clearSelection, containerRef, isSelecting } = 
  useChartDragSelect(chartRef, seriesRef, {
    minSelectionWidth: 20,
    throttleMs: 16,
    onSelectionComplete: (sel) => {},
    onSelectionChange: (sel) => {},
  });
```

### Store: useChartSelectionStore
```tsx
const {
  timeRangeSelection,      // Current selection
  setTimeRangeSelection,   // Set selection
  clearTimeRangeSelection, // Clear selection
  getDateRangeForAPI,      // Get {startDate, endDate}
} = useChartSelectionStore();
```

### Component: CumulativeChartWithDragSelect
```tsx
<CumulativeChartWithDragSelect
  data={chartData}              // Required: array of chart data
  chartScale="linear"           // Optional: 'linear' | 'log'
  onRangeSelected={(s, e) => {}} // Optional: callback
/>
```

## 📊 Data Structures

### Selection State
```typescript
{
  startTime: Time | null,      // Lightweight Charts Time
  endTime: Time | null,        // Lightweight Charts Time
  startDate: string | null,    // ISO date: "2024-01-01"
  endDate: string | null,      // ISO date: "2024-12-31"
  isActive: boolean,           // Is selection active?
}
```

### Chart Data Format
```typescript
{
  date: string,           // ISO date: "2024-01-01"
  cumulative: number,     // Cumulative return value
  returnPercentage: number, // Daily return %
}
```

## 🎨 Customization

### Colors
```tsx
// In DragSelectOverlay.tsx
backgroundColor: 'rgba(79, 70, 229, 0.15)',  // Selection overlay
borderColor: 'rgba(79, 70, 229, 0.8)',       // Boundary lines
```

### Sensitivity
```tsx
minSelectionWidth: 20,  // Minimum pixels to drag
throttleMs: 16,         // Update frequency (16ms = 60fps)
```

### Mobile
```tsx
// In useChartDragSelect.ts, line ~250
setTimeout(() => { /* activate */ }, 500); // Long-press duration
```

## 🔧 Common Patterns

### API Integration
```tsx
const { timeRangeSelection, getDateRangeForAPI } = useChartSelectionStore();

const { data } = useQuery({
  queryKey: ['data', timeRangeSelection.startDate, timeRangeSelection.endDate],
  queryFn: async () => {
    const range = timeRangeSelection.isActive 
      ? getDateRangeForAPI() 
      : { startDate: defaultStart, endDate: defaultEnd };
    return fetchData(range.startDate, range.endDate);
  },
});
```

### Clear on Filter Change
```tsx
const { clearTimeRangeSelection } = useChartSelectionStore();

useEffect(() => {
  clearTimeRangeSelection();
}, [filters, symbol, dateRange]);
```

### Export Selected Data
```tsx
import { filterDataByDateRange, exportToCSV } from '@/utils/chartHelpers';

const handleExport = () => {
  const filtered = filterDataByDateRange(
    data, 
    timeRangeSelection.startDate, 
    timeRangeSelection.endDate
  );
  exportToCSV(filtered, 'selected_data.csv');
};
```

### Preset Ranges
```tsx
import { getPresetDateRanges } from '@/utils/chartHelpers';

const presets = getPresetDateRanges();
// presets.lastWeek, presets.lastMonth, etc.

const selectLastMonth = () => {
  setTimeRangeSelection({
    startTime: dateToTime(new Date(presets.lastMonth.startDate)),
    endTime: dateToTime(new Date(presets.lastMonth.endDate)),
    startDate: presets.lastMonth.startDate,
    endDate: presets.lastMonth.endDate,
    isActive: true,
  });
};
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Selection not working | Check `chartRef.current` is not null |
| Tooltips cut off | Add padding to chart container |
| Mobile touch conflicts | Already handled with long-press |
| Performance lag | Increase `throttleMs` to 32 |
| State not updating | Check React Query `queryKey` includes selection |

## 📱 User Interactions

### Desktop
- **Click + Drag**: Create selection
- **Drag left/right**: Works both ways
- **Click Clear**: Remove selection
- **Hover**: Crosshair cursor

### Mobile
- **Long Press (500ms)**: Activate selection
- **Drag**: Update selection
- **Release**: Finalize
- **Tap Clear**: Remove selection

## ⚡ Performance Tips

```tsx
// 1. Throttle mouse events
throttleMs: 16  // 60fps (default)

// 2. Use refs for chart instances
const chartRef = useRef<IChartApi | null>(null);

// 3. Memoize expensive calculations
const stats = useMemo(() => calculateStats(data), [data]);

// 4. Debounce API calls
const debouncedRefetch = debounce(refetch, 500);
```

## 🎯 File Locations

```
apps/frontend/src/
├── hooks/useChartDragSelect.ts
├── store/chartSelectionStore.ts
├── components/charts/
│   ├── DragSelectOverlay.tsx
│   ├── CumulativeChartWithDragSelect.tsx
│   └── index.ts
└── utils/chartHelpers.ts
```

## 📚 Documentation Files

```
apps/frontend/
├── DRAG_SELECT_IMPLEMENTATION_GUIDE.md  ← Start here
├── DRAG_SELECT_INTEGRATION_EXAMPLE.tsx  ← Working example
├── DRAG_SELECT_README.md                ← Feature overview
├── DRAG_SELECT_TESTING_GUIDE.md         ← Test checklist
├── DRAG_SELECT_ARCHITECTURE.md          ← System design
├── DRAG_SELECT_COMPLETE_SUMMARY.md      ← Full summary
└── DRAG_SELECT_QUICK_REFERENCE.md       ← This file
```

## 🔗 Useful Utilities

```tsx
import {
  timeToDate,              // Time → Date
  dateToTime,              // Date → Time
  formatDate,              // Date → "01 Jan 2024"
  filterDataByDateRange,   // Filter array by dates
  calculateRangeStatistics,// Get stats for range
  validateDateRange,       // Check if range valid
  exportToCSV,             // Export to CSV
} from '@/utils/chartHelpers';
```

## ✅ Quick Checklist

- [ ] Files copied to correct locations
- [ ] Imports added to page component
- [ ] Old chart replaced with new component
- [ ] Selection state accessed in API calls
- [ ] Clear button added to UI
- [ ] Tested on desktop (drag works)
- [ ] Tested on mobile (long-press works)
- [ ] Performance acceptable (60fps)
- [ ] No console errors
- [ ] Ready for production

## 🎨 Color Palette

```css
/* Selection Overlay */
background: rgba(79, 70, 229, 0.15);  /* Indigo 15% */

/* Boundary Lines */
border: 2px solid rgba(79, 70, 229, 0.8);  /* Indigo 80% */

/* Tooltips */
background: #ffffff;
border: 2px solid #4F46E5;  /* Indigo 600 */
color: #4F46E5;

/* Clear Button */
background: #ffffff;
border: 1px solid #FCA5A5;  /* Red 200 */
color: #DC2626;  /* Red 600 */
hover: #FEE2E2;  /* Red 50 */
```

## 📊 Example Usage

```tsx
import { CumulativeChartWithDragSelect } from '@/components/charts';
import { useChartSelectionStore } from '@/store/chartSelectionStore';
import { useQuery } from '@tanstack/react-query';

export default function MyChart() {
  const { timeRangeSelection, clearTimeRangeSelection } = 
    useChartSelectionStore();

  const { data, refetch } = useQuery({
    queryKey: ['chart', timeRangeSelection.startDate, timeRangeSelection.endDate],
    queryFn: () => fetchData(
      timeRangeSelection.startDate || '2020-01-01',
      timeRangeSelection.endDate || '2024-12-31'
    ),
  });

  return (
    <div className="relative h-full">
      {timeRangeSelection.isActive && (
        <button onClick={clearTimeRangeSelection}>
          Clear Selection
        </button>
      )}
      
      <CumulativeChartWithDragSelect
        data={data}
        chartScale="linear"
        onRangeSelected={(start, end) => {
          console.log('Selected:', start, 'to', end);
          refetch();
        }}
      />
    </div>
  );
}
```

## 🚀 Next Steps

1. Read `DRAG_SELECT_IMPLEMENTATION_GUIDE.md`
2. Copy example from `DRAG_SELECT_INTEGRATION_EXAMPLE.tsx`
3. Test with `DRAG_SELECT_TESTING_GUIDE.md`
4. Deploy to production

---

**⚡ Quick Start Time: 15 minutes**  
**📚 Full Documentation: 6 files**  
**✅ Production Ready: Yes**

**Need help?** Check the implementation guide or architecture doc.
