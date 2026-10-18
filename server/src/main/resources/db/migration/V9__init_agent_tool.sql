-- ============================================================
-- V9: Agent 工具配置表
-- 业务域: Agent
-- 说明: 工具元数据,含积分消耗、是否仅会员、每日免费限额
-- ============================================================
CREATE TABLE agent_tool (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  tool_name       VARCHAR(64)  NOT NULL UNIQUE COMMENT 'get_weather / send_email / ...',
  display_name    VARCHAR(128) NOT NULL,
  description     TEXT         NOT NULL COMMENT '给 LLM 看的工具描述',
  credit_cost     INT          NOT NULL DEFAULT 1 COMMENT '调用扣多少积分',
  enabled         TINYINT(1)   NOT NULL DEFAULT 1,
  free_user_limit INT          NOT NULL DEFAULT 3 COMMENT '匿名/免费用户每日限额,0=不限',
  member_only     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '仅会员可用',
  config_json     JSON         NULL COMMENT '工具配置(API Key 走环境变量,这里存业务配置)',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;