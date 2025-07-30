#!/bin/bash

# Simple deployment using curl
# This script deploys the workflow using only curl commands

echo "🚀 Deploying Shopware to Qdrant Workflow to n8n"
echo "=============================================="

# Default values
N8N_URL="${N8N_URL:-http://localhost:5678}"
WORKFLOW_FILE="shopware-to-qdrant-full-catalog.json"

# Check if workflow file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

# Read workflow content
WORKFLOW_DATA=$(cat "$WORKFLOW_FILE")

# Function to deploy with API key
deploy_with_api_key() {
    local api_key=$1
    
    echo "📤 Deploying workflow via API..."
    
    response=$(curl -s -X POST \
        -H "X-N8N-API-KEY: $api_key" \
        -H "Content-Type: application/json" \
        -d "$WORKFLOW_DATA" \
        "${N8N_URL}/api/v1/workflows")
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Workflow deployed successfully!"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo "❌ Deployment failed:"
        echo "$response"
        exit 1
    fi
}

# Function to deploy with basic auth
deploy_with_basic_auth() {
    local username=$1
    local password=$2
    
    echo "🔐 Authenticating..."
    
    # First, try to login and get session
    auth_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$username\",\"password\":\"$password\"}" \
        "${N8N_URL}/rest/login" \
        -c /tmp/n8n-cookies.txt)
    
    if [ $? -ne 0 ]; then
        echo "❌ Authentication failed"
        exit 1
    fi
    
    echo "📤 Deploying workflow..."
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/n8n-cookies.txt \
        -d "$WORKFLOW_DATA" \
        "${N8N_URL}/api/v1/workflows")
    
    # Clean up
    rm -f /tmp/n8n-cookies.txt
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Workflow deployed successfully!"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo "❌ Deployment failed:"
        echo "$response"
        exit 1
    fi
}

# Main script
echo "N8n URL: $N8N_URL"
echo ""

# Check authentication method
if [ ! -z "$N8N_API_KEY" ]; then
    echo "Using API key authentication"
    deploy_with_api_key "$N8N_API_KEY"
else
    echo "Select authentication method:"
    echo "1) API Key"
    echo "2) Username/Password"
    read -p "Choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        read -p "Enter API Key: " api_key
        deploy_with_api_key "$api_key"
    else
        read -p "Enter username/email: " username
        read -sp "Enter password: " password
        echo ""
        deploy_with_basic_auth "$username" "$password"
    fi
fi

echo ""
echo "📌 Next steps:"
echo "1. Open n8n: $N8N_URL"
echo "2. Find the workflow 'Shopware to Qdrant - Full Catalog Sync'"
echo "3. Configure Shopware API credentials"
echo "4. Activate the workflow"
echo "5. Test: curl -X POST ${N8N_URL}/webhook/sync-full-catalog"