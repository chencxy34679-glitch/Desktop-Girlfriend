-- ============================================================
-- V15: 下载日志表
-- 业务域: Character
-- 说明: 记录角色资源包下载行为,用于统计与推荐
-- ============================================================
CREATE TABLE download_log (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  character_id    BIGINT       NOT NULL,
  version_id      BIGINT       NOT NULL,
  user_id         BIGINT       NOT NULL,
  device_id       VARCHAR(64)  NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_char_time (character_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;