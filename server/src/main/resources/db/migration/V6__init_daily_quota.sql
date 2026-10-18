-- ============================================================
-- V6: 每日限额表
-- 业务域: User / Credit
-- 说明: Redis 主,MySQL 兜底;记录用户每日调用次数与 token 用量
-- ============================================================
CREATE TABLE daily_quota (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id         BIGINT       NOT NULL,
  quota_date      DATE         NOT NULL,
  chat_count      INT          NOT NULL DEFAULT 0,
  agent_count     INT          NOT NULL DEFAULT 0,
  chat_token_in   BIGINT       NOT NULL DEFAULT 0,
  chat_token_out  BIGINT       NOT NULL DEFAULT 0,
  UNIQUE KEY uk_user_date (user_id, quota_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;