#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$ROOT/build"
OUT_DIR="$BUILD_DIR/re-life"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

echo "============================================"
echo "  re:life - Build"
echo "============================================"
echo ""

echo "[1/5] Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo "[2/5] Clearing build dir..."
rm -rf "$BUILD_DIR"
mkdir -p "$OUT_DIR/data"

echo "[3/5] Copying files..."
cp -r "$BACKEND_DIR/app"          "$OUT_DIR/app"
cp -r "$BACKEND_DIR/protocol"     "$OUT_DIR/protocol"
cp -r "$BACKEND_DIR/default_worlds" "$OUT_DIR/default_worlds"
cp -r "$FRONTEND_DIR/dist"        "$OUT_DIR/dist"
cp    "$BACKEND_DIR/requirements.txt" "$OUT_DIR/requirements.txt"
cp    "$BACKEND_DIR/run.py"       "$OUT_DIR/run.py"

echo "[4/5] Creating README + start scripts..."

cat > "$OUT_DIR/README.md" << 'READMEEOF'
# re:life

## 系统要求
- Python 3.10 或更高版本
- Windows 10+ / macOS / Linux

## 快速开始

### Windows
1. 双击 start.bat 启动
2. 首次启动会自动安装依赖（仅一次，约 1 分钟）
3. 浏览器自动打开 http://localhost:8000
4. 在 Settings 页面填写 API Key / Base URL / Model
5. 在 Game 页面开始游戏

### macOS / Linux
1. 终端运行 `chmod +x start.sh && ./start.sh`
2. 首次启动会自动安装依赖（仅一次，约 1 分钟）
3. 浏览器自动打开 http://localhost:8000
4. 在 Settings 页面填写 API Key / Base URL / Model
5. 在 Game 页面开始游戏

## 常见问题

### pip 安装太慢或失败？
使用清华镜像：
```
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 需要代理访问 API？
启动前设置环境变量：
```bash
# Windows (CMD)
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890

# macOS / Linux (Shell)
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
```
然后照常运行启动脚本。

## 数据
所有存档保存在 data/ 目录下。删除 data/ 文件夹可重置所有数据。
READMEEOF

cat > "$OUT_DIR/start.sh" << 'SHSTARTEOF'
#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f ".venv/bin/python" ]; then
    echo "Setting up environment..."
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi

echo "Starting re:life..."
echo "Open http://localhost:8000 in your browser."

if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:8000 2>/dev/null &
elif command -v open &>/dev/null; then
    open http://localhost:8000 2>/dev/null &
fi

.venv/bin/python run.py
SHSTARTEOF

cat > "$OUT_DIR/start.bat" << 'BATSTARTEOF'
@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Setting up environment...
  python -m venv .venv
  .venv\Scripts\pip install -r requirements.txt
)
start "" http://localhost:8000
.venv\Scripts\python run.py
BATSTARTEOF

chmod +x "$OUT_DIR/start.sh"

echo "[5/5] Creating ZIP..."
cd "$BUILD_DIR"
zip -r "re-life.zip" "re-life"

echo ""
echo "============================================"
echo "  Build complete: build/re-life.zip"
echo "============================================"
