/**
 * 个人界面（renderer）侧的全局类型声明。
 *
 * 让 views / stores 不必每个文件都 import preload 类型就能拿到
 * `window.personalApi` 的类型。
 *
 * 注意：类型定义在 src/shared/auth-types.ts，
 * 这样 renderer 不需要 import preload 文件（preload 依赖 electron，
 * 单独抽接口也让将来换 preload 更方便）。
 */
import type { PersonalAuthApi } from '../shared/auth-types';

declare global {
  interface Window {
    personalApi: PersonalAuthApi;
  }
}

export {};
