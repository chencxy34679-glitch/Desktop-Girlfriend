<template>
  <!--
    顶层入口,所有路由共用 AdminLayout。
    子路由通过 router-view 渲染到 AdminLayout 的 <router-view /> 中。
  -->
  <router-view />
</template>

<script setup lang="ts">
// 占位:M4 阶段在 App 级别接入全局错误边界、toast 容器等。
</script>