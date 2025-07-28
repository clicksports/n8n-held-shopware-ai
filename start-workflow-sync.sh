#!/bin/bash

# n8n Workflow Sync Manager Startup Script

echo "🔄 Starting n8n Workflow Sync Manager..."

# Set default environment variables if not provided
export N8N_URL=${N8N_URL:-"http://localhost:5678"}
export SYNC_INTERVAL=${SYNC_INTERVAL:-60000}        # 1 minute
export WORKFLOWS_DIR=${WORKFLOWS_DIR:-"./workflows"}
export BACKUP_DIR=${BACKUP_DIR:-"./workflow-backups"}
export GIT_AUTO_COMMIT=${GIT_AUTO_COMMIT:-true}
export SYNC_PORT=${SYNC_PORT:-3001}
export SYNC_HOST=${SYNC_HOST:-"0.0.0.0"}

echo "🔧 Configuration:"
echo "   n8n URL: $N8N_URL"
echo "   Sync Interval: $SYNC_INTERVAL ms"
echo "   Workflows Dir: $WORKFLOWS_DIR"
echo "   Backup Dir: $BACKUP_DIR"
echo "   Git Auto-commit: $GIT_AUTO_COMMIT"
echo "   Web Interface: http://$SYNC_HOST:$SYNC_PORT"

# Check if N8N_API_KEY is set (optional for local n8n)
if [ -z "$N8N_API_KEY" ]; then
  echo "⚠️  N8N_API_KEY not set - using local n8n without authentication"
  echo "💡 For remote n8n, set: export N8N_API_KEY='your-api-key'"
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed"
  exit 1
fi

# Check if required files exist
if [ ! -f "n8n-workflow-sync.js" ]; then
  echo "❌ Error: n8n-workflow-sync.js not found"
  exit 1
fi

# Create directories if they don't exist
mkdir -p "$WORKFLOWS_DIR"
mkdir -p "$BACKUP_DIR"

# Check if git is available for auto-commit
if [ "$GIT_AUTO_COMMIT" = "true" ]; then
  if ! command -v git &> /dev/null; then
    echo "⚠️  Git not available - disabling auto-commit"
    export GIT_AUTO_COMMIT=false
  else
    # Initialize git repo if not exists
    if [ ! -d ".git" ]; then
      echo "📝 Initializing git repository..."
      git init
      git add .
      git commit -m "Initial commit - n8n workflow sync setup"
    fi
  fi
fi

# Make the service executable
chmod +x n8n-workflow-sync.js

# Start the service
echo "▶️  Starting n8n workflow sync manager..."
node n8n-workflow-sync.js

# If we get here, the service has stopped
echo "🛑 n8n Workflow Sync Manager stopped"