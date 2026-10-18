/**
 * Auth Store —— 用户身份与 JWT 管理（占位骨架）。
 *
 * 用 pinia-plugin-persistedstate 把 token 持久化到 localStorage，
 * 这样窗口关闭再打开也能保持登录态。
 */
import { defineStore } from 'pinia';

interface AuthState {
  userId: string | null;
  nickname: string | null;
  avatar: string | null;
  jwt: string | null;
  jwtExpiresAt: number | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    userId: null,
    nickname: null,
    avatar: null,
    jwt: null,
    jwtExpiresAt: null,
  }),
  getters: {
    isLoggedIn: (s): boolean => !!s.jwt,
    isJwtExpired: (s): boolean =>
      !!s.jwtExpiresAt && Date.now() > s.jwtExpiresAt,
  },
  actions: {
    setSession(payload: Partial<AuthState>): void {
      Object.assign(this.$state, payload);
    },
    logout(): void {
      this.$reset();
    },
  },
  persist: {
    key: 'dg.personal.auth',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
});