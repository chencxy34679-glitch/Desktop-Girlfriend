/**
 * Preload — 通过 contextBridge 安全地把主进程能力暴露给 renderer。
 *
 * 原则：
 *  - 不暴露整个 ipcRenderer
 *  - 不暴露 process / fs / require
 *  - 只透出受控的方法
 */

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  /** 加载角色配置 + Spine 资源路径（hot-resource hook） */
  loadCharacter: (id: string): Promise<CharacterConfig | null> =>
    ipcRenderer.invoke('character:load', id),

  /** 通知主进程：renderer 已出图，让窗口重新对齐到任务栏上方 */
  realignWindow: (): Promise<boolean> => ipcRenderer.invoke('window:realign'),

  /** 通知主进程调整窗口尺寸（按模型实际像素），并重新对齐 */
  resizeWindow: (size: { width: number; height: number }): Promise<boolean> =>
    ipcRenderer.invoke('window:resize', size),

  /** 拖拽时通知主进程把窗口按 delta 移动 */
  moveBy: (delta: { dx: number; dy: number }): Promise<boolean> =>
    ipcRenderer.invoke('window:move-by', delta),

  /** 退出应用 */
  exitApp: (): Promise<void> => ipcRenderer.invoke('window:exit'),

  /** 获取当前主 display 工作区 */
  getWorkArea: (): Promise<{ x: number; y: number; width: number; height: number }> =>
    ipcRenderer.invoke('display:get-work-area'),
};

contextBridge.exposeInMainWorld('petApi', api);

export type PetApi = typeof api;
export interface CharacterConfig {
  id: string;
  displayName: string;
  /** Spine 骨骼动画资源。路径相对 publicDir（即项目根的 img/ 目录） */
  spine: {
    /** .atlas 文件路径，同目录下的 .png 由 Spine 的 atlas loader 自动加载 */
    atlasUrl: string;
    /** .json 骨骼数据路径 */
    jsonUrl: string;
    /** 循环待机动画名，默认 idle */
    idleAnim?: string;
    /** 单次互动动画名，默认 motion */
    motionAnim?: string;
  };
  meta: {
    /** 展示缩放比例，默认 1.0；右键菜单可调 */
    displayScale?: number;
  };
}
