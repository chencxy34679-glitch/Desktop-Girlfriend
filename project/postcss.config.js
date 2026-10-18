/**
 * PostCSS 配置 —— Tailwind v4 用 CSS-first 配置，
 * 但 PostCSS 仍需引入 @tailwindcss/postcss 与 autoprefixer 插件。
 *
 * 该文件只影响 CSS 资源处理；
 * Vue SFC 的 <style> 块在 Vite 阶段被 PostCSS 接管。
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};