/**
 * Qdrant Product Data Consolidation Script
 * Fetches fragmented product data and creates single points per product
 */

const axios = require('axios');

class QdrantProductConsolidator {
  constructor(qdrantUrl = 'http://localhost:6333') {
    this.qdrantUrl = qdrantUrl;
    this.collectionName = 'shopware_products';
  }

  /**
   * Fetch all points from the collection
   */
  async fetchAllPoints() {
    try {
      const response = await axios.post(`${this.qdrantUrl}/collections/${this.collectionName}/points/scroll`, {
        limit: 1000,
        with_payload: true,
        with_vector: true
      });
      
      return response.data.result.points;
    } catch (error) {
      console.error('Error fetching points:', error.message);
      return [];
    }
  }

  /**
   * Parse product content to extract structured data
   */
  parseProductContent(content) {
    // Full product article format
    if (content.startsWith('Article:')) {
      const parts = content.split(' | ');
      const parsed = { type: 'product_info' };
      
      parts.forEach(part => {
        const [key, value] = part.split(': ');
        switch (key?.trim()) {
          case 'Article':
            parsed.article = value;
            break;
          case 'Form':
            parsed.form = value;
            break;
          case 'Size':
            parsed.size = value;
            break;
          case 'Main Article':
            parsed.mainArticle = value;
            break;
          case 'EAN':
            parsed.ean = value;
            break;
          case 'Price':
            parsed.price = parseFloat(value.replace('€', ''));
            break;
          case 'Stock':
            parsed.stock = parseInt(value);
            break;
          case 'Available':
            parsed.available = value === 'Yes';
            break;
        }
      });
      
      return parsed;
    }

    // Full product format with description
    if (content.startsWith('Product:')) {
      const parts = content.split(' | ');
      const parsed = { type: 'product_full' };
      
      parts.forEach(part => {
        const [key, value] = part.split(': ', 2);
        switch (key?.trim()) {
          case 'Product':
            parsed.name = value;
            break;
          case 'Article':
            parsed.article = value;
            break;
          case 'Form':
            parsed.form = value;
            break;
          case 'Description':
            parsed.description = value;
            break;
          case 'Price':
            parsed.price = parseFloat(value.replace('€', ''));
            break;
          case 'Stock':
            parsed.stock = parseInt(value);
            break;
          case 'Available':
            parsed.available = value === 'Yes';
            break;
        }
      });
      
      return parsed;
    }

    // Product name format
    if (content.startsWith('Product ')) {
      return { 
        type: 'product_name', 
        name: content,
        article: content.replace('Product ', '')
      };
    }
    
    // URLs
    if (content.startsWith('https://shop.held.de/')) {
      return { type: 'product_url', url: content };
    }
    
    // Timestamps
    if (content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return { type: 'timestamp', timestamp: content };
    }
    
    // EAN codes (13 digits)
    if (content.match(/^\d{13}$/)) {
      return { type: 'ean', ean: content };
    }
    
    // Main article numbers (######-##)
    if (content.match(/^\d{6}-\d{2}$/)) {
      return { type: 'main_article', mainArticle: content };
    }
    
    // Variant article numbers (######-##/###-#-# SIZE)
    if (content.match(/^\d{6}-\d{2}\/\d{3}-\d+-\w+$/)) {
      return { type: 'variant_article', article: content };
    }
    
    // Product names without "Product" prefix
    if (content.match(/^[A-Z][a-z\s]+$/)) {
      return { type: 'name_only', name: content };
    }
    
    // Currency
    if (content === 'EUR') {
      return { type: 'currency', currency: content };
    }
    
    // Sizes
    if (content.match(/^\d*\s?XL$|^[SML]$/)) {
      return { type: 'size', size: content };
    }
    
    // Hashes
    if (content.match(/^[a-f0-9]{32}$/)) {
      return { type: 'hash', hash: content };
    }
    
    return { type: 'unknown', raw: content };
  }

  /**
   * Group fragments by product based on article numbers or proximity
   */
  groupFragmentsByProduct(points) {
    const products = new Map();
    const fragmentsByLine = new Map();
    
    // First pass: organize by line numbers to group related fragments
    points.forEach(point => {
      const line = point.payload.metadata.line;
      if (!fragmentsByLine.has(line)) {
        fragmentsByLine.set(line, []);
      }
      fragmentsByLine.get(line).push(point);
    });
    
    // Second pass: identify products and group fragments
    points.forEach(point => {
      const parsed = this.parseProductContent(point.payload.content);
      let productId = null;
      
      // Determine product ID
      if (parsed.mainArticle) {
        productId = parsed.mainArticle;
      } else if (parsed.article) {
        productId = parsed.article.split('/')[0] || parsed.article;
      } else if (parsed.type === 'product_info' || parsed.type === 'product_full') {
        // Look for article in the same line group
        const line = point.payload.metadata.line;
        const sameLineFragments = fragmentsByLine.get(line) || [];
        for (const fragment of sameLineFragments) {
          const fragmentParsed = this.parseProductContent(fragment.payload.content);
          if (fragmentParsed.mainArticle) {
            productId = fragmentParsed.mainArticle;
            break;
          }
        }
      }
      
      // Fallback: use line-based grouping for fragments without clear product ID
      if (!productId) {
        productId = `line_${point.payload.metadata.line}`;
      }
      
      if (!products.has(productId)) {
        products.set(productId, {
          id: productId,
          fragments: [],
          mainFragment: null
        });
      }
      
      const product = products.get(productId);
      product.fragments.push({ point, parsed });
      
      // Set main fragment (the one with most complete info)
      if (parsed.type === 'product_info' || parsed.type === 'product_full') {
        product.mainFragment = { point, parsed };
      }
    });
    
    return products;
  }

  /**
   * Create consolidated product point
   */
  createConsolidatedPoint(productData) {
    const { id, fragments, mainFragment } = productData;
    
    // Start with main fragment data or create empty structure
    const consolidated = {
      article: null,
      name: null,
      price: null,
      url: null,
      ean: null,
      stock: null,
      available: null,
      form: null,
      size: null,
      description: null
    };
    
    // Merge all fragment data
    fragments.forEach(({ parsed }) => {
      Object.keys(parsed).forEach(key => {
        if (key !== 'type' && parsed[key] !== undefined && consolidated[key] === null) {
          consolidated[key] = parsed[key];
        }
      });
    });
    
    // Use main fragment for vector if available
    const vectorSource = mainFragment?.point || fragments[0]?.point;
    
    return {
      id: id,
      payload: {
        content: this.formatConsolidatedContent(consolidated),
        metadata: {
          article: consolidated.article,
          price: consolidated.price,
          url: consolidated.url,
          ean: consolidated.ean,
          stock: consolidated.stock,
          available: consolidated.available,
          consolidated_from_fragments: fragments.length,
          source_lines: fragments.map(f => f.point.payload.metadata.line)
        }
      },
      vector: vectorSource?.vector || null
    };
  }

  /**
   * Format consolidated content for the point
   */
  formatConsolidatedContent(data) {
    const parts = [];
    
    if (data.name) parts.push(`Product: ${data.name}`);
    if (data.article) parts.push(`Article: ${data.article}`);
    if (data.form) parts.push(`Form: ${data.form}`);
    if (data.size) parts.push(`Size: ${data.size}`);
    if (data.ean) parts.push(`EAN: ${data.ean}`);
    if (data.price !== null) parts.push(`Price: €${data.price}`);
    if (data.stock !== null) parts.push(`Stock: ${data.stock}`);
    if (data.available !== null) parts.push(`Available: ${data.available ? 'Yes' : 'No'}`);
    if (data.url) parts.push(`URL: ${data.url}`);
    if (data.description) parts.push(`Description: ${data.description}`);
    
    return parts.join(' | ');
  }

  /**
   * Clear existing collection and upload consolidated points
   */
  async uploadConsolidatedPoints(consolidatedPoints) {
    try {
      // Delete existing collection
      await axios.delete(`${this.qdrantUrl}/collections/${this.collectionName}`);
      console.log('Deleted existing collection');
      
      // Create new collection
      await axios.put(`${this.qdrantUrl}/collections/${this.collectionName}`, {
        vectors: {
          size: 1536,
          distance: "Cosine"
        }
      });
      console.log('Created new collection');
      
      // Upload consolidated points in batches
      const batchSize = 100;
      for (let i = 0; i < consolidatedPoints.length; i += batchSize) {
        const batch = consolidatedPoints.slice(i, i + batchSize);
        
        await axios.put(`${this.qdrantUrl}/collections/${this.collectionName}/points`, {
          points: batch
        });
        
        console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(consolidatedPoints.length / batchSize)}`);
      }
      
      console.log(`Successfully uploaded ${consolidatedPoints.length} consolidated products`);
      
    } catch (error) {
      console.error('Error uploading points:', error.message);
    }
  }

  /**
   * Main consolidation process
   */
  async consolidate() {
    console.log('Starting product consolidation...');
    
    // Fetch all fragmented points
    console.log('Fetching fragmented points...');
    const points = await this.fetchAllPoints();
    console.log(`Found ${points.length} fragmented points`);
    
    // Group fragments by product
    console.log('Grouping fragments by product...');
    const productGroups = this.groupFragmentsByProduct(points);
    console.log(`Identified ${productGroups.size} unique products`);
    
    // Create consolidated points
    console.log('Creating consolidated points...');
    const consolidatedPoints = [];
    productGroups.forEach((productData, productId) => {
      const consolidatedPoint = this.createConsolidatedPoint(productData);
      consolidatedPoints.push(consolidatedPoint);
    });
    
    // Upload to Qdrant
    console.log('Uploading consolidated points...');
    await this.uploadConsolidatedPoints(consolidatedPoints);
    
    console.log('Consolidation complete!');
    return consolidatedPoints;
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const consolidator = new QdrantProductConsolidator();
  consolidator.consolidate().catch(console.error);
}

module.exports = QdrantProductConsolidator;