#!/bin/bash

echo "🎯 Workflow Deployment Complete!"
echo "================================="
echo ""
echo "✅ Successfully imported: 'Shopware to Qdrant - Full Catalog Sync'"
echo "📍 Workflow ID: TQjLUQoEKwH8prGP"
echo ""
echo "🔧 Next Steps Required:"
echo ""
echo "1. Open n8n in your browser: http://localhost:5678"
echo "2. Go to Workflows and find 'Shopware to Qdrant - Full Catalog Sync'"
echo "3. Click on the workflow to open it"
echo "4. Configure Shopware API credentials:"
echo "   - Click on any Shopware API node (like 'Fetch Products Page')"
echo "   - Add your Shopware API credentials"
echo "   - API URL: https://your-shop.com/api"
echo "   - Access Key: your-api-key"
echo "   - Secret: your-api-secret"
echo "5. Toggle the workflow to ACTIVE (switch in top-right)"
echo "6. Save the workflow"
echo ""
echo "🚀 Test the workflow after activation:"
echo "curl -X POST http://localhost:5678/webhook/sync-full-catalog"
echo ""
echo "📊 What this workflow does:"
echo "- Fetches ALL products from Shopware with pagination"
echo "- Enriches with variants, reviews, categories, manufacturers"
echo "- Optimizes data for AI semantic search"
echo "- Uploads to Qdrant collection: shopware_products_full"
echo "- Provides detailed progress logging"
echo ""
echo "💡 The workflow is imported but needs manual activation and credential setup in the UI!"

# Try to open browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    read -p "Open n8n in browser now? (y/n): " open_browser
    if [[ $open_browser == "y" || $open_browser == "Y" ]]; then
        open http://localhost:5678
    fi
fi