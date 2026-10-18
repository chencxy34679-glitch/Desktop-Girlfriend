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
        订单管理面板。
      </p>
      <ul class="mt-3 space-y-1 text-sm">
        <li v-for="item in placeholders" :key="item">· {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('订单管理');
const placeholders = ref([
  '订单列表(分页 + 状态筛选)',
  '退款审批(原路退回 / 角色回收)',
  '流水核对(支付通道 + 平台账)',
  '异常订单告警',
]);
</script>