# Server — Spring Boot 3 + Spring AI 后端

> 这是桌面女友(Desktop Girlfriend)项目的服务端代码。
> 详见项目根目录的 [plan 文档](../../.claude/plans/1-2-3-ai-scalable-hippo.md)。

## 模块清单

- `pom.xml` — Spring Boot 3.3 + Spring AI 1.0 + MyBatis-Plus + JJWT + weixin-java-pay + alipay-sdk-java
- `Dockerfile` + `docker-compose.yml` — 多服务编排(mysql + postgres + redis + app + nginx)
- `jenkins/Jenkinsfile` — 声明式流水线
- `src/main/java/com/cxy/desktopgf/` — Java 源码
  - `module/auth/` `module/user/` — 匿名 / 登录 / 注册 JWT
  - `module/billing/` — 计费(积分扣费 / 每日限额 / Redis Lua)
  - `module/subscription/` — 会员档位 / 时长管理
  - `module/payment/` — 微信 + 支付宝 订单 / 回调 / 退款
  - `module/agent/` — Spring AI Function Calling + 14 个工具实现
  - `module/character/` `module/market/` `module/update/` `module/oss/` `module/license/`
  - `module/chat/` `module/tts/` `module/stt/` `module/rag/` — AI 代理
- `db/migration/V1~V15__init_*.sql` — Flyway 迁移(15 张 MySQL + 2 张 Postgres)

## 启动方式

```bash
# 本地开发(需要本地有 MySQL + Postgres + Redis)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Docker 一键起
docker compose up -d

# 访问健康检查
curl http://localhost:8080/v1/health
```

## 实施状态

🚧 **M0 阶段开始创建**(计划中,见项目根 .claude/plans/)