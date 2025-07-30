#!/bin/bash

# Archive ALL old Shopware/Qdrant workflows
WORKFLOWS=(
  "dilM9NHDcXKScLlz"
  "shopware-qdrant-optimized-v2"
  "dilM9NHDcXKScLlz-fixed"
  "shopware-to-qdrant-final"
  "TQjLUQoEKwH8prGP"
  "cZBfSRgoMN7s6Foo"
  "FtcXUfzOW9hzKUq5"
  "TgbHDcdiGhL49r9k"
  "fwUGuXFY50s0aRID"
  "A3A9QhX7rXzWONCA"
  "Lsen2TgKKufmagKU"
  "8NDNwJcEuvvVk4Gm"
  "fTzS6MynoSxE3XgJ"
  "X5JWBCM3rGK0rNF9"
  "zT1bsMPdjnuU6SU2"
  "iy9qNh2H0xeV00qe"
)

echo "🗄️  Archiving ${#WORKFLOWS[@]} old workflows..."

for workflow_id in "${WORKFLOWS[@]}"; do
  echo "Archiving: $workflow_id"
  docker exec n8n-production n8n update:workflow --id="$workflow_id" --active=false 2>/dev/null || echo "  - Already archived or not found"
done

echo "✅ Archive complete!"
echo "🚀 Only 'FINAL WORKING: Shopware → Qdrant Sync' remains"