/**
 * AI-Friendly Query Examples
 * Demonstrates how AI agents can query the optimized product data
 */

const axios = require('axios');

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'shopware_products';

class ProductQueryAgent {
  
  /**
   * Find products by material type
   */
  async findByMaterial(material) {
    console.log(`🔍 Searching for products with ${material} material...`);
    
    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: {
        must: [
          {
            key: "metadata.ai_searchable_tags",
            match: {
              any: [`material_${material}`]
            }
          }
        ]
      },
      with_payload: true
    });

    return this.formatResults(response.data.result.points);
  }

  /**
   * Find products by features
   */
  async findByFeatures(features) {
    console.log(`🔍 Searching for products with features: ${features.join(', ')}...`);
    
    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: {
        should: features.map(feature => ({
          key: "metadata.ai_searchable_tags",
          match: {
            any: [feature, `feature_${feature}`, feature.replace(/\s+/g, '_')]
          }
        }))
      },
      with_payload: true
    });

    return this.formatResults(response.data.result.points);
  }

  /**
   * Find products by price range and availability
   */
  async findByPriceRange(minPrice, maxPrice, availableOnly = true) {
    console.log(`🔍 Searching for products €${minPrice} - €${maxPrice} ${availableOnly ? '(available only)' : ''}...`);
    
    const filters = [
      {
        key: "metadata.price",
        range: {
          gte: minPrice,
          lte: maxPrice
        }
      }
    ];

    if (availableOnly) {
      filters.push({
        key: "metadata.available",
        match: { value: true }
      });
    }

    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: { must: filters },
      with_payload: true
    });

    return this.formatResults(response.data.result.points);
  }

  /**
   * Find products by technical specifications
   */
  async findByTechnicalSpecs(specs) {
    console.log(`🔍 Searching for products with technical specs: ${Object.keys(specs).join(', ')}...`);
    
    const filters = Object.entries(specs).map(([key, value]) => ({
      key: `structured_data.technical_specs.${key}`,
      match: { value }
    }));

    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: { must: filters },
      with_payload: true
    });

    return this.formatResults(response.data.result.points);
  }

  /**
   * Find products by season/usage
   */
  async findBySeason(season) {
    console.log(`🔍 Searching for ${season} products...`);
    
    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: {
        should: [
          {
            key: "structured_data.usage.season",
            match: { any: [season] }
          },
          {
            key: "metadata.semantic_keywords",
            match: { any: [season] }
          }
        ]
      },
      with_payload: true
    });

    return this.formatResults(response.data.result.points);
  }

  /**
   * Complex query: Find suitable products for specific use case
   */
  async findForUseCase(useCase) {
    console.log(`🔍 Finding products for use case: ${useCase}...`);
    
    let filters = [];
    
    if (useCase === 'summer_riding') {
      filters = [
        {
          key: "metadata.semantic_keywords",
          match: { any: ['summer', 'light', 'breathable', 'ventilation'] }
        },
        {
          key: "metadata.available",
          match: { value: true }
        }
      ];
    } else if (useCase === 'protection_focused') {
      filters = [
        {
          key: "structured_data.technical_specs.armor_ready",
          match: { value: true }
        }
      ];
    } else if (useCase === 'weather_protection') {
      filters = [
        {
          should: [
            {
              key: "structured_data.technical_specs.waterproof",
              match: { value: true }
            },
            {
              key: "structured_data.technical_specs.windproof",
              match: { value: true }
            }
          ]
        }
      ];
    }

    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: filters.length > 1 ? { must: filters } : filters[0],
      with_payload: true
    });

    return this.formatResults(response.data.result.points);
  }

  /**
   * Answer natural language questions about products
   */
  async answerQuestion(question) {
    console.log(`❓ Answering: "${question}"`);
    
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('leather')) {
      return await this.findByMaterial('leather');
    }
    
    if (lowerQuestion.includes('waterproof') || lowerQuestion.includes('rain')) {
      return await this.findByTechnicalSpecs({ waterproof: true });
    }
    
    if (lowerQuestion.includes('cheap') || lowerQuestion.includes('budget')) {
      return await this.findByPriceRange(0, 150);
    }
    
    if (lowerQuestion.includes('summer') || lowerQuestion.includes('hot')) {
      return await this.findForUseCase('summer_riding');
    }
    
    if (lowerQuestion.includes('protection') || lowerQuestion.includes('safety')) {
      return await this.findForUseCase('protection_focused');
    }
    
    return { message: 'Could not understand the question. Try asking about materials, features, price, or weather protection.' };
  }

  /**
   * Format results for display
   */
  formatResults(points) {
    if (points.length === 0) {
      return { count: 0, message: 'No products found matching the criteria.' };
    }

    const results = points.map(point => ({
      id: point.id,
      name: point.payload.structured_data.basic_info.name,
      article: point.payload.structured_data.basic_info.article,
      price: `€${point.payload.metadata.price}`,
      available: point.payload.metadata.available,
      materials: point.payload.structured_data.physical_attributes.materials.map(m => m.name),
      features: {
        protection: point.payload.structured_data.features.protection,
        comfort: point.payload.structured_data.features.comfort,
        weather: point.payload.structured_data.features.weather,
        storage: point.payload.structured_data.features.storage
      },
      technical_specs: point.payload.structured_data.technical_specs,
      url: point.payload.metadata.url
    }));

    return {
      count: points.length,
      products: results
    };
  }
}

// Example usage and demonstrations
async function runExamples() {
  const agent = new ProductQueryAgent();

  try {
    // Example 1: Material search
    console.log('\n=== Example 1: Material Search ===');
    const leatherProducts = await agent.findByMaterial('leather');
    console.log(`Found ${leatherProducts.count} leather products`);
    if (leatherProducts.products) {
      leatherProducts.products.forEach(p => {
        console.log(`  - ${p.name}: ${p.price} (${p.available ? 'Available' : 'Out of stock'})`);
      });
    }

    // Example 2: Price range search
    console.log('\n=== Example 2: Price Range Search ===');
    const affordableProducts = await agent.findByPriceRange(100, 200);
    console.log(`Found ${affordableProducts.count} products in €100-200 range`);
    if (affordableProducts.products) {
      affordableProducts.products.forEach(p => {
        console.log(`  - ${p.name}: ${p.price}`);
      });
    }

    // Example 3: Feature search
    console.log('\n=== Example 3: Feature Search ===');
    const ventilatedProducts = await agent.findByFeatures(['ventilation', 'breathable']);
    console.log(`Found ${ventilatedProducts.count} products with ventilation features`);

    // Example 4: Natural language questions
    console.log('\n=== Example 4: Natural Language Questions ===');
    const questions = [
      "What leather jackets do you have?",
      "Show me waterproof products",
      "What's available for summer riding?",
      "I need something cheap under €150"
    ];

    for (const question of questions) {
      const answer = await agent.answerQuestion(question);
      console.log(`Q: ${question}`);
      console.log(`A: Found ${answer.count || 0} products`);
      if (answer.products && answer.products.length > 0) {
        answer.products.forEach(p => {
          console.log(`   - ${p.name}: ${p.price}`);
        });
      } else if (answer.message) {
        console.log(`   ${answer.message}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error running examples:', error.response?.data || error.message);
  }
}

// Run examples
if (require.main === module) {
  runExamples();
}

module.exports = ProductQueryAgent;