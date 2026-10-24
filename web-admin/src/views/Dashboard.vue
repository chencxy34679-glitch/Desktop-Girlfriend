<template>
  <div class="p-6 space-y-4">
    <header class="flex items-baseline justify-between">
      <h1 class="font-pixel text-2xl" :style="{ color: 'var(--color-retro-primary-ink)' }">
        {{ title }}
      </h1>
      <span class="text-xs" :style="{ color: 'var(--color-retro-text-muted)' }">
        实时数据 · 5 分钟刷新
      </span>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="border-2 p-4"
        :style="{
          background: 'var(--color-retro-surface)',
          'border-color': 'var(--color-retro-border)',
        }"
      >
        <div class="text-xs font-pixel mb-2" :style="{ color: 'var(--color-retro-text-muted)' }">
          {{ kpi.label }}
        </div>
        <div class="font-pixel text-2xl" :style="{ color: 'var(--color-retro-text)' }">
          {{ kpi.value }}
        </div>
      </div>
    </div>

    <div
      class="border-2 p-4"
      :style="{
        background: 'var(--color-retro-surface)',
        'border-color': 'var(--color-retro-border)',
      }"
    >
      <p class="text-sm" :style="{ color: 'var(--color-retro-text-muted)' }">
        仪表盘核心卡片:<span class="font-pixel">GMV / DAU / 转化率</span>。
        <br />
        TODO(M4):接入数据 API 与图表组件(@pxlkit/ui-kit-vue 的 PixelAreaChart / PixelBarChart)。
      </p>
      <ul class="mt-3 space-y-1 text-sm">
        <li v-for="item in placeholders" :key="item">· {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('仪表盘');
const kpis = ref([
  { label: '今日 GMV', value: '¥—' },
  { label: 'DAU', value: '—' },
  { label: '付费转化率', value: '—%' },
]);
const placeholders = ref([
  'GMV / DAU / 转化率 三联 KPI',
  '近 30 天趋势曲线(像素风 area chart)',
  '角色下载量 Top 10 排行',
]);
</script>