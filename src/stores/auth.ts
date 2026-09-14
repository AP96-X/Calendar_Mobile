import { create } from 'zustand';
import { authApi } from '../api/auth';
import { clearCookie, setUnauthorizedCallback } from '../api/client';
import { clearAllCache, setCacheNamespace } from '../utils/cache';
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
    // 401：清空认证状态，同时清掉缓存并重置命名空间，
    // 避免下一个登录用户读到上一个用户的缓存数据
    setCacheNamespace(null);
    clearAllCache().catch(() => {});
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
          // 缓存按用户命名空间隔离；登录后（可能是另一个账号）先清空日历缓存
          await clearAllCache();
          setCacheNamespace(data.user_id);
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
      setCacheNamespace(null);
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
          setCacheNamespace(info.user_id);
          set({ user: info, isAuthenticated: true, isLoading: false });
        } else {
          setCacheNamespace(null);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        setCacheNamespace(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    clearAuth: () => {
      setCacheNamespace(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    },
  };
});
