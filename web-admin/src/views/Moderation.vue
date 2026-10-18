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
        资质审核工作流面板。
      </p>
      <ul class="mt-3 space-y-1 text-sm">
        <li v-for="item in placeholders" :key="item">· {{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('资质审核');
const placeholders = ref([
  '角色 license 审核(上传资质 → 审批)',
  '审核队列(A 通过 / D 驳回快捷键)',
  '审核历史与申诉',
  '资质有效期提醒',
]);
</script>