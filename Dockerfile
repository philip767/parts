# 多阶段构建 - 前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY 前端/package*.json ./

# 安装前端依赖
RUN npm ci --only=production

# 复制前端源代码
COPY 前端/ ./

# 构建前端应用
RUN npm run build

# 多阶段构建 - 后端
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制后端依赖文件
COPY 后端/package*.json ./

# 安装后端依赖
RUN npm ci --only=production

# 复制后端源代码
COPY 后端/ ./

# 生产环境镜像
FROM node:18-alpine AS production

# 安装必要的系统包
RUN apk add --no-cache dumb-init

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# 复制构建好的前端文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 复制后端文件
COPY --from=backend-builder /app/backend ./backend

# 创建必要的目录
RUN mkdir -p /app/backend/logs /app/backend/uploads

# 设置权限
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/src/server.js"] 