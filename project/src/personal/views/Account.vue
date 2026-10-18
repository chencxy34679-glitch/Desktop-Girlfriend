<script setup lang="ts">
/**
 * Account 视图 —— 账号信息与 JWT 管理（占位，M1 接入）。
 */
import { useAuthStore } from '../stores/auth';

const _auth = useAuthStore();
</script>

<template>
  <section class="p-6">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">👤 账号</h1>
    <div class="box-pixel p-6">
      <p class="font-pixel text-xs text-retro-text-muted leading-relaxed">
        This panel will be implemented in M1. See docs/design/PIXEL_UI_DESIGN.md for design.
      </p>
      <ul class="mt-4 font-pixel text-xs space-y-2 text-retro-text">
        <li>· 用户 ID / 昵称 / 头像</li>
        <li>· JWT 状态与刷新</li>
        <li>· 退出登录</li>
      </ul>
    </div>
  </section>
</template>