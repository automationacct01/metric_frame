#!/bin/bash
# MetricFrame Quick Start Script
# Downloads and runs MetricFrame using Docker Compose

set -e

echo "============================================"
echo "  MetricFrame Quick Start"
echo "============================================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available."
    echo "Please install Docker Desktop which includes Docker Compose."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running."
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✓ Docker is installed and running"
echo ""

# Create directory for MetricFrame
INSTALL_DIR="${HOME}/metricframe"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "Installing MetricFrame to: $INSTALL_DIR"
echo ""

# Download docker-compose.prod.yml if not exists
if [ ! -f "docker-compose.yml" ]; then
    echo "Downloading configuration..."
    curl -fsSL https://raw.githubusercontent.com/automationacct01/metric_frame/main/docker-compose.prod.yml -o docker-compose.yml
fi

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo "Creating default configuration..."
    cat > .env << 'EOF'
# MetricFrame Configuration
# Edit these values as needed

# Database (change password for production!)
POSTGRES_USER=metricframe
POSTGRES_PASSWORD=metricframe
POSTGRES_DB=metricframe

# Frontend port (default: 3000, industry standard for web apps)
FRONTEND_PORT=3000

# AI Provider API Keys (optional - can configure in app)
# ANTHROPIC_API_KEY=your-key-here
# OPENAI_API_KEY=your-key-here
EOF
    echo "✓ Created .env file - edit to customize settings"
fi

echo ""
echo "Starting MetricFrame..."
echo ""

# Pull and start containers
docker compose pull
docker compose up -d

echo ""
echo "============================================"
echo "  MetricFrame is starting!"
echo "============================================"
echo ""
echo "  Open your browser to: http://localhost:3000"
echo ""
echo "  First startup may take a few minutes"
echo "  to initialize the database."
echo ""
echo "  Commands:"
echo "    Stop:    cd $INSTALL_DIR && docker compose down"
echo "    Logs:    cd $INSTALL_DIR && docker compose logs -f"
echo "    Update:  cd $INSTALL_DIR && docker compose pull && docker compose up -d"
echo ""
