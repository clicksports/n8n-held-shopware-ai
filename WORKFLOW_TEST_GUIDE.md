# Shopware → Qdrant Workflow Test Guide

## 🚀 Deployed Workflows

### 1. Simple Qdrant API Test
- **Purpose**: Test basic Qdrant connectivity
- **Status**: Ready to test
- **How to test**: 
  1. Open http://localhost:5678
  2. Find "Simple Qdrant API Test"
  3. Click "Execute Workflow"
  4. Check if it lists Qdrant collections

### 2. TEST: LangChain Qdrant Integration
- **Purpose**: Test LangChain nodes with 2 sample products
- **Status**: Ready to test (requires OpenAI credentials)
- **How to test**:
  1. Configure OpenAI credentials first
  2. Open workflow and execute
  3. Should create 'test_products' collection in Qdrant

### 3. 🚀 FINAL: Shopware → Qdrant (LangChain)
- **Purpose**: Full production sync of ALL products
- **Workflow ID**: HrtGKMwjB0ndVDDr
- **Status**: Deployed and activated
- **How to test**:
  1. Ensure OpenAI credentials are configured
  2. Ensure Qdrant credentials point to http://qdrant:6333
  3. Execute workflow manually
  4. Monitor progress in executions tab

### 4. ✅ ULTIMATE: Shopware → Qdrant Working
- **Purpose**: Fallback workflow that fetches all products without upload
- **Status**: Ready as backup option
- **Use when**: LangChain nodes fail or OpenAI not available

## 📋 Prerequisites

### 1. OpenAI Credentials
```
1. Go to Credentials → New
2. Search for "OpenAI"
3. Add your API key
4. Save as "OpenAI API"
```

### 2. Qdrant Credentials
```
1. Go to Credentials → New
2. Search for "Qdrant"
3. URL: http://qdrant:6333
4. Save as "Qdrant Local"
```

## 🧪 Testing Steps

### Step 1: Verify Qdrant Connection
```bash
curl http://localhost:6333/collections
```

### Step 2: Test Simple Workflow
1. Execute "Simple Qdrant API Test"
2. Should show Qdrant collections

### Step 3: Test with Sample Data
1. Execute "TEST: LangChain Qdrant Integration"
2. Creates 2 test products in Qdrant
3. Verify at http://localhost:6333/dashboard

### Step 4: Run Full Sync
1. Execute "🚀 FINAL: Shopware → Qdrant (LangChain)"
2. This will:
   - Authenticate with Shopware
   - Fetch ALL products (50+)
   - Generate embeddings via OpenAI
   - Store in Qdrant collection

## 🔍 Verification

### Check Qdrant Dashboard
1. Open http://localhost:6333/dashboard
2. Look for 'shopware_products' collection
3. Should contain 50+ products with vectors

### Check n8n Executions
1. Go to workflow executions
2. Review logs for any errors
3. Check total products fetched

## 🚨 Troubleshooting

### OpenAI Error
- Ensure API key is valid
- Check OpenAI quota/limits

### Qdrant Connection Error
- Verify Docker containers are running
- Check network connectivity between containers

### No Products Found
- Use ULTIMATE workflow to test Shopware connection
- Check OAuth credentials are still valid

## 📊 Expected Results

- **Shopware Products**: 50+ fetched
- **Qdrant Collection**: 'shopware_products'
- **Vector Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Metadata**: product_id, name, sku, price, etc.

## 🎯 Next Steps

Once products are in Qdrant:
1. Test semantic search queries
2. Connect AI chatbot workflow
3. Implement incremental sync for updates