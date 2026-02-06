#!/bin/bash
# Deploy AURA-X Orchestration Agent to Modal.com

echo "🚀 Deploying AURA-X Orchestration Agent to Modal.com..."

# Check if modal CLI is installed
if ! command -v modal &> /dev/null; then
    echo "❌ Modal CLI not found. Installing..."
    pip install modal
fi

# Check if logged in to Modal
if ! modal token list &> /dev/null; then
    echo "❌ Not logged in to Modal. Please run: modal token new"
    exit 1
fi

# Create secrets if they don't exist
echo "📝 Setting up Modal secrets..."
modal secret create aura-x-secrets \
    OPENAI_API_KEY="$OPENAI_API_KEY" \
    MODAL_API_KEY="$MODAL_API_KEY" \
    2>/dev/null || echo "Secrets already exist"

# Deploy the app
echo "🔨 Deploying Modal app..."
modal deploy modal_orchestration.py

echo "✅ Deployment complete!"
echo ""
echo "📡 Your Modal app is now live at:"
echo "   https://your-username--aura-x-orchestration-fastapi-app.modal.run"
echo ""
echo "🔑 Set these environment variables in your Manus project:"
echo "   MODAL_BASE_URL=https://your-username--aura-x-orchestration-fastapi-app.modal.run"
echo "   MODAL_API_KEY=<your-modal-api-key>"
