# Desktop Girlfriend · 个人界面（Personal Panel）

`project/` 是 Electron 桌面宠物的主工程。本目录的 README 专门记录
**个人界面**（Personal Panel）相关的开发约定 —— 它是 Vue 3 + Tailwind v4
+ @pxlkit/ui-kit-vue 构建的独立窗口，技术栈与桌面宠物（Electron + PixiJS + Spine）
不同。

更多关于桌面宠物本体的说明见上级 `../README.md`。

---

## 端口分配

| 端口 | 用途 | 来源 |
|---|---|---|
| `5173` | 桌面宠物渲染进程 dev server（HMR + DevTools） | `electron.vite.config.ts` → `renderer.server.port` |
| `5174` | 个人界面渲染进程 dev server | `electron.vite.config.ts` → `personal.server.port` |

`npm run dev` 同时启动两个 dev server，Electron 主进程会按 entry 自动加载。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Vue 3.5 + `<script setup lang="ts">` |
| 路由 | Vue Router 4（hash 模式，兼容 `file://` 加载） |
| 状态管理 | Pinia 2 + `pinia-plugin-persistedstate`（写入 `localStorage`） |
| 样式 | Tailwind v4 CSS-first + `retro-*` design tokens |
| UI 组件 | `@pxlkit/ui-kit-vue` v2.2.0（8-bit 像素组件库，与 React 版同源） |
| 构建 | electron-vite 2.3 + `@vitejs/plugin-vue` |

### 为什么 `@pxlkit/ui-kit-vue` v2.2.0

- **已发布且官方维护**（npm 注册表确认存在 v2.2.0）
- 与 React 版 `@pxlkit/ui-kit` 共享 design tokens / theme，可移植
- 内置 111+ 像素组件、Retro palette、dark mode、a11y
- 同时支持 Vue / Nuxt、Tailwind v4 —— 与本项目栈完全对齐

**降级方案**（如果未来版本不可用）：
1. 改用 `@pxlkit/ui-kit` 的设计 token 自写 Vue 包装（主题可移植，但样式需重写）
2. 完全自写：基于 `docs/design/PIXEL_UI_DESIGN.md` 的 `retro-*` tokens（项目里 style.css 已经备好）

---

## 目录结构

```
project/
├── postcss.config.js                    # Tailwind v4 PostCSS 插件
├── electron.vite.config.ts               # 新增 personal entry（端口 5174）
├── src/
│   ├── main/
│   │   ├── index.ts                      # 注册 PersonalOpen / PersonalClose / auth:* IPC handler
│   │   ├── api/
│   │   │   ├── http-client.ts            # 主进程 HTTP 客户端（解包 {code,message,data}）
│   │   │   └── auth-client.ts            # auth 模块 4 个接口的封装
│   │   ├── ipc/
│   │   │   └── auth.ts                   # auth:* handler（只返回 ClientResult，不抛异常）
│   │   └── windows/
│   │       └── personal-window.ts        # 个人界面独立 BrowserWindow
│   ├── preload/
│   │   └── index.ts                      # petApi 新增 openPersonalWindow / closePersonalWindow
│   │                                      # personalApi 新增 auth* 方法
│   ├── shared/
│   │   ├── ipc-channels.ts               # 新增 PersonalOpen / PersonalClose / auth:* 常量
│   │   ├── api-config.ts                 # 后端 API base URL（环境变量 / 用户覆盖）
│   │   ├── auth-types.ts                 # 鉴权共享类型 + 错误码映射
│   │   └── auth-bridge.ts                # preload 侧鉴权桥（两份 preload 共用）
│   └── personal/
│       ├── index.html
│       ├── main.ts                       # Vue 入口：Pinia + Router + pxlkit + auth bootstrap
│       ├── App.vue                       # 顶层布局（Sidebar + RouterView）
│       ├── style.css                     # Tailwind v4 + @theme retro-* tokens
│       ├── router.ts                     # 路由表（hash 模式）
│       ├── global.d.ts                   # window.personalApi 类型声明
│       ├── preload.ts                    # personalApi + petBridge
│       ├── components/
│       │   └── Sidebar.vue               # 像素风格左侧栏
│       ├── stores/
│       │   ├── auth.ts                   # 用户 / JWT（已接通后端 auth 模块）
│       │   ├── billing.ts                # 会员 / 积分
│       │   ├── persona.ts                # 角色人格 / 形象 / 声音
│       │   └── agent.ts                  # Agent 工具列表
│       └── views/
│           ├── Account.vue               # 登录状态 / 设备信息 / 升级注册 / 退出登录
│           ├── Login.vue                 # 用户名密码登录 + 升级注册
│           ├── Billing.vue               # 占位：💎 会员徽标 + 套餐 + 支付二维码
│           ├── Character.vue             # 占位：人格 / 形象 / 声音
│           ├── Chat.vue                  # 占位：长对话 / 多 session
│           ├── Settings.vue              # 后端地址配置（已接入）+ 主题 / 动效 / 隐私占位
│           ├── Market.vue                # 占位：角色 / 插件市场
│           ├── AgentManager.vue          # 占位：Agent 工具
│           ├── RagManager.vue            # 占位：RAG 知识库
│           └── About.vue                 # 占位：版本 / 版权
```

---

## IPC 协议

新增的 channel 集中在 `src/shared/ipc-channels.ts`：

| Channel | 方向 | 含义 |
|---|---|---|
| `personal:open` | renderer → main | 打开（或聚焦）个人界面窗口 |
| `personal:close` | renderer → main | 关闭个人界面窗口 |

主进程入口：

```ts
ipcMain.handle(IpcChannels.PersonalOpen, () => {
  createPersonalWindow();
  return true;
});
ipcMain.handle(IpcChannels.PersonalClose, () => {
  getPersonalWindow()?.close();
  return true;
});
```

Renderer 入口（宠物窗口右键菜单 / 后续业务可调用）：

```ts
await window.petApi.openPersonalWindow();
```

---

## 鉴权模块（对接后端 auth）

### 调用链路

```
Vue 组件 / auth store
        │  window.personalApi.authXxx(...)        ← preload 是唯一桥梁
        ▼
   IPC（auth:* channel）
        │  主进程加 Authorization / 超时 / 日志
        ▼
 src/main/api/http-client.ts   ← 解包 {code,message,data}
        │
        ▼
     后端 auth 模块
```

> renderer **不允许**直接 `fetch` 后端：统一在主进程加 token / 代理 / 日志，
> 也避免把任何密钥暴露给渲染进程。

### 后端接口

| Method | Path | Request Body | 鉴权 |
|---|---|---|---|
| POST | `/v1/auth/anonymous` | `{deviceId, deviceName?, osVersion?, appVersion?}` | 否 |
| POST | `/v1/auth/register` | `{username, password, email?}` | 是（匿名 access token） |
| POST | `/v1/auth/login` | `{username, password}` | 否 |
| POST | `/v1/auth/refresh` | `{refreshToken}` | 否 |

统一响应信封：`{ code, message, data, timestamp }`，`code === 0` 成功。

### IPC channel

| Channel | 含义 |
|---|---|
| `auth:anonymous` | 匿名注册 |
| `auth:register` | 匿名升级为正式用户 |
| `auth:login` | 用户名密码登录 |
| `auth:refresh` | refresh token 续期 |
| `auth:profile` | 设备 / 运行环境信息 + 当前后端地址 |

### 错误码 → 中文提示

`src/shared/auth-types.ts` 里维护 `AUTH_ERROR_MESSAGES` 映射：

| code | 含义 | 桌面端提示 |
|---|---|---|
| `1000` | 参数错误 | 请求参数有误，请检查后重试 |
| `2001` | 用户不存在 | 该用户不存在 |
| `2002` | 用户名已存在 | 用户名已被占用，换一个试试 |
| `2003` | 用户名或密码错误 | 用户名或密码错误 |
| `2004` | access token 过期 | 登录状态已过期（**自动续期重试一次**） |
| `2005` | refresh token 无效 | 登录凭证已失效，请重新登录 |
| `9000` | 系统错误 | 服务器开小差了，请稍后再试 |
| `-1` | 网络 / 协议错误 | 无法连接后端服务，请检查网络或后端地址设置 |

主进程 handler **不抛异常**，统一返回 `{ ok, data }` / `{ ok: false, code, message }`
（`ClientResult<T>`）。原因：Electron 的 `ipcRenderer.invoke` 会把主进程抛出的
Error 序列化成字符串，自定义字段（错误码）会丢失，renderer 就没法区分
「token 过期」和「参数错误」。原始异常 / stack 只写主进程控制台。

### ⚠️ userId 精度问题（雪花 ID）

后端 `userId` 是 **19 位雪花 ID**，超过 `Number.MAX_SAFE_INTEGER`（2^53-1），
按 JSON number 传输会被 JS 舍入：

```
后端原文 1234567890123456789
JSON.parse 后   1234567890123456800   ← 末尾几位被改掉
```

桌面端的处理：

1. 主进程**先取响应原文**，把 `"userId": <16 位以上纯数字>` 改写成字符串，
   再 `JSON.parse`（见 `http-client.ts` 的 `bigintStringFields`）；
2. 因此 `AuthResponse.userId` 的类型是 **`string`**，前端拿到的就是精确的
   `"1234567890123456789"`；
3. 前端只把它当**标识符**用（展示、比较），**不要参与任何算术运算**。

> 更彻底的方案是后端直接把 `userId` 序列化成 String（Jackson `@JsonSerialize`
> 或改字段类型），那样桌面端这层补丁就可以去掉。

### 后端地址配置

优先级从高到低：

1. **用户覆盖**：个人界面「设置」面板里填写的地址 → 存在 auth store
   （localStorage 持久化）→ 随每次请求发给主进程；
2. **运行时环境变量**：`DG_API_BASE_URL` 或 `VITE_API_BASE_URL`；
3. **构建期注入**：`import.meta.env.VITE_API_BASE_URL`；
4. **默认值**：`http://localhost:8080`。

见 `src/shared/api-config.ts`（`API_BASE_URL` / `normalizeApiBaseUrl`）。

### 客户端行为

- `bootstrap()`（`src/personal/main.ts` 启动时自动调用）：
  有 refreshToken → 先续期；续期失败 → 退化成匿名注册。
  **匿名可用是后端的设计，不强制注册。**
- `deviceId`：客户端用 `crypto.randomUUID()` 生成，持久化在
  `localStorage['dg.personal.device-id']`，与登录态解耦。
- token 过期（2004 / 2005）自动用 refreshToken 续期并**重试一次**。
- `logout()` 只清本地状态（后端没有登出接口），设备标识保留。

---

## 与桌面宠物的桥接

个人界面 preload 同时透出 `petApi` 和 `personalApi`：

```ts
// 宠物窗口已经暴露过的 petApi（chat / character 等）—— 个人界面也想用
const petBridge = {
  getActiveCharacter: () => ipcRenderer.invoke(IpcChannels.CharacterGetActive),
  chatAsk: (text) => ipcRenderer.invoke(IpcChannels.ChatAsk, { text }),
  onChatToken: (cb) => { /* ... */ },
};
contextBridge.exposeInMainWorld('petApi', petBridge);

// 个人界面专属（auth / billing / persona / agent）
const personalApi = { ping: () => ipcRenderer.invoke('personal:ping') };
contextBridge.exposeInMainWorld('personalApi', personalApi);
```

调用方式：

```ts
// 在 Vue 组件中
const id = await window.petApi.getActiveCharacter();
window.personalApi.ping();
```

---

## 启动 / 构建

```bash
cd project

# 安装依赖
npm install --ignore-scripts
ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" node node_modules/electron/install.js

# 开发模式（同时启动宠物窗口 + 个人界面 dev server）
npm run dev

# 仅类型检查
npm run typecheck

# 构建
npm run build

# 打包
npm run dist
```

`electron-vite` 会在 `out/personal/` 输出生产资源，主进程通过
`mainWindow.loadFile('out/personal/index.html')` 加载。

---

## 后续（M1）

- 接通 `BillingPlans` / `BillingPay` IPC，渲染会员徽标 + 套餐 + 支付二维码
- 接通 Agent Store：拉取工具列表（内置 / MCP / 自定义）
- 接通 RAG Manager：上传 / 解析 / 检索
- 把 `@pxlkit/ui-kit-vue` 的真实组件替换 view 占位（Button / Card / Dialog / Table）