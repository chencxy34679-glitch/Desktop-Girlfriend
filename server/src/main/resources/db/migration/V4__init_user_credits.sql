-- ============================================================
-- V4: 用户积分余额表
-- 业务域: Payment / Credit
-- 说明: 当前积分余额,以 user_id 为主键
-- ============================================================
CREATE TABLE user_credits (
  user_id         BIGINT       PRIMARY KEY,
  credits         BIGINT       NOT NULL DEFAULT 0 COMMENT '积分余额',
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;