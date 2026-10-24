/**
 * Auth Store —— 用户身份与 token 管理。
 *
 * 与后端 auth 模块对接，协议见 src/shared/auth-types.ts：
 *  - 首次启动自动匿名注册（匿名可用是后端的设计，不强制注册）
 *  - 已有 refreshToken 时优先续期，失败再退化成匿名注册
 *  - token 过期（2004 / 2005）时自动用 refreshToken 续期并重试一次
 *
 * 所有网络访问都走 preload 暴露的 window.personalApi，
 * renderer 不直接访问后端。
 */
import { defineStore } from 'pinia';
import {
  AuthErrorCode,
  isTokenExpiredCode,
  resolveAuthErrorMessage,
  type AuthResponse,
  type AuthUserType,
  type ClientResult,
  type PersonalAuthApi,
} from '../../shared/auth-types';

/** 桌面端版本号（与 package.json 保持一致） */
const APP_VERSION = '0.1.0';

/** 设备标识的本地存储 key（独立于会话，退出登录也不会变） */
const DEVICE_ID_STORAGE_KEY = 'dg.personal.device-id';

interface AuthState {
  /**
   * 用户 ID（雪花 ID 的字符串形式）。
   *
   * ⚠️ 该值已经超过 Number.MAX_SAFE_INTEGER，只能当标识符用，
   *    **不要参与任何算术运算或数值比较**。
   */
  userId: string | null;
  /** 昵称（后端 displayName，缺省回落到 username） */
  nickname: string | null;
  /** 登录名（后端 username；匿名用户为 null） */
  username: string | null;
  /** 头像地址 */
  avatar: string | null;
  /** access token */
  jwt: string | null;
  /** access token 过期时间（epoch 毫秒） */
  jwtExpiresAt: number | null;
  /** refresh token */
  refreshToken: string | null;
  /** refresh token 过期时间（epoch 毫秒） */
  refreshTokenExpiresAt: number | null;
  /** 用户类型：匿名 / 已注册 */
  userType: AuthUserType | null;
  /** 邮箱 */
  email: string | null;
  /** 本机设备唯一标识 */
  deviceId: string | null;
  /** 用户自定义的后端地址（null = 使用默认地址） */
  apiBaseUrl: string | null;
  /** 最近一次错误提示（供 UI 直接展示） */
  lastError: string | null;
}

/** 生成设备唯一标识 */
function generateDeviceId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // 兜底（极端情况下没有 crypto）
  return `dg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 读取设备标识；没有则生成并持久化到 localStorage */
function loadDeviceId(): string {
  try {
    const stored = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage 不可用时忽略 */
  }

  const id = generateDeviceId();
  try {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  } catch {
    /* 忽略写入失败 */
  }
  return id;
}

/** 拿 preload 暴露的鉴权 API；拿不到时给出可读错误而不是崩溃 */
function getPersonalApi(): PersonalAuthApi | null {
  if (typeof window === 'undefined') return null;
  return window.personalApi ?? null;
}

/**
 * 自动续期包装器。
 *
 * 首次调用失败且错误码是「token 过期 / refresh 失效」时，
 * 用 refreshToken 续期后**重试一次**（只重试一次，避免死循环）。
 *
 * 参数刻意拆成基本类型而不是整个 store：
 * 既避免把 `this` 传出去，也让类型推断不依赖 store 自身的推断结果。
 */
async function withAutoRefresh<T>(
  accessToken: string | null,
  refreshToken: string | null,
  doRefresh: () => Promise<ClientResult<AuthResponse>>,
  run: (token: string | null) => Promise<ClientResult<T>>,
): Promise<ClientResult<T>> {
  const first = await run(accessToken);
  if (first.ok) return first;

  // 只有 token 相关的错误码才值得续期重试
  if (!isTokenExpiredCode(first.code)) return first;
  if (!refreshToken) return first;

  const refreshed = await doRefresh();
  if (!refreshed.ok) return first;

  // 用续期后的新 access token 重试一次
  return run(refreshed.data.accessToken);
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    userId: null,
    nickname: null,
    username: null,
    avatar: null,
    jwt: null,
    jwtExpiresAt: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    userType: null,
    email: null,
    deviceId: null,
    apiBaseUrl: null,
    lastError: null,
  }),

  getters: {
    /** 是否已登录（本地有 access token） */
    isLoggedIn: (s): boolean => !!s.jwt,
    /** access token 是否已过期 */
    isJwtExpired: (s): boolean =>
      !!s.jwtExpiresAt && Date.now() > s.jwtExpiresAt,
    /** 是否是匿名用户 */
    isAnonymous: (s): boolean => s.userType === 'anonymous',
    /** 是否是正式注册用户 */
    isRegistered: (s): boolean => s.userType === 'registered',
    /** 展示用的用户 ID（雪花 ID 原样展示，不做数值运算） */
    userIdLabel: (s): string => (s.userId ? `#${s.userId}` : '—'),
  },

  actions: {
    /**
     * 启动时自动完成鉴权。
     *
     * 流程：有 refreshToken → 先续期；续期失败 → 退化成匿名注册。
     *
     * @returns 是否已拿到可用会话
     */
    async bootstrap(): Promise<boolean> {
      this.lastError = null;
      this.deviceId = loadDeviceId();

      if (this.refreshToken) {
        const res = await this.refresh();
        if (res.ok) return true;
      }

      const res = await this.anonymousRegister();
      return res.ok;
    },

    /** 匿名注册（拿匿名身份，首次启动自动调用） */
    async anonymousRegister(): Promise<ClientResult<AuthResponse>> {
      const api = getPersonalApi();
      if (!api) return this.fail('鉴权通道不可用，请重启应用');

      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      const res = await api.authAnonymous({
        deviceId: this.ensureDeviceId(),
        deviceName: nav?.userAgent?.slice(0, 120) ?? 'Desktop Client',
        osVersion: nav?.platform ?? 'unknown',
        appVersion: APP_VERSION,
        baseUrl: this.apiBaseUrl ?? undefined,
      });

      if (res.ok) {
        this.applySession(res.data);
        this.lastError = null;
      } else {
        this.lastError = res.message;
      }
      return res;
    },

    /**
     * 升级为正式用户（匿名 → 注册）。
     *
     * 后端注册接口要求带匿名 access token；本地没有的话先匿名注册一次。
     */
    async upgradeRegister(payload: {
      username: string;
      password: string;
      email?: string;
    }): Promise<ClientResult<AuthResponse>> {
      const api = getPersonalApi();
      if (!api) return this.fail('鉴权通道不可用，请重启应用');

      if (!this.jwt) {
        const anon = await this.anonymousRegister();
        if (!anon.ok) return anon;
      }

      const res = await withAutoRefresh(
        this.jwt,
        this.refreshToken,
        () => this.refresh(),
        (accessToken) =>
          api.authRegister({
            username: payload.username,
            password: payload.password,
            email: payload.email,
            accessToken: accessToken ?? undefined,
            baseUrl: this.apiBaseUrl ?? undefined,
          }),
      );

      if (res.ok) {
        this.applySession(res.data);
        this.lastError = null;
      } else {
        this.lastError = res.message;
      }
      return res;
    },

    /** 用户名密码登录 */
    async login(payload: {
      username: string;
      password: string;
    }): Promise<ClientResult<AuthResponse>> {
      const api = getPersonalApi();
      if (!api) return this.fail('鉴权通道不可用，请重启应用');

      const res = await api.authLogin({
        username: payload.username,
        password: payload.password,
        baseUrl: this.apiBaseUrl ?? undefined,
      });

      if (res.ok) {
        this.applySession(res.data);
        this.lastError = null;
      } else {
        this.lastError = res.message;
      }
      return res;
    },

    /** 用 refresh token 续期 */
    async refresh(): Promise<ClientResult<AuthResponse>> {
      const api = getPersonalApi();
      if (!api) return this.fail('鉴权通道不可用，请重启应用');

      if (!this.refreshToken) {
        const message = resolveAuthErrorMessage(AuthErrorCode.REFRESH_TOKEN_INVALID);
        this.lastError = message;
        return { ok: false, code: AuthErrorCode.REFRESH_TOKEN_INVALID, message };
      }

      const res = await api.authRefresh(
        this.refreshToken,
        this.apiBaseUrl ?? undefined,
      );

      if (res.ok) {
        this.applySession(res.data);
        this.lastError = null;
      } else {
        this.lastError = res.message;
        // refresh token 彻底失效 → 清掉本地会话，等价于需要重新登录
        if (res.code === AuthErrorCode.REFRESH_TOKEN_INVALID) {
          this.clearSession();
        }
      }
      return res;
    },

    /**
     * 退出登录。
     *
     * 只清本地状态，不调后端（后端没有提供登出接口）。
     * 设备标识会保留，保证下次匿名注册还是同一台设备。
     */
    logout(): void {
      this.clearSession();
      this.lastError = null;
    },

    /** 覆盖后端地址（个人界面「设置」面板使用） */
    setApiBaseUrl(url: string | null): void {
      const trimmed = (url ?? '').trim();
      this.apiBaseUrl = trimmed ? trimmed.replace(/\/+$/, '') : null;
    },

    /** 取（必要时生成并缓存）本机设备标识 */
    ensureDeviceId(): string {
      if (!this.deviceId) this.deviceId = loadDeviceId();
      return this.deviceId;
    },

    /** 用后端返回的会话数据覆盖本地状态 */
    applySession(data: AuthResponse): void {
      this.userId = String(data.userId ?? '');
      this.username = data.username ?? null;
      this.nickname = data.displayName ?? data.username ?? null;
      this.avatar = data.avatarUrl ?? null;
      this.jwt = data.accessToken;
      this.jwtExpiresAt = data.accessTokenExpiresAt;
      this.refreshToken = data.refreshToken;
      this.refreshTokenExpiresAt = data.refreshTokenExpiresAt;
      this.userType = data.userType;
      this.email = data.email ?? null;
    },

    /** 清空会话信息（保留设备标识与后端地址配置） */
    clearSession(): void {
      this.userId = null;
      this.nickname = null;
      this.username = null;
      this.avatar = null;
      this.jwt = null;
      this.jwtExpiresAt = null;
      this.refreshToken = null;
      this.refreshTokenExpiresAt = null;
      this.userType = null;
      this.email = null;
    },

    /** 统一的失败出口：记录可读提示并返回失败结果 */
    fail(message: string): { ok: false; code: number; message: string } {
      this.lastError = message;
      return { ok: false, code: AuthErrorCode.NETWORK_ERROR, message };
    },
  },

  persist: {
    key: 'dg.personal.auth',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  },
});
