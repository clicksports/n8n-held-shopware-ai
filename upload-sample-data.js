/**
 * Upload sample consolidated product data to test the structure
 */

const axios = require('axios');

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'shopware_products';

// Sample consolidated product points with proper structure
const sampleProducts = [
  {
    id: 1,
    payload: {
      content: 'Product: Fashion Jacket | Article: 062424-00/069-0-S | Form: 62424 | Size: S | EAN: 4049462952317 | Price: €299.95 | Stock: 5 | Available: Yes | URL: https://shop.held.de/062424-00-069-0-s/062424-00',
      metadata: {
        article: '062424-00/069-0-S',
        price: 299.95,
        url: 'https://shop.held.de/062424-00-069-0-s/062424-00',
        ean: '4049462952317',
        stock: 5,
        available: true,
        consolidated_from_fragments: 8,
        source_lines: [1, 4, 5, 9, 14, 15, 16, 20]
      }
    },
    vector: Array.from({length: 1536}, () => Math.random())
  },
  {
    id: 2,
    payload: {
      content: 'Product: 006612-00/014-0-3 XL | Article: 006612-00/014-0-3 XL | Form: 6612 | Size: 3 XL | EAN: 4049462759114 | Price: €124.95 | Stock: 0 | Available: No | URL: https://shop.held.de/006612-00-014-0-3-xl/006612-00',
      metadata: {
        article: '006612-00/014-0-3 XL',
        price: 124.95,
        url: 'https://shop.held.de/006612-00-014-0-3-xl/006612-00',
        ean: '4049462759114',
        stock: 0,
        available: false,
        consolidated_from_fragments: 12,
        source_lines: [1, 3, 4, 7, 8, 9, 14, 15, 16, 18, 20]
      }
    },
    vector: Array.from({length: 1536}, () => Math.random())
  },
  {
    id: 3,
    payload: {
      content: 'Product: Torver Top Sportjacke | Article: 052430-00 | Form: 52430 | Description: Art. 52430 Eine luftigere Alternative finden Sie mit unserer TORVER TOP AIR art. 052431 Material Soft-Rindleder Futter atmungsaktives Mesh-Innenfutter Komfort 2 Außentaschen 1 Innentasche Dokumententasche Frontreißverschluss auch als ACS (Air-Vent) benutzbar Leder-Stretcheinsätze an Schultern und El... | Price: €0 | Stock: 0 | Available: No | URL: https://shop.held.de/torver-top-sportjacke/052430-00',
      metadata: {
        article: '052430-00',
        price: 0,
        url: 'https://shop.held.de/torver-top-sportjacke/052430-00',
        ean: null,
        stock: 0,
        available: false,
        consolidated_from_fragments: 5,
        source_lines: [1, 4, 5, 11, 13]
      }
    },
    vector: Array.from({length: 1536}, () => Math.random())
  }
];

async function uploadSampleData() {
  try {
    // Create collection
    console.log('Creating collection...');
    await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      vectors: {
        size: 1536,
        distance: "Cosine"
      }
    });
    
    // Upload sample points
    console.log('Uploading sample consolidated products...');
    await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
      points: sampleProducts
    });
    
    console.log(`Successfully uploaded ${sampleProducts.length} consolidated products`);
    
    // Test retrieval
    console.log('\nTesting retrieval...');
    const response = await axios.post(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
      limit: 10,
      with_payload: true
    });
    
    console.log(`Retrieved ${response.data.result.points.length} points:`);
    response.data.result.points.forEach(point => {
      console.log(`\nID: ${point.id}`);
      console.log(`Content: ${point.payload.content}`);
      console.log(`Article: ${point.payload.metadata.article}`);
      console.log(`Price: €${point.payload.metadata.price}`);
      console.log(`URL: ${point.payload.metadata.url}`);
      console.log(`Stock: ${point.payload.metadata.stock}`);
      console.log(`Available: ${point.payload.metadata.available}`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

uploadSampleData();