/**
 * 主进程 HTTP 客户端 —— 后端 REST 调用的统一出口。
 *
 * 职责：
 *  1. 统一拼 URL / header / 超时
 *  2. 解包后端的 `{ code, message, data }` 信封
 *  3. code !== 0 时抛 ApiError（带业务错误码），由调用方翻译成中文提示
 *  4. 保留 64 位整数（雪花 ID）的精度
 *
 * 为什么放在主进程：
 *  - renderer 不能直接访问后端（统一加 token / 代理 / 日志，也避免暴露密钥）
 *  - Node 侧有完整的 fetch / AbortController，行为比 renderer 更可控
 *
 * 使用 Node 内置 fetch（Electron 33 自带 Node 20+），不引入额外依赖。
 */

import { API_BASE_URL, normalizeApiBaseUrl } from '../../shared/api-config';
import { AuthErrorCode, resolveAuthErrorMessage } from '../../shared/auth-types';

/** 业务错误：带后端错误码，供上层决定是否续期 / 重试 */
export class ApiError extends Error {
  /** 后端业务错误码（网络层错误用 -1） */
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** 默认超时（毫秒）。LLM 流式接口需要另设更长超时，不走这个默认值。 */
export const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 请求体；对象会被 JSON.stringify */
  body?: unknown;
  /** Bearer token；传了才会带 Authorization 头 */
  token?: string | null;
  /** 超时（毫秒），默认 15s */
  timeoutMs?: number;
  /** 覆盖默认 base url（桌面端「设置」里改过地址时用） */
  baseUrl?: string | null;
  /**
   * 需要保留 64 位整数精度的字段名。
   *
   * 这些字段会被先转成字符串再 JSON.parse，避免雪花 ID 之类的数字
   * 超过 Number.MAX_SAFE_INTEGER 后被舍入。
   */
  bigintStringFields?: string[];
}

/** 拼接完整 URL */
function buildUrl(baseUrl: string, path: string): string {
  const base = normalizeApiBaseUrl(baseUrl) || API_BASE_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * 把「裸数字形式的大整数」改写成字符串形式（只改写指定字段）。
 *
 * 例：`{"userId":1234567890123456789}` → `{"userId":"1234567890123456789"}`
 *
 * 这样 JSON.parse 之后拿到的是精确的十进制字符串，不会因为
 * double 的 53 位有效数字而丢失末尾精度。
 */
function quoteBigIntFields(text: string, fields: string[]): string {
  if (fields.length === 0) return text;
  const escaped = fields.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`("(?:${escaped.join('|')})"\\s*:\\s*)(-?\\d{16,})`, 'g');
  return text.replace(re, '$1"$2"');
}

/** 解析响应体；失败返回 null（不抛异常，交给上层统一处理） */
function parseJsonSafe(text: string, bigintStringFields: string[]): unknown {
  if (!text) return null;
  try {
    return JSON.parse(quoteBigIntFields(text, bigintStringFields));
  } catch {
    return null;
  }
}

/**
 * 发起一次后端 API 调用并解包 `data`。
 *
 * @throws {ApiError} 网络失败、超时、HTTP 异常或业务错误码非 0
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    baseUrl,
    bigintStringFields = [],
  } = options;

  const url = buildUrl(baseUrl ?? API_BASE_URL, path);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let rawText = '';
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    // 响应体也要在超时窗口内读完，否则慢响应会挂住 IPC 调用
    rawText = await response.text();
  } catch (err) {
    const aborted = controller.signal.aborted;
    console.error('[api] 请求失败:', method, url, err);
    throw new ApiError(
      AuthErrorCode.NETWORK_ERROR,
      aborted
        ? '请求超时，请稍后再试'
        : resolveAuthErrorMessage(AuthErrorCode.NETWORK_ERROR),
    );
  } finally {
    clearTimeout(timer);
  }

  const parsed = parseJsonSafe(rawText, bigintStringFields);

  // ---- HTTP 层异常 ----
  if (!response.ok) {
    const envelope =
      parsed && typeof parsed === 'object'
        ? (parsed as { code?: number; message?: string })
        : {};
    const code =
      typeof envelope.code === 'number' ? envelope.code : AuthErrorCode.SERVER_ERROR;
    throw new ApiError(
      code,
      resolveAuthErrorMessage(code, envelope.message || `服务返回异常（HTTP ${response.status}）`),
    );
  }

  // ---- 信封格式异常 ----
  if (!parsed || typeof parsed !== 'object') {
    throw new ApiError(
      AuthErrorCode.SERVER_ERROR,
      resolveAuthErrorMessage(AuthErrorCode.SERVER_ERROR, '后端返回了无法识别的数据'),
    );
  }

  const envelope = parsed as { code?: number; message?: string; data?: unknown };
  if (typeof envelope.code !== 'number') {
    throw new ApiError(
      AuthErrorCode.SERVER_ERROR,
      resolveAuthErrorMessage(AuthErrorCode.SERVER_ERROR, '后端返回了无法识别的数据'),
    );
  }

  // ---- 业务错误 ----
  if (envelope.code !== 0) {
    throw new ApiError(
      envelope.code,
      resolveAuthErrorMessage(envelope.code, envelope.message),
    );
  }

  return envelope.data as T;
}
