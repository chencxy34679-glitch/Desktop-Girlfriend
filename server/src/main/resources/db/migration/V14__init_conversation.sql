-- ============================================================
-- V14: 对话历史表
-- 业务域: Conversation
-- 说明: 聊天消息流水,每条记录是一条消息(user/assistant/system/tool)
--       id 使用 VARCHAR(64),由应用层生成 UUID/雪花 ID 等
-- ============================================================
CREATE TABLE conversation (
  id              VARCHAR(64)  PRIMARY KEY,
  user_id         BIGINT       NOT NULL,
  device_id       VARCHAR(64)  NOT NULL,
  character_id    BIGINT       NOT NULL,
  role            VARCHAR(16)  NOT NULL COMMENT 'user / assistant / system / tool',
  content         TEXT         NOT NULL,
  token_count     INT          NOT NULL DEFAULT 0,
  emotion         VARCHAR(32)  NULL COMMENT 'happy / sad / gentle / ...',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_char_time (user_id, character_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;