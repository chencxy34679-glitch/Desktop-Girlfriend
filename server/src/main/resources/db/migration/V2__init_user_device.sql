-- ============================================================
-- V2: 用户设备表
-- 业务域: User
-- 说明: 记录用户的设备信息,用于多端登录与推送
-- ============================================================
CREATE TABLE user_device (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id         BIGINT       NOT NULL,
  device_id       VARCHAR(64)  NOT NULL COMMENT 'app 启动时生成的 UUID',
  device_name     VARCHAR(128) NOT NULL DEFAULT '',
  os_version      VARCHAR(64)  NOT NULL,
  app_version     VARCHAR(32)  NOT NULL,
  last_active_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_device (user_id, device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;