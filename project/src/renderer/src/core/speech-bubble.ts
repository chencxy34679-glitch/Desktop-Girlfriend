/**
 * 聊天气泡 —— 简易 DOM 气泡。
 *
 * 不依赖任何框架；附着在父容器（宠物窗口 / Vue 容器）上方。
 *
 * 工作协议：
 *  - 订阅 'chat:reply' 增量 token，积累后渲染
 *  - 短时无新 token 时自动收起（避免遮挡太久）
 *  - 收到 done=true 时保留最后一句 n 秒再淡出
 */

import type { EventBus } from './event-bus';

export interface SpeechBubbleOptions {
  bus: EventBus;
  parent: HTMLElement;
  /**
   * 气泡相对 root 容器的位置。
   * 默认在 root 上方居中（top=-10px, left=50%），可通过 CSS 变量 `--pet-bubble-*` 调
   */
  autoHideAfter?: number; // 完全接收完成后多久淡出（ms），默认 4000
}

const DEFAULT_AUTO_HIDE_MS = 4000;

export class SpeechBubble {
  private readonly opts: Required<SpeechBubbleOptions>;
  private el: HTMLDivElement | null = null;
  private cur = '';
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private disposeBus: (() => void) | null = null;

  constructor(opts: SpeechBubbleOptions) {
    this.opts = {
      parent: opts.parent,
      bus: opts.bus,
      autoHideAfter: opts.autoHideAfter ?? DEFAULT_AUTO_HIDE_MS,
    };
  }

  private ensureEl(): HTMLDivElement {
    if (this.el) return this.el;
    const el = document.createElement('div');
    el.className = 'pet-speech-bubble';
    el.style.cssText = `
      position: absolute;
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%);
      max-width: 80%;
      min-width: 60px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.92);
      color: #1a3a52;
      font: 13px/1.5 -apple-system, "Microsoft YaHei", sans-serif;
      border-radius: 10px;
      border: 1px solid rgba(140, 190, 220, 0.85);
      box-shadow: 0 4px 14px rgba(80, 120, 160, 0.18);
      white-space: pre-wrap;
      opacity: 0;
      transition: opacity 0.18s ease;
      pointer-events: none;
      z-index: 1000;
    `;
    this.opts.parent.appendChild(el);
    this.el = el;
    return el;
  }

  private show(text: string): void {
    const el = this.ensureEl();
    el.textContent = text;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  }

  private scheduleHide(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (this.el) this.el.style.opacity = '0';
    }, this.opts.autoHideAfter);
  }

  start(): void {
    this.disposeBus?.();
    this.disposeBus = this.opts.bus.on('chat:reply', ({ text, done }) => {
      this.cur += text;
      this.show(this.cur);
      if (done) {
        this.scheduleHide();
        this.cur = '';
      }
    });
  }

  dispose(): void {
    this.disposeBus?.();
    this.disposeBus = null;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    this.cur = '';
  }
}
