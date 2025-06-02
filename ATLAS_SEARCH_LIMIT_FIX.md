# Atlas Search Limit/Skip Fix

## Issue
Atlas Search was failing with error: `unrecognized field "limit"`

## Root Cause
Atlas Search `$search` stage does **NOT** support `limit` and `skip` as direct properties. These must be separate pipeline stages.

## What We Learned About Atlas Search Optimization

### ✅ **Supported in $search stage:**
- **Sort**: Can be embedded as `sort: { field: { order: 1|-1 } }`
- **Query operations**: All the MQL → Atlas Search conversions

### ❌ **NOT supported in $search stage:**
- **Limit**: Must be separate `$limit` stage
- **Skip**: Must be separate `$skip` stage  
- **Projection**: Must be separate `$project` stage

## Fix Applied

**Before (Incorrect):**
```javascript
{
  $search: {
    index: 'testdocs_search',
    equals: { path: 'status', value: 'published' },
    sort: { publishDate: { order: -1 } },
    limit: 10,  // ❌ Not supported!
    skip: 5     // ❌ Not supported!
  }
}
```

**After (Correct):**
```javascript
[
  {
    $search: {
      index: 'testdocs_search', 
      equals: { path: 'status', value: 'published' },
      sort: { publishDate: { order: -1 } }  // ✅ Only sort embedded
    }
  },
  { $skip: 5 },   // ✅ Separate stage
  { $limit: 10 }  // ✅ Separate stage
]
```

## Updated Optimization Strategy

### **Partial Optimization (Current Approach):**
- ✅ **Embed sort** in `$search` stage (performance benefit)
- ✅ **Keep limit/skip** as separate stages (requirement)
- ✅ **Combine query + sort** optimization where possible

### **Performance Benefits:**
1. **Sort optimization**: Atlas Search can sort during search rather than after
2. **Reduced pipeline complexity**: Fewer stages than original MQL approach
3. **Better resource usage**: Search + sort in single operation

## Test Results

✅ **Input Pipeline:**
```javascript
[
  { $match: { status: 'published' } },
  { $sort: { publishDate: -1 } },
  { $limit: 10 }
]
```

✅ **Optimized Output:**
```javascript
[
  { 
    $search: { 
      index: 'testdocs_search',
      equals: { path: 'status', value: 'published' },
      sort: { publishDate: { order: -1 } }
    } 
  },
  { $limit: 10 }
]
```

This approach provides meaningful optimization while respecting Atlas Search's architectural limitations.
