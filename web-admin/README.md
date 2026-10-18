# Desktop Girlfriend Web Admin — 后台管理

> 桌面女友项目(Desktop Girlfriend)的后台管理界面。供项目方运营**角色 / 用户 / 订单 / 资质审核 / 数据统计**等业务。
>
> ⚠️ 当前为 **M4 阶段骨架**(本仓库只搭壳,具体业务页面在 M4 阶段实施)。

## 技术栈

| 类别 | 选型 | 备注 |
| --- | --- | --- |
| 构建 | Vite 5 + TypeScript 5 | ESM-first |
| 框架 | Vue 3.5(Composition API + `<script setup>`) | 启用 `strict: true` |
| 路由 | Vue Router 4(hash 模式) | `createWebHashHistory` |
| 状态 | Pinia 2 | `auth` / `ui` 两个 store |
| 样式 | Tailwind CSS v4 + `@tailwindcss/vite` | CSS-first 配置 |
| UI 组件 | [`@pxlkit/ui-kit-vue`](https://www.npmjs.com/package/@pxlkit/ui-kit-vue) ^2.2.0 | 像素风组件库 |
| 图标 | [`@pxlkit/vue`](https://www.npmjs.com/package/@pxlkit/vue) ^0.1.0 | 像素艺术图标 |
| HTTP | axios 1.7 | 拦截器统一处理 401 / 业务码 |
| 表单 | vee-validate 4 | pxlkit `PixelForm` 配套 |
| 服务端口 | 5175(主宠物 5173 / 个人界面 5174) | |

## 目录结构

```
web-admin/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── README.md
├── .gitignore
└── src/
    ├── main.ts                 # Vue 挂载入口
    ├── App.vue                 # 顶层入口(只放 router-view)
    ├── style.css               # pxlkit styles.css + retro-* token override
    ├── router.ts               # 9 个路由入口(hash 模式)
    ├── env.d.ts                # Vite 环境变量类型
    ├── api/
    │   └── http.ts             # axios 实例 + 拦截器
    ├── stores/
    │   ├── auth.ts             # 当前用户 + JWT
    │   └── ui.ts               # 侧栏折叠 / 主题
    ├── layouts/
    │   └── AdminLayout.vue     # 侧栏 + 顶部面包屑 + 主区域
    ├── components/
    │   └── Sidebar.vue         # 像素风左侧导航
    └── views/
        ├── Dashboard.vue       # 占位:GMV / DAU / 转化率
        ├── Characters.vue      # 占位:角色管理
        ├── Users.vue           # 占位:用户管理
        ├── Orders.vue          # 占位:订单管理
        ├── Moderation.vue      # 占位:资质审核
        └── Stats.vue           # 占位:数据统计
```

## 设计 Token

所有颜色 / 间距 / 阴影 / 字体均走 pxlkit 主题的 `--retro-*` CSS 变量,项目方暖米色 + 粉色像素风定义在 `src/style.css` 的 `:root` 中。

- `--color-retro-bg`: `#FBF3E4`(米色背景)
- `--color-retro-primary`: `#FF9EC4`(主色 · 粉)
- `--color-retro-primary-ink`: `#A23A6B`(主色深)
- `--color-retro-border`: `#3D2C2C`(描边)
- ...等 12 个 token,详见 `src/style.css` 与 [PIXEL_UI_DESIGN.md](../../docs/design/PIXEL_UI_DESIGN.md) A.2。

**禁止使用 Tailwind 默认灰阶**(bg-slate-800、text-gray-500 等),只用 `var(--color-retro-*)`。

## pxlkit 集成要点

1. **样式入口**: `src/style.css` 第一行 `@import "@pxlkit/ui-kit-vue/styles.css"`,**不要**再单独 `@import "tailwindcss"`(会重复加载 Tailwind 基础样式)。
2. **retro-* 变量 override**: pxlkit 已经定义了完整的 `--retro-*` token,业务覆盖直接写在 `:root` 选择器中,组件自动跟随。
3. **Tailwind v4 插件**: `vite.config.ts` 中 `tailwindcss()` 由 `@tailwindcss/vite` 提供,**无需**单独配置 PostCSS / Autoprefixer。
4. **字体**: Google Fonts(Press Start 2P + Inter + JetBrains Mono)在 `index.html` `<head>` 中加载,避免首屏闪烁。
5. **暗色模式**: `useDarkMode()` composable 由 pxlkit 提供;`index.html` 中的同步脚本读取 `localStorage.pxlkit:dark-mode` 在加载时给 `<html>` 加 `.dark`/`.light` class。

## 后端 API 对接

- `vite.config.ts` 中 `/api/*` 由 Vite proxy 转发到 `VITE_API_BASE_URL`(默认 `http://localhost:8080`),并重写为 `/v1/*`。
- 业务约定响应体:`{ code: 0, data: ..., message: '' }`,非 0 视为业务错误。
- JWT 写在 `localStorage.dg_admin_token`,axios 请求拦截器自动加 `Authorization: Bearer ...`。

### .env.example

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_TITLE=Desktop Girlfriend 后台
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器(http://127.0.0.1:5175)
npm run dev

# 类型检查
npm run typecheck

# 生产构建(先类型检查,再 vite build)
npm run build

# 预览构建产物
npm run preview
```

## M4 待办

各 view 文件留有 `TODO(M4)` 注释,主要工作:

- 接入 `/api/admin/login` 登录流
- 接入 pxlkit 表格 / 表单组件(`PixelDataTable` / `PixelForm` / `PixelInput` 等)
- 接入图表组件(`PixelAreaChart` / `PixelBarChart` / `PixelSparkline`)
- 角色管理 / 用户管理 / 订单管理 / 资质审核 / 数据统计 五大模块业务
- 系统设置、权限管理、审计日志