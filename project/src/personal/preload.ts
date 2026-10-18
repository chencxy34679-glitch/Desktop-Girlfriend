/**
 * Personal Window preload 脚本。
 *
 * 设计原则：
 *  - 与桌面宠物窗口共用 petApi（都通过 window.petApi 调用主进程能力）
 *  - 个人界面特有的鉴权 / 会员 / Agent 等 API 走 personalApi，独立命名空间
 *  - 当前是骨架占位；M1 阶段按业务逐条补 personalApi 的方法
 *
 * 注意：本文件由主进程以 sandbox: true 加载，只能用 electron 的 contextBridge / ipcRenderer。
 *
 * 注意：当前 `personal-window.ts` 直接复用 `src/preload/index.ts`，所以
 * `window.petApi` 已经包含完整的桌面宠物 API。这里再透出一份 petBridge 是
 * 显式声明 —— 后续如果给 personal window 切到独立 preload，这里就能保持 API 不变。
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from '../shared/ipc-channels';

// 个人界面专属 API（占位）。M1 阶段按业务逐条补：
//  - login / register / refresh JWT
//  - billing plans / 支付订单 / 积分余额
//  - persona 设置 / agent tools / RAG 文档
const personalApi = {
  /** 占位：M1 阶段会替换成实际的 auth 方法 */
  noop: (): Promise<null> => Promise.resolve(null),
};

contextBridge.exposeInMainWorld('personalApi', personalApi);

export type PersonalApi = typeof personalApi;

// 同时把 petApi 也透出来 —— 个人界面想看桌面宠物的状态、远程触发 chatAsk 等
// 都可以走 petApi，不用重新连一份 contextBridge
const petBridge = {
  getActiveCharacter: (): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.CharacterGetActive),
  listCharacters: (): Promise<unknown[]> =>
    ipcRenderer.invoke(IpcChannels.CharacterList) as Promise<unknown[]>,
  chatAsk: (text: string, characterId?: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.ChatAsk, { text, characterId }),
  onChatToken: (
    cb: (chunk: { text?: string; done: boolean }) => void,
  ): (() => void) => {
    const listener = (
      _e: unknown,
      chunk: { text?: string; done: boolean },
    ): void => cb(chunk);
    ipcRenderer.on(IpcChannels.ChatToken, listener);
    return () => ipcRenderer.removeListener(IpcChannels.ChatToken, listener);
  },
};

contextBridge.exposeInMainWorld('petApi', petBridge);
export type PetApiBridge = typeof petBridge;