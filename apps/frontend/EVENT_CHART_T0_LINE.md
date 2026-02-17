# Event Chart T0 Vertical Line - Seasonax Style

## ✅ Implemented Features

### 1. T0 Vertical Line
- **Red vertical line** at T0 (event day) - exactly like Seasonax
- **"T0" label** at the top of the line
- Line spans full height of chart
- Color: `#DC2626` (red)

### 2. Custom X-Axis Labels
- Shows relative days: `-10, -9, ..., -1, 0, +1, ..., +9, +10`
- T0 is shown as `0` (event day)
- Negative days before event: `-10, -9, -8...`
- Positive days after event: `+1, +2, +3...`

### 3. Visual Design
```
Before Event  │  Event Day  │  After Event
-10 to -1     │     T0      │   +1 to +10
              │     ↓       │
              │  RED LINE   │
```

## 🎨 How It Works

### Chart Detection
```typescript
// Automatically detects event data
const isEventData = data[0]?.relativeDay !== undefined;
```

### X-Axis Formatting
```typescript
tickMarkFormatter: (time) => {
  const relDay = chartData[index].relativeDay;
  if (relDay === 0) return '0';      // T0
  return relDay > 0 ? `+${relDay}` : `${relDay}`;  // +1, -1, etc.
}
```

### T0 Vertical Line
- Canvas overlay positioned absolutely
- Drawn using 2D context
- Updates on zoom/scroll
- Z-index: 10 (above chart, below tooltips)

## 📊 Example Output

```
Chart X-Axis:
-10  -9  -8  -7  -6  -5  -4  -3  -2  -1  0  +1  +2  +3  +4  +5  +6  +7  +8  +9  +10
                                            ↑
                                         T0 LINE
```

## 🔧 Technical Details

### Canvas Overlay
- Position: `absolute`
- Pointer events: `none` (doesn't block interactions)
- Size: Matches chart container
- Redraws on:
  - Initial render
  - Zoom
  - Scroll
  - Window resize

### Line Drawing
```javascript
ctx.strokeStyle = '#DC2626';  // Red
ctx.lineWidth = 2;
ctx.moveTo(x, 0);             // Top
ctx.lineTo(x, height);        // Bottom
ctx.stroke();
```

### Label Drawing
```javascript
ctx.fillStyle = '#DC2626';
ctx.font = 'bold 12px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('T0', x, 15);
```

## 🎯 Usage

No changes needed! The chart automatically:
1. Detects event data (has `relativeDay` field)
2. Formats x-axis with relative days
3. Draws T0 vertical line
4. Shows T0 label

## 🖼️ Visual Comparison

### Before (Regular Chart)
```
X-axis: Jan 2024, Feb 2024, Mar 2024...
No vertical line
```

### After (Event Chart)
```
X-axis: -10, -9, ..., 0, +1, ..., +10
Red vertical line at 0 (T0)
"T0" label at top
```

## 📝 Files Modified

- `apps/frontend/src/components/charts/CumulativeChartWithDragSelect.tsx`
  - Added x-axis formatter for relative days
  - Added canvas overlay for T0 vertical line
  - Added T0 label rendering

## ✨ Result

The event chart now looks exactly like Seasonax:
- ✅ Clear T0 vertical line (red)
- ✅ Relative day labels on x-axis
- ✅ Before/After event visualization
- ✅ Professional appearance

## 🚀 Next Steps (Optional Enhancements)

1. **Shaded regions** - Light blue before T0, light green after T0
2. **Multiple event lines** - If analyzing multiple event types
3. **Configurable colors** - Allow customization
4. **Event name label** - Show event name near T0 line
5. **Statistics overlay** - Show win rate, avg return near T0

---

**Status**: ✅ Complete
**Matches Seasonax**: ✅ Yes
**Works with drag-to-select**: ✅ Yes
