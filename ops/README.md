# Ops — 部署 / DevOps 脚本

> 桌面女友项目的服务器部署 / CI / 监控 / 备份等运维脚本。

## 目录结构

```
ops/
├── nginx/                    # Nginx 配置 + SSL 证书
│   ├── nginx.conf
│   └── conf.d/{api,latest}.conf
├── jenkins/                  # Jenkins 流水线配置
│   └── Jenkinsfile
├── docker/                   # Docker Compose / Dockerfile(开发环境镜像)
├── backup/                   # 数据库备份脚本
│   └── backup-mysql.sh
├── certbot/                  # Let's Encrypt 自动续签
└── monitoring/               # 监控 / 告警配置(Grafana / Prometheus)
```

## 部署架构

```
阿里云 ECS(Ubuntu 22.04, 4C8G)
├── Jenkins :8080             # CI/CD(仅办公 IP 访问)
├── MySQL 8 :3306             # 业务数据
├── PostgreSQL 16 + pgvector  # 向量数据(RAG)
├── Redis 7                   # 限流 / 计数 / 缓存
├── App(Spring Boot):8080     # 后端服务
└── Nginx :80/:443            # 反向代理 + SSL(Let's Encrypt)
```

## 阿里云 OSS

- `desktop-girlfriend-public` — 角色资源(zip / 封面 / 预览) + TTS 音频缓存 + 知识库文件
- `desktop-girlfriend-update` — 自动更新产物(.exe / .exe.blockmap / latest.yml)

## 实施状态

🚧 **M0 阶段创建**(Nginx / Docker / Jenkins / 备份)