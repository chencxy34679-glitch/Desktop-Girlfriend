/**
 * 角色时段自动切换器（艾莉丝日/夜等共享 baseId 的多套服装）。
 *
 * 设计目标：
 *  - 主进程作为"激活角色"的单一权威；切换只在主进程发生，renderer 只消费推流。
 *  - 进程内仅跟踪 "激活的 baseId"（例如 'roxy' / 'ailisi'），
 *    真正的 variant id 由 resolveVariantFor 在调用时按当前时间动态算出。
 *  - 同 baseId 存在多个 variant（day/night）时，根据当前系统时间自动选最匹配的；
 *    每分钟 tick 巡检一次，跨过日夜阈值时主动推送新 config 给 renderer。
 *
 * 触发点：
 *  1. setActiveCharacter(id) 之后 → 从 cfg.meta.baseId 提取 baseId，调 onActiveChanged。
 *  2. setInterval 每 60s 巡检一次；当前 variant 与时段不匹配时切换并推流。
 *
 * 旁路：
 *  - 角色 config.meta.autoTimeSwitch !== true 时，本调度器不会切换该 baseId。
 *  - 不在主进程持久化"用户手动锁定 variant"或"激活 baseId"的状态；
 *    如未来需要，可在此加锁。
 */

import { BrowserWindow } from 'electron';
import {
  loadCharacterConfig,
  listCharacters,
} from './character-loader';
import type { CharacterConfig, CharacterSummary } from '../shared/character-config';

const DEFAULT_NIGHT_START_HOUR = 18; // 18:00 起进入夜晚
const DEFAULT_NIGHT_END_HOUR = 6;    // 06:00 离开夜晚

/**
 * 判断某个角色是否参与"时段自动切换"。
 * 条件：meta.autoTimeSwitch === true 且 meta.baseId 是字符串。
 */
export function isAutoTimeSwitchCharacter(cfg: CharacterConfig): boolean {
  return !!cfg.meta?.autoTimeSwitch && typeof cfg.meta?.baseId === 'string';
}

/**
 * 给定 Date，判断现在属于哪个 variant。
 * - nightStart..nightEnd 表示夜晚区间（可跨午夜）。
 * - 返回 'night' / 'day' 字符串，供匹配 cfg.meta.variant 使用。
 */
export function currentTimeVariant(
  now: Date,
  nightStart: number,
  nightEnd: number,
): 'day' | 'night' {
  const h = now.getHours();
  // 例如 nightStart=18, nightEnd=6：h>=18 或 h<6 → 夜
  if (nightStart <= nightEnd) {
    return h >= nightStart && h < nightEnd ? 'night' : 'day';
  }
  // 跨午夜：h>=18 或 h<6 → 夜
  return h >= nightStart || h < nightEnd ? 'night' : 'day';
}

/**
 * 在同 baseId 的角色里，找出"meta.autoTimeSwitch === true 且 variant 完整"的那个，
 * 用于读取 nightStartHour / nightEndHour；找不到则回退到任意同 baseId 的角色。
 */
function pickTimeSourceCfg(
  candidates: CharacterSummary[],
): CharacterConfig | null {
  for (const s of candidates) {
    const cfg = loadCharacterConfig(s.id);
    if (!cfg) continue;
    if (isAutoTimeSwitchCharacter(cfg)) return cfg;
  }
  if (candidates.length === 0) return null;
  return loadCharacterConfig(candidates[0].id);
}

export interface AutoTimeSchedulerOptions {
  /** 拿到主窗口引用，用来推流 'character:active-changed' */
  getMainWindow: () => BrowserWindow | null;
  /** 写日志（可选；不传则不打） */
  log?: (msg: string) => void;
}

/**
 * 自动切换调度器实例：单例，挂在主进程启动时构造。
 */
export class AutoTimeScheduler {
  private timer: NodeJS.Timeout | null = null;
  private activeBaseId: string | null = null;
  /** tick 上一次 resolve 出的 variant id；用于判定"时段是否变了"再推流 */
  private lastResolvedId: string | null = null;

  constructor(private readonly opts: AutoTimeSchedulerOptions) {}

  /**
   * 给定 baseId + 当前时间，解析出"现在该显示的 variant 配置"。
   *  - 找不到同 baseId 的角色 → 返回 null
   *  - 找到但目标 variant 缺失 → 回退到同 baseId 的任意一个
   *  - baseId 不参与 autoTimeSwitch → 仍然按列表里的 variant 兜底（不强限制），
   *    让上层（ipc/character）拿到一个具体 id。
   */
  resolveVariantFor(
    baseId: string,
    atTime: Date,
  ): CharacterConfig | null {
    const all = listCharacters();
    const candidates = all.filter(
      (s): s is CharacterSummary & { baseId: string } => s.baseId === baseId,
    );
    if (candidates.length === 0) return null;

    const sourceCfg = pickTimeSourceCfg(candidates);
    if (!sourceCfg) return null;

    const nightStart =
      sourceCfg.meta?.nightStartHour ?? DEFAULT_NIGHT_START_HOUR;
    const nightEnd =
      sourceCfg.meta?.nightEndHour ?? DEFAULT_NIGHT_END_HOUR;
    const desired = currentTimeVariant(atTime, nightStart, nightEnd);

    const target = candidates.find((s) => s.variant === desired);
    const pickedId = target?.id ?? candidates[0].id;
    return loadCharacterConfig(pickedId);
  }

  /**
   * 当前激活角色变化时由外部（IPC handler）通知本类。
   * 调用方传入的是 baseId（如 'roxy' / 'ailisi'）；内部立即按当前时间 resolve
   * 出 variant 配置；若新配置有效则更新内部状态 + 触发 onResolved 回调。
   *
   * onResolved 通常是"推流给 renderer"。
   */
  onActiveChanged(
    baseId: string,
    onResolved: (cfg: CharacterConfig) => void,
  ): void {
    this.activeBaseId = baseId;
    const resolved = this.resolveVariantFor(baseId, new Date());
    if (resolved) {
      this.lastResolvedId = resolved.id;
      onResolved(resolved);
    }
  }

  /**
   * 同步激活 baseId 但不触发推流。
   * 用途：CharacterGetActive（启动时仅查询当前应显示的 variant id）需要让 scheduler
   * 也知道当前 baseId 是什么，否则后续 60s tick 会因 activeBaseId===null 而短路、
   * 导致跨阈值自动切换永远不触发。
   */
  setActiveBaseId(baseId: string): void {
    this.activeBaseId = baseId;
    // 同步更新 lastResolvedId 为当前时段解析出的 variant，避免下一次 tick
    // 把当前已经显示的角色当成"时段变了"误推一次流。
    const resolved = this.resolveVariantFor(baseId, new Date());
    if (resolved) {
      this.lastResolvedId = resolved.id;
    }
  }

  /**
   * 启动每分钟巡检；可重复调用，内部幂等。
   */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 单次巡检：若当前 baseId 的时段 variant 与上次 resolve 不同，
   * 则重新 resolve 并推流。
   */
  private async tick(): Promise<void> {
    if (!this.activeBaseId) return;
    const resolved = this.resolveVariantFor(
      this.activeBaseId,
      new Date(),
    );
    if (!resolved) return;
    if (resolved.id === this.lastResolvedId) return;

    this.lastResolvedId = resolved.id;
    const win = this.opts.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('character:active-changed', resolved);
    }
    this.opts.log?.(
      `[auto-time] ${this.activeBaseId} → ${resolved.id} (variant=${resolved.meta?.variant})`,
    );
  }
}