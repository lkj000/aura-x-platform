#!/bin/bash

# Start Temporal Server Script
# Level 5 Autonomous Agent Architecture

set -e

echo "🚀 Starting Temporal Server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in project root"
    exit 1
fi

# Start Temporal services
echo "📦 Starting Temporal services with docker-compose..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for Temporal server to be ready..."
sleep 10

# Check if Temporal is running
if docker-compose ps | grep -q "temporal"; then
    echo "✅ Temporal server is running!"
    echo ""
    echo "📊 Temporal Web UI: http://localhost:8080"
    echo "🔌 Temporal Server: localhost:7233"
    echo ""
    echo "Next steps:"
    echo "1. Run './scripts/start-worker.sh' to start the workflow worker"
    echo "2. Check Temporal Web UI at http://localhost:8080"
    echo ""
    echo "To stop Temporal:"
    echo "  docker-compose down"
else
    echo "❌ Failed to start Temporal server"
    echo "Check logs with: docker-compose logs"
    exit 1
fi
