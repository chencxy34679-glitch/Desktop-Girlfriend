<script setup lang="ts">
/**
 * Login 视图 —— 用户名密码登录 / 把匿名身份升级为正式用户。
 *
 * 数据流：
 *   Login.vue → auth store → window.personalApi → IPC → 主进程 → 后端 auth 模块
 *
 * renderer 不直接访问后端，所有请求都经过 preload / 主进程。
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

/** 'login' 登录已有账号；'register' 把当前匿名身份升级为正式用户 */
const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const email = ref('');

/** 后端返回的错误提示（已经是中文可读文案） */
const errorMsg = ref('');
const busy = ref(false);

const isRegister = computed(() => mode.value === 'register');

const canSubmit = computed(() => {
  if (busy.value) return false;
  if (username.value.trim().length < 2) return false;
  if (password.value.length < 6) return false;
  return true;
});

function switchMode(next: 'login' | 'register'): void {
  mode.value = next;
  errorMsg.value = '';
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return;

  busy.value = true;
  errorMsg.value = '';

  const payload = {
    username: username.value.trim(),
    password: password.value,
  };

  try {
    const res = isRegister.value
      ? await auth.upgradeRegister({
          ...payload,
          email: email.value.trim() || undefined,
        })
      : await auth.login(payload);

    if (res.ok) {
      await router.push('/account');
    } else {
      errorMsg.value = res.message;
    }
  } catch (err) {
    // 兜底：store 内部异常也要给用户一句可读提示，不能把 stack 抛到界面
    console.error('[login] 提交失败:', err);
    errorMsg.value = '操作失败，请稍后再试';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="p-6 max-w-xl">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">
      {{ isRegister ? '✨ 注册' : '🔐 登录' }}
    </h1>

    <div class="box-pixel p-6">
      <!-- 模式切换 -->
      <div class="flex gap-2 mb-5">
        <button
          type="button"
          class="btn-pixel"
          :class="{ 'btn-pixel--ghost': !isRegister }"
          :disabled="busy"
          @click="switchMode('login')"
        >
          登录
        </button>
        <button
          type="button"
          class="btn-pixel"
          :class="{ 'btn-pixel--ghost': isRegister }"
          :disabled="busy"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <p class="text-xs text-retro-text-muted mb-4 leading-relaxed">
        {{
          isRegister
            ? '注册会把当前匿名身份升级为正式账号，之后可以用用户名密码登录。'
            : '用注册好的用户名和密码登录，换设备时也能找回同一个账号。'
        }}
      </p>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="label-pixel" for="login-username">用户名</label>
          <input
            id="login-username"
            v-model="username"
            class="input-pixel"
            type="text"
            autocomplete="username"
            placeholder="至少 2 个字符"
            :disabled="busy"
          />
        </div>

        <div>
          <label class="label-pixel" for="login-password">密码</label>
          <input
            id="login-password"
            v-model="password"
            class="input-pixel"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            placeholder="至少 6 个字符"
            :disabled="busy"
          />
        </div>

        <div v-if="isRegister">
          <label class="label-pixel" for="login-email">邮箱（可选）</label>
          <input
            id="login-email"
            v-model="email"
            class="input-pixel"
            type="email"
            autocomplete="email"
            placeholder="用于找回密码"
            :disabled="busy"
          />
        </div>

        <!-- 后端错误提示 -->
        <p
          v-if="errorMsg"
          class="text-xs text-retro-danger bg-retro-surface-alt border-2 border-retro-border px-3 py-2 leading-relaxed"
        >
          {{ errorMsg }}
        </p>

        <button type="submit" class="btn-pixel w-full" :disabled="!canSubmit">
          {{ busy ? '处理中…' : isRegister ? '注册并升级' : '登录' }}
        </button>
      </form>
    </div>

    <!-- 当前身份提示 -->
    <div class="box-pixel mt-4 p-4">
      <p class="text-xs text-retro-text-muted leading-relaxed">
        当前身份：
        <span class="badge-pixel">{{
          auth.isRegistered ? '正式用户' : auth.isAnonymous ? '匿名用户' : '未连接'
        }}</span>
        <span v-if="auth.nickname" class="ml-2 text-retro-text">{{ auth.nickname }}</span>
      </p>
      <p class="text-xs text-retro-text-muted mt-2 leading-relaxed">
        匿名用户也能正常使用全部功能，注册只是为了跨设备同步数据。
      </p>
    </div>
  </section>
</template>
