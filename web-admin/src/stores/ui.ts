import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 全局 UI 状态:侧栏折叠、暗色模式、面包屑缓存等
 */
export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false);
  const themeMode = ref<'light' | 'dark' | 'system'>('light');

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function setSidebar(collapsed: boolean) {
    sidebarCollapsed.value = collapsed;
  }

  function setThemeMode(mode: 'light' | 'dark' | 'system') {
    themeMode.value = mode;
  }

  return { sidebarCollapsed, themeMode, toggleSidebar, setSidebar, setThemeMode };
});