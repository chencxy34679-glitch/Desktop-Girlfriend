# Desktop Girlfriend — 桌面宠物

Electron + PixiJS + Spine 骨骼动画实现的 Windows 桌面宠物。

角色素材使用《棕色尘埃2》的洛琪希（无职转生联动）。

---

## 特性

- 透明无边框窗口，**默认悬浮在任务栏之上，但不强制置顶**；右键菜单一键切到常驻，置顶于所有应用之上
- 像普通应用一样出现在 **Windows 任务栏底部**（`skipTaskbar: false`），双击任务栏图标可激活窗口
- **Spine 骨骼动画驱动**：待机循环自带眨眼与头发飘动
- **点击互动**：点一下播放触摸反应动画（挑眉、闭眼、特效），播完平滑过渡回待机
- **随机演出**：闲置时每隔 30~90 秒自动播一次互动动画
- 任务栏位置自适应（多显示器 / 分辨率变化，**对齐时使用窗口所在的 display，不再写死 primary**）
- 全屏应用置前时自动隐藏（Win32 + PowerShell 检测）
- **左键拖动**：用屏幕绝对坐标（screenX/screenY）算位移 + rAF 节流，0 抖动且不丢帧
- **右键菜单**：调整大小（缩小/放大/默认大小）+ 常驻开关 + 恢复默认位置 + 切换角色 + 退出；菜单按窗口 scale 等比缩放，自动夹紧到窗口客户区
- 默认位置下调整大小会**持续贴齐右下角**；用户主动拖动后再调大小则保留自定义位置
- 键盘 `+` / `-` / `0` 缩放（拖拽期间屏蔽，避免误触）
- 单实例锁（双开时第二个自动退出）
- **多角色切换**：右键 → "切换角色" → 选择已经放进 `assets/characters/<id>/` 的角色
- **Live2D 接口预留**：在 `core/live2d-character.ts` 接入 `pixi-live2d-display` 即可启用
- **AI 聊天 / TTS 通道预留**：`chat:ask` / `tts:speak` IPC 已占位，主进程填写 LLM / TTS API 即可
- **可嵌入 Vue**：`vue-adapter/mount-pet.ts` 直接在任何 Vue 组件挂一个桌面宠物
- 角色资源热加载结构（`assets/characters/<id>/config.json`）

---

## 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 18 | 已在 20.18.3 上验证 |
| npm | ≥ 9 | pnpm / yarn 亦可 |
| Windows | 10 / 11 | 全屏检测依赖 Win32 API，仅 Windows |

国内建议把 registry 指向 npmmirror —— `electron` 二进制从 GitHub releases 下载，裸连很慢。

---

## 快速开始

```bash
cd project

# 1. 安装依赖（--ignore-scripts 跳过 postinstall，再单独补 Electron 二进制）
npm install --ignore-scripts
ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" node node_modules/electron/install.js

# 2. 开发模式（HMR + DevTools）
npm run dev

# 3. 生产构建 + 启动
npm run build
npm run start
```

### 打包成 exe（分发用）

使用 [electron-builder](https://www.electron.build/) 打包成单文件 exe 或 NSIS
安装包，**正式环境不会打开 DevTools、不显示控制台**，用户双击即用。

```bash
# 一次性打包：生成 NSIS 安装包 + portable exe 到 release/
npm run dist

# 仅生成解压目录（首次验证打包配置用，不生成安装器）
npm run pack
```

产物在 `release/` 目录：

| 文件 | 说明 |
|---|---|
| `DesktopGirlfriend-0.1.0-x64.exe` | NSIS 安装包（首次安装用，可选桌面/开始菜单快捷方式） |
| `DesktopGirlfriend-0.1.0-portable.exe` | 绿色版，双击即用，无需安装 |
| `win-unpacked/` | 解包后的目录（`npm run pack` 产物） |

---

## Bug 修复记录

### "拖动时视觉上窗口变大、鼠标偏移，但第二次点击恢复正常"（v7：禁最大化 + setBounds）

**用户原话**：*现在拖动时候视觉层面窗口变大、鼠标偏移，但是第二次点击就恢复正常了*

**根因**：
1. **Win11 的 Snap Layout + Maximize 预览**：用户拖动窗口时，Windows 会预演"如果贴靠 / 最大化"的视觉效果，调 `SetWindowPos` 改 size。`maximizable: true`（默认）让这个预览生效。
2. **setSize vs setBounds 在 Windows 上的差异**：v6 的 `endDrag` 用 `setSize` 压回，但 Electron 的 `setSize` 在某些路径下会触发 `WM_SIZE` 而非完整的 `WM_WINDOWPOSCHANGING`，Windows DWM 可能有视觉抖动 / 鼠标偏移。
3. **第二次点击"恢复"**：第一次 drag-end 时 setSize 没把 size 真正压回（Windows 覆盖），但因为没再触发 SetWindowPos，下一次 drag-start 时 frozenSize 等于 Windows 看到的 size，看起来"稳定了"。

**修缮（v7）**：

| 改动 | 文件 |
|---|---|
| `BrowserWindow({ maximizable: false, fullscreenable: false })` —— 禁掉 Win11 系统级 maximize 预览 | [src/main/index.ts](project/src/main/index.ts) |
| `onExternalResize` 用 `setBounds` 替代 `setSize`，一次性锁 position + size | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `endDrag` 用 `setBounds` 替代 `setSize`，压回 frozenSize 时同时锁位置 | [src/main/window-state.ts](project/src/main/window-state.ts) |

```ts
new BrowserWindow({
  ...
  resizable: false,
  maximizable: false,      // ★ 禁掉 Win11 Snap Layout 的最大化预览
  fullscreenable: false,   // ★ 禁掉系统全屏
});

// freeze 路径：
win.setBounds({ x: pos[0], y: pos[1], width: frozenSize[0], height: frozenSize[1] }, false);
```

**预期行为**：
- 拖动期间 Windows 不再主动调 SetWindowPos（maximizable=false 禁用预览）
- 即使有 resize，setBounds 比 setSize 更"硬"地压回，视觉上 size 不抖
- 第二次拖动 size 也保持不变

### "不管几次拖动都应该是保持原有窗口不变"（v6：endDrag 强制压回）

**用户原话**：*不管几次拖动都应该是保持原有窗口不变的呀，大小的调整只能靠右键菜单*

v4/v5 的 freeze 在 drag 期间工作，但日志显示 `drag-end` 时 size 已经不是 frozenSize（被 Windows SetWindowPos 改过了）。下一次 `beginDrag` 重新读 size 当作新 frozenSize，导致 frozenSize **每次拖动都被污染、越涨越大**。

**修缮**：在 `endDrag` 时强制 `setSize` 回 frozenSize：

```ts
endDrag(win) {
  this.isDragging = false;
  ...
  if (!win.isDestroyed()) {
    win.setMinimumSize(64, 64);
    win.setMaximumSize(0, 0);
    // ★ 强制把 size 设回 frozenSize
    if (this.frozenSize) {
      const cur = win.getSize();
      if (cur[0] !== this.frozenSize[0] || cur[1] !== this.frozenSize[1]) {
        console.log('[main][END-FREEZE]', cur, '→', this.frozenSize);
        this.internalResize = true;
        win.setSize(this.frozenSize[0], this.frozenSize[1], false);
        this.internalResize = false;
      }
    }
  }
}
```

**用户诉求**：窗口大小的调整**只能**通过右键菜单（`调整大小` → 缩小/放大/默认大小）或键盘 `+`/`-`/`0` 触发。所有其他路径（拖动 / Windows 系统层 / DPI / 任何 setSize 路径）都被强制回到 frozenSize。

**完整的不变式**：
1. drag-start 记录 `frozenSize`
2. drag 期间 `setMin/Max = frozenSize` 锁 + resize event setSize 兜底
3. **drag-end 强制 setSize 回 frozenSize**（v6 关键）
4. drag-end 后 `frozenSize` 不变；多次拖动 size 始终等于首次 drag-start 时的值
5. 用户用右键菜单或键盘调 size → `tryResize` 主动 setSize，更新 `frozenSize`

| 改动 | 文件 |
|---|---|
| `endDrag` 末尾强制 setSize 回 frozenSize | [src/main/window-state.ts](project/src/main/window-state.ts) |

### "晃动之后窗口的长度和宽度都会变大"（v5：size 锁死 + 关 Snap）

**用户反馈日志（v4 之后）**：
```
[main] drag-start  window= 533 x 767
[main][FREEZE] external resize during drag, forcing 599 x 804 → 428 x 660
[main][FREEZE] external resize during drag, forcing 598 x 805 → 428 x 660
...
[main] drag-end    window= 604 x 808      ← 这里已经是 604x808 而非 frozenSize 428x660
```

**关键观察**：v4 的 freeze 看似生效，但 `drag-end` 时 size 已经变成了 604x808 —— 说明 Windows 在 setSize 之后又改回更大的尺寸（SetWindowPos 比我们的 setSize 更"强势"）。同时 frozenSize 在每次 drag 之间递增（428 → 604 → 622 → 628），因为 `endDrag` 把"被 Windows 改过"的 size 写回了 frozenSize。

**修缮**（v5，三层加固）：
1. **`beginDrag` 用 `setMinimumSize` + `setMaximumSize` 把窗口锁死在 frozenSize**——Windows SetWindowPos 在这两个 API 夹紧范围内，即使 Windows 想 Snap Layout 也会被夹紧。
2. **`endDrag` 解除锁定** —— `setMinimumSize(64, 64)` + `setMaximumSize(0, 0)`（0 表示无上限）。
3. **`endDrag` 不再更新 frozenSize** —— 让 `beginDrag` 重新读最新值，避免被外部 resize 污染冻结点。
4. **关闭 Chromium 的 Snap Layout features** —— `disable-features=SnapLayout,WindowSnap`，让 Win11 不会主动触发贴靠预览。

| 改动 | 文件 |
|---|---|
| `beginDrag(win)` 调 `setMinimumSize(frozenW, frozenH)` + `setMaximumSize(frozenW, frozenH)` 锁死 | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `endDrag(win)` 调 `setMinimumSize(64, 64)` + `setMaximumSize(0, 0)` 解锁；不更新 frozenSize | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `onExternalResize` 不再写 frozenSize | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,SnapLayout,WindowSnap')` | [src/main/index.ts](project/src/main/index.ts) |

**三重保障**：
- 关掉 Snap Layout features（不让 Windows 主动调窗口）
- setMin=setMax=frozenSize（即使 Windows 调了也被夹紧）
- resize event setSize 兜底（万一前两层都失效）

### "晃动之后窗口的长度和宽度都会变大"（v4：Win11 Snap Layout 兜底）

**用户反馈日志**：
```
[main] drag-start  window= 533 x 767
[main][size-change] 533 x 767 → 534 x 771 isDragging= true
[main][size-change] 534 x 771 → 549 x 786 isDragging= true
...
[main][size-change] 646 x 870 → 664 x 876 isDragging= true
```

**关键观察**：日志里有 `[main][size-change]` 但**没有**对应的 `[main][setSize]` —— 我们的程序根本没主动 setSize，但窗口还在持续变大。

**真正根因**：**Win11 的 Snap Layout（多任务分屏）** —— 用户拖动窗口时，Windows 系统通过 Win32 `SetWindowPos` 主动调整窗口尺寸（"贴靠预览"），完全绕过 Electron 的 `BrowserWindow.setSize`。v3 的五道关卡拦的是我们的 setSize，拦不住系统调用。

**修缮**：监听 `BrowserWindow.on('resize')`，**任何** resize 来源（不论谁触发的）在拖拽期间都强制调回 drag-start 时记录的 `frozenSize`。

| 改动 | 文件 |
|---|---|
| `WindowState` 新增 `frozenSize` / `internalResize` / `onExternalResize` 三件套 | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `beginDrag(win)` 记录当前 size 为 frozenSize | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `endDrag(win)` 把当前 size 更新为新的 frozenSize | [src/main/window-state.ts](project/src/main/window-state.ts) |
| `tryResize` 内部 setSize 时设 `internalResize=true` 避免 resize → freeze → setSize 死循环 | [src/main/window-state.ts](project/src/main/window-state.ts) |
| 主进程 `createMainWindow` 后挂 `attachResizeGuard(win)` → `win.on('resize', () => winState.onExternalResize(win))` | [src/main/index.ts](project/src/main/index.ts) |

**绝对保障**：
- 拖拽期间任何 resize（程序 / 系统 / 用户拖拽边缘），都被强制调回 drag-start 时的 size
- 之前 v3 的五道关卡（renderer/主进程 setSize 拦截）保留

副作用：拖拽期间即使 Win11 想做贴靠预览，也会被强制撤销 —— 用户感知不到 Snap 提示，但拖动过程会顺滑。

### "晃动之后窗口的长度和宽度都会变大"（v3：绝对保障）

### "晃动之后窗口的长度和宽度都会变大"（v2：防抖 timer 误触）

**根因**：之前 `tryResize` 用 80ms debounce timer；若 timer 挂着时用户进入拖拽，timer 在拖拽期触发 setSize。

**修缮**（已被 v3 覆盖）：取消 timer，同步 setSize + 拖拽期挂起。

### "长按拖拽晃动，窗口会不断变大 / 点击默认位置失效 / 人物逐渐偏离"（v1：初版）

**根因**：
- 拖拽期间 renderer 的 keyboard +/-/0 仍触发 `applyScale` → `resizeWindow` → 主进程 `setSize`
- 主进程 `window:move-by` 中 "`payload.dx/dy != 0` 就把 `atDefaultPosition=false`"，长按微动也算离开默认位置
- `screen.getPrimaryDisplay()` 在多显示器场景贴错屏

**修缮**（v3 已覆盖）：drag-start/end 三段式上锁、累计位移阈值、`getDisplayMatching`。

### "长按拖拽晃动，窗口会不断变大 / 点击默认位置失效 / 人物逐渐偏离"（初版反馈）

**根因**（在 `doc/Bug/Desktop Girlfriend Bug.md` 中提出）：

1. 拖拽期间 renderer 的 keyboard 监听器仍响应 `+` / `-` / `0` → 触发 `applyScale` → `resizeWindow` → 主进程 `setSize`，视觉上窗口一直在变。
2. 主进程 `window:move-by` 中"`payload.dx/dy != 0` 就把 `atDefaultPosition=false`"，长按微动也算"已离开默认位置"，导致紧接着 reset 失效。
3. 对齐逻辑用 `screen.getPrimaryDisplay()`，但窗口在副屏上时贴不到正确位置。

**修缮**（[src/main/window-state.ts](project/src/main/window-state.ts) + [drag.ts](project/src/renderer/src/drag.ts) + [main.ts](project/src/renderer/src/main.ts)）：

- 新增 `WindowState` 状态机统一管理拖拽锁、resize 防抖、位置策略：
  - `beginDrag` / `endDrag` 三段式状态，进入拖拽期后 setSize 全部挂到 `pendingSize`，drag-end 合并生效。
  - 累计位移 < `DRAG_LEAVE_THRESHOLD_PX`（默认 12px）视为"长按微动"，drag-end 时自动重置为默认位置模式、贴回右下。
  - 对齐用 `screen.getDisplayMatching(win.getBounds())` —— 跟随窗口所在 display。
- renderer 的 keyboard 缩放在 `isDragging=true` 期间直接 return（见 [main.ts:255-265](project/src/renderer/src/main.ts)）。
- drag 期间 `move-by` 上报累计位移而不再单步重置 `atDefaultPosition`。

### "调整大小后，恢复默认位置偶尔不对"

- 原因：之前 `alignWindowToTaskbar` 用 `screen.getPrimaryDisplay()`，但窗口已在副屏；同时 `snapWindowAfterResize` 把用户拖动过的位置也强制贴回右下。
- 修缮：`alignWindowToTaskbar` → `WindowState.alignToDefault(win)`，统一通过 `getDisplayMatching` 选 display；`snapAfterResize` 改读 `this.atDefaultPosition` 决定是否贴右下。

---

## 架构概览

### 目录结构

```
Desktop Girlfriend/
├── img/                                  # Vite publicDir
│   └── spine/<role>/                     # Spine 三件套
└── project/
    ├── assets/characters/<id>/           # 角色配置
    │   └── config.json
    ├── src/
    │   ├── shared/                       # 主 / 渲染进程共用类型
    │   │   ├── ipc-channels.ts
    │   │   └── character-config.ts
    │   ├── main/                         # 主进程
    │   │   ├── index.ts
    │   │   ├── window-state.ts           # 拖拽锁 / 对齐 / 默认位置
    │   │   ├── character-loader.ts
    │   │   ├── taskbar-tracker.ts
    │   │   ├── fullscreen-tracker.ts
    │   │   └── ipc/                      # IPC handler 按域拆分
    │   │       ├── character.ts
    │   │       ├── chat.ts               # AI 聊天占位（接入 LLM）
    │   │       └── tts.ts                # TTS 占位（接入语音合成）
    │   ├── preload/index.ts              # contextBridge：petApi
    │   └── renderer/
    │       ├── index.html
    │       └── src/
    │           ├── main.ts               # 装配
    │           ├── drag.ts               # 屏坐标拖拽 + drag-start/end 上报
    │           ├── menu.ts               # 右键菜单
    │           ├── electron-adapter.ts   # electron → core 适配
    │           ├── core/                 # ★ 与 Electron 解耦的核
    │           │   ├── i-character.ts
    │           │   ├── spine-character.ts
    │           │   ├── live2d-character.ts        # 接口预留
    │           │   ├── character-factory.ts       # 按 type 选实现
    │           │   ├── character-manager.ts       # lifecycle / 切换 / 缩放
    │           │   ├── event-bus.ts               # 事件驱动
    │           │   ├── chat-adapter.ts            # chat:ask + token 流
    │           │   ├── tts-adapter.ts             # tts:speak + state
    │           │   └── speech-bubble.ts           # 聊天气泡 DOM
    │           └── vue-adapter/
    │               └── mount-pet.ts       # ★ Vue 嵌入入口
    ├── electron.vite.config.ts
    ├── tsconfig.json / tsconfig.node.json
    └── package.json
```

### 多角色切换

1. 在 `project/assets/characters/<新id>/config.json` 写一份配置（参考 roxy 的）。
2. 在 `img/spine/<新id>/` 放素材（或 `img/live2d/<新id>/` 放 model3.json）。
3. 启动后右键 → "切换角色" → 选目标角色；主进程推流 `character:active-changed`，renderer 自动销毁旧角色、加载新角色、重置窗口尺寸。

### 接入 Live2D

1. `npm i pixi-live2d-display`
2. 在 [core/live2d-character.ts](project/src/renderer/src/core/live2d-character.ts) 把 `Live2DEnabled` 改为 `true`，解开 dynamic import 的注释。
3. config.json 里写：
   ```json
   {
     "id": "haru",
     "displayName": "春",
     "type": "live2d",
     "live2d": {
       "modelUrl": "live2d/haru/haru.model3.json",
       "motionGroup": "tap"
     }
   }
   ```

### 接入 AI 聊天

- 主进程持有 LLM API key，绝不下发 renderer。
- 替换 [src/main/ipc/chat.ts](project/src/main/ipc/chat.ts) 中的占位实现，把 `chat:ask` 接成 `agent.stream(text)`，把每个 token 通过 `webContents.send(IpcChannels.ChatToken, { text, done: false })` 推流。
- 渲染层 `ChatAdapter` 已订阅 token 流，喷到 `bus.emit('chat:reply', { text, done })`。
- [core/speech-bubble.ts](project/src/renderer/src/core/speech-bubble.ts) 已经订阅 `'chat:reply'`，自动增量显示。

### 接入 TTS

- 主进程实现 `tts:speak`：调 Azure / 火山 / Edge TTS / Windows SAPI，然后把音频文件路径或 PCM 流推到 renderer 播。
- `TtsAdapter` 已就绪；`bus.emit('tts:state', { speaking })` 可让表情/字幕等模块感知"正在说话"。

### Vue 嵌入

```ts
// Vue 组件里
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { mountPet, type PetRuntime } from '@renderer/vue-adapter/mount-pet';

const root = ref<HTMLElement | null>(null);
const runtime = ref<PetRuntime | null>(null);

onMounted(async () => {
  if (!root.value) return;
  runtime.value = await mountPet(root.value, {
    initialCharacterId: 'roxy',
    adapter: {
      loadCharacter: async (id) => fetch(`/api/character/${id}`).then((r) => r.json()),
      listCharacters: async () => [
        { id: 'roxy', displayName: '洛琪希', type: 'spine' },
      ],
      resizeWindow: async () => true,
      onDragMove: ({ dx, dy }) => {
        // 宿主容器自己实现 transform: translate
        const el = root.value!;
        const t = (el as any).__petT ?? { x: 0, y: 0 };
        t.x += dx;
        t.y += dy;
        (el as any).__petT = t;
        el.style.transform = `translate(${t.x}px, ${t.y}px)`;
      },
    },
  });
});

onBeforeUnmount(() => runtime.value?.dispose());
```

`mountPet(container, opts)` 返回 `PetRuntime`，提供 `setActiveCharacter(id)` 和 `dispose()`，运行期完全脱离 Electron，适合嵌入任意 Vue / React / Vanilla 项目。

---

## 扩展指引

### 现有扩展位（已铺好，无需改架构）

| 想做什么 | 在哪里改 |
|---|---|
| 接自有素材的另一个角色 | `assets/characters/<id>/config.json` + `img/spine/<id>/`（详见前文） |
| 接 Live2D | 见上文 |
| 接 LLM 对话 | 替换 `src/main/ipc/chat.ts` 占位实现 |
| 接 TTS | 替换 `src/main/ipc/tts.ts` 占位实现 |
| 在 Vue 网站嵌入 | `vue-adapter/mount-pet.ts` |
| 新增右键菜单项 | `main.ts` 注册 `MenuItem`，或 feature 模块内 `registerMenuItem` |
| 自定义 ICharacter 类型 | 在 `core/` 加新实现，`character-factory.ts` 里按 `type` 分支 |

### 调试小贴士

- `npm run dev` 控制台三行 = 一切正常：
  ```
  [renderer] PIXI app init OK
  [renderer] spine character loaded
  [renderer] scale → 0.50 window: 327 x 567
  ```
- 想要看当前 loaded 角色 / scale / drag 状态，DevTools console 输入 `__pet`。

---

## 许可与版权

代码部分见 [LICENSE](LICENSE)（MIT）。

**但请注意以下两项不适用 MIT：**

1. **Spine 运行时** —— `@esotericsoftware/spine-pixi-v8` 采用 Spine Runtimes License，
   要求每个使用者持有自己的 Spine Editor 授权。详见 [NOTICE](NOTICE)。
2. **角色素材** —— `img/spine/roxy/` 下的素材来自《棕色尘埃2》，版权归 Neowiz / Round8
   Studio 所有，仅供个人学习与非商业用途，请勿再分发或商用。

本项目为个人学习性质，不隶属于也未获得上述任何一方的授权或背书。
