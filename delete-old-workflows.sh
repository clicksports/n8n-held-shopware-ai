#!/bin/bash

# Delete ALL old Shopware/Qdrant workflows except the final one
WORKFLOWS_TO_DELETE=(
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

echo "🗑️  Deleting ${#WORKFLOWS_TO_DELETE[@]} old workflows..."

for workflow_id in "${WORKFLOWS_TO_DELETE[@]}"; do
  echo "Deleting: $workflow_id"
  docker exec n8n-production n8n delete:workflow --id="$workflow_id" 2>/dev/null || echo "  - Could not delete (may be already gone)"
done

echo ""
echo "✅ Cleanup complete!"
echo "🚀 Only 'FINAL WORKING: Shopware → Qdrant Sync' remains"
echo ""
echo "Remaining Shopware workflows:"
docker exec n8n-production n8n list:workflow | grep -E "(Shopware|Qdrant)"