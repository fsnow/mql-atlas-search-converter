# MongoDB MQL to Atlas Search Converter

A JavaScript utility compatible with mongosh that converts standard MongoDB Query Language (MQL) queries and aggregation pipelines to their MongoDB Atlas Search equivalents using the `$search` operator.

## 🚀 Quick Demo

The converter successfully transforms MQL queries like:
```javascript
// MQL Query
{ status: 'active', age: { $gte: 18, $lt: 65 } }

// Becomes Atlas Search
{
  $search: {
    index: 'products_search',
    compound: {
      must: [
        { equals: { path: 'status', value: 'active' } },
        { range: { path: 'age', gte: 18 } },
        { range: { path: 'age', lt: 65 } }
      ]
    }
  }
}
```

## 📁 Project Structure

```
mql-atlas-search-converter/
├── mql-to-atlas-search.js    # Main converter implementation
├── test.js                   # Comprehensive test suite (50+ tests)
├── demo.js                   # Live demo with examples
├── run-tests.js             # Test runner script
├── package.json             # NPM package configuration
└── README.md               # This documentation
```

## ✨ Features

- **MQL Query Conversion**: Convert `find()` queries to Atlas Search aggregation pipelines
- **Aggregation Pipeline Conversion**: Transform `$match` stages to `$search` stages
- **Comprehensive Operator Support**: Handles equality, range, logical, and field existence operators
- **mongosh Compatible**: Designed to work seamlessly in MongoDB shell
- **Utility Methods**: Additional helpers for text search and autocomplete
- **Production Ready**: Includes comprehensive test suite with 50+ test cases

## 🧪 Testing

The project includes extensive testing with multiple test runners:

```bash
# Run main test suite (recommended)
npm test

# Alternative test runners
npm run test:simple     # Quick verification tests
npm run test:original   # Original test runner

# Run demos
npm run demo:simple     # Quick demo with examples
npm run demo           # Full featured demo

# Or run directly
node run-tests-fixed.js    # Recommended test runner
node run-tests-simple.js   # Quick functionality tests
node demo-simple.js        # Simple demo
```

**Test Coverage Includes:**
- ✅ Basic equality (string, number, boolean, date, null)
- ✅ Multiple fields (implicit $and)
- ✅ Comparison operators ($eq, $ne, $gt, $gte, $lt, $lte)
- ✅ Array operations ($in, $nin, implicit $in)
- ✅ Existence queries ($exists)
- ✅ Logical operators ($and, $or, $nor, $not)
- ✅ Complex nested queries
- ✅ Regex handling ($regex)
- ✅ Pipeline options (projection, sort, skip, limit)
- ✅ Aggregation pipeline conversion
- ✅ Text search and autocomplete utilities
- ✅ Edge cases and error handling
- ✅ All usage examples from documentation

## 🔧 Installation & Setup

### Option 1: Load from File (Recommended)

1. **Clone or download** this repository to your local machine
2. **Navigate to the directory** in mongosh
3. **Load the converter**:

```javascript
// Load the converter class
load('mql-to-atlas-search.js');

// Initialize with your Atlas Search index name
const converter = new MQLToAtlasSearchConverter('my_search_index');
```

### Option 2: Copy-Paste Method

1. **Copy the entire contents** of `mql-to-atlas-search.js`
2. **Paste directly into mongosh**
3. **Initialize the converter**:

```javascript
// After pasting the class definition
const converter = new MQLToAtlasSearchConverter('my_search_index');
```

### Option 3: One-Line Remote Load

```javascript
// Load directly from GitHub (requires network access)
load('https://raw.githubusercontent.com/your-repo/mql-atlas-search-converter/main/mql-to-atlas-search.js');
const converter = new MQLToAtlasSearchConverter('my_search_index');
```

## 🚀 Quick Start

```javascript
// Step 1: Load the converter (choose one method above)
load('mql-to-atlas-search.js');

// Step 2: Initialize with your Atlas Search index name
const converter = new MQLToAtlasSearchConverter('my_search_index');

// Step 3: Convert a simple MQL query
const mqlQuery = { status: 'active', age: { $gte: 18 } };
const pipeline = converter.convertFindQuery(mqlQuery);

// Step 4: Run the converted query
db.users.aggregate(pipeline);
```

## 🏃‍♂️ Complete mongosh Example

```javascript
// Complete working example in mongosh

// 1. Load the converter
load('mql-to-atlas-search.js');

// 2. Initialize (replace 'users_search' with your actual index name)
const converter = new MQLToAtlasSearchConverter('users_search');

// 3. Test with a simple query
const results = db.users.aggregate(
  converter.convertFindQuery({ status: 'active' })
);

// 4. Print results
results.forEach(doc => print(JSON.stringify(doc, null, 2)));

// 5. More complex example
const complexQuery = {
  status: 'published',
  publishDate: { $gte: new Date('2024-01-01') },
  tags: { $in: ['mongodb', 'atlas'] }
};

const complexResults = db.articles.aggregate(
  converter.convertFindQuery(complexQuery, { limit: 10 })
);

complexResults.forEach(doc => {
  print(`Title: ${doc.title}, Date: ${doc.publishDate}`);
});
```

## 📋 Supported MQL Operations

### Equality & Comparison Operators
- `$eq` → `equals` operator
- `$ne` → `equals` with compound negation
- `$gt`, `$gte`, `$lt`, `$lte` → `range` operator
- `$in` → `in` operator
- `$nin` → `in` with compound negation

### Logical Operators
- `$and` → `compound.must`
- `$or` → `compound.should` with `minimumShouldMatch: 1`
- `$nor` → `compound.mustNot`
- `$not` → `compound.mustNot`

### Field Operators
- `$exists` → `exists` operator
- `$regex` → Basic conversion to `text` search (simplified)
- `null` queries → `compound.mustNot.exists`

## 📚 API Reference

### Constructor

```javascript
new MQLToAtlasSearchConverter(indexName = 'default')
```

- `indexName` (string): Name of your Atlas Search index

### Methods

#### `convertFindQuery(query, options)`

Converts a standard MQL find query to an Atlas Search aggregation pipeline.

**Parameters:**
- `query` (Object): MQL query object
- `options` (Object): Additional options
  - `projection` (Object): Fields to include/exclude
  - `sort` (Object): Sort specification
  - `limit` (Number): Maximum documents to return
  - `skip` (Number): Documents to skip

**Returns:** Array - Atlas Search aggregation pipeline

**Example:**
```javascript
const query = { 
    status: 'published', 
    publishDate: { $gte: new Date('2024-01-01') },
    tags: { $in: ['mongodb', 'atlas'] }
};
const options = { limit: 10, sort: { publishDate: -1 } };
const pipeline = converter.convertFindQuery(query, options);
```

#### `convertAggregationPipeline(pipeline)`

Converts an aggregation pipeline by replacing `$match` stages with `$search` stages.

**Parameters:**
- `pipeline` (Array): Original aggregation pipeline

**Returns:** Array - Modified pipeline with Atlas Search

**Example:**
```javascript
const originalPipeline = [
    { $match: { category: 'electronics', price: { $gte: 100 } } },
    { $group: { _id: '$brand', avgPrice: { $avg: '$price' } } },
    { $sort: { avgPrice: -1 } }
];
const searchPipeline = converter.convertAggregationPipeline(originalPipeline);
```

#### `createTextSearch(searchText, path, options)`

Creates a text search query for full-text search capabilities.

**Parameters:**
- `searchText` (string): Text to search for
- `path` (string|Array): Field path(s) to search (default: '*')
- `options` (Object): Additional text search options

**Returns:** Object - Atlas Search pipeline stage

**Example:**
```javascript
const textSearchStage = converter.createTextSearch(
    'mongodb database tutorial', 
    ['title', 'content', 'tags'],
    { fuzzy: { maxEdits: 1 } }
);
```

#### `createAutocomplete(query, path, options)`

Creates an autocomplete search query for type-ahead functionality.

**Parameters:**
- `query` (string): Autocomplete query
- `path` (string): Field path for autocomplete
- `options` (Object): Additional autocomplete options

**Returns:** Object - Atlas Search pipeline stage

**Example:**
```javascript
const autocompleteStage = converter.createAutocomplete(
    'java',
    'skills',
    { tokenOrder: 'sequential' }
);
```

## 💡 Usage Examples

### Basic Query Conversion

```javascript
// Simple equality
const query1 = { status: 'active' };
const pipeline1 = converter.convertFindQuery(query1);
// Result: [{ $search: { index: 'default', equals: { path: 'status', value: 'active' } } }]

// Range query
const query2 = { age: { $gte: 18, $lt: 65 } };
const pipeline2 = converter.convertFindQuery(query2);
// Result: [{ $search: { index: 'default', compound: { must: [range queries] } } }]
```

### Complex Logical Queries

```javascript
// OR query
const query = {
    $or: [
        { category: 'electronics' },
        { category: 'computers' }
    ]
};
const pipeline = converter.convertFindQuery(query);

// AND with multiple conditions
const complexQuery = {
    $and: [
        { status: 'published' },
        { publishDate: { $gte: new Date('2024-01-01') } },
        { $or: [{ featured: true }, { priority: 'high' }] }
    ]
};
const complexPipeline = converter.convertFindQuery(complexQuery);
```

### Array and Existence Queries

```javascript
// Array membership
const arrayQuery = { tags: { $in: ['mongodb', 'database', 'nosql'] } };
const arrayPipeline = converter.convertFindQuery(arrayQuery);

// Field existence
const existsQuery = { 
    email: { $exists: true },
    deletedAt: { $exists: false }
};
const existsPipeline = converter.convertFindQuery(existsQuery);
```

### Converting Aggregation Pipelines

```javascript
const pipeline = [
    { $match: { status: 'active', age: { $gte: 18 } } },
    { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } },
    { $project: { name: 1, email: 1, orderCount: { $size: '$orders' } } },
    { $sort: { orderCount: -1 } },
    { $limit: 100 }
];

const searchPipeline = converter.convertAggregationPipeline(pipeline);
db.users.aggregate(searchPipeline);
```

### Text Search Examples

```javascript
// Full-text search across multiple fields
const textSearch = converter.createTextSearch(
    'machine learning artificial intelligence',
    ['title', 'description', 'content']
);

// Fuzzy text search
const fuzzySearch = converter.createTextSearch(
    'databse', // intentional typo
    'title',
    { fuzzy: { maxEdits: 2 } }
);

// Autocomplete for user input
const autocomplete = converter.createAutocomplete('mong', 'skills');
```

## ⚙️ Atlas Search Index Requirements

For the converter to work properly, your Atlas Search index should include the fields you're querying. Here's a basic index definition:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "standard"
      },
      "content": {
        "type": "string",
        "analyzer": "standard"
      },
      "tags": {
        "type": "stringFacet"
      },
      "publishDate": {
        "type": "date"
      },
      "skills": {
        "type": "autocomplete",
        "analyzer": "standard"
      }
    }
  }
}
```

## ⚠️ Limitations and Notes

1. **Regex Conversion**: Complex regex patterns are simplified to basic text searches
2. **Date Handling**: Ensure your Atlas Search index properly indexes date fields
3. **Performance**: Atlas Search queries may have different performance characteristics than standard MQL
4. **Scoring**: Atlas Search includes relevance scoring which may affect result ordering
5. **Field Types**: Some operators require specific field types in your search index
6. **Pagination**: Atlas Search uses cursor-based pagination (`searchAfter`/`searchBefore`) instead of `$skip`/`$limit` for optimal performance

## 🚽 Troubleshooting

### "ReferenceError: MQLToAtlasSearchConverter is not defined"

**Problem**: You're trying to use the converter without loading it first.

**Solution**:
```javascript
// Make sure to load the file first
load('mql-to-atlas-search.js');

// Then initialize
const converter = new MQLToAtlasSearchConverter('my_index');
```

### "Error: Cannot read property 'convertFindQuery' of undefined"

**Problem**: The converter wasn't initialized properly.

**Solution**:
```javascript
// Check that initialization worked
const converter = new MQLToAtlasSearchConverter('my_index');
console.log(typeof converter); // Should print 'object'
console.log(converter.convertFindQuery); // Should print '[Function]'
```

### "load: no such file or directory"

**Problem**: mongosh can't find the file.

**Solutions**:
```javascript
// Option 1: Use full path
load('/full/path/to/mql-to-atlas-search.js');

// Option 2: Change to the directory first in mongosh
use mydatabase  // Switch to your database
pwd()          // Check current directory
load('./mql-to-atlas-search.js');

// Option 3: Copy-paste the entire file content instead
```

### "Atlas Search query failed: index not found"

**Problem**: The specified search index doesn't exist.

**Solutions**:
```javascript
// Check available indexes
db.myCollection.listSearchIndexes();

// Use correct index name
const converter = new MQLToAtlasSearchConverter('actual_index_name');

// Create index if needed (in Atlas UI or via API)
```

### "No results returned" (but MQL query works)

**Problem**: Atlas Search index may not be synced or have different field mappings.

**Solutions**:
1. **Check index status** in MongoDB Atlas UI
2. **Wait for sync** (can take 5-10 minutes for new indexes)
3. **Verify field mappings** in your search index definition
4. **Test with simple query** first: `{ _id: ObjectId('...') }`

### Performance Issues

**Problem**: Converted queries are slow.

**Solutions**:
1. **Optimize your search index** with proper field types
2. **Use cursor pagination** instead of large `$skip` values
3. **Add search scoring** to improve relevance
4. **Limit result sets** with appropriate `$limit` values

## 🔧 Advanced Usage

### Custom Index Names

```javascript
// Use different indexes for different collections
const userConverter = new MQLToAtlasSearchConverter('users_search_index');
const productConverter = new MQLToAtlasSearchConverter('products_search_index');
```

### Combining with Other Pipeline Stages

```javascript
const searchPipeline = converter.convertFindQuery({ status: 'active' });

// Add additional stages
searchPipeline.push(
    { $addFields: { score: { $meta: 'searchScore' } } },
    { $sort: { score: -1, publishDate: -1 } },
    { $facet: {
        results: [{ $limit: 10 }],
        totalCount: [{ $count: 'count' }]
    }}
);

db.articles.aggregate(searchPipeline);
```

## 🤝 Contributing

This converter covers the most common MQL operations that overlap with Atlas Search functionality. If you need support for additional operators or have suggestions for improvements, please extend the converter as needed.

## 📄 License

This utility is provided as-is for educational and development purposes.