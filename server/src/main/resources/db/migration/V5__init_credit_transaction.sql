-- ============================================================
-- V5: 积分流水表
-- 业务域: Payment / Credit
-- 说明: 所有积分变动记录,包含充值、消费、退款、赠送等
-- ============================================================
CREATE TABLE credit_transaction (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id         BIGINT       NOT NULL,
  delta           BIGINT       NOT NULL COMMENT '+ 充值 / - 消费',
  balance_after   BIGINT       NOT NULL,
  reason          VARCHAR(32)  NOT NULL COMMENT 'recharge / chat / agent / refund / gift',
  ref_id          VARCHAR(64)  NULL COMMENT '关联订单 / 对话 ID',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;