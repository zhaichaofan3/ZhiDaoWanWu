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

### 构建生产环境

1. 构建前端静态文件：

```bash
npm run build
```

构建产物会生成在 `dist/` 目录。

2. 生产环境启动：

```bash
npm start
```

这会同时启动后端服务和前端静态文件服务。

### 部署教程

#### 1. 环境准备

- Node.js 18+（建议 20+）
- MySQL 8+（或兼容 MySQL 的服务）
- 可选：Nginx（用于反向代理）
- 可选：PM2（用于进程管理）

#### 2. 服务器部署步骤

1. **克隆仓库**：

```bash
git clone <repository-url>
cd campus-second-hand-market
```

2. **安装依赖**：

```bash
npm install
```

3. **配置环境变量**：

```bash
cp .env.example .env
# 编辑 .env 文件，填写相关配置
```

4. **生成本地随机密钥**：

```bash
npm run gen:secrets
```

将输出的 `TOKEN_SECRET` / `PASSWORD_SALT` 粘贴进 `.env` 文件。

5. **初始化数据库**：

```bash
# 登录 MySQL
mysql -u root -p

# 执行建库建表脚本
source server/schema.init.sql

# 可选：导入开发种子数据
source server/schema.seed.sql
```

6. **构建前端**：

```bash
npm run build
```

7. **启动服务**：

   - 直接启动：
   ```bash
   npm start
   ```

   - 使用 PM2 管理进程：
   ```bash
   # 安装 PM2
   npm install -g pm2
   
   # 启动服务
   pm2 start npm --name "campus-market" -- start
   
   # 查看状态
   pm2 status
   
   # 设置开机自启
   pm2 save
   pm2 startup
   ```

#### 3. Nginx 反向代理配置（可选）

如果使用 Nginx 作为反向代理，可以添加以下配置：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Docker 部署（可选）

项目包含 `Dockerfile`，可以使用 Docker 进行部署：

1. **构建镜像**：

```bash
docker build -t campus-second-hand-market .
```

2. **运行容器**：

```bash
docker run -d \
  --name campus-market \
  -p 4000:4000 \
  -p 5173:5173 \
  -e DATABASE_URL="mysql://user:password@host:port/second_hand" \
  -e TOKEN_SECRET="your-token-secret" \
  -e PASSWORD_SALT="your-password-salt" \
  campus-second-hand-market
```

### 常见配置说明

- **前端请求后端**：通过 `.env` 的 `VITE_API_BASE_URL` 配置（默认 `http://localhost:4000`）
- **短信验证码**：后端启动时会校验 `SPUG_SMS_TEMPLATE_ID`，本地开发若不想接短信服务，需要提供一个可用的模板 ID
- **OSS 上传**：不配置 OSS 时，图片会回退到本地 `uploads/`（开发联调足够）；配置后走 S3-compatible 上传与访问

### 常见问题及解决方案

1. **数据库连接失败**：
   - 检查 `.env` 中的数据库配置是否正确
   - 确保 MySQL 服务正在运行
   - 确保数据库用户有足够的权限

2. **前端无法访问后端 API**：
   - 检查 `VITE_API_BASE_URL` 配置是否正确
   - 确保后端服务正在运行
   - 检查网络防火墙是否允许访问

3. **图片上传失败**：
   - 检查 `uploads/` 目录是否存在且有写入权限
   - 若使用 OSS，检查 OSS 配置是否正确

4. **短信验证码发送失败**：
   - 检查短信服务配置是否正确
   - 确保账户有足够的余额

### 安全提示

- 请勿把真实的 `TOKEN_SECRET`、短信模板 ID、OSS 密钥等提交到仓库
- 生产环境请补齐鉴权、审计、安全头、速率限制等能力
- 定期更新依赖包以修复安全漏洞
- 使用 HTTPS 协议保护数据传输

