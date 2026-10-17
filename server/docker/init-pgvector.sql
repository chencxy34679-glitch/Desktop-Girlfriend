-- ============================================
-- PostgreSQL 初始化脚本(挂载到 docker-entrypoint-initdb.d)
-- 首次启动 PostgreSQL 时自动执行
-- ============================================

-- 启用 pgvector 扩展(用于 RAG 向量存储)
CREATE EXTENSION IF NOT EXISTS vector;

-- 注意:本文件只在数据库首次创建时执行
-- 业务表 / Flyway migration 由 app 启动后自动跑
-- 这里只创建扩展,不建业务表

-- 验证
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';