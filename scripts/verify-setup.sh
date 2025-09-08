#!/bin/bash
# 验证开发环境设置脚本
# 检查所有服务是否正常运行

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查Docker服务状态
check_docker_services() {
    echo "🐳 检查Docker服务状态..."
    echo ""
    
    local services=("study-assistant-db:PostgreSQL" "study-assistant-redis:Redis" "study-assistant-storage:MinIO")
    local all_healthy=true
    
    for service_info in "${services[@]}"; do
        local container_name="${service_info%%:*}"
        local service_name="${service_info##*:}"
        
        if docker ps --format "{{.Names}} {{.Status}}" | grep -q "$container_name.*healthy\|$container_name.*Up"; then
            print_success "$service_name ($container_name) 运行正常"
        else
            print_error "$service_name ($container_name) 未运行或不健康"
            all_healthy=false
        fi
    done
    
    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

# 检查数据库连接
check_database() {
    echo ""
    echo "🗄️  检查数据库连接..."
    
    if docker exec study-assistant-db pg_isready -U postgres -q; then
        print_success "PostgreSQL 连接正常"
        
        # 检查数据库是否存在
        if docker exec study-assistant-db psql -U postgres -lqt | cut -d \| -f 1 | grep -qw study_assistant; then
            print_success "数据库 'study_assistant' 存在"
        else
            print_error "数据库 'study_assistant' 不存在"
            return 1
        fi
        
        # 检查pgvector扩展
        local vector_enabled=$(docker exec study-assistant-db psql -U postgres -d study_assistant -tAc "SELECT COUNT(*) FROM pg_extension WHERE extname='vector'")
        if [ "$vector_enabled" -eq 1 ]; then
            print_success "pgvector 扩展已启用"
        else
            print_warning "pgvector 扩展未启用"
        fi
        
        # 检查表是否存在
        local table_count=$(docker exec study-assistant-db psql -U postgres -d study_assistant -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
        if [ "$table_count" -gt 0 ]; then
            print_success "数据库表已创建 ($table_count 个表)"
        else
            print_warning "数据库表未创建"
        fi
        
    else
        print_error "无法连接到PostgreSQL"
        return 1
    fi
}

# 检查Redis连接
check_redis() {
    echo ""
    echo "🔴 检查Redis连接..."
    
    if docker exec study-assistant-redis redis-cli ping | grep -q PONG; then
        print_success "Redis 连接正常"
    else
        print_error "无法连接到Redis"
        return 1
    fi
}

# 检查MinIO连接
check_minio() {
    echo ""
    echo "📦 检查MinIO服务..."
    
    # 检查MinIO健康状态
    if curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; then
        print_success "MinIO API 连接正常"
    else
        print_warning "MinIO API 连接失败，但容器可能仍在启动中"
    fi
    
    print_info "MinIO Web控制台: http://localhost:9001"
    print_info "用户名: minioadmin, 密码: minioadmin123"
}

# 检查环境变量
check_environment() {
    echo ""
    echo "⚙️  检查环境配置..."
    
    if [ -f ".env.local" ]; then
        print_success "环境配置文件 .env.local 存在"
        
        source .env.local
        
        if [ -n "$DATABASE_URL" ]; then
            print_success "DATABASE_URL 已配置"
        else
            print_error "DATABASE_URL 未配置"
        fi
        
        if [ -n "$REDIS_URL" ]; then
            print_success "REDIS_URL 已配置"
        else
            print_error "REDIS_URL 未配置"
        fi
        
        if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "sk-your-openai-api-key-here" ]; then
            print_success "OPENAI_API_KEY 已配置"
        else
            print_warning "OPENAI_API_KEY 需要设置有效值"
        fi
        
    else
        print_error "环境配置文件 .env.local 不存在"
        return 1
    fi
}

# 检查项目依赖
check_dependencies() {
    echo ""
    echo "📦 检查项目依赖..."
    
    if [ -d "node_modules" ]; then
        print_success "Node.js 依赖已安装"
    else
        print_error "Node.js 依赖未安装，请运行 pnpm install"
        return 1
    fi
    
    if [ -d "node_modules/.pnpm" ]; then
        print_success "使用 pnpm 包管理器"
    else
        print_info "使用 npm 包管理器"
    fi
}

# 显示启动命令
show_next_steps() {
    echo ""
    echo "🚀 环境验证完成！下一步:"
    echo ""
    echo "启动开发服务器:"
    echo "  pnpm run dev"
    echo ""
    echo "其他有用命令:"
    echo "  pnpm run db:studio     # 打开数据库管理界面"
    echo "  docker-compose logs -f # 查看服务日志"
    echo "  ./scripts/verify-setup.sh # 重新验证环境"
    echo ""
    echo "服务地址:"
    echo "  • PostgreSQL:   localhost:5432"
    echo "  • Redis:        localhost:6379"
    echo "  • MinIO Web:    http://localhost:9001"
    echo ""
}

# 主函数
main() {
    echo "🔍 Study Assistant 环境验证"
    echo "=========================="
    
    local all_checks_passed=true
    
    # 运行所有检查
    check_docker_services || all_checks_passed=false
    check_database || all_checks_passed=false
    check_redis || all_checks_passed=false
    check_minio || all_checks_passed=false
    check_environment || all_checks_passed=false
    check_dependencies || all_checks_passed=false
    
    echo ""
    if [ "$all_checks_passed" = true ]; then
        print_success "所有检查通过！开发环境已就绪"
        show_next_steps
    else
        print_error "部分检查失败，请解决上述问题后重试"
        echo ""
        echo "常见解决方案:"
        echo "• 确保Docker Desktop正在运行"
        echo "• 运行 ./scripts/start-services.sh 启动服务"
        echo "• 编辑 .env.local 设置API密钥"
        exit 1
    fi
}

# 运行验证
main "$@"