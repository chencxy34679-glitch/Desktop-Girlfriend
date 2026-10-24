# 桌面女友 — 开发环境启动手册

> 目标读者:你自己(以及以后可能加入的开发者)
> 覆盖:后端(Spring Boot,IDEA)+ 桌面端(Electron,VSCode)+ 后台(Vue,VSCode)
> 当前进度:M0 完成 + M1 auth 模块可用;AI 对话/TTS/Agent/支付全部未实现

---

## 零、先看这里:现在能跑到什么程度?

| 组件 | 状态 | 验证方式 |
|---|---|---|
| **后端服务** | ✅ 能启动 | `curl localhost:8080/v1/health` → `code:0` |
| **数据库建表** | ✅ 自动 | 启动时 Flyway 自动建 16 张表 |
| **auth 接口** | ✅ 能用 | 匿名注册 / 升级注册 / 登录 / 刷新,4 个全通 |
| **桌面宠物窗口** | ✅ 能显示 | Electron 窗口 + Spine 角色动画 |
| **个人界面窗口** | ⚠️ 骨架 | 880×620 窗口能开,11 个面板都是占位文字 |
| **web-admin 后台** | ⚠️ 骨架 | 6 个页面能打开,业务未接 |
| **AI 对话** | ❌ 未实现 | M2 阶段(需 DeepSeek Key) |
| **语音(TTS/STT)** | ❌ 未实现 | M2 阶段(需火山 Key) |
| **角色 Agent** | ❌ 未实现 | M3 阶段(需高德 Key) |
| **会员/支付** | ❌ 未实现 | M4 阶段(需营业执照+商户号) |

---

## 一、环境准备(只需做一次)

### 1.1 JDK 17(后端必需)

**⚠️ 关键**:你系统的 `JAVA_HOME` 指向 JDK 8,IDEA 里必须手动指定 JDK 17。

- 路径:`D:/worksoftspace/jdk-17/`
- 验证:打开 IDEA → `File > Project Structure > SDKs` → 应看到 `jdk-17`

### 1.2 Node.js 20+(前端必需)

- 路径:`D:/worksoftspace/node.js/`
- 验证:`node -v` 应输出 v20 或更高

### 1.3 MySQL 8(后端必需)

- 你本机 3306 已在监听,账号 root
- 验证:能连上就行,不需要装客户端

---

## 二、配置文件(只需做一次)

### 2.1 复制 `.env.example`

在 **VS Code** 里:

1. 打开 `tools/Desktop Girlfriend/server/` 目录
2. 新建文件 `.env`(注意是 `.env`,不是 `.env.example`)
3. 内容如下:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=desktop_gf_dev
MYSQL_USER=root
MYSQL_PASSWORD=你的MySQL密码
```

> `.env` 已被 `server/.gitignore` 忽略,不会被提交到 GitHub。
> 完整的变量清单(DeepSeek/OSS/微信支付等)见 `server/.env.example`。

### 2.2 让 IDEA 加载 `.env`

IDEA 启动 Spring Boot 时不会自动读 `.env`,两种做法:

**做法 A(推荐):在运行配置里填**

1. 右上角 `Edit Configurations...`
2. 找到(或新建)Spring Boot 配置
3. `Environment variables` 点右边的编辑图标
4. 加一行:

```
MYSQL_PASSWORD=你的MySQL密码;MYSQL_USER=root;MYSQL_DB=desktop_gf_dev
```

**做法 B:直接改 `application-dev.yml` 的默认值**

把 `password: ${MYSQL_PASSWORD:}` 改成 `password: ${MYSQL_PASSWORD:你的密码}`。

> 做法 B 更省事,但密码会进 Git。**记得提交前改回来**。

---

## 三、启动后端(IDEA)

### 3.1 导入项目

1. IDEA → `File > Open` → 选 `tools/Desktop Girlfriend/server/pom.xml`
2. 等 Maven 导入完成(右下角进度条,首次 3-8 分钟)
3. 确认 SDK:`File > Project Structure > Project` → SDK 选 **17**,Language level 选 **17**

### 3.2 配置运行参数

1. 打开 `src/main/java/com/cxy/desktopgf/DesktopGirlfriendApplication.java`
2. 右键 → `Run 'DesktopGirlfriendApplication'`
3. 如果第一次运行会弹配置框:
   - `Active profiles` 填 `dev`
   - `Environment variables` 按上面 2.2 填

### 3.3 确认启动成功

控制台应看到:

```
Tomcat started on port 8080 (http) with context path '/'
Started DesktopGirlfriendApplication in 7.2 seconds
```

**验证**:

```bash
curl http://localhost:8080/v1/health
```

期望返回:

```json
{"code":0,"message":"ok","data":{
  "app":"desktop-girlfriend-server","version":"0.1.0","port":8080,
  "dependencies":{"mysql":"ok","postgres":"not_configured","redis":"fail: ..."}}}
```

- `mysql: ok` → 数据库连上了
- `postgres/redis` 报错**不影响**,M2 才用

### 3.4 数据库表自动建好了

启动时 Flyway 会自动执行 16 个迁移脚本。日志里搜 `Successfully applied` 能看到。

想确认表是否建好,可以用 IDEA 的 Database 工具:

1. 右侧 `Database` 面板 → `+` → Data Source → MySQL
2. Host `127.0.0.1`,User `root`,Password 你的密码
3. 选中 `desktop_gf_dev` 库 → 应该看到 16 张表

---

## 四、启动桌面端(VS Code)

### 4.1 安装依赖(只需一次)

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend/project"
npm install --legacy-peer-deps --registry https://registry.npmjs.org/
```

> **为什么要 `--legacy-peer-deps`**:`pinia-plugin-persistedstate@4` 要求 `pinia>=3`,但项目用的是 `pinia@2`,跳过 peer 检查。
>
> **为什么要指定 registry**:国内镜像源 SSL 证书常有问题,官方源最稳。

### 4.2 启动

```bash
npm run dev
```

### 4.3 确认能跑

**窗口 1(自动弹出)**:桌面宠物

- 半透明、无边框,显示 Spine 角色
- 可以拖动、右键

**窗口 2(手动打开)**:个人界面

在宠物窗口按 `Ctrl+Shift+I` 打开 DevTools,在 Console 里执行:

```javascript
await window.petApi.openPersonalWindow()
```

应该弹出 880×620 的窗口,左侧是导航栏(账号/角色/对话/设置/商店/知识库等),右侧是占位内容。

### 4.4 端口说明

| 端口 | 用途 | 谁在用 |
|---|---|---|
| 5173 | 桌面宠物渲染 | 桌面端 |
| 5174 | 个人界面渲染 | 桌面端 |
| 5175 | 后台管理 | web-admin |
| 8080 | 后端 API | server |

---

## 五、启动后台管理(VS Code,可选)

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend/web-admin"
npm install --registry https://registry.npmjs.org/
npm run dev
```

浏览器打开 http://127.0.0.1:5175

**注意**:后台的业务接口还没实现,页面上的操作不会有真实效果。

---

## 六、完整启动顺序

日常开发推荐这个顺序:

```
1. IDEA 启动后端          → 确认 localhost:8080/v1/health 返回 code:0
2. VS Code 终端 npm run dev → 弹出宠物窗口
3. DevTools 里执行 openPersonalWindow() → 弹出个人界面
```

---

## 七、常见问题

### Q1: IDEA 里报 "无效的目标发行版: 17"

**原因**:IDEA 用的还是 JDK 8。

**解决**:`File > Project Structure > Project` → SDK 改成 `D:/worksoftspace/jdk-17`,Language level 改 17。

### Q2: IDEA 里 `mvn clean package` 失败,报编译错误

在 IDEA Terminal 里手动跑:

```bash
cd server
JAVA_HOME="D:/worksoftspace/jdk-17" mvn clean package -DskipTests
```

### Q3: 后端启动报 `Access denied for user 'root'@'localhost'`

**原因**:`MYSQL_PASSWORD` 没生效。

**解决**:确认 2.2 的环境变量配了;或在 `application-dev.yml` 临时写死密码。

### Q4: 后端启动报 `Unknown column 'deleted'`

**原因**:数据库里是旧表结构(缺 `deleted` 列)。

**解决**:
- 检查 `server/src/main/resources/db/migration/V16__add_deleted_column.sql` 存在
- 删掉旧库重建(最快):`DROP DATABASE desktop_gf_dev;` 然后重启后端,Flyway 会全部重建
- 或看 `target/server-dev.log` 里 Flyway 的执行记录

### Q5: 后端启动报 `Invalid value type for attribute 'factoryBeanObjectType'`

**原因**:MyBatis 版本与 Spring Boot 3 不兼容。

**解决**:确认 `pom.xml` 里有这段(覆盖 MyBatis-Plus 默认引入的旧版):

```xml
<dependency>
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis-spring</artifactId>
    <version>3.0.3</version>
</dependency>
```

### Q6: `npm install` 报 SSL 证书错误

**解决**:加 `--registry https://registry.npmjs.org/`(见 4.1)。

### Q7: `npm install` 报 ERESOLVE 冲突

**解决**:加 `--legacy-peer-deps`(见 4.1)。

### Q8: 个人界面窗口打不开

**原因**:`personal` 这个 vite entry 没起来。

**解决**:看终端有没有 `5174` 端口的日志;如果没有,检查 `electron.vite.config.ts` 里有没有 `personal` 配置块。

### Q9: 宠物窗口是空白的

**解决**:

1. 检查 `project/assets/characters/` 下有没有角色配置 JSON
2. 检查 Spine 资源 `project/assets/spine/` 是否完整(`.atlas` + `.json` + `.png` 三个文件)
3. 看 DevTools Console 有没有报错

---

## 八、当前代码状态

### 已完成

| 模块 | 内容 |
|---|---|
| 后端骨架 | Spring Boot 3.3 + Spring AI 1.0 + MyBatis-Plus + JJWT + OSS SDK |
| 数据库 | 16 张表(Flyway V1-V16),含用户/订阅/积分/支付/Agent/角色/RAG |
| auth 模块 | 匿名注册、升级注册、登录、token 刷新(端到端已验证) |
| JWT | access/refresh 双 token,`typ` claim 防越权 |
| 桌面端骨架 | Electron + Vue 3 + pxlkit-vue + 个人界面 11 面板占位 |
| web-admin 骨架 | Vite + Vue 3 + 6 页面占位 |
| 设计文档 | `docs/design/PIXEL_UI_DESIGN.md`(96KB,像素风设计) |

### 未实现

| 模块 | 计划阶段 |
|---|---|
| AI 对话(`/v1/chat/stream` SSE) | M2 |
| TTS / STT 代理 | M2 |
| RAG 知识库(PgVector) | M2 |
| 角色 Agent(14 个工具) | M3 |
| 计费 / 会员 / 支付 | M4 |
| 后台管理业务 | M4 |
| 自动更新 / 代码签名 | M5 |
| 自创角色(替换当前版权素材) | M5 |

---

## 九、Git 分支说明

| 分支 | 用途 | 状态 |
|---|---|---|
| `main` | **唯一长期分支**,含桌面端 + 后端 + 后台全部代码 | 已推送 |

**2026-10-19 起改为单主干开发(trunk-based)**:

以前按子系统分了三���长期分支(`feature/server` / `feature/desktop-extension` /
`feature/web-admin`),导致切分支时一半代码"消失",连续踩了 3 个坑
(Live2D 残留引用、个人界面 dev server 起不来、node_modules 依赖不匹配)。
三个分支现已全部合并进 `main` 并删除。

**现在的规矩**:

```bash
cd "E:/workspace/aiworkspace/ClaudeTools/tools/Desktop Girlfriend"

# 开新功能:从 main 切短期分支(按功能命名,不按子系统)
git checkout main && git pull
git checkout -b feature/chat-sse

# 开发 1~3 天后合回 main
git add -A && git commit -m "feat(chat): ..."
git checkout main && git merge --no-ff feature/chat-sse
git push origin main
git branch -d feature/chat-sse
```

完整规范见 [docs/BRANCHING.md](../docs/BRANCHING.md)。

---

## 十、下一步该做什么

| 优先级 | 事项 | 阻塞条件 |
|---|---|---|
| 🔴 高 | 建 `server/.env`(填 MySQL 密码) | 无,随时可做 |
| 🔴 高 | 申请营业执照 | 7-15 工作日,M4 支付必需 |
| 🟡 中 | 申请 DeepSeek / 火山 / 高德 Key | M2 必需 |
| 🟡 中 | 桌面端接后端 auth(个人界面能注册登录) | 无 |
| 🟡 中 | 个人界面 11 面板接真实组件 | 无 |
| 🟢 低 | 修 AuthServiceTest(11 个用例因 Mockito 环境全 error) | 无 |
| 🟢 低 | 接 GitHub Actions CI 门禁 | 无 |
