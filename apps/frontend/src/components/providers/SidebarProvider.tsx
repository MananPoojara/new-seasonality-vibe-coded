'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SidebarContextType {
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const toggleRightSidebar = useCallback(() => {
    setIsRightSidebarOpen(prev => !prev);
  }, []);

  const setRightSidebarOpen = useCallback((open: boolean) => {
    setIsRightSidebarOpen(open);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isRightSidebarOpen,
        toggleRightSidebar,
        setRightSidebarOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
