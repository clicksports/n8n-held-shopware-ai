/**
 * Example usage of ProductConsolidator
 * Shows how to transform your fragmented data into consolidated format
 */

const ProductConsolidator = require('./consolidate-products');

// Example fragmented data from your vector database
const fragmentedPoints = [
  {
    id: "02836587-0140-4c7a-8645-02334ea2bd81",
    content: "Article: 062424-00/069-0-S | Form: 62424 | Size: S | Main Article: 062424-00 | EAN: 4049462952317 | Price: €299.95 | Stock: 5 | Available: Yes",
    metadata: {
      source: "blob",
      blobType: "application/json",
      line: 1,
      loc: {
        lines: {
          from: 1,
          to: 1
        }
      }
    },
    vectors: {
      default: {
        length: 1536
      }
    }
  },
  {
    id: "164e3f61-e714-4323-9ad1-974fdcc0f9e1",
    content: "https://shop.held.de/062424-00-069-0-s/062424-00",
    metadata: {
      source: "blob",
      blobType: "application/json",
      line: 5,
      loc: {
        lines: {
          from: 1,
          to: 1
        }
      }
    }
  },
  {
    id: "280c18d6-f51a-4a63-bf56-4050c07dc4b4",
    content: "Article: 006612-00/014-0-3 XL | Form: 6612 | Size: 3 XL | Main Article: 006612-00 | EAN: 4049462759114 | Price: €124.95 | Stock: 0 | Available: No",
    metadata: {
      source: "blob",
      blobType: "application/json",
      line: 1,
      loc: {
        lines: {
          from: 1,
          to: 1
        }
      }
    }
  },
  {
    id: "14b0f6f4-4c67-4e0a-b2fb-0d324305b52a",
    content: "Product 006612-00/014-0-3 XL",
    metadata: {
      source: "blob",
      blobType: "application/json",
      line: 14,
      loc: {
        lines: {
          from: 1,
          to: 1
        }
      }
    }
  }
];

// Transform fragmented data into consolidated products
const consolidatedProducts = ProductConsolidator.transformVectorPoints(fragmentedPoints);

console.log('Consolidated Products:');
console.log(JSON.stringify(consolidatedProducts, null, 2));

// Example of individual product structure:
/*
{
  "id": "062424-00",
  "content": {
    "article": "062424-00/069-0-S",
    "form": "62424",
    "size": "S",
    "mainArticle": "062424-00",
    "ean": "4049462952317",
    "price": {
      "value": 299.95,
      "currency": "EUR"
    },
    "stock": 5,
    "available": true,
    "url": "https://shop.held.de/062424-00-069-0-s/062424-00"
  },
  "metadata": {
    "source": "blob",
    "sourceType": "blob",
    "blobType": "application/json",
    "location": {
      "line": 1,
      "lines": {
        "from": 1,
        "to": 1
      }
    },
    "timestamps": {},
    "fragments": [
      {
        "line": 1,
        "type": "product_info",
        "content": "Article: 062424-00/069-0-S | Form: 62424 | Size: S..."
      },
      {
        "line": 5,
        "type": "product_url",
        "content": "https://shop.held.de/062424-00-069-0-s/062424-00"
      }
    ]
  },
  "vectors": {
    "default": {
      "length": 1536
    }
  }
}
*/