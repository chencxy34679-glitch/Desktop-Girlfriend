-- ============================================================
-- V7: 支付订单表
-- 业务域: Payment
-- 说明: 微信/支付宝支付订单,记录商户订单号与渠道原始数据
-- ============================================================
CREATE TABLE payment_order (
  id                  BIGINT       PRIMARY KEY AUTO_INCREMENT,
  order_no            VARCHAR(64)  NOT NULL UNIQUE COMMENT '商户订单号',
  user_id             BIGINT       NOT NULL,
  channel             VARCHAR(16)  NOT NULL COMMENT 'wechat / alipay',
  plan                VARCHAR(16)  NOT NULL COMMENT 'monthly / yearly / lifetime',
  amount_cents        INT          NOT NULL COMMENT '金额(分)',
  status              VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT 'pending / paid / failed / refunded / cancelled',
  paid_at             DATETIME     NULL,
  closed_at           DATETIME     NULL,
  channel_trade_no    VARCHAR(64)  NULL COMMENT '微信/支付宝流水号',
  channel_raw         LONGTEXT        NULL COMMENT '渠道回调原始数据',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;