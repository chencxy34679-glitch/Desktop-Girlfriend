/**
 * 鉴权相关 IPC handler。
 *
 * 协议约定（与 src/shared/auth-types.ts 一致）：
 *  - handler **不抛异常**，永远返回 `ClientResult<T>`；
 *  - 业务错误码在主进程翻译成用户可读的中文提示；
 *  - 原始异常 / stack 只写主进程控制台，绝不外泄到 renderer。
 *
 * 这样做的原因：Electron 的 ipcRenderer.invoke 会把主进程抛出的 Error
 * 序列化成字符串，自定义字段（错误码）会丢失，renderer 无法区分
 * 「token 过期」和「参数错误」。
 */

import { app, ipcMain, type IpcMain } from 'electron';
import os from 'node:os';

import { IpcChannels } from '../../shared/ipc-channels';
import { API_BASE_URL } from '../../shared/api-config';
import {
  AuthErrorCode,
  resolveAuthErrorMessage,
  type AnonymousRegisterInput,
  type AuthProfile,
  type AuthResponse,
  type ClientResult,
  type LoginInput,
  type RegisterInput,
} from '../../shared/auth-types';
import { ApiError } from '../api/http-client';
import {
  anonymousRegister,
  login,
  refresh,
  upgradeRegister,
} from '../api/auth-client';

/** 失败结果：统一出口，保证不会把 stack 带给前端 */
function toFailure(err: unknown): { ok: false; code: number; message: string } {
  if (err instanceof ApiError) {
    return {
      ok: false,
      code: err.code,
      message: resolveAuthErrorMessage(err.code, err.message),
    };
  }

  // 兜底：未知异常只记主进程日志，前端给一句通用提示
  console.error('[auth] 未预期的错误:', err);
  return {
    ok: false,
    code: AuthErrorCode.SERVER_ERROR,
    message: resolveAuthErrorMessage(AuthErrorCode.SERVER_ERROR),
  };
}

/** 注册鉴权相关 IPC handler */
export function registerAuthIpc(ipcMain_: typeof ipcMain | IpcMain = ipcMain): void {
  // ---- 匿名注册 ----
  ipcMain_.handle(
    IpcChannels.AuthAnonymous,
    async (_evt, payload: AnonymousRegisterInput): Promise<ClientResult<AuthResponse>> => {
      try {
        const data = await anonymousRegister(payload ?? { deviceId: '' }, {
          baseUrl: payload?.baseUrl ?? null,
        });
        return { ok: true, data };
      } catch (err) {
        return toFailure(err);
      }
    },
  );

  // ---- 升级为正式用户 ----
  ipcMain_.handle(
    IpcChannels.AuthRegister,
    async (_evt, payload: RegisterInput): Promise<ClientResult<AuthResponse>> => {
      try {
        const data = await upgradeRegister(payload, {
          baseUrl: payload?.baseUrl ?? null,
        });
        return { ok: true, data };
      } catch (err) {
        return toFailure(err);
      }
    },
  );

  // ---- 登录 ----
  ipcMain_.handle(
    IpcChannels.AuthLogin,
    async (_evt, payload: LoginInput): Promise<ClientResult<AuthResponse>> => {
      try {
        const data = await login(payload, {
          baseUrl: payload?.baseUrl ?? null,
        });
        return { ok: true, data };
      } catch (err) {
        return toFailure(err);
      }
    },
  );

  // ---- token 续期 ----
  ipcMain_.handle(
    IpcChannels.AuthRefresh,
    async (
      _evt,
      payload: { refreshToken?: string; baseUrl?: string },
    ): Promise<ClientResult<AuthResponse>> => {
      try {
        if (!payload?.refreshToken) {
          return {
            ok: false,
            code: AuthErrorCode.REFRESH_TOKEN_INVALID,
            message: resolveAuthErrorMessage(AuthErrorCode.REFRESH_TOKEN_INVALID),
          };
        }
        const data = await refresh(payload.refreshToken, {
          baseUrl: payload.baseUrl ?? null,
        });
        return { ok: true, data };
      } catch (err) {
        return toFailure(err);
      }
    },
  );

  // ---- 设备 / 运行环境信息 + 当前后端地址 ----
  ipcMain_.handle(
    IpcChannels.AuthGetProfile,
    async (): Promise<ClientResult<AuthProfile>> => {
      try {
        const profile: AuthProfile = {
          baseUrl: API_BASE_URL,
          platform: process.platform,
          osVersion: `${os.type()} ${os.release()}`,
          arch: process.arch,
          appVersion: app.getVersion(),
          electronVersion: process.versions.electron ?? '',
          nodeVersion: process.versions.node ?? '',
        };
        return { ok: true, data: profile };
      } catch (err) {
        return toFailure(err);
      }
    },
  );
}
