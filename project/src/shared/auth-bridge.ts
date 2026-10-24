/**
 * 鉴权 IPC 桥 —— preload 侧的公共实现。
 *
 * preload 是 renderer 与主进程之间**唯一**的桥梁：
 * renderer 不允许直接 fetch 后端（否则无法统一加 token / 代理 / 日志，
 * 也违背 contextIsolation 的隔离原则）。
 *
 * 这里把「调用 → 解包 → 兜底」抽成工厂函数，
 * 让 src/preload/index.ts（当前个人界面实际使用的 preload）和
 * src/personal/preload.ts（未来切独立 preload 时用）共用同一份实现。
 */

import { IpcChannels } from './ipc-channels';
import {
  AuthErrorCode,
  resolveAuthErrorMessage,
  type ClientResult,
  type PersonalAuthApi,
} from './auth-types';

/** IPC 调用器（由 preload 注入具体实现） */
export type IpcInvoker = (channel: string, ...args: unknown[]) => Promise<unknown>;

/**
 * 清洗 IPC 调用自身的异常信息。
 *
 * Electron 会把主进程抛出的错误包成
 * `Error invoking remote method 'auth:login': <原始 message>`，
 * 这里把前缀去掉，只保留对用户有意义的部分。
 */
function cleanIpcError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const cleaned = raw
    .replace(/^Error invoking remote method '[^']*':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();
  return cleaned || '未知错误';
}

/**
 * 创建 personalApi 的鉴权部分。
 *
 * 约定：主进程 handler 永远返回 `ClientResult<T>`（不抛异常），
 * 这里再做一层兜底 —— 万一 handler 自己炸了（未注册 / 序列化失败），
 * 也要转成 `{ ok: false }`，绝不让原始 Error 冒到 UI。
 */
export function createPersonalAuthApi(invoke: IpcInvoker): PersonalAuthApi {
  const call = async <T>(channel: string, ...args: unknown[]): Promise<ClientResult<T>> => {
    try {
      const res = await invoke(channel, ...args);
      if (res && typeof res === 'object' && 'ok' in (res as Record<string, unknown>)) {
        return res as ClientResult<T>;
      }
      // 兼容「handler 直接返回裸数据」的老写法
      return { ok: true, data: res as T };
    } catch (err) {
      // 原始异常只进开发者控制台，UI 上只给可读提示
      console.error('[auth-bridge] IPC 调用失败:', channel, cleanIpcError(err));
      return {
        ok: false,
        code: AuthErrorCode.NETWORK_ERROR,
        message: resolveAuthErrorMessage(AuthErrorCode.NETWORK_ERROR),
      };
    }
  };

  return {
    authAnonymous: (input) => call(IpcChannels.AuthAnonymous, input),
    authRegister: (input) => call(IpcChannels.AuthRegister, input),
    authLogin: (input) => call(IpcChannels.AuthLogin, input),
    authRefresh: (refreshToken, baseUrl) =>
      call(IpcChannels.AuthRefresh, { refreshToken, baseUrl }),
    authGetProfile: () => call(IpcChannels.AuthGetProfile),
  };
}
