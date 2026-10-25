/**
 * 角色抽象接口 —— Core 层。
 *
 * 与 Electron 解耦：实现只依赖 DOM，因此可以嵌入 Vue / 任何 Web 容器。
 *
 * 实现类：
 *  - spine-character.ts：当前主线（Spine 骨骼动画，基于 spine-canvas 4.0.x）
 *  - live2d-character.ts：Cubism 4/5 占位（接入 pixi-live2d-display 后启用）
 *
 * 后续如果再要扩展（VRM / MP4 / 静态立绘）继续在这里追加类型 + factory 分支。
 */

/** 触发 tap 后的返回值：true=确实触发了；false=互动动画在播，跳过 */
export type TapResult = boolean;

export interface ICharacter {
  /**
   * 角色承载容器（DOM 元素）。
   *
   * 实现会在里面放一个 <canvas>，并在内部做反向平移，让角色的
   * 包围盒左上角落在容器原点，这样整个角色落在 [0,0,w,h] 内。
   *
   * 注意：这是 DOM 元素而非 Pixi Container —— 渲染层已从 PixiJS 8
   * 改为原生 canvas（spine-canvas），与 V1.1 架构一致。
   */
  readonly container: HTMLElement;
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
