<script setup lang="ts">
/**
 * Character 视图 —— 角色人格 / 形象 / 声音设置（占位，M1 接入）。
 */
import { usePersonaStore } from '../stores/persona';

const _persona = usePersonaStore();
</script>

<template>
  <section class="p-6">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">🌸 角色</h1>
    <div class="box-pixel p-6">
      <p class="font-pixel text-xs text-retro-text-muted leading-relaxed">
        This panel will be implemented in M1. See docs/design/PIXEL_UI_DESIGN.md for design.
      </p>
      <ul class="mt-4 font-pixel text-xs space-y-2 text-retro-text">
        <li>· 人格设定（system prompt 模板）</li>
        <li>· 形象切换（日间 / 夜间 / 多套服装）</li>
        <li>· 声音 / TTS 音色</li>
        <li>· 记忆管理</li>
      </ul>
    </div>
  </section>
</template>