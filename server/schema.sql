CREATE DATABASE IF NOT EXISTS `second_hand`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `second_hand`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255),
  `name` VARCHAR(255),
  `nickname` VARCHAR(255),
  `avatar` VARCHAR(255),
  `phone` VARCHAR(20),
  `studentId` VARCHAR(20),
  `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
  `grade` VARCHAR(50),
  `major` VARCHAR(100),
  `bio` TEXT,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `status` ENUM('active', 'banned') DEFAULT 'active',
  `password_hash` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255),
  `description` TEXT,
  `price` DECIMAL(10, 2),
  `image_url` VARCHAR(255),
  `images` JSON,
  `condition` VARCHAR(50),
  `category_id` VARCHAR(50),
  `campus` VARCHAR(100),
  `owner_id` INT,
  `status` ENUM('pending', 'approved', 'rejected', 'down', 'deleted') DEFAULT 'pending',
  `reject_reason` TEXT,
  `views` INT DEFAULT 0,
  `favorites` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_products_owner_id` (`owner_id`),
  INDEX `idx_products_status` (`status`),
  INDEX `idx_products_category_id` (`category_id`),
  CONSTRAINT `fk_products_owner_id` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `favorites` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `product_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_favorites_user_product` (`user_id`, `product_id`),
  INDEX `idx_favorites_user_id` (`user_id`),
  INDEX `idx_favorites_product_id` (`product_id`),
  CONSTRAINT `fk_favorites_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_favorites_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `orderNo` VARCHAR(50),
  `buyer_id` INT,
  `seller_id` INT,
  `product_id` INT,
  `status` ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  `amount` DECIMAL(10, 2),
  `deliveryAddress` VARCHAR(255),
  `deliveryTime` VARCHAR(50),
  `timeline` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_orders_buyer_id` (`buyer_id`),
  INDEX `idx_orders_seller_id` (`seller_id`),
  INDEX `idx_orders_product_id` (`product_id`),
  INDEX `idx_orders_status` (`status`),
  CONSTRAINT `fk_orders_buyer_id` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_orders_seller_id` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_orders_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `addresses` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `contact` VARCHAR(50),
  `phone` VARCHAR(20),
  `campus` VARCHAR(100),
  `building` VARCHAR(100),
  `detail` VARCHAR(255),
  `isDefault` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_addresses_user_id` (`user_id`),
  CONSTRAINT `fk_addresses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evaluations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT,
  `user_id` INT,
  `target_id` INT,
  `target_type` ENUM('buyer', 'seller'),
  `rating` INT,
  `content` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_evaluations_order_id` (`order_id`),
  INDEX `idx_evaluations_user_id` (`user_id`),
  INDEX `idx_evaluations_target_id` (`target_id`),
  CONSTRAINT `fk_evaluations_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  CONSTRAINT `fk_evaluations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_evaluations_target_id` FOREIGN KEY (`target_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `complaints` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `type` VARCHAR(50),
  `target_id` INT,
  `content` TEXT,
  `evidence` JSON,
  `status` ENUM('pending', 'processed') DEFAULT 'pending',
  `result` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_complaints_user_id` (`user_id`),
  INDEX `idx_complaints_status` (`status`),
  CONSTRAINT `fk_complaints_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(50) PRIMARY KEY,
  `user_id` INT,
  `type` VARCHAR(50),
  `title` VARCHAR(255),
  `content` TEXT,
  `is_read` BOOLEAN DEFAULT FALSE,
  `order_id` INT,
  `product_id` INT,
  `complaint_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notifications_user_id` (`user_id`),
  INDEX `idx_notifications_order_id` (`order_id`),
  INDEX `idx_notifications_product_id` (`product_id`),
  INDEX `idx_notifications_complaint_id` (`complaint_id`),
  CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_notifications_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  CONSTRAINT `fk_notifications_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
  CONSTRAINT `fk_notifications_complaint_id` FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `user_id` INT,
  `action` VARCHAR(100),
  `module` VARCHAR(100),
  `content` TEXT,
  `ip` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_logs_user_id` (`user_id`),
  INDEX `idx_logs_created_at` (`created_at`),
  CONSTRAINT `fk_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255),
  `content` TEXT,
  `isTop` BOOLEAN DEFAULT FALSE,
  `status` ENUM('published', 'draft') DEFAULT 'published',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_announcements_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `banners` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255),
  `image` VARCHAR(255),
  `link` VARCHAR(255),
  `sort` INT,
  `active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_banners_sort` (`sort`),
  INDEX `idx_banners_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100),
  `parentId` VARCHAR(50),
  `sort` INT,
  `enabled` BOOLEAN DEFAULT TRUE,
  INDEX `idx_categories_parentId` (`parentId`),
  INDEX `idx_categories_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_tags` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `product_id` INT,
  `tag_name` VARCHAR(50),
  UNIQUE KEY `uk_product_tags_product_tag` (`product_id`, `tag_name`),
  INDEX `idx_product_tags_product_id` (`product_id`),
  INDEX `idx_product_tags_tag_name` (`tag_name`),
  CONSTRAINT `fk_product_tags_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_tags` (
  `user_id` INT,
  `tag_name` VARCHAR(50),
  `weight` INT DEFAULT 1,
  `update_time` DATETIME,
  PRIMARY KEY (`user_id`, `tag_name`),
  INDEX `idx_user_tags_user_id` (`user_id`),
  CONSTRAINT `fk_user_tags_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_recommend` (
  `user_id` INT,
  `product_id` INT,
  `score` DECIMAL(5, 2),
  `create_time` DATETIME,
  PRIMARY KEY (`user_id`, `product_id`),
  INDEX `idx_user_recommend_user_id` (`user_id`),
  INDEX `idx_user_recommend_product_id` (`product_id`),
  CONSTRAINT `fk_user_recommend_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_user_recommend_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `users` (`id`, `email`, `name`, `nickname`, `avatar`, `phone`, `studentId`, `role`, `status`, `password_hash`)
VALUES
  (1, 'alice@example.com', 'Alice', '数码小王子', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', '13800000001', '2021001', 'user', 'active', 'demo'),
  (2, 'admin@example.com', 'Admin', '管理员', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin', '13800000002', '2022002', 'admin', 'active', 'demo')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

INSERT INTO `categories` (`id`, `name`, `parentId`, `sort`, `enabled`)
VALUES
  ('c1', '数码产品', NULL, 1, TRUE),
  ('c1-1', '手机', 'c1', 1, TRUE),
  ('c1-2', '平板电脑', 'c1', 2, TRUE),
  ('c2', '教材书籍', NULL, 2, TRUE),
  ('c2-1', '公共课教材', 'c2', 1, TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `announcements` (`id`, `title`, `content`, `isTop`, `status`)
VALUES
  ('ann_seed_1', '🎉 平台上线公告', '校园二手交易平台已上线，欢迎体验！', TRUE, 'published'),
  ('ann_seed_2', '⚠️ 交易安全提醒', '请优先选择校内当面交易，不要站外转账。', FALSE, 'published')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `banners` (`id`, `title`, `image`, `link`, `sort`, `active`)
VALUES
  ('ban_seed_1', '毕业季闲置大甩卖', 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=1200&h=400&fit=crop', '/products', 1, TRUE),
  ('ban_seed_2', '教材书籍专区', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=400&fit=crop', '/products', 2, TRUE)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

