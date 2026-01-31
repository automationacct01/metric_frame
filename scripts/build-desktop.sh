#!/bin/bash
# MetricFrame Desktop App Build Script
#
# This script builds the desktop application for all platforms.
# Prerequisites:
#   - Node.js 18+
#   - Python 3.11+
#   - PyInstaller (pip install pyinstaller)
#
# Usage:
#   ./scripts/build-desktop.sh          # Build for current platform
#   ./scripts/build-desktop.sh --all    # Build for all platforms
#   ./scripts/build-desktop.sh --mac    # Build for macOS only
#   ./scripts/build-desktop.sh --win    # Build for Windows only
#   ./scripts/build-desktop.sh --linux  # Build for Linux only

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================"
echo "  MetricFrame Desktop Build"
echo "============================================"
echo ""
echo "Project root: $PROJECT_ROOT"
echo ""

# Parse arguments
BUILD_TARGET="${1:---current}"

# Step 1: Build Frontend
echo "Step 1/4: Building frontend..."
cd "$PROJECT_ROOT/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Set API URL for desktop (localhost backend)
export VITE_API_BASE_URL="http://127.0.0.1:8000/api/v1"

# Build
npm run build
echo "✓ Frontend built to frontend/dist/"
echo ""

# Step 2: Bundle Python Backend with PyInstaller
echo "Step 2/4: Bundling Python backend..."
cd "$PROJECT_ROOT/backend"

# Create virtual environment if needed
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate venv and install dependencies
source .venv/bin/activate

# Install dependencies
pip install -q -r requirements.txt
pip install -q pyinstaller

# Create PyInstaller spec file
cat > metricframe.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None

# Get the project root
project_root = Path(SPECPATH)

a = Analysis(
    ['src/main.py'],
    pathex=[str(project_root)],
    binaries=[],
    datas=[
        ('src/data', 'src/data'),
        ('src/seeds', 'src/seeds'),
        ('alembic', 'alembic'),
        ('alembic.ini', '.'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.dialects.postgresql',
        'anthropic',
        'openai',
        'together',
        'boto3',
        'google.generativeai',
        'azure.identity',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='metricframe-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='metricframe-backend',
)
EOF

# Run PyInstaller
pyinstaller --clean --noconfirm metricframe.spec

# Move output to expected location
rm -rf "$PROJECT_ROOT/backend-dist"
mv dist/metricframe-backend "$PROJECT_ROOT/backend-dist"

deactivate
echo "✓ Backend bundled to backend-dist/"
echo ""

# Step 3: Install Electron dependencies
echo "Step 3/4: Preparing Electron..."
cd "$PROJECT_ROOT/desktop"

if [ ! -d "node_modules" ]; then
    echo "Installing Electron dependencies..."
    npm install
fi
echo "✓ Electron dependencies ready"
echo ""

# Step 4: Build Electron app
echo "Step 4/4: Building Electron app..."

case "$BUILD_TARGET" in
    --all)
        npm run dist
        ;;
    --mac)
        npm run build:mac
        ;;
    --win)
        npm run build:win
        ;;
    --linux)
        npm run build:linux
        ;;
    *)
        npm run build
        ;;
esac

echo ""
echo "============================================"
echo "  Build Complete!"
echo "============================================"
echo ""
echo "Installers are in: desktop/release/"
ls -la "$PROJECT_ROOT/desktop/release/" 2>/dev/null || echo "(No release files yet)"
echo ""
