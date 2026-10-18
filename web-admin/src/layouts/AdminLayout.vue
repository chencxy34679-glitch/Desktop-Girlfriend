<template>
  <div class="admin-layout min-h-screen flex" style="background: var(--color-retro-bg)">
    <Sidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶部:面包屑 + 用户菜单 -->
      <header
        class="h-14 border-b-2 flex items-center justify-between px-4"
        :style="{
          background: 'var(--color-retro-surface)',
          'border-color': 'var(--color-retro-border)',
        }"
      >
        <nav class="font-pixel text-xs" style="color: var(--color-retro-text-muted)">
          Desktop Girlfriend /
          <span style="color: var(--color-retro-primary-ink)">
            {{ currentTitle }}
          </span>
        </nav>

        <div class="flex items-center gap-3">
          <!-- TODO(M4): 用户头像下拉、退出登录 -->
          <span class="text-xs" style="color: var(--color-retro-text-muted)">
            未登录
          </span>
        </div>
      </header>

      <!-- 主区域:子路由 -->
      <main class="flex-1 overflow-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';

const route = useRoute();
const currentTitle = computed(() => (route.meta?.title as string) || '');
</script>

<style scoped>
.admin-layout {
  font-family: var(--font-sans, 'Inter', 'Microsoft YaHei', sans-serif);
}
</style>