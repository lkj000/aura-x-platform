#!/bin/bash

# Temporal Health Check Script
# Level 5 Autonomous Agent Architecture

echo "🏥 Checking Temporal Infrastructure Health..."
echo ""

# Check Docker
echo "1️⃣  Checking Docker..."
if command -v docker &> /dev/null; then
    echo "   ✅ Docker installed: $(docker --version)"
else
    echo "   ❌ Docker not installed"
    exit 1
fi

# Check docker-compose
echo "2️⃣  Checking docker-compose..."
if command -v docker-compose &> /dev/null; then
    echo "   ✅ docker-compose installed: $(docker-compose --version)"
else
    echo "   ❌ docker-compose not installed"
    exit 1
fi

# Check Temporal server
echo "3️⃣  Checking Temporal server..."
if nc -z localhost 7233 2>/dev/null; then
    echo "   ✅ Temporal server running on localhost:7233"
else
    echo "   ❌ Temporal server not running on localhost:7233"
    echo "   Start with: ./scripts/start-temporal.sh"
fi

# Check Temporal Web UI
echo "4️⃣  Checking Temporal Web UI..."
if nc -z localhost 8080 2>/dev/null; then
    echo "   ✅ Temporal Web UI running on localhost:8080"
    echo "   Open: http://localhost:8080"
else
    echo "   ❌ Temporal Web UI not running on localhost:8080"
fi

# Check Python
echo "5️⃣  Checking Python..."
if command -v python3 &> /dev/null; then
    echo "   ✅ Python installed: $(python3 --version)"
else
    echo "   ❌ Python not installed"
    exit 1
fi

# Check Python dependencies
echo "6️⃣  Checking Python dependencies..."
python3 -c "import temporalio" 2>/dev/null && echo "   ✅ temporalio installed" || echo "   ❌ temporalio not installed (pip3 install temporalio)"
python3 -c "import modal" 2>/dev/null && echo "   ✅ modal installed" || echo "   ❌ modal not installed (pip3 install modal)"

# Check environment variables
echo "7️⃣  Checking environment variables..."
[ -n "$MODAL_API_KEY" ] && echo "   ✅ MODAL_API_KEY set" || echo "   ⚠️  MODAL_API_KEY not set"
[ -n "$DATABASE_URL" ] && echo "   ✅ DATABASE_URL set" || echo "   ⚠️  DATABASE_URL not set"
[ -n "$MODAL_BASE_URL" ] && echo "   ✅ MODAL_BASE_URL set" || echo "   ⚠️  MODAL_BASE_URL not set"

# Check Docker containers
echo "8️⃣  Checking Docker containers..."
if docker ps | grep -q "temporal"; then
    echo "   ✅ Temporal containers running:"
    docker ps --filter "name=temporal" --format "      - {{.Names}} ({{.Status}})"
else
    echo "   ❌ No Temporal containers running"
fi

echo ""
echo "🎯 Health Check Complete"
echo ""

# Summary
if nc -z localhost 7233 2>/dev/null && python3 -c "import temporalio" 2>/dev/null; then
    echo "✅ System is ready for Temporal workflows!"
    echo ""
    echo "Next steps:"
    echo "  1. Start worker: ./scripts/start-worker.sh"
    echo "  2. Open Web UI: http://localhost:8080"
    echo "  3. Test workflow from AI Studio"
else
    echo "❌ System is NOT ready. Please fix the issues above."
fi
