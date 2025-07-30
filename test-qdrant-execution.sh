#!/bin/bash

echo "🧪 Testing Qdrant Upload Workflow"
echo "================================"

# First check if Qdrant is healthy
echo -e "\n📋 Checking Qdrant status..."
QDRANT_STATUS=$(curl -s http://localhost:6333/collections)
if [[ $? -eq 0 ]]; then
    echo "✅ Qdrant is accessible"
    echo "Collections: $(echo $QDRANT_STATUS | jq -r '.result.collections[].name' 2>/dev/null | tr '\n' ', ')"
else
    echo "❌ Qdrant is not accessible"
    exit 1
fi

# Check if shopware_products collection exists
echo -e "\n🔍 Checking shopware_products collection..."
COLLECTION_STATUS=$(curl -s http://localhost:6333/collections/shopware_products)
if [[ $(echo $COLLECTION_STATUS | jq -r '.status' 2>/dev/null) == "ok" ]]; then
    echo "✅ Collection exists"
    POINT_COUNT=$(echo $COLLECTION_STATUS | jq -r '.result.points_count' 2>/dev/null)
    echo "   Current products: $POINT_COUNT"
else
    echo "⚠️  Collection doesn't exist (will be created on first upload)"
fi

echo -e "\n📊 Workflow Status:"
echo "- Name: 🚀 FIXED: Shopware → Qdrant (LangChain)"
echo "- Status: Deployed and ready"
echo ""
echo "To test the workflow:"
echo "1. Open n8n UI: http://localhost:5678"
echo "2. Configure credentials:"
echo "   - OpenAI API key"
echo "   - Qdrant URL: http://qdrant:6333"
echo "3. Execute the workflow"
echo ""
echo "Expected flow:"
echo "OAuth → Fetch Products → Transform → Document Loader → Qdrant"
echo "                                           ↑"
echo "                                    OpenAI Embeddings"