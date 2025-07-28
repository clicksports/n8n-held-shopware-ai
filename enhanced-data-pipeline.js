/**
 * Enhanced Data Enrichment Pipeline
 * Transforms Shopware API data into AI-optimized Qdrant format
 */

const ShopwareAPIClient = require('./shopware-api-client');
const AIEnhancedProductParser = require('./ai-enhanced-parser');
const axios = require('axios');

class EnhancedDataPipeline {
  constructor(config = {}) {
    this.shopwareClient = new ShopwareAPIClient(config.shopware);
    this.parser = new AIEnhancedProductParser();
    this.qdrantUrl = config.qdrant?.url || 'http://localhost:6333';
    this.collectionName = config.qdrant?.collection || 'shopware_products_enhanced';
    this.batchSize = config.batchSize || 10;
  }

  /**
   * Transform comprehensive Shopware data into AI-optimized format
   */
  transformToEnhancedFormat(shopwareData, productId) {
    const { product, variants, reviews, categories, manufacturer, properties, media, crossSells } = shopwareData;
    
    // Basic info transformation
    const basicInfo = {
      name: product.name,
      article: product.productNumber,
      sku: product.productNumber,
      brand: manufacturer?.name || 'Unknown',
      manufacturer: manufacturer ? {
        name: manufacturer.name,
        description: manufacturer.description,
        country: manufacturer.customFields?.country || 'Unknown',
        established: manufacturer.customFields?.established,
        specialties: manufacturer.customFields?.specialties || [],
        warranty: manufacturer.customFields?.warranty || 'Standard'
      } : null,
      category: categories.length > 0 ? {
        name: categories[0].name,
        path: this.buildCategoryPath(categories[0]),
        level: categories[0].level,
        seo_keywords: categories[0].keywords?.split(',') || []
      } : null,
      ean: product.ean,
      form: product.customFields?.form
    };

    // Variants transformation
    const transformedVariants = variants.map(variant => ({
      sku: variant.productNumber,
      size: this.extractSize(variant),
      color: this.extractColor(variant),
      price: variant.price?.[0]?.gross || 0,
      stock: variant.availableStock || 0,
      available: (variant.availableStock || 0) > 0,
      images: variant.media?.map(m => m.media?.url).filter(Boolean) || [],
      specific_features: variant.customFields?.features || []
    }));

    // Reviews analysis
    const reviewInsights = this.analyzeReviews(reviews);

    // Properties to technical specs
    const technicalSpecs = this.extractTechnicalSpecs(properties, product);

    // Media transformation
    const transformedMedia = {
      images: media.map(m => ({
        url: m.media?.url,
        alt_text: m.media?.alt || m.media?.title,
        type: 'product_image',
        position: m.position,
        variants: [],
        ai_description: this.generateImageDescription(m.media)
      })),
      videos: [] // Add video processing if available
    };

    // Cross-sells and relationships
    const relationships = {
      cross_sells: crossSells.flatMap(cs => 
        cs.assignedProducts?.map(ap => ({
          product_id: ap.productId,
          name: 'Unknown', // Would need additional API call
          relationship: cs.type,
          compatibility_score: 0.8, // Default score
          reason: cs.name
        })) || []
      ),
      alternatives: [], // Would need additional logic
      bundles: [] // Would need additional logic
    };

    // Enhanced content generation
    const enhancedContent = this.generateEnhancedContent(product, basicInfo, technicalSpecs, reviewInsights);

    // AI optimization tags
    const aiOptimization = this.generateAIOptimization(product, basicInfo, technicalSpecs, reviewInsights);

    return {
      id: parseInt(productId),
      payload: {
        content: enhancedContent,
        structured_data: {
          basic_info: basicInfo,
          variants: transformedVariants,
          physical_attributes: this.extractPhysicalAttributes(product, variants),
          technical_specifications: technicalSpecs,
          features: this.extractFeatures(product, properties),
          usage_context: this.extractUsageContext(product, categories, reviewInsights),
          social_proof: reviewInsights,
          relationships: relationships,
          media: transformedMedia
        },
        metadata: {
          article: product.productNumber,
          price_range: this.calculatePriceRange(transformedVariants),
          url: product.customFields?.shopUrl,
          availability: {
            in_stock: (product.availableStock || 0) > 0,
            total_stock: product.availableStock || 0,
            low_stock: (product.availableStock || 0) < 10,
            expected_restock: product.restockTime
          },
          last_updated: new Date().toISOString(),
          data_sources: [
            'shopware_product', 'shopware_variants', 'shopware_reviews',
            'shopware_categories', 'shopware_manufacturer', 'shopware_properties'
          ],
          ai_optimization: aiOptimization,
          sync_info: {
            last_sync: new Date().toISOString(),
            sync_source: 'shopware_api',
            data_version: '1.0',
            next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        }
      },
      vector: this.generateEnhancedVector(enhancedContent, basicInfo, technicalSpecs)
    };
  }

  /**
   * Analyze reviews to extract insights
   */
  analyzeReviews(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        rating_summary: { average_rating: 0, total_reviews: 0 },
        review_insights: { common_praise: [], common_complaints: [], sentiment_score: 0 },
        user_demographics: { primary_user_type: 'unknown' }
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + (review.points || 0), 0);
    const averageRating = totalRating / reviews.length;

    // Simple sentiment analysis
    const positiveWords = ['excellent', 'great', 'perfect', 'amazing', 'comfortable', 'durable'];
    const negativeWords = ['terrible', 'awful', 'uncomfortable', 'cheap', 'poor', 'disappointing'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    const commonPraise = new Set();
    const commonComplaints = new Set();

    reviews.forEach(review => {
      const content = (review.content || '').toLowerCase();
      const title = (review.title || '').toLowerCase();
      const fullText = `${content} ${title}`;

      positiveWords.forEach(word => {
        if (fullText.includes(word)) {
          positiveCount++;
          commonPraise.add(word);
        }
      });

      negativeWords.forEach(word => {
        if (fullText.includes(word)) {
          negativeCount++;
          commonComplaints.add(word);
        }
      });
    });

    return {
      rating_summary: {
        average_rating: Number(averageRating.toFixed(1)),
        total_reviews: reviews.length,
        rating_distribution: this.calculateRatingDistribution(reviews)
      },
      review_insights: {
        common_praise: Array.from(commonPraise).slice(0, 5),
        common_complaints: Array.from(commonComplaints).slice(0, 5),
        sentiment_score: positiveCount / (positiveCount + negativeCount + 1),
        verified_purchase_percentage: 0.8 // Default assumption
      },
      user_demographics: {
        primary_user_type: 'motorcyclist',
        experience_levels: ['beginner', 'intermediate', 'expert'],
        use_cases: ['touring', 'commuting', 'sport_riding']
      }
    };
  }

  /**
   * Calculate rating distribution
   */
  calculateRatingDistribution(reviews) {
    const distribution = { '5_star': 0, '4_star': 0, '3_star': 0, '2_star': 0, '1_star': 0 };
    
    reviews.forEach(review => {
      const rating = review.points || 0;
      if (rating >= 5) distribution['5_star']++;
      else if (rating >= 4) distribution['4_star']++;
      else if (rating >= 3) distribution['3_star']++;
      else if (rating >= 2) distribution['2_star']++;
      else distribution['1_star']++;
    });

    return distribution;
  }

  /**
   * Extract technical specifications from properties
   */
  extractTechnicalSpecs(properties, product) {
    const specs = {
      protection_level: null,
      ce_certification: null,
      waterproof_rating: null,
      windproof: false,
      breathable: false,
      insulated: false,
      removable_lining: false,
      armor_ready: false,
      reflective_elements: false,
      temperature_rating: null,
      custom_properties: []
    };

    properties.forEach(prop => {
      const name = prop.name?.toLowerCase() || '';
      const value = prop.value || prop.name;
      
      if (name.includes('protection') || name.includes('ce')) {
        specs.protection_level = value;
        specs.ce_certification = value;
      } else if (name.includes('waterproof') || name.includes('water')) {
        specs.waterproof_rating = value;
      } else if (name.includes('wind')) {
        specs.windproof = true;
      } else if (name.includes('breathable') || name.includes('ventilation')) {
        specs.breathable = true;
      }

      specs.custom_properties.push({
        name: prop.group?.name || 'General',
        value: value,
        group: prop.group?.name || 'General',
        unit: prop.unit || null
      });
    });

    return specs;
  }

  /**
   * Generate enhanced content summary
   */
  generateEnhancedContent(product, basicInfo, technicalSpecs, reviewInsights) {
    const parts = [];
    
    if (basicInfo.name) parts.push(`Product: ${basicInfo.name}`);
    if (basicInfo.article) parts.push(`Article: ${basicInfo.article}`);
    if (basicInfo.brand) parts.push(`Brand: ${basicInfo.brand}`);
    if (basicInfo.category?.name) parts.push(`Category: ${basicInfo.category.name}`);
    
    if (reviewInsights.rating_summary.total_reviews > 0) {
      parts.push(`Rating: ${reviewInsights.rating_summary.average_rating}★ (${reviewInsights.rating_summary.total_reviews} reviews)`);
    }

    if (technicalSpecs.protection_level) parts.push(`Protection: ${technicalSpecs.protection_level}`);
    if (technicalSpecs.waterproof_rating) parts.push(`Waterproof: ${technicalSpecs.waterproof_rating}`);
    
    if (product.description) {
      parts.push(`Description: ${product.description.substring(0, 200)}...`);
    }

    return parts.join(' | ');
  }

  /**
   * Generate AI optimization metadata
   */
  generateAIOptimization(product, basicInfo, technicalSpecs, reviewInsights) {
    const tags = new Set();
    const keywords = new Set();
    const intentCategories = new Set();
    
    // Basic tags
    if (basicInfo.category?.name) tags.add(`category_${basicInfo.category.name.toLowerCase().replace(/\s+/g, '_')}`);
    if (basicInfo.brand) tags.add(`brand_${basicInfo.brand.toLowerCase()}`);
    
    // Technical spec tags
    if (technicalSpecs.waterproof_rating) tags.add('waterproof');
    if (technicalSpecs.windproof) tags.add('windproof');
    if (technicalSpecs.breathable) tags.add('breathable');
    if (technicalSpecs.armor_ready) tags.add('armor_ready');
    
    // Review-based tags
    if (reviewInsights.rating_summary.average_rating >= 4) tags.add('highly_rated');
    reviewInsights.review_insights.common_praise.forEach(praise => tags.add(`praised_${praise}`));
    
    // Keywords from name and description
    if (basicInfo.name) {
      basicInfo.name.split(' ').forEach(word => {
        if (word.length > 2) keywords.add(word.toLowerCase());
      });
    }
    
    // Intent categories
    intentCategories.add('product_search');
    intentCategories.add('product_comparison');
    if (reviewInsights.rating_summary.total_reviews > 0) intentCategories.add('social_proof_inquiry');
    
    return {
      searchable_tags: Array.from(tags),
      semantic_keywords: Array.from(keywords),
      intent_categories: Array.from(intentCategories),
      comparison_attributes: ['price', 'rating', 'protection_level', 'waterproof_rating'],
      recommendation_factors: ['rating', 'reviews', 'availability', 'price']
    };
  }

  /**
   * Generate enhanced vector embedding (placeholder)
   */
  generateEnhancedVector(content, basicInfo, technicalSpecs) {
    // In a real implementation, this would use a proper embedding model
    // For now, returning a random vector for demonstration
    return Array.from({length: 1536}, () => Math.random());
  }

  /**
   * Helper methods
   */
  buildCategoryPath(category) {
    // Build breadcrumb path - would need recursive category fetching in real implementation
    return category.name;
  }

  extractSize(variant) {
    // Extract size from variant options
    const options = variant.options || [];
    const sizeOption = options.find(opt => opt.group?.name?.toLowerCase().includes('size'));
    return sizeOption?.name || 'Unknown';
  }

  extractColor(variant) {
    // Extract color from variant options
    const options = variant.options || [];
    const colorOption = options.find(opt => opt.group?.name?.toLowerCase().includes('color'));
    return colorOption?.name || 'Unknown';
  }

  calculatePriceRange(variants) {
    if (variants.length === 0) return { min: 0, max: 0, currency: 'EUR' };
    
    const prices = variants.map(v => v.price).filter(p => p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: 'EUR'
    };
  }

  extractPhysicalAttributes(product, variants) {
    return {
      sizes_available: [...new Set(variants.map(v => v.size))].filter(Boolean),
      colors_available: [...new Set(variants.map(v => v.color))].filter(Boolean),
      materials: [], // Would need additional parsing
      weight: product.weight?.toString(),
      dimensions: `${product.width}x${product.height}x${product.length}`
    };
  }

  extractFeatures(product, properties) {
    // Basic feature extraction - would be enhanced with better parsing
    return {
      protection: [],
      comfort: [],
      weather: [],
      ventilation: [],
      storage: [],
      adjustability: [],
      certifications: [],
      unique_features: []
    };
  }

  extractUsageContext(product, categories, reviewInsights) {
    return {
      intended_use: ['motorcycle_riding'],
      seasons: ['all_season'],
      riding_styles: ['touring', 'commuting'],
      target_audience: 'motorcyclists',
      experience_level: ['beginner', 'intermediate', 'expert']
    };
  }

  generateImageDescription(media) {
    return media?.alt || media?.title || 'Product image';
  }

  /**
   * Process single product through the pipeline
   */
  async processProduct(productId) {
    console.log(`Processing product ${productId}...`);
    
    try {
      const shopwareData = await this.shopwareClient.getComprehensiveProductData(productId);
      const enhancedProduct = this.transformToEnhancedFormat(shopwareData, productId);
      
      return enhancedProduct;
    } catch (error) {
      console.error(`Error processing product ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Process multiple products and upload to Qdrant
   */
  async processAndUploadProducts(productIds) {
    console.log(`Processing ${productIds.length} products...`);
    
    const enhancedProducts = [];
    
    for (let i = 0; i < productIds.length; i += this.batchSize) {
      const batch = productIds.slice(i, i + this.batchSize);
      const batchPromises = batch.map(id => this.processProduct(id));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          enhancedProducts.push(result.value);
        } else {
          console.error(`Failed to process product ${batch[index]}:`, result.reason?.message);
        }
      });
      
      console.log(`Processed batch ${Math.floor(i / this.batchSize) + 1}`);
    }
    
    if (enhancedProducts.length > 0) {
      await this.uploadToQdrant(enhancedProducts);
    }
    
    return enhancedProducts;
  }

  /**
   * Upload enhanced products to Qdrant
   */
  async uploadToQdrant(products) {
    try {
      // Create/recreate collection
      await axios.delete(`${this.qdrantUrl}/collections/${this.collectionName}`).catch(() => {});
      
      await axios.put(`${this.qdrantUrl}/collections/${this.collectionName}`, {
        vectors: {
          size: 1536,
          distance: "Cosine"
        }
      });
      
      // Upload products in batches
      for (let i = 0; i < products.length; i += this.batchSize) {
        const batch = products.slice(i, i + this.batchSize);
        
        await axios.put(`${this.qdrantUrl}/collections/${this.collectionName}/points`, {
          points: batch
        });
        
        console.log(`Uploaded batch ${Math.floor(i / this.batchSize) + 1} to Qdrant`);
      }
      
      console.log(`Successfully uploaded ${products.length} enhanced products to Qdrant`);
      
    } catch (error) {
      console.error('Error uploading to Qdrant:', error.message);
      throw error;
    }
  }
}

module.exports = EnhancedDataPipeline;