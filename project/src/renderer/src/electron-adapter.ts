/**
 * Electron 适配层 —— 把 window.petApi 包成 core/ 各个模块需要的接口。
 *
 * 这里**不**重复声明 Window.petApi：类型由 src/preload/index.ts 单一来源提供，
 * src/renderer/src/global.d.ts 通过 import 引用它，避免重复 augmentation。
 */

import type { PetApi } from '../../preload';
import type { ChatAdapterOptions } from './core/chat-adapter';
import type { TtsAdapterOptions } from './core/tts-adapter';
import type { Adapter as CharacterAdapter } from './core/character-manager';

// 从 window.petApi 取字符适配（renderer / preload 注入）
function api(): PetApi {
  return window.petApi;
}

export const characterAdapter: CharacterAdapter = {
  loadCharacter: (id) => api().loadCharacter(id),
  resizeWindow: (size) => api().resizeWindow(size),
};

/** 构造 Chat 适配器所需的 IPC 入口；bus 由调用方在 main.ts 里注入 */
export function makeChatAsk(): ChatAdapterOptions['ask'] {
  return (text: string) => api().chatAsk(text);
}
export function makeChatOnToken(): ChatAdapterOptions['onToken'] {
  return (cb) => api().onChatToken(cb);
}

export function makeTtsSpeak(): TtsAdapterOptions['speak'] {
  return (text, voice) => api().ttsSpeak(text, voice);
}
export function makeTtsOnState(): TtsAdapterOptions['onState'] {
  return (cb) => api().onTtsState(cb);
}

/** 主进程能力桥：订阅"激活角色变更"事件 */
export function onActiveCharacterChanged(
  cb: (cfg: import('../../shared/character-config').CharacterConfig) => void,
): () => void {
  return api().onCharacterChanged(cb);
}
