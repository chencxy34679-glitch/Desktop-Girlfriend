/**
 * 构建期环境变量的类型声明。
 *
 * 项目没有引入 vite/client 的类型（tsconfig 的 "types" 只声明了 node），
 * 这里手动补上 `ImportMeta.env` 的最小声明，保证
 * `import.meta.env.VITE_API_BASE_URL` 在主进程 / preload / renderer
 * 三侧都能通过类型检查。
 *
 * 注意：本文件是全局声明文件（没有 import / export），
 * 里面的 interface 会与 TypeScript lib 内置的空 `ImportMeta` 合并。
 */

interface ImportMetaEnv {
  /** 后端 API 地址（构建期注入，见 src/shared/api-config.ts） */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
