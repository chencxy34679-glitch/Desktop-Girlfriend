-- ============================================================
-- V3: 会员订阅表
-- 业务域: User / Payment
-- 说明: 记录用户的会员订阅周期,关联支付订单
-- ============================================================
CREATE TABLE user_subscription (
  id                  BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id             BIGINT       NOT NULL,
  plan                VARCHAR(16)  NOT NULL COMMENT 'monthly / yearly / lifetime',
  start_at            DATETIME     NOT NULL,
  expire_at           DATETIME     NULL COMMENT 'lifetime 为 NULL',
  status              VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT 'active / expired / cancelled',
  payment_order_id    BIGINT       NULL COMMENT '关联订单',
  auto_renew          TINYINT(1)   NOT NULL DEFAULT 0,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_expire (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;