# 桌面女友(Desktop Girlfriend)启动手册

> **状态**:本手册对应 **M0 阶段** 完成后能跑到的程度。后端只有 `/v1/health` 可用;桌面端个人界面 11 个 view 仍是占位;**AI 对话 / TTS / Agent / 支付 / 模型商店** 等业务功能全部**未实现**(M1-M5 阶段陆续补)。
>
> 期望:读者能 **拉代码 → 5 分钟内看到桌面宠物 + 个人界面窗口 + 后端 /v1/health=ok + web-admin 可启动**。

---

## 1. 前置依赖

| 工具 | 版本 | 检查命令 |
|---|---|---|
| Java | 17 | `java -version` |
| Maven | 3.9+ | `mvn -version` |
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 任意 | `git --version` |
| Docker Desktop | 任意 | `docker -v`(可选,启动 MySQL/Postgres/Redis) |

> ⚠️ 不要装到 C 盘 → 项目约束(见根目录 `CLAUDE.md`)
> JDK 推荐:`D:/worksoftspace/jdk-17/`,已装。
> Maven 推荐:用 IntelliJ IDEA 内置(或单独装 `D:/worksoftspace/maven/`)
> Node 推荐:`D:/worksoftspace/node.js/`,已装。

---

## 2. 拉代码

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend"
git checkout main    # 默认在 main
git status          # 确认干净
git branch -a       # 应看到 4 个分支:main + feature/server + feature/desktop-extension + feature/web-admin
```

如在不同分支工作:
```bash
git checkout feature/server          # 后端开发
git checkout feature/desktop-extension # 桌面端开发
git checkout feature/web-admin       # 后台管理开发
```

---

## 3. 后端启动(Spring Boot 3 + Spring AI)

### 3.1 准备数据库(Mysql + Postgres + Redis,可选)

**方式 A:Docker 一键**(推荐,无需装数据库)
```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend/server"
docker compose up -d
# 启动:MySQL 3306 / Postgres 5432 / Redis 6379 / 后端 8080
# 等 30 秒后:
curl http://localhost:8080/v1/health
# 期望:{"code":0,"data":{"app":"desktop-girlfriend-server","version":"0.1.0",...}}
```

**方式 B:已有 MySQL/Postgres/Redis**(无需 Docker)
- 在 `application-dev.yml` 改 `MYSQL_HOST` / `POSTGRES_HOST` / `REDIS_HOST` 为你的实例地址
- `mvn spring-boot:run -Dspring-boot.run.profiles=dev` 跑后端

### 3.2 后端命令

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend/server"

# 编译(会下载 ~200MB 依赖,首次 5-10 分钟)
mvn clean package -DskipTests

# 启动 dev(连 mysql/postgres/redis;health 接口可访问)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 或启动 prod(读环境变量)
SPRING_PROFILES_ACTIVE=prod \
MYSQL_HOST=... POSTGRES_HOST=... REDIS_HOST=... \
java -jar target/desktop-girlfriend-server.jar
```

### 3.3 验证后端

```bash
# 健康检查
curl http://localhost:8080/v1/health
# Swagger UI(自动生成)
open http://localhost:8080/swagger-ui.html
# 错误码示例:{0}.code=9000 表示系统错误,2xxx 表示用户相关
```

### 3.4 跑数据库迁移(Flyway)

后端启动时**自动**执行 Flyway 迁移(`spring.flyway.enabled=true`),无需手动跑。
- 17 个迁移文件在 `server/src/main/resources/db/migration/`(V1-V15 MySQL + V1-V2 Postgres)
- 默认 schema 是 MySQL 的 `desktop_girlfriend` + Postgres 的 `desktop_girlfriend_vec`
- 查看迁移历史:`SELECT * FROM flyway_schema_history;`

### 3.5 后端依赖 API Key(M1+ 才需要)

`application-dev.yml` 里有这些占位符,**M0 阶段可以空着**:

```yaml
spring.ai.openai.api-key: ${DEEPSEEK_API_KEY:-}        # M2 LLM 联调时填
spring.ai.openai.base-url: ${DEEPSEEK_BASE_URL:https://api.deepseek.com/v1}
aliyun.oss.access-key-id: ${OSS_ACCESS_KEY_ID:-}        # M2 OSS 上传时填
wechat.pay.app-id: ${WECHAT_APPID:-}                    # M3 支付接入时填
alipay.app-id: ${ALIPAY_APP_ID:-}                        # M3
amap.api-key: ${AMAP_API_KEY:-}                          # M3 Agent 天气 / 地图
```

设置环境变量(Windows PowerShell):
```powershell
$env:DEEPSEEK_API_KEY = "sk-xxx"
$env:OSS_ACCESS_KEY_ID = "your-ak"
# 重启后端生效
```

---

## 4. 桌面端启动(Electron + Vue 3 + pxlkit-vue)

### 4.1 安装依赖

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend/project"
npm install --legacy-peer-deps --registry https://registry.npmjs.org/
# 首次 ~5 分钟,下载 ~500 包(pxlkit + vue + electron-builder)
# 国内镜像 SSL 证书异常,用官方 npm registry 或换用 npmmirror
```

> ⚠️ 已知问题:`pinia-plugin-persistedstate@4.x` 要求 `pinia@>=3.0`,但本项目用 `pinia@^2.2`。用 `--legacy-peer-deps` 跳过 peer 冲突。

### 4.2 类型检查

```bash
npx vue-tsc --noEmit
# 期望:exit 0,0 个错误
```

### 4.3 启动 dev(宠物 + 个人界面双窗口)

```bash
npm run dev
# 预期:
#   - Electron 主窗口启动(桌面宠物,半透明无边框,渲染 Spine 角色)
#   - DevTools 自动打开(开发模式)
#   - Console 手动调用 await window.petApi.openPersonalWindow() 弹出 880×620 的个人界面窗口
#     (右键菜单可以加菜单项触发,但 M0 阶段还没加)
```

### 4.4 端口分配

| 端口 | 用途 |
|---|---|
| 5173 | 桌面宠物渲染进程 dev server |
| 5174 | 个人界面渲染进程 dev server(Vue 3 + pxlkit-vue) |

### 4.5 打包桌面端(暂未配置 EV 签名,M5 阶段补)

```bash
npm run pack      # 产出 release/win-unpacked/
npm run dist      # 产出 NSIS 安装包 + portable exe
```

⚠️ 未签名 exe 会被 Windows SmartScreen 拦截("未知发布者")。M5 上线前必须申请 EV 代码签名证书。

---

## 5. web-admin 启动(Vue 3 + pxlkit-vue)

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend/web-admin"
npm install --registry https://registry.npmjs.org/
npm run dev
# 启动 http://127.0.0.1:5175

# 类型检查 + 构建
npm run typecheck   # vue-tsc
npm run build       # 产出 dist/
```

`.env` 配置:
```env
VITE_API_BASE_URL=http://localhost:8080
```

后端代理:`/api/*` 由 Vite proxy 转发到 `VITE_API_BASE_URL`,重写为 `/v1/*`。

---

## 6. 端到端验证(M0 阶段能做的)

```bash
# 1. 后端跑起来
cd server && docker compose up -d
# 等 30 秒
curl http://localhost:8080/v1/health
# ✓ {"code":0,"data":{"app":"desktop-girlfriend-server","version":"0.1.0",...}}

# 2. 数据库表验证(用 mysql 客户端)
mysql -h 127.0.0.1 -P 3306 -u root -proot123 desktop_girlfriend
> SHOW TABLES;
# ✓ 15 张业务表(user_account, user_device, user_subscription, ...)

# 3. 桌面端跑起来
cd ../project && npm run dev
# ✓ Electron 主窗口显示桌面宠物(PixiJS + Spine)
# ✓ DevTools console: window.petApi.openPersonalWindow() → 弹出个人界面窗口(880×620)

# 4. web-admin 跑起来
cd ../web-admin && npm run dev
# ✓ 打开 http://127.0.0.1:5175 → 看到 6 个占位菜单
```

---

## 7. 常见问题

### Q1: `mvn` 找不到
A: 检查 `JAVA_HOME` 和 `MAVEN_HOME` 环境变量,或者用 IDE 内置 Maven。

### Q2: `npm install` 网络错误
A: 国内网络下 cnpmjs.org SSL 异常,用 `--registry https://registry.npmjs.org/` 走官方源。也可以在 `~/.npmrc` 写 `registry=https://registry.npmmirror.com/`(但需要测试)。

### Q3: `mvn package` 卡在下载依赖
A: 检查 `~/.m2/settings.xml` 配的 mirror。推荐:
```xml
<settings>
  <mirrors>
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

### Q4: Electron 启动后白屏
A: 检查 `project/.vite/` 缓存,清空重试:
```bash
rm -rf project/.vite project/node_modules/.vite
npm run dev
```

### Q5: pxlkit 样式不生效
A: 确认 `src/personal/style.css` 第一行是 `@import "@pxlkit/ui-kit-vue/styles.css";` 而非 `@import "tailwindcss";`(会重复加载)。

---

## 8. 当前已做 / 未做清单

✅ **已做**(本地 commit):
- M0 后端:Spring Boot 3 + Spring AI 1.0 骨架 + 19 个 Java 类 + 17 张表 Flyway
- M0 桌面端:Vue 3 + pxlkit-vue v2.2.0 集成 + 个人界面 11 view 占位
- M0 web-admin:Vite + Vue 3 + Tailwind v4 + pxlkit-vue 骨架(6 view 占位)
- 4 个分支都已推 GitHub

❌ **未做**:
- M1 用户系统(auth/匿名/注册/JWT)
- M2 LLM/TTS 代理、Agent 工具、RAG
- M3 计费 + 微信/支付宝支付
- M4 后台管理业务
- M5 上线 + 签名 + 自定义角色
- 个人界面 11 view 真实组件实现(目前是占位)
- 桌面端主进程 IPC handler(目前只有 chat/tts 占位)

---

## 9. 当前用户身份

- 当前仓库:public GitHub (`github.com/chencxy34679-glitch/Desktop-Girlfriend`)
- 已剥离 Brown Dust 2 版权素材(`git filter-repo`)
- 所有 push 都已成功(版权剥离后,系统不再拒绝)
- 备份:`.git.backup-20261019-002127/`(旧 git 历史,需要 rollback 时用)

---

## 11. 相关链接

- [项目根 README](../README.md)— 项目整体说明(已有)
- [设计文档 PIXEL_UI_DESIGN.md](./design/PIXEL_UI_DESIGN.md)— 11 个用户端 + 6 个管理端页面的像素风设计
- [M0~M5 实施阶段计划](../../.claude/plans/1-2-3-ai-scalable-hippo.md)— 完整 6 阶段、49 人天路径
- [Web Speech 测试页](../project/web-speech-test.html)— M0 阶段一次性验证工具