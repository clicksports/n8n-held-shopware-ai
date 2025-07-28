#!/usr/bin/env node
/**
 * Autonomous Shopware to Qdrant Sync Service
 * Runs independently and maintains consolidated product data
 */

const EnhancedDataPipeline = require('./enhanced-data-pipeline');
const SyncScheduler = require('./sync-scheduler');
const axios = require('axios');
const fs = require('fs').promises;

class AutonomousSyncService {
  constructor() {
    this.config = {
      shopware: {
        baseURL: process.env.SHOPWARE_URL || 'https://shop.held.de',
        apiKey: process.env.SHOPWARE_API_KEY,
        version: 'v3'
      },
      qdrant: {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        collection: 'shopware_products'
      },
      sync: {
        interval: parseInt(process.env.SYNC_INTERVAL) || 300000, // 5 minutes
        fullSyncInterval: parseInt(process.env.FULL_SYNC_INTERVAL) || 86400000, // 24 hours
        batchSize: parseInt(process.env.BATCH_SIZE) || 10
      },
      server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0'
      }
    };

    this.scheduler = new SyncScheduler(this.config);
    this.isRunning = false;
    this.stats = {
      startTime: null,
      lastSync: null,
      totalSyncs: 0,
      errorCount: 0,
      productsProcessed: 0
    };
  }

  /**
   * Start the autonomous service
   */
  async start() {
    console.log('🚀 Starting Autonomous Shopware-Qdrant Sync Service...');
    
    try {
      // Validate configuration
      await this.validateConfig();
      
      // Initialize services
      await this.initializeServices();
      
      // Start sync scheduler
      await this.scheduler.start();
      
      // Start monitoring server
      await this.startMonitoringServer();
      
      this.isRunning = true;
      this.stats.startTime = new Date().toISOString();
      
      console.log('✅ Autonomous sync service started successfully');
      console.log(`📊 Monitoring server: http://${this.config.server.host}:${this.config.server.port}`);
      console.log(`🔄 Sync interval: ${this.config.sync.interval / 1000}s`);
      console.log(`📅 Full sync interval: ${this.config.sync.fullSyncInterval / 60000}min`);
      
      // Handle graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('❌ Failed to start autonomous sync service:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig() {
    console.log('🔍 Validating configuration...');
    
    // Check Shopware API key
    if (!this.config.shopware.apiKey && !process.env.SHOPWARE_API_KEY) {
      throw new Error('SHOPWARE_API_KEY environment variable is required');
    }
    
    // Test Shopware connection
    try {
      const response = await axios.get(`${this.config.shopware.baseURL}/api/_info/version`, {
        headers: {
          'Authorization': `Bearer ${this.config.shopware.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      console.log(`✅ Shopware connection: ${response.data.version}`);
    } catch (error) {
      throw new Error(`Failed to connect to Shopware: ${error.message}`);
    }
    
    // Test Qdrant connection
    try {
      const response = await axios.get(`${this.config.qdrant.url}/collections`);
      console.log('✅ Qdrant connection successful');
    } catch (error) {
      throw new Error(`Failed to connect to Qdrant: ${error.message}`);
    }
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    console.log('🔧 Initializing services...');
    
    // Ensure Qdrant collection exists with proper schema
    await this.ensureQdrantCollection();
    
    console.log('✅ Services initialized');
  }

  /**
   * Ensure Qdrant collection exists with proper schema
   */
  async ensureQdrantCollection() {
    try {
      // Check if collection exists
      const response = await axios.get(`${this.config.qdrant.url}/collections/${this.config.qdrant.collection}`);
      console.log('✅ Qdrant collection exists');
    } catch (error) {
      if (error.response?.status === 404) {
        // Create collection
        console.log('📦 Creating Qdrant collection...');
        await axios.put(`${this.config.qdrant.url}/collections/${this.config.qdrant.collection}`, {
          vectors: {
            size: 1536,
            distance: "Cosine"
          }
        });
        console.log('✅ Qdrant collection created');
      } else {
        throw error;
      }
    }
  }

  /**
   * Start monitoring server
   */
  async startMonitoringServer() {
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: this.isRunning ? 'healthy' : 'unhealthy',
        uptime: this.stats.startTime ? Date.now() - new Date(this.stats.startTime).getTime() : 0,
        stats: this.stats,
        config: {
          syncInterval: this.config.sync.interval,
          fullSyncInterval: this.config.sync.fullSyncInterval,
          batchSize: this.config.sync.batchSize
        }
      });
    });
    
    // Statistics endpoint
    app.get('/stats', async (req, res) => {
      const syncStats = this.scheduler.getSyncStats();
      const qdrantStats = await this.getQdrantStats();
      
      res.json({
        service: this.stats,
        sync: syncStats,
        qdrant: qdrantStats
      });
    });
    
    // Manual sync trigger
    app.post('/sync', async (req, res) => {
      try {
        console.log('🔄 Manual sync triggered via API');
        const result = await this.scheduler.performIncrementalSync();
        res.json({ success: true, result });
      } catch (error) {
        console.error('❌ Manual sync failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Full sync trigger
    app.post('/sync/full', async (req, res) => {
      try {
        console.log('🔄 Full sync triggered via API');
        const result = await this.scheduler.performFullSync();
        res.json({ success: true, result });
      } catch (error) {
        console.error('❌ Full sync failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Clear collection endpoint
    app.delete('/collection', async (req, res) => {
      try {
        console.log('🗑️ Clearing Qdrant collection via API');
        await axios.delete(`${this.config.qdrant.url}/collections/${this.config.qdrant.collection}`);
        await this.ensureQdrantCollection();
        res.json({ success: true, message: 'Collection cleared and recreated' });
      } catch (error) {
        console.error('❌ Failed to clear collection:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Sample data endpoint for testing
    app.post('/sample-data', async (req, res) => {
      try {
        console.log('📝 Uploading sample data via API');
        const { exec } = require('child_process');
        exec('node upload-ai-optimized.js', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Sample data upload failed:', error.message);
            res.status(500).json({ success: false, error: error.message });
          } else {
            console.log('✅ Sample data uploaded successfully');
            res.json({ success: true, message: 'Sample data uploaded', output: stdout });
          }
        });
      } catch (error) {
        console.error('❌ Sample data upload failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Start server
    return new Promise((resolve) => {
      this.server = app.listen(this.config.server.port, this.config.server.host, () => {
        console.log(`📊 Monitoring server started on http://${this.config.server.host}:${this.config.server.port}`);
        resolve();
      });
    });
  }

  /**
   * Get Qdrant collection statistics
   */
  async getQdrantStats() {
    try {
      const response = await axios.get(`${this.config.qdrant.url}/collections/${this.config.qdrant.collection}`);
      return {
        status: 'healthy',
        collection: response.data.result
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📛 Received ${signal}. Shutting down gracefully...`);
      
      this.isRunning = false;
      
      // Stop scheduler
      if (this.scheduler) {
        await this.scheduler.stop();
      }
      
      // Close monitoring server
      if (this.server) {
        this.server.close(() => {
          console.log('📊 Monitoring server closed');
        });
      }
      
      console.log('✅ Autonomous sync service stopped gracefully');
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon
  }

  /**
   * Run periodic maintenance
   */
  async runMaintenance() {
    console.log('🧹 Running maintenance tasks...');
    
    try {
      // Clean up old sync state errors
      this.scheduler.cleanupErrors(50);
      
      // Log statistics
      const stats = this.scheduler.getSyncStats();
      console.log(`📊 Sync Stats: ${stats.processedProducts} products, ${stats.errorCount} errors`);
      
    } catch (error) {
      console.error('❌ Maintenance failed:', error.message);
    }
  }
}

// CLI interface
if (require.main === module) {
  const service = new AutonomousSyncService();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Autonomous Shopware-Qdrant Sync Service

Usage: node autonomous-sync-service.js [options]

Environment Variables:
  SHOPWARE_URL         Shopware API base URL (default: https://shop.held.de)
  SHOPWARE_API_KEY     Shopware API key (required)
  QDRANT_URL          Qdrant server URL (default: http://localhost:6333)
  SYNC_INTERVAL       Sync interval in ms (default: 300000 = 5min)
  FULL_SYNC_INTERVAL  Full sync interval in ms (default: 86400000 = 24h)
  BATCH_SIZE          Processing batch size (default: 10)
  PORT                Monitoring server port (default: 3000)
  HOST                Monitoring server host (default: 0.0.0.0)

API Endpoints:
  GET  /health        Health check and service status
  GET  /stats         Detailed statistics
  POST /sync          Trigger manual incremental sync
  POST /sync/full     Trigger manual full sync
  DELETE /collection  Clear and recreate Qdrant collection
  POST /sample-data   Upload sample data for testing

Options:
  --help, -h          Show this help message
    `);
    process.exit(0);
  }
  
  // Start the service
  service.start().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = AutonomousSyncService;