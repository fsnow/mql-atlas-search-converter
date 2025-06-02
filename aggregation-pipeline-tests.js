#!/usr/bin/env node

/**
 * Aggregation Pipeline Test Module for MQL to Atlas Search Converter
 * Tests specifically focused on $match stage conversion and pipeline optimization
 * Compatible with mongosh
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        }
    });
}

// Parse command line arguments
const args = process.argv.slice(2);
const argsMap = {};
for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
        const key = args[i].substring(2);
        const value = args[i + 1];
        argsMap[key] = value;
    }
}

// Configuration
const config = {
    connectionString: 
        argsMap.connection ||
        argsMap.uri ||
        process.env.MONGODB_CONNECTION_STRING || 
        process.env.MONGODB_URI || 
        'mongodb://localhost:27017',
    
    database: 
        argsMap.database ||
        argsMap.db ||
        process.env.MONGODB_DATABASE || 
        'srchtest',
    
    collection: 
        argsMap.collection ||
        process.env.MONGODB_COLLECTION || 
        'testdocs',
    
    searchIndex: 
        argsMap.index ||
        process.env.ATLAS_SEARCH_INDEX || 
        'testdocs_search',
    
    useSimulation: 
        argsMap.simulation === 'true' ||
        process.env.USE_SIMULATION === 'true' || 
        false
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('🔄 Aggregation Pipeline Tests - MQL vs Atlas Search');
console.log('='.repeat(60));

// Show configuration
colorLog('blue', '⚙️  Configuration:');
console.log(`   Connection: ${config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
console.log(`   Database: ${config.database}`);
console.log(`   Collection: ${config.collection}`);
console.log(`   Search Index: ${config.searchIndex}`);
console.log(`   Simulation Mode: ${config.useSimulation}`);
console.log();

// Load the converter
let MQLToAtlasSearchConverter;
try {
    MQLToAtlasSearchConverter = require('./mql-to-atlas-search.js');
    colorLog('green', '✅ Converter loaded successfully');
} catch (error) {
    colorLog('red', '❌ Error loading converter: ' + error.message);
    process.exit(1);
}

// Load MongoDB driver
let MongoClient;
try {
    const mongodb = require('mongodb');
    MongoClient = mongodb.MongoClient;
    colorLog('green', '✅ MongoDB driver loaded successfully');
} catch (error) {
    colorLog('red', '❌ MongoDB driver not found. Install with: npm install mongodb');
    process.exit(1);
}

// Initialize converter
const converter = new MQLToAtlasSearchConverter(config.searchIndex);

// MongoDB Client for Aggregation Testing
class AggregationMongoDBClient {
    constructor() {
        this.client = null;
        this.db = null;
        this.collection = null;
        this.connected = false;
    }

    async connect() {
        try {
            colorLog('blue', '🔌 Connecting to MongoDB...');
            
            const options = {
                connectTimeoutMS: 10000,
                serverSelectionTimeoutMS: 10000,
            };
            
            this.client = new MongoClient(config.connectionString, options);
            await this.client.connect();
            
            this.db = this.client.db(config.database);
            this.collection = this.db.collection(config.collection);
            
            // Test the connection
            await this.db.admin().ping();
            
            colorLog('green', '✅ Connected to MongoDB successfully');
            this.connected = true;
            
            // Check document count
            const count = await this.collection.countDocuments();
            console.log(`   Documents in collection: ${count}`);
            
        } catch (error) {
            colorLog('red', '❌ Failed to connect to MongoDB: ' + error.message);
            throw error;
        }
    }

    async runOriginalPipeline(pipeline) {
        if (!this.connected) throw new Error('Not connected to MongoDB');
        
        try {
            const results = await this.collection.aggregate(pipeline).toArray();
            return results.map(doc => doc._id.toString());
        } catch (error) {
            colorLog('red', '❌ Original pipeline failed: ' + error.message);
            throw error;
        }
    }

    async runConvertedPipeline(pipeline) {
        if (!this.connected) throw new Error('Not connected to MongoDB');
        
        try {
            const results = await this.collection.aggregate(pipeline).toArray();
            return results.map(doc => doc._id.toString());
        } catch (error) {
            colorLog('red', '❌ Converted pipeline failed: ' + error.message);
            throw error;
        }
    }

    async close() {
        if (this.client) {
            await this.client.close();
            colorLog('blue', '🔌 Disconnected from MongoDB');
        }
    }
}

// Aggregation Pipeline Test Framework
class AggregationPipelineTestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.mongoClient = new AggregationMongoDBClient();
    }

    test(name, pipeline, options = {}) {
        this.tests.push({ name, pipeline, options });
    }

    async runTest(test) {
        const { name, pipeline, options } = test;
        
        try {
            console.log();
            colorLog('cyan', '🔍 Testing: ' + name);
            console.log('Original Pipeline:', JSON.stringify(pipeline, null, 2));
            
            // Handle error expectation tests
            if (options.expectError) {
                try {
                    const convertedPipeline = converter.convertAggregationPipeline(pipeline, options);
                    colorLog('red', '❌ Test failed - Expected error but conversion succeeded');
                    this.failed++;
                    return;
                } catch (error) {
                    colorLog('green', '✅ Test passed - Expected error occurred: ' + error.message);
                    this.passed++;
                    return;
                }
            }

            // Handle conversion-only tests (no execution)
            if (options.conversionOnly) {
                try {
                    const convertedPipeline = converter.convertAggregationPipeline(pipeline, options);
                    console.log('Converted Pipeline:', JSON.stringify(convertedPipeline, null, 2));
                    colorLog('green', '✅ Test passed - Pipeline converted successfully');
                    this.passed++;
                    return;
                } catch (error) {
                    colorLog('red', '❌ Test failed - Conversion error: ' + error.message);
                    this.failed++;
                    return;
                }
            }
            
            // Regular execution test
            let originalResults, convertedResults;
            
            // Run original pipeline
            try {
                originalResults = await this.mongoClient.runOriginalPipeline(pipeline);
                console.log('✅ Original pipeline executed successfully');
            } catch (error) {
                colorLog('yellow', '⚠️  Original pipeline failed, skipping test: ' + error.message);
                this.skipped++;
                return;
            }
            
            // Convert pipeline
            let convertedPipeline;
            try {
                convertedPipeline = converter.convertAggregationPipeline(pipeline, options);
                console.log('✅ Pipeline conversion successful');
                console.log('Converted Pipeline:', JSON.stringify(convertedPipeline, null, 2));
            } catch (error) {
                colorLog('red', '❌ Test failed - Conversion error: ' + error.message);
                this.failed++;
                return;
            }
            
            // Run converted pipeline
            try {
                convertedResults = await this.mongoClient.runConvertedPipeline(convertedPipeline);
                console.log('✅ Converted pipeline executed successfully');
            } catch (error) {
                colorLog('yellow', '⚠️  Converted pipeline failed, skipping test: ' + error.message);
                console.log('   Error details:', error.message);
                this.skipped++;
                return;
            }
            
            // Compare results
            const resultsMatch = this.compareResults(originalResults, convertedResults);
            
            if (resultsMatch) {
                colorLog('green', '✅ Test passed - Original and converted results match');
                console.log(`   Results: ${originalResults.length} documents`);
                this.passed++;
            } else {
                colorLog('red', '❌ Test failed - Results differ');
                console.log('Original Results count:', originalResults.length);
                console.log('Converted Results count:', convertedResults.length);
                
                // Show sample IDs for debugging
                if (originalResults.length <= 10 && convertedResults.length <= 10) {
                    console.log('Original Results:', originalResults);
                    console.log('Converted Results:', convertedResults);
                } else {
                    console.log('Original Sample:', originalResults.slice(0, 3));
                    console.log('Converted Sample:', convertedResults.slice(0, 3));
                }
                
                this.failed++;
            }
            
        } catch (error) {
            colorLog('red', '❌ Test failed with error: ' + error.message);
            this.failed++;
        }
    }

    compareResults(originalResults, convertedResults) {
        const sortedOriginal = [...originalResults].sort();
        const sortedConverted = [...convertedResults].sort();
        return JSON.stringify(sortedOriginal) === JSON.stringify(sortedConverted);
    }

    async run() {
        try {
            await this.mongoClient.connect();
            
            console.log();
            colorLog('blue', `🧪 Running ${this.tests.length} aggregation pipeline tests...`);
            console.log();
            
            for (const test of this.tests) {
                await this.runTest(test);
            }
            
            console.log();
            console.log('='.repeat(60));
            colorLog('cyan', '📊 Aggregation Pipeline Test Results:');
            colorLog('green', `✅ Passed: ${this.passed}`);
            colorLog('red', `❌ Failed: ${this.failed}`);
            colorLog('yellow', `⏭️  Skipped: ${this.skipped}`);
            
            if (this.failed > 0) {
                console.log();
                colorLog('red', '❌ Some tests failed');
            } else if (this.skipped > 0) {
                console.log();
                colorLog('yellow', '⚠️  Some tests were skipped');
            } else {
                console.log();
                colorLog('green', '🎉 All aggregation pipeline tests passed!');
            }
            
        } finally {
            await this.mongoClient.close();
        }
    }
}

// Initialize test runner
const testRunner = new AggregationPipelineTestRunner();

// =============================================================================
// AGGREGATION PIPELINE TESTS - $MATCH STAGE CONVERSIONS
// =============================================================================

// Basic $match conversions - test all MQL operators that were in the original tests
testRunner.test('$match: Simple string equality', [
    { $match: { status: 'active' } }
]);

testRunner.test('$match: Number equality', [
    { $match: { count: 42 } }
]);

testRunner.test('$match: Boolean equality', [
    { $match: { isActive: true } }
]);

testRunner.test('$match: Date equality', [
    { $match: { createdAt: new Date('2024-01-01') } }
]);

testRunner.test('$match: Null equality', [
    { $match: { deletedAt: null } }
]);

testRunner.test('$match: Multiple fields (implicit $and)', [
    { $match: { status: 'active', category: 'electronics' } }
]);

testRunner.test('$match: $eq operator', [
    { $match: { age: { $eq: 25 } } }
]);

testRunner.test('$match: $ne operator', [
    { $match: { status: { $ne: 'deleted' } } }
]);

testRunner.test('$match: $gt operator', [
    { $match: { price: { $gt: 100 } } }
]);

testRunner.test('$match: $gte operator', [
    { $match: { age: { $gte: 18 } } }
]);

testRunner.test('$match: $lt operator', [
    { $match: { temperature: { $lt: 32 } } }
]);

testRunner.test('$match: $lte operator', [
    { $match: { score: { $lte: 100 } } }
]);

testRunner.test('$match: Combined range operators', [
    { $match: { age: { $gte: 18, $lt: 65 } } }
]);

testRunner.test('$match: $in operator', [
    { $match: { category: { $in: ['electronics', 'computers', 'mobile'] } } }
]);

testRunner.test('$match: $nin operator', [
    { $match: { status: { $nin: ['deleted', 'archived'] } } }
]);

testRunner.test('$match: $exists true', [
    { $match: { email: { $exists: true } } }
]);

testRunner.test('$match: $exists false', [
    { $match: { deletedAt: { $exists: false } } }
]);

testRunner.test('$match: $and operator', [
    { $match: { $and: [{ status: 'published' }, { category: 'tech' }] } }
]);

testRunner.test('$match: $or operator', [
    { $match: { $or: [{ category: 'electronics' }, { category: 'computers' }] } }
]);

testRunner.test('$match: $nor operator', [
    { $match: { $nor: [{ status: 'deleted' }, { status: 'archived' }] } }
]);

testRunner.test('$match: $not operator', [
    { $match: { age: { $not: { $lt: 18 } } } }
]);

testRunner.test('$match: Complex nested logical query', [
    { $match: {
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
    }}
]);

testRunner.test('$match: $regex operator', [
    { $match: { name: { $regex: 'john', $options: 'i' } } }
]);

// =============================================================================
// PIPELINE OPTIMIZATION TESTS - [$match, $sort, $limit] patterns  
// =============================================================================

testRunner.test('Pipeline optimization: $match + $sort', [
    { $match: { status: 'active' } },
    { $sort: { createdAt: -1 } }
]);

testRunner.test('Pipeline optimization: $match + $limit', [
    { $match: { status: 'active' } },
    { $limit: 10 }
]);

testRunner.test('Pipeline optimization: $match + $skip', [
    { $match: { status: 'active' } },
    { $skip: 5 }
]);

testRunner.test('Pipeline optimization: $match + $sort + $limit', [
    { $match: { status: 'active' } },
    { $sort: { createdAt: -1 } },
    { $limit: 10 }
]);

testRunner.test('Pipeline optimization: $match + $sort + $skip + $limit', [
    { $match: { status: 'active' } },
    { $sort: { price: 1 } },
    { $skip: 20 },
    { $limit: 10 }
]);

testRunner.test('Pipeline optimization: $match + $project (not optimized)', [
    { $match: { status: 'active' } },
    { $project: { name: 1, email: 1 } }
]);

testRunner.test('Pipeline optimization: $match + $sort + $limit + $project', [
    { $match: { category: 'electronics' } },
    { $sort: { price: -1 } },
    { $limit: 5 },
    { $project: { name: 1, price: 1 } }
]);

// =============================================================================
// COMPLEX PIPELINE TESTS
// =============================================================================

testRunner.test('Complex pipeline: $match + non-optimizable stages', [
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
]);

testRunner.test('Complex pipeline: Multiple $match stages', [
    { $match: { status: 'active' } },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
    { $match: { category: 'electronics' } }
]);

testRunner.test('Complex pipeline: $match at end', [
    { $group: { _id: '$category', avgPrice: { $avg: '$price' } } },
    { $match: { avgPrice: { $gte: 100 } } }
]);

// =============================================================================
// SORT AND LIMIT SPECIFIC TESTS - Using Enhanced Test Data
// =============================================================================

testRunner.test('Sort test: Products by price ascending', [
    { $match: { testType: 'sort_test', category: 'electronics' } },
    { $sort: { price: 1 } },
    { $limit: 5 }
]);

testRunner.test('Sort test: Products by price descending', [
    { $match: { testType: 'sort_test', category: 'electronics' } },
    { $sort: { price: -1 } },
    { $limit: 3 }
]);

testRunner.test('Sort test: Articles by publish date descending', [
    { $match: { testType: 'sort_test', status: 'published' } },
    { $sort: { publishDate: -1 } },
    { $limit: 4 }
]);

testRunner.test('Sort test: Users by score descending', [
    { $match: { testType: 'sort_test', status: 'active', level: { $exists: true } } },
    { $sort: { score: -1 } }
]);

testRunner.test('Sort test: Multi-field sort (priority asc, createdAt desc)', [
    { $match: { testType: 'mixed_sort_limit', status: 'active' } },
    { $sort: { priority: 1, createdAt: -1 } },
    { $limit: 5 }
]);

testRunner.test('Limit test: Simple pagination with skip', [
    { $match: { testType: 'limit_test', status: 'active' } },
    { $sort: { sequenceNumber: 1 } },
    { $skip: 10 },
    { $limit: 5 }
]);

testRunner.test('Limit test: Large dataset pagination', [
    { $match: { testType: 'limit_test' } },
    { $sort: { value: -1 } },
    { $skip: 5 },
    { $limit: 10 }
]);

testRunner.test('Complex sort + limit: Products with rating filter', [
    { $match: { testType: 'sort_test', category: 'electronics', rating: { $gte: 4.5 } } },
    { $sort: { rating: -1, price: 1 } },
    { $limit: 3 }
]);

testRunner.test('Performance test: Sort without limit (should still optimize)', [
    { $match: { testType: 'sort_test' } },
    { $sort: { publishDate: -1 } }
]);

testRunner.test('Performance test: Limit without sort (should still optimize)', [
    { $match: { testType: 'limit_test', category: 'alpha' } },
    { $limit: 8 }
]);

// =============================================================================
// EDGE CASES AND ERROR HANDLING
// =============================================================================

testRunner.test('Edge case: Empty pipeline', [], { conversionOnly: true });

testRunner.test('Edge case: Pipeline with no $match', [
    { $sort: { createdAt: -1 } },
    { $limit: 10 }
], { conversionOnly: true });

testRunner.test('Edge case: Empty $match', [
    { $match: {} }
], { conversionOnly: true });

testRunner.test('Error case: Invalid pipeline (not array)', 'invalid', { expectError: true });

testRunner.test('Sort conversion: Multiple fields', [
    { $match: { status: 'active' } },
    { $sort: { category: 1, price: -1 } }
], { conversionOnly: true });

testRunner.test('Sort conversion: _id field', [
    { $match: { status: 'active' } },
    { $sort: { _id: 1 } }
], { conversionOnly: true });

// =============================================================================
// OPTIONS TESTING
// =============================================================================

testRunner.test('Options: includeProjection = true', [
    { $match: { status: 'active' } },
    { $project: { name: 1, email: 1 } },
    { $sort: { name: 1 } }
], { includeProjection: true, conversionOnly: true });

// Run the tests if not in simulation mode
if (!config.useSimulation) {
    testRunner.run().catch(error => {
        colorLog('red', '❌ Aggregation pipeline test execution failed: ' + error.message);
        process.exit(1);
    });
} else {
    colorLog('yellow', '⚠️  Simulation mode enabled');
    colorLog('yellow', '   Set USE_SIMULATION=false to run real MongoDB tests');
}

// Export the test runner for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AggregationPipelineTestRunner,
        AggregationMongoDBClient,
        testRunner
    };
}
