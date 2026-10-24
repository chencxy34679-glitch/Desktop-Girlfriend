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
        数据统计面板 — 下载量 / DAU / GMV / 转化率。
      </p>
      <ul class="mt-3 space-y-1 text-sm">
        <li v-for="item in placeholders" :key="item">· {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('数据统计');
const placeholders = ref([
  '角色下载量(Top 榜 + 趋势)',
  'DAU / WAU / MAU',
  'GMV 趋势与退款占比',
  '转化漏斗(曝光 → 安装 → 付费)',
]);
</script>