#!/bin/bash

echo "🔍 Checking System Status"
echo "========================="

# Check Docker containers
echo -e "\n📦 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "n8n|qdrant"

# Check n8n
echo -e "\n🔧 n8n Status:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678 | grep -q "200"; then
    echo "✅ n8n is running at http://localhost:5678"
else
    echo "❌ n8n is not accessible"
fi

# Check Qdrant
echo -e "\n🗄️ Qdrant Status:"
qdrant_status=$(curl -s http://localhost:6333/collections 2>/dev/null)
if [[ $? -eq 0 ]]; then
    echo "✅ Qdrant is running at http://localhost:6333"
    echo "   Dashboard: http://localhost:6333/dashboard"
    
    # List collections
    echo -e "\n📋 Qdrant Collections:"
    echo "$qdrant_status" | jq -r '.result.collections[]?.name' 2>/dev/null || echo "   No collections found"
else
    echo "❌ Qdrant is not accessible"
fi

echo -e "\n📚 Workflow Files:"
ls -la *.json | grep -E "FINAL|ULTIMATE|test" | awk '{print "   " $9}'

echo -e "\n✅ Ready to test workflows in n8n UI!"
echo "   1. Open http://localhost:5678"
echo "   2. Configure credentials (OpenAI + Qdrant)"
echo "   3. Execute workflows as described in WORKFLOW_TEST_GUIDE.md"