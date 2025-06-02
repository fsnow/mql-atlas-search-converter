# Atlas Search Sort Format Fix

## Issue
Atlas Search was failing with error: `"sort.order" must be a number`

## Root Cause
The Atlas Search sort syntax requires numeric order values, not strings:

**MongoDB Sort:**
```javascript
{ publishDate: -1, price: 1 }
```

**Incorrect Atlas Search Sort (what we were generating):**
```javascript
{ 
  publishDate: { order: "desc" }, 
  price: { order: "asc" } 
}
```

**Correct Atlas Search Sort:**
```javascript
{ 
  publishDate: { order: -1 }, 
  price: { order: 1 } 
}
```

## Fix Applied
Updated `convertSortToAtlasSearch()` method to use numeric order values:

```javascript
// Before (incorrect)
searchSort[field] = {
    order: direction === 1 ? 'asc' : 'desc'
};

// After (correct)  
searchSort[field] = {
    order: direction  // Keep the original numeric value
};
```

## Test Results
✅ **MongoDB Sort** → **Atlas Search Sort**
- `{ publishDate: -1 }` → `{ publishDate: { order: -1 } }`
- `{ price: 1 }` → `{ price: { order: 1 } }`
- `{ _id: 1 }` → `{ _id: { order: 1 } }`
- `{ category: 1, price: -1 }` → `{ category: { order: 1 }, price: { order: -1 } }`

This fix resolves the "sort.order must be a number" error and ensures all sort operations work correctly with Atlas Search.
