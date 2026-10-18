import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 当前登录用户 + JWT 管理
 *
 * TODO(M4):
 *   - 接入 /api/admin/login
 *   - token 续期
 *   - 角色权限(角色管理员 / 财务 / 审核员)
 */
export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  role: 'super_admin' | 'character_admin' | 'finance' | 'moderator';
  avatar?: string;
}

const TOKEN_KEY = 'dg_admin_token';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AdminUser | null>(null);

  const isLoggedIn = computed(() => Boolean(token.value && user.value));
  const role = computed(() => user.value?.role ?? null);

  function setToken(value: string) {
    token.value = value;
    localStorage.setItem(TOKEN_KEY, value);
  }

  function setUser(value: AdminUser | null) {
    user.value = value;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  return { token, user, isLoggedIn, role, setToken, setUser, logout };
});