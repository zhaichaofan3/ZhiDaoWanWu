@echo off
chcp 65001 >nul

REM 自动化部署脚本 - 部署到 Sealos 集群

echo =====================================
echo 开始部署到 Sealos 集群
echo =====================================

REM 检查 Docker 是否安装
echo 检查 Docker 环境...
docker --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Docker 已安装
) else (
    echo 错误: Docker 未安装或不可用
    echo 请先安装 Docker 后再运行此脚本
    exit /b 1
)

REM 检查 Docker 服务是否运行
echo 检查 Docker 服务状态...
docker info >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Docker 服务正在运行
) else (
    echo 错误: Docker 服务未运行
    echo 请启动 Docker 服务后再运行此脚本
    exit /b 1
)

REM 构建 Docker 镜像
echo =====================================
echo 构建 Docker 镜像...

set imageName=campus-second-hand-market:latest
docker build -t %imageName% .
if %ERRORLEVEL% neq 0 (
    echo 错误: 构建 Docker 镜像失败
    exit /b 1
)
echo Docker 镜像构建成功: %imageName%

REM 配置 kubeconfig
echo =====================================
echo 配置 Kubernetes 集群连接...

if exist "kubeconfig.yaml" (
    set KUBECONFIG=kubeconfig.yaml
    echo 已设置 KUBECONFIG 环境变量为: kubeconfig.yaml
    
    REM 测试集群连接
    kubectl cluster-info >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo 集群连接测试成功
    ) else (
        echo 警告: 集群连接测试失败，可能需要登录 Sealos
        echo 请确保已正确配置 kubeconfig.yaml 文件
    )
) else (
    echo 错误: kubeconfig.yaml 文件不存在
    echo 请确保 kubeconfig.yaml 文件在当前目录
    exit /b 1
)

REM 部署应用到 Kubernetes
echo =====================================
echo 部署应用到 Kubernetes...

if exist "shiwushe.yaml" (
    kubectl apply -f shiwushe.yaml
    if %ERRORLEVEL% neq 0 (
        echo 错误: 部署应用失败
        exit /b 1
    )
    echo 应用部署成功
) else (
    echo 错误: shiwushe.yaml 文件不存在
    echo 请确保 shiwushe.yaml 文件在当前目录
    exit /b 1
)

REM 检查部署状态
echo =====================================
echo 检查部署状态...

kubectl get pods
echo.
kubectl get services
echo.
kubectl get ingresses
echo 部署状态检查完成

echo =====================================
echo 部署完成！
echo =====================================
echo 应用已部署到 Sealos 集群
echo 请通过以下步骤访问应用：
echo 1. 登录 Sealos 控制台
echo 2. 导航到应用管理
echo 3. 找到部署的应用
echo 4. 查看应用的访问地址
echo =====================================
