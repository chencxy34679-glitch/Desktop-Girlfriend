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
│   │   ├── index.ts                      # 注册 PersonalOpen / PersonalClose IPC handler
│   │   └── windows/
│   │       └── personal-window.ts        # 个人界面独立 BrowserWindow
│   ├── preload/
│   │   └── index.ts                      # petApi 新增 openPersonalWindow / closePersonalWindow
│   ├── shared/
│   │   └── ipc-channels.ts               # 新增 PersonalOpen / PersonalClose 常量
│   └── personal/
│       ├── index.html
│       ├── main.ts                       # Vue 入口：Pinia + Router + pxlkit
│       ├── App.vue                       # 顶层布局（Sidebar + RouterView）
│       ├── style.css                     # Tailwind v4 + @theme retro-* tokens
│       ├── router.ts                     # 路由表（hash 模式）
│       ├── preload.ts                    # personalApi + petBridge
│       ├── components/
│       │   └── Sidebar.vue               # 像素风格左侧栏
│       ├── stores/
│       │   ├── auth.ts                   # 用户 / JWT
│       │   ├── billing.ts                # 会员 / 积分
│       │   ├── persona.ts                # 角色人格 / 形象 / 声音
│       │   └── agent.ts                  # Agent 工具列表
│       └── views/
│           ├── Account.vue               # 占位：M1 接入
│           ├── Login.vue                 # 占位：M1 接入
│           ├── Billing.vue               # 占位：💎 会员徽标 + 套餐 + 支付二维码
│           ├── Character.vue             # 占位：人格 / 形象 / 声音
│           ├── Chat.vue                  # 占位：长对话 / 多 session
│           ├── Settings.vue              # 占位：主题 / 动效 / 隐私
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

- 接通 `AuthLogin` / `AuthRegister` / `AuthRefresh` IPC，绑定 Auth Store
- 接通 `BillingPlans` / `BillingPay` IPC，渲染会员徽标 + 套餐 + 支付二维码
- 接通 Agent Store：拉取工具列表（内置 / MCP / 自定义）
- 接通 RAG Manager：上传 / 解析 / 检索
- 把 `@pxlkit/ui-kit-vue` 的真实组件替换 view 占位（Button / Card / Dialog / Table）