#!/usr/bin/env node

/**
 * Create Atlas Search Index using MongoDB Driver (6.0+)
 * 
 * This script uses the official MongoDB driver createSearchIndex() method
 * available in MongoDB driver 6.0 and later.
 * 
 * Prerequisites:
 * 1. MongoDB driver 6.0+ (npm install mongodb@latest)
 * 2. MongoDB Atlas connection (Atlas Search only works on Atlas)
 * 
 * Usage: MONGODB_CONNECTION_STRING="..." node create-search-index-driver.js
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

console.log('🚀 Create Atlas Search Index using MongoDB Driver 6.0+');
console.log('='.repeat(60));

// Load MongoDB driver
let MongoClient;
try {
    const mongodb = require('mongodb');
    MongoClient = mongodb.MongoClient;
    colorLog('green', '✅ MongoDB driver loaded successfully');
    
    // Check if we have the createSearchIndex method
    if (mongodb.version) {
        console.log(`   Driver version: ${mongodb.version}`);
    }
} catch (error) {
    colorLog('red', '❌ MongoDB driver not found. Install with: npm install mongodb@latest');
    process.exit(1);
}

// Atlas Search index definition for our test suite
const searchIndex = {
    name: config.searchIndex,
    definition: {
        mappings: {
            dynamic: true,
            fields: {
                // String fields for exact matching (using token type for equals/in/range)
                status: {
                    type: "token"
                },
                category: {
                    type: "token"
                },
                priority: {
                    type: "token"
                },
                testType: {
                    type: "token"
                },
                
                // Array of strings (using token for exact matching)
                tags: {
                    type: "token"
                },
                skills: {
                    type: "token"
                },
                
                // Text fields for full-text search (using string type for text search)
                name: {
                    type: "string"
                },
                title: {
                    type: "string"
                },
                description: {
                    type: "string"
                },
                content: {
                    type: "string"
                },
                
                // Email field (using token for exact matching)
                email: {
                    type: "token"
                },
                
                // Numeric fields
                age: {
                    type: "number"
                },
                count: {
                    type: "number"
                },
                price: {
                    type: "number"
                },
                score: {
                    type: "number"
                },
                temperature: {
                    type: "number"
                },
                
                // Boolean fields
                isActive: {
                    type: "boolean"
                },
                featured: {
                    type: "boolean"
                },
                
                // Date fields
                createdAt: {
                    type: "date"
                },
                publishDate: {
                    type: "date"
                },
                updatedAt: {
                    type: "date"
                },
                deletedAt: {
                    type: "date"
                },
                
                // Autocomplete field example (using built-in autocomplete type)
                skillsAutocomplete: {
                    type: "autocomplete",
                    tokenization: "edgeGram",
                    minGrams: 2,
                    maxGrams: 15
                }
            }
        }
    }
};

async function createSearchIndexWithDriver() {
    let client;
    
    try {
        console.log();
        colorLog('blue', '⚙️  Configuration:');
        console.log(`   Connection: ${config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        console.log(`   Database: ${config.database}`);
        console.log(`   Collection: ${config.collection}`);
        console.log(`   Index Name: ${config.searchIndex}`);
        console.log();
        
        // Check if this is Atlas
        const isAtlas = config.connectionString.includes('mongodb+srv://');
        if (!isAtlas) {
            colorLog('yellow', '⚠️  Warning: Atlas Search only works with MongoDB Atlas');
            colorLog('yellow', '   Your connection string appears to be for local MongoDB');
            colorLog('yellow', '   This operation may fail if not connecting to Atlas');
            console.log();
        }
        
        colorLog('blue', '🔌 Connecting to MongoDB...');
        client = new MongoClient(config.connectionString);
        await client.connect();
        
        const db = client.db(config.database);
        const collection = db.collection(config.collection);
        
        // Test the connection
        await db.admin().ping();
        colorLog('green', '✅ Connected to MongoDB successfully');
        console.log();
        
        // Check if collection exists and has data
        const docCount = await collection.countDocuments();
        console.log(`   Documents in collection: ${docCount}`);
        
        if (docCount === 0) {
            colorLog('yellow', '⚠️  Collection is empty. Consider running: npm run setup:test-data');
        }
        
        // Check if search index already exists
        colorLog('blue', '🔍 Checking for existing search indexes...');
        
        try {
            const existingIndexes = await collection.listSearchIndexes().toArray();
            const existingIndex = existingIndexes.find(idx => idx.name === config.searchIndex);
            
            if (existingIndex) {
                console.log();
                colorLog('yellow', `⚠️  Search index '${config.searchIndex}' already exists`);
                console.log(`   Status: ${existingIndex.status || 'unknown'}`);
                console.log(`   ID: ${existingIndex.indexID || 'unknown'}`);
                
                if (existingIndex.status === 'READY') {
                    colorLog('green', '✅ Index is ready for use!');
                    colorLog('blue', '💡 You can now run: npm run test:real-mongodb-complete');
                    return;
                } else {
                    colorLog('yellow', `⏳ Index is still building (Status: ${existingIndex.status})`);
                    colorLog('yellow', '   Wait for it to become READY before running tests');
                    return;
                }
            } else {
                colorLog('blue', '📝 No existing search index found with this name');
            }
        } catch (error) {
            colorLog('yellow', '⚠️  Could not list search indexes: ' + error.message);
            colorLog('blue', '   Proceeding with index creation...');
        }
        
        // Create the search index using MongoDB driver 6.0+ method
        console.log();
        colorLog('blue', '🚀 Creating Atlas Search index using MongoDB driver...');
        colorLog('blue', '   Using collection.createSearchIndex() method');
        console.log();
        
        console.log('Index definition:');
        console.log(JSON.stringify(searchIndex, null, 2));
        console.log();
        
        // Use the official MongoDB driver method
        const result = await collection.createSearchIndex(searchIndex);
        
        colorLog('green', '✅ Atlas Search index creation initiated successfully!');
        console.log(`   Result: ${result}`);
        console.log();
        
        colorLog('yellow', '⏳ Index is now building...');
        colorLog('yellow', '   This typically takes 5-15 minutes');
        colorLog('yellow', '   Index will show as PENDING → BUILDING → READY');
        console.log();
        
        // Try to get the status immediately
        try {
            const newIndexes = await collection.listSearchIndexes().toArray();
            const newIndex = newIndexes.find(idx => idx.name === config.searchIndex);
            
            if (newIndex) {
                console.log(`   Current status: ${newIndex.status || 'PENDING'}`);
                console.log(`   Index ID: ${newIndex.indexID || result}`);
            }
        } catch (error) {
            colorLog('blue', '   (Status check will be available once indexing starts)');
        }
        
        console.log();
        colorLog('blue', '📋 Next Steps:');
        console.log('1. Wait for index status to become "READY"');
        console.log('   Check with: npm run check:search-index');
        console.log('2. Load test data: npm run setup:test-data (if not done)');
        console.log('3. Run tests: npm run test:real-mongodb-complete');
        
        console.log();
        colorLog('green', '🎉 Atlas Search index creation completed!');
        
    } catch (error) {
        colorLog('red', '❌ Error creating search index: ' + error.message);
        
        // Provide helpful error messages
        if (error.message.includes('createSearchIndex is not a function')) {
            colorLog('yellow', '💡 Your MongoDB driver version may be too old');
            colorLog('yellow', '   Update with: npm install mongodb@latest');
            colorLog('yellow', '   Requires MongoDB driver 6.0 or later');
        } else if (error.message.includes('search index')) {
            colorLog('yellow', '💡 This might not be a MongoDB Atlas cluster');
            colorLog('yellow', '   Atlas Search only works with MongoDB Atlas (cloud)');
        } else if (error.message.includes('authentication')) {
            colorLog('yellow', '💡 Check your Atlas connection string and credentials');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            colorLog('yellow', '💡 Check your network connection and firewall settings');
        }
        
        console.log();
        colorLog('blue', '💡 Alternative methods:');
        colorLog('blue', '   • Manual: npm run setup:search-index');
        colorLog('blue', '   • Atlas API: npm run setup:search-index-api');
        
        process.exit(1);
        
    } finally {
        if (client) {
            await client.close();
            colorLog('blue', '🔌 Disconnected from MongoDB');
        }
    }
}

// Show MongoDB driver capabilities
console.log();
colorLog('magenta', '📚 About MongoDB Driver 6.0+ Atlas Search Support:');
console.log('   ✅ createSearchIndex() - Create search indexes');
console.log('   ✅ listSearchIndexes() - List existing indexes');
console.log('   ✅ updateSearchIndex() - Modify existing indexes');
console.log('   ✅ dropSearchIndex() - Delete search indexes');
console.log('   ✅ $search aggregation - Run search queries');

// Run the creation
createSearchIndexWithDriver().catch(error => {
    colorLog('red', '❌ Script failed: ' + error.message);
    process.exit(1);
});
