<script setup lang="ts">
/**
 * AgentManager 视图 —— Agent 工具列表 / 编辑 / 启用停用（占位，M1 接入）。
 */
import { useAgentStore } from '../stores/agent';

const _agent = useAgentStore();
</script>

<template>
  <section class="p-6">
    <h1 class="font-pixel text-2xl mb-4 text-retro-text">🤖 Agent 管理</h1>
    <div class="box-pixel p-6">
      <p class="font-pixel text-xs text-retro-text-muted leading-relaxed">
        This panel will be implemented in M1. See docs/design/PIXEL_UI_DESIGN.md for design.
      </p>
      <ul class="mt-4 font-pixel text-xs space-y-2 text-retro-text">
        <li>· 内置工具：日历 / 提醒 / 联网搜索</li>
        <li>· 自定义工具（MCP / 脚本）</li>
        <li>· 启用 / 权限范围</li>
      </ul>
    </div>
  </section>
</template>