# Interactive Drag-to-Select Time Range Implementation Guide

## Overview
This implementation adds professional drag-to-select functionality to your Lightweight Charts, similar to Seasonax and trading platforms like TradingView.

## Features Implemented

### ✅ Core Functionality
- **Click & Drag Selection**: Users can click and drag directly on the chart to select a date range
- **Visual Feedback**: Semi-transparent highlighted region with vertical boundary lines
- **Floating Tooltips**: Display date and value at both start and end boundaries
- **Fixed Selection**: Selected range persists after mouse release
- **Re-selection**: Users can drag again to create a new selection
- **Clear Button**: Reset button to clear the current selection

### ✅ Technical Features
- **Efficient Performance**: Uses `requestAnimationFrame` throttling (60fps)
- **Pixel-to-Time Conversion**: Accurate mapping using Lightweight Charts API
- **State Management**: Global state with Zustand store
- **Mobile Support**: Long-press + drag for touch devices with haptic feedback
- **Responsive**: Handles window resize and chart updates

### ✅ UX Polish
- **Vertical Boundary Lines**: Professional trading platform style
- **Cursor Changes**: Crosshair → Column-resize during drag
- **Smooth Animations**: Fade-in effects for tooltips
- **Minimum Selection Width**: Prevents accidental tiny selections
- **Touch Gestures**: 500ms long-press to activate on mobile

## File Structure

```
apps/frontend/src/
├── hooks/
│   └── useChartDragSelect.ts          # Core drag selection logic
├── store/
│   └── chartSelectionStore.ts         # Global state management
├── components/
│   └── charts/
│       ├── DragSelectOverlay.tsx      # Visual overlay component
│       ├── CumulativeChartWithDragSelect.tsx  # Enhanced chart component
│       └── index.ts                   # Exports
```

## Quick Start

### 1. Replace Existing Chart Component

In your `apps/frontend/src/app/(dashboard)/dashboard/daily/page.tsx`:

```tsx
// OLD:
import { createChart, ColorType } from 'lightweight-charts';

// NEW:
import { CumulativeChartWithDragSelect } from '@/components/charts';
import { useChartSelectionStore } from '@/store/chartSelectionStore';
```

### 2. Update Chart Rendering

Replace the `CumulativeChart` component usage:

```tsx
// OLD:
<CumulativeChart 
  data={symbolData.chartData} 
  chartScale={chartScale}
/>

// NEW:
<CumulativeChartWithDragSelect
  data={symbolData.chartData}
  chartScale={chartScale}
  onRangeSelected={(startDate, endDate) => {
    console.log('Selected range:', startDate, 'to', endDate);
    // Optionally trigger API refetch with new date range
    // refetch();
  }}
/>
```

### 3. Access Selected Range in Your Component

```tsx
export default function DailyPage() {
  const { timeRangeSelection, getDateRangeForAPI } = useChartSelectionStore();
  
  // Use selected range in API calls
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-analysis', selectedSymbols, startDate, endDate, filters],
    queryFn: async () => {
      // Get selected range if active
      const dateRange = timeRangeSelection.isActive 
        ? getDateRangeForAPI() 
        : { startDate, endDate };
      
      const response = await analysisApi.daily({
        symbol: selectedSymbols[0],
        startDate: dateRange.startDate || startDate,
        endDate: dateRange.endDate || endDate,
        filters,
        chartScale,
      });
      return response.data.data;
    },
    enabled: selectedSymbols.length > 0,
  });
  
  // ... rest of component
}
```

## API Integration

### Automatic API Refetch on Selection

```tsx
import { useEffect } from 'react';
import { useChartSelectionStore } from '@/store/chartSelectionStore';

export default function DailyPage() {
  const { timeRangeSelection } = useChartSelectionStore();
  const { refetch } = useQuery(/* ... */);
  
  // Auto-refetch when selection changes
  useEffect(() => {
    if (timeRangeSelection.isActive) {
      refetch();
    }
  }, [timeRangeSelection.isActive, timeRangeSelection.startDate, timeRangeSelection.endDate]);
  
  return (
    <CumulativeChartWithDragSelect
      data={symbolData.chartData}
      chartScale={chartScale}
      onRangeSelected={(startDate, endDate) => {
        // Optional: Show notification
        console.log('Range selected:', startDate, 'to', endDate);
      }}
    />
  );
}
```

## Customization Options

### Adjust Selection Sensitivity

In `useChartDragSelect` hook:

```tsx
const { selection, clearSelection, containerRef } = useChartDragSelect(
  chartRef,
  seriesRef,
  {
    minSelectionWidth: 20,  // Minimum pixels (default: 10)
    throttleMs: 16,         // Throttle interval (default: 16ms = 60fps)
  }
);
```

### Customize Overlay Colors

In `DragSelectOverlay.tsx`:

```tsx
// Change selection color
backgroundColor: 'rgba(79, 70, 229, 0.15)',  // Indigo with 15% opacity

// Change boundary line color
borderLeft: '2px solid rgba(79, 70, 229, 0.8)',
```

### Modify Tooltip Appearance

In `DragSelectOverlay.tsx`:

```tsx
<div className="bg-white border-2 border-indigo-600 rounded-lg shadow-lg px-3 py-2 text-xs">
  <div className="font-bold text-indigo-600 mb-1">START</div>
  <div className="text-slate-700 font-semibold">{tooltips.start.date}</div>
  <div className="text-slate-600">Value: {tooltips.start.value}</div>
</div>
```

## Mobile Touch Support

The implementation includes full mobile support:

### Touch Gestures
- **Long Press (500ms)**: Activates selection mode
- **Drag**: Updates selection range
- **Release**: Finalizes selection
- **Haptic Feedback**: Vibration on start and end (if supported)

### Testing on Mobile
```tsx
// The hook automatically handles touch events
// No additional configuration needed

// Optional: Adjust long-press duration
// In useChartDragSelect.ts, line ~250:
setTimeout(() => {
  // Start selection
}, 500); // Change this value (milliseconds)
```

## Advanced Usage

### Multiple Charts with Independent Selections

```tsx
// Create separate store instances for different charts
import { create } from 'zustand';

// Chart 1 store
export const useChart1SelectionStore = create(/* ... */);

// Chart 2 store
export const useChart2SelectionStore = create(/* ... */);
```

### Programmatic Selection

```tsx
import { useChartSelectionStore } from '@/store/chartSelectionStore';

function MyComponent() {
  const { setTimeRangeSelection } = useChartSelectionStore();
  
  const selectLastMonth = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    setTimeRangeSelection({
      startTime: Math.floor(startDate.getTime() / 1000),
      endTime: Math.floor(endDate.getTime() / 1000),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      isActive: true,
    });
  };
  
  return <button onClick={selectLastMonth}>Select Last Month</button>;
}
```

### Export Selected Data

```tsx
const handleExportSelectedRange = () => {
  const { timeRangeSelection } = useChartSelectionStore();
  
  if (!timeRangeSelection.isActive) {
    alert('Please select a range first');
    return;
  }
  
  // Filter data by selected range
  const selectedData = symbolData.chartData.filter((d: any) => {
    const date = new Date(d.date).toISOString().split('T')[0];
    return date >= timeRangeSelection.startDate! && 
           date <= timeRangeSelection.endDate!;
  });
  
  // Export as CSV
  const csv = convertToCSV(selectedData);
  downloadCSV(csv, `selected_range_${timeRangeSelection.startDate}_to_${timeRangeSelection.endDate}.csv`);
};
```

## Performance Optimization

### Large Datasets
The implementation is optimized for large time-series data:

- **Throttled Mouse Events**: 60fps update rate
- **Efficient Coordinate Conversion**: Direct Lightweight Charts API usage
- **Minimal Re-renders**: React refs for chart instances
- **RequestAnimationFrame**: Smooth visual updates

### Memory Management
- Automatic cleanup of event listeners
- Chart instance disposal on unmount
- No memory leaks from timers or intervals

## Troubleshooting

### Selection Not Working
1. Ensure chart is fully initialized before dragging
2. Check that `chartRef.current` is not null
3. Verify container has proper dimensions

### Tooltips Not Showing
1. Check z-index values (overlay should be z-10, tooltips z-20)
2. Ensure parent container has `position: relative`
3. Verify tooltip coordinates are within viewport

### Mobile Touch Issues
1. Test long-press duration (default 500ms)
2. Check for conflicting touch event handlers
3. Ensure `touch-action: none` is not blocking events

## Best Practices

### 1. User Feedback
Always provide visual feedback during selection:
- Change cursor style
- Show selection overlay
- Display boundary tooltips

### 2. Clear Selection Option
Always provide an easy way to clear selection:
- Prominent "Clear" button
- Keyboard shortcut (ESC key)
- Click outside selection area

### 3. Validation
Validate selected range before API calls:
```tsx
if (timeRangeSelection.isActive) {
  if (!timeRangeSelection.startDate || !timeRangeSelection.endDate) {
    console.error('Invalid date range');
    return;
  }
  // Proceed with API call
}
```

### 4. Loading States
Show loading indicator when refetching with new range:
```tsx
{isFetching && timeRangeSelection.isActive && (
  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-40">
    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
  </div>
)}
```

## Integration Checklist

- [ ] Install dependencies (already in package.json)
- [ ] Copy hook file: `useChartDragSelect.ts`
- [ ] Copy store file: `chartSelectionStore.ts`
- [ ] Copy component files: `DragSelectOverlay.tsx`, `CumulativeChartWithDragSelect.tsx`
- [ ] Update imports in your page component
- [ ] Replace old chart component with new one
- [ ] Test drag selection on desktop
- [ ] Test long-press selection on mobile
- [ ] Verify API integration
- [ ] Add clear selection button
- [ ] Test with large datasets
- [ ] Add loading states
- [ ] Implement error handling

## Next Steps

1. **Apply to Other Chart Types**: Extend to Superimposed and Yearly Overlay charts
2. **Add Keyboard Shortcuts**: ESC to clear, Arrow keys to adjust selection
3. **Zoom to Selection**: Add button to zoom chart to selected range
4. **Selection History**: Implement undo/redo for selections
5. **Preset Ranges**: Quick buttons for "Last Week", "Last Month", etc.
6. **Compare Ranges**: Select multiple ranges for comparison

## Support

For issues or questions:
1. Check console for error messages
2. Verify all files are in correct locations
3. Ensure TypeScript types are properly imported
4. Test in different browsers and devices

## License

This implementation follows your project's existing license.
