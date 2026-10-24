import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// 主 宠物 5173 / 个人界面 5174 / 后台 5175
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5175,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});