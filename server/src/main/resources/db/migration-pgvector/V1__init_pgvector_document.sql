-- ============================================================
-- V1: 知识库文档表 (PostgreSQL + pgvector)
-- 业务域: Knowledge
-- 说明: 由 spring.flyway.pg.locations 指向此处,在独立的
--       Postgres 数据源 (spring.datasource-pg) 上运行。
--       注意: pgvector 扩展需要数据库 superuser 或显式授权。
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_document (
  id              BIGSERIAL    PRIMARY KEY,
  character_id    BIGINT       NOT NULL,
  user_id         BIGINT       NOT NULL,
  filename        VARCHAR(256) NOT NULL,
  oss_key         VARCHAR(512) NOT NULL,
  file_type       VARCHAR(16)  NOT NULL COMMENT 'txt / md / pdf',
  size_bytes      BIGINT       NOT NULL,
  chunk_count     INT          NOT NULL DEFAULT 0,
  status          VARCHAR(16)  NOT NULL DEFAULT 'processing' COMMENT 'processing / ready / failed',
  error_message   TEXT         NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);