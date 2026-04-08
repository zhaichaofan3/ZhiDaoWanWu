-- 迁移：把现有硬编码 AI 提示词搬入数据库（可重复执行）
-- 适用：已存在 second_hand 库的环境
--
-- 说明：
-- - 该迁移只负责“把默认提示词写入 ai_prompts 表”
-- - 运行时代码是否改为从数据库读取，可在后续改造（否则仍然会继续使用硬编码）

USE `second_hand`;

-- 确保表存在（如果你没跑 create_ai_prompts 迁移，这里会报错）
-- 建议先执行：20260409_create_ai_prompts.sql

INSERT INTO `ai_prompts` (`id`, `name`, `scene`, `content`, `enabled`, `created_at`, `updated_at`)
VALUES (
  'aip_generate_product_v1',
  '生成商品描述与估价（默认）',
  'generate_product',
  CONCAT(
    '## system\n',
    '你是一个专业的二手商品描述专家，擅长生成详细、准确的商品介绍和合理的价格估计。你能够根据商品描述和图片识别商品的类型、品牌、型号、成色等信息，并生成专业的商品描述。\n\n',
    '## user_template\n',
    '你是一个专业的二手商品描述专家，帮我为以下商品生成一个完整且简练的商品介绍，并根据市场情况估计一个合理的价格。\n\n',
    '商品描述：{{description}}\n\n',
    '商品图片：{{images_count}}张\n\n',
    '请仔细分析图片内容，识别商品的类型、品牌、型号、成色等信息，并在生成的描述中体现出来。\n\n',
    '要求：\n',
    '1. 生成的描述要专业、详细，突出商品的特点和优势\n',
    '2. 描述结构清晰，包括商品特点、使用情况、转手原因、交易方式等\n',
    '3. 价格估计要合理，基于市场情况和商品状况\n',
    '4. 自动识别商品的分类和成色，并在描述中明确体现\n',
    '5. 输出格式：\n',
    '   - 分类：商品分类\n',
    '   - 成色：商品成色\n',
    '   - 描述：商品描述\n',
    '   - 价格估计：¥XXX\n\n',
    '请严格按照上述格式输出，不要添加任何其他内容。\n'
  ),
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `scene` = VALUES(`scene`),
  `content` = VALUES(`content`),
  `enabled` = VALUES(`enabled`),
  `updated_at` = NOW();

