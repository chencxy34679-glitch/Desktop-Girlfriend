# 分支策略规范

> 背景:2026-10-19 因为长期并存 `feature/server` / `feature/desktop-extension` / `feature/web-admin`
> 三个分支,导致同一份代码里"后端和桌面端互相看不见",连续踩了 3 个坑
> (Live2D 残留引用、个人界面 dev server 起不来、node_modules 依赖不匹配)。
> 本文固化新的分支规则,避免重蹈覆辙。

---

## 一、核心原则:单主干开发(trunk-based)

```
main         ← 唯一长期分支,永远可运行、永远可发布
feature/*    ← 短期分支,1~3 天内合并回 main
hotfix/*     ← 紧急修复,直接改 main
release/*    ← 发布准备(可选,M5 用)
```

**禁止**:
- ❌ 长期存在 `feature/server`、`feature/frontend` 这类**按子系统划分**的分支
- ❌ 分支存活超过 1 周
- ❌ 在 feature 分支之间互相合并(必须经由 main)

**理由**:桌面端和后端是同一个产品的两半,分开在不同分支会导致:
- 切分支时一半代码"消失",IDE 报找不到文件
- `node_modules` / `package-lock.json` 与当前分支不匹配
- 联调时后端接口改了但桌面端看不到,只能靠人肉同步

---

## 二、日常工作流

### 开始一个新功能

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend"

# 1. 确保 main 是最新且干净
git checkout main
git pull
git status              # 必须干净

# 2. 从 main 切短期分支(按功能命名,不按子系统)
git checkout -b feature/chat-sse
# 例如:
#   feature/chat-sse        AI 对话流式接口
#   feature/personal-ui     个人界面面板
#   feature/payment         微信/支付宝接入
#   feature/agent-tools     角色 Agent 工具集
#   bugfix/spine-api        Spine API 兼容修复

# 3. 开发 → 自测 → 合并(不要超过 3 天)
git add -A
git commit -m "feat(xxx): ..."
git checkout main
git merge --no-ff feature/chat-sse
git push origin main
git branch -d feature/chat-sse
```

### 修改后端和桌面端(联动改动)

**在同一个分支里改**,不要分两个分支:

```bash
git checkout -b feature/auth-flow
# 改 server/...(后端)
# 改 project/...(桌面端)
# 一起 commit,一起合并
```

---

## 三、合并前的自检清单

每次合并到 `main` 前,本地跑一遍:

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend"

# 1. 后端构建
cd server
JAVA_HOME="D:/worksoftspace/jdk-17" mvn clean package -DskipTests
cd ..

# 2. 桌面端类型检查
cd project
npx vue-tsc --noEmit
cd ..

# 3. 桌面端生产构建
npm run build
cd ..

# 4. web-admin 类型检查
cd web-admin
npx vue-tsc --noEmit
cd ..
```

**全部通过才能合并。** 有问题先在分支里修好。

---

## 四、目录结构与归属

```
tools/Desktop Girlfriend/          ← monorepo 根(一个仓库,一个 main)
├── project/                       ← 桌面端(Electron + Vue 3)
│   ├── src/renderer/              宠物渲染进程(PixiJS + Spine)
│   ├── src/personal/              个人界面(独立 BrowserWindow)
│   ├── src/main/                  主进程
│   ├── src/preload/               contextBridge
│   ├── src/shared/                主/渲染共享类型
│   └── scripts/dev.mjs            dev 启动器(同时拉 5173 + 5174)
├── server/                        ← 后端(Spring Boot 3 + Spring AI)
│   ├── src/main/java/.../module/  业务模块(auth/market/billing/agent/...)
│   ├── src/main/resources/db/     Flyway 迁移
│   └── .env.example               环境变量模板(真实值在 .env,不入仓)
├── web-admin/                     ← 后台管理(Vue 3)
├── ops/                           ← 部署脚本(Nginx / Jenkins / 备份)
└── docs/                          ← 文档(设计 / 部署 / 计划)
```

**端口分配**(改端口前先看这里):

| 端口 | 用途 | 启动命令 |
|---|---|---|
| 5173 | 宠物 renderer dev server | `npm run dev:electron` |
| 5174 | 个人界面 dev server | `npm run dev:personal` |
| 5175 | web-admin dev server | `cd web-admin && npm run dev` |
| 8080 | 后端 API | IDEA 启动 / `mvn spring-boot:run` |

`npm run dev`(在 `project/` 下)会**同时**拉起 5173 + 5174 + Electron 窗口。

---

## 五、推送

```bash
git push origin main
```

**不需要** `--force`,除非是 rebase 过历史。

> 如果 push 报网络超时(国内访问 GitHub 不稳),重试即可;
> 或改用 SSH remote:`git remote set-url origin git@github.com:<you>/Desktop-Girlfriend.git`

---

## 六、版权素材的特殊约定

《棕色尘埃2》的角色素材(洛琪希 / 艾莉丝)仅供个人学习,**禁止再分发**:

- 已通过 `git filter-repo` 从整个 git 历史中剥离
- 本地副本保留在 `img/spine/` 与 `project/assets/characters/` 下供开发调试
- `.gitignore` 已排除,不会被再次提交
- **M5 公开发布前必须替换为自创 / AI 生成角色**

> ⚠️ `.gitignore` **不支持行尾注释**。写规则时注释必须单独一行,
> 否则整行会被当成模式匹配,导致规则失效。

---

## 七、什么时候可以删分支

分支合并进 main 并推送后,本地可以删:

```bash
git branch -d feature/xxx        # 已合并,可安全删
git push origin --delete feature/xxx   # 删远程
```

**长期分支全部合并后**,所有历史都已在 main,旧分支可删。

---

## 八、CI 门禁(建议后续接入)

GitHub Actions 配置文件建议放在 `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - run: mvn -f server/pom.xml clean package -DskipTests

  desktop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix project --legacy-peer-deps
      - run: npx --prefix project vue-tsc --noEmit
      - run: npm --prefix project run build

  web-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix web-admin
      - run: npx --prefix web-admin vue-tsc --noEmit
```

> GitHub Actions 比 Jenkins 更省事(不用自己维护服务器)。
> 等你有 ECS 之后,Jenkins 可以用来做**部署**,CI 仍建议留在 GitHub Actions。
