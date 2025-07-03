# PARTSCONTROL - 零件缺货订货管理系统

一个现代化的零件缺货订货管理系统，具备订单管理、库存监控、报价管理、智能备忘录等核心功能。

## 🚀 功能特性

### 核心功能
- **订单管理**: 上传、编辑、删除订单，支持软删除和回收站
- **库存监控**: 实时库存查询，自动监控库存变化，邮件通知
- **报价管理**: 历史报价上传、查询和应用，批量报价处理
- **智能备忘录**: AI驱动的自然语言解析，自动添加零件到订单
- **用户管理**: 用户注册/登录，管理员后台，权限控制

### 技术特性
- **现代化架构**: React + TypeScript + Node.js + Express
- **AI集成**: Google Gemini API 智能解析
- **实时通知**: 邮件通知系统
- **性能优化**: 缓存机制、数据库索引优化
- **安全防护**: API限流、JWT认证、输入验证
- **容器化部署**: Docker + Docker Compose

## 📋 系统要求

- Node.js 18+
- MySQL 8.0+ 或 PostgreSQL 12+
- Redis 6+ (可选，用于缓存)
- Docker & Docker Compose (推荐)

## 🛠️ 快速开始

### 方法一：使用 Docker (推荐)

1. **克隆项目**
```bash
git clone <repository-url>
cd PARTSCONTROL
```

2. **配置环境变量**
```bash
cp env.example .env
# 编辑 .env 文件，配置数据库、邮件等参数
```

3. **启动服务**
```bash
# 开发环境
./deploy.sh dev

# 生产环境
./deploy.sh prod
```

4. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:3001
- 健康检查: http://localhost:3001/health

### 方法二：本地开发

1. **安装依赖**
```bash
# 前端
cd 前端
npm install

# 后端
cd 后端
npm install
```

2. **配置环境变量**
```bash
# 后端
cd 后端
cp env.example .env
# 编辑 .env 文件

# 前端
cd 前端
cp env.example .env.local
# 编辑 .env.local 文件
```

3. **启动服务**
```bash
# 后端 (端口 3001)
cd 后端
npm run dev

# 前端 (端口 3000)
cd 前端
npm run dev
```

## 📁 项目结构

```
PARTSCONTROL/
├── 前端/                    # React 前端应用
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── types.ts         # TypeScript 类型定义
│   │   ├── apiClient.ts     # API 客户端
│   │   └── constants.ts     # 常量定义
│   └── package.json
├── 后端/                    # Node.js 后端应用
│   ├── src/
│   │   ├── api/            # API 路由
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务服务
│   │   └── config/         # 配置文件
│   └── package.json
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker Compose 配置
├── deploy.sh              # 部署脚本
└── README.md              # 项目文档
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_NAME` | 数据库名称 | partcontrol |
| `DB_USER` | 数据库用户 | partcontrol |
| `DB_PASSWORD` | 数据库密码 | partcontrol123 |
| `JWT_SECRET` | JWT密钥 | your-secret-key |
| `MAIL_HOST` | 邮件服务器 | smtp.gmail.com |
| `GEMINI_API_KEY` | Gemini API密钥 | - |

### 数据库配置

系统支持 MySQL 和 PostgreSQL，默认使用 MySQL。如需使用 PostgreSQL，请修改 `后端/src/config/db.config.js` 文件。

## 🚀 部署

### 生产环境部署

1. **准备服务器**
```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

2. **部署应用**
```bash
git clone <repository-url>
cd PARTSCONTROL
cp env.example .env
# 编辑 .env 文件
./deploy.sh prod
```

3. **配置反向代理 (可选)**
```bash
# 使用 Nginx 作为反向代理
sudo apt install nginx
# 配置 Nginx 指向 localhost:3001
```

### 监控和维护

- **查看日志**: `docker-compose logs -f app`
- **健康检查**: `curl http://localhost:3001/health`
- **数据库备份**: `docker-compose exec mysql mysqldump -u root -p partcontrol > backup.sql`
- **更新应用**: `git pull && ./deploy.sh prod`

## 🔒 安全特性

- **API限流**: 防止暴力攻击
- **JWT认证**: 安全的用户认证
- **输入验证**: 防止SQL注入和XSS攻击
- **CORS配置**: 跨域请求控制
- **日志记录**: 完整的操作审计

## 📊 性能优化

- **数据库索引**: 优化查询性能
- **API缓存**: 减少数据库查询
- **代码分割**: 优化前端加载
- **图片压缩**: 减少传输大小
- **懒加载**: 提升用户体验

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 基础订单管理功能
- 库存监控系统
- 用户认证系统

### v1.1.0 (2024-01-15)
- 添加报价管理功能
- 智能备忘录系统
- 性能优化
- 安全增强

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 联系开发团队

---

**PARTSCONTROL** - 让零件管理更简单、更智能！ # parts
