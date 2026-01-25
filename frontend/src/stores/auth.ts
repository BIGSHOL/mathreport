/**
 * Authentication store using Zustand with Supabase Auth (Google OAuth only).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';
import authService from '../services/auth';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  restoreSession: () => Promise<void>;
  handleAuthCallback: () => Promise<void>;
  clearError: () => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: authService.getToken(),
      isLoading: false,
      error: null,
      isInitialized: false,

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          await authService.loginWithGoogle();
          // OAuth 리다이렉트가 발생하므로 여기서 끝남
        } catch (error: unknown) {
          const err = error as Error;
          set({ error: err.message || 'Google 로그인에 실패했습니다.', isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({ user: null, token: null, isLoading: false });
        }
      },

      fetchUser: async () => {
        const token = get().token || authService.getToken();
        if (!token) {
          set({ user: null, isInitialized: true });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({ user, isInitialized: true });
        } catch (error: unknown) {
          const err = error as { response?: { status?: number } };
          if (err?.response?.status === 401) {
            set({ user: null, token: null });
            authService.removeToken();
          }
          set({ isInitialized: true });
        } finally {
          set({ isLoading: false });
        }
      },

      restoreSession: async () => {
        set({ isLoading: true });
        try {
          const token = await authService.restoreSession();
          if (token) {
            set({ token });
            await get().fetchUser();
          } else {
            set({ isInitialized: true });
          }
        } catch {
          set({ isInitialized: true });
        } finally {
          set({ isLoading: false });
        }
      },

      handleAuthCallback: async () => {
        set({ isLoading: true, error: null });
        try {
          // Supabase가 URL에서 세션을 자동으로 파싱함
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            throw new Error(error.message);
          }

          if (session?.access_token) {
            authService.setToken(session.access_token);
            set({ token: session.access_token });

            // 백엔드에서 사용자 정보 가져오기
            const user = await authService.getCurrentUser();
            set({ user, isInitialized: true });
          } else {
            throw new Error('세션을 가져올 수 없습니다.');
          }
        } catch (error: unknown) {
          const err = error as Error;
          set({ error: err.message || '인증 콜백 처리에 실패했습니다.', isInitialized: true });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),

      setToken: (token: string | null) => {
        if (token) {
          authService.setToken(token);
        } else {
          authService.removeToken();
        }
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useAuthStore;
