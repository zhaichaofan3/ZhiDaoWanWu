-- 迁移：扩展 users.avatar 字段长度（支持更长的 OSS 路径/URL）
-- 适用：已存在 second_hand 库的环境

USE `second_hand`;

ALTER TABLE `users`
  MODIFY COLUMN `avatar` VARCHAR(512) NULL;

