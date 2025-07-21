#!/bin/bash

# NIST CSF 2.0 Metrics Application - Development Setup Script

set -e

echo "🚀 Starting NIST CSF 2.0 Metrics Application..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Use docker compose if available, otherwise fall back to docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "🛠️  Building containers..."
$DOCKER_COMPOSE build

echo "📦 Starting services..."
$DOCKER_COMPOSE up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️  Running database migrations..."
$DOCKER_COMPOSE exec backend poetry run alembic upgrade head

echo "🌱 Loading seed metrics data..."
$DOCKER_COMPOSE exec backend poetry run python -m src.seeds.load_seed

echo "✅ Application is ready!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "📡 Backend API: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo ""
echo "To stop the application, run: $DOCKER_COMPOSE down"
echo "To view logs, run: $DOCKER_COMPOSE logs -f"