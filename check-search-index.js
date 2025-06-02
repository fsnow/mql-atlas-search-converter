#!/usr/bin/env node

/**
 * Atlas Search Index Status Checker (MongoDB Driver)
 * 
 * This script shows what you CAN and CANNOT do with Atlas Search indexes
 * using the regular MongoDB driver.
 * 
 * CAN DO:
 * ✅ Check if search indexes exist
 * ✅ Get search index status
 * ✅ List existing search indexes
 * ✅ Test search functionality
 * 
 * CANNOT DO:
 * ❌ Create search indexes
 * ❌ Modify search indexes
 * ❌ Delete search indexes
 * 
 * Usage: MONGODB_CONNECTION_STRING="..." node check-search-index.js
 */

const fs = require('fs');

// Load configuration
const config = require('./mongodb-config.js');

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

console.log('🔍 Atlas Search Index Status Checker');
console.log('='.repeat(45));

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

async function checkSearchIndexes() {
    let client;
    
    try {
        console.log();
        colorLog('blue', '🔌 Connecting to MongoDB...');
        console.log(`Connection: ${config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        
        client = new MongoClient(config.connectionString);
        await client.connect();
        
        const db = client.db(config.database);
        const collection = db.collection(config.collection);
        
        colorLog('green', '✅ Connected to MongoDB');
        console.log(`Database: ${config.database}`);
        console.log(`Collection: ${config.collection}`);
        console.log();
        
        // Check if this is Atlas (search indexes only work on Atlas)
        const isAtlas = config.connectionString.includes('mongodb+srv://');
        
        if (!isAtlas) {
            colorLog('yellow', '⚠️  Local MongoDB detected');
            colorLog('yellow', '   Atlas Search indexes only work with MongoDB Atlas');
            colorLog('yellow', '   Regular indexes will be shown instead');
        }
        
        // Method 1: Try to list search indexes (Atlas only)
        console.log();
        colorLog('blue', '🔍 Checking for Atlas Search indexes...');
        
        try {
            // This is MongoDB 7.0+ method for listing search indexes
            const searchIndexes = await collection.listSearchIndexes().toArray();
            
            if (searchIndexes.length > 0) {
                colorLog('green', `✅ Found ${searchIndexes.length} Atlas Search index(es):`);
                
                searchIndexes.forEach((index, i) => {
                    console.log(`\n   ${i + 1}. Name: ${index.name || 'unnamed'}`);
                    console.log(`      Status: ${index.status || 'unknown'}`);
                    console.log(`      Type: ${index.type || 'search'}`);
                    
                    if (index.name === config.searchIndex) {
                        if (index.status === 'READY') {
                            colorLog('green', '      🎉 This is our test index and it\'s READY!');
                        } else {
                            colorLog('yellow', `      ⏳ This is our test index but status is: ${index.status}`);
                        }
                    }
                });
                
                // Test if our specific index exists and is ready
                const ourIndex = searchIndexes.find(idx => idx.name === config.searchIndex);
                if (ourIndex) {
                    if (ourIndex.status === 'READY') {
                        colorLog('green', `✅ Index '${config.searchIndex}' is ready for testing!`);
                    } else {
                        colorLog('yellow', `⏳ Index '${config.searchIndex}' exists but is still building`);
                        colorLog('yellow', '   Wait for status to become READY before running tests');
                    }
                } else {
                    colorLog('red', `❌ Index '${config.searchIndex}' not found`);
                    colorLog('yellow', '💡 Create it using: npm run setup:search-index');
                }
                
            } else {
                colorLog('yellow', '⚠️  No Atlas Search indexes found');
                colorLog('yellow', '💡 Create one using: npm run setup:search-index');
            }
            
        } catch (error) {
            if (error.message.includes('listSearchIndexes')) {
                colorLog('yellow', '⚠️  listSearchIndexes not available (MongoDB < 7.0 or not Atlas)');
            } else {
                colorLog('yellow', '⚠️  Could not list search indexes: ' + error.message);
            }
            
            // Try alternative method - attempt a search query
            console.log();
            colorLog('blue', '🔍 Testing Atlas Search availability...');
            
            try {
                const testPipeline = [
                    {
                        $search: {
                            index: config.searchIndex,
                            exists: { path: '_id' }
                        }
                    },
                    { $limit: 1 }
                ];
                
                const testResult = await collection.aggregate(testPipeline).toArray();
                colorLog('green', '✅ Atlas Search is working!');
                colorLog('green', `✅ Index '${config.searchIndex}' exists and is functional`);
                
            } catch (searchError) {
                if (searchError.message.includes('index not found')) {
                    colorLog('red', `❌ Atlas Search index '${config.searchIndex}' not found`);
                    colorLog('yellow', '💡 Create it using: npm run setup:search-index');
                } else if (searchError.message.includes('$search')) {
                    colorLog('red', '❌ Atlas Search not available');
                    colorLog('yellow', '💡 Atlas Search requires MongoDB Atlas (cloud)');
                } else {
                    colorLog('yellow', '⚠️  Atlas Search test failed: ' + searchError.message);
                }
            }
        }
        
        // Show regular indexes for comparison
        console.log();
        colorLog('blue', '🔍 Regular MongoDB indexes:');
        
        try {
            const regularIndexes = await collection.listIndexes().toArray();
            
            if (regularIndexes.length > 0) {
                colorLog('green', `✅ Found ${regularIndexes.length} regular index(es):`);
                regularIndexes.forEach((index, i) => {
                    console.log(`   ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
                });
            } else {
                colorLog('yellow', '⚠️  No regular indexes found');
            }
            
        } catch (error) {
            colorLog('red', '❌ Error listing regular indexes: ' + error.message);
        }
        
        // Show what you can and cannot do
        console.log();
        colorLog('magenta', '📋 What MongoDB Driver CAN do with Atlas Search:');
        console.log('   ✅ List existing search indexes (MongoDB 7.0+)');
        console.log('   ✅ Check search index status');
        console.log('   ✅ Run $search aggregation queries');
        console.log('   ✅ Test if search indexes are working');
        
        console.log();
        colorLog('magenta', '📋 What MongoDB Driver CANNOT do:');
        console.log('   ❌ Create Atlas Search indexes');
        console.log('   ❌ Modify Atlas Search indexes');
        console.log('   ❌ Delete Atlas Search indexes');
        console.log('   ❌ Change Atlas Search index mappings');
        
        console.log();
        colorLog('blue', '💡 To create Atlas Search indexes, use:');
        console.log('   • npm run setup:search-index (manual instructions)');
        console.log('   • npm run setup:search-index-api (automated via Atlas API)');
        console.log('   • MongoDB Atlas UI (https://cloud.mongodb.com)');
        console.log('   • MongoDB Compass with Atlas connection');
        console.log('   • Atlas CLI');
        
        // Test search functionality if index exists
        console.log();
        colorLog('blue', '🧪 Testing basic search functionality...');
        
        try {
            const searchTestPipeline = [
                {
                    $search: {
                        index: config.searchIndex,
                        exists: { path: '_id' }
                    }
                },
                { $limit: 3 },
                { $project: { _id: 1, status: 1, testType: 1 } }
            ];
            
            const searchResults = await collection.aggregate(searchTestPipeline).toArray();
            
            if (searchResults.length > 0) {
                colorLog('green', '✅ Atlas Search is working correctly!');
                console.log('   Sample search results:');
                searchResults.forEach(doc => {
                    console.log(`     ${doc._id}: ${JSON.stringify(doc)}`);
                });
                
                console.log();
                colorLog('green', '🎉 Ready to run real MongoDB tests!');
                colorLog('green', '   Run: npm run test:real-mongodb-complete');
                
            } else {
                colorLog('yellow', '⚠️  Search query succeeded but returned no results');
                colorLog('yellow', '   Make sure test data is loaded: npm run setup:test-data');
            }
            
        } catch (searchError) {
            colorLog('red', '❌ Search functionality test failed: ' + searchError.message);
        }
        
    } catch (error) {
        colorLog('red', '❌ Error: ' + error.message);
        
        if (error.message.includes('ENOTFOUND')) {
            colorLog('yellow', '💡 Check your connection string hostname');
        } else if (error.message.includes('authentication failed')) {
            colorLog('yellow', '💡 Check your username and password');
        }
        
    } finally {
        if (client) {
            await client.close();
            colorLog('blue', '🔌 Disconnected from MongoDB');
        }
    }
}

// Show configuration
console.log();
colorLog('blue', '⚙️  Configuration:');
console.log(`   Database: ${config.database}`);
console.log(`   Collection: ${config.collection}`);
console.log(`   Expected Search Index: ${config.searchIndex}`);

// Run the check
checkSearchIndexes().catch(error => {
    colorLog('red', '❌ Script failed: ' + error.message);
    process.exit(1);
});
