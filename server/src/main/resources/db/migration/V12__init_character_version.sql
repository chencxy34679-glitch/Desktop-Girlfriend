-- ============================================================
-- V12: 角色版本表
-- 业务域: Character
-- 说明: 角色资源包(zip)的上传版本,SHA256 校验
-- ============================================================
CREATE TABLE character_version (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  character_id    BIGINT       NOT NULL,
  version         VARCHAR(32)  NOT NULL,
  zip_oss_key     VARCHAR(512) NOT NULL,
  zip_sha256      CHAR(64)     NOT NULL,
  size_bytes      BIGINT       NOT NULL,
  changelog       TEXT         NULL,
  is_current      TINYINT(1)   NOT NULL DEFAULT 0,
  app_min_version VARCHAR(32)  NOT NULL DEFAULT '0.1.0',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_char_ver (character_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;