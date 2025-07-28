/**
 * Shopware API Client
 * Comprehensive integration for fetching enhanced product data
 */

const axios = require('axios');

class ShopwareAPIClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.shopware.com';
    this.apiKey = config.apiKey || process.env.SHOPWARE_API_KEY;
    this.version = config.version || 'v3';
    this.timeout = config.timeout || 30000;
    
    this.client = axios.create({
      baseURL: `${this.baseURL}/api/${this.version}`,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Fetch basic product information
   */
  async getProduct(productId) {
    try {
      const response = await this.client.get(`/product/${productId}`, {
        params: {
          includes: {
            product: [
              'id', 'name', 'productNumber', 'description', 'metaDescription',
              'active', 'price', 'stock', 'availableStock', 'restockTime',
              'weight', 'width', 'height', 'length', 'manufacturerId',
              'categoryIds', 'tagIds', 'propertyIds', 'createdAt', 'updatedAt'
            ]
          }
        }
      });
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch all product variants
   */
  async getProductVariants(productId) {
    try {
      const response = await this.client.get(`/product/${productId}/variants`, {
        params: {
          includes: {
            product: [
              'id', 'productNumber', 'price', 'stock', 'weight',
              'options', 'media', 'properties'
            ]
          }
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching variants for ${productId}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch product reviews and ratings
   */
  async getProductReviews(productId, limit = 100) {
    try {
      const response = await this.client.get('/product-review', {
        params: {
          filter: [
            {
              type: 'equals',
              field: 'productId', 
              value: productId
            }
          ],
          limit: limit,
          includes: {
            'product-review': [
              'id', 'title', 'content', 'points', 'status', 'customerId',
              'createdAt', 'languageId', 'salesChannelId'
            ]
          }
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching reviews for ${productId}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch product categories
   */
  async getProductCategories(categoryIds) {
    if (!categoryIds || categoryIds.length === 0) return [];
    
    try {
      const response = await this.client.post('/search/category', {
        filter: [
          {
            type: 'equalsAny',
            field: 'id',
            value: categoryIds
          }
        ],
        includes: {
          category: [
            'id', 'name', 'path', 'level', 'parentId', 'childCount',
            'description', 'metaTitle', 'metaDescription', 'keywords',
            'cmsPageId', 'customFields'
          ]
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching categories:', error.message);
      return [];
    }
  }

  /**
   * Fetch manufacturer information
   */
  async getManufacturer(manufacturerId) {
    if (!manufacturerId) return null;
    
    try {
      const response = await this.client.get(`/product-manufacturer/${manufacturerId}`, {
        includes: {
          'product-manufacturer': [
            'id', 'name', 'description', 'link', 'customFields',
            'media', 'translations'
          ]
        }
      });
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching manufacturer ${manufacturerId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch product properties (specifications)
   */
  async getProductProperties(propertyIds) {
    if (!propertyIds || propertyIds.length === 0) return [];
    
    try {
      const response = await this.client.post('/search/property-group-option', {
        filter: [
          {
            type: 'equalsAny',
            field: 'id',
            value: propertyIds
          }
        ],
        includes: {
          'property-group-option': [
            'id', 'name', 'position', 'colorHexCode', 'groupId',
            'group.name', 'group.description', 'group.displayType',
            'media', 'translations'
          ]
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching properties:', error.message);
      return [];
    }
  }

  /**
   * Fetch product media
   */
  async getProductMedia(productId) {
    try {
      const response = await this.client.get(`/product/${productId}/media`, {
        includes: {
          'product-media': [
            'id', 'position', 'mediaId', 'media.url', 'media.alt',
            'media.title', 'media.fileName', 'media.fileExtension'
          ]
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching media for ${productId}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch cross-sell products
   */
  async getProductCrossSells(productId) {
    try {
      const response = await this.client.get(`/product/${productId}/cross-sellings`, {
        includes: {
          'product-cross-selling': [
            'id', 'name', 'position', 'type', 'active',
            'assignedProducts.productId', 'assignedProducts.position'
          ]
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching cross-sells for ${productId}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch all products with pagination
   */
  async getAllProducts(page = 1, limit = 50) {
    try {
      const response = await this.client.post('/search/product', {
        page: page,
        limit: limit,
        filter: [
          {
            type: 'equals',
            field: 'active',
            value: true
          }
        ],
        includes: {
          product: [
            'id', 'name', 'productNumber', 'description', 'active',
            'stock', 'availableStock', 'price', 'manufacturerId',
            'categoryIds', 'tagIds', 'propertyIds', 'updatedAt'
          ]
        },
        sort: [
          {
            field: 'updatedAt',
            order: 'DESC'
          }
        ]
      });
      
      return {
        products: response.data.data || [],
        total: response.data.total || 0,
        page: page,
        limit: limit,
        hasMore: (page * limit) < (response.data.total || 0)
      };
    } catch (error) {
      console.error('Error fetching products:', error.message);
      return { products: [], total: 0, page, limit, hasMore: false };
    }
  }

  /**
   * Get comprehensive product data by combining all API calls
   */
  async getComprehensiveProductData(productId) {
    console.log(`Fetching comprehensive data for product ${productId}...`);
    
    try {
      // Fetch all data in parallel for efficiency
      const [
        product,
        variants,
        reviews,
        media,
        crossSells
      ] = await Promise.all([
        this.getProduct(productId),
        this.getProductVariants(productId),
        this.getProductReviews(productId),
        this.getProductMedia(productId),
        this.getProductCrossSells(productId)
      ]);

      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Fetch related data based on product info
      const [
        categories,
        manufacturer,
        properties
      ] = await Promise.all([
        product.categoryIds ? this.getProductCategories(product.categoryIds) : [],
        product.manufacturerId ? this.getManufacturer(product.manufacturerId) : null,
        product.propertyIds ? this.getProductProperties(product.propertyIds) : []
      ]);

      return {
        product,
        variants,
        reviews,
        categories,
        manufacturer,
        properties,
        media,
        crossSells,
        fetchedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error fetching comprehensive data for ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Health check for API connection
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/_info/version');
      return {
        status: 'healthy',
        version: response.data.version,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ShopwareAPIClient;