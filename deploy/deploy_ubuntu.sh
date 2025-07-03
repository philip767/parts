#!/bin/bash
set -e

# 1. 安装 Docker 和 Docker Compose
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
sudo add-apt-repository "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# 安装 docker compose plugin
sudo apt install -y docker-compose-plugin

# 2. 启动服务
sudo docker compose up -d --build

echo "\n🎉 部署完成！"
echo "访问前端: http://<你的服务器IP>"
echo "API健康检查: http://<你的服务器IP>/api/health"
echo "MySQL用户名: partcontrol  密码: partcontrolpw  数据库: partcontrol"
echo "如需自定义配置，请修改 .env 文件和 docker-compose.yml 后重启服务。" 