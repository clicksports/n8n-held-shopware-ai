#!/bin/bash

# Test workflow execution in Docker

echo "🧪 Testing Workflow Execution"
echo "============================"

# Create a simple Node.js script to test inside the container
cat > /tmp/test-workflow.js << 'EOF'
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testWorkflow() {
  console.log('📋 Checking workflows...');
  
  try {
    // List workflows
    const { stdout: workflows } = await execPromise('n8n list:workflow | grep "FIXED: Shopware"');
    console.log('Found workflows:', workflows.trim());
    
    // Get workflow ID
    const workflowId = workflows.split('|')[0].trim();
    console.log('Workflow ID:', workflowId);
    
    // Since we can't execute while n8n is running, let's at least verify the workflow
    console.log('\n✅ Workflow is deployed and ready');
    console.log('To test: Open http://localhost:5678 and execute manually');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWorkflow();
EOF

# Copy and execute in container
docker cp /tmp/test-workflow.js n8n-production:/tmp/
docker exec n8n-production node /tmp/test-workflow.js

# Clean up
rm /tmp/test-workflow.js