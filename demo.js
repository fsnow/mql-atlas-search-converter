#!/usr/bin/env node

/**
 * Demo Script - MQL to Atlas Search Converter
 * Shows practical examples of the converter in action
 */

// Simulate the converter class (in a real environment, you'd load the file)
class MQLToAtlasSearchConverter {
    constructor(indexName = 'default') {
        this.indexName = indexName;
    }

    convertFindQuery(query, options = {}) {
        const searchStage = this.convertQueryToSearch(query);
        const pipeline = [searchStage];

        if (options.projection) pipeline.push({ $project: options.projection });
        if (options.sort) pipeline.push({ $sort: options.sort });
        if (options.skip) pipeline.push({ $skip: options.skip });
        if (options.limit) pipeline.push({ $limit: options.limit });

        return pipeline;
    }

    convertAggregationPipeline(pipeline) {
        const newPipeline = [];
        for (let i = 0; i < pipeline.length; i++) {
            const stage = pipeline[i];
            if (stage.$match) {
                const searchStage = this.convertQueryToSearch(stage.$match);
                newPipeline.push(searchStage);
            } else {
                newPipeline.push(stage);
            }
        }
        return newPipeline;
    }

    convertQueryToSearch(query) {
        if (Object.keys(query).length === 0) {
            return {
                $search: {
                    index: this.indexName,
                    exists: { path: '_id' }
                }
            };
        }

        const searchClauses = this.convertQuery(query);
        
        if (searchClauses.length === 1) {
            return {
                $search: {
                    index: this.indexName,
                    ...searchClauses[0]
                }
            };
        } else if (searchClauses.length > 1) {
            return {
                $search: {
                    index: this.indexName,
                    compound: {
                        must: searchClauses
                    }
                }
            };
        }

        throw new Error('Unable to convert query to Atlas Search');
    }

    convertQuery(query) {
        const clauses = [];
        for (const [field, value] of Object.entries(query)) {
            if (field.startsWith('$')) {
                clauses.push(...this.convertLogicalOperator(field, value));
            } else {
                clauses.push(...this.convertFieldQuery(field, value));
            }
        }
        return clauses;
    }

    convertLogicalOperator(operator, value) {
        switch (operator) {
            case '$and':
                return [{
                    compound: {
                        must: value.flatMap(subQuery => this.convertQuery(subQuery))
                    }
                }];
            case '$or':
                return [{
                    compound: {
                        should: value.flatMap(subQuery => this.convertQuery(subQuery)),
                        minimumShouldMatch: 1
                    }
                }];
            case '$nor':
                return [{
                    compound: {
                        mustNot: value.flatMap(subQuery => this.convertQuery(subQuery))
                    }
                }];
            default:
                throw new Error(`Unsupported logical operator: ${operator}`);
        }
    }

    convertFieldQuery(field, value) {
        if (value === null) {
            return [{
                compound: {
                    mustNot: [{ exists: { path: field } }]
                }
            }];
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
            return this.convertFieldOperators(field, value);
        }

        if (Array.isArray(value)) {
            return [{ in: { path: field, value: value } }];
        }

        return [{ equals: { path: field, value: value } }];
    }

    convertFieldOperators(field, operators) {
        const clauses = [];
        for (const [operator, value] of Object.entries(operators)) {
            switch (operator) {
                case '$eq':
                    clauses.push({ equals: { path: field, value: value } });
                    break;
                case '$ne':
                    clauses.push({
                        compound: {
                            mustNot: [{ equals: { path: field, value: value } }]
                        }
                    });
                    break;
                case '$gt':
                    clauses.push({ range: { path: field, gt: value } });
                    break;
                case '$gte':
                    clauses.push({ range: { path: field, gte: value } });
                    break;
                case '$lt':
                    clauses.push({ range: { path: field, lt: value } });
                    break;
                case '$lte':
                    clauses.push({ range: { path: field, lte: value } });
                    break;
                case '$in':
                    clauses.push({ in: { path: field, value: value } });
                    break;
                case '$nin':
                    clauses.push({
                        compound: {
                            mustNot: [{ in: { path: field, value: value } }]
                        }
                    });
                    break;
                case '$exists':
                    if (value) {
                        clauses.push({ exists: { path: field } });
                    } else {
                        clauses.push({
                            compound: {
                                mustNot: [{ exists: { path: field } }]
                            }
                        });
                    }
                    break;
                case '$not':
                    const notClauses = this.convertFieldOperators(field, value);
                    clauses.push({
                        compound: { mustNot: notClauses }
                    });
                    break;
                default:
                    console.warn(`Unsupported operator: ${operator} - skipping`);
            }
        }
        return clauses;
    }

    createTextSearch(searchText, path = '*', options = {}) {
        return {
            $search: {
                index: this.indexName,
                text: {
                    query: searchText,
                    path: path,
                    ...options
                }
            }
        };
    }

    createAutocomplete(query, path, options = {}) {
        return {
            $search: {
                index: this.indexName,
                autocomplete: {
                    query: query,
                    path: path,
                    ...options
                }
            }
        };
    }
}

// Demo function
function runDemo() {
    console.log('🚀 MQL to Atlas Search Converter - Live Demo');
    console.log('='.repeat(50));
    
    const converter = new MQLToAtlasSearchConverter('products_search');

    // Example 1: Basic equality query
    console.log('\n📝 Example 1: Basic Equality Query');
    console.log('MQL: { status: "active", category: "electronics" }');
    
    const query1 = { status: 'active', category: 'electronics' };
    const result1 = converter.convertFindQuery(query1);
    console.log('Atlas Search:');
    console.log(JSON.stringify(result1, null, 2));

    // Example 2: Range query with options
    console.log('\n📝 Example 2: Range Query with Options');
    console.log('MQL: { price: { $gte: 100, $lt: 500 }, inStock: true }');
    console.log('Options: { limit: 10, sort: { price: 1 } }');
    
    const query2 = { price: { $gte: 100, $lt: 500 }, inStock: true };
    const options2 = { limit: 10, sort: { price: 1 } };
    const result2 = converter.convertFindQuery(query2, options2);
    console.log('Atlas Search:');
    console.log(JSON.stringify(result2, null, 2));

    // Example 3: Logical operators
    console.log('\n📝 Example 3: Logical Operators ($or)');
    console.log('MQL: { $or: [{ category: "electronics" }, { category: "computers" }] }');
    
    const query3 = {
        $or: [
            { category: 'electronics' },
            { category: 'computers' }
        ]
    };
    const result3 = converter.convertFindQuery(query3);
    console.log('Atlas Search:');
    console.log(JSON.stringify(result3, null, 2));

    // Example 4: Complex nested query
    console.log('\n📝 Example 4: Complex Nested Query');
    console.log('MQL: Complex query with $and, $or, and range operators');
    
    const query4 = {
        $and: [
            { status: 'published' },
            { publishDate: { $gte: new Date('2024-01-01') } },
            {
                $or: [
                    { featured: true },
                    { priority: 'high' }
                ]
            }
        ]
    };
    const result4 = converter.convertFindQuery(query4);
    console.log('Atlas Search:');
    console.log(JSON.stringify(result4, null, 2));

    // Example 5: Array operations
    console.log('\n📝 Example 5: Array Operations ($in)');
    console.log('MQL: { tags: { $in: ["mongodb", "database", "nosql"] } }');
    
    const query5 = { tags: { $in: ['mongodb', 'database', 'nosql'] } };
    const result5 = converter.convertFindQuery(query5);
    console.log('Atlas Search:');
    console.log(JSON.stringify(result5, null, 2));

    // Example 6: Text search utility
    console.log('\n📝 Example 6: Text Search Utility');
    console.log('Text: "machine learning artificial intelligence"');
    console.log('Fields: ["title", "description", "content"]');
    
    const textSearch = converter.createTextSearch(
        'machine learning artificial intelligence',
        ['title', 'description', 'content'],
        { fuzzy: { maxEdits: 1 } }
    );
    console.log('Atlas Search:');
    console.log(JSON.stringify(textSearch, null, 2));

    // Example 7: Aggregation pipeline conversion
    console.log('\n📝 Example 7: Aggregation Pipeline Conversion');
    console.log('Pipeline with $match stage');
    
    const originalPipeline = [
        { $match: { category: 'electronics', price: { $gte: 100 } } },
        { $group: { _id: '$brand', avgPrice: { $avg: '$price' } } },
        { $sort: { avgPrice: -1 } }
    ];
    
    console.log('Original Pipeline:');
    console.log(JSON.stringify(originalPipeline, null, 2));
    
    const convertedPipeline = converter.convertAggregationPipeline(originalPipeline);
    console.log('\nConverted Pipeline:');
    console.log(JSON.stringify(convertedPipeline, null, 2));

    console.log('\n✅ Demo completed successfully!');
    console.log('\n💡 Usage in mongosh:');
    console.log('   load("mql-to-atlas-search.js")');
    console.log('   const converter = new MQLToAtlasSearchConverter("your_index");');
    console.log('   const pipeline = converter.convertFindQuery(yourQuery);');
    console.log('   db.collection.aggregate(pipeline);');
}

// Run the demo
runDemo();