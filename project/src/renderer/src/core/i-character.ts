/**
 * 角色抽象接口 —— Core 层。
 *
 * 与 Electron 解耦：实现只依赖 PixiJS Container，因此可以嵌入 Vue / 任何 Web 容器。
 *
 * 实现类：
 *  - spine-character.ts：当前主线（Spine 4.1/4.2 骨骼动画）
 *  - live2d-character.ts：Cubism 4/5 占位（接入 pixi-live2d-display 后启用）
 *
 * 后续如果再要扩展（VRM / MP4 / 静态立绘）继续在这里追加类型 + factory 分支。
 */

import type { Container } from 'pixi.js';

/** 触发 tap 后的返回值：true=确实触发了；false=互动动画在播，跳过 */
export type TapResult = boolean;

export interface ICharacter {
  /** 由 renderer 挂到 stage 上；Spine 容器会包一层反向平移让 (0,0) 在 AABB 左上角 */
  readonly container: Container;
  /** 角色渲染像素尺寸（不含 padding），用于驱动窗口大小 */
  readonly imageSize: { width: number; height: number };
  /** 角色对外信息（id / displayName） */
  readonly info: { id: string; displayName: string };

  /** 每帧推进动画；dtMs 单位毫秒 */
  tick(dtMs: number): void;

  /**
   * 触发一次互动动画：播完自动排回 idle 循环。
   * @returns 是否真的触发了（互动动画进行中时返回 false）
   */
  triggerTap?(): TapResult;

  /** 互动动画是否在播（外部避免重复触发） */
  isMotionPlaying?(): boolean;

  /** 关闭实现，释放纹理 / GPU 资源；renderer 在切换角色前调用 */
  dispose(): void;
}
