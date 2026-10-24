<script setup lang="ts">
/**
 * Account 视图 —— 当前登录状态 / 设备信息 / 升级注册 / 退出登录。
 *
 * 设备与后端地址信息来自主进程（auth:profile），
 * 因为只有主进程知道真实的运行环境与生效的后端地址。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import type { AuthProfile } from '../../shared/auth-types';

const auth = useAuthStore();
const router = useRouter();

/** 主进程提供的设备 / 运行环境信息 */
const profile = ref<AuthProfile | null>(null);
const profileError = ref('');
const busy = ref(false);

const statusLabel = computed(() => {
  if (!auth.isLoggedIn) return '未连接';
  return auth.isRegistered ? '正式用户' : '匿名用户';
});

const statusClass = computed(() => {
  if (!auth.isLoggedIn) return 'bg-retro-surface-alt';
  return auth.isRegistered ? 'bg-retro-success' : 'bg-retro-warn';
});

/** token 到期时间的可读文案 */
function formatTime(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadProfile(): Promise<void> {
  if (typeof window === 'undefined') return;
  const res = await window.personalApi.authGetProfile();
  if (res.ok) {
    profile.value = res.data;
    profileError.value = '';
  } else {
    profileError.value = res.message;
  }
}

/** 手动刷新会话（用 refresh token 续期） */
async function onRefresh(): Promise<void> {
  busy.value = true;
  try {
    const res = await auth.refresh();
    if (!res.ok) auth.lastError = res.message;
  } catch (err) {
    console.error('[account] 刷新登录态失败:', err);
    auth.lastError = '刷新登录态失败，请稍后再试';
  } finally {
    busy.value = false;
  }
}

/** 重新以匿名身份进入（后端不可用时的兜底入口） */
async function onAnonymous(): Promise<void> {
  busy.value = true;
  try {
    const res = await auth.anonymousRegister();
    if (!res.ok) auth.lastError = res.message;
  } catch (err) {
    console.error('[account] 匿名注册失败:', err);
    auth.lastError = '匿名注册失败，请稍后再试';
  } finally {
    busy.value = false;
  }
}

/** 退出登录：只清本地状态 */
function onLogout(): void {
  auth.logout();
}

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <section class="p-6 max-w-2xl">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">👤 账号</h1>

    <!-- 登录状态 -->
    <div class="box-pixel p-6 mb-4">
      <div class="flex items-center gap-3 mb-4">
        <h2 class="font-pixel text-base text-retro-text">当前状态</h2>
        <span class="badge-pixel" :class="statusClass">{{ statusLabel }}</span>
        <!-- 会员徽标占位：后端暂无会员体系，先留位置 -->
        <span
          class="badge-pixel bg-retro-primary"
          :class="{ 'opacity-50': !auth.isRegistered }"
          title="会员徽标（占位）"
        >
          ★ 会员
        </span>
      </div>

      <dl class="grid grid-cols-2 gap-y-3 text-xs">
        <dt class="text-retro-text-muted">用户 ID</dt>
        <dd class="text-retro-text break-all">{{ auth.userIdLabel }}</dd>

        <dt class="text-retro-text-muted">用户名</dt>
        <dd class="text-retro-text">{{ auth.username ?? '—' }}</dd>

        <dt class="text-retro-text-muted">昵称</dt>
        <dd class="text-retro-text">{{ auth.nickname ?? '—' }}</dd>

        <dt class="text-retro-text-muted">邮箱</dt>
        <dd class="text-retro-text">{{ auth.email ?? '—' }}</dd>

        <dt class="text-retro-text-muted">登录态过期</dt>
        <dd class="text-retro-text">{{ formatTime(auth.jwtExpiresAt) }}</dd>

        <dt class="text-retro-text-muted">续期凭证过期</dt>
        <dd class="text-retro-text">{{ formatTime(auth.refreshTokenExpiresAt) }}</dd>
      </dl>

      <p
        v-if="auth.lastError"
        class="mt-4 text-xs text-retro-danger bg-retro-surface-alt border-2 border-retro-border px-3 py-2 leading-relaxed"
      >
        {{ auth.lastError }}
      </p>

      <!-- 操作区 -->
      <div class="flex flex-wrap gap-2 mt-5">
        <button
          v-if="auth.isLoggedIn"
          type="button"
          class="btn-pixel"
          :disabled="busy"
          @click="onRefresh"
        >
          {{ busy ? '处理中…' : '刷新登录态' }}
        </button>

        <button
          v-if="!auth.isRegistered"
          type="button"
          class="btn-pixel"
          :disabled="busy"
          @click="router.push('/login')"
        >
          升级为注册用户
        </button>

        <button
          v-else
          type="button"
          class="btn-pixel btn-pixel--ghost"
          :disabled="busy"
          @click="router.push('/login')"
        >
          切换账号
        </button>

        <button
          v-if="!auth.isLoggedIn"
          type="button"
          class="btn-pixel btn-pixel--success"
          :disabled="busy"
          @click="onAnonymous"
        >
          以游客身份继续
        </button>

        <button
          v-if="auth.isLoggedIn"
          type="button"
          class="btn-pixel btn-pixel--danger"
          :disabled="busy"
          @click="onLogout"
        >
          退出登录
        </button>
      </div>
    </div>

    <!-- 设备信息 -->
    <div class="box-pixel p-6">
      <h2 class="font-pixel text-base text-retro-text mb-4">设备信息</h2>

      <dl class="grid grid-cols-2 gap-y-3 text-xs">
        <dt class="text-retro-text-muted">设备标识</dt>
        <dd class="text-retro-text break-all">{{ auth.deviceId ?? '—' }}</dd>

        <dt class="text-retro-text-muted">后端地址</dt>
        <dd class="text-retro-text break-all">
          {{ auth.apiBaseUrl ?? profile?.baseUrl ?? '—' }}
        </dd>

        <dt class="text-retro-text-muted">操作系统</dt>
        <dd class="text-retro-text">{{ profile?.osVersion ?? '—' }}</dd>

        <dt class="text-retro-text-muted">平台 / 架构</dt>
        <dd class="text-retro-text">
          {{ profile?.platform ?? '—' }} / {{ profile?.arch ?? '—' }}
        </dd>

        <dt class="text-retro-text-muted">客户端版本</dt>
        <dd class="text-retro-text">{{ profile?.appVersion ?? '—' }}</dd>

        <dt class="text-retro-text-muted">运行时</dt>
        <dd class="text-retro-text">
          Electron {{ profile?.electronVersion || '—' }} · Node {{ profile?.nodeVersion || '—' }}
        </dd>
      </dl>

      <p v-if="profileError" class="mt-4 text-xs text-retro-danger">{{ profileError }}</p>

      <p class="mt-4 text-xs text-retro-text-muted leading-relaxed">
        后端地址可在「设置」里修改，改完点「刷新登录态」即可重新连接。
      </p>
    </div>
  </section>
</template>
