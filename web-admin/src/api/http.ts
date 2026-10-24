/**
 * axios HTTP 客户端
 *
 * - baseURL 从 .env 的 VITE_API_BASE_URL 读取(开发态由 vite proxy 转发 /api → /v1)
 * - 请求拦截器自动注入 Bearer token
 * - 响应拦截器统一处理 401(跳登录)、业务错误码
 */
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截 — 注入 JWT
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('dg_admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截 — 统一错误处理
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // 业务约定: { code, data, message }
    const body = response.data as { code?: number; data?: unknown; message?: string };
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) {
        return response;
      }
      // TODO(M4): 接入业务错误码统一弹窗
      return Promise.reject(new Error(body.message || `业务错误 code=${body.code}`));
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('dg_admin_token');
      // TODO(M4): 跳登录页
      // router.replace('/login')
    }
    return Promise.reject(error);
  },
);

export default http;