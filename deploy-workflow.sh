#!/bin/bash

# N8n Workflow Deployment Script
# This script deploys the Shopware to Qdrant workflow to your n8n instance

echo "🚀 N8n Workflow Deployment Tool"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Configuration
read -p "Enter your n8n URL (default: http://localhost:5678): " N8N_URL
N8N_URL=${N8N_URL:-http://localhost:5678}

# Check if using API key or username/password
echo ""
echo "Authentication method:"
echo "1) API Key (recommended)"
echo "2) Username/Password"
read -p "Select authentication method (1 or 2): " AUTH_METHOD

if [ "$AUTH_METHOD" = "1" ]; then
    read -p "Enter your n8n API Key: " N8N_API_KEY
    export N8N_API_KEY
else
    read -p "Enter your n8n username/email: " N8N_USERNAME
    read -sp "Enter your n8n password: " N8N_PASSWORD
    echo ""
    export N8N_USERNAME
    export N8N_PASSWORD
fi

export N8N_URL

# Run the deployment
echo ""
echo "Starting deployment..."
echo ""

node deploy-workflow.js

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "To test the workflow:"
    echo "curl -X POST ${N8N_URL}/webhook/sync-full-catalog"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi