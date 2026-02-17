'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useNavigationLoading(callback: (isLoading: boolean) => void) {
  const pathname = usePathname();

  useEffect(() => {
    // Show loading when pathname changes
    callback(true);
    
    // Hide loading after a short delay
    const timer = setTimeout(() => {
      callback(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, callback]);
}
