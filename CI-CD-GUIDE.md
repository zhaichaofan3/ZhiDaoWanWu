# CI/CD 部署指南

本指南将帮助你通过 GitHub Actions 自动部署应用到 Sealos 集群。

## 1. 配置 GitHub 仓库密钥

要使用 CI/CD 部署，你需要在 GitHub 仓库中设置以下密钥：

### 步骤：

1. 登录 GitHub，进入你的仓库
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret` 按钮
4. 添加以下密钥：
   | 密钥名称              | 描述            | 值              |
   | ----------------- | ------------- | -------------- |
   | `SEALOS_USERNAME` | Sealos 账号用户名  | 你的 Sealos 登录邮箱 |
   | `SEALOS_TOKEN`    | Sealos API 令牌 | 从 Sealos 控制台获取 |

### 获取 Sealos API 令牌：

1. 登录 Sealos 控制台
2. 点击右上角的用户头像 → `个人设置`
3. 导航到 `API 令牌` 页面
4. 点击 `创建令牌` 按钮
5. 为令牌设置名称，选择适当的权限（至少需要部署权限）
6. 复制生成的令牌值

## 2. 现有 CI/CD 配置

项目中已经包含了完整的 CI/CD 配置文件：`.github/workflows/deploy.yml`

### 配置详情：

- **触发条件**：
  - 当代码推送到 `main` 分支时自动触发
  - 支持手动触发（通过 GitHub Actions 页面）
- **工作流程**：
  1. 拉取代码
  2. 登录 GitHub Container Registry
  3. 构建并推送 Docker 镜像
  4. 安装 Sealos CLI
  5. 登录 Sealos
  6. 部署应用到 Sealos 集群

## 3. 手动触发部署

除了自动触发外，你还可以手动触发部署：

### 步骤：

1. 登录 GitHub，进入你的仓库
2. 点击 `Actions` 标签页
3. 在左侧工作流列表中选择 `构建并部署到 Sealos`
4. 点击 `Run workflow` 按钮
5. 选择要部署的分支（通常是 `main`）
6. 点击 `Run workflow` 按钮开始部署

## 4. 查看部署状态和日志

### 查看 GitHub Actions 日志：

1. 登录 GitHub，进入你的仓库
2. 点击 `Actions` 标签页
3. 在左侧工作流列表中选择 `构建并部署到 Sealos`
4. 点击最新的工作流运行
5. 点击 `build-and-deploy` 任务查看详细日志

### 查看 Sealos 部署状态：

1. 登录 Sealos 控制台
2. 点击左侧导航栏的 `应用管理`
3. 找到部署的应用（名称为 `my-fullstack-app`）
4. 点击应用名称查看详细信息和日志

## 5. 部署参数说明

CI/CD 配置中使用的部署参数：

| 参数               | 说明   | 值                      |
| ---------------- | ---- | ---------------------- |
| `--name`         | 应用名称 | `my-fullstack-app`     |
| `--port`         | 端口映射 | `4000:4000`（容器端口:主机端口） |
| `--env NODE_ENV` | 环境变量 | `production`           |
| `--env PORT`     | 应用端口 | `4000`                 |

## 6. 故障排除

### 常见问题：

1. **部署失败，提示 "sealos login failed"**
   - 检查 `SEALOS_USERNAME` 和 `SEALOS_TOKEN` 密钥是否正确设置
   - 确保 Sealos API 令牌未过期
2. **部署失败，提示 "image pull failed"**
   - 检查 Docker 镜像是否成功构建并推送到 GHCR
   - 确保 GitHub Actions 有权限推送镜像到 GHCR
3. **应用启动失败**
   - 查看 Sealos 应用日志，了解具体错误信息
   - 检查环境变量设置是否正确
   - 检查应用代码是否有问题

## 7. 自定义部署配置

如果你需要修改部署配置，可以编辑 `.github/workflows/deploy.yml` 文件：

- **修改应用名称**：更改 `--name` 参数值
- **修改端口映射**：更改 `--port` 参数值
- **添加环境变量**：在 `sealos run` 命令中添加 `--env KEY=VALUE` 参数
- **修改触发条件**：更改 `on` 部分的配置

## 8. 总结

通过 GitHub Actions CI/CD 部署，你可以：

- 实现代码推送后的自动部署
- 手动触发部署
- 查看详细的部署日志
- 快速响应代码变更

这种方式比手动部署更高效、更可靠，适合团队协作和持续集成/持续部署场景。
