<template>
  <div class="p-6">
    <h1 class="font-pixel text-2xl mb-4" :style="{ color: 'var(--color-retro-text)' }">
      {{ title }}
    </h1>

    <div
      class="border-2 p-4"
      :style="{
        background: 'var(--color-retro-surface)',
        'border-color': 'var(--color-retro-border)',
      }"
    >
      <p class="text-sm" :style="{ color: 'var(--color-retro-text-muted)' }">
        角色管理面板将负责项目的核心事务管理。
        详见 <code>docs/design/PIXEL_UI_DESIGN.md</code> C 章节设计。
      </p>
      <ul class="mt-3 space-y-1 text-sm">
        <li v-for="item in placeholders" :key="item">· {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('角色管理');
const placeholders = ref([
  '角色列表 CRUD(分页 + 筛选)',
  '角色版本管理(zip 上传 / 灰度)',
  '审核工作流快捷键(A 通过 / D 驳回)',
  '角色详情弹窗(预览 Live2D + 元数据)',
]);
</script>