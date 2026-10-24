-- ============================================================
-- V2: 知识库 chunk 表 (PostgreSQL + pgvector)
-- 业务域: Knowledge
-- 说明: 文档切片及向量,embedding 列使用 vector(1536)。
--       使用 ivfflat 索引做近似最近邻检索 (vector_cosine_ops)。
-- ===========================================================
CREATE TABLE knowledge_chunk (
  id              BIGSERIAL    PRIMARY KEY,
  document_id     BIGINT       NOT NULL,
  character_id    BIGINT       NOT NULL,
  chunk_index     INT          NOT NULL,
  content         TEXT         NOT NULL,
  embedding       vector(1536) NOT NULL,
  token_count     INT          NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chunk_embedding ON knowledge_chunk USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chunk_character ON knowledge_chunk (character_id);