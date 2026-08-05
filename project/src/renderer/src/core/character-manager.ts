/**
 * CharacterManager —— 拥有当前角色实例，响应切换 / 释放 / 缩放；
 *
 * 监听主进程推流的"激活角色变更"事件，用户从菜单切角色：
 *  - 用 fadeTo(0) 把 root alpha 渐黑 → 销毁旧 ICharacter
 *  - 用 factory 创建新实例（保持 alpha=0）
 *  - root.addChild(newContainer) → fadeTo(1) 渐显
 *  - 重新计算窗口尺寸（applyScale）
 *
 * 事件：
 *  - 'character:loaded'    —— 新角色已挂上
 *  - 'character:disposed'  —— 旧角色已销毁
 */

import { Application, Container } from 'pixi.js';
import type { EventBus } from './event-bus';
import type { ICharacter } from './i-character';
import type { CharacterConfig } from '../../../shared/character-config';
import {
  createCharacter,
  resolveCharacterUrls,
  type ResourceUrls,
} from './character-factory';

export type Adapter = {
  /** 当前 host 上的 PetApi：能调 resizeWindow / loadCharacter */
  loadCharacter: (id: string) => Promise<CharacterConfig | null>;
  resizeWindow: (size: { width: number; height: number }) => Promise<boolean>;
};

const SCALE_MIN = 0.2;
const SCALE_MAX = 1.5;
const SCALE_STEP = 0.1;
const SCALE_DEFAULT = 0.5;

/** 渐黑过渡默认时长 */
const FADE_OUT_MS = 200;
const FADE_IN_MS = 200;

export interface CharacterManagerOptions {
  bus: EventBus;
  /** PIXI 根容器，角色会挂到这里 */
  root: Container;
  /** Electron / Vue 自定义适配：提供 loadCharacter / resizeWindow */
  adapter: Adapter;
  /** scale 变化时通知外部（菜单缩放 CSS 等） */
  onScaleChanged?: (scale: number) => void;
  /** URL 解析器（document.baseURI 或 Vue 容器 baseURI） */
  toAbsolute: (p: string) => string;
  /** 可选：首次启动默认缩放（来自 config.meta.displayScale） */
  initialScale?: number;
  /**
   * 可选：拖拽中的二次防御。
   * 返回 true 时 applyScale 不会下发 resizeWindow —— 即使主进程的 drag-start IPC
   * 比本次 resizeWindow IPC 晚到，也不会穿透到 setSize。
   * 主进程侧 WindowState 也会在 isDragging 期间挂起所有 tryResize，是双保险。
   */
  isDragging?: () => boolean;
  /**
   * 可选：传入 pixi Application 用于 tween ticker。
   * 不传时 fadeTo 退化为"立即设 alpha"（无动画），便于单元测试 / 非 pixi host。
   */
  app?: Application;
  /** 可选：过渡时长（毫秒）。fadeOut / fadeIn 各自独立 */
  transition?: { fadeOutMs?: number; fadeInMs?: number };
}

export class CharacterManager {
  private current: ICharacter | null = null;
  private currentConfig: CharacterConfig | null = null;
  private currentScale: number;
  private readonly opts: CharacterManagerOptions;
  /** 当前根容器 alpha；fadeTo 期间会变 */
  private rootAlpha = 1;

  constructor(opts: CharacterManagerOptions) {
    this.opts = opts;
    this.currentScale = opts.initialScale ?? SCALE_DEFAULT;
  }

  get character(): ICharacter | null {
    return this.current;
  }

  get scale(): number {
    return this.currentScale;
  }

  get config(): CharacterConfig | null {
    return this.currentConfig;
  }

  /** 切换 scale + 同步窗口尺寸 */
  async applyScale(next: number): Promise<void> {
    if (!this.current) return;
    // 防御：拖拽期间不下发 resizeWindow，避免任何 race 在主进程 setSize
    if (this.opts.isDragging?.()) return;
    const s = Math.min(SCALE_MAX, Math.max(SCALE_MIN, next));
    this.currentScale = s;
    this.opts.root.scale.set(s);
    this.opts.onScaleChanged?.(s);
    this.opts.bus.emit('stage:scale', { scale: s });
    const w = Math.max(64, Math.round(this.current.imageSize.width * s));
    const h = Math.max(64, Math.round(this.current.imageSize.height * s));
    await this.opts.adapter.resizeWindow({ width: w, height: h });
  }

  /**
   * 加载并挂载一个角色；如已有角色则先销毁。
   * 加载成功后自动 applyScale 当前缩放，把窗口拉伸到合适的尺寸。
   *
   * 切换角色时**继承**用户上次调好的缩放因子（this.currentScale）与窗口位置：
   *  - 缩放：applyScale 使用持久化的 currentScale，新角色的 imageSize * scale 得到新窗口尺寸
   *  - 位置：applyScale 只调用 resizeWindow（仅改 size，不改 position），由 IPC 链路保证位置不动
   * 这样用户先调好大小和位置再切角色，视觉上不会出现"窗口被重置到默认"的跳变。
   */
  async load(config: CharacterConfig): Promise<void> {
    if (this.current) {
      this.opts.bus.emit('character:disposed', { id: this.current.info.id });
      this.current.container.parent?.removeChild(this.current.container);
      this.current.dispose();
      this.current = null;
    }
    const urls = resolveCharacterUrls(config, this.opts.toAbsolute);
    const character = await createCharacter({ config, urls: urls as ResourceUrls });
    this.opts.root.addChild(character.container);
    this.current = character;
    this.currentConfig = config;
    this.opts.bus.emit('character:loaded', {
      id: config.id,
      displayName: config.displayName,
    });
    // 用上一次保存的缩放因子重新计算窗口尺寸 —— 位置由 resizeWindow IPC 链路保持不动。
    await this.applyScale(this.currentScale);
  }

  /**
   * 切换（来自主进程推流的 active-changed 事件）。
   *
   * 流程：
   *  1. 当前存在旧角色 → fadeTo(0) 把 root 渐黑（消除硬切闪屏）
   *  2. load(config) 销毁旧 + 创建新（继承 currentScale，窗口位置不动）
   *  3. fadeTo(1) 把 root 渐显
   *
   * 首次启动 current==null 时跳过 fadeOut 直接 load，避免启动黑屏。
   */
  async switchTo(config: CharacterConfig): Promise<void> {
    const fadeOutMs = this.opts.transition?.fadeOutMs ?? FADE_OUT_MS;
    const fadeInMs = this.opts.transition?.fadeInMs ?? FADE_IN_MS;

    if (this.current) {
      await this.fadeTo(0, fadeOutMs);
    }

    // 把新角色先以 alpha=0 挂上，避免 fadeIn 之前闪一帧
    await this.load(config);
    this.setRootAlpha(0);

    await this.fadeTo(1, fadeInMs);
  }

  /** 触发互动动画 */
  triggerTap(): boolean {
    if (!this.current) return false;
    this.opts.bus.emit('character:tap', { id: this.current.info.id });
    return this.current.triggerTap?.() ?? false;
  }

  dispose(): void {
    if (this.current) {
      this.opts.bus.emit('character:disposed', { id: this.current.info.id });
      this.current.dispose();
      this.current = null;
    }
  }

  /**
   * 立即设置 root alpha（不动画）。用于"load 之后立刻把 root 拉到 0 再 fadeIn"。
   */
  private setRootAlpha(alpha: number): void {
    this.rootAlpha = alpha;
    this.opts.root.alpha = alpha;
  }

  /**
   * 把 root.alpha 从当前值缓动到 target；完成时 resolve。
   * 用 elapsed/durationMs 推进 + ease-out 缓动；时长可控，与帧率解耦。
   * 无新依赖（pixi.js 自带 ticker）。
   */
  private fadeTo(target: number, durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const app = this.opts.app;
      // 无 ticker 或 durationMs<=0：立即设值并 resolve（保留同步语义）
      if (!app || durationMs <= 0) {
        this.setRootAlpha(target);
        resolve();
        return;
      }

      const startAlpha = this.rootAlpha;
      const startTime = performance.now();

      const tickerFn = (): void => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / durationMs);
        // ease-out quad：起始快、末段慢
        const eased = 1 - (1 - t) * (1 - t);
        const alpha = startAlpha + (target - startAlpha) * eased;
        this.setRootAlpha(alpha);
        if (t >= 1) {
          this.setRootAlpha(target);
          app.ticker.remove(tickerFn);
          resolve();
        }
      };
      app.ticker.add(tickerFn);
    });
  }
}