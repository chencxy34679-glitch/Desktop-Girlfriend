/**
 * 角色抽象接口。
 *
 * 目前唯一实现是 SpineCharacter（见 spine-character.ts）。
 * 保留这层接口是为了后续接入其它驱动方式（比如另一套骨骼格式）时，
 * renderer 的接线逻辑不用动。
 */

import type { Container } from 'pixi.js';

export interface ICharacter {
  /** 角色的显示容器，由 renderer 挂到 stage 上 */
  readonly container: Container;
  /** 角色的像素尺寸，用于驱动窗口大小 */
  readonly imageSize: { width: number; height: number };
  /** 每帧推进动画，dtMs 单位为毫秒 */
  tick(dtMs: number): void;
  /** 触发一次互动动画，返回是否真的触发 */
  triggerTap?(): boolean;
  /** 互动动画是否正在播放 */
  isMotionPlaying?(): boolean;
}
