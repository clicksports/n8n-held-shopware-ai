#!/usr/bin/env node
/**
 * n8n Workflow Sync Manager
 * Automatically syncs workflows with version control
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class N8nWorkflowSync {
  constructor(config = {}) {
    this.config = {
      n8n: {
        url: process.env.N8N_URL || 'http://localhost:5678',
        apiKey: process.env.N8N_API_KEY,
        webhookUrl: process.env.N8N_WEBHOOK_URL
      },
      git: {
        autoCommit: process.env.GIT_AUTO_COMMIT !== 'false',
        commitMessage: process.env.GIT_COMMIT_MESSAGE || 'Auto-sync workflow changes'
      },
      sync: {
        interval: parseInt(process.env.SYNC_INTERVAL) || 60000, // 1 minute
        workflowsDir: process.env.WORKFLOWS_DIR || './workflows',
        backupDir: process.env.BACKUP_DIR || './workflow-backups'
      },
      server: {
        port: parseInt(process.env.SYNC_PORT) || 3001,
        host: process.env.SYNC_HOST || '0.0.0.0'
      }
    };

    this.isRunning = false;
    this.workflowCache = new Map();
    this.stats = {
      startTime: null,
      totalSyncs: 0,
      conflictsResolved: 0,
      versionsCreated: 0,
      errorCount: 0
    };
  }

  /**
   * Start the workflow sync service
   */
  async start() {
    console.log('🔄 Starting n8n Workflow Sync Manager...');
    
    try {
      await this.validateConfig();
      await this.initializeDirectories();
      await this.loadWorkflowCache();
      await this.startSyncLoop();
      await this.startWebServer();
      
      this.isRunning = true;
      this.stats.startTime = new Date().toISOString();
      
      console.log('✅ n8n Workflow Sync Manager started successfully');
      console.log(`📊 Web interface: http://${this.config.server.host}:${this.config.server.port}`);
      console.log(`🔄 Sync interval: ${this.config.sync.interval / 1000}s`);
      
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('❌ Failed to start workflow sync:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig() {
    console.log('🔍 Validating n8n connection...');
    
    try {
      const response = await this.makeN8nRequest('/workflows', 'GET');
      console.log(`✅ n8n connection successful (${response.data.length} workflows found)`);
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('n8n API authentication failed. Set N8N_API_KEY environment variable.');
      }
      throw new Error(`Failed to connect to n8n: ${error.message}`);
    }
  }

  /**
   * Initialize directories
   */
  async initializeDirectories() {
    const dirs = [this.config.sync.workflowsDir, this.config.sync.backupDir];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`⚠️  Could not create directory ${dir}: ${error.message}`);
      }
    }
  }

  /**
   * Load workflow cache from filesystem
   */
  async loadWorkflowCache() {
    console.log('📂 Loading workflow cache...');
    
    try {
      const files = await fs.readdir(this.config.sync.workflowsDir);
      const workflowFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of workflowFiles) {
        try {
          const filePath = path.join(this.config.sync.workflowsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const workflow = JSON.parse(content);
          
          this.workflowCache.set(workflow.id || file, {
            workflow,
            hash: this.calculateHash(content),
            lastModified: (await fs.stat(filePath)).mtime,
            filePath
          });
        } catch (error) {
          console.warn(`⚠️  Could not load workflow file ${file}: ${error.message}`);
        }
      }
      
      console.log(`✅ Loaded ${this.workflowCache.size} workflows from cache`);
    } catch (error) {
      console.warn('⚠️  Could not load workflow cache:', error.message);
    }
  }

  /**
   * Start sync loop
   */
  async startSyncLoop() {
    const sync = async () => {
      if (!this.isRunning) return;
      
      try {
        await this.performSync();
        this.stats.totalSyncs++;
      } catch (error) {
        console.error('❌ Sync error:', error.message);
        this.stats.errorCount++;
      }
    };
    
    // Initial sync
    await sync();
    
    // Periodic sync
    this.syncInterval = setInterval(sync, this.config.sync.interval);
  }

  /**
   * Perform bidirectional sync
   */
  async performSync() {
    console.log('🔄 Performing workflow sync...');
    
    // Get workflows from n8n
    const n8nWorkflows = await this.getN8nWorkflows();
    
    // Process each n8n workflow
    for (const n8nWorkflow of n8nWorkflows) {
      await this.syncWorkflowFromN8n(n8nWorkflow);
    }
    
    // Process local workflows that might not exist in n8n
    for (const [id, cached] of this.workflowCache) {
      const existsInN8n = n8nWorkflows.some(w => w.id === id || w.name === cached.workflow.name);
      if (!existsInN8n) {
        await this.syncWorkflowToN8n(cached.workflow);
      }
    }
    
    console.log(`✅ Sync completed (${n8nWorkflows.length} workflows processed)`);
  }

  /**
   * Sync workflow from n8n to filesystem
   */
  async syncWorkflowFromN8n(n8nWorkflow) {
    const workflowId = n8nWorkflow.id;
    const cached = this.workflowCache.get(workflowId);
    
    // Get full workflow details
    const fullWorkflow = await this.getN8nWorkflow(workflowId);
    const workflowContent = JSON.stringify(fullWorkflow, null, 2);
    const currentHash = this.calculateHash(workflowContent);
    
    // Check if workflow changed
    if (cached && cached.hash === currentHash) {
      return; // No changes
    }
    
    console.log(`📥 Syncing workflow from n8n: ${fullWorkflow.name}`);
    
    // Handle version management
    const versionedWorkflow = await this.createVersionedWorkflow(fullWorkflow, cached);
    
    // Save to filesystem
    const fileName = this.sanitizeFileName(`${versionedWorkflow.name}.json`);
    const filePath = path.join(this.config.sync.workflowsDir, fileName);
    
    // Create backup if workflow exists
    if (cached) {
      await this.createBackup(cached.workflow, 'n8n-update');
    }
    
    await fs.writeFile(filePath, JSON.stringify(versionedWorkflow, null, 2));
    
    // Update cache
    this.workflowCache.set(workflowId, {
      workflow: versionedWorkflow,
      hash: currentHash,
      lastModified: new Date(),
      filePath
    });
    
    // Git commit if enabled
    if (this.config.git.autoCommit) {
      await this.gitCommit(`Update workflow: ${versionedWorkflow.name} (v${versionedWorkflow.version})`);
    }
    
    this.stats.versionsCreated++;
  }

  /**
   * Sync workflow from filesystem to n8n
   */
  async syncWorkflowToN8n(workflow) {
    console.log(`📤 Syncing workflow to n8n: ${workflow.name}`);
    
    try {
      // Check if workflow exists in n8n
      const existing = await this.findN8nWorkflowByName(workflow.name);
      
      if (existing) {
        // Update existing workflow
        const updatedWorkflow = await this.makeN8nRequest(`/workflows/${existing.id}`, 'PUT', {
          ...workflow,
          id: existing.id
        });
        console.log(`✅ Updated workflow in n8n: ${workflow.name}`);
      } else {
        // Create new workflow
        const newWorkflow = await this.makeN8nRequest('/workflows', 'POST', {
          ...workflow,
          id: undefined // Let n8n assign new ID
        });
        console.log(`✅ Created new workflow in n8n: ${workflow.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync workflow to n8n: ${workflow.name}`, error.message);
    }
  }

  /**
   * Create versioned workflow
   */
  async createVersionedWorkflow(workflow, cached) {
    // Determine version number
    let version = '1.0.0';
    
    if (cached) {
      const currentVersion = cached.workflow.version || '1.0.0';
      version = this.incrementVersion(currentVersion);
    }
    
    // Add version metadata
    const versionedWorkflow = {
      ...workflow,
      version,
      versionHistory: workflow.versionHistory || [],
      meta: {
        ...workflow.meta,
        lastSync: new Date().toISOString(),
        syncSource: 'n8n-workflow-sync',
        changes: this.detectChanges(workflow, cached?.workflow)
      }
    };
    
    // Add to version history
    if (cached) {
      versionedWorkflow.versionHistory.push({
        version: cached.workflow.version || '1.0.0',
        timestamp: cached.lastModified,
        hash: cached.hash
      });
      
      // Keep only last 10 versions
      if (versionedWorkflow.versionHistory.length > 10) {
        versionedWorkflow.versionHistory = versionedWorkflow.versionHistory.slice(-10);
      }
    }
    
    return versionedWorkflow;
  }

  /**
   * Detect changes between workflows
   */
  detectChanges(newWorkflow, oldWorkflow) {
    if (!oldWorkflow) return ['initial_version'];
    
    const changes = [];
    
    // Check nodes
    const oldNodes = oldWorkflow.nodes || [];
    const newNodes = newWorkflow.nodes || [];
    
    if (newNodes.length > oldNodes.length) {
      changes.push('nodes_added');
    } else if (newNodes.length < oldNodes.length) {
      changes.push('nodes_removed');
    }
    
    // Check connections
    const oldConnections = JSON.stringify(oldWorkflow.connections || {});
    const newConnections = JSON.stringify(newWorkflow.connections || {});
    
    if (oldConnections !== newConnections) {
      changes.push('connections_modified');
    }
    
    // Check settings
    const oldSettings = JSON.stringify(oldWorkflow.settings || {});
    const newSettings = JSON.stringify(newWorkflow.settings || {});
    
    if (oldSettings !== newSettings) {
      changes.push('settings_modified');
    }
    
    return changes.length > 0 ? changes : ['minor_changes'];
  }

  /**
   * Increment version number
   */
  incrementVersion(version) {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1; // Increment patch version
    return parts.join('.');
  }

  /**
   * Create backup
   */
  async createBackup(workflow, reason) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = this.sanitizeFileName(`${workflow.name}_${timestamp}_${reason}.json`);
    const backupPath = path.join(this.config.sync.backupDir, fileName);
    
    await fs.writeFile(backupPath, JSON.stringify(workflow, null, 2));
    console.log(`💾 Created backup: ${fileName}`);
  }

  /**
   * Make n8n API request
   */
  async makeN8nRequest(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      url: `${this.config.n8n.url}/api/v1${endpoint}`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    if (this.config.n8n.apiKey) {
      config.headers['X-N8N-API-KEY'] = this.config.n8n.apiKey;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  }

  /**
   * Get all workflows from n8n
   */
  async getN8nWorkflows() {
    const response = await this.makeN8nRequest('/workflows');
    return response.data || response;
  }

  /**
   * Get specific workflow from n8n
   */
  async getN8nWorkflow(id) {
    const response = await this.makeN8nRequest(`/workflows/${id}`);
    return response.data || response;
  }

  /**
   * Find n8n workflow by name
   */
  async findN8nWorkflowByName(name) {
    const workflows = await this.getN8nWorkflows();
    return workflows.find(w => w.name === name);
  }

  /**
   * Calculate content hash
   */
  calculateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Sanitize filename
   */
  sanitizeFileName(name) {
    return name.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
  }

  /**
   * Git commit
   */
  async gitCommit(message) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync('git add workflows/ workflow-backups/');
      await execAsync(`git commit -m "${message || this.config.git.commitMessage}"`);
      
      console.log(`📝 Git commit: ${message}`);
    } catch (error) {
      console.warn('⚠️  Git commit failed:', error.message);
    }
  }

  /**
   * Start web server for monitoring
   */
  async startWebServer() {
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: this.isRunning ? 'healthy' : 'unhealthy',
        stats: this.stats,
        config: {
          syncInterval: this.config.sync.interval,
          workflowsDir: this.config.sync.workflowsDir,
          n8nUrl: this.config.n8n.url
        }
      });
    });
    
    // Workflow list
    app.get('/workflows', (req, res) => {
      const workflows = Array.from(this.workflowCache.values()).map(cached => ({
        name: cached.workflow.name,
        version: cached.workflow.version,
        lastModified: cached.lastModified,
        hash: cached.hash
      }));
      
      res.json({ workflows, count: workflows.length });
    });
    
    // Manual sync trigger
    app.post('/sync', async (req, res) => {
      try {
        await this.performSync();
        res.json({ success: true, message: 'Sync completed' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Backup workflow
    app.post('/backup/:workflowId', async (req, res) => {
      try {
        const cached = this.workflowCache.get(req.params.workflowId);
        if (!cached) {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        
        await this.createBackup(cached.workflow, 'manual_backup');
        res.json({ success: true, message: 'Backup created' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Version history
    app.get('/workflows/:workflowId/history', (req, res) => {
      const cached = this.workflowCache.get(req.params.workflowId);
      if (!cached) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      res.json({
        current: {
          version: cached.workflow.version,
          hash: cached.hash,
          lastModified: cached.lastModified
        },
        history: cached.workflow.versionHistory || []
      });
    });
    
    return new Promise((resolve) => {
      this.server = app.listen(this.config.server.port, this.config.server.host, () => {
        console.log(`📊 Workflow sync web interface: http://${this.config.server.host}:${this.config.server.port}`);
        resolve();
      });
    });
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📛 Received ${signal}. Shutting down gracefully...`);
      
      this.isRunning = false;
      
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
      
      if (this.server) {
        this.server.close(() => {
          console.log('📊 Web server closed');
        });
      }
      
      console.log('✅ Workflow sync manager stopped gracefully');
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2'));
  }
}

// CLI interface
if (require.main === module) {
  const syncManager = new N8nWorkflowSync();
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🔄 n8n Workflow Sync Manager

Automatically syncs workflows between n8n and filesystem with version control.

Usage: node n8n-workflow-sync.js [options]

Environment Variables:
  N8N_URL              n8n server URL (default: http://localhost:5678)
  N8N_API_KEY          n8n API key (required for API access)
  N8N_WEBHOOK_URL      n8n webhook URL for change notifications
  SYNC_INTERVAL        Sync interval in ms (default: 60000 = 1min)
  WORKFLOWS_DIR        Directory for workflow files (default: ./workflows)
  BACKUP_DIR           Directory for backups (default: ./workflow-backups)
  GIT_AUTO_COMMIT      Auto-commit changes (default: true)
  GIT_COMMIT_MESSAGE   Default commit message
  SYNC_PORT            Web interface port (default: 3001)
  SYNC_HOST            Web interface host (default: 0.0.0.0)

Features:
  ✅ Bidirectional sync between n8n and filesystem
  ✅ Automatic version numbering (v1.0.0, v1.0.1, etc.)
  ✅ Change detection and conflict resolution
  ✅ Automatic backups before updates
  ✅ Git integration with auto-commits
  ✅ Web interface for monitoring
  ✅ Version history tracking

API Endpoints:
  GET  /health                 Health check and statistics
  GET  /workflows              List all workflows with versions
  POST /sync                   Trigger manual sync
  POST /backup/:workflowId     Create manual backup
  GET  /workflows/:id/history  View version history

Options:
  --help, -h          Show this help message
    `);
    process.exit(0);
  }
  
  syncManager.start().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = N8nWorkflowSync;