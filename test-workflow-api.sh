#!/bin/bash

# Test the LangChain workflow via n8n REST API

echo "🚀 Testing Shopware → Qdrant (LangChain) workflow..."
echo "============================================="

# Trigger the workflow
response=$(curl -s -X POST http://localhost:5678/api/v1/workflows/HrtGKMwjB0ndVDDr/activate \
  -H "Content-Type: application/json")

if [[ $? -eq 0 ]]; then
  echo "✅ Workflow triggered successfully!"
  echo ""
  echo "📊 To view results:"
  echo "1. Open n8n UI: http://localhost:5678"
  echo "2. Go to the workflow: '🚀 FINAL: Shopware → Qdrant (LangChain)'"
  echo "3. Check the Executions tab"
  echo ""
  echo "🔍 To verify Qdrant data:"
  echo "- Open Qdrant dashboard: http://localhost:6333/dashboard"
  echo "- Look for 'shopware_products' collection"
else
  echo "❌ Failed to trigger workflow"
  echo "Response: $response"
fi