/**
 * 鉴权模块的 HTTP 客户端（主进程侧）。
 *
 * 对应后端 4 个接口：
 *   POST /v1/auth/anonymous  匿名注册（拿匿名身份）
 *   POST /v1/auth/register   匿名升级为正式用户（需要 Authorization 头）
 *   POST /v1/auth/login      用户名密码登录
 *   POST /v1/auth/refresh    用 refresh token 续期
 *
 * 统一返回后端的 AuthResponse；失败时抛 ApiError（带业务错误码）。
 */

import { apiRequest, ApiError } from './http-client';
import { AuthErrorCode, resolveAuthErrorMessage } from '../../shared/auth-types';
import type {
  AnonymousRegisterInput,
  AuthResponse,
  LoginInput,
  RegisterInput,
} from '../../shared/auth-types';

/** 需要保留 64 位整数精度的字段（雪花 ID） */
const BIGINT_STRING_FIELDS = ['userId'];

export interface AuthCallOptions {
  /** 覆盖默认后端地址 */
  baseUrl?: string | null;
  /** 超时（毫秒） */
  timeoutMs?: number;
}

/**
 * 校验后端返回的会话数据是否完整。
 *
 * 后端偶发返回空 data 或缺字段时，这里直接转成明确的服务端错误，
 * 避免把 undefined 一路传到 renderer 才崩。
 */
function assertAuthResponse(data: AuthResponse | null | undefined): AuthResponse {
  const ok =
    !!data &&
    typeof data === 'object' &&
    typeof data.accessToken === 'string' &&
    typeof data.refreshToken === 'string';
  if (!ok) {
    throw new ApiError(
      AuthErrorCode.SERVER_ERROR,
      resolveAuthErrorMessage(AuthErrorCode.SERVER_ERROR, '后端返回的登录信息不完整'),
    );
  }
  return data;
}

/**
 * 匿名注册。
 *
 * 首次启动时自动调用，让用户不注册也能用（匿名可用是后端的设计）。
 */
export async function anonymousRegister(
  input: AnonymousRegisterInput,
  options: AuthCallOptions = {},
): Promise<AuthResponse> {
  const payload: Record<string, unknown> = { deviceId: input.deviceId };
  if (input.deviceName) payload['deviceName'] = input.deviceName;
  if (input.osVersion) payload['osVersion'] = input.osVersion;
  if (input.appVersion) payload['appVersion'] = input.appVersion;

  const data = await apiRequest<AuthResponse>('/v1/auth/anonymous', {
    method: 'POST',
    body: payload,
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    bigintStringFields: BIGINT_STRING_FIELDS,
  });
  return assertAuthResponse(data);
}

/**
 * 升级注册：匿名用户 → 正式用户。
 *
 * 后端要求带 `Authorization: Bearer <匿名 access token>`。
 */
export async function upgradeRegister(
  input: RegisterInput,
  options: AuthCallOptions = {},
): Promise<AuthResponse> {
  const payload: Record<string, unknown> = {
    username: input.username,
    password: input.password,
  };
  if (input.email) payload['email'] = input.email;

  const data = await apiRequest<AuthResponse>('/v1/auth/register', {
    method: 'POST',
    body: payload,
    token: input.accessToken ?? null,
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    bigintStringFields: BIGINT_STRING_FIELDS,
  });
  return assertAuthResponse(data);
}

/** 用户名密码登录 */
export async function login(
  input: LoginInput,
  options: AuthCallOptions = {},
): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/v1/auth/login', {
    method: 'POST',
    body: { username: input.username, password: input.password },
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    bigintStringFields: BIGINT_STRING_FIELDS,
  });
  return assertAuthResponse(data);
}

/** 用 refresh token 换新的 token 对 */
export async function refresh(
  refreshToken: string,
  options: AuthCallOptions = {},
): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    bigintStringFields: BIGINT_STRING_FIELDS,
  });
  return assertAuthResponse(data);
}
