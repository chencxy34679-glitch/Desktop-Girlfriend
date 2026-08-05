/**
 * 角色配置 —— 主进程从 assets/characters/<id>/config.json 读出来，
 * 渲染进程加载资源用。两种驱动方式：
 *
 *  - Spine：当前主线（roxy）。用 spine-pixi-v8 runtime + 4.1→4.2 patch
 *  - Live2D：预留（pixi-live2d-display 接入）；当前未挂依赖，靠 type 字段判断
 *
 * 后续如果需要别的驱动（VRM、MP4 视频、立绘 GIF 等），继续往上加 type 即可。
 */

export type CharacterDriverType = 'spine' | 'live2d';

export interface SpineDriverConfig {
  atlasUrl: string;
  jsonUrl: string;
  idleAnim?: string;
  motionAnim?: string;
}

/**
 * Live2D 模型配置（Cubism 4 / 5）。
 *
 * 实际接入时需要在 `package.json` 增加 `pixi-live2d-display` 依赖，
 * 然后在 character-factory 里 import()。当前为可嵌入接口，
 * 未挂依赖也不会编译失败（loader 里 dynamic import 容错）。
 */
export interface Live2DDriverConfig {
  /** 相对 publicDir 的 model.json URL */
  modelUrl: string;
  /** 待机动作组（用于随机遍历） */
  idleMotionGroup?: string;
  /** 互动动作组（点击触发） */
  motionGroup?: string;
  /** 表情（expression）组：默认若干 */
  defaultExpressions?: string[];
}

export interface CharacterMeta {
  displayScale?: number;
  /**
   * 时段变体：例如 'day' / 'night'。
   * 同 baseId 的多个角色共享一个"时段自动切换"逻辑。
   */
  variant?: 'day' | 'night' | string;
  /** 共享 baseId 的多套服装属于"同一人物"（用于时段自动切换配对） */
  baseId?: string;
  /** 是否允许主进程根据系统时间在同 baseId 的多个 variant 之间自动切换 */
  autoTimeSwitch?: boolean;
  /** 夜晚时段起点（24h，闭区间）；缺省 18 */
  nightStartHour?: number;
  /** 夜晚时段终点（24h，开区间）；缺省 6 */
  nightEndHour?: number;
  /** 留作扩展：作者、声线、语音 ID 等 */
  [k: string]: unknown;
}

export interface CharacterConfig {
  id: string;
  displayName: string;
  /** 驱动类型；缺省按 spine 处理（向后兼容老 config） */
  type?: CharacterDriverType;
  spine?: SpineDriverConfig;
  live2d?: Live2DDriverConfig;
  meta?: CharacterMeta;
}

/** 主进程 IPC 返回的"角色目录"形状 */
export interface CharacterSummary {
  id: string;
  displayName: string;
  type: CharacterDriverType;
  /** 同 baseId / variant 字段，便于 renderer 直接据此做菜单分组 */
  baseId?: string;
  variant?: string;
}
