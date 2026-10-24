/**
 * 后端 API 地址配置。
 *
 * 优先级（从高到低）：
 *  1. 运行时环境变量 `DG_API_BASE_URL` / `VITE_API_BASE_URL`
 *     —— 打包后也能改，适合灰度 / 内网部署；
 *  2. 构建期注入 `import.meta.env.VITE_API_BASE_URL`
 *     —— 由 Vite / electron-vite 在打包时替换成字面量；
 *  3. 默认值 `http://localhost:8080`（本机开发后端）。
 *
 * 另外桌面端支持"用户级覆盖"：个人界面「设置」面板可以改地址，
 * 覆盖值保存在 auth store 里，随请求一起传给主进程（见 src/main/api/auth-client.ts）。
 */

/** 开发环境默认后端地址（本机 8080） */
export const DEFAULT_API_BASE_URL = 'http://localhost:8080';

/**
 * 归一化 base url：去掉首尾空白与结尾斜杠，避免拼出 `//v1/auth/login`。
 */
export function normalizeApiBaseUrl(url: string): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

/**
 * 读取运行时环境变量。
 *
 * 只在主进程有 process.env；渲染进程走 globalThis 判断后安全跳过。
 */
function readRuntimeBaseUrl(): string | undefined {
  try {
    const proc = (
      globalThis as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process;
    const env = proc?.env;
    if (!env) return undefined;
    const raw = env['DG_API_BASE_URL'] ?? env['VITE_API_BASE_URL'];
    return typeof raw === 'string' && raw.trim() ? raw : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 解析出最终生效的 base url。
 *
 * `import.meta.env.VITE_API_BASE_URL` 会被 Vite / electron-vite 在打包时
 * 替换成字面量（未配置时替换成 undefined），因此这里必须写成
 * 完整成员访问形式，不能加类型断言，否则打包器无法静态替换。
 */
function resolveApiBaseUrl(): string {
  const fromRuntime = readRuntimeBaseUrl();
  if (fromRuntime) return normalizeApiBaseUrl(fromRuntime);

  const fromBuildTime = import.meta.env.VITE_API_BASE_URL;
  if (fromBuildTime) return normalizeApiBaseUrl(fromBuildTime);

  return DEFAULT_API_BASE_URL;
}

/** 后端 API base URL（开发默认本机 8080；生产可由环境变量注入） */
export const API_BASE_URL: string = resolveApiBaseUrl();
