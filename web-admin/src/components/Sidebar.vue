<template>
  <aside
    class="sidebar w-56 flex-shrink-0 border-r-2 flex flex-col"
    :style="{
      background: 'var(--color-retro-surface)',
      'border-color': 'var(--color-retro-border)',
    }"
  >
    <!-- 顶部 logo / 标题 -->
    <div
      class="h-14 border-b-2 flex items-center justify-center"
      :style="{ 'border-color': 'var(--color-retro-border)' }"
    >
      <span
        class="font-pixel text-sm"
        :style="{ color: 'var(--color-retro-primary-ink)' }"
      >
        DG · ADMIN
      </span>
    </div>

    <!-- 导航列表 -->
    <nav class="flex-1 py-3 px-2 space-y-1">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        v-slot="{ isActive, navigate }"
        custom
      >
        <a
          :href="`#${item.path}`"
          class="block px-3 py-2 text-sm border-2 transition-colors cursor-pointer"
          :style="
            isActive
              ? {
                  background: 'var(--color-retro-primary)',
                  color: 'var(--color-retro-primary-ink)',
                  'border-color': 'var(--color-retro-border)',
                  'font-weight': '600',
                }
              : {
                  background: 'transparent',
                  color: 'var(--color-retro-text)',
                  'border-color': 'transparent',
                }
          "
          @click.prevent="navigate"
        >
          <span class="mr-2">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      </router-link>
    </nav>

    <!-- 底部:版本号 -->
    <div
      class="border-t-2 px-3 py-2 text-xs text-center"
      :style="{
        'border-color': 'var(--color-retro-border)',
        color: 'var(--color-retro-text-muted)',
      }"
    >
      v0.1.0 · M4 skeleton
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * 像素风左侧导航。
 *
 * 9 个一级入口(详见 PIXEL_UI_DESIGN.md C 章节):
 *   - 仪表盘 / 角色管理 / 用户管理 / 订单管理 / 资质审核 / 数据统计
 *
 * 字符图标先用 ASCII 占位,M4 阶段替换为 @pxlkit/vue 的 PixelIcon 系列。
 */
const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: '▣' },
  { path: '/characters', label: '角色管理', icon: '◉' },
  { path: '/users', label: '用户管理', icon: '☻' },
  { path: '/orders', label: '订单管理', icon: '◈' },
  { path: '/moderation', label: '资质审核', icon: '✓' },
  { path: '/stats', label: '数据统计', icon: '▤' },
] as const;
</script>

<style scoped>
.sidebar {
  font-family: var(--font-sans, 'Inter', 'Microsoft YaHei', sans-serif);
}

a:hover {
  background: var(--color-retro-surface-alt) !important;
}
</style>