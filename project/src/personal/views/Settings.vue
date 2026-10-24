<script setup lang="ts">
/**
 * Settings 视图 —— 全局偏好（主题、动效、隐私等，占位，M1 接入）。
 *
 * 当前已经接入的是「后端地址」配置：
 *  - 桌面端必须能配后端地址（内网 / 灰度环境）
 *  - 覆盖值存在 auth store 里（localStorage 持久化），随请求发给主进程
 */
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import type { AuthProfile } from '../../shared/auth-types';

const auth = useAuthStore();

/** 输入框里的地址（用户可能正在编辑，先和 store 分开） */
const urlInput = ref('');
/** 主进程上报的默认后端地址 */
const defaultBaseUrl = ref('');
const saved = ref(false);
const busy = ref(false);

/** 加载默认地址 + 回填当前覆盖值 */
onMounted(async () => {
  urlInput.value = auth.apiBaseUrl ?? '';
  if (typeof window === 'undefined') return;
  const res = await window.personalApi.authGetProfile();
  if (res.ok) {
    defaultBaseUrl.value = (res.data as AuthProfile).baseUrl;
  }
});

/** 保存地址并立即重连（续期失败会自动回退到匿名注册） */
async function onSave(): Promise<void> {
  auth.setApiBaseUrl(urlInput.value);
  markSaved();

  busy.value = true;
  try {
    await auth.bootstrap();
  } catch (err) {
    console.error('[settings] 重连失败:', err);
    auth.lastError = '重连失败，请稍后再试';
  } finally {
    busy.value = false;
  }
}

/** 恢复默认地址 */
async function onReset(): Promise<void> {
  urlInput.value = '';
  auth.setApiBaseUrl(null);
  markSaved();

  busy.value = true;
  try {
    await auth.bootstrap();
  } catch (err) {
    console.error('[settings] 重连失败:', err);
    auth.lastError = '重连失败，请稍后再试';
  } finally {
    busy.value = false;
  }
}

/** 短暂显示"已保存"提示 */
function markSaved(): void {
  saved.value = true;
  window.setTimeout(() => {
    saved.value = false;
  }, 2000);
}
</script>

<template>
  <section class="p-6 max-w-2xl">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">⚙️ 设置</h1>

    <!-- 后端地址 -->
    <div class="box-pixel p-6 mb-4">
      <h2 class="font-pixel text-base text-retro-text mb-4">后端地址</h2>

      <label class="label-pixel" for="api-base-url">自定义地址（留空则用默认）</label>
      <input
        id="api-base-url"
        v-model="urlInput"
        class="input-pixel"
        type="text"
        placeholder="http://localhost:8080"
        :disabled="busy"
      />

      <p class="mt-2 text-xs text-retro-text-muted leading-relaxed">
        默认地址：<span class="text-retro-text break-all">{{ defaultBaseUrl || '—' }}</span>
      </p>

      <div class="flex flex-wrap gap-2 mt-4">
        <button type="button" class="btn-pixel" :disabled="busy" @click="onSave">
          {{ busy ? '连接中…' : '保存并重连' }}
        </button>
        <button
          type="button"
          class="btn-pixel btn-pixel--ghost"
          :disabled="busy || !auth.apiBaseUrl"
          @click="onReset"
        >
          恢复默认
        </button>
      </div>

      <p
        v-if="saved"
        class="mt-3 text-xs text-retro-success"
      >
        已保存，正在重新连接…
      </p>
      <p
        v-if="auth.lastError"
        class="mt-3 text-xs text-retro-danger"
      >
        {{ auth.lastError }}
      </p>
    </div>

    <!-- 其余设置（占位） -->
    <div class="box-pixel p-6">
      <h2 class="font-pixel text-base text-retro-text mb-4">其他</h2>
      <ul class="text-xs space-y-2 text-retro-text-muted leading-relaxed">
        <li>· 主题（浅 / 深 / 自动）</li>
        <li>· 窗口常驻 / 透明度</li>
        <li>· 隐私（本地存储 / 云同步）</li>
        <li>· 关于 / 更新检查</li>
      </ul>
    </div>
  </section>
</template>
