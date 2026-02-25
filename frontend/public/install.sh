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
#   4. Generates a TLS certificate for encrypted connections (HTTPS)
#   5. Starts the MetricFrame containers
#
# Security features:
#   - All downloads use HTTPS
#   - Configuration files are verified with SHA256 checksums
#   - No sudo/root required (uses user's home directory)
#   - Documentation: https://www.metricframe.ai/wiki

set -euo pipefail

# Configuration
REPO_URL="https://get.metricframe.ai"
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

# Run a command with a timeout and progress dots
# Returns 124 on timeout, or the command's exit code
run_with_timeout() {
    local timeout_secs=$1
    local description=$2
    shift 2

    "$@" &
    local pid=$!
    local elapsed=0

    while kill -0 $pid 2>/dev/null; do
        if [ $elapsed -ge $timeout_secs ]; then
            kill $pid 2>/dev/null
            wait $pid 2>/dev/null
            warn "$description timed out after ${timeout_secs}s"
            return 124
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        printf "."
    done
    echo ""

    wait $pid
    return $?
}

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
echo "  6. Generate TLS certificate for HTTPS"
echo "  7. Start MetricFrame containers"
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

# Encryption key for AI provider credentials (generated after first pull)
AI_CREDENTIALS_MASTER_KEY=PENDING
EOF

    # Clean up stale Docker volumes from a previous install (old password won't match new .env)
    if docker compose ps -q 2>/dev/null | grep -q . || docker volume ls -q 2>/dev/null | grep -q "metricframe_postgres"; then
        info "Removing stale containers and volumes from previous install..."
        docker compose down -v 2>/dev/null || true
        success "Cleaned up previous installation data"
    fi

    success "Created .env with secure random database password"
else
    success "Using existing .env configuration"
fi

# Step 5.5: Optional HTTPS Setup
TLS_ENABLED="false"
if [ -t 0 ]; then
    echo ""
    info "Optional: Enable HTTPS for encrypted local connections?"
    echo ""
    echo "  Encrypts all traffic between your browser and MetricFrame using"
    echo "  a self-signed TLS certificate (generated automatically)."
    echo ""
    echo "  Note: Your browser will show a certificate warning on first visit."
    echo "  This is normal — self-signed certificates aren't recognized by browsers"
    echo "  because they weren't issued by a public Certificate Authority."
    echo "  The encryption is the same — your data is fully protected."
    echo "  Just click 'Advanced' → 'Proceed to localhost' once."
    echo ""
    read -p "  Enable HTTPS? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        TLS_ENABLED="true"
        info "HTTPS will be configured after images are pulled"
    fi
fi

# Step 6: Pull images and start containers
info "Pulling latest images (this may take a few minutes on first install)..."
if ! run_with_timeout 300 "Image pull" docker compose pull --quiet; then
    # Check if images are already cached — if so, continue with a warning
    if docker images --format '{{.Repository}}' | grep -q "metric_frame"; then
        warn "Pull timed out but cached images found. Continuing with cached images."
    else
        error "Failed to pull Docker images. Check your internet connection and Docker Desktop."
    fi
fi

# Generate proper Fernet encryption key
if grep -q "AI_CREDENTIALS_MASTER_KEY=PENDING" .env 2>/dev/null; then
    info "Generating encryption key for AI credentials..."
    MASTER_KEY=""

    # Try Python 3 locally first (fast, no Docker container needed)
    if command -v python3 &> /dev/null; then
        MASTER_KEY=$(python3 -c "import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())" 2>/dev/null)
    fi

    # Fall back to Docker container (with manual timeout for macOS compatibility)
    if [ -z "$MASTER_KEY" ]; then
        docker run --rm ghcr.io/automationacct01/metric_frame-backend:latest \
            python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" > /tmp/mf_key.tmp 2>/dev/null &
        KEY_PID=$!
        KEY_ELAPSED=0
        while kill -0 $KEY_PID 2>/dev/null; do
            if [ $KEY_ELAPSED -ge 30 ]; then
                kill $KEY_PID 2>/dev/null; wait $KEY_PID 2>/dev/null
                break
            fi
            sleep 1; KEY_ELAPSED=$((KEY_ELAPSED + 1))
        done
        wait $KEY_PID 2>/dev/null
        MASTER_KEY=$(cat /tmp/mf_key.tmp 2>/dev/null)
        rm -f /tmp/mf_key.tmp
    fi

    if [ -n "$MASTER_KEY" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|AI_CREDENTIALS_MASTER_KEY=PENDING|AI_CREDENTIALS_MASTER_KEY=${MASTER_KEY}|" .env
        else
            sed -i "s|AI_CREDENTIALS_MASTER_KEY=PENDING|AI_CREDENTIALS_MASTER_KEY=${MASTER_KEY}|" .env
        fi
        success "Encryption key generated"
    else
        warn "Could not generate encryption key. AI credential storage may not work until key is set."
    fi
fi

# Step 6.5: Generate TLS certificate and config if enabled
if [ "$TLS_ENABLED" = "true" ]; then
    info "Generating TLS certificate..."
    mkdir -p "$INSTALL_DIR/certs"

    if docker run --rm \
        -v "$INSTALL_DIR/certs:/certs" \
        ghcr.io/automationacct01/metric_frame-backend:latest \
        python3 -m src.services.tls_cert /certs metricframe 2>/dev/null; then
        success "TLS certificate generated"
    else
        warn "Failed to generate TLS certificate. Continuing without HTTPS."
        TLS_ENABLED="false"
    fi
fi

if [ "$TLS_ENABLED" = "true" ]; then
    info "Configuring HTTPS..."

    cat > docker-compose.override.yml << 'OVERRIDE_EOF'
# MetricFrame TLS Override (generated by install.sh)
services:
  frontend:
    volumes:
      - ./certs:/etc/nginx/certs:ro
      - ./nginx-tls.conf:/etc/nginx/conf.d/default.conf:ro

  backend:
    environment:
      CORS_ORIGINS: http://localhost,http://localhost:3000,https://localhost,https://localhost:3000
OVERRIDE_EOF

    cat > nginx-tls.conf << 'NGINX_EOF'
# MetricFrame HTTPS server on port 3000
server {
    listen 3000 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/metricframe.crt;
    ssl_certificate_key /etc/nginx/certs/metricframe.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        proxy_pass http://backend:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://localhost:* http://localhost:* https://api.anthropic.com https://api.openai.com https://api.together.xyz;" always;
}
NGINX_EOF

    success "HTTPS configured"
fi

info "Starting MetricFrame..."
if ! run_with_timeout 120 "Container startup" docker compose up -d; then
    error "Failed to start containers. Check Docker Desktop is running and try: docker compose up -d"
fi

# Done!
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  MetricFrame is starting!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
if [ "$TLS_ENABLED" = "true" ]; then
    echo "  Open your browser to: https://localhost:3000"
    echo ""
    echo -e "  ${YELLOW}Browser Certificate Warning (one-time):${NC}"
    echo "  Your browser will show 'Your connection is not private'."
    echo "  This is expected for self-signed certificates."
    echo "  Click 'Advanced' → 'Proceed to localhost' to continue."
    echo ""
    echo "  To disable HTTPS later:"
    echo "    curl -fsSL https://get.metricframe.ai/disable-tls.sh | bash"
else
    echo "  Open your browser to: http://localhost:3000"
    echo ""
    echo "  To enable HTTPS encryption later:"
    echo "    curl -fsSL https://get.metricframe.ai/enable-tls.sh | bash"
fi
echo ""
echo "  First startup may take 1-2 minutes to"
echo "  initialize the database."
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
HEALTH_URL="http://localhost:${FRONTEND_PORT:-3000}/health"
if [ "$TLS_ENABLED" = "true" ]; then
    HEALTH_URL="https://localhost:${FRONTEND_PORT:-3000}/health"
fi

info "Waiting for MetricFrame to become healthy..."
healthy=false
for i in $(seq 1 12); do
    sleep 5
    if curl -skf "$HEALTH_URL" > /dev/null 2>&1; then
        healthy=true
        break
    fi
    printf "."
done
echo ""

if [ "$healthy" = "true" ]; then
    success "MetricFrame is running and healthy"
else
    warn "MetricFrame may still be starting. Run 'docker compose logs -f' to check status."
fi
