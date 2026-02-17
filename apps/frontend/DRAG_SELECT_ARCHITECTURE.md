# 🏗️ Drag-to-Select Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         CumulativeChartWithDragSelect Component           │  │
│  │                                                           │  │
│  │  ┌─────────────────┐      ┌──────────────────────────┐  │  │
│  │  │ Lightweight     │      │  DragSelectOverlay       │  │  │
│  │  │ Charts Instance │◄─────┤  - Selection Region      │  │  │
│  │  │                 │      │  - Boundary Lines        │  │  │
│  │  │                 │      │  - Floating Tooltips     │  │  │
│  │  └─────────────────┘      └──────────────────────────┘  │  │
│  │           ▲                          ▲                   │  │
│  │           │                          │                   │  │
│  │           └──────────┬───────────────┘                   │  │
│  │                      │                                   │  │
│  │              ┌───────▼────────┐                          │  │
│  │              │ useChartDrag   │                          │  │
│  │              │ Select Hook    │                          │  │
│  │              └───────┬────────┘                          │  │
│  └──────────────────────┼───────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   Global State (Zustand Store)     │
        │  ┌──────────────────────────────┐  │
        │  │  chartSelectionStore         │  │
        │  │  - timeRangeSelection        │  │
        │  │  - setTimeRangeSelection     │  │
        │  │  - clearTimeRangeSelection   │  │
        │  │  - getDateRangeForAPI        │  │
        │  └──────────────────────────────┘  │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │      API Integration Layer         │
        │  ┌──────────────────────────────┐  │
        │  │  React Query                 │  │
        │  │  - Watches selection state   │  │
        │  │  - Auto-refetch on change    │  │
        │  │  - Sends date range to API   │  │
        │  └──────────────────────────────┘  │
        └────────────────────────────────────┘
```

## Component Hierarchy

```
DailyPage (or any page)
│
├── CumulativeChartWithDragSelect
│   │
│   ├── Lightweight Charts Instance
│   │   ├── Area Series
│   │   ├── Time Scale
│   │   └── Crosshair
│   │
│   ├── useChartDragSelect Hook
│   │   ├── Mouse Event Handlers
│   │   │   ├── onMouseDown
│   │   │   ├── onMouseMove (throttled)
│   │   │   └── onMouseUp
│   │   │
│   │   ├── Touch Event Handlers
│   │   │   ├── onTouchStart (long-press)
│   │   │   ├── onTouchMove
│   │   │   └── onTouchEnd
│   │   │
│   │   └── Selection State
│   │       ├── startTime
│   │       ├── endTime
│   │       ├── isDragging
│   │       └── isActive
│   │
│   ├── DragSelectOverlay
│   │   ├── Selection Region (semi-transparent)
│   │   ├── Boundary Lines (vertical)
│   │   ├── Start Tooltip
│   │   ├── End Tooltip
│   │   └── Selection Badge
│   │
│   └── Controls
│       ├── Clear Button
│       └── Instruction Hint
│
└── useChartSelectionStore (Zustand)
    ├── Global Selection State
    └── API Helper Functions
```

## Data Flow

### 1. User Interaction Flow

```
User Action → Event Handler → State Update → Visual Feedback → API Call
```

**Detailed Flow:**

```
1. User clicks on chart
   ↓
2. onMouseDown captures start position
   ↓
3. Convert pixel X → timestamp using chart API
   ↓
4. Store start time in local state
   ↓
5. User drags mouse
   ↓
6. onMouseMove (throttled 60fps)
   ↓
7. Convert current pixel X → timestamp
   ↓
8. Update selection state with end time
   ↓
9. DragSelectOverlay renders visual feedback
   ↓
10. User releases mouse
    ↓
11. onMouseUp finalizes selection
    ↓
12. Update global Zustand store
    ↓
13. Trigger onRangeSelected callback
    ↓
14. React Query detects state change
    ↓
15. API refetch with new date range
    ↓
16. Chart updates with filtered data
```

### 2. State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Component State                     │
│  (useChartDragSelect hook)                                   │
│                                                              │
│  selection: {                                                │
│    startTime: Time | null                                    │
│    endTime: Time | null                                      │
│    startValue: number | null                                 │
│    endValue: number | null                                   │
│    isDragging: boolean                                       │
│    isActive: boolean                                         │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ onSelectionComplete
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Global Zustand Store                      │
│  (chartSelectionStore)                                       │
│                                                              │
│  timeRangeSelection: {                                       │
│    startTime: Time | null                                    │
│    endTime: Time | null                                      │
│    startDate: string | null  ← Converted for API            │
│    endDate: string | null    ← Converted for API            │
│    isActive: boolean                                         │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ React Query watches this
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      React Query                             │
│                                                              │
│  queryKey: [                                                 │
│    'chart-data',                                             │
│    timeRangeSelection.startDate,  ← Dependency              │
│    timeRangeSelection.endDate,    ← Dependency              │
│  ]                                                           │
│                                                              │
│  queryFn: () => fetchData(startDate, endDate)               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ API Request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│                                                              │
│  GET /api/analysis/daily?                                    │
│    symbol=NIFTY&                                             │
│    startDate=2024-01-01&                                     │
│    endDate=2024-12-31                                        │
└─────────────────────────────────────────────────────────────┘
```

## Event Handling Architecture

### Mouse Events (Desktop)

```typescript
// Event Flow
┌──────────────┐
│  mousedown   │ → Capture start position
└──────┬───────┘   Store start time
       │           Set isDragging = true
       ▼
┌──────────────┐
│  mousemove   │ → Throttled (16ms)
└──────┬───────┘   Convert pixel to time
       │           Update end time
       │           Render overlay
       ▼
┌──────────────┐
│   mouseup    │ → Finalize selection
└──────┬───────┘   Update global store
       │           Trigger callback
       │           Set isDragging = false
       ▼
┌──────────────┐
│  mouseleave  │ → Cancel if dragging
└──────────────┘   Clean up state
```

### Touch Events (Mobile)

```typescript
// Event Flow
┌──────────────┐
│  touchstart  │ → Start long-press timer (500ms)
└──────┬───────┘   Store touch position
       │
       │ Wait 500ms
       ▼
┌──────────────┐
│ Long Press   │ → Activate selection mode
│   Detected   │   Haptic feedback
└──────┬───────┘   Set isDragging = true
       │
       ▼
┌──────────────┐
│  touchmove   │ → Update selection
└──────┬───────┘   Convert touch to time
       │           Render overlay
       ▼
┌──────────────┐
│   touchend   │ → Finalize selection
└──────┬───────┘   Update global store
       │           Haptic feedback
       │           Set isDragging = false
       ▼
┌──────────────┐
│  touchcancel │ → Cancel selection
└──────────────┘   Clean up state
```

## Coordinate Conversion System

```
┌─────────────────────────────────────────────────────────────┐
│                    Chart Container                           │
│  Width: 1000px                                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Chart Canvas                          │ │
│  │                                                        │ │
│  │  User clicks at X = 250px                             │ │
│  │         │                                              │ │
│  │         ▼                                              │ │
│  │  timeScale.coordinateToTime(250)                      │ │
│  │         │                                              │ │
│  │         ▼                                              │ │
│  │  Returns: 1704067200 (Unix timestamp)                 │ │
│  │         │                                              │ │
│  │         ▼                                              │ │
│  │  new Date(1704067200 * 1000)                          │ │
│  │         │                                              │ │
│  │         ▼                                              │ │
│  │  "2024-01-01" (ISO date string)                       │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Reverse Process (for overlay rendering):
"2024-01-01" → 1704067200 → timeScale.timeToCoordinate() → 250px
```

## Performance Optimization Strategy

### 1. Throttling

```typescript
// Mouse move events throttled to 60fps
const throttleMs = 16; // ~60fps

// Implementation
if (now - lastMoveTime < throttleMs) return;
lastMoveTime = now;
// Process event
```

### 2. RequestAnimationFrame

```typescript
// Visual updates use RAF for smooth rendering
requestAnimationFrame(() => {
  updateOverlayPosition();
  updateTooltips();
});
```

### 3. React Refs

```typescript
// Chart instances stored in refs (no re-renders)
const chartRef = useRef<IChartApi | null>(null);
const seriesRef = useRef<ISeriesApi | null>(null);

// Direct DOM manipulation for overlay
const containerRef = useRef<HTMLDivElement | null>(null);
```

### 4. Memoization

```typescript
// Expensive calculations memoized
const overlayStyle = useMemo(() => {
  return calculateOverlayPosition(selection);
}, [selection.startTime, selection.endTime]);
```

## Security Considerations

### 1. Input Validation

```typescript
// Validate date range before API call
const validation = validateDateRange(startDate, endDate);
if (!validation.valid) {
  console.error(validation.error);
  return;
}
```

### 2. Sanitization

```typescript
// Sanitize user input (dates)
const sanitizedStart = new Date(startDate).toISOString().split('T')[0];
const sanitizedEnd = new Date(endDate).toISOString().split('T')[0];
```

### 3. Rate Limiting

```typescript
// Prevent API spam with debouncing
const debouncedRefetch = debounce(refetch, 500);
```

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Boundaries                          │
│                                                              │
│  Try-Catch Blocks:                                           │
│  ├── Coordinate conversion                                   │
│  ├── Date parsing                                            │
│  ├── API calls                                               │
│  └── Chart operations                                        │
│                                                              │
│  Fallback Behavior:                                          │
│  ├── Invalid selection → Clear and show message             │
│  ├── API error → Show error toast                           │
│  ├── Chart error → Graceful degradation                     │
│  └── Network error → Retry with exponential backoff         │
└─────────────────────────────────────────────────────────────┘
```

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Layers                            │
│                                                              │
│  Unit Tests:                                                 │
│  ├── useChartDragSelect hook                                │
│  ├── chartSelectionStore                                     │
│  ├── chartHelpers utilities                                  │
│  └── Coordinate conversion functions                         │
│                                                              │
│  Integration Tests:                                          │
│  ├── Component + Hook interaction                           │
│  ├── Store + API integration                                │
│  └── Event handlers + State updates                         │
│                                                              │
│  E2E Tests:                                                  │
│  ├── Full user flow (click → drag → release)               │
│  ├── API integration                                         │
│  └── Mobile touch gestures                                  │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Considerations

### 1. Bundle Size Impact

```
New Dependencies: None (uses existing lightweight-charts)
Additional Code: ~1000 lines
Bundle Size Increase: ~15KB (minified + gzipped)
```

### 2. Browser Support

```
Desktop:
✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

Mobile:
✅ iOS Safari 14+
✅ Chrome Android 90+
✅ Samsung Internet 14+
```

### 3. Performance Targets

```
Metrics:
- Initial render: < 100ms
- Selection update: < 16ms (60fps)
- API response: < 500ms (backend dependent)
- Memory usage: < 50MB additional
- CPU usage: < 30% during interaction
```

## Scalability

### Horizontal Scaling

```
Multiple Charts:
- Each chart has independent selection state
- Shared global store for cross-chart features
- No interference between instances
```

### Vertical Scaling

```
Large Datasets:
- Efficient coordinate conversion (O(1))
- Throttled events prevent overload
- Virtual scrolling for data tables
- Lazy loading for historical data
```

## Future Enhancements

```
Phase 2:
├── Keyboard shortcuts (ESC, arrows)
├── Zoom to selection
├── Selection history (undo/redo)
└── Preset range buttons

Phase 3:
├── Multi-range selection
├── Range comparison
├── Save selections to localStorage
└── Share selection via URL

Phase 4:
├── Advanced analytics on selection
├── Export selected data
├── Annotation tools
└── Collaborative selections
```

---

**Architecture designed for performance, maintainability, and scalability** 🚀
