/**
 * TTS Adapter —— 语音合成适配层。
 *
 * 流式协议：渲染层只发 "speak"，订阅 'tts:state'。
 * 真实落地时由主进程实现 speak，并 push speaking 状态。
 */

import type { EventBus } from './event-bus';

export interface TtsAdapterOptions {
  bus: EventBus;
  speak: (text: string, voice?: string) => Promise<boolean>;
  onState?: (cb: (state: { speaking: boolean }) => void) => () => void;
}

export class TtsAdapter {
  private readonly opts: TtsAdapterOptions;
  private disposeState: (() => void) | null = null;

  constructor(opts: TtsAdapterOptions) {
    this.opts = opts;
  }

  start(): void {
    this.disposeState?.();
    if (this.opts.onState) {
      this.disposeState = this.opts.onState((state) => {
        this.opts.bus.emit('tts:state', { speaking: !!state.speaking });
      });
    }
  }

  dispose(): void {
    this.disposeState?.();
    this.disposeState = null;
  }

  async speak(text: string, voice?: string): Promise<boolean> {
    return await this.opts.speak(text, voice);
  }
}
