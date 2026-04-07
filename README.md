## 二手交易平台前后端项目说明

这是一个使用 **Vite + React + TypeScript + Tailwind + shadcn/ui** 构建的前端项目，现在已经补充了一个简单的 **Express + 本地 JSON 数据库** 后端，以及基础的 **REST API 封装**。

### 技术栈

- **前端**: Vite、React、TypeScript、React Router、shadcn/ui
- **后端**: Node.js、Express
- **数据库**: 本地 JSON 文件（`server/data.json`）

### 目录结构（关键部分）

- `src/`：前端页面和组件
- `src/lib/api.ts`：统一的前端 API 封装
- `server/index.js`：Express 主入口
- `server/src/db/`：数据库实现（MySQL / SQLite / JSON）
- `server/data.json`：本地 JSON 数据文件（启动后自动创建）

### 安装依赖

```bash
npm install
```

依赖通常会在 `npm install` 时自动安装；本项目后端仅使用 `express` 和 `cors`（数据库为本地 JSON 文件，无需安装 `better-sqlite3`）。

### 启动后端服务

```bash
npm run server
```

默认监听：`http://localhost:4000`

首次启动会自动创建 `server/data.json`，并初始化一些演示用户和商品数据。

### 启动前端（仅前端）

```bash
npm run dev
```

默认访问：`http://localhost:5173`

### 前后端同时启动

```bash
npm run dev:full
```

- 后端：`http://localhost:4000`
- 前端：`http://localhost:5173`

如需前端通过环境变量指定后端地址，可在根目录创建 `.env` 文件：

```bash
VITE_API_BASE_URL=http://localhost:4000
```

### 后端主要 API 说明

所有接口默认前缀为 `http://localhost:4000/api`：

- **健康检查**
  - `GET /api/health` → `{ status: "ok" }`

- **登录（示例，未真正加密）**
  - `POST /api/auth/login`
  - 请求体：`{ "email": string, "password": string }`
  - 返回：用户基本信息与一个示例 token

- **商品**
  - `GET /api/products` → 商品列表
  - `GET /api/products/:id` → 指定商品详情
  - `POST /api/products` → 创建商品（需要提供 `title, price, owner_id` 等）

- **收藏**
  - `GET /api/users/:userId/favorites` → 用户收藏列表
  - `POST /api/users/:userId/favorites` → 添加收藏（`{ product_id }`）
  - `DELETE /api/users/:userId/favorites/:productId` → 取消收藏

- **订单**
  - `POST /api/orders` → 创建订单（`{ buyer_id, product_id }`）
  - `GET /api/users/:userId/orders` → 用户订单列表

### 前端 API 封装使用方式

在前端任意组件中，可以通过 `src/lib/api.ts` 中导出的 `api` 对象调用后端，例如：

```ts
import { api } from "@/lib/api";

async function loadProducts() {
  const products = await api.listProducts();
  console.log(products);
}
```

你可以逐步将现有页面中的假数据/Mock 数据替换为这些真实接口。

### 注意事项

- 当前登录逻辑仅用于演示，密码未加密，请勿直接用于生产环境。
- 如需部署到线上，请根据实际情况添加鉴权、中间件、日志、安全等完整能力。

