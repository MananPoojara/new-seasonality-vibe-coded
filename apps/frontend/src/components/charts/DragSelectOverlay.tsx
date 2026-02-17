import React, { useEffect, useState, useRef } from 'react';
import { IChartApi, Time } from 'lightweight-charts';
import { DragSelection } from '@/hooks/useChartDragSelect';
import { cn } from '@/lib/utils';

interface DragSelectOverlayProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  selection: DragSelection;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function DragSelectOverlay({ 
  chartRef, 
  selection, 
  containerRef 
}: DragSelectOverlayProps) {
  const [overlayStyle, setOverlayStyle] = useState<{
    left: number;
    width: number;
    display: boolean;
  }>({ left: 0, width: 0, display: false });

  const [tooltips, setTooltips] = useState<{
    start: { x: number; date: string; value: string } | null;
    end: { x: number; date: string; value: string } | null;
  }>({ start: null, end: null });

  useEffect(() => {
    if (!chartRef.current || !selection.startTime || !selection.endTime) {
      setOverlayStyle({ left: 0, width: 0, display: false });
      setTooltips({ start: null, end: null });
      return;
    }

    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    try {
      // Convert times to pixel coordinates
      const startX = timeScale.timeToCoordinate(selection.startTime);
      const endX = timeScale.timeToCoordinate(selection.endTime);

      if (startX === null || endX === null) {
        setOverlayStyle({ left: 0, width: 0, display: false });
        return;
      }

      // Ensure left is always the smaller value
      const left = Math.min(startX, endX);
      const right = Math.max(startX, endX);
      const width = right - left;

      setOverlayStyle({
        left,
        width,
        display: true,
      });

      // Format tooltips
      const formatDate = (time: Time) => {
        const timestamp = typeof time === 'number' ? time * 1000 : new Date(time as any).getTime();
        return new Date(timestamp).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      };

      const formatValue = (value: number | null) => {
        return value !== null ? value.toFixed(2) : 'N/A';
      };

      setTooltips({
        start: {
          x: startX,
          date: formatDate(selection.startTime),
          value: formatValue(selection.startValue),
        },
        end: {
          x: endX,
          date: formatDate(selection.endTime),
          value: formatValue(selection.endValue),
        },
      });
    } catch (error) {
      console.error('Error calculating overlay position:', error);
      setOverlayStyle({ left: 0, width: 0, display: false });
    }
  }, [chartRef, selection]);

  if (!overlayStyle.display) return null;

  return (
    <>
      {/* Semi-transparent selection overlay */}
      <div
        className={cn(
          "absolute top-0 bottom-0 pointer-events-none z-10 transition-opacity",
          selection.isDragging ? "opacity-100" : "opacity-80"
        )}
        style={{
          left: `${overlayStyle.left}px`,
          width: `${overlayStyle.width}px`,
          backgroundColor: 'rgba(79, 70, 229, 0.15)',
          borderLeft: '2px solid rgba(79, 70, 229, 0.8)',
          borderRight: '2px solid rgba(79, 70, 229, 0.8)',
        }}
      >
        {/* Vertical boundary lines */}
        <div
          className="absolute top-0 bottom-0 left-0 w-[2px] bg-indigo-600"
          style={{ boxShadow: '0 0 4px rgba(79, 70, 229, 0.5)' }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 w-[2px] bg-indigo-600"
          style={{ boxShadow: '0 0 4px rgba(79, 70, 229, 0.5)' }}
        />
      </div>

      {/* Start boundary tooltip */}
      {tooltips.start && (
        <div
          className="absolute pointer-events-none z-20 animate-in fade-in duration-200"
          style={{
            left: `${tooltips.start.x}px`,
            top: '10px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white border-2 border-indigo-600 rounded-lg shadow-lg px-3 py-2 text-xs">
            <div className="font-bold text-indigo-600 mb-1">START</div>
            <div className="text-slate-700 font-semibold">{tooltips.start.date}</div>
            <div className="text-slate-600">Value: {tooltips.start.value}</div>
          </div>
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #4F46E5',
              top: '100%',
            }}
          />
        </div>
      )}

      {/* End boundary tooltip */}
      {tooltips.end && (
        <div
          className="absolute pointer-events-none z-20 animate-in fade-in duration-200"
          style={{
            left: `${tooltips.end.x}px`,
            top: '10px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white border-2 border-indigo-600 rounded-lg shadow-lg px-3 py-2 text-xs">
            <div className="font-bold text-indigo-600 mb-1">END</div>
            <div className="text-slate-700 font-semibold">{tooltips.end.date}</div>
            <div className="text-slate-600">Value: {tooltips.end.value}</div>
          </div>
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #4F46E5',
              top: '100%',
            }}
          />
        </div>
      )}

      {/* Selection info badge (center) */}
      {selection.isActive && overlayStyle.width > 100 && (
        <div
          className="absolute pointer-events-none z-20 animate-in fade-in duration-300"
          style={{
            left: `${overlayStyle.left + overlayStyle.width / 2}px`,
            bottom: '10px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-indigo-600 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-lg">
            SELECTED RANGE
          </div>
        </div>
      )}
    </>
  );
}
