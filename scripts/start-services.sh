#!/bin/bash
# 启动开发服务脚本
# 仅启动Docker服务，不重复安装依赖

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查Docker状态
check_docker() {
    print_message "检查Docker状态..."
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker未运行，请启动Docker Desktop"
        exit 1
    fi
    
    print_success "Docker运行正常"
}

# 启动Docker服务
start_services() {
    print_message "启动Docker服务..."
    
    cd infra/docker
    
    # 启动核心服务
    if docker compose version &> /dev/null; then
        docker compose up -d database redis minio
    else
        docker-compose up -d database redis minio
    fi
    
    cd ../..
    print_success "服务启动命令已执行"
}

# 等待服务就绪
wait_for_services() {
    print_message "等待服务启动完成..."
    
    # 等待PostgreSQL
    local retries=0
    while [ $retries -lt 30 ]; do
        if docker exec study-assistant-db pg_isready -U postgres >/dev/null 2>&1; then
            print_success "PostgreSQL 已就绪"
            break
        fi
        echo -n "."
        sleep 2
        ((retries++))
    done
    
    if [ $retries -eq 30 ]; then
        print_warning "PostgreSQL 启动可能需要更多时间"
    fi
    
    # 等待Redis
    retries=0
    while [ $retries -lt 10 ]; do
        if docker exec study-assistant-redis redis-cli ping >/dev/null 2>&1; then
            print_success "Redis 已就绪"
            break
        fi
        echo -n "."
        sleep 2
        ((retries++))
    done
    
    if [ $retries -eq 10 ]; then
        print_warning "Redis 启动可能需要更多时间"
    fi
    
    # 检查MinIO
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "study-assistant-storage.*Up"; then
        print_success "MinIO 已启动"
    else
        print_warning "MinIO 可能需要更多时间启动"
    fi
}

# 初始化数据库
setup_database() {
    print_message "检查数据库状态..."
    
    # 检查是否需要运行迁移
    if [ ! -f "packages/db/prisma/migrations" ] || [ -z "$(ls -A packages/db/prisma/migrations 2>/dev/null)" ]; then
        print_message "运行数据库迁移..."
        pnpm run db:migrate
        
        print_message "填充种子数据..."
        pnpm run db:seed
    else
        print_message "生成Prisma客户端..."
        pnpm run db:generate
    fi
    
    print_success "数据库设置完成"
}

# 显示服务状态
show_status() {
    echo ""
    print_success "服务启动完成！"
    echo ""
    echo "🔗 服务地址："
    echo "  • PostgreSQL:  localhost:5432"
    echo "  • Redis:       localhost:6379" 
    echo "  • MinIO Web:   http://localhost:9001"
    echo "    用户名: minioadmin"
    echo "    密码: minioadmin123"
    echo ""
    echo "🚀 启动开发服务器："
    echo "  pnpm run dev"
    echo ""
    echo "📊 查看服务状态："
    echo "  docker ps"
    echo ""
}

# 主函数
main() {
    echo "🚀 启动Study Assistant开发服务"
    echo "================================"
    echo ""
    
    check_docker
    start_services
    wait_for_services
    setup_database
    show_status
}

# 执行
main "$@"