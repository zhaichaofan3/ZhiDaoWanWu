-- 迁移：新增 AI 中心提示词表
-- 适用：已存在 second_hand 库的环境

USE `second_hand`;

CREATE TABLE IF NOT EXISTS `ai_prompts` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `scene` VARCHAR(100) NOT NULL,
  `content` TEXT NOT NULL,
  `enabled` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ai_prompts_scene` (`scene`),
  INDEX `idx_ai_prompts_enabled` (`enabled`),
  INDEX `idx_ai_prompts_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

