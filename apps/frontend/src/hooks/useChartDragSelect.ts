import { useRef, useState, useCallback, useEffect } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export interface DragSelection {
  startTime: Time | null;
  endTime: Time | null;
  startValue: number | null;
  endValue: number | null;
  isActive: boolean;
  isDragging: boolean;
}

export interface UseDragSelectOptions {
  onSelectionComplete?: (selection: DragSelection) => void;
  onSelectionChange?: (selection: DragSelection) => void;
  minSelectionWidth?: number; // Minimum pixels to consider as selection
  throttleMs?: number; // Throttle mouse move events
}

export function useChartDragSelect(
  chartRef: React.MutableRefObject<IChartApi | null>,
  seriesRef: React.MutableRefObject<ISeriesApi<any> | null>,
  options: UseDragSelectOptions = {}
) {
  const {
    onSelectionComplete,
    onSelectionChange,
    minSelectionWidth = 10,
    throttleMs = 16, // ~60fps
  } = options;

  const [selection, setSelection] = useState<DragSelection>({
    startTime: null,
    endTime: null,
    startValue: null,
    endValue: null,
    isActive: false,
    isDragging: false,
  });

  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startTime: null as Time | null,
    startValue: null as number | null,
    lastMoveTime: 0,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Convert pixel X position to chart time
  const pixelToTime = useCallback((x: number): Time | null => {
    if (!chartRef.current) return null;
    
    try {
      const timeScale = chartRef.current.timeScale();
      const coordinate = timeScale.coordinateToTime(x);
      return coordinate ?? null;
    } catch (error) {
      console.error('Error converting pixel to time:', error);
      return null;
    }
  }, [chartRef]);

  // Get value at specific time from series
  const getValueAtTime = useCallback((time: Time): number | null => {
    if (!seriesRef.current) return null;
    
    try {
      const data = (seriesRef.current as any).data?.();
      if (!data) return null;
      
      // Find closest data point
      const dataPoint = data.find((d: any) => d.time === time);
      return dataPoint?.value ?? null;
    } catch (error) {
      console.error('Error getting value at time:', error);
      return null;
    }
  }, [seriesRef]);

  // Handle mouse down - start selection
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!chartRef.current || event.button !== 0) return; // Only left click
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    const time = pixelToTime(x);
    if (!time) return;

    const value = getValueAtTime(time);

    dragStateRef.current = {
      isDragging: true,
      startX: x,
      startTime: time,
      startValue: value,
      lastMoveTime: Date.now(),
    };

    setSelection({
      startTime: time,
      endTime: time,
      startValue: value,
      endValue: value,
      isActive: false,
      isDragging: true,
    });

    // Prevent text selection and default drag behavior
    event.preventDefault();
    event.stopPropagation();
  }, [chartRef, pixelToTime, getValueAtTime]);

  // Handle mouse move - update selection
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragStateRef.current.isDragging || !chartRef.current) return;

    // Throttle mouse move events
    const now = Date.now();
    if (now - dragStateRef.current.lastMoveTime < throttleMs) return;
    dragStateRef.current.lastMoveTime = now;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Check minimum selection width
    const deltaX = Math.abs(x - dragStateRef.current.startX);
    if (deltaX < minSelectionWidth) return;

    const time = pixelToTime(x);
    if (!time) return;

    const value = getValueAtTime(time);

    const newSelection: DragSelection = {
      startTime: dragStateRef.current.startTime,
      endTime: time,
      startValue: dragStateRef.current.startValue,
      endValue: value,
      isActive: false,
      isDragging: true,
    };

    setSelection(newSelection);
    onSelectionChange?.(newSelection);
    
    // Prevent default behavior during drag
    event.preventDefault();
    event.stopPropagation();
  }, [chartRef, pixelToTime, getValueAtTime, minSelectionWidth, throttleMs, onSelectionChange]);

  // Handle mouse up - finalize selection
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const deltaX = Math.abs(x - dragStateRef.current.startX);

    // Only create selection if dragged enough
    if (deltaX >= minSelectionWidth) {
      const time = pixelToTime(x);
      if (time) {
        const value = getValueAtTime(time);
        
        // Ensure start is before end
        const startTime = dragStateRef.current.startTime!;
        const endTime = time;
        const [orderedStart, orderedEnd] = startTime < endTime 
          ? [startTime, endTime] 
          : [endTime, startTime];

        const finalSelection: DragSelection = {
          startTime: orderedStart,
          endTime: orderedEnd,
          startValue: dragStateRef.current.startValue,
          endValue: value,
          isActive: true,
          isDragging: false,
        };

        setSelection(finalSelection);
        onSelectionComplete?.(finalSelection);
      }
    } else {
      // Clear selection if not dragged enough
      clearSelection();
    }

    dragStateRef.current.isDragging = false;
  }, [pixelToTime, getValueAtTime, minSelectionWidth, onSelectionComplete]);

  // Handle mouse leave - cancel dragging
  const handleMouseLeave = useCallback(() => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      setSelection(prev => ({
        ...prev,
        isDragging: false,
      }));
    }
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection({
      startTime: null,
      endTime: null,
      startValue: null,
      endValue: null,
      isActive: false,
      isDragging: false,
    });
    dragStateRef.current.isDragging = false;
  }, []);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  // Touch support for mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartTime: Time | null = null;
    let longPressTimer: NodeJS.Timeout | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (!chartRef.current || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      
      touchStartX = x;
      touchStartTime = pixelToTime(x);

      // Long press to start selection
      longPressTimer = setTimeout(() => {
        if (touchStartTime) {
          const value = getValueAtTime(touchStartTime);
          dragStateRef.current = {
            isDragging: true,
            startX: x,
            startTime: touchStartTime,
            startValue: value,
            lastMoveTime: Date.now(),
          };

          setSelection({
            startTime: touchStartTime,
            endTime: touchStartTime,
            startValue: value,
            endValue: value,
            isActive: false,
            isDragging: true,
          });

          // Haptic feedback if available
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
        }
      }, 500); // 500ms long press

      event.preventDefault();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!dragStateRef.current.isDragging || event.touches.length !== 1) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }

      const touch = event.touches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;

      const time = pixelToTime(x);
      if (!time) return;

      const value = getValueAtTime(time);

      setSelection({
        startTime: dragStateRef.current.startTime,
        endTime: time,
        startValue: dragStateRef.current.startValue,
        endValue: value,
        isActive: false,
        isDragging: true,
      });

      event.preventDefault();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (!dragStateRef.current.isDragging) return;

      const touch = event.changedTouches[0];
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const deltaX = Math.abs(x - dragStateRef.current.startX);

      if (deltaX >= minSelectionWidth) {
        const time = pixelToTime(x);
        if (time && dragStateRef.current.startTime) {
          const value = getValueAtTime(time);
          
          const [orderedStart, orderedEnd] = dragStateRef.current.startTime < time 
            ? [dragStateRef.current.startTime, time] 
            : [time, dragStateRef.current.startTime];

          const finalSelection: DragSelection = {
            startTime: orderedStart,
            endTime: orderedEnd,
            startValue: dragStateRef.current.startValue,
            endValue: value,
            isActive: true,
            isDragging: false,
          };

          setSelection(finalSelection);
          onSelectionComplete?.(finalSelection);

          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(30);
          }
        }
      } else {
        clearSelection();
      }

      dragStateRef.current.isDragging = false;
      event.preventDefault();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [chartRef, pixelToTime, getValueAtTime, minSelectionWidth, onSelectionComplete, clearSelection]);

  return {
    selection,
    clearSelection,
    containerRef,
    isSelecting: selection.isDragging || selection.isActive,
  };
}
