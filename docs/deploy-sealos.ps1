#!/usr/bin/env pwsh

# 自动化部署脚本 - 部署到 Sealos 集群

# 颜色输出函数
function Write-Color {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-Color "=====================================" "Green"
Write-Color "开始部署到 Sealos 集群" "Green"
Write-Color "=====================================" "Green"

# 检查 Docker 是否安装
Write-Color "检查 Docker 环境..." "Yellow"
try {
    docker --version | Out-Null
    Write-Color "Docker 已安装" "Green"
} catch {
    Write-Color "错误: Docker 未安装或不可用" "Red"
    Write-Color "请先安装 Docker 后再运行此脚本" "Red"
    exit 1
}

# 检查 Docker 服务是否运行
Write-Color "检查 Docker 服务状态..." "Yellow"
try {
    docker info | Out-Null
    Write-Color "Docker 服务正在运行" "Green"
} catch {
    Write-Color "错误: Docker 服务未运行" "Red"
    Write-Color "请启动 Docker 服务后再运行此脚本" "Red"
    exit 1
}

# 构建 Docker 镜像
Write-Color "=====================================" "Green"
Write-Color "构建 Docker 镜像..." "Yellow"

try {
    $imageName = "campus-second-hand-market:latest"
    docker build -t $imageName .
    if ($LASTEXITCODE -ne 0) {
        throw "构建失败"
    }
    Write-Color "Docker 镜像构建成功: $imageName" "Green"
} catch {
    Write-Color "错误: 构建 Docker 镜像失败" "Red"
    Write-Color $_.Exception.Message "Red"
    exit 1
}

# 检查 kubectl 是否安装
Write-Color "=====================================" "Green"
Write-Color "检查 kubectl 环境..." "Yellow"
try {
    kubectl --version | Out-Null
    Write-Color "kubectl 已安装" "Green"
} catch {
    Write-Color "警告: kubectl 未安装，将尝试配置环境变量" "Yellow"
}

# 检查 sealos 是否安装
Write-Color "检查 sealos 环境..." "Yellow"
try {
    sealos --version | Out-Null
    Write-Color "sealos 已安装" "Green"
} catch {
    Write-Color "警告: sealos 未安装，将尝试配置环境变量" "Yellow"
}

# 配置 kubeconfig
Write-Color "=====================================" "Green"
Write-Color "配置 Kubernetes 集群连接..." "Yellow"

if (Test-Path "kubeconfig.yaml") {
    $env:KUBECONFIG = "kubeconfig.yaml"
    Write-Color "已设置 KUBECONFIG 环境变量为: kubeconfig.yaml" "Green"
    
    # 测试集群连接
    try {
        kubectl cluster-info | Out-Null
        Write-Color "集群连接测试成功" "Green"
    } catch {
        Write-Color "警告: 集群连接测试失败，可能需要登录 Sealos" "Yellow"
        Write-Color "请确保已正确配置 kubeconfig.yaml 文件" "Yellow"
    }
} else {
    Write-Color "错误: kubeconfig.yaml 文件不存在" "Red"
    Write-Color "请确保 kubeconfig.yaml 文件在当前目录" "Red"
    exit 1
}

# 部署应用到 Kubernetes
Write-Color "=====================================" "Green"
Write-Color "部署应用到 Kubernetes..." "Yellow"

try {
    if (Test-Path "shiwushe.yaml") {
        kubectl apply -f shiwushe.yaml
        if ($LASTEXITCODE -ne 0) {
            throw "部署失败"
        }
        Write-Color "应用部署成功" "Green"
    } else {
        Write-Color "错误: shiwushe.yaml 文件不存在" "Red"
        Write-Color "请确保 shiwushe.yaml 文件在当前目录" "Red"
        exit 1
    }
} catch {
    Write-Color "错误: 部署应用失败" "Red"
    Write-Color $_.Exception.Message "Red"
    exit 1
}

# 检查部署状态
Write-Color "=====================================" "Green"
Write-Color "检查部署状态..." "Yellow"

try {
    kubectl get pods
    kubectl get services
    kubectl get ingresses
    Write-Color "部署状态检查完成" "Green"
} catch {
    Write-Color "警告: 检查部署状态失败" "Yellow"
    Write-Color $_.Exception.Message "Yellow"
}

Write-Color "=====================================" "Green"
Write-Color "部署完成！" "Green"
Write-Color "=====================================" "Green"
Write-Color "应用已部署到 Sealos 集群" "Green"
Write-Color "请通过以下步骤访问应用：" "Yellow"
Write-Color "1. 登录 Sealos 控制台" "Yellow"
Write-Color "2. 导航到应用管理" "Yellow"
Write-Color "3. 找到部署的应用" "Yellow"
Write-Color "4. 查看应用的访问地址" "Yellow"
Write-Color "=====================================" "Green"
