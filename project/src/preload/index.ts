/**
 * Preload — 通过 contextBridge 安全地把主进程能力暴露给 renderer。
 *
 * 原则：
 *  - 不暴露整个 ipcRenderer
 *  - 不暴露 process / fs / require
 *  - 只透出受控的方法
 *
 * 这里用 src/shared/ipc-channels.ts 里集中定义的 channel 名常量；
 * 增加 / 重命名 channel 时改一处即可。
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc-channels';
import type { CharacterConfig, CharacterSummary } from '../shared/character-config';

const api = {
  // ---- 角色 ----
  loadCharacter: (id: string): Promise<CharacterConfig | null> =>
    ipcRenderer.invoke(IpcChannels.CharacterLoad, id),

  listCharacters: (): Promise<CharacterSummary[]> =>
    ipcRenderer.invoke(IpcChannels.CharacterList),

  getActiveCharacter: (): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.CharacterGetActive),

  setActiveCharacter: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.CharacterSetActive, id),

  /**
   * 订阅主进程推流的"角色已切换"事件。
   * 事件载荷是新的 CharacterConfig（renderer 据此销毁旧角色、加载新角色）。
   */
  onCharacterChanged: (cb: (cfg: CharacterConfig) => void): (() => void) => {
    const listener = (_e: unknown, cfg: CharacterConfig): void => cb(cfg);
    ipcRenderer.on('character:active-changed', listener);
    return () => ipcRenderer.removeListener('character:active-changed', listener);
  },

  // ---- 窗口状态 ----
  getWorkArea: (): Promise<{ x: number; y: number; width: number; height: number }> =>
    ipcRenderer.invoke(IpcChannels.DisplayGetWorkArea),

  /** 通知主进程：renderer 已出图，让窗口重新对齐 */
  realignWindow: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.WindowRealign),

  /**
   * 通知主进程调整窗口尺寸。
   * 主进程在拖拽期间会保留这个请求，drag-end 后才会真的 setSize。
   */
  resizeWindow: (size: { width: number; height: number }): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.WindowResize, size),

  /**
   * 拖拽生命周期显式分三段，是为了让主进程的拖拽锁能精确闭合：
   *  - drag-start：renderer 第一次进入 dragging 时调一次
   *  - move-by：每个 rAF flush 时调一次，传入本帧 delta
   *  - drag-end：pointerup / pointercancel 时调一次
   *
   * 这样主进程就能知道：
   *  1) 拖拽期间 setSize 全部挂起（修"长按晃动窗口变大"）
   *  2) 用累计位移判定"是否真的离开默认位置"，避免长按微动误判（修"点击默认位置失效"）
   */
  notifyDragStart: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.WindowDragStart),
  moveBy: (delta: { dx: number; dy: number }): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.WindowMoveBy, delta),
  notifyDragEnd: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.WindowDragEnd),

  /** 把窗口恢复到默认右下位置（用窗口当前所在 display） */
  resetWindowPosition: (): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.WindowResetPosition),

  setPinned: (pinned: boolean): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.WindowSetPinned, pinned),

  getPinned: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.WindowGetPinned),

  // ---- 聊天 / TTS（占位通道） ----
  chatAsk: (text: string, characterId?: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.ChatAsk, { text, characterId }),

  /** 订阅主进程推流的 chat 回复（流式 token） */
  onChatToken: (cb: (chunk: { text?: string; done: boolean }) => void): (() => void) => {
    const listener = (_e: unknown, chunk: { text?: string; done: boolean }): void => cb(chunk);
    ipcRenderer.on(IpcChannels.ChatToken, listener);
    return () => ipcRenderer.removeListener(IpcChannels.ChatToken, listener);
  },

  ttsSpeak: (text: string, voice?: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.TtsSpeak, { text, voice }),

  onTtsState: (cb: (state: { speaking: boolean }) => void): (() => void) => {
    const listener = (_e: unknown, state: { speaking: boolean }): void => cb(state);
    ipcRenderer.on('tts:state', listener);
    return () => ipcRenderer.removeListener('tts:state', listener);
  },

  // ---- 退出 ----
  exitApp: (): Promise<void> => ipcRenderer.invoke(IpcChannels.WindowExit),

  // ---- 个人界面 ----
  /**
   * 通知主进程：打开个人界面窗口（独立 BrowserWindow）。
   * 已存在则聚焦，不会重复创建。
   */
  openPersonalWindow: (): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.PersonalOpen),

  /**
   * 通知主进程：关闭个人界面窗口。
   */
  closePersonalWindow: (): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.PersonalClose),
};

/**
 * 个人界面专属 API（personalApi）。
 *
 * 当前 pet preload 同时被桌面宠物窗口和个人界面窗口加载（共用一份
 * contextBridge），所以 personalApi 也从这里透出。
 *
 * 后续如果给 personal 切到独立 preload，把 personalApi 挪到
 * src/personal/preload.ts 即可，petApi 在那也会保留。
 */
const personalApi = {
  /** 占位：M1 阶段会替换为 login / billing / persona / agent 实际方法 */
  noop: (): Promise<null> => Promise.resolve(null),
};

contextBridge.exposeInMainWorld('personalApi', personalApi);

export type PersonalApi = typeof personalApi;

contextBridge.exposeInMainWorld('petApi', api);

export type PetApi = typeof api;
