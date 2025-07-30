// Test workflow execution script
const http = require('http');

const workflowId = '11mycuAAkjv6c2qY';
const n8nUrl = 'http://localhost:5678';

// First, let's check if the workflow exists
const checkWorkflow = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5678,
      path: `/api/v1/workflows/${workflowId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Workflow found:', JSON.parse(data).name);
          resolve();
        } else {
          console.log('❌ Workflow check failed:', res.statusCode, data);
          reject(new Error(data));
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e);
      reject(e);
    });

    req.end();
  });
};

// Execute the workflow
const executeWorkflow = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    
    const options = {
      hostname: 'localhost',
      port: 5678,
      path: `/webhook-test/${workflowId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🚀 Executing workflow...');
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response:', data);
        resolve(data);
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

// Run the test
async function runTest() {
  try {
    console.log('🔍 Testing workflow:', workflowId);
    await checkWorkflow();
    const result = await executeWorkflow();
    console.log('✅ Test complete');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();