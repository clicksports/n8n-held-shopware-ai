// Simple script to upload products to Qdrant
// Copy the products array from n8n output and paste here

const products = [
  // Paste your products here from n8n output
];

// Transform to Qdrant format
const points = products.map((product, index) => ({
  id: index + 1,
  payload: {
    productId: product.id,
    name: product.name || product.productNumber,
    productNumber: product.productNumber,
    price: product.price?.gross || 0,
    fullText: `Product: ${product.name}. SKU: ${product.productNumber}. Price: €${product.price?.gross}`
  }
}));

// Upload command
console.log('Run this command to upload to Qdrant:');
console.log(`curl -X PUT http://localhost:6333/collections/shopware_products \\
  -H "Content-Type: application/json" \\
  -d '{"vectors": {"size": 384, "distance": "Cosine"}}'`);

console.log('\nThen upload points:');
console.log(`curl -X PUT http://localhost:6333/collections/shopware_products/points \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ points: points.slice(0, 100) })}'`);