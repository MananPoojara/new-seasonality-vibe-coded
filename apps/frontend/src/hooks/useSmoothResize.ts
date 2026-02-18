'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for debounced resize events
 * Prevents charts from re-rendering too frequently during sidebar animations
 */
export function useDebouncedResize(delay: number = 150) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      // Mark as resizing to skip unnecessary updates
      isResizingRef.current = true;
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
        isResizingRef.current = false;
      }, delay);
    };

    // Initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  return { dimensions, isResizing: isResizingRef.current };
}

/**
 * Hook to create a ResizeObserver with debouncing
 * Better for individual chart containers
 */
export function useResizeObserver<T extends HTMLElement>(delay: number = 100) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the size update
      timeoutRef.current = setTimeout(() => {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }, delay);
    });

    observer.observe(element);

    // Initial size
    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  return { ref, size };
}

/**
 * Hook to detect if sidebar is animating
 * Can be used to pause expensive operations during animations
 */
export function useSidebarAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 350); // Match sidebar animation duration
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isAnimating, startAnimation };
}
