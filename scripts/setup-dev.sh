#!/bin/bash
# 开发环境快速设置脚本
# 自动化初始化所有开发依赖和服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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

# 检查必需的命令是否存在
check_requirements() {
    print_message "检查系统要求..."
    
    local missing_tools=()
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node (v18+)")
    else
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 18 ]; then
            missing_tools+=("node (当前版本过低，需要v18+)")
        fi
    fi
    
    # 检查pnpm
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm未安装，将使用npm"
        PACKAGE_MANAGER="npm"
    else
        PACKAGE_MANAGER="pnpm"
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "缺少必需工具："
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        echo "请安装缺少的工具后重新运行此脚本。"
        exit 1
    fi
    
    print_success "系统要求检查通过"
}

# 安装项目依赖
install_dependencies() {
    print_message "安装项目依赖..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    
    print_success "依赖安装完成"
}

# 启动Docker服务
start_docker_services() {
    print_message "启动Docker服务 (PostgreSQL, Redis, MinIO)..."
    
    # 切换到Docker配置目录
    cd infra/docker
    
    # 启动服务
    if docker compose version &> /dev/null; then
        docker compose up -d database redis minio
    else
        docker-compose up -d database redis minio
    fi
    
    # 返回项目根目录
    cd ../..
    
    print_success "Docker服务启动完成"
    
    # 等待服务就绪
    print_message "等待服务启动完成..."
    sleep 10
}

# 检查Docker服务状态
check_docker_services() {
    print_message "检查Docker服务状态..."
    
    local services=("study-assistant-db" "study-assistant-redis" "study-assistant-storage")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$service.*healthy\|$service.*Up"; then
            print_success "$service 运行正常"
        else
            print_warning "$service 可能未正常启动"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = false ]; then
        print_warning "部分服务可能需要更多时间启动，请稍后检查"
    fi
}

# 初始化数据库
setup_database() {
    print_message "初始化数据库..."
    
    # 生成Prisma客户端
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run db:generate
    else
        npm run db:generate
    fi
    
    # 运行数据库迁移
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run db:migrate
    else
        npm run db:migrate
    fi
    
    # 填充种子数据
    print_message "填充测试数据..."
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run db:seed
    else
        npm run db:seed
    fi
    
    print_success "数据库初始化完成"
}

# 验证环境配置
verify_environment() {
    print_message "验证环境配置..."
    
    # 检查环境变量文件
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            print_message "创建环境变量文件..."
            cp .env.example .env.local
            print_warning "请编辑 .env.local 文件，填入你的API密钥和配置"
        else
            print_error "未找到 .env.example 文件"
            return 1
        fi
    fi
    
    # 检查关键环境变量
    source .env.local
    
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-api-key-here" ]; then
        print_warning "请在 .env.local 中设置有效的 OPENAI_API_KEY"
    fi
    
    print_success "环境配置验证完成"
}

# 创建开发目录
create_dev_directories() {
    print_message "创建开发目录..."
    
    mkdir -p logs/{api,workers,ocr}
    mkdir -p uploads/temp
    mkdir -p storage/minio
    
    print_success "开发目录创建完成"
}

# 显示启动信息
show_startup_info() {
    echo ""
    echo "🎉 开发环境设置完成！"
    echo ""
    echo "📝 接下来的步骤："
    echo "  1. 编辑 .env.local 文件，填入你的API密钥"
    echo "  2. 运行 '$PACKAGE_MANAGER run dev' 启动开发服务器"
    echo ""
    echo "🔗 服务地址："
    echo "  • Web应用:     http://localhost:3000"
    echo "  • API服务:     http://localhost:4000"
    echo "  • 数据库:      localhost:5432"
    echo "  • Redis:       localhost:6379"
    echo "  • MinIO:       http://localhost:9001 (admin/minioadmin123)"
    echo ""
    echo "🛠️ 常用命令："
    echo "  • $PACKAGE_MANAGER run dev        # 启动开发服务器"
    echo "  • $PACKAGE_MANAGER run db:studio  # 打开数据库管理界面"
    echo "  • docker-compose logs -f          # 查看Docker服务日志"
    echo ""
    echo "📚 更多信息请查看 README.md 和 CLAUDE.md"
    echo ""
}

# 主函数
main() {
    echo "🚀 Study Assistant 开发环境设置"
    echo "=================================="
    echo ""
    
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "app" ]; then
        print_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 执行设置步骤
    check_requirements
    install_dependencies
    create_dev_directories
    verify_environment
    start_docker_services
    check_docker_services
    setup_database
    show_startup_info
    
    print_success "设置完成！"
}

# 错误处理
trap 'print_error "设置过程中发生错误，请检查上面的错误信息"; exit 1' ERR

# 运行主函数
main "$@"