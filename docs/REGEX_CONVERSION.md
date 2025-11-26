# Regex Conversion Guide

This document describes how the converter handles MQL `$regex` queries and converts them to Atlas Search.

## Current Implementation

The converter uses Atlas Search's native `regex` operator, which provides direct equivalence to MongoDB's `$regex`:

```javascript
// MQL
{ field: { $regex: "pattern", $options: "i" } }

// Converts to Atlas Search
{
  regex: {
    query: "pattern",
    path: "field",
    options: "i"
  }
}
```

## Atlas Search Regex Operator

### Supported Features

- **True regex support** with standard regex syntax
- **Case sensitivity control** via options parameter
- **Pattern anchors** (`^`, `$`) supported
- **Character classes** (`[a-z]`, `\d`) supported
- **Quantifiers** (`*`, `+`, `?`, `{n,m}`) supported
- **Groups and alternation** (`(abc|def)`) supported

### Syntax

```javascript
{
  regex: {
    query: "<regex-pattern>",
    path: "<field-path>",
    options: "<regex-options>"  // Optional: i, m, x, s
  }
}
```

### Options

| Option | Description |
|--------|-------------|
| `i` | Case insensitive |
| `m` | Multiline mode |
| `x` | Extended mode (ignore whitespace) |
| `s` | Dot matches newline |

## Conversion Examples

### Case-Sensitive Regex

```javascript
// MQL
{ title: { $regex: "mongodb" } }

// Atlas Search
{
  regex: {
    query: "mongodb",
    path: "title"
  }
}
```

### Case-Insensitive Regex

```javascript
// MQL
{ name: { $regex: "john", $options: "i" } }

// Atlas Search
{
  regex: {
    query: "john",
    path: "name",
    options: "i"
  }
}
```

### Complex Patterns

```javascript
// MQL
{ email: { $regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" } }

// Atlas Search
{
  regex: {
    query: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    path: "email"
  }
}
```

## Performance Considerations

### Index Requirements

- Fields used with `regex` should be properly indexed in Atlas Search
- Consider using string type mapping for exact text matching
- For complex patterns, ensure adequate index size limits

### Query Performance

- Simple patterns perform well with proper indexing
- Complex patterns may require more resources
- Anchored patterns (`^pattern`) typically perform better than unanchored

## Historical Context

Earlier versions of the converter used workaround approaches before native regex support was utilized:

### Previous Wildcard Approach

```javascript
// Wildcard approach (approximate, no longer used)
{
  wildcard: {
    query: "*pattern*",
    path: "field",
    allowAnalyzedField: true
  }
}
```

**Limitations of wildcard approach:**
- Case sensitivity differed from MQL expectations
- Complex regex patterns (`^`, `$`, `.*`) were not supported
- Word boundaries and anchors were lost in conversion

### Previous Text Search Approach

```javascript
// Text search approach (word-based, no longer used)
{
  text: {
    query: "pattern",
    path: "field"
  }
}
```

**Limitations of text search approach:**
- Word-based tokenization instead of pattern matching
- Less accurate for partial string matching

## When to Use Alternatives

While the native regex operator handles most cases, consider these alternatives for specific scenarios:

### For Exact Value Matching

Use `equals` instead of regex when matching complete values:

```javascript
// Instead of regex for exact values
{ status: { $regex: "^active$" } }

// Use equals (more efficient)
{ status: "active" }
```

### For Fuzzy Search

Atlas Search text operator with fuzzy matching may be more appropriate:

```javascript
{
  text: {
    query: "mongodb database",
    path: "title",
    fuzzy: { maxEdits: 1 }
  }
}
```

### For Simple Wildcards

If you only need simple prefix/suffix matching, wildcard may be sufficient:

```javascript
{
  wildcard: {
    query: "mongodb*",
    path: "title",
    allowAnalyzedField: true
  }
}
```
