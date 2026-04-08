## 校园二手交易平台（前后端一体）

前端使用 **Vite + React + TypeScript + Tailwind + shadcn/ui**，后端使用 **Node.js + Express**，数据库使用 **MySQL**。项目支持：

- **用户端**：发布/浏览商品、收藏、下单、评价、投诉、站内消息
- **管理端**：用户/商品/订单/投诉/日志管理、轮播图、分类、字典、AI 提示词管理
- **可选能力**：S3 兼容 OSS 上传、短信验证码、AI 生成商品文案/价格

### 技术栈

- **前端**：Vite、React、TypeScript、React Router、Tailwind、shadcn/ui
- **后端**：Node.js、Express
- **数据库**：MySQL（`mysql2`）
- **对象存储（可选）**：S3-compatible（MinIO/OSS S3兼容/COS S3兼容/Ceph 等）

### 目录结构（关键部分）

- `src/`：前端页面与组件
- `src/lib/api.ts`：前端 API 封装（通过 `VITE_API_BASE_URL` 指向后端）
- `server/src/main.js`：后端启动入口
- `server/src/app.js`：Express 应用与路由挂载
- `server/schema.init.sql`：初始化建库/建表脚本
- `server/schema.seed.sql`：可重复执行的开发种子数据脚本

### 环境准备

- Node.js 18+（建议 20+）
- MySQL 8+（或兼容 MySQL 的服务）

### 安装依赖

```bash
npm install
```

### 配置环境变量

1) 复制示例文件并填写

```bash
copy .env.example .env
```

2) 生成本地随机密钥（推荐）

```bash
npm run gen:secrets
```

把输出的 `TOKEN_SECRET` / `PASSWORD_SALT` 粘贴进你的 `.env`。

### 初始化数据库

本项目后端不会自动跑 migrations；推荐你在全新环境按下面顺序初始化：

1) 执行建库建表（会创建并使用 `second_hand` 数据库；若你在 `.env` 里配置了其它库名，请自行调整脚本）

```sql
-- 运行：server/schema.init.sql
```

2) （可选）导入开发种子数据

```sql
-- 运行：server/schema.seed.sql
```

### 启动开发环境

前后端同时启动：

```bash
npm run dev:full
```

- 后端默认：`http://localhost:4000`
- 前端默认：`http://localhost:5173`

仅启动后端：

```bash
npm run server
```

仅启动前端：

```bash
npm run dev
```

### 常见配置说明

- **前端请求后端**：通过 `.env` 的 `VITE_API_BASE_URL` 配置（默认 `http://localhost:4000`）
- **短信验证码**：后端启动时会校验 `SPUG_SMS_TEMPLATE_ID`，本地开发若不想接短信服务，需要提供一个可用的模板 ID
- **OSS 上传**：不配置 OSS 时，图片会回退到本地 `uploads/`（开发联调足够）；配置后走 S3-compatible 上传与访问

### 安全提示

- 请勿把真实的 `TOKEN_SECRET`、短信模板 ID、OSS 密钥等提交到仓库
- 生产环境请补齐鉴权、审计、安全头、速率限制等能力

