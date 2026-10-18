-- ============================================================
-- V13: 角色文件表
-- 业务域: Character
-- 说明: 角色关联的所有文件(模型、贴图、音频等)的元信息
-- ============================================================
CREATE TABLE character_file (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  character_id    BIGINT       NOT NULL,
  oss_key         VARCHAR(512) NOT NULL,
  file_type       VARCHAR(32)  NOT NULL,
  size_bytes      BIGINT       NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;