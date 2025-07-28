/**
 * Product Data Consolidation Tool
 * Transforms fragmented product data into consolidated format
 */

class ProductConsolidator {
  constructor() {
    this.products = new Map();
  }

  /**
   * Parse fragmented product content into structured data
   */
  parseProductContent(content) {
    // Handle article format: "Article: 062424-00/069-0-S | Form: 62424 | Size: S | Main Article: 062424-00 | EAN: 4049462952317 | Price: €299.95 | Stock: 5 | Available: Yes"
    if (content.startsWith('Article:')) {
      const parts = content.split(' | ');
      const parsed = {};
      
      parts.forEach(part => {
        const [key, value] = part.split(': ');
        switch (key.trim()) {
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
            parsed.price = {
              value: parseFloat(value.replace('€', '')),
              currency: 'EUR'
            };
            break;
          case 'Stock':
            parsed.stock = parseInt(value);
            break;
          case 'Available':
            parsed.available = value === 'Yes';
            break;
        }
      });
      
      return { type: 'product_info', data: parsed };
    }
    
    // Handle product name format: "Product 006612-00/014-0-3 XL"
    if (content.startsWith('Product ')) {
      return { 
        type: 'product_name', 
        data: { name: content, article: content.replace('Product ', '') }
      };
    }
    
    // Handle URLs
    if (content.startsWith('https://shop.held.de/')) {
      return { type: 'product_url', data: { url: content } };
    }
    
    // Handle timestamps
    if (content.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return { type: 'timestamp', data: { timestamp: content } };
    }
    
    // Handle EAN codes
    if (content.match(/^\d{13}$/)) {
      return { type: 'ean', data: { ean: content } };
    }
    
    // Handle article numbers
    if (content.match(/^\d{6}-\d{2}$/)) {
      return { type: 'main_article', data: { mainArticle: content } };
    }
    
    // Handle variant article numbers
    if (content.match(/^\d{6}-\d{2}\/\d{3}-\d+-\w+$/)) {
      return { type: 'variant_article', data: { article: content } };
    }
    
    // Handle hashes
    if (content.match(/^[a-f0-9]{32}$/)) {
      return { type: 'hash', data: { hash: content } };
    }
    
    // Handle currency
    if (content === 'EUR') {
      return { type: 'currency', data: { currency: content } };
    }
    
    return { type: 'unknown', data: { raw: content } };
  }

  /**
   * Consolidate a fragmented product point into unified structure
   */
  consolidatePoint(point) {
    const { content, metadata, vectors } = point;
    const parsed = this.parseProductContent(content);
    
    // Extract product identifier from content or metadata
    let productId = this.extractProductId(parsed, metadata);
    
    if (!this.products.has(productId)) {
      this.products.set(productId, {
        id: productId,
        content: {},
        metadata: {
          source: metadata.source,
          sourceType: metadata.blobType ? 'blob' : 'unknown',
          blobType: metadata.blobType,
          location: metadata.loc,
          timestamps: {},
          fragments: []
        },
        vectors: vectors || {}
      });
    }
    
    const product = this.products.get(productId);
    
    // Merge content based on type
    this.mergeContent(product, parsed);
    
    // Track metadata fragments
    product.metadata.fragments.push({
      line: metadata.line,
      type: parsed.type,
      content: content
    });
    
    return product;
  }

  /**
   * Extract product identifier from parsed content or metadata
   */
  extractProductId(parsed, metadata) {
    if (parsed.data.mainArticle) {
      return parsed.data.mainArticle;
    }
    if (parsed.data.article) {
      return parsed.data.article.split('/')[0] || parsed.data.article;
    }
    if (parsed.data.ean) {
      return parsed.data.ean;
    }
    // Fallback to line-based ID
    return `line_${metadata.line}`;
  }

  /**
   * Merge content into product structure
   */
  mergeContent(product, parsed) {
    switch (parsed.type) {
      case 'product_info':
        Object.assign(product.content, parsed.data);
        break;
      case 'product_name':
        product.content.name = parsed.data.name;
        if (!product.content.article) {
          product.content.article = parsed.data.article;
        }
        break;
      case 'product_url':
        product.content.url = parsed.data.url;
        break;
      case 'timestamp':
        if (!product.metadata.timestamps.updated) {
          product.metadata.timestamps.updated = parsed.data.timestamp;
        }
        break;
      case 'ean':
        if (!product.content.ean) {
          product.content.ean = parsed.data.ean;
        }
        break;
      case 'main_article':
        if (!product.content.mainArticle) {
          product.content.mainArticle = parsed.data.mainArticle;
        }
        break;
      case 'variant_article':
        if (!product.content.article) {
          product.content.article = parsed.data.article;
        }
        break;
      case 'hash':
        product.metadata.hash = parsed.data.hash;
        break;
      case 'currency':
        if (product.content.price && !product.content.price.currency) {
          product.content.price.currency = parsed.data.currency;
        }
        break;
    }
  }

  /**
   * Get all consolidated products
   */
  getConsolidatedProducts() {
    return Array.from(this.products.values());
  }

  /**
   * Transform vector database points to consolidated format
   */
  static transformVectorPoints(points) {
    const consolidator = new ProductConsolidator();
    
    points.forEach(point => {
      consolidator.consolidatePoint(point);
    });
    
    return consolidator.getConsolidatedProducts();
  }
}

module.exports = ProductConsolidator;