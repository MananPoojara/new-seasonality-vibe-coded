'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Maximize2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChartConfig } from './types';

interface ChartWrapperProps {
  config: ChartConfig;
  children: ReactNode;
  className?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  isLoading?: boolean;
}

export function ChartWrapper({
  config,
  children,
  className,
  onRefresh,
  onExport,
  onFullscreen,
  isLoading,
}: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    // Use ResizeObserver for smooth size detection
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Debounce resize to prevent lag during sidebar animations
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Skip updates during animation
      if (isAnimatingRef.current) {
        return;
      }

      resizeTimeoutRef.current = setTimeout(() => {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }, 100);
    });

    observer.observe(element);

    // Initial size
    setContainerSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    // Listen for sidebar animation events
    const handleSidebarToggle = () => {
      isAnimatingRef.current = true;
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Resume updates after animation completes
      resizeTimeoutRef.current = setTimeout(() => {
        isAnimatingRef.current = false;
        if (containerRef.current) {
          setContainerSize({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      }, 400); // Slightly longer than sidebar animation
    };

    window.addEventListener('resize', handleSidebarToggle);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleSidebarToggle);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          {config.title && <CardTitle className="text-lg">{config.title}</CardTitle>}
          {config.subtitle && (
            <CardDescription className="text-sm">{config.subtitle}</CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
          {onExport && (
            <Button variant="ghost" size="icon" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onFullscreen && (
            <Button variant="ghost" size="icon" onClick={onFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="w-full transition-all duration-300 ease-out"
          style={{ 
            height: config.height || 500,
            willChange: isAnimatingRef.current ? 'contents' : 'auto',
          }}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
