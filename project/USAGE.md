# 使用文档

> Desktop Girlfriend — 桌面宠物
> Electron + PixiJS + Spine + TypeScript

---

## 目录

1. [环境要求](#1-环境要求)
2. [快速开始](#2-快速开始)
3. [npm scripts 详解](#3-npm-scripts-详解)
4. [常用操作](#4-常用操作)
5. [Bug 修复记录](#5-bug-修复记录)
6. [扩展指引](#6-扩展指引)
7. [故障排查](#7-故障排查)
8. [项目结构](#8-项目结构)

---

## 1. 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 18 | 已在 20.18.3 上验证 |
| npm | ≥ 9 | 或 pnpm / yarn 均可 |
| Windows | 10/11 | 桌面宠物是 Windows 专用 |
| 镜像 | npmmirror | `npm config get registry` 应为 `https://registry.npmmirror.com/` |

> 之所以要国内镜像：`electron` 二进制从 GitHub releases 下载，国内裸连经常 100KB/s。
> 其它包（pixi.js / spine / vite 等）用国内 registry 即可。

---

## 2. 快速开始

```bash
# 1. 进入项目目录
cd "tools/Desktop Girlfriend/project"

# 2. 安装依赖（注意：--ignore-scripts 跳过 postinstall）
npm install --ignore-scripts

# 3. 单独补 Electron 二进制（走国内镜像）
ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" \
  node node_modules/electron/install.js

# 4. 跑起来
npm run dev
```

跑起来后角色会出现在桌面右下角，悬浮在任务栏上方。待机动画自带眨眼和头发飘动，点一下会播触摸反应动画。右键点击角色弹出菜单，可调整大小 / 切换角色 / 设置常驻 / 退出。

> 第一次跑要等 Electron 冷启动 1-2 秒，之后 HMR 修改即热重载。
> 贴图 2.3MB，首帧大约有 100~300ms 的加载空窗。

---

## 3. npm scripts 详解

| 脚本 | 作用 | 何时用 |
|---|---|---|
| `npm run dev` | 开发模式 + HMR + DevTools | 改代码、调参、试效果 |
| `npm run build` | 生产构建到 `out/` | 准备打包 / 试生产版本 |
| `npm run start` | 启动生产构建（用 electron-vite preview） | 验证 build 后能跑 |
| `npm run run` | 直接 `electron .` 跑开发版 | 调试主进程逻辑 |
| `npm run typecheck` | 仅类型检查，不输出文件 | 提交前 / CI |

> `dev / start / run` 三个脚本里强制 `set ELECTRON_RUN_AS_NODE=` 是为了绕开**一个环境坑**（见故障排查 #1），不必手动管。

---

## 4. 常用操作

### 4.1 调整显示大小

- 运行时：右键 → 调整大小 → 缩小/放大/默认大小，或者键盘 `+` / `-` / `0`。
  范围 0.2x ~ 1.5x，步长 0.1。
- 持久化：编辑 [assets/characters/roxy/config.json](assets/characters/roxy/config.json)：

```json
"meta": { "displayScale": 0.5 }
```

窗口尺寸 = 模型包围盒 × 该比例。

### 4.2 切换角色 / 换动画

- 切换：右键 → 切换角色 → 选已放进 `assets/characters/<id>/` 的角色。
- 新增角色：在 `assets/characters/<新id>/` 写 config，在 `img/spine/<新id>/` 或 `img/live2d/<新id>/` 放素材。
- 同一角色的不同动画：config 的 `spine.idleAnim` / `spine.motionAnim` 是触发的动画名。

### 4.3 调互动动画的触发频率

编辑 [src/renderer/src/main.ts](src/renderer/src/main.ts) 顶部：

```ts
const IDLE_MOTION_MIN_MS = 30_000;    // 最短间隔
const IDLE_MOTION_RANGE_MS = 60_000;  // 随机浮动范围
```

默认是闲置时每隔 30~90 秒随机播一次。

### 4.4 鼠标交互

- 左键按住移动 ≥ 1px → 拖动窗口（同时向主进程上报 `notifyDragStart`，屏蔽期间所有 setSize）
- 左键短按（未移动）→ 播放一次互动动画
- 右键 → 菜单（缩放 / 切换角色 / 退出）
- 键盘 `+` 放大、`-` 缩小、`0` 恢复默认（**拖拽期间屏蔽**，修"长按拖拽窗口变大"）

### 4.5 退出

右键 → 选 **退出**。

---

## 5. Bug 修复记录

### 5.1 拖拽时窗口大小不变（v3：绝对保障）

**用户原话**：*就不可以让拖拽的时候窗口大小不变吗？*

之前两层防御仍让用户感知到变大。激进修缮：**取消挂起策略**，所有 setSize 在拖拽期间一律丢弃。

| 改动 | 文件 |
|---|---|
| `WindowState.tryResize` 在 `isDragging=true` 时**直接拒绝**（不挂起、不 setSize、立即返回 false） | `src/main/window-state.ts` |
| `endDrag` 不再应用任何 pendingSize | `src/main/window-state.ts` |
| `ipcMain.handle('window:resize')` 在 `winState.isDragging` 时返回 false 短路 | `src/main/index.ts` |
| `CharacterManager.applyScale` 在 `isDragging()` 时不下发 `resizeWindow` | `src/renderer/src/core/character-manager.ts` |
| main.ts 把 `isDragging` 上提给 manager | `src/renderer/src/main.ts` |

**绝对保障（五道关卡）**：
- 主进程 IPC handler 入口拒
- `tryResize` 同步拒
- `endDrag` 不应用任何挂起 size
- renderer keyboard handler 拒
- `CharacterManager.applyScale` 拒

任意一道命中即丢弃。副作用：拖拽期间按 +/-/0 / 切角色会失效。

### 5.2 晃动之后窗口长和宽都会变大（v2）

**根因**：之前 `tryResize` 用 80ms debounce timer；若 timer 挂着时用户进入拖拽，timer 在拖拽期触发 setSize。

**修缮**（已被 v3 覆盖）：取消 timer，同步 setSize + 拖拽期挂起。

### 5.3 长按拖拽晃动窗口变大 / 位置失效 / 人物偏离（v1）

**根因**：
1. 拖拽期间 renderer 的 keyboard +/-/0 仍触发 `applyScale` → `resizeWindow` → 主进程 `setSize`。
2. 主进程每收到 `move-by` 都把 `atDefaultPosition = false`，长按微动也算"已离开默认位置"。
3. 对齐逻辑用 `screen.getPrimaryDisplay()`，多显示器场景贴错屏。

**修缮**：

| 改动 | 文件 |
|---|---|
| 状态机 `WindowState` 统一管理拖拽锁、resize、默认位置 | `src/main/window-state.ts` |
| 拖拽期间拒绝非必要的 `setSize`（挂起到 `pendingSize`） | `src/main/window-state.ts` 内 `tryResize` |
| 累计位移 ≥ 12px 才算离开默认位置 | `WindowState.endDrag` |
| 对齐用 `getDisplayMatching(win.getBounds())` | `WindowState.getWorkArea` |
| 拖拽期间 renderer 屏蔽 keyboard 缩放 | `src/renderer/src/main.ts` keydown handler + `isDragging` 守卫 |
| drag-start / drag-end 上报用于主进程锁 | `drag.ts` 新回调 `onDragStateChanged` + preload `notifyDragStart/End` |

### 5.2 调整大小后恢复默认位置偶尔不对

`alignWindowToTaskbar` 已重写为 `WindowState.alignToDefault`，**跟随窗口所在的 display**，不再写死 primary。

---

## 6. 扩展指引

### 6.1 接 Live2D

```bash
npm i pixi-live2d-display
```

修改 [src/renderer/src/core/live2d-character.ts](src/renderer/src/core/live2d-character.ts)：
- `Live2DEnabled = true`
- 解开 dynamic import 与加载骨架注释

config：
```json
{
  "id": "haru",
  "displayName": "春",
  "type": "live2d",
  "live2d": { "modelUrl": "live2d/haru/haru.model3.json" }
}
```

### 6.2 接 AI 聊天（LLM）

[src/main/ipc/chat.ts](src/main/ipc/chat.ts) 当前是占位：把回复切成 chunk 模拟流式。

真实落地：调云端 OpenAI / Claude / 国内 LLM 的 SSE 接口，每个 token 通过
`webContents.send(IpcChannels.ChatToken, { text, done: false })` 推流。
最后发一个 `{ done: true }` 表示结束。

renderer 已经把 token 流汇到 `event-bus` 的 `'chat:reply'` 事件；
[core/speech-bubble.ts](src/renderer/src/core/speech-bubble.ts) 自动订阅并渲染气泡。

### 6.3 接 TTS

[src/main/ipc/tts.ts](src/main/ipc/tts.ts) 当前是占位：

```json
{ text: "...", voice: "zh-CN-Xiaoxiao" }
```

可选：
- 本地：Windows SAPI（无网、音质一般）
- 云：Azure TTS、火山 TTS、Edge TTS（免费）

renderer 的 `TtsAdapter` 已经订阅 `tts:state`，可以驱动表情动画。

### 6.4 嵌入到 Vue / 普通 Web

```ts
import { mountPet } from '@renderer/vue-adapter/mount-pet';

const runtime = await mountPet(rootEl, {
  initialCharacterId: 'roxy',
  adapter: {
    loadCharacter: async (id) => await fetch(`/api/character/${id}`).then(r => r.json()),
    listCharacters: async () => [...],
    resizeWindow: async () => true,
    onDragMove: ({ dx, dy }) => { /* 自己实现 transform */ },
  },
});
```

详情看 [src/renderer/src/vue-adapter/mount-pet.ts](src/renderer/src/vue-adapter/mount-pet.ts)。

### 6.5 后续扩展位速查

| 想做什么 | 在哪改 |
|---|---|
| 多角色 | `assets/characters/<id>/` config + `img/spine\|live2d/<id>/` |
| 接 Live2D | `npm i pixi-live2d-display` + 见 6.1 |
| 接 LLM | 替换 `src/main/ipc/chat.ts` 占位 |
| 接 TTS | 替换 `src/main/ipc/tts.ts` 占位 |
| 嵌入 Vue | `vue-adapter/mount-pet.ts` |
| 新增右键菜单项 | `main.ts` 调 `registerMenuItem()` |
| 自定义角色驱动 | `core/character-factory.ts` 加分支 |

---

## 7. 故障排查

### #1 `ELECTRON_RUN_AS_NODE=1` 导致启动后立刻报错

**症状**：运行后立刻打印

```
TypeError: Cannot read properties of undefined (reading 'commandLine')
```

或 `reading 'requestSingleInstanceLock'` 等类似错误。

**原因**：系统环境里设了 `ELECTRON_RUN_AS_NODE=1`，让 `electron.exe` 跑成了 Node 模式而非 Electron 主进程模式，`require('electron')` 返回字符串路径而不是 API 对象。

**解决**：

- ✅ 用 `npm run dev / start / run` — 脚本里已经强制 `set ELECTRON_RUN_AS_NODE=` 解除
- ✅ 临时一次性：`env -u ELECTRON_RUN_AS_NODE npx electron-vite dev`

### #2 electron 二进制下载慢 / 下载失败

分两步装：

```bash
npm install --ignore-scripts
ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" \
  node node_modules/electron/install.js
```

### #3 角色不显示 / 报纹理加载失败

**先看 DevTools**。开发模式下渲染进程的 console 会转发到主进程终端。

| 缺哪条 | 大概率原因 |
|---|---|
| 没有 `PIXI app init OK` | WebGL context 创建失败，看 #4 |
| 没有 `spine character loaded` | 素材路径不对或 atlas 首行文件名不匹配 |
| `window: 0 x 0` 或 NaN | config.json 里的 `idleAnim` 名字在素材里不存在 |

### #4 透明窗口不显示 / 黑屏

显卡驱动 + 透明窗口 + GPU 加速在某些集显上有 bug。在 `app.whenReady()` 之前加：

```ts
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
```

注意关掉 GPU 后 Spine 渲染会明显变慢，仅作为排查手段。

### #5 控制台刷 CSP 拒绝警告

```
Refused to connect to 'data:image/png;base64,...'
```

[src/renderer/index.html](src/renderer/index.html) 的 CSP 中 `connect-src` 必须包含 `data:`。

### #6 全屏应用没自动隐藏 / 误隐藏

[src/main/fullscreen-tracker.ts](src/main/fullscreen-tracker.ts) 的 covers 判定可以加阈值：

```ts
const covers =
  fg.x <= x + 5 &&
  fg.y <= y + 5 &&
  fg.x + fg.w >= x + width - 5 &&
  fg.y + fg.h >= y + height - 5;
```

---

## 8. 项目结构

```
Desktop Girlfriend/
├── img/                              # Vite publicDir，渲染进程静态资源根
│   ├── spine/roxy/                   # Spine 三件套
│   └── live2d/<id>/                  # Live2D 模型（接入后）
└── project/
    ├── assets/characters/roxy/       # 角色配置
    ├── src/
    │   ├── shared/                   # 主 / 渲染进程共用类型
    │   │   ├── ipc-channels.ts
    │   │   └── character-config.ts
    │   ├── main/                     # 主进程
    │   │   ├── index.ts
    │   │   ├── window-state.ts       # 拖拽锁 + 对齐 + 默认位置
    │   │   ├── character-loader.ts
    │   │   ├── taskbar-tracker.ts
    │   │   ├── fullscreen-tracker.ts
    │   │   └── ipc/
    │   │       ├── character.ts
    │   │       ├── chat.ts
    │   │       └── tts.ts
    │   ├── preload/index.ts          # contextBridge
    │   └── renderer/
    │       ├── index.html
    │       └── src/
    │           ├── main.ts           # 装配
    │           ├── drag.ts
    │           ├── menu.ts
    │           ├── electron-adapter.ts
    │           ├── core/             # ★ 与 Electron 解耦
    │           │   ├── i-character.ts
    │           │   ├── spine-character.ts
    │           │   ├── live2d-character.ts
    │           │   ├── character-factory.ts
    │           │   ├── character-manager.ts
    │           │   ├── event-bus.ts
    │           │   ├── chat-adapter.ts
    │           │   ├── tts-adapter.ts
    │           │   └── speech-bubble.ts
    │           └── vue-adapter/
    │               └── mount-pet.ts  # ★ Vue 嵌入入口
    ├── electron.vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── package.json
```

---

## 速查

- `process.type === 'browser'` → Electron 主进程，正常
- `process.type === undefined` → 跑成了 Node 模式（看故障 #1）

`npm run dev` 后主进程终端出现下面三行 = 一切正常：

```
[renderer] PIXI app init OK
[renderer] spine character loaded
[renderer] scale → 0.50 window: 327 x 567
```

DevTools 调试：控制台输入 `__pet` 可以看到当前的 bus / character / scale 等。
