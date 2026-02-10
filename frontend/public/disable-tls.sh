#!/bin/bash
# MetricFrame — Disable HTTPS
# Run this to remove TLS encryption from an existing MetricFrame installation.
#
# Usage:
#   curl -fsSL https://get.metricframe.ai/disable-tls.sh | bash
#   OR
#   ./disable-tls.sh [install_directory]

set -euo pipefail

INSTALL_DIR="${1:-${METRICFRAME_HOME:-$HOME/metricframe}}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "============================================"
echo "  MetricFrame — Disable HTTPS"
echo "============================================"
echo ""

# Verify install directory
if [ ! -f "$INSTALL_DIR/docker-compose.yml" ]; then
    error "MetricFrame installation not found at $INSTALL_DIR. Pass the install directory as an argument."
fi

info "Install directory: $INSTALL_DIR"
cd "$INSTALL_DIR"

# Check if TLS is actually enabled
if [ ! -f "docker-compose.override.yml" ] && [ ! -f "nginx-tls.conf" ]; then
    warn "HTTPS does not appear to be enabled."
    echo "  MetricFrame is already running on plain HTTP."
    exit 0
fi

# Remove TLS configuration files
info "Removing HTTPS configuration..."

if [ -f "docker-compose.override.yml" ]; then
    rm -f docker-compose.override.yml
    success "Removed docker-compose.override.yml"
fi

if [ -f "nginx-tls.conf" ]; then
    rm -f nginx-tls.conf
    success "Removed nginx-tls.conf"
fi

# Optionally remove certificates
if [ -d "certs" ] && [ -t 0 ]; then
    echo ""
    read -p "  Also remove TLS certificates? (can be regenerated later) [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf certs
        success "Removed certificates"
    else
        info "Keeping certificates in certs/ (can be reused by enable-tls.sh)"
    fi
fi

# Restart containers
info "Restarting MetricFrame without HTTPS..."
docker compose down
docker compose up -d

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  HTTPS has been disabled${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Open your browser to: http://localhost:3000"
echo ""
echo "  To re-enable HTTPS later:"
echo "    curl -fsSL https://get.metricframe.ai/enable-tls.sh | bash"
echo ""
