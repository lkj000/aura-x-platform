#!/bin/bash

# Start Temporal Worker Script
# Level 5 Autonomous Agent Architecture

set -e

echo "🤖 Starting Temporal Worker..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if temporal_workflows.py exists
if [ ! -f "temporal_workflows.py" ]; then
    echo "❌ temporal_workflows.py not found in project root"
    exit 1
fi

# Check if Temporal server is running
echo "🔍 Checking Temporal server connection..."
if ! nc -z localhost 7233 2>/dev/null; then
    echo "❌ Temporal server is not running on localhost:7233"
    echo "Please start Temporal server first:"
    echo "  ./scripts/start-temporal.sh"
    exit 1
fi

# Check if required Python packages are installed
echo "📦 Checking Python dependencies..."
python3 -c "import temporalio" 2>/dev/null || {
    echo "❌ Temporal Python SDK not installed"
    echo "Installing dependencies..."
    pip3 install temporalio
}

python3 -c "import modal" 2>/dev/null || {
    echo "❌ Modal SDK not installed"
    echo "Installing dependencies..."
    pip3 install modal
}

# Check environment variables
if [ -z "$MODAL_API_KEY" ]; then
    echo "⚠️  Warning: MODAL_API_KEY not set"
    echo "Worker will start but Modal API calls may fail"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL not set"
    echo "Worker will start but database operations may fail"
fi

# Start the worker
echo "✅ Starting Temporal worker process..."
echo "📊 Worker will process workflows from task queue: music-generation-queue"
echo ""
echo "Press Ctrl+C to stop the worker"
echo ""

python3 temporal_workflows.py

# If we get here, the worker has stopped
echo ""
echo "🛑 Temporal worker stopped"
