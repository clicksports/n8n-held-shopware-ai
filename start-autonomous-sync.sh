#!/bin/bash

# Autonomous Shopware-Qdrant Sync Service Startup Script

echo "🚀 Starting Autonomous Shopware-Qdrant Sync Service..."

# Check if required environment variables are set
if [ -z "$SHOPWARE_API_KEY" ]; then
  echo "❌ Error: SHOPWARE_API_KEY environment variable is required"
  echo "💡 Set it with: export SHOPWARE_API_KEY='your-api-key'"
  exit 1
fi

# Set default environment variables if not provided
export SHOPWARE_URL=${SHOPWARE_URL:-"https://shop.held.de"}
export QDRANT_URL=${QDRANT_URL:-"http://localhost:6333"}
export SYNC_INTERVAL=${SYNC_INTERVAL:-300000}      # 5 minutes
export FULL_SYNC_INTERVAL=${FULL_SYNC_INTERVAL:-86400000}  # 24 hours
export BATCH_SIZE=${BATCH_SIZE:-10}
export PORT=${PORT:-3000}
export HOST=${HOST:-"0.0.0.0"}

echo "🔧 Configuration:"
echo "   Shopware URL: $SHOPWARE_URL"
echo "   Qdrant URL: $QDRANT_URL"
echo "   Sync Interval: $SYNC_INTERVAL ms"
echo "   Full Sync Interval: $FULL_SYNC_INTERVAL ms"
echo "   Batch Size: $BATCH_SIZE"
echo "   Monitoring Server: http://$HOST:$PORT"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed"
  exit 1
fi

# Check if required files exist
if [ ! -f "autonomous-sync-service.js" ]; then
  echo "❌ Error: autonomous-sync-service.js not found"
  exit 1
fi

# Make the service executable
chmod +x autonomous-sync-service.js

# Start the service
echo "▶️  Starting autonomous sync service..."
node autonomous-sync-service.js

# If we get here, the service has stopped
echo "🛑 Autonomous sync service stopped"