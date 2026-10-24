-- ============================================================
-- V11: 角色元数据表
-- 业务域: Character
-- 说明: 角色定义,含 spine / live2d 类型、license、persona、TTS 等
--       注意: character 是 SQL 关键字,使用反引号包裹
-- ============================================================
CREATE TABLE `character` (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  slug            VARCHAR(64)  NOT NULL UNIQUE,
  display_name    VARCHAR(128) NOT NULL,
  author_id       BIGINT       NOT NULL DEFAULT 0,
  description     TEXT         NOT NULL,
  type            VARCHAR(16)  NOT NULL COMMENT 'spine | live2d',
  license         VARCHAR(32)  NOT NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'review-pending',
  cover_url       VARCHAR(512) NOT NULL,
  tags            VARCHAR(512) NOT NULL DEFAULT '',
  persona_system  TEXT         NOT NULL COMMENT '默认 system prompt',
  persona_few_shot LONGTEXT    NULL COMMENT '默认 few-shot examples',
  tts_voice_id    VARCHAR(64)  NOT NULL COMMENT '默认 TTS 音色(per 角色)',
  tts_provider    VARCHAR(32)  NOT NULL DEFAULT 'volcengine',
  temperature     DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  rag_enabled     TINYINT(1)   NOT NULL DEFAULT 0,
  default_tools   VARCHAR(512) NOT NULL DEFAULT '' COMMENT '逗号分隔的 agent_tool.tool_name',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_type (status, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;