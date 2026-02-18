'use client';

import React, { useEffect, useState, useRef } from 'react';

interface ChartResizeWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that forces charts to resize when sidebar toggles
 * Uses a key change to force remount of child charts
 */
export function ChartResizeWrapper({ children }: ChartResizeWrapperProps) {
  const [resizeKey, setResizeKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      // Clear any pending resize
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Wait for sidebar animation to complete, then force remount
      timeoutRef.current = setTimeout(() => {
        setResizeKey(prev => prev + 1);
      }, 400);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div key={resizeKey} className="w-full h-full">
      {children}
    </div>
  );
}
