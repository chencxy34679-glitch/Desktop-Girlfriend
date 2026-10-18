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
        用户管理面板。
      </p>
      <ul class="mt-3 space-y-1 text-sm">
        <li v-for="item in placeholders" :key="item">· {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('用户管理');
const placeholders = ref([
  '用户列表(分页 + 关键词搜索)',
  '用户详情(设备 / 角色 / 订单)',
  '封禁 / 解封 / 设备封禁',
  '客服备注与审计日志',
]);
</script>