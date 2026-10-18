/**
 * 个人界面 —— Vue 3 入口。
 *
 * 装配顺序：
 *  1) 加载 Tailwind v4 + retro-* token 样式
 *  2) 装载 @pxlkit/ui-kit-vue（提供 8-bit 像素组件）
 *  3) 挂 Pinia + pinia-plugin-persistedstate（用户/会员等状态本地持久化）
 *  4) 创建 Vue Router（hash 模式，Electron 文件路径无 server 路由）
 *  5) 挂载 #app
 *
 * 详细目录约定见 docs/design/PIXEL_UI_DESIGN.md（占位，待补全）。
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// 注意：pxlkit/ui-kit-vue 在 package.json 的 exports 字段里只暴露
//   "."     → dist/index.js
//   "./styles.css" → styles.css
// 这里用 subpath 形式导入样式。
import PxlkitUiKitVue from '@pxlkit/ui-kit-vue';
import '@pxlkit/ui-kit-vue/styles.css';

import App from './App.vue';
import { router } from './router';

import './style.css';

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(PxlkitUiKitVue);

app.mount('#app');