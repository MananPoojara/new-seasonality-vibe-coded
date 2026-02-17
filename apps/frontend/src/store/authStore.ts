import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          console.log('Attempting login for:', email);
          const response = await authApi.login(email, password);
          console.log('Login response:', response.data);
          
          const { user, accessToken, refreshToken } = response.data;
          
          // Save to localStorage as backup
          localStorage.setItem('accessToken', accessToken);
          
          // Save to store (will be persisted automatically)
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          console.log('Login successful, state updated:', { user, isAuthenticated: true });
        } catch (error: any) {
          console.error('Login error:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          console.log('Attempting registration for:', data.email);
          const response = await authApi.register(data);
          console.log('Registration response:', response.data);
          
          // Don't auto-login after register, just clear loading state
          // User will be redirected to login page
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setUser: (user) => set({ user }),

      checkAuth: async () => {
        console.log('checkAuth called');
        
        // First, try to get token from store (persisted) or localStorage
        const { accessToken: storeToken, user: storeUser, isAuthenticated: storeAuth } = get();
        const token = storeToken || localStorage.getItem('accessToken');
        
        console.log('checkAuth - current state:', { 
          storeToken: !!storeToken, 
          storeUser: !!storeUser, 
          storeAuth,
          localStorageToken: !!localStorage.getItem('accessToken')
        });
        
        if (!token) {
          console.log('checkAuth - no token found, setting unauthenticated');
          set({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null });
          return;
        }

        // If we have a token but it's not in the store, set it
        if (!storeToken && token) {
          console.log('checkAuth - token found in localStorage but not in store, updating store');
          set({ accessToken: token });
        }

        // Skip API call if user is already authenticated and we have user data
        const { isAuthenticated, user } = get();
        if (isAuthenticated && user && token) {
          console.log('checkAuth - already authenticated, skipping API call');
          return; // Already authenticated with valid data
        }

        // Verify token with API
        console.log('checkAuth - verifying token with API');
        try {
          const response = await authApi.me();
          console.log('checkAuth - API verification successful:', response.data);
          set({ 
            user: response.data.user, 
            isAuthenticated: true,
            accessToken: token 
          });
        } catch (error) {
          // Token is invalid, clear everything
          console.error('checkAuth - API verification failed:', error);
          localStorage.removeItem('accessToken');
          set({ 
            isAuthenticated: false, 
            user: null, 
            accessToken: null,
            refreshToken: null 
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Zustand store hydrated:', {
          hasUser: !!state?.user,
          hasToken: !!state?.accessToken,
          isAuthenticated: state?.isAuthenticated,
        });
        // Set hydration flag
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);
