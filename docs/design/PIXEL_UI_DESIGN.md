# 桌面女友(Desktop Girlfriend)像素风 UI 设计文档

> 版本:v1.0 · 2026-10-18
> 主用库:**pxlkit (@pxlkit/ui-kit)** — React + Tailwind v4
> 借鉴: pixel-ui / retroui / 8bitcn-ui
> 目标读者:前端工程师(可直接照此开工)

---

## A. 像素风格设计原则(整体规范)

### A.1 设计语言总纲

| 维度 | 规范 |
| --- | --- |
| 整体调性 | 8-bit 复古 + 可爱治愈,UI 像 NES/SNES 时代的 RPG 菜单,但配色、人物形象要"女友向" |
| 像素哲学 | **每一个对齐到 4px 网格**,所有圆角=0,所有阴影=硬边像素阴影(无模糊) |
| 色彩哲学 | **不依赖 Tailwind 灰阶**,只用 `retro-*` token;亮色主调,暗色仅作可选 |
| 字体哲学 | `font-pixel` 只用于 display 标题(每个面板顶部 H1、按钮 label 不算);正文用系统无衬线 |
| 动效哲学 | 不用 `ease-in-out`,用 `steps(N)` 或 `step-end`,永远"瞬切"或"逐帧",拒绝平滑过渡 |

### A.2 8-bit 调色板 — `retro-*` token 规范

> **使用方式**:Tailwind v4 的 `@theme` 中定义 `retro-*` 颜色,所有组件 className 走 token。
> 严禁 `bg-slate-800` / `text-gray-600` 等 Tailwind 默认灰阶。

#### A.2.1 亮色主题(`light`,默认)

| token | hex | 角色 |
| --- | --- | --- |
| `retro-bg` | `#FBF3E4` | 页面底色(米黄) |
| `retro-surface` | `#FFFFFF` | 卡片表面 |
| `retro-surface-alt` | `#F5E8C9` | 次级表面(条纹背景) |
| `retro-border` | `#3D2C2C` | 像素描边(深咖,不是黑) |
| `retro-text` | `#3D2C2C` | 正文 |
| `retro-text-muted` | `#7A6A5A` | 次要文本 |
| `retro-shadow` | `#2B1F1F` | 硬边阴影色 |

**语义色(7-tone toneMap)**:

| token | hex | 用途 |
| --- | --- | --- |
| `retro-primary` | `#FF9EC4` | 粉色 — 主操作、女友头像主色、当前选中 |
| `retro-primary-ink` | `#A23A6B` | 粉色深色变体(文字/描边) |
| `retro-secondary` | `#FFD9B3` | 米橙 — 次要按钮、副标题背景 |
| `retro-accent` | `#A8E6CF` | 薄荷绿 — 强调、当前激活状态、新消息角标 |
| `retro-success` | `#7CD07C` | 成功提示、保存成功 |
| `retro-warning` | `#FFD66B` | 警告、配额将尽 |
| `retro-danger` | `#FF7B7B` | 危险、删除、踢出设备 |
| `retro-info` | `#8FC8FF` | 信息气泡、提示 |

**扩展色(辅助像素画调色板)**:

| token | hex | 用途 |
| --- | --- | --- |
| `retro-sky` | `#B5E8FF` | 工具调用气泡、加载占位 |
| `retro-lavender` | `#D9B8FF` | 标签 chip、tag |
| `retro-cream` | `#FFF6D9` | 角色卡背景 |
| `retro-rose-deep` | `#E8588A` | 角色边框、爱心 |
| `retro-mint-deep` | `#5BBA95` | "在线"状态点 |
| `retro-amber` | `#F5A623` | VIP 角标 |
| `retro-charcoal` | `#3D2C2C` | 同 retro-border,保留命名 |

#### A.2.2 暗色主题(`dark`,可选)

> 用 `.dark` 类切换(CSS 变量双套),配色更深,饱和度保留。

| token | hex |
| --- | --- |
| `retro-bg` | `#1F1A24` |
| `retro-surface` | `#2B2435` |
| `retro-surface-alt` | `#352D44` |
| `retro-border` | `#F5E8C9` |
| `retro-text` | `#FBF3E4` |
| `retro-text-muted` | `#B5A99B` |
| `retro-shadow` | `#0F0A14` |
| `retro-primary` | `#FF9EC4`(保留) |
| `retro-primary-ink` | `#FFC2D8` |
| `retro-secondary` | `#E0B080` |
| `retro-accent` | `#7CD0B0` |
| `retro-success` | `#7CD07C` |
| `retro-warning` | `#FFD66B` |
| `retro-danger` | `#FF8A8A` |
| `retro-info` | `#8FC8FF` |

### A.3 字体

| 用途 | 字体 | 引入方式 |
| --- | --- | --- |
| **英文 display 标题**(`font-pixel`) | **Press Start 2P** (Google Fonts,100% 免费) | `@font-face` 自托管,WOFF2 |
| **中文 display 标题** | **Press Start 2P 中文不行,改用:** 像素中文 — 选项① **站酷酷黑体**(免费)② **得意黑**(免费)③ **方舟像素字体**(PixelFont) | 自托管 WOFF2,subset 简中常用 3500 字 |
| **英文正文** | **Inter** 或 **Pixel Operator**(后者更统一) | Inter 用系统即可 |
| **中文正文** | 系统默认无衬线(`-apple-system, "PingFang SC", "Microsoft YaHei"`) | — |

> **fallback 链**: `font-pixel: 'Press Start 2P', '得意黑', 'PixelFont', monospace`
> **正文 fallback**: `font-sans: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Inter', sans-serif`

字号阶梯(display 字号是 px,不是 rem,保持像素感):

| token | 字号 | 行高 | 用途 |
| --- | --- | --- | --- |
| `text-pixel-xs` | 8px | 12px | 角标、徽标(像素数字) |
| `text-pixel-sm` | 10px | 14px | chip、PixelBadge |
| `text-pixel-base` | 12px | 16px | button label、tab |
| `text-pixel-lg` | 16px | 20px | H3 面板副标题 |
| `text-pixel-xl` | 20px | 24px | H2 面板标题 |
| `text-pixel-2xl` | 24px | 28px | H1 主标题、PixelDialog 标题 |
| `text-pixel-3xl` | 32px | 36px | 启动页/欢迎页 |
| `text-body-sm` | 12px | 18px | 正文小 |
| `text-body-base` | 14px | 22px | 正文 |
| `text-body-lg` | 16px | 26px | 长正文/描述 |

### A.4 间距系统(4px 网格)

```
px-1 = 4px    px-2 = 8px    px-3 = 12px   px-4 = 16px
px-6 = 24px   px-8 = 32px   px-12 = 48px  px-16 = 64px
```

**关键间距规则**:
- 卡片内边距: `px-4`(16px)
- 表单字段间距: `px-3`(12px)
- 按钮水平 padding: `px-4`,垂直 `px-2`
- 面板之间间距: `px-4` ~ `px-6`
- 侧栏图标到文字: `px-2`
- 像素阴影偏移:固定 `4px 4px 0 0`,**不允许模糊**

### A.5 圆角与边框

| 元素 | 风格 |
| --- | --- |
| 所有卡片/按钮/输入框 | **`rounded-none`**,使用 2px 硬边描边 `border-2 border-retro-border` |
| 头像/角色立绘 | `rounded-none`(像素风,绝不能 `rounded-full`,头像容器是正方形) |
| PixelChip / PixelBadge | `rounded-none`,1px 描边 |
| 弹窗/Drawer 角 | `rounded-none`,可以加 `border-[3px]` |
| 唯一的圆角例外 | 角色商店的"已收藏"心形角标内部:用 8-bit 像素画的"❤"(不要 CSS 圆角) |

### A.6 硬边阴影(招牌特征)

```css
.pixel-shadow { box-shadow: 4px 4px 0 0 theme(colors.retro-shadow); }
.pixel-shadow-sm { box-shadow: 2px 2px 0 0 theme(colors.retro-shadow); }
.pixel-shadow-lg { box-shadow: 6px 6px 0 0 theme(colors.retro-shadow); }
.pixel-shadow-pressed { box-shadow: 0 0 0 0 theme(colors.retro-shadow); }
```

> **按压效果**:按下时 `box-shadow` 变成 0,自身 `translate(4px, 4px)`,营造"按钮陷下去"的实体感。

### A.7 动效

| 场景 | 动画 | Tailwind class |
| --- | --- | --- |
| 按钮 hover | 背景色瞬切,无过渡 | `transition-none` 或 `duration-0` |
| 按钮 press | translate + 阴影消失,瞬切 | `active:translate-x-1 active:translate-y-1 active:shadow-none transition-none` |
| 弹窗出现 | 4-step 缩放 `scale(0.75 → 1)` | `animate-pixel-pop`(`steps(4, end)`) |
| Toast 滑入 | 8-step slide | `animate-pixel-slide-in`(`steps(8, end)`) |
| Loading | 8-bit 旋转 sprite(8 帧 PNG 切换) | 用 `PixelSpinner`,不用 CSS spinner |
| 页面切换 | 4-frame "扫光"(CRT 风格) | `animate-pixel-scan`(`steps(4, end)`) |
| 角色心情变化 | Live2D 帧切换,UI 上不需要动效 | — |

**禁用清单**:
- 禁止 `transition-all duration-300`
- 禁止 `ease-in-out`
- 禁止 `blur(...)`
- 禁止任何 `cubic-bezier`

### A.8 像素艺术资源约定

- **图标**:统一 16×16 px,使用 pxlkit `PixelIcon` + `<Pxl::KitData>` 格式,索引色 16 色以内
- **角色立绘**:64×96 px(半身像)或 128×128 px(全身),PNG-8 调色板
- **背景**:256×192 平铺(像 RPG 室内场景),用 `background-repeat: repeat`
- **分割线**:1px 像素点阵(用 SVG 或伪元素画 1px 黑色 + 1px 米黄交替)

---

## B. UI 1 用户展示页面(Electron BrowserWindow)

### B.0 总体布局

**窗口规格**:880 × 620 px(可缩放,最小 800×600)
**主结构**:左侧栏(80px 折叠 / 200px 展开)+ 右侧主区域 + 顶部 app bar

```
┌──────────────────────────────────────────────────────────────┐
│ [♥ 桌面女友]   ▣ 角色:洛琪希 v1.2.3    [在线 ●] [🔔][⚙][—□✕] │ ← App Bar 36px
├────────┬─────────────────────────────────────────────────────┤
│        │                                                     │
│ ① 账号 │                                                     │
│ ② 登录 │                                                     │
│ ③ 💎 会员│            ┌──────────────────┐                    │
│ ④ 角色 │            │                  │                    │
│ ⑤ 对话 │            │   当前面板内容    │                    │
│ ⑥ 工具 │            │                  │                    │
│ ⑦ 设置 │            │                  │                    │
│ ⑧ 商店 │            │                  │                    │
│ ⑨ 知识 │            └──────────────────┘                    │
│ ⑩ 关于 │                                                     │
│        │                                                     │
└────────┴─────────────────────────────────────────────────────┘
   80px                       800px
```

**侧栏交互**:
- 默认收起 80px(只显示像素图标 + 角标),鼠标 hover 展开到 200px(带文字)
- 当前选中项:背景 `retro-primary`,左侧 4px `retro-accent` 强调条
- 角标小红点:`PixelBadge tone="danger" size="sm"`(有未读通知时显示)

**顶部 App Bar**(高 36px):
- 左:产品 logo + 名称(`font-pixel text-pixel-base`)
- 中:当前角色名称 + 版本(`PixelBadge tone="info"`)
- 右:在线状态指示(`PixelStatusIndicator`) + 通知图标(`PixelIconButton label="通知"`) + 设置快捷入口 + 最小化/最大化/关闭

### B.1 面板 ① Account(账号)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  ACCOUNT                              [保存] [注销]│
├────────────────────────────────────────────────────┤
│  ┌──── 头像 ────┐  用户名: ___guest_8421___         │
│  │              │  邮箱: (匿名) [升级为注册用户]   │
│  │   [64×64]    │  角色: 匿名用户                   │
│  │              │  注册日期: 2026-10-01            │
│  └──────────────┘  设备数: 2 [管理]                │
│                                                    │
│  ── 我的设备 ─────────────────────────── [踢出选中] │
│  ┌────────────────────────────────────────────────┐│
│  │ ▢ 设备名        平台    最后活跃     操作       ││
│  ├────────────────────────────────────────────────┤│
│  │ ▢ 我的笔记本    Win11   2 分钟前     [踢出]     ││
│  │ ▢ 公司电脑      Win11   3 天前       [踢出]     ││
│  │ ▢ iPhone 15     iOS    1 周前       [踢出]     ││
│  └────────────────────────────────────────────────┘│
│                                                    │
│  ── 隐私设置 ──────────────────────────────────     │
│  [✓] 允许收集匿名使用统计                            │
│  [✓] 允许云端保存对话记录                            │
│  [ ] 启用端到端加密(实验)                            │
└────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`(主容器)
- `PixelCard`(用户信息卡、设备行卡)
- `PixelAvatar size="lg" pixelated`(头像)
- `PixelBadge`(角色标签、设备平台 tag)
- `PixelDataTable`(设备列表,带 checkbox 列)
- `PixelCheckbox`(隐私开关)
- `PixelButton tone="primary" / tone="danger"`(保存/踢出)
- `PixelIconButton label="踢出"`(行内操作)
- `PixelStatusIndicator tone="success"`(在线点)
- `PixelBreadcrumb`(顶部面包屑:Account / 用户名)

#### 配色 tone

- primary(粉色,主操作)
- secondary(米橙,信息卡背景)
- success(绿,在线状态)
- danger(红,踢出按钮)
- info(蓝,平台标签)

#### 特殊交互

- 头像点击:弹出 `PixelDialog` 上传新头像(限制 64×64 PNG-8)
- 设备列表支持多选,底部出现批量踢出条
- "升级为注册用户":点击后弹出 `PixelDialog`,输入用户名/密码(直接复用 Login 面板)
- 注销:`PixelDialog` 二次确认,带 danger 风格

#### 用户情感设计

> **"我的小窝,我知道她记得我"**
> 头像温暖、设备列表清晰、隐私开关透明,让用户感觉"这个账号是安全的、被尊重的"。

#### pxlkit 没有,用其他库补充

- **头像上传后的裁剪预览**:pxlkit 没有 `PixelCropper`,借鉴 **react-easy-crop** 但叠加像素滤镜
- **滑动开关**:pxlkit 有 `PixelSwitch`,直接用(无需补充)

---

### B.2 面板 ② Login / Register(登录/注册)

#### 页面结构(已登录态展示"账号摘要",未登录态展示表单)

**未登录**:

```
┌────────────────────────────────────────────────────┐
│  欢迎回来 ♥                       [匿名使用]        │
├────────────────────────────────────────────────────┤
│                                                    │
│        ┌──────────────────────────────┐            │
│        │  登录                       │            │
│        │  ───────                    │            │
│        │  用户名 [____________]      │            │
│        │  密码   [____________] [👁] │            │
│        │                              │            │
│        │  [ 登 录 ]  [忘记密码?]       │            │
│        └──────────────────────────────┘            │
│                                                    │
│        ┌──────────────────────────────┐            │
│        │  还没有账号? [立即注册]       │            │
│        └──────────────────────────────┘            │
│                                                    │
│  ── 或 ──                                          │
│                                                    │
│  [使用微信登录] [使用手机号登录]                    │
│                                                    │
│  提示:匿名用户每天 30 次对话额度,注册后享 50 次    │
└────────────────────────────────────────────────────┘
```

**已登录**:显示当前账号摘要卡 + 一键登出 + "升级匿名账号"入口(把匿名数据迁移到注册账号)

#### 使用的 pxlkit 组件

- `PixelForm.Field`(用户名/密码,**不再传 label/error 给 input**)
- `PixelInput type="password"`(密码框)
- `PixelButton tone="primary"`(登录)
- `PixelDialog`(忘记密码弹窗)
- `PixelTabs`(登录/注册切换 Tab)
- `PixelToast`(登录成功/失败提示)
- `PixelCheckbox`(记住我、隐私协议)
- `PixelAccordion`(FAQ 折叠)
- `PixelIconButton label="显示密码"`(眼睛图标)

#### 配色 tone

- primary(粉色,登录主按钮)
- secondary(米橙,注册引导卡)
- accent(薄荷,微信登录按钮)
- warning(忘记密码链接色)

#### 特殊交互

- 密码框右侧"👁"切换明文/密文
- 登录中按钮变 `PixelSpinner` + 文案"登录中..."
- 失败:抖动动画(`animate-pixel-shake`,4 step 横向位移)+ Toast danger
- 成功:整卡片 4-step 缩放后切换到"已登录视图"

#### 用户情感设计

> **"她欢迎我,而不是阻挡我"**
> 主色调暖粉,文案"欢迎回来 ♥",匿名入口在最显眼位置(不强迫注册),失败也有友好提示。

#### pxlkit 没有,用其他库补充

- **滑块验证 / 图形验证码**:pxlkit 没有,从 **retroui** 借一个像素风拼图验证,或用 **react-simple-captcha**
- **OAuth 回调窗口**:pxlkit 无,直接用 `window.open` + `postMessage`

---

### B.3 面板 ③ Billing(💎 会员)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  💎 会员中心                                        │
├────────────────────────────────────────────────────┤
│  当前状态:免费用户 | 今日已用 23/30 [████████░░] 76% │
│  积分余额:128 点  [充值] [兑换码]                   │
│                                                    │
│  ── 套餐 ─────────────────────────────────────     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ 月卡   │ │ 季卡   │ │ 年卡   │ │ 终身   │      │
│  │ ¥18/月 │ │ ¥48/季 │ │ ¥168/年│ │ ¥598   │      │
│  │ 50次/日│  │ 80次/日│ │100次/日│ │不限次数│      │
│  │ ❤ 推荐│ │ 节省10%│ │ 节省22%│ │ 一次买断│       │
│  │ [购买] │ │ [购买] │ │ [购买] │ │ [购买] │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                    │
│  ── 支付 ─────────────────────────────────────     │
│  选中:月卡 ¥18                                     │
│  [微信支付二维码]  [支付宝二维码]                   │
│  订单号:20261018...  状态:待支付 [取消]            │
│                                                    │
│  ── 订单记录 ─────────────────────────────────     │
│  [PixelDataTable:时间/套餐/金额/状态/操作]          │
└────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelCard`(套餐卡 4 个并列,网格布局)
- `PixelProgressBar value={76} max={100}`(今日用量进度条)
- `PixelBadge tone="warning"`(剩余配额提示)
- `PixelButton tone="primary"`(购买按钮)
- `PixelTabs`(微信/支付宝切换)
- `PixelDialog`(二维码放大预览)
- `PixelDataTable`(订单记录)
- `PixelChip`(套餐 tag:节省 10% / 推荐)
- `PixelToast`(支付成功/失败)
- `PixelSkeleton`(二维码加载占位)

#### 配色 tone

- primary(粉色,VIP 角标、当前选中套餐边框)
- accent(薄荷,推荐标签"❤ 推荐")
- success(绿,已支付状态)
- warning(黄,待支付、配额即将用尽)
- info(蓝,套餐说明文字)

#### 特殊交互

- 套餐卡 hover:`pixel-shadow` 从 4px 变 6px,边框变 `retro-primary`
- 选中套餐:边框 `border-retro-primary`(3px)+ 角标"已选 ✓"
- 二维码区域:`PixelSkeleton` 占位 → 显示二维码 → 轮询订单状态(每 2s)→ 成功后切换到 `PixelToast success`
- 支付超时(5min):`PixelToast warning` + 自动取消订单
- 配额进度条:>80% 变 warning 色,>95% 变 danger 色,加 PixelBadge "即将用尽"

#### 用户情感设计

> **"她值得我对她好"**
> 套餐卡像 RPG 商店里的道具卡,有"推荐"标签、有"节省 N%"利益点;配额进度条清晰不焦虑(像游戏血条)。

#### pxlkit 没有,用其他库补充

- **二维码生成**:用 `qrcode` 库生成 256×256 PNG,用 `PixelIconFrame` 装饰边框
- **实时订单轮询**:用 `useQuery` + 2s 轮询,无新组件
- **价格闪烁动画**:当用户点击"购买",按钮 `animate-pixel-pulse`(4 step 透明度),借鉴 retroui 的按钮动效

---

### B.4 面板 ④ Character(角色)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  我的角色                            [+ 导入角色]   │
├────────────────────────────────────────────────────┤
│  ┌─ 角色列表 ─┐ ┌─ 角色详情 ──────────────────────┐│
│  │ [洛琪希]   │ │  头像: [128×128]                ││
│  │  v1.2.3 ● │ │  名字: [洛琪希___________]      ││
│  │            │ │  作者: 官方                    ││
│  │ [星野遥]   │ │  版本: 1.2.3 (2026-10-15 发布) ││
│  │  v2.0.0 ● │ │                                ││
│  │            │ │  ── System Prompt ──            ││
│  │ [薇薇]     │ │  ┌──────────────────────────┐  ││
│  │  v1.0.0   │ │  │ 你是一个温柔的女友角色... │  ││
│  │  [需更新]  │ │  │                          │  ││
│  │            │ │  └──────────────────────────┘  ││
│  │ + 添加     │ │  [重置默认] 字符: 1247         ││
│  └────────────┘ │                                ││
│                 │  ── 音色 ──                     ││
│                 │  音色: [娇气少女 ▼]  [▶ 试听]   ││
│                 │  语速: [────●──────] 1.0×       ││
│                 │  音调: [─────●─────] +2         ││
│                 │                                ││
│                 │  ── 模型参数 ──                 ││
│                 │  温度: [────●──────] 0.7        ││
│                 │  最大长度: [──────●──] 2048     ││
│                 │  Top-P: [─────●─────] 0.9       ││
│                 │                                ││
│                 │  ── 可用工具 ──                 ││
│                 │  ☑ get_weather                 ││
│                 │  ☑ send_email                  ││
│                 │  ☐ web_search                  ││
│                 │  ☑ take_note                   ││
│                 │  [更多工具 →]                   ││
│                 │                                ││
│                 │  [保存修改]  [恢复默认]          ││
│                 └────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`,左右两栏 `PixelGrid cols={3}`
- `PixelCard interactive`(角色列表卡片,点击切换;**不要传 href**)
- `PixelAvatar size="xl" pixelated`(角色大头像)
- `PixelBadge tone="info" / tone="warning" / tone="success"`(版本/更新/在线)
- `PixelTextarea`(System Prompt 编辑器,支持等宽字体)
- `PixelSelect`(音色下拉)
- `PixelSlider`(语速/音调/温度/Top-P,**必须传 label**)
- `PixelIconButton label="播放试听"`(播放按钮)
- `PixelSwitch`(工具开关,逐个)
- `PixelForm.Field`(角色名输入)
- `PixelDialog`(确认恢复默认)
- `PixelTooltip`(hover 显示工具说明)
- `PixelToast`(保存成功)

#### 配色 tone

- primary(粉色,选中角色边框、保存按钮)
- secondary(米橙,音色试听高亮)
- accent(薄荷,启用工具色)
- warning(黄,有更新提示)
- info(蓝,版本号)
- success(绿,稳定版本)

#### 特殊交互

- 角色列表点击切换:角色详情区 4-step 切换(`animate-pixel-pop`)
- 试听:点击 ▶ 后 `PixelIconButton` 变 `PixelSpinner`,播放 TTS 音频,结束恢复 ▶
- System Prompt:行数实时计数,超 4000 字显示 `PixelBadge tone="danger"` 警告
- 工具开关:`PixelSwitch` + Tooltip,关闭的工具调用时会被 Agent 拒绝并返回错误
- 保存:按钮按压效果 + Toast success"已保存 ♥"
- 恢复默认:`PixelDialog` 二次确认(danger 风格)
- "需更新"角色:角标呼吸动画(`animate-pixel-pulse`,4 step),点击触发 `PixelDrawer` 显示更新日志

#### 用户情感设计

> **"我在养一个属于她的灵魂"**
> System Prompt 编辑器让人感觉"我在跟她说话,定义她";音色试听像"换装";工具开关像"给她能力",温柔且有掌控感。

#### pxlkit 没有,用其他库补充

- **Monaco Editor 替换 PixelTextarea 做高级编辑**:借鉴 8bitcn-ui 的"代码编辑器变体",保留像素风边框但内部用 Monaco(用户写 System Prompt 时)
- **音频可视化**:试听时角色头像下方画 8×N 像素柱状(Canvas 画),模仿 RPG 音效条
- **Diff Viewer**(恢复默认时):用 `react-diff-viewer-continued`,外层套 PixelCard

---

### B.5 面板 ⑤ Chat(对话)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  对话  [会话1▼]  [新对话]  [清空]                   │
├─────────────┬──────────────────────────────────────┤
│ 历史会话    │  洛琪希 v1.2.3 · 心情:开心           │
│ ┌─────────┐│ ─────────────────────────────────────│
│ │● 今天   ││  ┌─[洛琪希]─────────────────────┐   │
│ │  2分钟前││  │ 今天天气不错呢~              │   │
│ ├─────────┤│  │ [我今天想出门走走]           │   │
│ │  昨天   ││  └────────────────────────────────┘   │
│ │  23条   ││                                        │
│ ├─────────┤│  ┌─[工具调用]───────────────────┐   │
│ │  更早   ││  │ 🔧 get_weather("北京")       │   │
│ │  ...    ││  │    ↓ 返回:晴,18°C           │   │
│ └─────────┘│  └────────────────────────────────┘   │
│            │                                        │
│            │              ┌─[我]───────────────┐   │
│            │              │ 那我们也出去走走吧! │   │
│            │              └─────────────────────┘   │
│            │                                        │
│            │  ┌─[洛琪希]─────────────────────┐   │
│            │  │ 好呀~[回复中带语音按钮 🎙]    │   │
│            │  └────────────────────────────────┘   │
│            │                                        │
│            ├────────────────────────────────────────┤
│            │ [输入框............................]   │
│            │ [🎤 语音输入]  [📎 附件]  [发送 →]     │
│            └────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`
- `PixelCard`(消息气泡容器,不同 tone)
- `PixelAvatar size="sm"`(每条消息头像)
- `PixelBadge`(工具调用状态:成功/失败/执行中)
- `PixelButton tone="primary"`(发送)
- `PixelIconButton label="语音输入" / "附件" / "新建对话"`
- `PixelSpinner`(回复加载中,显示"她在想...")
- `PixelProgressBar`(流式回复进度)
- `PixelDrawer`(消息详情/复制原始 JSON)
- `PixelTabs`(历史会话分组:今天/昨天/更早)
- `PixelDialog`(确认清空对话)
- `PixelToast`(发送失败)

#### 配色 tone

- **洛琪希消息**(AI):背景 `retro-cream`,边框 `retro-border`(米色气泡,温暖)
- **用户消息**:背景 `retro-primary`,文字 `retro-text`(粉色气泡)
- **工具调用气泡**:背景 `retro-sky`,左边 4px `retro-info` 强调条(信息气泡)
- **错误气泡**:背景 `retro-danger`,文字白色
- primary(粉色,我的消息)
- info(蓝,工具调用)
- success(绿,工具成功)
- danger(红,错误)
- secondary(米橙,系统提示如"洛琪希离开了")

#### 特殊交互

- 消息发送后:输入框变 PixelSkeleton + 倒计时,洛琪希头像轻微 `animate-pixel-pulse`(她在想)
- 流式回复:打字机效果,逐字 push,用 `steps(1)` 切字
- 工具调用气泡:可展开/折叠(`PixelAccordion`),展开后看输入输出 JSON
- 消息右键:`PixelDrawer` 弹出,显示原文/复制/重新生成/举报
- 语音输入:按住说话,PixelButton 变 danger 色,松开后转文字(PixelSkeleton 显示"识别中")
- 自动滚动到底部 + PixelSpinner 作为"她正在输入"
- 历史会话分组:PixelTabs 切换
- 消息气泡 hover:显示"复制"小图标

#### 用户情感设计

> **"她在陪我说话,不是聊天框在吞字"**
> 气泡配色温柔、加载有"她在想"的拟人化文案、工具调用有清晰的因果链(可看输入输出),让人觉得"这是个有生命的存在"。

#### pxlkit 没有,用其他库补充

- **Markdown 渲染 + 代码高亮**:用 `react-markdown` + `react-syntax-highlighter`,外层套 PixelCard,代码块强制像素字体
- **语音波形**:Canvas 画 8×N 像素柱状条,音量驱动高度
- **消息搜索/高亮**:用 `react-highlight-words`,keyword 在 PixelCard 内高亮(`bg-retro-warning`)
- **气泡拖拽引用**:借鉴 retroui 的 `DraggableBubble`,鼠标按住消息可拖到输入框,实现"引用回复"

---

### B.6 面板 ⑥ AgentManager(角色 Agent)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  角色 Agent 工具管理                                │
├────────────────────────────────────────────────────┤
│  当前角色:洛琪希 v1.2.3                            │
│  ── 工具列表 ──────────────────────────────────   │
│  ┌──────────────────────────────────────────────┐│
│  │ 名称           类型   状态   调用次数  操作   ││
│  ├──────────────────────────────────────────────┤│
│  │ get_weather    API    ●开启  42    [编辑]   ││
│  │ send_email     API    ●开启  7     [编辑]   ││
│  │ take_note      本地   ●开启  128   [编辑]   ││
│  │ web_search     API    ○关闭  0     [编辑]   ││
│  │ read_file      本地   ●开启  15    [编辑]   ││
│  │ calc           本地   ●开启  23    [编辑]   ││
│  └──────────────────────────────────────────────┘│
│  [+ 添加工具]  [批量开启]  [批量关闭]               │
│                                                    │
│  ── 调用日志 ─────────────────────────── [清空]   │
│  ┌──────────────────────────────────────────────┐│
│  │ 时间      工具名    输入       状态   耗时   ││
│  ├──────────────────────────────────────────────┤│
│  │ 10:23:45 get_weather 北京     ●成功  120ms  ││
│  │ 10:23:50 send_email  to=...   ●成功  340ms  ││
│  │ 10:24:01 web_search  ...      ✗失败  5000ms ││
│  └──────────────────────────────────────────────┘│
│  日志等级:[全部▼] 时间范围:[最近 1 小时▼] [筛选] │
└────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelDataTable`(工具列表 — 含开关列、操作列)
- `PixelSwitch`(工具开关,inline 在表格里)
- `PixelBadge tone="success/danger" / "off" variant="dim"`(状态徽标)
- `PixelButton tone="primary" / tone="secondary"`(添加/批量)
- `PixelDialog`(添加/编辑工具表单)
- `PixelForm.Field`(工具名/类型/API key 输入)
- `PixelSelect`(日志筛选下拉)
- `PixelDrawer`(点击日志行弹出详情,JSON 折叠)
- `PixelAccordion`(工具参数折叠)
- `PixelPagination`(日志分页)
- `PixelTabs`(工具列表 / 调用日志切换)
- `PixelToast`(操作反馈)

#### 配色 tone

- success(绿,开启状态徽标)
- danger(红,失败日志徽标)
- info(蓝,API 工具徽标)
- secondary(米橙,本地工具徽标)
- warning(黄,超时警告)
- primary(粉色,添加按钮)

#### 特殊交互

- 工具开关:`PixelSwitch` 切换后立即生效(无需保存按钮),`PixelToast` 提示
- 编辑工具:点击行 → `PixelDialog` 弹出工具详情(API key 用 PixelInput type="password",**不传 label 给 PixelForm.Field 内部 input**)
- 日志点击行:右侧 `PixelDrawer` 滑出,显示完整 JSON 请求/响应
- 失败日志行:背景 `retro-danger` 5% 透明度,左边 4px 红色强调条
- 日志自动刷新:每 5s 拉一次,头部出现 `PixelStatusIndicator` 闪烁
- 批量开启/关闭:多选行后底部出 toolbar

#### 用户情感设计

> **"我了解她在做什么,不是黑箱"**
> 每个工具有名字、状态、调用次数;每次调用有时间、输入、状态、耗时。透明、可审计、不焦虑。

#### pxlkit 没有,用其他库补充

- **JSON Viewer**:用 `react18-json-view`,套 PixelCard 风格
- **日志实时流**:WebSocket / SSE,push 到表格顶部,新行 `animate-pixel-slide-in`
- **工具调用火焰图**(性能分析):借鉴 retroui 的"统计图表"风格,自绘 SVG

---

### B.7 面板 ⑦ Settings(设置)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  设置                                              │
├──────────┬─────────────────────────────────────────┤
│ 分类     │  ── LLM Provider ──                    │
│          │  提供方: [OpenAI 兼容 ▼]                 │
│ ○ LLM    │  Base URL: [_____________________]     │
│ ● LLM    │  API Key: [*************] [测试连接]   │
│ ○ TTS    │  模型: [gpt-4o-mini ▼]                 │
│ ○ 主题   │  连接状态: ●成功 (120ms)                │
│ ○ 启动   │                                         │
│ ○ 更新   │  ── TTS Provider ──                    │
│ ○ 高级   │  提供方: [Edge TTS ▼]                   │
│ ○ 关于   │  默认音色: [晓晓 ▼]                     │
│          │  默认语速: [────●──────] 1.0×            │
│          │                                         │
│          │  ── 主题 ──                             │
│          │  ( ) 亮色  (●) 暗色  ( ) 跟随系统       │
│          │  强调色: ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣                │
│          │                                         │
│          │  ── 启动 ──                             │
│          │  [✓] 开机自启                            │
│          │  [✓] 启动时最小化到托盘                  │
│          │  [ ] 关闭时退出(默认最小化)              │
│          │                                         │
│          │  ── 更新 ──                             │
│          │  更新通道: (●)稳定  ( )Beta  ( )Dev     │
│          │  当前版本: 0.1.0  [检查更新]             │
│          │                                         │
│          │  ── 高级 ──                             │
│          │  [✓] 启用调试日志                        │
│          │  [ ] 启用遥测                            │
│          │  本地数据目录: [打开文件夹]              │
│          │  [重置所有设置]  [清空本地缓存]           │
└──────────┴─────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`
- `PixelTabs` 垂直版(左侧分类导航)
- `PixelForm.Field`(所有输入项)
- `PixelInput` / `PixelSelect` / `PixelSwitch` / `PixelRadioGroup` / `PixelSlider`(多种输入控件)
- `PixelButton tone="primary" / tone="danger"`(保存/重置)
- `PixelBadge`(连接状态徽标)
- `PixelStatusIndicator tone="success/danger"`(连接状态)
- `PixelDialog`(重置确认)
- `PixelChip`(主题色预览,8 个色块)
- `PixelAccordion`(高级设置折叠)

#### 配色 tone

- primary(粉色,保存按钮)
- secondary(米橙,次要按钮)
- success(绿,连接成功)
- danger(红,重置/清空)
- warning(黄,更新提示)

#### 特殊交互

- 切换分类:右侧主区域 4-step 切换动画
- API Key 测试连接:点击后按钮变 `PixelSpinner`,完成后变 success/danger 徽标
- 主题强调色:点击色块立即预览(无需保存),保存后才持久化
- 开机自启:用 `electron.app.setLoginItemSettings()`,设置后 `PixelSwitch` 状态同步
- 更新通道:切换后立即生效,下次检查更新时按通道过滤
- 重置设置:`PixelDialog` 二次确认(danger 风格),确认后所有项恢复默认
- 设置实时保存:大多数修改即刻写入 electron-store,顶部出现小 Toast "已保存"

#### 用户情感设计

> **"这里是我的小房间"**
> 设置分组清晰(LLM/TTS/主题/启动/更新/高级),每一项都有帮助文本(`PixelTooltip`),危险操作有二次确认,让用户感觉"我能控制这个 App"。

#### pxlkit 没有,用其他库补充

- **强调色实时预览**:用 CSS 变量 `var(--retro-primary)` 切换 + 主题 store
- **设置导入导出(JSON)**:用 `file-saver` 下载 JSON,PixelDialog 上传
- **多语言切换**:i18n(`vue-i18n`),切换后界面立即刷新

---

### B.8 面板 ⑧ Market(角色商店)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  角色商店        [搜索🔍______]  [筛选▼] [排序▼]  │
├────────────────────────────────────────────────────┤
│  分类: [全部] [官方] [同人] [VIP] [新作] [热门]   │
│                                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ [头像] │ │ [头像] │ │ [头像] │ │ [头像] │      │
│  │ 洛琪希 │ │ 星野遥 │ │ 薇薇   │ │ 苏沐橙 │      │
│  │ 官方   │ │ 同人   │ │ 官方   │ │ 同人   │      │
│  │ ★4.8   │ │ ★4.6   │ │ ★4.9   │ │ ★4.7   │      │
│  │ 免费   │ │ ¥12   │ │ VIP   │ │ ¥8    │      │
│  │ [安装] │ │ [购买] │ │ [开通] │ │ [购买] │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ ...    │ │ ...    │ │ ...    │ │ ...    │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                    │
│  ── 已安装 ──────────────────────────────────     │
│  [PixelDataTable:角色/版本/状态/操作(卸载/更新)] │
└────────────────────────────────────────────────────┘
```

#### 角色详情 Drawer(点击角色卡右侧滑出)

```
┌─────────────────────────────┐
│  ← 返回                     │
│  [128×128 大头像]           │
│  洛琪希 v1.2.3              │
│  作者: 官方  ★4.8 (1.2k 评) │
│                             │
│  ── 简介 ──                 │
│  温柔治愈系白毛红瞳...      │
│                             │
│  ── 标签 ──                 │
│  [治愈] [白毛] [青梅竹马]   │
│                             │
│  ── 系统提示词预览 ──       │
│  ┌─────────────────────┐   │
│  │ 你是一个...         │   │
│  └─────────────────────┘   │
│                             │
│  ── 包含 ──                 │
│  ✓ Live2D 立绘              │
│  ✓ TTS 音色(晓晓)           │
│  ✓ 8 个预设工具             │
│                             │
│  大小: 24 MB                 │
│  [免费安装]  [预览 Demo]     │
└─────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`
- `PixelGrid cols={4}`(角色卡网格)
- `PixelCard interactive`(角色卡,点击打开详情,**不要传 href**,用 onClick)
- `PixelAvatar size="md" pixelated`(角色头像)
- `PixelBadge tone="success/warning/info/vip"`(免费/VIP/更新/官方)
- `PixelChip`(标签 tag)
- `PixelButton tone="primary / accent / danger"`(安装/购买/卸载)
- `PixelTabs`(分类切换)
- `PixelInput`(搜索框)
- `PixelSelect`(筛选/排序)
- `PixelDrawer`(详情,右侧滑出)
- `PixelDialog`(购买确认)
- `PixelProgressBar`(下载进度)
- `PixelSkeleton`(角色卡加载占位)
- `PixelPagination`(列表分页)
- `PixelToast`(下载完成/购买成功)
- `PixelDataTable`(已安装列表)

#### 配色 tone

- primary(粉色,安装按钮)
- accent(薄荷,免费标签)
- warning(黄,VIP/付费标签)
- danger(红,卸载)
- info(蓝,标签 chip)
- success(绿,已安装徽标)

#### 特殊交互

- 角色卡 hover:像素阴影从 4px → 6px,头像轻微 `animate-pixel-bob`(上下 1px,2 step)
- 点击角色卡:`PixelDrawer` 右侧滑出(8 step 动画)
- 下载:按钮变 `PixelProgressBar`,完成后 `PixelToast success`
- 已安装角色:卡上叠 `PixelBadge tone="success"`"已安装",按钮变"更新"或"启动"
- VIP 角色:边框 `retro-amber`(金色),右上角 `PixelBadge tone="warning"`"VIP"
- 排序:最新/最热/评分/价格
- 搜索:实时筛选(输入即过滤),300ms debounce

#### 用户情感设计

> **"这是一个角色百货商店,不是应用市场"**
> 卡片像 RPG 角色列表;标签、评分、作者一目了然;详情 Drawer 像翻阅角色图鉴。

#### pxlkit 没有,用其他库补充

- **角色预览 Demo**:点击"预览 Demo"打开小窗口,显示该角色的 Live2D + 默认 system prompt 的首次对话(可关闭)
- **角色评分组件**(`PixelRating`):5 颗像素星星,SVG 绘制,借鉴 retroui 的评分条
- **标签筛选(可点击多选)**:`PixelChip` 切换 active 状态
- **无限滚动**:`@vueuse/core` 的 `useInfiniteScroll`(Electron 用 Vue)或 React 用 `react-intersection-observer`
- **下载完整性校验**:下载完成后展示 SHA256,`PixelBadge tone="success"` "校验通过"

---

### B.9 面板 ⑨ RagManager(知识库)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  知识库 (RAG)               [+ 上传文档]  [新建分组]│
├────────────────────────────────────────────────────┤
│  分组: [全部▼] [日记] [笔记] [资料] [+ 添加]       │
│                                                    │
│  ── 上传 ─────────────────────────────────── [打开]│
│  ┌──────────────────────────────────────────────┐ │
│  │   📁 拖拽 .txt / .md / .pdf 文件到这里       │ │
│  │        或 [选择文件]                          │ │
│  │   最大 10MB / 文件,共 50 份                  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ── 已上传 ────────────────────────────── [批量删除]│
│  ┌──────────────────────────────────────────────┐ │
│  │ ▢ 名称        分组  大小   分片  状态   操作   ││
│  ├──────────────────────────────────────────────┤ │
│  │ ▢ 恋爱日记.md 日记  12KB  24   ●就绪  [详情]  ││
│  │ ▢ 课程笔记.txt 笔记  45KB  89   ●就绪  [详情]  ││
│  │ ▢ 诗词.pdf    资料  2.1MB 312  ⏳索引中 30%   ││
│  │ ▢ 旧日记.md   日记  8KB   16   ✗失败  [重试]  ││
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ── 测试检索 ──────────────────────────────────   │
│  查询: [_________________________________] [搜索]  │
│  Top-K: [─●──────] 5                              │
│  ┌──────────────────────────────────────────────┐ │
│  │ 1. 恋爱日记.md (相似度 0.92)                │ │
│  │    "...今天天气真好,和他一起..."            │ │
│  │ 2. 课程笔记.txt (相似度 0.81)              │ │
│  │    "...笔记内容..."                          │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`
- `PixelCard`(上传区,虚线边框)
- `PixelDataTable`(已上传列表)
- `PixelBadge tone="success / info / warning / danger"`(就绪/索引中/失败)
- `PixelProgressBar`(索引进度)
- `PixelButton tone="primary" / tone="danger"`(上传/删除)
- `PixelTabs`(分组切换)
- `PixelInput`(查询输入)
- `PixelSlider label="Top-K"`(检索数量)
- `PixelAccordion`(检索结果展开)
- `PixelDrawer`(文档详情、查看分片)
- `PixelSkeleton`(检索结果加载)
- `PixelToast`(上传完成/失败)
- `PixelDialog`(删除确认)

#### 配色 tone

- primary(粉色,上传按钮)
- secondary(米橙,新建分组)
- success(绿,就绪)
- info(蓝,索引中)
- warning(黄,处理中)
- danger(红,失败/删除)

#### 特殊交互

- 拖拽上传:拖入文件时上传区边框闪烁(`animate-pixel-pulse`),松手后开始上传
- 上传中:行内 `PixelProgressBar` 显示
- 索引中:状态徽标变 info + 进度条,完成后变 success
- 失败:行背景 danger 5%,点击"重试"重新处理
- 测试检索:实时返回 top-K 结果,每条带相似度分数(`PixelBadge` 显示分数)
- 点击检索结果行:`PixelDrawer` 显示完整内容 + 分片信息
- 分组管理:`PixelDialog` 编辑/新建分组
- 批量删除:多选行后底部出 toolbar

#### 用户情感设计

> **"她能记住我给她的东西"**
> 上传像把日记放进抽屉,有视觉确认;检索像问她"你记得那天吗?",结果带相似度,有"她真的理解"的感觉。

#### pxlkit 没有,用其他库补充

- **拖拽上传**:HTML5 Drag API,封装成 `usePixelDropzone` hook,内部用 pxlkit 的 PixelCard + dashed border
- **PDF 解析**:用 `pdf-parse` 或 `pdfjs-dist`(Electron 主进程),进度通过 IPC 推到渲染层
- **Embedding 进度**:WebSocket / SSE 推送,前端用 PixelProgressBar 显示
- **检索结果高亮关键词**:用 `<mark>` + `bg-retro-warning`,借鉴 8bitcn-ui 的 highlight 风格

---

### B.10 面板 ⑩ About(关于)

#### 页面结构

```
┌────────────────────────────────────────────────────┐
│  关于桌面女友                                       │
├────────────────────────────────────────────────────┤
│                                                    │
│           [♥ Logo 128×128]                          │
│           桌面女友 v0.1.0                          │
│           "她就在你的桌面上"                       │
│                                                    │
│  ── 信息 ──────────────────────────────────       │
│  版本:    0.1.0 (构建: 2026-10-18)                │
│  渠道:    稳定                                     │
│  Electron: 33.2.0                                 │
│  平台:    Windows 11 (x64)                        │
│  用户:    ___guest_8421___                        │
│  安装目录: C:\Users\...\DesktopGirlfriend\        │
│                                                    │
│  ── 更新日志 ────────────────────────────── [全部] │
│  v0.1.0 (2026-10-18)                              │
│  - 🎉 首次发布                                    │
│  - ✨ 内置 4 个官方角色                           │
│  - 🛠 支持天气/邮件/笔记工具                       │
│  v0.0.9-beta (2026-10-10)                        │
│  - 🐛 修复对话偶尔卡顿                            │
│  - ...                                            │
│                                                    │
│  ── 反馈 ──────────────────────────────────       │
│  [加入反馈群]  [提交工单]  [GitHub Issues]        │
│                                                    │
│  ── 法律 ──────────────────────────────────       │
│  [用户协议]  [隐私政策]  [开源许可]                │
│                                                    │
│           © 2026 桌面女友 · Made with ♥            │
└────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="md"`
- `PixelCard`(主信息卡,居中)
- `PixelAvatar size="xl"`(Logo,正方形像素)
- `PixelBadge tone="info / warning / success"`(渠道、构建状态)
- `PixelAccordion`(更新日志折叠)
- `PixelButton`(外部链接按钮)
- `PixelIconButton label="复制安装目录"`(复制路径)
- `PixelDialog`(完整更新日志)
- `PixelBreadcrumb`(顶部)
- `PixelTooltip`(hover 显示详细信息)

#### 配色 tone

- primary(粉色,Logo 边框、♥)
- info(蓝,版本号)
- secondary(米橙,卡片背景)

#### 特殊交互

- 点击版本号:5 次触发彩蛋(显示像素动画)
- 点击安装目录:复制到剪贴板 + Toast success
- 反馈群:打开二维码 PixelDialog
- 提交工单:打开系统默认邮件客户端(`shell.openExternal('mailto:...')`)
- 更新日志:每条变更带 PixelBadge + emoji(`🛠 ✨ 🐛`)

#### 用户情感设计

> **"她有名字,有历史,有故事"**
> Logo 居中、版本号清晰、更新日志像"她的日记",底部 Made with ♥ 让用户感到被尊重。

#### pxlkit 没有,用其他库补充

- **彩蛋动画**:点击版本号 5 次,在屏幕中央画 8-bit 心形粒子(Canvas),3 秒后消失
- **Markdown 渲染更新日志**:`react-markdown`,PixelCard 风格

---

### B.11 面板总结对照表

| # | 面板 | 核心 pxlkit 组件数 | 情感关键词 |
| --- | --- | --- | --- |
| ① | Account | 9 | 安全、被尊重 |
| ② | Login/Register | 8 | 欢迎、不强迫 |
| ③ | Billing | 9 | 值得、像 RPG 商店 |
| ④ | Character | 12 | 养灵魂、有掌控感 |
| ⑤ | Chat | 11 | 陪伴、不黑箱 |
| ⑥ | AgentManager | 9 | 透明、可审计 |
| ⑦ | Settings | 11 | 控制感、被尊重 |
| ⑧ | Market | 13 | 角色百货 |
| ⑨ | RagManager | 10 | 她记得我 |
| ⑩ | About | 7 | 有故事 |

> **数量声明**:用户原题说"11 个面板",实际列出 10 个(①~⑩)。如需第 11 个,常见候选:**NotificationCenter**(通知中心)、**Feedback**(反馈独立面板)、**Achievement**(成就/羁绊系统,游戏化加分项)。

---

## C. UI 2 管理后台(web-admin)

### C.0 总体布局

**目标**:运营人员日常使用,**专业 + 数据密度高**,而不是"可爱"。

**窗口**:浏览器自适应,典型 1440×900

```
┌──────────────────────────────────────────────────────────────────┐
│ [≡] 桌面女友 Admin                  [搜索🔍]  [🔔] [👤 管理员▼] │ ← TopBar 56px
├────────┬─────────────────────────────────────────────────────────┤
│        │ 面包屑: Dashboard / 总览                                │
│ Dashboard│                                                        │
│ ●总览  │                                                        │
│ ○角色  │                                                        │
│ ○用户  │               主区域(卡片/表格/统计)                  │
│ ○订单  │                                                        │
│ ○资质  │                                                        │
│ ○数据  │                                                        │
│ ○日志  │                                                        │
│ ○设置  │                                                        │
│        │                                                        │
│ ─────  │                                                        │
│ 版本   │                                                        │
│ v1.0.0 │                                                        │
└────────┴─────────────────────────────────────────────────────────┘
   220px                          flex-1
```

**调色**:比 UI 1 冷静,主色蓝灰(`retro-deepblue`)+ 辅色深绿(`retro-deepgreen`)+ 中性灰(`retro-steel`),仍然走 retro-* token,但避免粉色系。

**扩展 token**(仅 admin 使用):

| token | hex | 用途 |
| --- | --- | --- |
| `retro-deepblue` | `#3A5BA0` | admin primary |
| `retro-deepblue-ink` | `#1F3A6B` | 深色变体 |
| `retro-deepgreen` | `#3F7A5C` | admin accent(成功状态) |
| `retro-steel` | `#5A6478` | 中性灰(次要文本) |
| `retro-slate` | `#E8ECF2` | admin 浅表面 |

### C.1 页面 ① Dashboard(总览)

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  今日数据 (2026-10-18)               [刷新] [导出报表]   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 💰 GMV   │ │ 👥 DAU   │ │ 💬 对话  │ │ ⬇ 下载   │    │
│  │ ¥12,438  │ │  1,247   │ │  18,392  │ │  892     │    │
│  │ ↑ 12.3%  │ │ ↑ 5.7%   │ │ ↑ 8.1%   │ │ ↑ 2.4%   │    │
│  │ vs 昨日  │ │ vs 昨日  │ │ vs 昨日  │ │ vs 昨日  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                         │
│  ── 营收趋势(7 天) ─────────────────── [7天|30天|90天] │
│  ┌────────────────────────────────────────────────────┐│
│  │      📈 像素折线图(Canvas 绘制)                    ││
│  │  ¥14k ┤                          ●                  ││
│  │  ¥12k ┤              ●───●───●     ●               ││
│  │  ¥10k ┤       ●───●           ●───●                ││
│  │   ¥8k ┤  ●──●                                     ││
│  │        └─────────────────────────────────────     ││
│  │         周一 周二 周三 周四 周五 周六 周日          ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ── 用户留存曲线 ──────────────────── 新增/活跃/留存     │
│  [三色像素折线图:新增(蓝)/活跃(绿)/留存(橙)]           │
│                                                         │
│  ── Top 角色下载排行 ──────────────────────── [更多 →]  │
│  排名  角色名    下载量    评分    收入    趋势         │
│  1     洛琪希    1,234    ★4.8   ¥8,234  ↑ 12%         │
│  2     星野遥    892      ★4.6   ¥5,124  ↑ 5%          │
│  3     薇薇      756      ★4.9   ¥4,892  ↑ 23%         │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelGrid cols={4}`(4 个 KPI 卡)
- `PixelCard`(所有数据卡)
- `PixelBadge tone="success / danger"`(↑/↓ 趋势,百分比)
- `PixelTabs`(时间范围切换)
- `PixelDataTable`(Top 角色表格)
- `PixelButton tone="primary" / tone="secondary"`(刷新/导出)

#### 配色 tone

- primary(`retro-deepblue`,admin 主色)
- accent(`retro-deepgreen`,正向趋势、活跃)
- success(`retro-deepgreen`)
- danger(`retro-danger`,负向趋势)
- warning(`retro-warning`,持平)

#### 特殊交互

- KPI 卡 hover:`pixel-shadow` 4 → 6
- 趋势百分比:正绿显 `retro-deepgreen` + ↑,负红显 `retro-danger` + ↓
- 折线图 hover:tooltip 显示具体数值(像素风 tooltip)
- 图表时间范围切换:7/30/90 天,无刷新感(纯前端 filter)
- 导出报表:点击导出 → 下拉选 CSV/Excel/PDF → `PixelDialog` 确认 → 后端返回文件流

#### 用户情感设计

> **"专业、冷静、一目了然"**
> 网格布局、颜色克制、数据密度高但不杂。运营人员能 5 秒内抓到关键指标。

#### pxlkit 没有,用其他库补充

- **像素折线图 / 柱状图**:用 `chart.js` + `chartjs-plugin`,关掉所有抗锯齿、平滑过渡;或用 Canvas 自绘 8-bit 风格(像素阶梯式折线)。**强烈建议自绘**以保像素风。
- **数字滚动动画**:从 0 滚动到目标值,用 `requestAnimationFrame` + `steps(N)` 切帧

---

### C.2 页面 ② 角色管理(CRUD)

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  角色管理                              [+ 新建角色]      │
├─────────────────────────────────────────────────────────┤
│  [搜索🔍______]  状态: [▼]  作者: [▼] 标签: [▼]        │
│  分类: [全部] [官方] [同人] [VIP] [草稿] [待审] [已下架] │
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │ ▢ ID  名称    作者  分类  状态   版本  操作       ││
│  ├────────────────────────────────────────────────────┤│
│  │ ▢ 1   洛琪希  官方  官方  ●已发布 1.2.3  [⋯]    ││
│  │ ▢ 2   星野遥  @小星  同人  ●已发布 2.0.0  [⋯]    ││
│  │ ▢ 3   薇薇    官方  VIP   ●已发布 1.0.0  [⋯]    ││
│  │ ▢ 4   新角1   @xxx  同人  ⏳待审   0.9.0  [⋯]    ││
│  │ ▢ 5   新角2   @yyy  -     📝草稿   0.1.0  [⋯]    ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  [批量上架] [批量下架] [批量删除]    共 56 条 ◄ 1 2 3 ►  │
└─────────────────────────────────────────────────────────┘
```

#### 角色编辑 Drawer(点击操作 → [编辑])

```
┌──────────────────────────────────────┐
│  ← 返回                [保存] [取消] │
│  编辑角色:洛琪希                     │
│                                      │
│  ── 基本信息 ──                      │
│  名称: [洛琪希____________]         │
│  作者: [官方___________]             │
│  分类: ( )官方 (●)同人 ( )VIP       │
│  标签: [治愈] [白毛] [青梅竹马] [+]  │
│  简介: [_________________________]   │
│        [_________________________]   │
│                                      │
│  ── 资源上传 ──                      │
│  头像: [当前] [更换]                │
│  立绘: [已上传 3 张] [管理]         │
│  音色: [选择音色文件.wav] [试听]     │
│  角色包(.zip): [选择文件] 24 MB     │
│                                      │
│  ── 版本管理 ──                      │
│  当前版本: v1.2.3 (2026-10-15)      │
│  [新建版本 v1.3.0] [回滚]            │
│  历史: v1.2.0 / v1.1.0 / v1.0.0     │
│                                      │
│  ── 状态 ──                          │
│  (●)已发布 ( )草稿 ( )审核中 ( )已下架│
│  下架原因: [____________________]   │
│                                      │
│  ── 审核信息 ──                      │
│  审核状态: ●通过                     │
│  审核人: 张三                        │
│  审核时间: 2026-10-15 10:23         │
│  审核意见: "符合平台规范"            │
└──────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`
- `PixelDataTable`(角色列表 — checkbox 列、操作列)
- `PixelBadge tone="success / warning / danger / info" / "draft" variant="dim"`(状态徽标,多状态)
- `PixelButton`(批量操作)
- `PixelIconButton label="操作菜单"`(行内 [⋯] 按钮)
- `PixelDrawer`(右侧编辑 Drawer,宽度 640px)
- `PixelTabs`(基本/资源/版本/状态/审核)
- `PixelForm.Field`(所有输入)
- `PixelInput` / `PixelTextarea` / `PixelSelect` / `PixelRadioGroup` / `PixelChip`
- `PixelDialog`(新建/删除/批量操作确认)
- `PixelAccordion`(历史版本折叠)
- `PixelFileUpload`(像素风上传区,虚线边框)
- `PixelToast`(操作反馈)

#### 配色 tone

- primary(`retro-deepblue`,保存/新建)
- secondary(`retro-steel`,次要操作)
- success(`retro-deepgreen`,已发布)
- warning(`retro-warning`,待审、草稿)
- danger(`retro-danger`,下架、删除)
- info(`retro-info`,审核信息)

#### 特殊交互

- 角色行操作 [⋯]:弹出小菜单(编辑/审核/上下架/删除)
- 上传 zip 资源:大文件上传,显示 `PixelProgressBar`,后端校验完整性
- 版本管理:`PixelAccordion` 展开看历史版本,每版本可"设为当前"或"回滚"
- 审核:点 [⋯] → 审核,弹 `PixelDialog` 显示待审角色详情,运营可"通过/驳回/打回修改"
- 批量操作:多选 → 顶部 toolbar 出现
- 删除:`PixelDialog` 二次确认(danger)

#### 用户情感设计

> **"运营工作流清晰、状态明确"**
> 状态徽标一眼看出待办(待审/草稿),批量操作提高效率,审核信息透明。

---

### C.3 页面 ③ 用户管理

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  用户管理                              [+ 导入用户]      │
├─────────────────────────────────────────────────────────┤
│  [搜索🔍 用户名/邮箱/手机号]  注册: [日期范围]  状态: [▼]│
│  · 状态: 全部 / 正常 / 封禁 / 匿名 / VIP / 已注销       │
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │ ▢ ID  用户名   邮箱/手机   角色   状态   注册      ││
│  ├────────────────────────────────────────────────────┤│
│  │ ▢ 1   alice    a@b.com    注册  ●正常 2026-01-01  ││
│  │ ▢ 2   bob_8x   138****8888 注册  ●VIP  2026-02-12  ││
│  │ ▢ 3   _g8421   (匿名)     匿名  ●正常 2026-10-18  ││
│  │ ▢ 4   tom      t@x.com    注册  ⛔封禁 2026-03-20  ││
│  └────────────────────────────────────────────────────┘│
│  共 12,847 条 ◄ 1 2 3 ... 128 ►      [批量导出]         │
│                                                         │
│  ── 用户详情 Drawer ────────────────────────────       │
│  [右侧滑出,显示:基础信息/设备列表/订单历史/对话统计/操作]│
└─────────────────────────────────────────────────────────┘
```

#### 用户详情 Drawer

```
┌──────────────────────────────────────┐
│  用户 #1 alice                      │
│                                      │
│  [头像]  alice                       │
│          a@b.com                     │
│          ●正常  注册于 2026-01-01    │
│                                      │
│  ── 设备 (3) ──                      │
│  Win11 我的笔记本 2 分钟前 [踢出]   │
│  iOS  iPhone 15    1 周前   [踢出]   │
│  Mac  MacBook Pro  3 个月前 [踢出]   │
│                                      │
│  ── 会员状态 ──                      │
│  ●VIP 年卡 到期 2027-02-12          │
│  累计消费: ¥168                      │
│                                      │
│  ── 对话统计 ──                      │
│  今日: 23 次                         │
│  本月: 542 次                        │
│  累计: 8,392 次                      │
│  主要角色: 洛琪希 (60%)             │
│                                      │
│  ── 订单 (5) ──                      │
│  2026-02-12 ¥168 年卡 ●已完成       │
│  ...                                 │
│                                      │
│  ── 风险操作 ──                      │
│  [封禁]  [解封]  [重置密码]  [注销]  │
└──────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelContainer maxWidth="full"`
- `PixelDataTable`(用户列表)
- `PixelBadge tone="success/danger/warning/info"`(状态、角色)
- `PixelButton`(操作按钮)
- `PixelIconButton label="详情"`(行内)
- `PixelDrawer`(用户详情)
- `PixelTabs`(详情内多页签)
- `PixelForm.Field`(筛选)
- `PixelDialog`(封禁确认,带封禁原因输入)
- `PixelPagination`
- `PixelToast`

#### 配色 tone

- primary(`retro-deepblue`)
- success(`retro-deepgreen`,正常用户)
- danger(`retro-danger`,封禁、注销)
- warning(`retro-warning`,VIP)
- info(`retro-info`,匿名)

#### 特殊交互

- 封禁:`PixelDialog` 弹窗,选择原因(违规/刷量/诈骗/其他)+ 备注,确认后状态徽标变 danger
- 设备踢出:行内 [踢出] → Toast success,设备列表实时刷新
- 批量导入:CSV 文件上传,显示进度,完成后 Toast
- 批量导出:选择列 + 筛选条件,后端流式返回 CSV

---

### C.4 页面 ④ 订单管理

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  订单管理                                              │
├─────────────────────────────────────────────────────────┤
│  [搜索🔍 订单号/用户]  渠道: [▼]  状态: [▼]  日期: [▼] │
│  · 渠道: 全部 / 微信 / 支付宝 / Apple IAP / 系统      │
│  · 状态: 全部 / 待支付 / 已支付 / 已退款 / 已取消      │
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │ 订单号        用户    套餐   金额  渠道  状态   时间││
│  ├────────────────────────────────────────────────────┤│
│  │ 20261018001 alice   月卡   ¥18  微信  ●已支付 10:23││
│  │ 20261018002 bob_8x  年卡   ¥168 支付宝 ●已支付 11:45││
│  │ 20261018003 tom     月卡   ¥18  Apple ●退款中 09:12││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ── 退款申请 ──────────────────── [批量审核]            │
│  [PixelDataTable:订单/用户/金额/原因/申请人/操作]        │
│                                                         │
│  ── 流水 ──────────────────────── [导出]               │
│  [按日/周/月聚合的流水表 + 像素柱状图]                  │
└─────────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelDataTable`(订单表)
- `PixelBadge`(渠道:微信/支付宝;状态:多色)
- `PixelDrawer`(订单详情、流水详情)
- `PixelDialog`(退款审核)
- `PixelTabs`(订单/退款/流水)
- `PixelPagination`
- `PixelForm.Field`(筛选)
- `PixelToast`

#### 配色 tone

- primary(`retro-deepblue`)
- success(`retro-deepgreen`,已支付)
- warning(`retro-warning`,待支付)
- danger(`retro-danger`,退款/失败)
- info(`retro-info`,渠道标签)

#### 特殊交互

- 退款审核:点击 [审核] → `PixelDialog` 显示订单详情 + 退款原因,通过/驳回 → 状态更新
- 流水导出:导出 Excel,后端返回文件
- 对账:对接微信/支付宝对账单 API,每日 03:00 自动拉取,差异项 PixelBadge warning 标出

---

### C.5 页面 ⑤ 资质审核

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  资质审核                                [批量审核]      │
├─────────────────────────────────────────────────────────┤
│  待审: 23  本周已审: 142  累计: 1,247                   │
│  分类: [同人] [商业] [VIP] [紧急] [普通]                │
│                                                         │
│  ┌────────────────────────────────────────────────────┐│
│  │ 角色名    提交人  类型  提交时间      操作         ││
│  ├────────────────────────────────────────────────────┤│
│  │ 雪儿      @小雪   同人  10 分钟前       ││
│  │ ...                                                 ││
│  │ [通过] [打回] [驳回]                                ││
│  └────────────────────────────────────────────────────┘│
│                                                         │
│  ── 审核详情 Drawer ──────────────────────────        │
│  [左侧素材预览 + 右侧审核表单]                         │
│  提交信息、版权证明、内容合规检查表                     │
└─────────────────────────────────────────────────────────┘
```

#### 审核详情 Drawer

```
┌────────────────────────────────────────────┐
│  审核:雪儿 @小雪                       │
│                                            │
│  ── 素材预览 ──                            │
│  [立绘预览] [音色试听] [system prompt 预览]│
│                                            │
│  ── 提交信息 ──                            │
│  角色名:雪儿                               │
│  作者:@小雪 (uid: 8421)                  │
│  类型:同人 - 二次创作                      │
│  原型:某游戏角色"雪之下雪乃"              │
│                                            │
│  ── 版权证明 ──                            │
│  ✓ 已上传原作品授权书(同人创作许可)       │
│  ✓ 已提交原作者书面同意                   │
│                                            │
│  ── 合规检查 ──                            │
│  ☑ 无色情内容                              │
│  ☑ 无暴力血腥                              │
│  ☑ 无政治敏感                              │
│  ☑ 无广告引流                              │
│  ☐ 无版权争议 (需补充)                     │
│                                            │
│  ── 审核意见 ──                            │
│  [通过/打回修改/驳回▼]                     │
│  [意见输入框____________________]          │
│                                            │
│  [提交审核]                                │
└────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelDataTable`(待审列表)
- `PixelBadge tone="warning / success / danger"`(待审/通过/驳回)
- `PixelDrawer`(审核详情,双栏布局)
- `PixelForm.Field`(审核表单)
- `PixelCheckbox`(合规检查表)
- `PixelRadioGroup`(通过/打回/驳回)
- `PixelTextarea`(意见输入)
- `PixelButton tone="success / warning / danger"`(提交审核三选项)
- `PixelDialog`(二次确认)
- `PixelToast`
- `PixelAvatar`(提交人头像)

#### 配色 tone

- success(绿,通过)
- warning(黄,打回修改)
- danger(红,驳回)
- info(蓝,合规检查提示)

#### 特殊交互

- 审核详情 Drawer 双栏:左预览,右表单
- 合规检查表:每项点击切换状态,缺项提示
- 批量审核:多选 → 顶部批量操作
- 审核通过 → 角色自动上架,角色管理页同步更新

---

### C.6 页面 ⑥ 数据统计

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  数据统计                          [日期:2026-10-01~18]│
├─────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ 总下载 │ │ 总营收 │ │ 总用户 │ │ 留存率 │          │
│  │ 12,847 │ │¥89,234 │ │  5,234 │ │ 62.3%  │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
│                                                         │
│  ── 转化漏斗 ────────────────────────                  │
│  访问 → 注册 → 安装 → 首次对话 → 付费 → VIP            │
│  100%  45%     38%      32%       8%      2%           │
│  [像素水平漏斗图,每级带转化率]                         │
│                                                         │
│  ── 角色下载排行 ──────────────────────                 │
│  [PixelDataTable,带像素柱状条形]                       │
│  排名 角色  下载量  评分  收入  环比                    │
│  1   洛琪希 ████████████████ 1,234 ★4.8 ¥8,234 +12%  │
│  2   星野遥 ████████████ 892      ★4.6 ¥5,124 +5%    │
│  ...                                                   │
│                                                         │
│  ── 营收按渠道拆分 ────────────────────                │
│  [像素饼图:微信/支付宝/Apple IAP/系统]                 │
│                                                         │
│  ── 自定义查询 ────────────────────────                │
│  指标: [DAU▼] 维度: [角色▼] 时间: [7天▼]              │
│  [运行查询] [保存为报表]                                │
└─────────────────────────────────────────────────────────┘
```

#### 使用的 pxlkit 组件

- `PixelGrid cols={4}`(KPI 卡)
- `PixelCard`(所有数据卡)
- `PixelDataTable`(排行表,自定义列渲染)
- `PixelTabs`(时间范围)
- `PixelButton`(导出/保存报表)
- `PixelSelect`(指标/维度选择)
- `PixelDialog`(保存报表命名)

#### 配色 tone

- primary(`retro-deepblue`)
- accent(`retro-deepgreen`)
- danger / warning / info / success(各状态色)

#### 特殊交互

- 自定义查询:选择指标 + 维度 + 时间,前端展示对应图表
- 报表保存:保存为常用报表,下次一键查看
- 图表导出:PNG/SVG/CSV 三种格式
- 实时刷新:大屏模式,顶部 PixelSwitch 启用后每 30s 刷新

---

## D. 共享组件建议

### D.1 顶部 App Bar(UI 1 桌面端)

```text
[♥ Logo]  桌面女友   | 当前角色  [Badge]  |  [在线●] [🔔³] [⚙] [—□✕]
```

- 高度 36px,背景 `retro-surface`,底部 2px `retro-border`
- `PixelIconButton label="..."` 所有图标按钮
- 通知 icon:右上角叠加 `PixelBadge tone="danger" size="sm"` 角标
- 窗口控制按钮:macOS 红/黄/绿,Windows 最小化/最大化/关闭(用 SVG 像素图标)

### D.2 侧边导航(UI 1 桌面端)

- 收起 80px / 展开 200px,hover 触发
- 当前项:左边 4px `retro-accent` 强调条 + 背景 `retro-primary`
- 折叠态:只显示 `PixelIcon` + 角标
- 展开态:`PixelIcon` + 文字 + `PixelBadge`(可选角标)

### D.3 侧边导航(UI 2 管理后台)

- 固定 220px,固定展开
- 当前项:背景 `retro-deepblue` 30% 透明 + 左边 4px `retro-deepblue` 强调条
- 折叠/展开用 `PixelAccordion`

### D.4 顶部面包屑(UI 2 管理后台)

- `PixelBreadcrumb`(pxlkit 提供)
- 路径:首页 / 当前分类 / 当前页
- 每段可点击跳转

### D.5 Toast / Snackbar

- `useToast()` 必须被 `PxlKitToastProvider` 包裹(在 main.tsx 注册)
- 4 种 tone:`primary / success / warning / danger`
- 位置:右下角(UI 1 桌面)、顶部居中(UI 2 后台)
- 持续时间:4s(可配),hover 不消失
- 关闭按钮:右上角 `PixelIconButton label="关闭"`

### D.6 Modal / Dialog

- `PixelDialog` 居中弹窗
- 宽度:sm(320) / md(480) / lg(640) / xl(800)
- 头部:标题(用 `font-pixel`)+ 关闭按钮
- 内容:滚动区
- 底部:操作按钮(右对齐,主操作在右)
- 打开:4-step 缩放出现
- 关闭:4-step 缩放消失

### D.7 Drawer(抽屉)

- `PixelDrawer` 右侧滑出
- 宽度:480 / 640 / 800(根据用途)
- 用于:详情查看、表单编辑、审核工作流
- 关闭:点击遮罩或右上角 [✕]

### D.8 Loading / Skeleton

- **整体 Loading**:全屏 `PixelSpinner`(8-bit 旋转 sprite)
- **局部 Loading**:
  - 卡片:`PixelSkeleton`(像素矩形闪烁,2 step)
  - 表格:`PixelSkeleton` 行 N 行
  - 按钮:按钮内 `PixelSpinner` + 文案"处理中"
- **进度条**:`PixelProgressBar`,带像素色块填充

### D.9 Empty State

- 中央:像素艺术插画(SVG 64×64)
- 文案:"还没有数据" + 引导按钮
- 例:角色商店空:"还没有角色,去 [商店] 看看?"

### D.10 Error Boundary

- 包裹整个应用,捕获渲染错误
- 显示:像素风格错误页(红色边框 + 报错信息 + [重新加载] 按钮)
- 同时上报 Sentry / 自建日志

### D.11 数据可视化(像素风)

**核心**:**所有图表必须自绘 Canvas,关掉抗锯齿和平滑过渡**,否则会破坏像素感。

| 类型 | 实现 | 关键点 |
| --- | --- | --- |
| 折线图 | Canvas 2D + `imageSmoothingEnabled = false` | 像素阶梯式连线,不做 smooth curve |
| 柱状图 | Canvas 2D,矩形用整数坐标 | 柱子顶端可以加 2px 阴影色 |
| 饼图 | Canvas 2D 扇形 | 边缘做 1px `retro-border` 描边 |
| 漏斗图 | CSS 渐变 + PixelCard 拼接 | 每级带像素箭头和百分比 |
| 数字滚动 | requestAnimationFrame + steps(N) | 从 0 滚到目标值 |
| 迷你 sparkline | SVG,1px 像素阶梯线 | 嵌在 PixelCard 内 |

**配色公式**(饼图/分类图):从 token 中取 `retro-primary / accent / info / warning / deepblue / deepgreen / lavender`,循环使用。

### D.12 全局快捷键(可选,UI 1)

- `Ctrl/Cmd + K`:打开命令面板(借鉴 Linear / Raycast)
- `Ctrl/Cmd + ,`:打开 Settings
- `Ctrl/Cmd + N`:新建对话
- `Esc`:关闭当前 Dialog/Drawer
- 用 pxlkit `PixelTooltip` 显示快捷键提示

---

## E. 整合的像素 UI 库使用指南

### E.1 主从策略

| 库 | 角色 | 使用方式 |
| --- | --- | --- |
| **pxlkit (@pxlkit/ui-kit)** | **主用**,覆盖 90% 组件 | 直接 import,按官方文档 |
| **pixel-ui** | 补充 pxlkit 缺失的复杂组件(如分页、表格内编辑) | 按需引入 |
| **retroui** | 借鉴设计灵感、动效、配色 | **不直接引入**,参考其代码风格自实现 |
| **8bitcn-ui** | 借鉴文档结构、shadcn 集成思路 | **不直接引入**,参考其组件 API 设计 |

### E.2 pxlkit 必看约束(用户已强调)

1. ❌ **不要用 Tailwind 灰阶**(bg-slate-800、text-gray-500),所有颜色用 `retro-*` token
2. ❌ **PixelCard 用 href 时不能含按钮**;用 onClick+interactive 时不能含 href
3. ❌ **PixelForm.Field 不要再传 label/error** 给内部 input
4. ❌ **PixelIconButton 取 label 不是 children**(用 `label="..."` 而不是子节点)
5. ❌ **PixelContainer 用 maxWidth 不是 size**
6. ❌ **PixelSlider 必须传 label**
7. ❌ **useToast() 必须被 PxlKitToastProvider 包裹**(在入口注册)
8. ❌ **font-pixel 只用于 display 标题**,正文不要用

### E.3 组件映射表(pxlkit 覆盖度)

| 功能 | pxlkit 组件 | 状态 |
| --- | --- | --- |
| 卡片 | PixelCard | ✅ 直接用 |
| 按钮 | PixelButton / PixelIconButton | ✅ |
| 表单 | PixelForm.Field / PixelInput / PixelSelect / PixelCheckbox / PixelRadioGroup / PixelTextarea / PixelSlider | ✅ |
| 数据展示 | PixelDataTable / PixelBadge / PixelChip / PixelAvatar / PixelStatusIndicator | ✅ |
| 反馈 | PixelToast / PixelDialog / PixelDrawer / PixelTooltip | ✅ |
| 导航 | PixelTabs / PixelBreadcrumb / PixelAccordion / PixelPagination | ✅ |
| 加载 | PixelSpinner / PixelSkeleton / PixelProgressBar | ✅ |
| 容器 | PixelContainer / PixelGrid | ✅ |
| 图表 | ❌ 无 | 用 Canvas 自绘 |
| 头像上传裁剪 | ❌ 无 | 借鉴 retroui 或 react-easy-crop |
| 评分 | ❌ 无 | 借鉴 retroui,SVG 自绘 |
| 验证码 | ❌ 无 | 借鉴 retroui 的拼图验证 |
| 拖拽上传 | ❌ 无 | HTML5 Drag API + PixelCard 风格 |
| JSON Viewer | ❌ 无 | react18-json-view + PixelCard 风格 |
| Markdown 渲染 | ❌ 无 | react-markdown + PixelCard 风格 |
| 富文本/代码编辑器 | ❌ 无 | Monaco / CodeMirror 套 PixelCard 风格 |

### E.4 目录结构建议(UI 1 Electron)

```
src/renderer/
├── components/      # 业务组件
│   ├── panels/      # 11 个面板
│   │   ├── Account.vue
│   │   ├── Login.vue
│   │   ├── Billing.vue
│   │   ├── Character.vue
│   │   ├── Chat.vue
│   │   ├── AgentManager.vue
│   │   ├── Settings.vue
│   │   ├── Market.vue
│   │   ├── RagManager.vue
│   │   └── About.vue
│   └── shared/      # 共享
│       ├── AppBar.vue
│       ├── SideNav.vue
│       ├── PixelChart.vue   # Canvas 自绘
│       └── PixelRating.vue  # SVG 自绘
├── stores/          # Pinia
│   ├── auth.ts
│   ├── character.ts
│   ├── billing.ts
│   └── ...
├── styles/
│   ├── retro-tokens.css  # @theme retro-*
│   ├── fonts.css         # @font-face
│   └── animations.css    # step-end 动效
└── main.ts
```

### E.5 目录结构建议(UI 2 web-admin)

```
src/
├── views/
│   ├── Dashboard.vue
│   ├── CharacterMgmt.vue
│   ├── UserMgmt.vue
│   ├── OrderMgmt.vue
│   ├── ReviewMgmt.vue
│   └── Statistics.vue
├── components/
│   ├── SideNav.vue
│   ├── TopBar.vue
│   ├── Breadcrumb.vue
│   └── PixelChart.vue
├── api/
└── main.ts
```

---

## F. 实施优先级

### F.1 MVP 必须(2 周可上线 demo)

| 优先级 | 模块 | 估时 |
| --- | --- | --- |
| P0 | 设计 token 系统 + 字体引入 + 间距规范 | 0.5d |
| P0 | 顶部 AppBar + 侧边导航(共享) | 0.5d |
| P0 | **Chat 对话** 面板(核心场景) | 2d |
| P0 | **Character 角色** 面板(角色切换) | 1.5d |
| P0 | **Account 账号** + **Login** 面板 | 1d |
| P0 | **Settings 设置** 面板(基础配置) | 1d |
| P1 | **Billing 会员** 面板(支付流程) | 1.5d |
| P1 | **AgentManager 工具** 面板 | 1d |
| P1 | **Market 商店** 面板(列表 + 详情) | 1.5d |

**MVP 小计**:~10.5 工作日 ≈ 2 周

### F.2 完整功能(再加 1.5 周)

| 优先级 | 模块 | 估时 |
| --- | --- | --- |
| P1 | **RagManager 知识库** 面板 | 1.5d |
| P2 | **About 关于** 面板 | 0.5d |
| P2 | 像素图表组件(PixelChart、PixelRating) | 1d |
| P2 | 暗色主题 + 主题切换 | 1d |
| P2 | 命令面板(Ctrl+K) | 1d |
| P2 | 国际化(i18n) | 1d |

**完整功能小计**:~6 工作日 ≈ 1.5 周

### F.3 UI 2 管理后台(并行,1.5 周)

| 优先级 | 页面 | 估时 |
| --- | --- | --- |
| P0 | Dashboard 总览(含 KPI、趋势图) | 1.5d |
| P0 | 角色管理 CRUD(含 Drawer 编辑) | 1.5d |
| P0 | 用户管理(含详情 Drawer) | 1d |
| P1 | 订单管理 + 退款审核 | 1d |
| P1 | 资质审核工作流 | 1d |
| P2 | 数据统计(自定义查询 + 报表) | 1.5d |

**UI 2 小计**:~7.5 工作日 ≈ 1.5 周

### F.4 不在 MVP 范围(后续迭代)

- 成就系统 / 羁绊系统(角色好感度)
- 节日彩蛋活动面板
- 社区动态(角色分享到社区)
- AI 自动生成角色(用户输入描述 → 后端生成 → 一键上架)
- 直播角色演示

### F.5 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| pxlkit 组件缺失(Monaco、JSON Viewer、验证码) | 需要额外实现 | 提前一周调研替代库,选型固定 |
| Electron + Tailwind v4 兼容性 | 构建问题 | 第一天就跑通 hello world,确认 pxlkit 在 Electron-vite 下能跑 |
| 中文像素字体文件大 | 首屏慢 | subset 3500 常用字,WOFF2 + preload |
| Live2D + UI 同时加载 | 内存高 | Live2D 只在主面板加载,UI 面板切换时轻量渲染 |
| 多 panel 同时打开 | 性能 | 用 keep-alive + 懒加载,非活跃面板卸载 |
| 暗色主题切换闪烁 | 视觉闪烁 | 用 CSS 变量双套,主题 store 即时切换 |
| 像素图表性能(Canvas 重绘) | 1k+ 数据点卡顿 | 数据聚合 + 分段采样,避免每帧重绘 |

---

## 附:交付物清单

给前端工程师的开干清单(按顺序):

1. **第 1 天**:`retro-tokens.css` + 字体引入 + Tailwind v4 配置
2. **第 1 天**:在 Electron 项目安装 pxlkit,跑通 `<PixelButton>`,确认可用
3. **第 2 天**:搭建 AppBar + SideNav 骨架
4. **第 2 天**:实现 5 个最常用组件的封装(Btn/Card/Badge/Toast/Dialog)
5. **第 3-5 天**:Chat 面板(最复杂)
6. **第 6-7 天**:Character 面板
7. **第 8 天**:Account + Login 面板
8. **第 9-10 天**:Settings 面板
9. **第 11-13 天**:Billing 面板
10. **第 14 天**:MVP demo,内部演示

---

## 附:文档版本

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-10-18 | 首版,基于 pxlkit + pixel-ui + retroui + 8bitcn-ui 设计整合 |

---

**说明**:本文档是设计规范,不包含代码实现细节。前端工程师按本文档开始开发时,如遇到具体组件 API 问题,参考 pxlkit 官方文档(pxlkit.xyz)或 demo(https://maomentai817.github.io/pixel-ui/)。其他借鉴库(retroui/8bitcn-ui)只取设计灵感,不引入其代码。