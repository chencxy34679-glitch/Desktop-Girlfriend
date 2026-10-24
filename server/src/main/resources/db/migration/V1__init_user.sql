-- ============================================================
-- V1: 用户账号表
-- 业务域: User
-- 说明: 匿名用户与注册用户统一存储,通过 user_type 区分
-- ============================================================
CREATE TABLE user_account (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  username        VARCHAR(64)  NULL UNIQUE COMMENT '匿名用户可空,注册用户必填',
  email           VARCHAR(128) NULL UNIQUE,
  password_hash   VARCHAR(128) NULL COMMENT 'bcrypt,匿名用户空',
  display_name    VARCHAR(64)  NOT NULL DEFAULT '',
  avatar_url      VARCHAR(512) NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT 'active / disabled',
  user_type       VARCHAR(16)  NOT NULL DEFAULT 'anonymous' COMMENT 'anonymous / registered',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;