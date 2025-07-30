#!/bin/bash

# Get all Shopware/Qdrant workflow IDs except the final consolidated one
echo "🗄️  Archiving all old Shopware/Qdrant workflows..."

# List all workflows and filter for Shopware/Qdrant, excluding the final one
docker exec n8n-production n8n list:workflow | \
  grep -E "(Shopware|shopware|Qdrant|qdrant)" | \
  grep -v "FINAL: Complete Shopware → Qdrant Sync" | \
  cut -d'|' -f1 | \
  while read workflow_id; do
    if [ ! -z "$workflow_id" ]; then
      echo "Archiving: $workflow_id"
      docker exec n8n-production n8n update:workflow --id="$workflow_id" --active=false 2>/dev/null
    fi
  done

echo ""
echo "✅ Archive complete!"
echo "🚀 Only 'FINAL: Complete Shopware → Qdrant Sync' remains active"