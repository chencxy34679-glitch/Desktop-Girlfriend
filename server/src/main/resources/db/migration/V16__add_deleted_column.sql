-- ============================================================
-- V16: 给 user_account 补逻辑删除列
-- 业务域: User
-- 说明: MyBatis-Plus 全局配置了 logic-delete-field: deleted,
--       实体与 @Select 也引用了 deleted,但 V1 建表时漏了这一列。
--       这里做增量补齐,不重建表、不动既有数据。
-- ============================================================
ALTER TABLE user_account
  ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除:0 未删 / 1 已删' AFTER updated_at;

-- 配合逻辑删除:同一用户名可能存在多条历史记录,唯一索引需带上 deleted
-- MySQL 不支持索引中直接引用非常量表达式,先删除原唯一索引再重建为普通索引,
-- 由应用层 (AuthService.countByUsername) 保证唯一性。
ALTER TABLE user_account DROP INDEX username;
ALTER TABLE user_account ADD INDEX idx_username_deleted (username, deleted);
