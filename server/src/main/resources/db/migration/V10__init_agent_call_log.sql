-- ============================================================
-- V10: Agent 调用日志表
-- 业务域: Agent
-- 说明: 记录每次工具调用,含输入输出、状态、积分扣除与延迟
-- ============================================================
CREATE TABLE agent_call_log (
  id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id         BIGINT       NOT NULL,
  device_id       VARCHAR(64)  NOT NULL,
  character_id    BIGINT       NULL COMMENT '创建角色前可能为空',
  conversation_id VARCHAR(64)  NULL,
  tool_name       VARCHAR(64)  NOT NULL,
  input_args      JSON         NULL,
  output_result   TEXT         NULL,
  status          VARCHAR(16)  NOT NULL COMMENT 'success / failed / denied',
  error_message   TEXT         NULL,
  credit_cost     INT          NOT NULL DEFAULT 0,
  latency_ms      INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, created_at),
  INDEX idx_tool (tool_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;