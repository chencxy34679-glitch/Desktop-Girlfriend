import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

/**
 * electron-vite 配置：
 * - main 进程编译到 out/main
 * - preload 编译到 out/preload
 * - renderer 通过 Vite 构建静态资源到 out/renderer
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
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
      },
    },
  },
});
