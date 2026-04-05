'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User type from API response
 */
export interface User {
  id: string;
  email: string;
  name: string;
  orgName?: string;
  createdAt?: string;
}

/**
 * Auth Store State
 */
export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, orgName?: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  loadFromStorage: () => void;
}

/**
 * Create Zustand store with localStorage persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || errorData.error?.message || 'Login failed');
          }

          const data = await response.json();
          const { accessToken, refreshToken, user } = data.data || data;

          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Store tokens in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('samar_access_token', accessToken);
            localStorage.setItem('samar_refresh_token', refreshToken);
            localStorage.setItem('samar_user', JSON.stringify(user));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string, orgName?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, orgName }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || errorData.error?.message || 'Registration failed');
          }

          const data = await response.json();
          const { accessToken, refreshToken, user } = data.data || data;

          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Store tokens and user in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('samar_access_token', accessToken);
            localStorage.setItem('samar_refresh_token', refreshToken);
            localStorage.setItem('samar_user', JSON.stringify(user));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });

        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('samar_access_token');
          localStorage.removeItem('samar_refresh_token');
          localStorage.removeItem('samar_user');
        }
      },

      refreshAuth: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          const { accessToken, refreshToken: newRefreshToken } = data.data || data;

          set({
            accessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
            error: null,
          });

          // Update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('samar_access_token', accessToken);
            localStorage.setItem('samar_refresh_token', newRefreshToken);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
          set({
            isAuthenticated: false,
            error: errorMessage,
            accessToken: null,
            refreshToken: null,
            user: null,
          });

          // Clear localStorage on failure
          if (typeof window !== 'undefined') {
            localStorage.removeItem('samar_access_token');
            localStorage.removeItem('samar_refresh_token');
            localStorage.removeItem('samar_user');
          }
        }
      },

      setUser: (user: User | null) => {
        set({ user });
        if (user && typeof window !== 'undefined') {
          localStorage.setItem('samar_user', JSON.stringify(user));
        }
      },

      clearError: () => {
        set({ error: null });
      },

      loadFromStorage: () => {
        if (typeof window === 'undefined') return;

        const accessToken = localStorage.getItem('samar_access_token');
        const refreshToken = localStorage.getItem('samar_refresh_token');
        const userStr = localStorage.getItem('samar_user');

        if (accessToken && refreshToken) {
          const user = userStr ? JSON.parse(userStr) : null;
          set({
            accessToken,
            refreshToken,
            user,
            isAuthenticated: true,
          });
        }
      },
    }),
    {
      name: 'samar-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);