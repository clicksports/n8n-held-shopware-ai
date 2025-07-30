#!/bin/bash

echo "Testing Qdrant API formats..."

# Test 1: Create collection
echo -e "\n1. Creating test collection..."
curl -X PUT http://localhost:6333/collections/test_api \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 384, "distance": "Cosine"}}' \
  2>/dev/null | jq '.'

# Test 2: Upload points - Format A
echo -e "\n2. Testing upload format A (points array)..."
curl -X PUT http://localhost:6333/collections/test_api/points \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": 1,
        "payload": {"name": "test1"},
        "vector": null
      }
    ]
  }' \
  2>/dev/null | jq '.'

# Test 3: Upload points - Format B
echo -e "\n3. Testing upload format B (batch)..."
curl -X PUT http://localhost:6333/collections/test_api/points \
  -H "Content-Type: application/json" \
  -d '{
    "batch": {
      "ids": [2],
      "payloads": [{"name": "test2"}],
      "vectors": null
    }
  }' \
  2>/dev/null | jq '.'

# Clean up
echo -e "\n4. Cleaning up..."
curl -X DELETE http://localhost:6333/collections/test_api 2>/dev/null | jq '.'