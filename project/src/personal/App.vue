<script setup lang="ts">
/**
 * 个人界面顶层布局。
 *
 * 左侧 240px 像素风格侧栏 + 右侧主内容区。
 * 侧栏点击切换路由（hash 模式），主区域由 <router-view> 渲染当前 view。
 */
import Sidebar from './components/Sidebar.vue';
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-retro-bg text-retro-text">
    <Sidebar />
    <main class="flex-1 min-w-0 overflow-auto">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>