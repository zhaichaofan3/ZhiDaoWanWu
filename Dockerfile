# 多阶段构建

# 第一阶段：构建前端
FROM node:18-alpine AS frontend

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制前端代码
COPY . .

# 构建前端
RUN npm run build

# 第二阶段：构建后端
FROM node:18-alpine AS backend

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制后端代码
COPY server/ ./server/

# 复制前端构建产物
COPY --from=frontend /app/dist/ ./dist/

# 暴露端口
EXPOSE 4000

# 启动应用
CMD ["node", "server/index.mjs"]