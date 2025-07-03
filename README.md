# PARTSCONTROL

## 项目简介

PARTSCONTROL 是一个基于 React + Node.js + TypeScript + MySQL 的现代化零件管理系统，支持订单、库存、用户、智能备忘录等功能，前后端分离，支持一键部署。

---

## 目录结构

```
PARTSCONTROL/
├── backend/                # 后端服务 (Node.js + Express + TypeScript)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # 前端应用 (React + Vite + TypeScript)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── deploy/                 # 部署相关
│   ├── nginx.conf
│   └── deploy_ubuntu.sh
├── docker-compose.yml      # 一键部署编排
├── Dockerfile.backend      # 后端镜像构建
├── Dockerfile.frontend     # 前端镜像构建
└── README.md
```

---

## 本地开发

### 1. 启动数据库 (推荐 Docker)
```bash
docker run --name partcontrol-mysql -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=partcontrol -e MYSQL_USER=partcontrol -e MYSQL_PASSWORD=partcontrolpw -p 3306:3306 -d mysql:8.0 --default-authentication-plugin=mysql_native_password
```

### 2. 启动后端
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
```

前端访问：http://localhost:5173  
后端API：http://localhost:3000/api/health

---

## 一键部署（Ubuntu 22.04）

1. 上传完整项目到服务器
2. 进入项目根目录，执行：

```bash
chmod +x deploy/deploy_ubuntu.sh
./deploy/deploy_ubuntu.sh
```

3. 部署完成后，访问：
- http://你的服务器IP
- http://你的服务器IP/api/health

---

## 生产环境说明
- 默认数据库用户名：partcontrol  密码：partcontrolpw
- 如需自定义配置，请修改 .env 文件和 docker-compose.yml
- 推荐使用 Nginx 反向代理，已内置配置
- 支持 Docker 一键部署，安全高效

---

## 技术栈
- 前端：React 18, TypeScript, Vite
- 后端：Node.js 18, Express, TypeScript, Sequelize
- 数据库：MySQL 8
- 部署：Docker, Nginx

---

## 贡献与支持
如需定制开发、功能扩展或遇到问题，欢迎联系作者或提交 issue。
