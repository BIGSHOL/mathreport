/**
 * Authentication store using Zustand.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';
import authService from '../services/auth';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: authService.getToken(),
      isLoading: false,
      error: null,

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(data);
          // 로그인 응답에서 바로 user 정보 사용 (추가 API 호출 없이)
          set({
            token: response.access_token,
            user: {
              ...response.user,
              data_consent: false,  // 기본값 (필요시 fetchUser로 업데이트)
              subscription_tier: 'free',
              credits: 0,
              created_at: new Date().toISOString(),
            },
          });
          // 전체 사용자 정보 가져오기 (백그라운드)
          get().fetchUser();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { error?: { message?: string; details?: { reason?: string }[] }; detail?: string } } };
          // 새로운 에러 형식: { error: { message, details } }
          const errorData = err?.response?.data?.error;
          const message = errorData?.message
            || err?.response?.data?.detail
            || '로그인에 실패했습니다.';
          const detail = errorData?.details?.[0]?.reason;
          set({ error: detail ? `${message} ${detail}` : message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(data);
          // Auto-login after registration
          await get().login({ email: data.email, password: data.password });
        } catch (error: unknown) {
          const err = error as { response?: { data?: { error?: { message?: string; details?: { reason?: string }[] }; detail?: string } } };
          const errorData = err?.response?.data?.error;
          const message = errorData?.message
            || err?.response?.data?.detail
            || '회원가입에 실패했습니다.';
          const detail = errorData?.details?.[0]?.reason;
          set({ error: detail ? `${message} ${detail}` : message });
          throw error;
        } finally {
          set({ isLoading: false });
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
          set({ user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({ user });
        } catch (error: unknown) {
          // 401 에러는 토큰 만료 - 로그아웃 처리
          const err = error as { response?: { status?: number } };
          if (err?.response?.status === 401) {
            set({ user: null, token: null });
            authService.removeToken();
          }
          // 다른 에러(네트워크 등)는 기존 user 유지 (이미 로그인 응답에서 설정됨)
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useAuthStore;
