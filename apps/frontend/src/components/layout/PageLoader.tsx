'use client';

import { useEffect, useState, ReactNode } from 'react';
import { LoadingOverlay } from '@/components/ui/loading';

interface PageLoaderProps {
  children: ReactNode;
  loadingText?: string;
  minLoadingTime?: number;
}

export function PageLoader({ 
  children, 
  loadingText = 'Loading...', 
  minLoadingTime = 300 
}: PageLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading for at least minLoadingTime for smooth UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [minLoadingTime]);

  if (isLoading) {
    return <LoadingOverlay isVisible={true} text={loadingText} />;
  }

  return <>{children}</>;
}
