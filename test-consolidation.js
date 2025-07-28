/**
 * Test the consolidation logic without uploading
 */

const QdrantProductConsolidator = require('./consolidate-qdrant');

async function testConsolidation() {
  const consolidator = new QdrantProductConsolidator();
  
  console.log('Fetching fragmented points...');
  const points = await consolidator.fetchAllPoints();
  console.log(`Found ${points.length} fragmented points`);
  
  console.log('\nGrouping fragments by product...');
  const productGroups = consolidator.groupFragmentsByProduct(points);
  console.log(`Identified ${productGroups.size} unique products`);
  
  console.log('\nCreating consolidated points...');
  const consolidatedPoints = [];
  let count = 0;
  productGroups.forEach((productData, productId) => {
    if (count < 3) { // Show first 3 products for testing
      console.log(`\nProduct ${productId}:`);
      console.log(`  Fragments: ${productData.fragments.length}`);
      
      const consolidatedPoint = consolidator.createConsolidatedPoint(productData);
      console.log(`  Content: ${consolidatedPoint.payload.content}`);
      console.log(`  Metadata:`, JSON.stringify(consolidatedPoint.payload.metadata, null, 2));
      
      consolidatedPoints.push(consolidatedPoint);
    }
    count++;
  });
  
  console.log(`\nTotal consolidated points: ${Array.from(productGroups.values()).length}`);
}

testConsolidation().catch(console.error);