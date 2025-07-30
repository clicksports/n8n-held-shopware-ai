# 🐛 Debugging the IF Node Issue

## Problem
The "Check Has More Products" node is going to the FALSE branch immediately, which prevents pagination from working.

## Debugging Steps

### Step 1: Test the IF Node Logic
I've imported a simple test workflow: **"Simple Shopware Test"**

1. Open n8n: http://localhost:5678
2. Find "Simple Shopware Test" workflow
3. Click the Manual Trigger to execute
4. Check the console output

**Expected Result**: Should go to TRUE branch
**If it goes to FALSE**: The IF node has a configuration issue

### Step 2: Check the Main Debug Workflow
I've also imported: **"Shopware to Qdrant - Debug Fixed"**

This has detailed logging to see exactly what's happening:

1. Execute the debug workflow manually
2. Check the console logs for:
   - Initial data structure
   - hasMore value and type
   - Which branch the IF node takes

### Step 3: Common IF Node Issues in n8n

The most likely causes:

#### Issue 1: Type Mismatch
```javascript
// n8n IF nodes are very strict about types
// This might fail if hasMore is a string "true" instead of boolean true
leftValue: "={{ $json.hasMore }}"
rightValue: true  // boolean
```

#### Issue 2: Data Structure
```javascript
// If the data structure is different than expected:
// Expected: { hasMore: true }
// Actual: { products: { hasMore: true } }
```

#### Issue 3: Expression Syntax
```javascript
// Wrong: "={{ $json.products.hasMore }}"
// Right: "={{ $json.hasMore }}"
```

### Step 4: Manual Testing

You can test manually in n8n:

1. **Add an Expression Test Node** before the IF node:
   ```javascript
   console.log('Data:', JSON.stringify($json, null, 2));
   console.log('hasMore value:', $json.hasMore);
   console.log('hasMore type:', typeof $json.hasMore);
   console.log('Comparison result:', $json.hasMore === true);
   return $input.all();
   ```

2. **Test the Expression** in the IF node:
   - Click on the IF node
   - In the condition, click the expression field
   - Test: `{{ $json.hasMore }}`
   - It should show `true` in the preview

### Step 5: Quick Fix Options

If the simple test fails, try these fixes:

#### Fix 1: Force Boolean Conversion
```javascript
leftValue: "={{ Boolean($json.hasMore) }}"
```

#### Fix 2: Use String Comparison
```javascript
leftValue: "={{ $json.hasMore }}"
rightValue: "true"  // string instead of boolean
operator: "string equals"
```

#### Fix 3: Use JavaScript Expression
```javascript
leftValue: "={{ $json.hasMore === true }}"
rightValue: true
```

## Next Steps After Testing

1. **Run the simple test first** - this will tell us if it's a basic IF node issue
2. **Check the console logs** - they'll show the exact data types
3. **Report back what you see** - I can then fix the specific issue

## Quick Commands

```bash
# Check n8n logs
docker logs n8n-production --tail 50

# List imported workflows
docker exec n8n-production n8n list:workflow
```

The key is to see exactly what data is flowing through and why the IF condition is failing!