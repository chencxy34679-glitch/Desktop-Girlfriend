-- ============================================================
-- V8: 支付回调日志表
-- 业务域: Payment
-- 说明: 记录每一次渠道回调,含签名校验与处理结果,用于对账与排查
-- ============================================================
CREATE TABLE payment_callback_log (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  channel         VARCHAR(16)  NOT NULL,
  order_no        VARCHAR(64)  NOT NULL,
  payload         TEXT         NOT NULL COMMENT '回调原始 XML / JSON',
  signature       VARCHAR(256) NOT NULL,
  verified        TINYINT(1)   NOT NULL DEFAULT 0,
  processed       TINYINT(1)   NOT NULL DEFAULT 0,
  error_message   TEXT         NULL,
  received_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;