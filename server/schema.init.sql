-- 校园二手市场数据库初始化脚本
-- 包含完整表结构、租户扩展、角色权限和默认超级管理员
-- 使用方法：mysql -u root -p < schema.init.sql

DROP DATABASE IF EXISTS `second_hand`;
CREATE DATABASE `second_hand`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `second_hand`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- 1. 基础表结构
-- =============================================

-- 用户表
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255),
  `nickname` VARCHAR(255),
  `avatar` VARCHAR(512),
  `phone` VARCHAR(20),
  `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
  `bio` TEXT,
  `tenant_id` INT DEFAULT NULL,
  `student_id` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `status` ENUM('active', 'banned') DEFAULT 'active',
  `password_hash` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_tenant` (`tenant_id`),
  INDEX `idx_users_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品表
CREATE TABLE `products` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255),
  `description` TEXT,
  `price` DECIMAL(10, 2),
  `image_url` VARCHAR(255),
  `images` JSON,
  `condition` VARCHAR(50),
  `category_id` VARCHAR(50),
  `tenant_id` INT DEFAULT NULL,
  `campus` VARCHAR(100),
  `owner_id` INT,
  `status` ENUM('pending', 'approved', 'rejected', 'down', 'deleted') DEFAULT 'approved',
  `reject_reason` TEXT,
  `views` INT DEFAULT 0,
  `favorites` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_products_owner_id` (`owner_id`),
  INDEX `idx_products_status` (`status`),
  INDEX `idx_products_category_id` (`category_id`),
  INDEX `idx_products_tenant` (`tenant_id`),
  CONSTRAINT `fk_products_owner_id` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 收藏表
CREATE TABLE `favorites` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `product_id` INT,
  `tenant_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_favorites_user_product` (`user_id`, `product_id`),
  INDEX `idx_favorites_user_id` (`user_id`),
  INDEX `idx_favorites_product_id` (`product_id`),
  INDEX `idx_favorites_tenant` (`tenant_id`),
  CONSTRAINT `fk_favorites_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_favorites_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单表
CREATE TABLE `orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `orderNo` VARCHAR(50),
  `buyer_id` INT,
  `seller_id` INT,
  `product_id` INT,
  `tenant_id` INT DEFAULT NULL,
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
  INDEX `idx_orders_tenant` (`tenant_id`),
  CONSTRAINT `fk_orders_buyer_id` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_orders_seller_id` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_orders_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 地址表
CREATE TABLE `addresses` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `contact` VARCHAR(50),
  `phone` VARCHAR(20),
  `campus` VARCHAR(100),
  `building` VARCHAR(100),
  `detail` VARCHAR(255),
  `tenant_id` INT DEFAULT NULL,
  `isDefault` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_addresses_user_id` (`user_id`),
  INDEX `idx_addresses_tenant` (`tenant_id`),
  CONSTRAINT `fk_addresses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评价表
CREATE TABLE `evaluations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `order_id` INT,
  `user_id` INT,
  `target_id` INT,
  `target_type` ENUM('buyer', 'seller'),
  `rating` INT,
  `content` TEXT,
  `tenant_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_evaluations_order_id` (`order_id`),
  INDEX `idx_evaluations_user_id` (`user_id`),
  INDEX `idx_evaluations_target_id` (`target_id`),
  INDEX `idx_evaluations_tenant` (`tenant_id`),
  CONSTRAINT `fk_evaluations_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  CONSTRAINT `fk_evaluations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_evaluations_target_id` FOREIGN KEY (`target_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 投诉表
CREATE TABLE `complaints` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `type` VARCHAR(50),
  `target_id` INT,
  `content` TEXT,
  `evidence` JSON,
  `status` ENUM('pending', 'processed') DEFAULT 'pending',
  `result` TEXT,
  `tenant_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_complaints_user_id` (`user_id`),
  INDEX `idx_complaints_status` (`status`),
  INDEX `idx_complaints_tenant` (`tenant_id`),
  CONSTRAINT `fk_complaints_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通知表
CREATE TABLE `notifications` (
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

-- 操作日志表
CREATE TABLE `logs` (
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

-- 公告表
CREATE TABLE `announcements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255),
  `content` TEXT,
  `isTop` BOOLEAN DEFAULT FALSE,
  `status` ENUM('published', 'draft') DEFAULT 'published',
  `tenant_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_announcements_status` (`status`),
  INDEX `idx_announcements_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 轮播图表
CREATE TABLE `banners` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255),
  `image` VARCHAR(255),
  `link` VARCHAR(255),
  `sort` INT,
  `active` BOOLEAN DEFAULT TRUE,
  `tenant_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_banners_sort` (`sort`),
  INDEX `idx_banners_active` (`active`),
  INDEX `idx_banners_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分类表
CREATE TABLE `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100),
  `parentId` VARCHAR(50),
  `sort` INT,
  `enabled` BOOLEAN DEFAULT TRUE,
  INDEX `idx_categories_parentId` (`parentId`),
  INDEX `idx_categories_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 字典表
CREATE TABLE `dict_items` (
  `id` VARCHAR(64) PRIMARY KEY,
  `dict_type` VARCHAR(50) NOT NULL,
  `value` VARCHAR(100) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `sort` INT DEFAULT 0,
  `enabled` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_dict_type_value` (`dict_type`, `value`),
  INDEX `idx_dict_type_sort` (`dict_type`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 提示词表
CREATE TABLE `ai_prompts` (
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

-- 商品标签
CREATE TABLE `product_tags` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `product_id` INT,
  `tag_name` VARCHAR(50),
  UNIQUE KEY `uk_product_tags_product_tag` (`product_id`, `tag_name`),
  INDEX `idx_product_tags_product_id` (`product_id`),
  INDEX `idx_product_tags_tag_name` (`tag_name`),
  CONSTRAINT `fk_product_tags_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户标签
CREATE TABLE `user_tags` (
  `user_id` INT,
  `tag_name` VARCHAR(50),
  `weight` INT DEFAULT 1,
  `update_time` DATETIME,
  PRIMARY KEY (`user_id`, `tag_name`),
  INDEX `idx_user_tags_user_id` (`user_id`),
  CONSTRAINT `fk_user_tags_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户推荐
CREATE TABLE `user_recommend` (
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

-- 聊天会话
CREATE TABLE `chat_conversations` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user1_id` INT NOT NULL,
  `user2_id` INT NOT NULL,
  `product_id` INT NULL,
  `last_message_content` TEXT,
  `last_message_type` ENUM('text', 'image', 'product-card') DEFAULT 'text',
  `last_message_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_chat_conv_users_product` (`user1_id`, `user2_id`, `product_id`),
  INDEX `idx_chat_conv_user1` (`user1_id`),
  INDEX `idx_chat_conv_user2` (`user2_id`),
  INDEX `idx_chat_conv_product` (`product_id`),
  INDEX `idx_chat_conv_last_at` (`last_message_at`),
  CONSTRAINT `fk_chat_conv_user1` FOREIGN KEY (`user1_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_chat_conv_user2` FOREIGN KEY (`user2_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_chat_conv_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 会话成员
CREATE TABLE `chat_conversation_members` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `conversation_id` BIGINT NOT NULL,
  `user_id` INT NOT NULL,
  `last_read_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_chat_conv_member` (`conversation_id`, `user_id`),
  INDEX `idx_chat_member_user` (`user_id`),
  INDEX `idx_chat_member_conv` (`conversation_id`),
  CONSTRAINT `fk_chat_member_conv` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_member_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 聊天消息
CREATE TABLE `chat_messages` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `conversation_id` BIGINT NOT NULL,
  `sender_id` INT NOT NULL,
  `type` ENUM('text', 'image', 'product-card') DEFAULT 'text',
  `content` TEXT,
  `extra` JSON NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_chat_msg_conv_created` (`conversation_id`, `created_at`),
  INDEX `idx_chat_msg_sender` (`sender_id`),
  CONSTRAINT `fk_chat_msg_conv` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. 租户扩展表
-- =============================================

-- 租户表
CREATE TABLE `tenants` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `short_name` VARCHAR(50),
  `logo` VARCHAR(512),
  `logo_dark` VARCHAR(512),
  `description` TEXT,
  `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  `settings` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenants_code` (`code`),
  INDEX `idx_tenants_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色表
CREATE TABLE `roles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100),
  `description` TEXT,
  `tenant_id` INT DEFAULT NULL,
  `type` ENUM('system', 'tenant') DEFAULT 'system',
  `sort` INT DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_roles_code` (`code`),
  INDEX `idx_roles_tenant` (`tenant_id`),
  INDEX `idx_roles_type` (`type`),
  CONSTRAINT `fk_roles_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户角色关联表
CREATE TABLE `user_roles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `tenant_id` INT DEFAULT NULL,
  `granted_by` INT,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`, `tenant_id`),
  INDEX `idx_user_roles_user` (`user_id`),
  INDEX `idx_user_roles_role` (`role_id`),
  INDEX `idx_user_roles_tenant` (`tenant_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 权限表
CREATE TABLE `permissions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `sort` INT DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_permissions_code` (`code`),
  INDEX `idx_permissions_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色权限关联表
CREATE TABLE `role_permissions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  INDEX `idx_role_perms_role` (`role_id`),
  INDEX `idx_role_perms_permission` (`permission_id`),
  CONSTRAINT `fk_role_perms_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_perms_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. 初始化系统角色
-- =============================================

INSERT INTO `roles` (`code`, `name`, `name_en`, `description`, `tenant_id`, `type`, `sort`, `status`) VALUES
('super_admin', '超级管理员', 'Super Admin', '系统超级管理员，拥有全部权限', NULL, 'system', 1, 'active'),
('tenant_admin', '学校管理员', 'Tenant Admin', '学校管理员，管理本校用户和数据', NULL, 'tenant', 2, 'active'),
('tenant_operator', '学校运营', 'Tenant Operator', '学校运营人员，管理本校日常运营', NULL, 'tenant', 3, 'active'),
('user', '普通用户', 'User', '普通注册用户', NULL, 'system', 4, 'active'),
('verified_user', '已认证用户', 'Verified User', '已完成学号认证的用户', NULL, 'system', 5, 'active');

-- =============================================
-- 4. 初始化系统权限
-- =============================================

INSERT INTO `permissions` (`code`, `name`, `module`, `description`, `sort`, `status`) VALUES
-- 系统管理
('system:tenant:manage', '租户管理', 'system', '管理系统租户', 1, 'active'),
('system:role:manage', '角色管理', 'system', '管理系统角色', 2, 'active'),
('system:permission:manage', '权限管理', 'system', '管理系统权限', 3, 'active'),
('system:user:view', '用户查看', 'system', '查看所有用户', 4, 'active'),
('system:user:manage', '用户管理', 'system', '管理所有用户', 5, 'active'),
('system:settings:manage', '系统设置', 'system', '管理系统设置', 6, 'active'),
('system:log:view', '日志查看', 'system', '查看系统日志', 7, 'active'),

-- 租户管理
('tenant:info:manage', '学校信息管理', 'tenant', '管理学校基本信息', 10, 'active'),
('tenant:domain:manage', '邮箱域名管理', 'tenant', '管理学校邮箱域名', 11, 'active'),
('tenant:user:view', '本校用户查看', 'tenant', '查看本校用户', 12, 'active'),
('tenant:user:manage', '本校用户管理', 'tenant', '管理本校用户', 13, 'active'),
('tenant:user:ban', '本校用户封禁', 'tenant', '封禁本校用户', 14, 'active'),

-- 商品管理
('product:view', '商品查看', 'product', '查看商品', 20, 'active'),
('product:publish', '发布商品', 'product', '发布商品', 21, 'active'),
('product:manage', '商品管理', 'product', '管理所有商品', 22, 'active'),
('product:audit', '商品审核', 'product', '审核商品', 23, 'active'),

-- 订单管理
('order:view', '订单查看', 'order', '查看订单', 30, 'active'),
('order:manage', '订单管理', 'order', '管理订单', 31, 'active'),

-- 数据统计
('stats:view', '数据查看', 'stats', '查看统计数据', 40, 'active'),
('stats:export', '数据导出', 'stats', '导出数据', 41, 'active'),

-- 内容管理
('content:announcement:manage', '公告管理', 'content', '管理公告', 50, 'active'),
('content:banner:manage', 'Banner管理', 'content', '管理轮播图', 51, 'active'),
('content:category:manage', '分类管理', 'content', '管理分类', 52, 'active'),
('content:dict:manage', '字典管理', 'content', '管理字典', 53, 'active'),

-- 评价投诉
('feedback:evaluation:manage', '评价管理', 'feedback', '管理评价', 60, 'active'),
('feedback:complaint:manage', '投诉管理', 'feedback', '管理投诉', 61, 'active'),

-- AI中心
('ai:prompt:manage', 'AI提示词管理', 'ai', '管理AI提示词', 70, 'active');

-- =============================================
-- 5. 角色权限分配
-- =============================================

-- 超级管理员拥有所有权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'super_admin';

-- 学校管理员拥有租户管理和内容管理权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'tenant_admin'
AND p.code IN (
  'tenant:info:manage',
  'tenant:user:view', 'tenant:user:manage', 'tenant:user:ban',
  'product:view', 'product:publish', 'product:manage', 'product:audit',
  'order:view', 'order:manage',
  'stats:view', 'stats:export',
  'content:announcement:manage', 'content:banner:manage',
  'content:category:manage', 'content:dict:manage',
  'feedback:evaluation:manage', 'feedback:complaint:manage'
);

-- 普通用户基础权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'user'
AND p.code IN ('product:view');

-- 已认证用户权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'verified_user'
AND p.code IN (
  'product:view',
  'product:publish',
  'order:view'
);

-- =============================================
-- 6. 创建默认租户
-- =============================================

INSERT INTO `tenants` (`code`, `name`, `short_name`, `description`, `status`) VALUES
('demo', '示例大学', 'Demo', '系统默认租户，用于演示', 'active');

-- =============================================
-- 7. 创建默认超级管理员用户
-- =============================================
-- 用户名：admin
-- 密码：admin123
-- 注意：密码哈希值为 bcrypt('admin123')

INSERT INTO `users` (
  `id`, `name`, `nickname`, `avatar`, `phone`, `gender`, `bio`,
  `tenant_id`, `role`, `status`, `password_hash`, `created_at`
) VALUES (
  1,
  'admin@example.com',
  '超级管理员',
  '管理员',
  '',
  '13800138000',
  'other',
  '系统超级管理员',
  NULL,
  1,
  'admin',
  'active',
  '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  NOW()
);

-- 为超级管理员分配超级管理员角色
INSERT INTO `user_roles` (`user_id`, `role_id`, `tenant_id`, `granted_by`, `created_at`)
VALUES (1, (SELECT id FROM roles WHERE code = 'super_admin'), NULL, 1, NOW());

-- =============================================
-- 8. 默认AI提示词
-- =============================================

INSERT INTO `ai_prompts` (`id`, `name`, `scene`, `content`, `enabled`, `created_at`, `updated_at`) VALUES
(
  'aip_search_top_product_default',
  '搜索Top1推荐',
  'search_top_product',
  '你是校园二手平台搜索排序助手。\n用户搜索词：{{query}}\n请在候选商品中只选出最相关的一件商品。\n优先级：语义相关性 > 标题精确匹配 > 品类匹配 > 成色与价格合理性 > 热度(浏览/收藏) > 时间新近。\n严格输出 JSON，格式如下：\n{"productId": 123, "reason": "一句话说明", "reply": "给用户的一句推荐解释"}\n不要输出任何额外文本。\n候选商品：{{candidates}}',
  1,
  NOW(),
  NOW()
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 初始化完成
-- =============================================
-- 默认超级管理员登录信息：
-- 用户名：admin@example.com 或 13800138000
-- 密码：admin123
-- =============================================