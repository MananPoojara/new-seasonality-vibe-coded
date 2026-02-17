'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingOverlay } from '@/components/ui/loading';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth, _hasHydrated } = useAuthStore();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Wait for Zustand to hydrate before checking auth
    if (!_hasHydrated) {
      console.log('Waiting for store to hydrate...');
      return;
    }

    const checkAndLoad = async () => {
      console.log('Store hydrated, checking auth...');
      setIsAuthChecking(true);
      await checkAuth();
      setIsAuthChecking(false);
      setHasCheckedAuth(true);
    };
    
    checkAndLoad();
  }, [checkAuth, _hasHydrated]);

  // Redirect admin users to admin panel - they should not see dashboard
  useEffect(() => {
    if (hasCheckedAuth && isAuthenticated && user?.role === 'admin') {
      router.push('/admin');
    }
  }, [hasCheckedAuth, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (isAuthChecking || !hasCheckedAuth) {
    return <LoadingOverlay isVisible={true} text="Checking authentication..." />;
  }

  // Redirect to login if not authenticated (only after we've checked)
  if (hasCheckedAuth && !isAuthenticated) {
    router.push('/login');
    return <LoadingOverlay isVisible={true} text="Redirecting to login..." />;
  }

  // If admin, show loading while redirecting
  if (user?.role === 'admin') {
    return <LoadingOverlay isVisible={true} text="Redirecting to admin panel..." />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
