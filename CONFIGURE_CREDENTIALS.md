# 🔧 Configure Credentials for LangChain Workflow

## Issue
The workflow "🚀 FINAL: Shopware → Qdrant (LangChain)" needs:
1. **Document Loader** connection (missing)
2. **Qdrant credentials** without API key

## Solution

### 1. Import Fixed Workflow
The file `FIXED-LANGCHAIN-QDRANT.json` contains the corrected workflow with:
- ✅ Document Loader node added
- ✅ Proper connections between nodes
- ✅ Qdrant URL configured as `http://qdrant:6333`

### 2. Configure OpenAI Credentials
1. Go to Credentials → New
2. Search for "OpenAI" 
3. Add your API key
4. Save as "OpenAI API"

### 3. Configure Qdrant (No API Key)
Since Qdrant doesn't require an API key in your local setup:

1. In the workflow, click on "Qdrant Vector Store" node
2. For credentials, either:
   - Create new Qdrant credentials with just URL: `http://qdrant:6333`
   - Or directly set the URL in the node parameters

### 4. Manual Import Steps
1. Open n8n UI: http://localhost:5678
2. Go to Workflows → Import from File
3. Select `FIXED-LANGCHAIN-QDRANT.json`
4. Configure credentials as above

## Alternative: Direct Node Configuration

If import fails, manually fix in existing workflow:

1. **Add Document Loader**:
   - Add node: "Default Data Loader" 
   - Type: `@n8n/n8n-nodes-langchain.documentDefaultDataLoader`
   - Connect: Transform to Documents → Document Loader → Qdrant

2. **Fix Qdrant Node**:
   - Remove credential requirement
   - Set URL directly: `http://qdrant:6333`
   - Collection: `shopware_products`

3. **Connect Embeddings**:
   - OpenAI Embeddings → Qdrant (ai_embedding connection)
   - Document Loader → Qdrant (ai_document connection)

## Test Workflow
Once configured:
1. Execute workflow manually
2. Check console logs for progress
3. Verify in Qdrant dashboard: http://localhost:6333/dashboard