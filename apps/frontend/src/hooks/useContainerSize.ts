'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * Hook to track container size changes using ResizeObserver
 * More efficient than window resize events for chart containers
 */
export function useContainerSize<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Debounce size updates
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }, 100);
    });

    resizeObserver.observe(element);

    // Set initial size
    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return { ref: containerRef, size };
}

/**
 * Hook to force chart redraw when sidebar toggles
 * Use this in chart components that need to resize when layout changes
 */
export function useForceChartResize() {
  const [resizeKey, setResizeKey] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      // Force re-render by updating key
      setResizeKey(prev => prev + 1);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return resizeKey;
}

/**
 * Hook to detect when sidebar animation is complete
 * Returns a boolean that flips when resize event fires
 */
export function useLayoutAnimationComplete() {
  const [animationComplete, setAnimationComplete] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      setAnimationComplete(false);
      
      // Reset after a short delay
      timeoutId = setTimeout(() => {
        setAnimationComplete(true);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return animationComplete;
}
