# Manual Workflow Import Instructions

Since the n8n instance requires API key authentication, here's how to manually import the workflow:

## Step 1: Open n8n in your browser
```
http://localhost:5678
```

## Step 2: Import the workflow
1. Click on "Workflows" in the left sidebar
2. Click the "+" button to create a new workflow
3. In the workflow editor, click the "..." menu (three dots)
4. Select "Import workflow"
5. Choose "From file"
6. Select the file: `shopware-to-qdrant-full-catalog.json`
7. Click "Import"

## Step 3: Configure the workflow
1. The workflow will be imported as "Shopware to Qdrant - Full Catalog Sync"
2. You'll see all the nodes connected automatically

## Step 4: Set up Shopware API credentials
1. Click on any node that uses "Shopware API" (like "Fetch Products Page")
2. Click on the credential dropdown
3. Click "Create New" credential
4. Select "Shopware API" from the list
5. Fill in your Shopware details:
   - **API URL**: Your Shopware shop URL + `/api` (e.g., `https://your-shop.com/api`)
   - **Access Key**: Your Shopware API access key
   - **Secret**: Your Shopware API secret
   - **Sales Channel**: Your sales channel ID (optional)
6. Test the connection and save

## Step 5: Configure Qdrant connection (if needed)
1. The workflow uses `http://localhost:6333` by default
2. If your Qdrant is elsewhere, update the URLs in these nodes:
   - "Delete Old Collection"
   - "Create New Collection" 
   - "Upload to Qdrant"

## Step 6: Activate the workflow
1. Click the toggle switch at the top to activate the workflow
2. The workflow is now ready to receive webhook calls

## Step 7: Test the workflow
```bash
curl -X POST http://localhost:5678/webhook/sync-full-catalog
```

## Alternative: Copy-Paste Method

If file import doesn't work:

1. Open the file `shopware-to-qdrant-full-catalog.json` in a text editor
2. Copy all the content (Ctrl+A, Ctrl+C)
3. In n8n, create a new workflow
4. Click the "..." menu → "Import workflow" → "From text"
5. Paste the content and import

## What the workflow does:

✅ **Fetches ALL products** from Shopware with pagination
✅ **Enriches data** with variants, reviews, categories, manufacturers
✅ **AI optimization** for semantic search
✅ **Batch processing** to handle large catalogs efficiently
✅ **Error handling** continues on individual failures
✅ **Progress tracking** with detailed logging
✅ **Vector database ready** uploads to Qdrant collection

## Webhook endpoint after activation:
```
POST http://localhost:5678/webhook/sync-full-catalog
```

This will start the full catalog synchronization process!