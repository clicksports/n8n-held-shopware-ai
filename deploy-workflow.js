#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration - Update these values for your n8n instance
const config = {
  n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
  apiKey: process.env.N8N_API_KEY || '', // Set this if using API key auth
  username: process.env.N8N_USERNAME || 'admin@example.com',
  password: process.env.N8N_PASSWORD || 'password',
  workflowFile: './shopware-to-qdrant-full-catalog.json'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.href.startsWith('https') ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Function to get auth cookie (if not using API key)
async function authenticate() {
  if (config.apiKey) {
    return { 'X-N8N-API-KEY': config.apiKey };
  }

  console.log('🔐 Authenticating with n8n...');
  
  const authUrl = new URL('/rest/login', config.n8nUrl);
  const options = {
    href: authUrl.href,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  try {
    const response = await makeRequest(options, {
      email: config.username,
      password: config.password
    });

    console.log('✅ Authentication successful');
    return {
      'Cookie': response.cookie || '',
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

// Function to check if workflow already exists
async function checkExistingWorkflow(headers, workflowName) {
  console.log('🔍 Checking for existing workflow...');
  
  const url = new URL('/api/v1/workflows', config.n8nUrl);
  const options = {
    href: url.href,
    method: 'GET',
    headers
  };

  try {
    const workflows = await makeRequest(options);
    const existing = workflows.data?.find(w => w.name === workflowName);
    
    if (existing) {
      console.log(`📋 Found existing workflow: ${existing.name} (ID: ${existing.id})`);
      return existing.id;
    }
    
    console.log('📄 No existing workflow found');
    return null;
  } catch (error) {
    console.error('⚠️  Error checking workflows:', error.message);
    return null;
  }
}

// Function to deploy workflow
async function deployWorkflow(headers, workflowData, existingId = null) {
  const endpoint = existingId 
    ? `/api/v1/workflows/${existingId}` 
    : '/api/v1/workflows';
  
  const method = existingId ? 'PUT' : 'POST';
  const action = existingId ? 'Updating' : 'Creating';
  
  console.log(`🚀 ${action} workflow...`);
  
  const url = new URL(endpoint, config.n8nUrl);
  const options = {
    href: url.href,
    method: method,
    headers
  };

  // Prepare workflow data
  const deployData = {
    ...workflowData,
    active: false // Start inactive, user can activate manually
  };

  // Remove fields that might cause issues
  delete deployData.id;
  delete deployData.createdAt;
  delete deployData.updatedAt;

  try {
    const response = await makeRequest(options, deployData);
    console.log(`✅ Workflow ${existingId ? 'updated' : 'created'} successfully!`);
    console.log(`   ID: ${response.data?.id || existingId}`);
    console.log(`   Name: ${response.data?.name || workflowData.name}`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to ${action.toLowerCase()} workflow:`, error.message);
    throw error;
  }
}

// Main deployment function
async function deploy() {
  console.log('🎯 Starting n8n workflow deployment...');
  console.log(`📍 Target: ${config.n8nUrl}`);
  
  try {
    // Read workflow file
    console.log(`📖 Reading workflow file: ${config.workflowFile}`);
    const workflowPath = path.resolve(config.workflowFile);
    
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }
    
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    console.log(`📋 Workflow: ${workflowData.name} (v${workflowData.version})`);

    // Authenticate
    const headers = await authenticate();

    // Check for existing workflow
    const existingId = await checkExistingWorkflow(headers, workflowData.name);

    // Deploy workflow
    const result = await deployWorkflow(headers, workflowData, existingId);

    // Success message
    console.log('\n✨ Deployment complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Go to your n8n instance');
    console.log('   2. Navigate to the workflow');
    console.log('   3. Configure Shopware API credentials if needed');
    console.log('   4. Activate the workflow');
    console.log('   5. Test with: POST ' + config.n8nUrl + '/webhook/sync-full-catalog');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploy();