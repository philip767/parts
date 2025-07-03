#!/bin/bash

# PARTSCONTROL 部署脚本
# 使用方法: ./deploy.sh [dev|prod]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
ENV=${1:-dev}
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    log_error "无效的环境参数: $ENV"
    log_error "使用方法: $0 [dev|prod]"
    exit 1
fi

log_info "开始部署 PARTSCONTROL 到 $ENV 环境..."

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose 未安装"
    exit 1
fi

# 检查环境变量文件
if [[ "$ENV" == "prod" ]]; then
    if [[ ! -f ".env" ]]; then
        log_error "生产环境需要 .env 文件"
        log_info "请复制 env.example 为 .env 并配置相应的环境变量"
        exit 1
    fi
fi

# 停止现有容器
log_info "停止现有容器..."
docker-compose down --remove-orphans

# 清理旧镜像（可选）
if [[ "$ENV" == "prod" ]]; then
    log_info "清理旧镜像..."
    docker system prune -f
fi

# 构建和启动服务
log_info "构建和启动服务..."
if [[ "$ENV" == "dev" ]]; then
    docker-compose -f docker-compose.yml up --build -d
else
    docker-compose -f docker-compose.yml up --build -d
fi

# 等待服务启动
log_info "等待服务启动..."
sleep 30

# 检查服务状态
log_info "检查服务状态..."
docker-compose ps

# 检查健康状态
log_info "检查健康状态..."
for i in {1..10}; do
    if curl -f http://localhost:3001/health &> /dev/null; then
        log_info "应用健康检查通过"
        break
    else
        log_warn "等待应用启动... ($i/10)"
        sleep 10
    fi
done

# 数据库迁移（如果需要）
log_info "检查数据库连接..."
if docker-compose exec -T app node -e "
const db = require('./backend/src/models');
db.sequelize.authenticate()
  .then(() => {
    console.log('数据库连接成功');
    process.exit(0);
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  });
" &> /dev/null; then
    log_info "数据库连接成功"
else
    log_error "数据库连接失败"
    exit 1
fi

# 显示访问信息
log_info "部署完成！"
log_info "应用地址: http://localhost:3001"
log_info "健康检查: http://localhost:3001/health"
log_info "查看日志: docker-compose logs -f app"

# 显示容器状态
docker-compose ps 