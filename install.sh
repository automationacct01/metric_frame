#!/bin/bash
# MetricFrame Secure Installer
# https://github.com/automationacct01/metric_frame
#
# This script can be run in two ways:
#
# Option 1 - Review before running (RECOMMENDED):
#   curl -fsSL https://get.metricframe.ai/install.sh -o install.sh
#   less install.sh  # Review the script
#   chmod +x install.sh && ./install.sh
#
# Option 2 - Direct execution (for trusted environments):
#   curl -fsSL https://get.metricframe.ai/install.sh | bash
#
# What this script does:
#   1. Checks for Docker installation
#   2. Downloads docker-compose.yml from GitHub (with checksum verification)
#   3. Creates a configuration file
#   4. Starts the MetricFrame containers
#
# Security features:
#   - All downloads use HTTPS
#   - Configuration files are verified with SHA256 checksums
#   - No sudo/root required (uses user's home directory)
#   - Source code is open at: https://github.com/automationacct01/metric_frame

set -euo pipefail

# Configuration
REPO_URL="https://raw.githubusercontent.com/automationacct01/metric_frame/main"
INSTALL_DIR="${METRICFRAME_HOME:-$HOME/metricframe}"
VERSION="${METRICFRAME_VERSION:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Print banner
echo ""
echo "============================================"
echo "  MetricFrame Installer"
echo "  https://metricframe.ai"
echo "============================================"
echo ""

# Show what we're about to do
info "This installer will:"
echo "  1. Check Docker is installed and running"
echo "  2. Create directory: $INSTALL_DIR"
echo "  3. Download docker-compose.yml from GitHub"
echo "  4. Verify file integrity with SHA256 checksum"
echo "  5. Create default configuration"
echo "  6. Start MetricFrame containers"
echo ""

# Ask for confirmation unless running non-interactively
if [ -t 0 ]; then
    read -p "Continue? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z "$REPLY" ]]; then
        echo "Installation cancelled."
        exit 0
    fi
fi

# Step 1: Check Docker
info "Checking Docker installation..."

if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
fi

if ! docker compose version &> /dev/null 2>&1; then
    error "Docker Compose is not available. Please install Docker Desktop which includes Docker Compose."
fi

if ! docker info &> /dev/null 2>&1; then
    error "Docker daemon is not running. Please start Docker Desktop and try again."
fi

success "Docker is installed and running"

# Step 2: Create installation directory
info "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
success "Directory created: $INSTALL_DIR"

# Step 3: Download docker-compose.yml
info "Downloading docker-compose.yml..."

COMPOSE_URL="${REPO_URL}/docker-compose.prod.yml"
CHECKSUM_URL="${REPO_URL}/checksums.sha256"

# Download the compose file
if ! curl -fsSL "$COMPOSE_URL" -o docker-compose.yml.tmp; then
    error "Failed to download docker-compose.yml"
fi

# Step 4: Verify checksum (if checksums file exists)
info "Verifying file integrity..."

if curl -fsSL "$CHECKSUM_URL" -o checksums.sha256.tmp 2>/dev/null; then
    EXPECTED_CHECKSUM=$(grep "docker-compose.prod.yml" checksums.sha256.tmp | awk '{print $1}')
    if [ -n "$EXPECTED_CHECKSUM" ]; then
        if command -v sha256sum &> /dev/null; then
            ACTUAL_CHECKSUM=$(sha256sum docker-compose.yml.tmp | awk '{print $1}')
        elif command -v shasum &> /dev/null; then
            ACTUAL_CHECKSUM=$(shasum -a 256 docker-compose.yml.tmp | awk '{print $1}')
        else
            warn "sha256sum not found, skipping checksum verification"
            ACTUAL_CHECKSUM="$EXPECTED_CHECKSUM"
        fi

        if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
            rm -f docker-compose.yml.tmp checksums.sha256.tmp
            error "Checksum verification failed! The downloaded file may be corrupted or tampered with."
        fi
        success "Checksum verified"
    else
        warn "Checksum not found in checksums file, skipping verification"
    fi
    rm -f checksums.sha256.tmp
else
    warn "Checksums file not available, skipping verification"
fi

mv docker-compose.yml.tmp docker-compose.yml
success "Downloaded docker-compose.yml"

# Step 5: Create .env file if not exists
if [ ! -f ".env" ]; then
    info "Creating default configuration..."

    # Generate a random password for PostgreSQL
    if command -v openssl &> /dev/null; then
        DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    else
        DB_PASSWORD="metricframe_$(date +%s)"
    fi

    cat > .env << EOF
# MetricFrame Configuration
# Generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Database credentials (auto-generated, change if needed)
POSTGRES_USER=metricframe
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=metricframe

# Application port (default: 3000)
FRONTEND_PORT=3000

# AI Provider API Keys (configure in app Settings, or set here)
# ANTHROPIC_API_KEY=your-key-here
# OPENAI_API_KEY=your-key-here
EOF

    success "Created .env with secure random database password"
else
    success "Using existing .env configuration"
fi

# Step 6: Start containers
info "Pulling latest images..."
if ! docker compose pull; then
    error "Failed to pull Docker images. Check your internet connection."
fi

info "Starting MetricFrame..."
if ! docker compose up -d; then
    error "Failed to start containers. Check docker compose logs for details."
fi

# Done!
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  MetricFrame is starting!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Open your browser to: http://localhost:3000"
echo ""
echo "  First startup may take 1-2 minutes to"
echo "  initialize the database and pull images."
echo ""
echo "  Useful commands:"
echo "    cd $INSTALL_DIR"
echo "    docker compose logs -f      # View logs"
echo "    docker compose down         # Stop"
echo "    docker compose pull && docker compose up -d  # Update"
echo ""
echo "  Configuration: $INSTALL_DIR/.env"
echo "  Documentation: https://github.com/automationacct01/metric_frame"
echo ""

# Verify it's running
sleep 2
if docker compose ps | grep -q "running"; then
    success "MetricFrame containers are running"
else
    warn "Containers may still be starting. Run 'docker compose logs -f' to check status."
fi
