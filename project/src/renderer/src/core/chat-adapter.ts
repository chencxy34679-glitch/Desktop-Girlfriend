/**
 * ChatAdapter —— 渲染层调用 Chat 功能的适配层。
 *
 * 不直接接触 IPC：抽象成 `ask(text)` 拉回复流。
 * Electron 注入实现：把 ask 路由到 window.petApi.chatAsk 并把 token 流回。
 * Vue 嵌入场景：可直接用 fetch 调用外部 LLM。
 *
 * 当前架构：流式 token 通过订阅拿到，调用方拿到最终字符串后渲染气泡。
 */

import type { EventBus } from './event-bus';

export interface ChatAdapterOptions {
  bus: EventBus;
  /** 发起请求（主进程代理调用 / Vue 环境直接 fetch） */
  ask: (text: string) => Promise<boolean>;
  /** 订阅 token 流；返回解绑函数 */
  onToken: (cb: (chunk: { text?: string; done: boolean }) => void) => () => void;
  /** 当前激活角色（可选） */
  getActiveCharacterId?: () => string | null;
}

export class ChatAdapter {
  private readonly opts: ChatAdapterOptions;
  private disposeTokenListener: (() => void) | null = null;

  constructor(opts: ChatAdapterOptions) {
    this.opts = opts;
  }

  /** 订阅 chat:reply 事件，便于 speech-bubble 等模块直接渲染 */
  start(): void {
    this.disposeTokenListener?.();
    this.disposeTokenListener = this.opts.onToken((chunk) => {
      this.opts.bus.emit('chat:reply', {
        text: chunk.text ?? '',
        done: !!chunk.done,
      });
    });
  }

  dispose(): void {
    this.disposeTokenListener?.();
    this.disposeTokenListener = null;
  }

  /** 发起一次对话 */
  async ask(text: string): Promise<boolean> {
    if (!text.trim()) return false;
    const characterId = this.opts.getActiveCharacterId?.() ?? undefined;
    return await this.opts.ask(text);
  }
}
