/**
 * 角色相关 IPC handler：
 *  - character:load       → 读单个 config（仅读，不写状态）
 *  - character:list       → 扫目录返回所有
 *  - character:get-active → 按"当前激活 baseId + 当前时间"算出当前应该显示的 variant id
 *  - character:set-active → 切换激活 baseId，并通过 IPC 推流通知 renderer
 *
 * 切换时主进程作为权威：renderer 不持有"当前激活 id"，避免主从失步。
 *
 * 时段自动切换：
 *  - 本模块接受一个 AutoTimeScheduler 实例（主进程入口 index.ts 注入）；
 *  - getActive 调用 scheduler.resolveVariantFor 在调用时按当前时间解析；
 *  - setActive 之后把激活 baseId 上报给 scheduler，让它立即按当前时间修正 variant 并推流。
 *
 * 状态：
 *  - activeBaseId 进程内变量，默认 'roxy'，不持久化（每次启动从 roxy 开始）。
 */

import { BrowserWindow, ipcMain, type IpcMain } from 'electron';
import { IpcChannels } from '../../shared/ipc-channels';
import {
  loadCharacterConfig,
  listCharacters,
} from '../character-loader';
import type { AutoTimeScheduler } from '../auto-time-scheduler';

const DEFAULT_BASE_ID = 'roxy';

export function registerCharacterIpc(
  ipcMain_: typeof ipcMain | IpcMain,
  getMainWindow: () => BrowserWindow | null,
  autoTimeScheduler?: AutoTimeScheduler,
): void {
  /**
   * 当前激活的 baseId（'roxy' / 'ailisi'）。
   * 不持久化：每次启动默认 'roxy'。
   * 用 baseId（而不是完整 id）是因为同 baseId 下有 day/night 两个 variant，
   * 真正的 variant 由 scheduler.resolveVariantFor 在调用时按当前时间动态解析。
   */
  let activeBaseId: string = DEFAULT_BASE_ID;

  ipcMain_.handle(IpcChannels.CharacterLoad, (_evt, characterId: string) => {
    // 仅返回 config；不修改 activeBaseId，避免启动时 character:load 副作用
    // 绕过 scheduler 把状态写死成 day 模型（修"启动时不能按时间选 day/night"）。
    return loadCharacterConfig(characterId);
  });

  ipcMain_.handle(IpcChannels.CharacterList, () => {
    return listCharacters();
  });

  ipcMain_.handle(IpcChannels.CharacterGetActive, () => {
    if (!autoTimeScheduler) return null;
    // 顺手把当前 activeBaseId 同步给 scheduler，让它的 60s tick 巡检能识别
    // "激活的 baseId 是哪个"，否则首次启动走 CharacterGetActive 后 scheduler 那边
    // 仍然 activeBaseId===null，跨阈值自动切换永远不触发。
    autoTimeScheduler.setActiveBaseId(activeBaseId);
    return autoTimeScheduler.resolveVariantFor(activeBaseId, new Date())?.id ?? null;
  });

  ipcMain_.handle(IpcChannels.CharacterSetActive, async (_evt, characterId: string) => {
    const cfg = loadCharacterConfig(characterId);
    if (!cfg) return false;
    // 把完整 id 归一化成 baseId（'roxy' / 'ailisi'）；缺 baseId 则保留旧值兜底。
    const baseId = cfg.meta?.baseId;
    if (typeof baseId === 'string' && baseId.length > 0) {
      activeBaseId = baseId;
    }

    // 时段自动修正：scheduler 会按当前时间解析出合适的 variant 并通过 onResolved 推流。
    if (autoTimeScheduler) {
      autoTimeScheduler.onActiveChanged(activeBaseId, (resolved) => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('character:active-changed', resolved);
        }
      });
    } else {
      // 没有 scheduler 时退化：直接把用户选的角色推流（不做时间修正）。
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('character:active-changed', cfg);
      }
    }
    return true;
  });
}