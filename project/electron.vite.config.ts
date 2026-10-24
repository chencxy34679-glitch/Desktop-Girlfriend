import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

/**
 * electron-vite 配置：
 * - main 进程编译到 out/main
 * - preload 编译到 out/preload
 * - renderer 通过 Vite 构建静态资源到 out/renderer
 * - personal 通过 Vite 构建个人界面静态资源到 out/personal（独立窗口 + 独立 dev server 端口 5174）
 *
 * 资源（图片等）放在项目根的 assets/ 目录，
 * 通过 Vite 的 publicDir 暴露给渲染进程加载。
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
    // 把 user 的 img/ 暴露成静态资源根，
    // dev 时 Vite 会从 ../img 读取，生产构建时复制到 out/renderer。
    // 这样图片 URL 直接写成 `/洛琪希.webp` 即可。
    publicDir: resolve(__dirname, '../img'),
    server: {
      fs: {
        // 允许 Vite 在 dev 阶段访问项目根目录的图片文件
        allow: ['..'],
      },
      // 宠物窗口的 dev server 端口（保留默认 5173）
      port: 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
      },
    },
  },
  // 注意：个人界面（personal）**不在这里配置**。
  // electron-vite 2.3.0 只认 main / preload / renderer 三个 entry，
  // 额外的 key 会被静默忽略（且类型报错 TS2769），导致生产构建漏掉 out/personal。
  //
  // 个人界面由独立配置负责：
  //   dev  → vite --config vite.personal.config.mjs        (端口 5174)
  //   build→ vite build --config vite.personal.config.mjs  (输出 out/personal)
  // 详见 vite.personal.config.ts 与 scripts/dev.mjs。
});