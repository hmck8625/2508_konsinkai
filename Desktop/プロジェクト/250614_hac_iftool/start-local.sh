#!/bin/bash

# =============================================================================
# ローカル開発環境起動スクリプト
# =============================================================================

set -e

echo "🚀 Starting InfuMatch local development environment..."

# 現在のディレクトリを保存
ORIGINAL_DIR=$(pwd)

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

# 前提条件のチェック
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Node.js のチェック
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
    
    # Python のチェック
    if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
        log_error "Python is not installed. Please install Python 3.11 or higher."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# 環境変数ファイルのセットアップ
setup_env_files() {
    log_info "Setting up environment files..."
    
    # バックエンド用
    if [ ! -f ".env" ]; then
        cp .env.local .env
        log_success "Created .env file"
    else
        log_info ".env file already exists"
    fi
    
    # フロントエンド用
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/.env.local.example frontend/.env.local
        log_success "Created frontend/.env.local file"
    else
        log_info "frontend/.env.local file already exists"
    fi
}

# バックエンドのセットアップと起動
start_backend() {
    log_info "Setting up and starting backend..."
    
    cd backend
    
    # 仮想環境の作成（存在しない場合）
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # 仮想環境の有効化
    source venv/bin/activate
    
    # 依存関係のインストール
    log_info "Installing Python dependencies..."
    pip install --upgrade pip
    
    # 最小限の依存関係を優先的にインストール
    if [ -f "requirements-minimal.txt" ]; then
        log_info "Using minimal requirements for faster setup..."
        pip install -r requirements-minimal.txt
    else
        pip install -r requirements.txt
    fi
    
    log_success "Backend setup completed"
    log_info "Starting FastAPI server on http://localhost:8000"
    
    # バックグラウンドでサーバー起動
    nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
}

# フロントエンドのセットアップと起動
start_frontend() {
    log_info "Setting up and starting frontend..."
    
    cd frontend
    
    # 依存関係のインストール
    log_info "Installing Node.js dependencies..."
    npm install
    
    log_success "Frontend setup completed"
    log_info "Starting Next.js server on http://localhost:3000"
    
    # バックグラウンドでサーバー起動
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
}

# サーバーの起動確認
check_servers() {
    log_info "Waiting for servers to start..."
    sleep 5
    
    # バックエンドの確認
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend is running on http://localhost:8000"
    else
        log_error "Backend failed to start. Check backend.log for details."
    fi
    
    # フロントエンドの確認
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend is running on http://localhost:3000"
    else
        log_info "Frontend is starting... (may take a moment)"
    fi
}

# 停止スクリプトの作成
create_stop_script() {
    cat > stop-local.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping InfuMatch local development environment..."

# PIDファイルからプロセスを停止
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
    check_prerequisites
    setup_env_files
    start_backend
    start_frontend
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
    echo "Press Ctrl+C to view this information again, or run ./stop-local.sh to stop all services"
}

# スクリプト実行
main

# Ctrl+C でサービス停止
trap 'echo ""; echo "To stop services, run: ./stop-local.sh"; exit 0' INT

# ログ監視（オプション）
echo "📊 Monitoring logs (Press Ctrl+C to exit)..."
tail -f backend.log frontend.log 2>/dev/null || echo "Logs will appear here as services generate them..."