# 使用文档

> Desktop Girlfriend — 桌面宠物
> Electron + PixiJS + Spine + TypeScript

---

## 目录

1. [环境要求](#1-环境要求)
2. [快速开始](#2-快速开始)
3. [npm scripts 详解](#3-npm-scripts-详解)
4. [常用操作](#4-常用操作)
5. [故障排查](#5-故障排查)
6. [项目结构](#6-项目结构)
7. [后续扩展指引](#7-后续扩展指引)

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

跑起来后角色会出现在桌面右下角，悬浮在任务栏上方。待机动画自带眨眼和头发飘动，
点一下会播触摸反应动画。

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

编辑 [assets/characters/roxy/config.json](assets/characters/roxy/config.json)：

```json
"meta": { "displayScale": 0.5 }
```

窗口尺寸 = 模型包围盒 × 该比例。也可以运行时用右键菜单或键盘 `+` / `-` / `0` 调，
范围 0.2x ~ 1.5x。

### 4.2 换动画 / 换角色

config.json 的 `spine` 段指定素材路径和动画名：

```json
{
  "id": "roxy",
  "displayName": "洛琪希",
  "spine": {
    "atlasUrl": "spine/roxy/roxy.atlas",
    "jsonUrl": "spine/roxy/roxy.json",
    "idleAnim": "idle",
    "motionAnim": "motion"
  },
  "meta": { "displayScale": 0.5 }
}
```

- `atlasUrl` / `jsonUrl` 相对仓库根的 `img/` 目录，**不写前导斜杠**
- `idleAnim` 循环播放，`motionAnim` 点击时播一次
- 不确定素材里有哪些动画名？看 `.json` 里 `"animations"` 段的键

换角色：在 `img/spine/<新id>/` 放素材、在 `assets/characters/<新id>/` 写 config，
然后改 [src/main/index.ts](src/main/index.ts) 的 `CURRENT_CHARACTER_ID`。

> **素材有个坑**：`.atlas` 文件首行是贴图的文件名，按 atlas 所在目录解析。
> 如果你重命名了 png，必须同步改 atlas 首行，否则纹理加载 404。

### 4.3 调互动动画的触发频率

编辑 [src/renderer/src/main.ts](src/renderer/src/main.ts) 顶部：

```ts
const IDLE_MOTION_MIN_MS = 30_000;    // 最短间隔
const IDLE_MOTION_RANGE_MS = 60_000;  // 随机浮动范围
```

默认是闲置时每隔 30~90 秒随机播一次。

过渡时长在 [src/renderer/src/spine-character.ts](src/renderer/src/spine-character.ts)：

```ts
const MIX_DURATION = 0.2;  // motion 淡回 idle 的秒数
```

### 4.4 鼠标交互

- 左键按住移动 ≥ 5px → 拖动窗口
- 左键短按（未移动）→ 播放一次互动动画
- 右键 → 菜单（缩放 / 退出）
- 键盘 `+` 放大、`-` 缩小、`0` 恢复默认

### 4.5 退出

右键 → 选 **退出**。

---

## 5. 故障排查

### #1 `ELECTRON_RUN_AS_NODE=1` 导致启动后立刻报错

**症状**：运行后立刻打印

```
TypeError: Cannot read properties of undefined (reading 'commandLine')
```

或 `reading 'requestSingleInstanceLock'` 等类似错误。

**原因**：系统环境里设了 `ELECTRON_RUN_AS_NODE=1`（部分 Node 版本管理器，以及某些
Electron 应用的内置终端会设），让 `electron.exe` 跑成了 Node 模式而非 Electron 主进程
模式，`require('electron')` 返回字符串路径而不是 API 对象。

**判断**：

```bash
env | grep ELECTRON
# 如果有 ELECTRON_RUN_AS_NODE=1，就是这个问题
```

**解决**：

- ✅ 用 `npm run dev / start / run` — 脚本里已经强制 `set ELECTRON_RUN_AS_NODE=` 解除
- ✅ 临时一次性：`env -u ELECTRON_RUN_AS_NODE npx electron-vite dev`（Git Bash / Linux）
- ✅ PowerShell：`$env:ELECTRON_RUN_AS_NODE=""; npx electron-vite dev`

### #2 electron 二进制下载慢 / 下载失败

**症状**：`npm install` 阶段卡在 `node install.js` 上几分钟。

**解决**：分两步装：

```bash
npm install --ignore-scripts
ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" \
  node node_modules/electron/install.js
```

如果还慢，看一下 `path.txt` 在不在 `node_modules/electron/`：

```bash
cat node_modules/electron/path.txt
# 应该是 electron.exe
```

### #3 角色不显示 / 报纹理加载失败

**先看 DevTools**。开发模式下渲染进程的 console 会转发到主进程终端，正常启动应该有：

```
[renderer] PIXI app init OK
[renderer] spine character loaded
[renderer] scale → 0.50 window: 327 x 567
```

按缺失的那一条定位：

| 缺哪条 | 大概率原因 |
|---|---|
| 没有 `PIXI app init OK` | WebGL context 创建失败，看 #4 |
| 没有 `spine character loaded` | 素材路径不对或 atlas 首行文件名不匹配 |
| `window: 0 x 0` 或 NaN | config.json 里的 `idleAnim` 名字在素材里不存在 |

素材路径可以直接在浏览器验证（dev 模式下）：

```bash
curl -I http://localhost:5173/spine/roxy/roxy.atlas   # 应为 200
```

注意 `img/` 是 Vite 的 `publicDir`，URL 里**不带** `img/` 前缀。

### #4 透明窗口不显示 / 黑屏

**症状**：启动后右下角没有窗口，但进程在跑。

**原因**：显卡驱动 + 透明窗口 + GPU 加速在某些集显上有 bug，或 DPI 缩放异常。

**解决**：在 `app.whenReady()` 之前加：

```ts
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
```

注意关掉 GPU 后 Spine 渲染会明显变慢，仅作为排查手段。

### #5 控制台刷 CSP 拒绝警告

**症状**：

```
Refused to connect to 'data:image/png;base64,...' because it violates
the following Content Security Policy directive: "connect-src ..."
```

**原因**：PixiJS v8 会 fetch 一张 base64 的 1x1 占位纹理。

**解决**：[src/renderer/index.html](src/renderer/index.html) 的 CSP 中 `connect-src`
必须包含 `data:`。当前配置已包含，如果你改过 CSP 记得别漏。

### #6 全屏应用没自动隐藏 / 误隐藏

**原理**：用 PowerShell 拉前台窗口 rect，如果完全覆盖了某个 display 的 `bounds`（含任务栏），就隐藏。PowerShell 启动 + Win32 调用约 200-400ms。

**调试**：看主进程控制台有没有 `[fullscreen-tracker] tick error: ...`。如果没有，前台窗口 rect 拉取正常，问题在判定逻辑。

修改 [src/main/fullscreen-tracker.ts](src/main/fullscreen-tracker.ts) 里的 covers 判定，可以加阈值（比如差 10px 算近似覆盖）：

```ts
const covers =
  fg.x <= x + 5 &&
  fg.y <= y + 5 &&
  fg.x + fg.w >= x + width - 5 &&
  fg.y + fg.h >= y + height - 5;
```

### #7 Spine 素材加载报版本不匹配

**症状**：控制台抛 skeleton version 相关错误。

**背景**：npm 上 `@esotericsoftware/spine-pixi-v8` 最低是 4.2，没有 4.1 版。本项目
在 [spine-character.ts](src/renderer/src/spine-character.ts) 里做了 4.1 → 4.2 的字段
转换（`bone.transform` → `bone.inherit`），所以 4.1 素材能直接用。

如果你的素材是 **4.0 或更早**，转换逻辑覆盖不到，需要用 Spine 编辑器重新导出为 4.1+。

另外注意 `package.json` 里 spine 版本是**精确锁定**的（不带 `^`）。不要升到 4.3.x ——
4.3 运行时对 4.2 数据格式又有变化，会破坏当前已验证的兼容性。

---

## 6. 项目结构

```
Desktop Girlfriend/
├── img/                              # Vite publicDir，渲染进程静态资源根
│   └── spine/roxy/                   # Spine 三件套（atlas + json + png）
└── project/
    ├── assets/characters/roxy/       # 角色配置（主进程 fs 直读，不走打包）
    │   └── config.json
    ├── src/
    │   ├── main/                      # 主进程
    │   │   ├── index.ts               # 入口、窗口创建、IPC 注册
    │   │   ├── taskbar-tracker.ts     # 任务栏位置跟踪
    │   │   └── fullscreen-tracker.ts  # 全屏检测（PowerShell + Win32）
    │   ├── preload/                   # contextBridge
    │   │   ├── index.ts               # 暴露给 renderer 的 API + 类型
    │   │   └── index.d.ts
    │   └── renderer/                  # PixiJS 渲染层
    │       ├── index.html             # CSP 配置在这里
    │       └── src/
    │           ├── main.ts             # 入口、装配、ticker
    │           ├── character.ts        # ICharacter 接口
    │           ├── spine-character.ts  # Spine 角色实现
    │           ├── drag.ts             # 拖拽 + 点击判定
    │           ├── menu.ts             # 右键菜单
    │           └── global.d.ts         # window.petApi 类型
    ├── electron.vite.config.ts
    ├── tsconfig.json                  # renderer
    ├── tsconfig.node.json             # main + preload
    └── package.json
```

**资源路径链路**（改素材位置时容易踩）：

`electron.vite.config.ts` 里 `publicDir: resolve(__dirname, '../img')` 指向的是
**project 外面**那个 `img/` 目录。dev 时它被暴露在 `http://localhost:5173/` 根，
prod 构建时整个目录复制到 `out/renderer/`。所以 config.json 里的路径写
`spine/roxy/roxy.atlas`，不带 `img/` 前缀。

---

## 7. 后续扩展指引

> 结构已经铺好，下面这些**不用改架构**，只填肉。

### 7.1 右键菜单切换人物

- [src/main/index.ts](src/main/index.ts) 加 IPC `character:list`，扫 `assets/characters/` 目录返回所有 id
- [src/renderer/src/menu.ts](src/renderer/src/menu.ts) 用 `registerMenuItem` 注册子菜单
- 切换时销毁旧的 `SpineCharacter`（有 `dispose()`）、创建新的，然后更新窗口大小 + 重对齐

### 7.2 更多互动动画

当前只用了 `idle` 和 `motion` 两个动画、单条轨道（track 0）。扩展方向：

- **多个互动动画随机挑**：把 config 的 `motionAnim` 改成数组，触发时随机选一个
- **按点击位置区分反应**：Spine 支持 `skeleton.getBounds()` 之外的骨骼级命中检测，
  可以判断点到的是头还是身体，播不同动画
- **叠加动画**：用 track 1 播放不影响主体姿态的动画（如表情），
  `state.setAnimation(1, 'blink', true)`

### 7.3 事件总线（feature 模块化）

预留位置：[src/renderer/src/main.ts](src/renderer/src/main.ts) 的 `boot()` 里可以加一个
`EventBus`，所有交互模块订阅：

```ts
// 示意
const bus = new EventBus();
bus.on('character:tap', () => character.triggerTap());
```

之后 feature 模块可以监听 `character:tap` 做语音、弹幕、对话等。

### 7.4 接入 AI 对话

`ICharacter` 接口已经把动画控制抽象出来了。要加对话：

- 加一个气泡 DOM 层（不要用 PixiJS 画文字，DOM 的排版和选中体验更好）
- 主进程加 IPC 调用 LLM API（密钥放主进程，不要暴露给 renderer）
- 收到回复时触发对应情绪的 Spine 动画

### 7.5 打包成单文件 exe

加 `electron-builder`：

```bash
npm install -D electron-builder
```

加 `package.json`：

```json
"build": {
  "appId": "com.you.desktop-girlfriend",
  "win": { "target": "nsis" },
  "files": ["out/**/*", "package.json"]
}
```

`npm run build` 后用 `electron-builder --win` 打包。

> 注意 `assets/characters/` 是主进程用 `fs` 直读的，不走 Vite 打包，
> 需要在 `files` 或 `extraResources` 里显式带上。

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
