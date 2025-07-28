/**
 * Upload AI-optimized product data to Qdrant
 * Creates enhanced product points with detailed structured attributes
 */

const axios = require('axios');
const AIEnhancedProductParser = require('./ai-enhanced-parser');

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'shopware_products';

// Sample products with detailed content for parsing
const sampleProductsContent = [
  {
    id: 1,
    content: 'Product: Fashion Jacket | Article: 062424-00/069-0-S | Form: 62424 | Size: S | EAN: 4049462952317 | Price: €299.95 | Stock: 5 | Available: Yes | URL: https://shop.held.de/062424-00-069-0-s/062424-00',
    price: 299.95,
    stock: 5,
    available: true,
    url: 'https://shop.held.de/062424-00-069-0-s/062424-00'
  },
  {
    id: 2,
    content: 'Product: Motorcycle Jacket 006612-00/014-0-3 XL | Article: 006612-00/014-0-3 XL | Form: 6612 | Size: 3 XL | EAN: 4049462759114 | Price: €124.95 | Stock: 0 | Available: No | URL: https://shop.held.de/006612-00-014-0-3-xl/006612-00 | Materials: Soft-Rindleder, atmungsaktives Mesh-Innenfutter | Features: CE-Protektoren, wasserdicht, winddicht, 2 Außentaschen, 1 Innentasche, Frontreißverschluss',
    price: 124.95,
    stock: 0,
    available: false,
    url: 'https://shop.held.de/006612-00-014-0-3-xl/006612-00'
  },
  {
    id: 3,
    content: 'Product: Torver Top Sportjacke | Article: 052430-00 | Form: 52430 | Description: Art. 52430 Eine luftigere Alternative finden Sie mit unserer TORVER TOP AIR art. 052431 Material Soft-Rindleder Futter atmungsaktives Mesh-Innenfutter Komfort 2 Außentaschen 1 Innentasche Dokumententasche Frontreißverschluss auch als ACS (Air-Vent) benutzbar Leder-Stretcheinsätze an Schultern und Ellenbogen CE-Protektoren optional | Price: €189.95 | Stock: 12 | Available: Yes | URL: https://shop.held.de/torver-top-sportjacke/052430-00',
    price: 189.95,
    stock: 12,
    available: true,
    url: 'https://shop.held.de/torver-top-sportjacke/052430-00'
  }
];

async function createAIOptimizedProducts() {
  const parser = new AIEnhancedProductParser();
  const optimizedProducts = [];

  sampleProductsContent.forEach(product => {
    // Parse enhanced attributes
    const enhanced = parser.parseEnhancedProduct(product.content, {
      article: product.id.toString(),
      price: product.price,
      currency: 'EUR',
      url: product.url,
      stock: product.stock,
      available: product.available,
      last_updated: new Date().toISOString(),
      consolidated_from_fragments: 1,
      source_lines: [1]
    });

    // Create optimized product point
    const optimizedProduct = {
      id: product.id,
      payload: {
        content: product.content,
        ...enhanced
      },
      vector: Array.from({length: 1536}, () => Math.random()) // Placeholder vector
    };

    optimizedProducts.push(optimizedProduct);
  });

  return optimizedProducts;
}

async function uploadOptimizedData() {
  try {
    // Delete existing collection
    console.log('Deleting existing collection...');
    await axios.delete(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);

    // Create new collection with enhanced schema
    console.log('Creating AI-optimized collection...');
    await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      vectors: {
        size: 1536,
        distance: "Cosine"
      }
    });

    // Create AI-optimized products
    console.log('Creating AI-optimized product data...');
    const optimizedProducts = await createAIOptimizedProducts();

    // Upload to Qdrant
    console.log('Uploading AI-optimized products...');
    await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
      points: optimizedProducts
    });

    console.log(`Successfully uploaded ${optimizedProducts.length} AI-optimized products`);

    // Test the enhanced structure
    console.log('\n=== Testing AI-Optimized Structure ===');
    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      limit: 1,
      with_payload: true
    });

    const sampleProduct = response.data.result.points[0];
    console.log('\nSample AI-Enhanced Product Structure:');
    console.log('ID:', sampleProduct.id);
    console.log('Basic Info:', JSON.stringify(sampleProduct.payload.structured_data.basic_info, null, 2));
    console.log('Physical Attributes:', JSON.stringify(sampleProduct.payload.structured_data.physical_attributes, null, 2));
    console.log('Features:', JSON.stringify(sampleProduct.payload.structured_data.features, null, 2));
    console.log('Technical Specs:', JSON.stringify(sampleProduct.payload.structured_data.technical_specs, null, 2));
    console.log('Usage:', JSON.stringify(sampleProduct.payload.structured_data.usage, null, 2));
    console.log('AI Tags:', sampleProduct.payload.metadata.ai_searchable_tags);
    console.log('Keywords:', sampleProduct.payload.metadata.semantic_keywords);

    // Test AI-friendly queries
    console.log('\n=== Testing AI-Friendly Queries ===');
    await testAIQueries();

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testAIQueries() {
  try {
    // Query 1: Find products with leather material
    console.log('\n1. Products with leather material:');
    const leatherQuery = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: {
        must: [
          {
            key: "metadata.ai_searchable_tags",
            match: {
              any: ["material_leather"]
            }
          }
        ]
      },
      with_payload: true
    });
    console.log(`Found ${leatherQuery.data.result.points.length} leather products`);

    // Query 2: Find products with ventilation features
    console.log('\n2. Products with ventilation features:');
    const ventQuery = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: {
        must: [
          {
            key: "structured_data.features.ventilation",
            match: {
              any: ["ventilation", "air_circulation", "zipper_ventilation"]
            }
          }
        ]
      },
      with_payload: true
    });
    console.log(`Found ${ventQuery.data.result.points.length} products with ventilation`);

    // Query 3: Find available products under €200
    console.log('\n3. Available products under €200:');
    const priceQuery = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      filter: {
        must: [
          {
            key: "metadata.available",
            match: {
              value: true
            }
          },
          {
            key: "metadata.price",
            range: {
              lt: 200
            }
          }
        ]
      },
      with_payload: true
    });
    console.log(`Found ${priceQuery.data.result.points.length} available products under €200`);
    priceQuery.data.result.points.forEach(p => {
      console.log(`  - ${p.payload.structured_data.basic_info.name}: €${p.payload.metadata.price}`);
    });

  } catch (error) {
    console.error('Query error:', error.response?.data || error.message);
  }
}

// Run the optimization
uploadOptimizedData();