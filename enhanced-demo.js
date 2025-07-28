/**
 * Enhanced AI Chatbot Demo
 * Demonstrates advanced capabilities with comprehensive Shopware data
 */

const axios = require('axios');

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'shopware_products_enhanced';

class EnhancedAIChatbot {
  
  /**
   * Answer complex product questions using comprehensive data
   */
  async answerComplexQuestion(question) {
    console.log(`🤖 AI Question: "${question}"`);
    
    const lowerQuestion = question.toLowerCase();
    
    // Multi-criteria product search
    if (lowerQuestion.includes('best') && lowerQuestion.includes('for')) {
      return await this.findBestProductFor(question);
    }
    
    // Comparison queries
    if (lowerQuestion.includes('compare') || lowerQuestion.includes('vs') || lowerQuestion.includes('difference')) {
      return await this.compareProducts(question);
    }
    
    // Review-based questions
    if (lowerQuestion.includes('review') || lowerQuestion.includes('rating') || lowerQuestion.includes('customer')) {
      return await this.getReviewInsights(question);
    }
    
    // Technical specification queries
    if (lowerQuestion.includes('spec') || lowerQuestion.includes('technical') || lowerQuestion.includes('certification')) {
      return await this.getTechnicalInfo(question);
    }
    
    // Availability and inventory
    if (lowerQuestion.includes('available') || lowerQuestion.includes('stock') || lowerQuestion.includes('when')) {
      return await this.getAvailabilityInfo(question);
    }
    
    // Bundle and cross-sell recommendations
    if (lowerQuestion.includes('goes with') || lowerQuestion.includes('bundle') || lowerQuestion.includes('together')) {
      return await this.getRecommendations(question);
    }
    
    // Fallback to general search
    return await this.generalProductSearch(question);
  }

  /**
   * Find the best product for a specific use case
   */
  async findBestProductFor(question) {
    const useCase = this.extractUseCase(question);
    
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        filter: {
          should: [
            {
              key: "structured_data.usage_context.intended_use",
              match: { any: [useCase] }
            },
            {
              key: "metadata.ai_optimization.semantic_keywords",
              match: { any: useCase.split(' ') }
            }
          ]
        },
        with_payload: true,
        limit: 3
      });

      const products = response.data.result.points;
      
      if (products.length === 0) {
        return "I couldn't find specific products for that use case. Could you be more specific about what you're looking for?";
      }

      // Rank by rating and reviews
      const rankedProducts = products.sort((a, b) => {
        const ratingA = a.payload.structured_data.social_proof?.rating_summary?.average_rating || 0;
        const ratingB = b.payload.structured_data.social_proof?.rating_summary?.average_rating || 0;
        return ratingB - ratingA;
      });

      const bestProduct = rankedProducts[0];
      const rating = bestProduct.payload.structured_data.social_proof?.rating_summary;
      const reviews = bestProduct.payload.structured_data.social_proof?.review_insights;
      
      let response_text = `**Best for ${useCase}:** ${bestProduct.payload.structured_data.basic_info.name}\n\n`;
      
      if (rating && rating.total_reviews > 0) {
        response_text += `⭐ **${rating.average_rating}/5** (${rating.total_reviews} reviews)\n\n`;
      }
      
      if (reviews && reviews.common_praise.length > 0) {
        response_text += `👍 **What customers love:** ${reviews.common_praise.join(', ')}\n\n`;
      }
      
      const specs = bestProduct.payload.structured_data.technical_specifications;
      if (specs) {
        const keySpecs = [];
        if (specs.protection_level) keySpecs.push(`Protection: ${specs.protection_level}`);
        if (specs.waterproof_rating) keySpecs.push(`Waterproof: ${specs.waterproof_rating}`);
        if (specs.ce_certification) keySpecs.push(`Certified: ${specs.ce_certification}`);
        
        if (keySpecs.length > 0) {
          response_text += `🔧 **Key specs:** ${keySpecs.join(' • ')}\n\n`;
        }
      }
      
      const availability = bestProduct.payload.metadata.availability;
      if (availability) {
        response_text += `📦 **Availability:** ${availability.in_stock ? `${availability.total_stock} in stock` : 'Out of stock'}`;
        if (!availability.in_stock && availability.expected_restock) {
          response_text += ` (Expected: ${availability.expected_restock})`;
        }
      }
      
      return response_text;
      
    } catch (error) {
      console.error('Error finding best product:', error.message);
      return "I'm having trouble accessing product information right now. Please try again later.";
    }
  }

  /**
   * Compare products side by side
   */
  async compareProducts(question) {
    // Extract product names or find top products to compare
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        with_payload: true,
        limit: 2
      });

      const products = response.data.result.points;
      
      if (products.length < 2) {
        return "I need at least 2 products to compare. Could you specify which products you'd like me to compare?";
      }

      let comparison = "## Product Comparison\n\n";
      
      products.forEach((product, index) => {
        const data = product.payload.structured_data;
        const meta = product.payload.metadata;
        
        comparison += `### ${index + 1}. ${data.basic_info.name}\n`;
        comparison += `- **Price:** €${meta.price_range?.min || 'N/A'}\n`;
        
        if (data.social_proof?.rating_summary?.total_reviews > 0) {
          comparison += `- **Rating:** ${data.social_proof.rating_summary.average_rating}⭐ (${data.social_proof.rating_summary.total_reviews} reviews)\n`;
        }
        
        if (data.technical_specifications) {
          const specs = data.technical_specifications;
          comparison += `- **Protection:** ${specs.protection_level || 'N/A'}\n`;
          comparison += `- **Waterproof:** ${specs.waterproof_rating || (specs.waterproof ? 'Yes' : 'No')}\n`;
          comparison += `- **Breathable:** ${specs.breathable ? 'Yes' : 'No'}\n`;
        }
        
        comparison += `- **Stock:** ${meta.availability?.in_stock ? meta.availability.total_stock + ' available' : 'Out of stock'}\n\n`;
      });
      
      return comparison;
      
    } catch (error) {
      console.error('Error comparing products:', error.message);
      return "I'm having trouble comparing products right now. Please try again later.";
    }
  }

  /**
   * Get review insights and customer feedback
   */
  async getReviewInsights(question) {
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        filter: {
          key: "structured_data.social_proof.rating_summary.total_reviews",
          range: { gt: 0 }
        },
        with_payload: true,
        limit: 3
      });

      const products = response.data.result.points;
      
      if (products.length === 0) {
        return "I don't have review data available for any products at the moment.";
      }

      let insights = "## Customer Review Insights\n\n";
      
      products.forEach(product => {
        const data = product.payload.structured_data;
        const social = data.social_proof;
        
        if (social && social.rating_summary.total_reviews > 0) {
          insights += `### ${data.basic_info.name}\n`;
          insights += `**Overall Rating:** ${social.rating_summary.average_rating}⭐ from ${social.rating_summary.total_reviews} reviews\n\n`;
          
          if (social.review_insights.common_praise.length > 0) {
            insights += `**Most Praised:** ${social.review_insights.common_praise.join(', ')}\n`;
          }
          
          if (social.review_insights.common_complaints.length > 0) {
            insights += `**Common Concerns:** ${social.review_insights.common_complaints.join(', ')}\n`;
          }
          
          insights += `**Sentiment Score:** ${Math.round(social.review_insights.sentiment_score * 100)}% positive\n\n`;
        }
      });
      
      return insights;
      
    } catch (error) {
      console.error('Error getting review insights:', error.message);
      return "I'm having trouble accessing review data right now. Please try again later.";
    }
  }

  /**
   * Get detailed technical information
   */
  async getTechnicalInfo(question) {
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        with_payload: true,
        limit: 1
      });

      const products = response.data.result.points;
      
      if (products.length === 0) {
        return "No products found with technical specifications.";
      }

      const product = products[0];
      const data = product.payload.structured_data;
      const specs = data.technical_specifications;
      
      let techInfo = `## Technical Specifications: ${data.basic_info.name}\n\n`;
      
      if (specs) {
        if (specs.protection_level) techInfo += `**Protection Level:** ${specs.protection_level}\n`;
        if (specs.ce_certification) techInfo += `**CE Certification:** ${specs.ce_certification}\n`;
        if (specs.waterproof_rating) techInfo += `**Waterproof Rating:** ${specs.waterproof_rating}\n`;
        
        techInfo += `**Features:**\n`;
        techInfo += `- Windproof: ${specs.windproof ? '✅' : '❌'}\n`;
        techInfo += `- Breathable: ${specs.breathable ? '✅' : '❌'}\n`;
        techInfo += `- Insulated: ${specs.insulated ? '✅' : '❌'}\n`;
        techInfo += `- Armor Ready: ${specs.armor_ready ? '✅' : '❌'}\n`;
        techInfo += `- Reflective Elements: ${specs.reflective_elements ? '✅' : '❌'}\n\n`;
        
        if (specs.custom_properties && specs.custom_properties.length > 0) {
          techInfo += `**Additional Specifications:**\n`;
          specs.custom_properties.forEach(prop => {
            techInfo += `- ${prop.name}: ${prop.value}\n`;
          });
        }
      }
      
      if (data.physical_attributes) {
        const phys = data.physical_attributes;
        techInfo += `\n**Physical Attributes:**\n`;
        if (phys.materials.length > 0) {
          techInfo += `- Materials: ${phys.materials.map(m => m.name).join(', ')}\n`;
        }
        if (phys.weight) techInfo += `- Weight: ${phys.weight}\n`;
        if (phys.dimensions) techInfo += `- Dimensions: ${phys.dimensions}\n`;
      }
      
      return techInfo;
      
    } catch (error) {
      console.error('Error getting technical info:', error.message);
      return "I'm having trouble accessing technical specifications right now. Please try again later.";
    }
  }

  /**
   * Get availability and inventory information
   */
  async getAvailabilityInfo(question) {
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        with_payload: true,
        limit: 5
      });

      const products = response.data.result.points;
      
      if (products.length === 0) {
        return "No product availability information found.";
      }

      let availInfo = "## Product Availability\n\n";
      
      products.forEach(product => {
        const data = product.payload.structured_data;
        const availability = product.payload.metadata.availability;
        
        availInfo += `### ${data.basic_info.name}\n`;
        
        if (availability.in_stock) {
          availInfo += `✅ **In Stock:** ${availability.total_stock} units available\n`;
          if (availability.low_stock) {
            availInfo += `⚠️ *Low stock warning*\n`;
          }
        } else {
          availInfo += `❌ **Out of Stock**\n`;
          if (availability.expected_restock) {
            availInfo += `📅 Expected restock: ${availability.expected_restock}\n`;
          }
        }
        
        // Show variant availability if available
        if (data.variants && data.variants.length > 0) {
          const availableVariants = data.variants.filter(v => v.available);
          if (availableVariants.length > 0) {
            availInfo += `**Available sizes/colors:** ${availableVariants.map(v => `${v.size} ${v.color}`).join(', ')}\n`;
          }
        }
        
        availInfo += `\n`;
      });
      
      return availInfo;
      
    } catch (error) {
      console.error('Error getting availability info:', error.message);
      return "I'm having trouble accessing availability information right now. Please try again later.";
    }
  }

  /**
   * Get product recommendations and bundles
   */
  async getRecommendations(question) {
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        filter: {
          key: "structured_data.relationships.cross_sells",
          match: { any: ["*"] }
        },
        with_payload: true,
        limit: 3
      });

      const products = response.data.result.points;
      
      if (products.length === 0) {
        return "I don't have cross-sell recommendations available at the moment.";
      }

      let recommendations = "## Product Recommendations\n\n";
      
      products.forEach(product => {
        const data = product.payload.structured_data;
        const crossSells = data.relationships?.cross_sells;
        
        if (crossSells && crossSells.length > 0) {
          recommendations += `### If you're considering: ${data.basic_info.name}\n`;
          recommendations += `**Frequently bought together:**\n`;
          
          crossSells.forEach(item => {
            recommendations += `- ${item.name || item.product_id} (${item.relationship})\n`;
            if (item.reason) {
              recommendations += `  *${item.reason}*\n`;
            }
          });
          
          recommendations += `\n`;
        }
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Error getting recommendations:', error.message);
      return "I'm having trouble accessing recommendation data right now. Please try again later.";
    }
  }

  /**
   * General product search fallback
   */
  async generalProductSearch(question) {
    const keywords = this.extractKeywords(question);
    
    try {
      const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
        filter: {
          should: keywords.map(keyword => ({
            key: "metadata.ai_optimization.semantic_keywords",
            match: { any: [keyword] }
          }))
        },
        with_payload: true,
        limit: 3
      });

      const products = response.data.result.points;
      
      if (products.length === 0) {
        return `I couldn't find products matching "${question}". Could you try rephrasing or being more specific?`;
      }

      let results = `Found ${products.length} products matching your search:\n\n`;
      
      products.forEach((product, index) => {
        const data = product.payload.structured_data;
        const meta = product.payload.metadata;
        
        results += `${index + 1}. **${data.basic_info.name}**\n`;
        results += `   - Price: €${meta.price_range?.min || 'N/A'}\n`;
        results += `   - Brand: ${data.basic_info.brand}\n`;
        
        if (data.social_proof?.rating_summary?.total_reviews > 0) {
          results += `   - Rating: ${data.social_proof.rating_summary.average_rating}⭐\n`;
        }
        
        results += `   - Available: ${meta.availability?.in_stock ? 'Yes' : 'No'}\n\n`;
      });
      
      return results;
      
    } catch (error) {
      console.error('Error in general search:', error.message);
      return "I'm having trouble searching products right now. Please try again later.";
    }
  }

  /**
   * Helper methods
   */
  extractUseCase(question) {
    const useCases = {
      'touring': ['touring', 'long ride', 'distance', 'highway'],
      'commuting': ['commuting', 'city', 'urban', 'daily'],
      'sport': ['sport', 'racing', 'track', 'performance'],
      'adventure': ['adventure', 'off-road', 'dual-sport', 'adv'],
      'winter': ['winter', 'cold', 'snow', 'freezing'],
      'summer': ['summer', 'hot', 'warm', 'heat'],
      'rain': ['rain', 'wet', 'waterproof', 'weather']
    };
    
    const lowerQuestion = question.toLowerCase();
    
    for (const [useCase, keywords] of Object.entries(useCases)) {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        return useCase;
      }
    }
    
    return 'general riding';
  }

  extractKeywords(question) {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'what', 'where', 'when', 'how'];
    return question.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Limit to 5 keywords
  }
}

// Demo usage
async function runEnhancedDemo() {
  const chatbot = new EnhancedAIChatbot();
  
  const questions = [
    "What's the best jacket for touring in rainy weather?",
    "Compare the top 2 motorcycle jackets",
    "Show me customer reviews for leather jackets",
    "What are the technical specifications for protection gear?",
    "What's available in stock right now?",
    "What accessories go well with motorcycle jackets?"
  ];
  
  console.log('🚀 Enhanced AI Chatbot Demo\n');
  
  for (const question of questions) {
    try {
      const answer = await chatbot.answerComplexQuestion(question);
      console.log(`${answer}\n\n---\n`);
      
      // Add small delay between questions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error answering "${question}":`, error.message);
    }
  }
}

// Export for use as module or run directly
if (require.main === module) {
  runEnhancedDemo().catch(console.error);
}

module.exports = EnhancedAIChatbot;