'use client';

import { useState } from 'react';
import { Header } from './Header';
import { TabNavigation } from './TabNavigation';
import { LoadingOverlay } from '@/components/ui/loading';
import { useNavigationLoading } from '@/hooks/useNavigationLoading';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  
  useNavigationLoading(setIsNavigating);

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay isVisible={isNavigating} text="Loading..." />
      <Header />
      <TabNavigation />
      <main className="container py-6">{children}</main>
    </div>
  );
}
