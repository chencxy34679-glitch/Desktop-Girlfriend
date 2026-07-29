# Desktop Girlfriend — 桌面宠物

Electron + PixiJS + Spine 骨骼动画实现的 Windows 桌面宠物。

角色素材使用《棕色尘埃2》的洛琪希（无职转生联动）。

---

## 特性

- 透明无边框窗口，悬浮在任务栏之上，不抢前台焦点
- **Spine 骨骼动画驱动**：待机循环自带眨眼与头发飘动
- **点击互动**：点一下播放触摸反应动画（挑眉、闭眼、特效），播完平滑过渡回待机
- **随机演出**：闲置时每隔 30~90 秒自动播一次互动动画
- 任务栏位置自适应（多显示器 / 分辨率变化）
- 全屏应用置前时自动隐藏（Win32 + PowerShell 检测）
- 左键长按拖动，右键菜单缩放（0.2x ~ 1.5x），键盘 `+` / `-` / `0`
- 单实例锁（双开时第二个自动退出）
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

### ⚠️ ELECTRON_RUN_AS_NODE 必须为空

这是本项目最常见的启动失败原因。若系统环境里设了 `ELECTRON_RUN_AS_NODE=1`（部分 Node
版本管理器、以及某些 Electron 应用的内置终端会设），`electron.exe` 会以 Node 模式运行，
`require('electron')` 返回的是**字符串路径**而不是 API 对象，报错形如：

```
TypeError: Cannot read properties of undefined (reading 'commandLine')
```

`npm run dev / start / run` 已在脚本里用 `set ELECTRON_RUN_AS_NODE=` 清除。
若手动启动，先执行：

```bash
# PowerShell
$env:ELECTRON_RUN_AS_NODE=""
# Git Bash
unset ELECTRON_RUN_AS_NODE
# 或单次运行
env -u ELECTRON_RUN_AS_NODE npx electron-vite dev
```

---

## 素材说明

角色素材是 **Spine 4.1.24** 导出的三件套，放在仓库根的 `img/` 下（该目录被 Vite 的
`publicDir` 暴露给渲染进程）：

```
img/spine/roxy/
├── roxy.atlas    # 图集描述，首行必须是 roxy.png
├── roxy.json     # 骨骼数据
└── roxy.png      # 图集贴图（2001x904，预乘 alpha）
```

模型包含两个动画：

| 动画 | 时长 | 用途 |
|---|---|---|
| `idle` | 4.0s | 循环待机，自带眨眼（1.4s 处）+ 头发飘动 |
| `motion` | 2.0s | 单次互动，点击或随机定时触发 |

### 换用自己的素材

1. 把三件套放到 `img/spine/<角色id>/`
2. **确保 `.atlas` 首行的贴图文件名与实际 png 文件名一致**（atlas 内是 basename 引用，
   按 atlas 所在目录解析）
3. 新建 `project/assets/characters/<角色id>/config.json`：

```json
{
  "id": "eris",
  "displayName": "艾莉丝",
  "spine": {
    "atlasUrl": "spine/eris/eris.atlas",
    "jsonUrl": "spine/eris/eris.json",
    "idleAnim": "idle",
    "motionAnim": "motion"
  },
  "meta": { "displayScale": 0.5 }
}
```

> `atlasUrl` / `jsonUrl` 相对 `img/` 目录，不写前导斜杠。

4. 改 `project/src/main/index.ts` 的 `CURRENT_CHARACTER_ID`

### 关于 Spine 4.1 与 4.2 运行时

npm 上 `@esotericsoftware/spine-pixi-v8` 最低版本是 4.2，没有 4.1 版本。好消息是
**4.2 运行时可以直接解析 4.1 的骨骼数据**，只有一个破坏性改动需要处理：

`bone.transform` 字段在 4.2 被重命名为 `bone.inherit`。本项目在
`spine-character.ts` 加载 JSON 后、交给解析器前做了一次转换，因此 4.1 素材可直接使用，
不需要用 Spine 编辑器重新导出。若你的素材本身就是 4.2，这段转换是无害的空操作。

---

## 目录结构

```
Desktop Girlfriend/
├── img/                          # Vite publicDir，渲染进程的静态资源根
│   └── spine/roxy/               # Spine 三件套
└── project/
    ├── assets/characters/<id>/   # 角色配置（主进程用 fs 直接读，不走打包）
    │   └── config.json
    ├── src/
    │   ├── main/                     # 主进程
    │   │   ├── index.ts              # 窗口创建 + IPC
    │   │   ├── taskbar-tracker.ts    # 任务栏对齐
    │   │   └── fullscreen-tracker.ts # 全屏应用检测
    │   ├── preload/                  # contextBridge，暴露 petApi
    │   └── renderer/                 # PixiJS 渲染层
    │       ├── index.html
    │       └── src/
    │           ├── main.ts             # 入口：初始化、接线、ticker
    │           ├── character.ts        # ICharacter 接口
    │           ├── spine-character.ts  # Spine 角色实现
    │           ├── drag.ts             # 拖拽 + 点击判定
    │           └── menu.ts             # 右键菜单
    ├── electron.vite.config.ts
    └── package.json
```

---

## 技术要点

**坐标系**：`spine-pixi-v8` 内部设置了 `Skeleton.yDown = true`，骨骼世界坐标已与 Pixi
一致（Y 轴向下），不需要任何翻转。

**窗口尺寸**：Spine 4.1 数据的 skeleton 段没有 width/height，模型尺寸用官方的
`SkinsAndAnimationBoundsProvider` 在 `idle` 全时长上采样求最大包围盒得到，避免动画摆到
极限位置时被窗口裁掉。窗口尺寸 = 包围盒 × 缩放比例。

**CSP**：PixiJS v8 会 fetch 一张 base64 的 1x1 占位纹理，所以 `index.html` 的
`connect-src` 里必须有 `data:`，否则控制台会刷 CSP 拒绝警告。同时 Pixi 需要
`unsafe-eval`，入口处显式 `import 'pixi.js/unsafe-eval'`。

**渲染后端**：强制 `preference: 'webgl'`，绕开 WebGPU 在透明窗口下的渲染问题。

**闪烁**：主进程用 `disable-features=CalculateNativeWinOcclusion` 关掉 Windows 原生遮挡
计算，否则透明无边框窗口在快速拖动时会整窗重绘闪烁。

**调试**：开发模式下渲染进程的 console 会转发到主进程终端，不必每次都开 DevTools。

---

## 许可与版权

代码部分见 [LICENSE](LICENSE)（MIT）。

**但请注意以下两项不适用 MIT：**

1. **Spine 运行时** —— `@esotericsoftware/spine-pixi-v8` 采用 Spine Runtimes License，
   要求每个使用者持有自己的 Spine Editor 授权。详见 [NOTICE](NOTICE)。
2. **角色素材** —— `img/spine/roxy/` 下的素材来自《棕色尘埃2》，版权归 Neowiz / Round8
   Studio 所有，仅供个人学习与非商业用途，请勿再分发或商用。

本项目为个人学习性质，不隶属于也未获得上述任何一方的授权或背书。
