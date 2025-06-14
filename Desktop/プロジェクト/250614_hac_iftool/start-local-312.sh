#!/bin/bash

# =============================================================================
# ローカル開発環境起動スクリプト（Python 3.12専用）
# =============================================================================

set -e

echo "🚀 Starting InfuMatch local development environment (Python 3.12)..."

# 色付きログ関数
log_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# Python 3.12の確認
check_python_312() {
    log_info "Checking Python 3.12..."
    
    if command -v python3.12 &> /dev/null; then
        PYTHON_CMD="python3.12"
    elif python3 --version 2>&1 | grep -q "3.12"; then
        PYTHON_CMD="python3"
    else
        log_error "Python 3.12 not found. Current version:"
        python3 --version || echo "Python not found"
        exit 1
    fi
    
    log_success "Found Python 3.12: $($PYTHON_CMD --version)"
}

# 環境変数ファイルのセットアップ
setup_env_files() {
    log_info "Setting up environment files..."
    
    if [ ! -f ".env" ]; then
        cp .env.local .env
        log_success "Created .env file"
    fi
    
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/.env.local.example frontend/.env.local
        log_success "Created frontend/.env.local file"
    fi
}

# バックエンドのセットアップ
setup_backend() {
    log_info "Setting up backend with Python 3.12..."
    
    cd backend
    
    # 既存の仮想環境を削除
    if [ -d "venv" ]; then
        log_info "Removing existing virtual environment..."
        rm -rf venv
    fi
    
    # Python 3.12で仮想環境を作成
    log_info "Creating Python 3.12 virtual environment..."
    $PYTHON_CMD -m venv venv
    
    # 仮想環境の有効化
    source venv/bin/activate
    
    # Pythonバージョンの確認
    log_info "Virtual environment Python version: $(python --version)"
    
    # 依存関係のインストール
    log_info "Installing Python dependencies..."
    pip install --upgrade pip
    
    # 段階的にインストール
    log_info "Installing FastAPI and core dependencies..."
    pip install fastapi uvicorn[standard] python-dotenv
    
    log_info "Installing Pydantic..."
    pip install "pydantic>=2.5.0,<3.0.0" "pydantic-settings>=2.1.0,<3.0.0"
    
    log_info "Installing additional dependencies..."
    pip install httpx requests aiofiles jinja2 python-dateutil
    
    log_success "Backend setup completed"
    
    cd ..
}

# フロントエンドのセットアップ
setup_frontend() {
    log_info "Setting up frontend..."
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing Node.js dependencies..."
        npm install
    else
        log_info "Node.js dependencies already installed"
    fi
    
    log_success "Frontend setup completed"
    
    cd ..
}

# サーバーの起動
start_servers() {
    log_info "Starting servers..."
    
    # バックエンドの起動
    cd backend
    source venv/bin/activate
    
    log_info "Starting FastAPI server on http://localhost:8000"
    nohup python simple-main.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
    
    # フロントエンドの起動
    cd frontend
    log_info "Starting Next.js server on http://localhost:3000"
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
}

# サーバーの確認
check_servers() {
    log_info "Waiting for servers to start..."
    sleep 10
    
    # バックエンドの確認
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend is running on http://localhost:8000"
    else
        log_error "Backend failed to start. Check backend.log for details."
        cat backend.log | tail -20
    fi
    
    # フロントエンドの確認（Next.jsは起動に時間がかかる）
    log_info "Frontend is starting on http://localhost:3000 (may take a moment)"
}

# 停止スクリプトの作成
create_stop_script() {
    cat > stop-local.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping InfuMatch local development environment..."

if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ Backend stopped"
    fi
    rm backend.pid
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ Frontend stopped"
    fi
    rm frontend.pid
fi

echo "🎉 All services stopped"
EOF

    chmod +x stop-local.sh
    log_success "Created stop-local.sh script"
}

# メイン実行
main() {
    check_python_312
    setup_env_files
    setup_backend
    setup_frontend
    start_servers
    check_servers
    create_stop_script
    
    echo ""
    echo "🎉 InfuMatch local development environment is running!"
    echo ""
    echo "🔗 Access URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📋 Useful commands:"
    echo "   View backend logs: tail -f backend.log"
    echo "   View frontend logs: tail -f frontend.log"
    echo "   Stop all services: ./stop-local.sh"
    echo ""
}

main