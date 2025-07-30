# Deploying the Shopware to Qdrant Workflow

This guide explains how to deploy the full catalog sync workflow to your n8n instance.

## Prerequisites

- n8n instance running (local or remote)
- n8n API access (API key or username/password)
- Node.js installed (for the Node.js deployment script)

## Deployment Methods

### Method 1: Using the Node.js Script (Recommended)

```bash
# Make the script executable
chmod +x deploy-workflow.sh

# Run the deployment
./deploy-workflow.sh
```

The script will:
1. Prompt for your n8n URL
2. Ask for authentication method (API key or username/password)
3. Deploy the workflow
4. Show success/error messages

### Method 2: Using curl (Simple)

```bash
# Make the script executable
chmod +x deploy-with-curl.sh

# Option A: With API key
N8N_API_KEY="your-api-key" ./deploy-with-curl.sh

# Option B: Interactive
./deploy-with-curl.sh
```

### Method 3: Manual Import via UI

1. Open your n8n instance
2. Go to Workflows
3. Click "Add workflow" → "Import from File"
4. Select `shopware-to-qdrant-full-catalog.json`
5. Save the workflow

### Method 4: Direct API Call

```bash
# With API Key
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d @shopware-to-qdrant-full-catalog.json

# With Basic Auth
curl -X POST http://localhost:5678/api/v1/workflows \
  -u "username:password" \
  -H "Content-Type: application/json" \
  -d @shopware-to-qdrant-full-catalog.json
```

## Getting n8n API Access

### Option 1: API Key (Recommended)

1. Open n8n settings
2. Go to "API" section
3. Enable "Public API"
4. Copy the API key

### Option 2: Username/Password

Use your n8n login credentials.

## Post-Deployment Steps

1. **Configure Shopware Credentials**
   - Open the workflow in n8n
   - Click on any "Shopware API" node
   - Add/Select Shopware API credentials
   - Enter your Shopware API URL and access key

2. **Configure Qdrant Connection**
   - Default: `http://localhost:6333`
   - Update if using a different Qdrant instance

3. **Activate the Workflow**
   - Click the toggle switch to activate

4. **Test the Workflow**
   ```bash
   curl -X POST http://localhost:5678/webhook/sync-full-catalog
   ```

## Workflow Features

- **Full Catalog Sync**: Fetches ALL products from Shopware
- **Pagination**: Handles large catalogs efficiently
- **Enhanced Data**: Includes variants, reviews, categories, cross-selling
- **AI Optimization**: Structured for semantic search
- **Error Handling**: Continues on errors, logs issues
- **Progress Tracking**: Real-time progress updates

## Troubleshooting

### Authentication Failed
- Check your API key or credentials
- Ensure n8n API is enabled
- Verify the n8n URL is correct

### Workflow Not Found
- Check if the workflow file exists
- Ensure you're in the correct directory

### Connection Refused
- Verify n8n is running
- Check the URL and port
- Ensure no firewall blocking

### Deployment Succeeds but Workflow Fails
- Check Shopware API credentials
- Verify Qdrant is running
- Review n8n execution logs

## Environment Variables

You can set these before running the scripts:

```bash
export N8N_URL="http://localhost:5678"
export N8N_API_KEY="your-api-key"
# OR
export N8N_USERNAME="admin@example.com"
export N8N_PASSWORD="your-password"
```

## Security Notes

- Never commit API keys or passwords
- Use environment variables for credentials
- Consider using n8n's built-in credential management
- Restrict API access in production environments

## Support

If you encounter issues:
1. Check n8n logs: `docker logs n8n` (if using Docker)
2. Verify all services are running
3. Test API endpoints manually
4. Review workflow execution history in n8n UI