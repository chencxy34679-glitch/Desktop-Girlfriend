/**
 * 个人界面（personal）的独立 Vite dev server 配置。
 *
 * 背景：electron-vite 在 dev 模式下只为 renderer 启一个 dev server(5173)，
 * 额外的 `personal` entry 只会参与 build，不会起自己的 dev server。
 * 因此这里单独提供一个 Vite 配置，用 `vite --config vite.personal.config.mjs`
 * 在 5174 端口起 personal 的 dev server。
 *
 * 为什么用 .mjs 而不是 .ts：
 *   electron-vite 的 externalize-deps 插件会把项目里被扫描到的 vite config
 *   当作 CJS 处理，而 @tailwindcss/vite 是 ESM-only，require 会失败。
 *   纯 .mjs 走 ESM 加载路径，绕开该问题。
 *
 * 启动方式：npm run dev（scripts/dev.mjs 会同时拉起两个 server）
 * 生产构建：由 electron.vite.config.ts 的 personal entry 负责（输出 out/personal）
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'src/personal'),
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@personal': resolve(__dirname, 'src/personal/src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'out/personal'),
    emptyOutDir: false,
  },
});
