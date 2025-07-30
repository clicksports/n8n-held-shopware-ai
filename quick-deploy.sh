#!/bin/bash

echo "🚀 Quick Deployment Instructions for n8n Workflow"
echo "================================================="
echo ""
echo "Since your n8n instance requires authentication, please follow these steps:"
echo ""
echo "1. Open your browser and go to: http://localhost:5678"
echo "2. Login to your n8n instance"
echo "3. Go to 'Workflows' and click the '+' button"
echo "4. Click the menu (...) and select 'Import workflow'"
echo "5. Choose 'From file' and select: shopware-to-qdrant-full-catalog.json"
echo "6. Configure Shopware API credentials in the workflow nodes"
echo "7. Activate the workflow"
echo ""
echo "📋 Workflow file ready: shopware-to-qdrant-full-catalog.json"
echo "📖 Detailed instructions: MANUAL-IMPORT.md"
echo ""
echo "🎯 Test webhook after import:"
echo "curl -X POST http://localhost:5678/webhook/sync-full-catalog"
echo ""
echo "The workflow will fetch ALL products from Shopware and upload to Qdrant!"

# Try to open the browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    read -p "Would you like me to open n8n in your browser? (y/n): " open_browser
    if [[ $open_browser == "y" || $open_browser == "Y" ]]; then
        open http://localhost:5678
    fi
fi