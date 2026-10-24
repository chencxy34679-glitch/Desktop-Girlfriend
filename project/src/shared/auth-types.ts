/**
 * 鉴权模块的共享类型契约（主进程 / preload / renderer 三侧共用）。
 *
 * 后端统一响应格式：
 * ```json
 * { "code": 0, "message": "ok", "data": { ... }, "timestamp": 1234567890 }
 * ```
 * `code === 0` 表示成功；非 0 是业务错误码。
 */

/** 用户类型：匿名用户 / 已注册用户 */
export type AuthUserType = 'anonymous' | 'registered';

/**
 * 鉴权成功后的用户信息。
 *
 * ⚠️ userId 是雪花 ID（19 位十进制数），已经超过 `Number.MAX_SAFE_INTEGER`。
 * 后端目前按 JSON number 返回，JS 直接 `JSON.parse` 会丢精度，
 * 因此主进程在解析响应时会把 userId 原样保留成**字符串**再交给前端
 * （见 src/main/api/http-client.ts 的 bigintStringFields 处理）。
 * 桌面端只把 userId 当标识符用，**不要参与任何算术运算**。
 */
export interface AuthResponse {
  /** 用户 ID（雪花 ID，字符串形式，精度无损） */
  userId: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  userType: AuthUserType;
  accessToken: string;
  refreshToken: string;
  /** access token 过期时间（epoch 毫秒） */
  accessTokenExpiresAt: number;
  /** refresh token 过期时间（epoch 毫秒） */
  refreshTokenExpiresAt: number;
  /** 是否为本次请求新建的用户 */
  isNewUser: boolean;
}

/** 匿名注册入参 */
export interface AnonymousRegisterInput {
  /** 设备唯一标识（客户端生成并持久化） */
  deviceId: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  /** 覆盖默认后端地址（桌面端「设置」里改过地址时带上） */
  baseUrl?: string;
}

/** 升级注册（匿名 → 正式用户）入参 */
export interface RegisterInput {
  username: string;
  password: string;
  email?: string;
  /** 匿名用户的 access token，注册接口要求带 Authorization 头 */
  accessToken?: string;
  /** 覆盖默认后端地址 */
  baseUrl?: string;
}

/** 登录入参 */
export interface LoginInput {
  username: string;
  password: string;
  /** 覆盖默认后端地址 */
  baseUrl?: string;
}

/** 设备 / 运行环境信息（主进程提供） */
export interface AuthProfile {
  /** 当前生效的后端地址 */
  baseUrl: string;
  /** 操作系统平台（win32 / darwin / linux） */
  platform: string;
  /** 操作系统版本描述 */
  osVersion: string;
  /** CPU 架构 */
  arch: string;
  /** 桌面端版本号 */
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
}

/**
 * 跨进程调用的统一返回结构。
 *
 * 之所以不用「抛异常」跨 IPC 传递错误：
 * Electron 的 ipcRenderer.invoke 会把主进程抛出的 Error 序列化成字符串，
 * 自定义字段（错误码）会丢失。这里统一用可序列化的联合类型，
 * 既保住错误码，又不会把 stack 泄到 UI。
 */
export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: number; message: string };

/** 后端业务错误码 */
export const AuthErrorCode = {
  /** 网络 / 协议层错误（非后端业务码） */
  NETWORK_ERROR: -1,
  /** 参数错误 */
  PARAM_INVALID: 1000,
  /** 用户不存在 */
  USER_NOT_FOUND: 2001,
  /** 用户名已存在 */
  USERNAME_TAKEN: 2002,
  /** 用户名或密码错误 */
  BAD_CREDENTIALS: 2003,
  /** access token 过期 */
  TOKEN_EXPIRED: 2004,
  /** refresh token 无效 */
  REFRESH_TOKEN_INVALID: 2005,
  /** 系统错误 */
  SERVER_ERROR: 9000,
} as const;

/** 错误码 → 用户可读中文提示 */
export const AUTH_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  [AuthErrorCode.NETWORK_ERROR]: '无法连接后端服务，请检查网络或后端地址设置',
  [AuthErrorCode.PARAM_INVALID]: '请求参数有误，请检查后重试',
  [AuthErrorCode.USER_NOT_FOUND]: '该用户不存在',
  [AuthErrorCode.USERNAME_TAKEN]: '用户名已被占用，换一个试试',
  [AuthErrorCode.BAD_CREDENTIALS]: '用户名或密码错误',
  [AuthErrorCode.TOKEN_EXPIRED]: '登录状态已过期',
  [AuthErrorCode.REFRESH_TOKEN_INVALID]: '登录凭证已失效，请重新登录',
  [AuthErrorCode.SERVER_ERROR]: '服务器开小差了，请稍后再试',
};

/**
 * 把后端错误码翻译成用户可读的中文提示。
 *
 * @param code    后端业务错误码
 * @param fallback 兜底文案（通常是后端 message 或调用方给的具体原因，不会暴露 stack）
 */
export function resolveAuthErrorMessage(code: number, fallback?: string): string {
  const text = (fallback ?? '').trim();

  // 网络层错误没有后端文案，优先用调用方给出的具体原因（超时 / 连不上等）
  if (code === AuthErrorCode.NETWORK_ERROR) {
    return text || AUTH_ERROR_MESSAGES[AuthErrorCode.NETWORK_ERROR];
  }

  const known = AUTH_ERROR_MESSAGES[code];
  if (known) return known;

  if (text && text !== 'ok') return text;

  return `请求失败（错误码 ${code}）`;
}

/** 判断错误码是否代表「token 需要续期」 */
export function isTokenExpiredCode(code: number): boolean {
  return code === AuthErrorCode.TOKEN_EXPIRED || code === AuthErrorCode.REFRESH_TOKEN_INVALID;
}

/**
 * 个人界面通过 preload 拿到的鉴权能力（window.personalApi 的形状）。
 *
 * 单独抽成接口，是为了让 renderer 不必 import preload 文件就能拿到类型，
 * 也方便个人界面将来切到独立 preload。
 */
export interface PersonalAuthApi {
  /** 匿名注册（拿匿名身份） */
  authAnonymous(input: AnonymousRegisterInput): Promise<ClientResult<AuthResponse>>;
  /** 升级为正式用户（需要匿名 access token） */
  authRegister(input: RegisterInput): Promise<ClientResult<AuthResponse>>;
  /** 用户名密码登录 */
  authLogin(input: LoginInput): Promise<ClientResult<AuthResponse>>;
  /** 用 refresh token 续期 */
  authRefresh(refreshToken: string, baseUrl?: string): Promise<ClientResult<AuthResponse>>;
  /** 读取设备 / 运行环境信息与当前后端地址 */
  authGetProfile(): Promise<ClientResult<AuthProfile>>;
}
