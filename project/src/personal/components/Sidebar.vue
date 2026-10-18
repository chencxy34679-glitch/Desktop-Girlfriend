<script setup lang="ts">
/**
 * 左侧栏 —— 像素风格导航。
 *
 * 读取 router 配置里的 meta.title / meta.icon 渲染列表项；
 * 当前路由项加 bg-retro-primary 突出。
 */
import { computed } from 'vue';
import { useRoute, useRouter, type RouteRecordRaw } from 'vue-router';
import { router } from '../router';

interface NavItem {
  name?: string | symbol;
  path: string;
  title: string;
  icon: string;
}

const route = useRoute();
const _router = useRouter(); // 备用：未来做编程式跳转

const navItems = computed<NavItem[]>(() =>
  (router.options.routes as RouteRecordRaw[])
    .filter((r) => r.meta && r.path !== '/' && r.name !== 'login')
    .map((r) => ({
      name: r.name,
      path: r.path,
      title: (r.meta?.title as string) ?? String(r.name ?? r.path),
      icon: (r.meta?.icon as string) ?? '▪',
    })),
);

const isActive = (path: string): boolean => route.path === path;
</script>

<template>
  <aside
    class="w-60 shrink-0 h-full flex flex-col border-r-4 border-retro-border bg-retro-surface"
  >
    <div class="px-4 py-5 border-b-2 border-retro-border">
      <h1 class="font-pixel text-base leading-tight text-retro-text">
        洛琪希
      </h1>
      <p class="font-pixel text-[10px] mt-1 text-retro-text-muted">
        Personal Panel
      </p>
    </div>

    <nav class="flex-1 overflow-y-auto py-2">
      <ul class="space-y-1 px-2">
        <li v-for="item in navItems" :key="String(item.path)">
          <router-link
            :to="item.path"
            class="flex items-center gap-2 px-3 py-2 font-pixel text-xs border-2 border-transparent transition-colors"
            :class="
              isActive(item.path)
                ? 'bg-retro-primary text-retro-text border-retro-border shadow-[2px_2px_0_0_var(--color-retro-border)]'
                : 'text-retro-text hover:bg-retro-surface-alt'
            "
          >
            <span class="text-base leading-none">{{ item.icon }}</span>
            <span>{{ item.title }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="px-4 py-3 border-t-2 border-retro-border">
      <p class="font-pixel text-[10px] text-retro-text-muted">
        v0.1.0 · M1 待补
      </p>
    </div>
  </aside>
</template>