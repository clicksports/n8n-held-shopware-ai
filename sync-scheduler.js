/**
 * Incremental Sync Scheduler
 * Manages continuous synchronization of Shopware data to Qdrant
 */

const EnhancedDataPipeline = require('./enhanced-data-pipeline');
const ShopwareAPIClient = require('./shopware-api-client');
const axios = require('axios');
const fs = require('fs').promises;

class SyncScheduler {
  constructor(config = {}) {
    this.pipeline = new EnhancedDataPipeline(config);
    this.shopwareClient = new ShopwareAPIClient(config.shopware);
    this.qdrantUrl = config.qdrant?.url || 'http://localhost:6333';
    this.collectionName = config.qdrant?.collection || 'shopware_products_enhanced';
    
    // Sync configuration
    this.syncInterval = config.syncInterval || 60000; // 1 minute default
    this.fullSyncInterval = config.fullSyncInterval || 24 * 60 * 60 * 1000; // 24 hours
    this.maxRetries = config.maxRetries || 3;
    this.syncStateFile = config.syncStateFile || './sync-state.json';
    
    // State management
    this.isRunning = false;
    this.syncState = {
      lastFullSync: null,
      lastIncrementalSync: null,
      lastProcessedId: null,
      errors: [],
      stats: {
        totalProducts: 0,
        processedProducts: 0,
        errorCount: 0,
        lastSyncDuration: 0
      }
    };
    
    this.loadSyncState();
  }

  /**
   * Load sync state from file
   */
  async loadSyncState() {
    try {
      const stateData = await fs.readFile(this.syncStateFile, 'utf8');
      this.syncState = { ...this.syncState, ...JSON.parse(stateData) };
      console.log('Loaded sync state:', this.syncState);
    } catch (error) {
      console.log('No existing sync state found, starting fresh');
    }
  }

  /**
   * Save sync state to file
   */
  async saveSyncState() {
    try {
      await fs.writeFile(this.syncStateFile, JSON.stringify(this.syncState, null, 2));
    } catch (error) {
      console.error('Error saving sync state:', error.message);
    }
  }

  /**
   * Start the sync scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('Sync scheduler is already running');
      return;
    }

    console.log('Starting sync scheduler...');
    this.isRunning = true;

    // Initial health check
    const healthCheck = await this.shopwareClient.healthCheck();
    if (healthCheck.status !== 'healthy') {
      console.error('Shopware API health check failed:', healthCheck.error);
      this.isRunning = false;
      return;
    }

    // Determine if we need a full sync
    const needsFullSync = this.needsFullSync();
    
    if (needsFullSync) {
      console.log('Performing initial full sync...');
      await this.performFullSync();
    }

    // Start incremental sync loop
    this.startIncrementalSyncLoop();
    
    console.log('Sync scheduler started successfully');
  }

  /**
   * Stop the sync scheduler
   */
  async stop() {
    console.log('Stopping sync scheduler...');
    this.isRunning = false;
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    await this.saveSyncState();
    console.log('Sync scheduler stopped');
  }

  /**
   * Check if full sync is needed
   */
  needsFullSync() {
    if (!this.syncState.lastFullSync) return true;
    
    const lastFullSync = new Date(this.syncState.lastFullSync);
    const now = new Date();
    const timeSinceLastFullSync = now - lastFullSync;
    
    return timeSinceLastFullSync > this.fullSyncInterval;
  }

  /**
   * Perform full synchronization
   */
  async performFullSync() {
    console.log('Starting full sync...');
    const startTime = Date.now();
    
    try {
      // Get all products from Shopware
      let page = 1;
      let hasMore = true;
      let allProductIds = [];
      
      while (hasMore) {
        console.log(`Fetching product page ${page}...`);
        const result = await this.shopwareClient.getAllProducts(page, 50);
        
        if (result.products.length === 0) {
          hasMore = false;
        } else {
          const productIds = result.products.map(p => p.id);
          allProductIds = allProductIds.concat(productIds);
          hasMore = result.hasMore;
          page++;
        }
      }

      console.log(`Found ${allProductIds.length} products for full sync`);
      
      // Process all products
      this.syncState.stats.totalProducts = allProductIds.length;
      this.syncState.stats.processedProducts = 0;
      this.syncState.stats.errorCount = 0;
      
      const enhancedProducts = await this.pipeline.processAndUploadProducts(allProductIds);
      
      // Update sync state
      this.syncState.lastFullSync = new Date().toISOString();
      this.syncState.lastIncrementalSync = new Date().toISOString();
      this.syncState.stats.processedProducts = enhancedProducts.length;
      this.syncState.stats.lastSyncDuration = Date.now() - startTime;
      
      await this.saveSyncState();
      
      console.log(`Full sync completed: ${enhancedProducts.length} products processed in ${this.syncState.stats.lastSyncDuration}ms`);
      
    } catch (error) {
      console.error('Full sync failed:', error.message);
      this.syncState.errors.push({
        type: 'full_sync',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      await this.saveSyncState();
      throw error;
    }
  }

  /**
   * Start incremental sync loop
   */
  startIncrementalSyncLoop() {
    this.syncTimer = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.performIncrementalSync();
      } catch (error) {
        console.error('Incremental sync error:', error.message);
        this.syncState.errors.push({
          type: 'incremental_sync',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        await this.saveSyncState();
      }
    }, this.syncInterval);
  }

  /**
   * Perform incremental synchronization
   */
  async performIncrementalSync() {
    const startTime = Date.now();
    
    try {
      const lastSync = new Date(this.syncState.lastIncrementalSync || 0);
      
      // Get products updated since last sync
      const updatedProducts = await this.getUpdatedProducts(lastSync);
      
      if (updatedProducts.length === 0) {
        console.log('No products updated since last sync');
        return;
      }

      console.log(`Found ${updatedProducts.length} updated products for incremental sync`);
      
      // Process updated products
      const productIds = updatedProducts.map(p => p.id);
      const enhancedProducts = await this.pipeline.processAndUploadProducts(productIds);
      
      // Update sync state
      this.syncState.lastIncrementalSync = new Date().toISOString();
      this.syncState.stats.lastSyncDuration = Date.now() - startTime;
      
      await this.saveSyncState();
      
      console.log(`Incremental sync completed: ${enhancedProducts.length} products updated in ${this.syncState.stats.lastSyncDuration}ms`);
      
    } catch (error) {
      console.error('Incremental sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Get products updated since last sync
   */
  async getUpdatedProducts(since) {
    try {
      // Format date for Shopware API
      const sinceISO = since.toISOString();
      
      const response = await this.shopwareClient.client.post('/search/product', {
        limit: 100,
        filter: [
          {
            type: 'equals',
            field: 'active',
            value: true
          },
          {
            type: 'range',
            field: 'updatedAt',
            parameters: {
              gte: sinceISO
            }
          }
        ],
        includes: {
          product: ['id', 'productNumber', 'updatedAt']
        },
        sort: [
          {
            field: 'updatedAt',
            order: 'ASC'
          }
        ]
      });
      
      return response.data.data || [];
      
    } catch (error) {
      console.error('Error fetching updated products:', error.message);
      return [];
    }
  }

  /**
   * Manual sync trigger for specific products
   */
  async syncProducts(productIds) {
    console.log(`Manual sync triggered for ${productIds.length} products`);
    
    try {
      const enhancedProducts = await this.pipeline.processAndUploadProducts(productIds);
      
      this.syncState.lastIncrementalSync = new Date().toISOString();
      await this.saveSyncState();
      
      console.log(`Manual sync completed: ${enhancedProducts.length} products processed`);
      return enhancedProducts;
      
    } catch (error) {
      console.error('Manual sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      ...this.syncState.stats,
      isRunning: this.isRunning,
      lastFullSync: this.syncState.lastFullSync,
      lastIncrementalSync: this.syncState.lastIncrementalSync,
      errorCount: this.syncState.errors.length,
      recentErrors: this.syncState.errors.slice(-5)
    };
  }

  /**
   * Health check for sync system
   */
  async healthCheck() {
    const shopwareHealth = await this.shopwareClient.healthCheck();
    
    let qdrantHealth;
    try {
      const response = await axios.get(`${this.qdrantUrl}/collections/${this.collectionName}`);
      qdrantHealth = { status: 'healthy', collection: response.data.result };
    } catch (error) {
      qdrantHealth = { status: 'unhealthy', error: error.message };
    }
    
    return {
      scheduler: {
        status: this.isRunning ? 'running' : 'stopped',
        stats: this.syncState.stats
      },
      shopware: shopwareHealth,
      qdrant: qdrantHealth,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clean up old errors from state
   */
  cleanupErrors(maxErrors = 100) {
    if (this.syncState.errors.length > maxErrors) {
      this.syncState.errors = this.syncState.errors.slice(-maxErrors);
    }
  }
}

module.exports = SyncScheduler;