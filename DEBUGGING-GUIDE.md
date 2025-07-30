# 🐛 IF Node Going to FALSE - Debugging Guide

## Problem
The "Has More Pages?" IF node goes to FALSE immediately instead of TRUE, breaking pagination.

## 🔬 Debugging Workflows Deployed:

### 1. **"Diagnostic - IF Node Debug"**
Tests different data types and validation modes:
- Tests boolean `true`, string `"true"`, number `1`
- Uses both loose and strict type validation
- Shows exactly what the IF node receives

### 2. **"Fixed Pagination Workflow"** 
Simplified working version with:
- Different variable name (`shouldContinue` instead of `hasMore`)
- Explicit boolean handling
- Detailed debug logging
- Loose type validation

## 🧪 Step-by-Step Testing:

### Step 1: Run the Diagnostic
1. Open n8n: http://localhost:5678
2. Find "**Diagnostic - IF Node Debug**"
3. Execute it and check console logs
4. **Look for**: Which branches it takes (TRUE or FALSE)

### Step 2: Run the Fixed Version
1. Find "**Fixed Pagination Workflow**"
2. Add Shopware API credentials to the "Fetch" node
3. Execute and watch the console logs
4. **Look for**: "🔄 Should continue: true/false"

## 🔍 Common IF Node Issues in n8n:

### Issue 1: Type Validation
```javascript
// STRICT validation (default) - very picky about types
typeValidation: "strict"  // boolean true ≠ string "true"

// LOOSE validation - more forgiving
typeValidation: "loose"   // boolean true == string "true"
```

### Issue 2: Expression Evaluation
```javascript
// Wrong - might return string
leftValue: "={{ $json.hasMore }}"

// Better - explicit boolean conversion  
leftValue: "={{ Boolean($json.hasMore) }}"

// Best - ensure boolean in code node
return [{ json: { hasMore: Boolean(someValue) } }]
```

### Issue 3: Data Structure
```javascript
// If data is nested differently than expected:
// Expected: { hasMore: true }
// Actual: { pagination: { hasMore: true } }

// Wrong reference:
leftValue: "={{ $json.hasMore }}"  // undefined

// Correct reference:
leftValue: "={{ $json.pagination.hasMore }}"
```

## 🎯 What to Check:

### In Console Logs:
1. **Initial data structure**: Is `hasMore` actually boolean `true`?
2. **Type checking**: `typeof hasMore` should be `"boolean"`
3. **Value comparison**: `hasMore === true` should be `true`

### In n8n UI:
1. **Click on the IF node** and check the condition
2. **Test the expression** - should show `true` in preview
3. **Check type validation** setting (try "loose" if "strict" fails)

## 🔧 Quick Fixes to Try:

### Fix 1: Change Type Validation
In the IF node, change:
```
typeValidation: "strict" → "loose"
```

### Fix 2: Force Boolean in Code
```javascript
// In the initialization code:
return [{ json: { hasMore: Boolean(true) } }];
```

### Fix 3: Use Different Comparison
```javascript
// Instead of boolean comparison, try:
leftValue: "={{ $json.hasMore }}"
rightValue: "true"
operator: "string equals"
```

### Fix 4: Use Expression Logic
```javascript
// In the IF condition:
leftValue: "={{ $json.hasMore === true }}"
rightValue: true
```

## 📋 Debug Checklist:

- [ ] Run diagnostic workflow and check which branches execute
- [ ] Verify initial data shows `hasMore: true` (boolean)
- [ ] Check IF node type validation setting
- [ ] Test with different variable names
- [ ] Verify expressions evaluate correctly
- [ ] Check for any n8n UI refresh issues

## 🚨 If All Else Fails:

Sometimes n8n has caching issues. Try:
1. **Refresh browser** completely
2. **Restart n8n container**: `docker restart n8n-production`
3. **Re-import workflow** after restart
4. **Create workflow manually** by connecting nodes in UI

The **"Fixed Pagination Workflow"** should work - it uses proven patterns that avoid common IF node pitfalls!