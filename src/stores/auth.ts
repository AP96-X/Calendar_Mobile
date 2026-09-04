import { create } from 'zustand';
import { authApi } from '../api/auth';
import { clearCookie, setUnauthorizedCallback } from '../api/client';
import { clearAllCache } from '../utils/cache';
import type { UserInfo, LoginParams } from '../types';

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params: LoginParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Set up the unauthorized callback — when a 401 occurs,
  // clear auth state so the app navigates back to login
  setUnauthorizedCallback(() => {
    set({ user: null, isAuthenticated: false });
  });

  return {
    user: null,
    isLoading: true,
    isAuthenticated: false,

    login: async (params: LoginParams) => {
      try {
        const data = await authApi.login(params);
        if (data.success) {
          const user: UserInfo = {
            logged_in: true,
            user_id: data.user_id,
            username: data.username,
            display_name: data.display_name,
            role: data.role,
          };
          // 缓存 key 未按用户隔离，登录后（可能是另一个账号）清空日历缓存，避免读到上一个用户的数据
          await clearAllCache();
          set({ user, isAuthenticated: true });
          return { success: true };
        }
        return { success: false, error: data.error || '登录失败' };
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errorMsg = err.response?.data?.error || err.message || '网络错误，请检查服务器地址和网络连接';
        return { success: false, error: errorMsg };
      }
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch {
        // ignore network errors during logout
      }
      await clearCookie();
      await clearAllCache();
      set({ user: null, isAuthenticated: false });
    },

    refresh: async () => {
      try {
        const info = await authApi.getStatus();
        if (info.logged_in) {
          // 若切换了账号，清空上一账号的日历缓存
          if (get().user?.user_id !== info.user_id) {
            await clearAllCache();
          }
          set({ user: info, isAuthenticated: true, isLoading: false });
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    clearAuth: () => {
      set({ user: null, isAuthenticated: false, isLoading: false });
    },
  };
});
