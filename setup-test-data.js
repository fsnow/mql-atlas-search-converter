#!/usr/bin/env node

/**
 * Test Data Setup Script
 * 
 * This script creates sample test data for real MongoDB integration testing
 * 
 * Usage: node setup-test-data.js
 */

const config = require('./mongodb-config.js');

// Load MongoDB driver
let MongoClient;
try {
    const mongodb = require('mongodb');
    MongoClient = mongodb.MongoClient;
    console.log('✅ MongoDB driver loaded');
} catch (error) {
    console.error('❌ MongoDB driver not found. Install with: npm install mongodb');
    process.exit(1);
}

// Sample test data
const testDocuments = [
    // Basic equality tests
    { _id: 'test_string_equality_pos', status: 'active', testType: 'string_equality' },
    { _id: 'test_string_equality_neg', status: 'inactive', testType: 'string_equality' },
    
    // Number tests
    { _id: 'test_number_equality_pos', count: 42, testType: 'number_equality' },
    { _id: 'test_number_equality_neg', count: 24, testType: 'number_equality' },
    
    // Boolean tests
    { _id: 'test_boolean_equality_pos', isActive: true, testType: 'boolean_equality' },
    { _id: 'test_boolean_equality_neg', isActive: false, testType: 'boolean_equality' },
    
    // Date tests
    { _id: 'test_date_equality_pos', createdAt: new Date('2024-01-01'), testType: 'date_equality' },
    { _id: 'test_date_equality_neg', createdAt: new Date('2023-01-01'), testType: 'date_equality' },
    
    // Null tests
    { _id: 'test_null_equality_pos', deletedAt: null, testType: 'null_equality' },
    { _id: 'test_null_equality_neg', deletedAt: new Date(), testType: 'null_equality' },
    
    // Range tests
    { _id: 'test_range_gte_pos', age: 25, testType: 'range_gte' },
    { _id: 'test_range_gte_neg', age: 15, testType: 'range_gte' },
    { _id: 'test_range_lt_pos', temperature: 20, testType: 'range_lt' },
    { _id: 'test_range_lt_neg', temperature: 40, testType: 'range_lt' },
    { _id: 'test_range_combined_pos', age: 30, testType: 'range_combined' },
    { _id: 'test_range_combined_neg1', age: 10, testType: 'range_combined' },
    { _id: 'test_range_combined_neg2', age: 70, testType: 'range_combined' },
    
    // Comparison tests
    { _id: 'test_gt_pos', price: 150, testType: 'gt_test' },
    { _id: 'test_gt_neg', price: 50, testType: 'gt_test' },
    { _id: 'test_lte_pos', score: 85, testType: 'lte_test' },
    { _id: 'test_lte_neg', score: 120, testType: 'lte_test' },
    { _id: 'test_ne_pos', status: 'published', testType: 'ne_test' },
    { _id: 'test_ne_neg', status: 'deleted', testType: 'ne_test' },
    
    // Array and $in tests
    { _id: 'test_in_pos', category: 'electronics', testType: 'in_test' },
    { _id: 'test_in_neg', category: 'books', testType: 'in_test' },
    { _id: 'test_nin_pos', status: 'published', testType: 'nin_test' },
    { _id: 'test_nin_neg', status: 'deleted', testType: 'nin_test' },
    { _id: 'test_implicit_in_pos', tags: ['mongodb', 'database'], testType: 'implicit_in' },
    { _id: 'test_implicit_in_neg', tags: ['python', 'web'], testType: 'implicit_in' },
    
    // Existence tests
    { _id: 'test_exists_true_pos', email: 'user@example.com', testType: 'exists_test' },
    { _id: 'test_exists_true_neg', testType: 'exists_test' }, // No email field
    { _id: 'test_exists_false_pos', testType: 'exists_false' }, // No deletedAt field
    { _id: 'test_exists_false_neg', deletedAt: new Date(), testType: 'exists_false' },
    
    // Logical operator tests
    { _id: 'test_and_pos', status: 'published', category: 'tech', testType: 'and_test' },
    { _id: 'test_and_neg1', status: 'draft', category: 'tech', testType: 'and_test' },
    { _id: 'test_and_neg2', status: 'published', category: 'sports', testType: 'and_test' },
    { _id: 'test_or_pos1', category: 'electronics', testType: 'or_test' },
    { _id: 'test_or_pos2', category: 'computers', testType: 'or_test' },
    { _id: 'test_or_neg', category: 'books', testType: 'or_test' },
    { _id: 'test_nor_pos', status: 'published', testType: 'nor_test' },
    { _id: 'test_nor_neg', status: 'deleted', testType: 'nor_test' },
    
    // Regex tests
    { _id: 'test_regex_pos', name: 'John Smith', testType: 'regex_test' },
    { _id: 'test_regex_neg', name: 'Alice Johnson', testType: 'regex_test' },
    
    // Regex test for title field (to match the test case)
    { _id: 'test_regex_title_pos', title: 'Learning mongodb basics', testType: 'regex_title_test' },
    { _id: 'test_regex_title_neg', title: 'PostgreSQL tutorial', testType: 'regex_title_test' },
    
    // Complex nested tests
    { 
        _id: 'test_complex_pos', 
        status: 'published', 
        publishDate: new Date('2024-06-01'),
        featured: true,
        tags: ['mongodb', 'atlas'],
        testType: 'complex_test' 
    },
    { 
        _id: 'test_complex_neg1', 
        status: 'draft', 
        publishDate: new Date('2024-06-01'),
        featured: true,
        testType: 'complex_test' 
    },
    { 
        _id: 'test_complex_neg2', 
        status: 'published', 
        publishDate: new Date('2023-06-01'),
        featured: true,
        testType: 'complex_test' 
    },
    { 
        _id: 'test_complex_neg3', 
        status: 'published', 
        publishDate: new Date('2024-06-01'),
        featured: false,
        priority: 'low',
        testType: 'complex_test' 
    },

    // ENHANCED DATA FOR SORT AND LIMIT TESTING
    // ==============================================
    
    // Sort test data - Products with varied prices (for price sorting)
    { _id: 'product_01', name: 'Laptop Pro', category: 'electronics', price: 1299.99, rating: 4.5, publishDate: new Date('2024-01-15'), status: 'active', testType: 'sort_test' },
    { _id: 'product_02', name: 'Wireless Mouse', category: 'electronics', price: 29.99, rating: 4.2, publishDate: new Date('2024-02-01'), status: 'active', testType: 'sort_test' },
    { _id: 'product_03', name: 'Gaming Keyboard', category: 'electronics', price: 89.99, rating: 4.7, publishDate: new Date('2024-01-20'), status: 'active', testType: 'sort_test' },
    { _id: 'product_04', name: 'Monitor 4K', category: 'electronics', price: 399.99, rating: 4.3, publishDate: new Date('2024-03-01'), status: 'active', testType: 'sort_test' },
    { _id: 'product_05', name: 'Webcam HD', category: 'electronics', price: 59.99, rating: 4.0, publishDate: new Date('2024-02-15'), status: 'active', testType: 'sort_test' },
    { _id: 'product_06', name: 'Tablet Mini', category: 'electronics', price: 249.99, rating: 4.4, publishDate: new Date('2024-01-10'), status: 'active', testType: 'sort_test' },
    { _id: 'product_07', name: 'Smartphone Plus', category: 'electronics', price: 799.99, rating: 4.6, publishDate: new Date('2024-02-20'), status: 'active', testType: 'sort_test' },
    { _id: 'product_08', name: 'Headphones Pro', category: 'electronics', price: 199.99, rating: 4.8, publishDate: new Date('2024-03-10'), status: 'active', testType: 'sort_test' },
    { _id: 'product_09', name: 'Smart Watch', category: 'electronics', price: 299.99, rating: 4.1, publishDate: new Date('2024-01-25'), status: 'active', testType: 'sort_test' },
    { _id: 'product_10', name: 'Bluetooth Speaker', category: 'electronics', price: 79.99, rating: 4.3, publishDate: new Date('2024-02-10'), status: 'active', testType: 'sort_test' },
    
    // Sort test data - Articles with different publish dates and scores
    { _id: 'article_01', title: 'Getting Started with MongoDB', category: 'tutorial', score: 95, publishDate: new Date('2024-01-05'), views: 1500, status: 'published', testType: 'sort_test' },
    { _id: 'article_02', title: 'Advanced Atlas Search', category: 'advanced', score: 88, publishDate: new Date('2024-02-12'), views: 850, status: 'published', testType: 'sort_test' },
    { _id: 'article_03', title: 'Database Design Patterns', category: 'design', score: 92, publishDate: new Date('2024-01-18'), views: 1200, status: 'published', testType: 'sort_test' },
    { _id: 'article_04', title: 'Performance Optimization', category: 'performance', score: 90, publishDate: new Date('2024-03-05'), views: 980, status: 'published', testType: 'sort_test' },
    { _id: 'article_05', title: 'Schema Validation', category: 'validation', score: 87, publishDate: new Date('2024-02-28'), views: 750, status: 'published', testType: 'sort_test' },
    { _id: 'article_06', title: 'Aggregation Pipelines', category: 'aggregation', score: 94, publishDate: new Date('2024-01-30'), views: 1350, status: 'published', testType: 'sort_test' },
    { _id: 'article_07', title: 'Indexing Strategies', category: 'indexing', score: 89, publishDate: new Date('2024-02-22'), views: 1100, status: 'published', testType: 'sort_test' },
    { _id: 'article_08', title: 'Data Modeling Best Practices', category: 'modeling', score: 93, publishDate: new Date('2024-01-12'), views: 1400, status: 'published', testType: 'sort_test' },
    
    // Sort test data - Users with different registration dates and scores
    { _id: 'user_01', username: 'alice_dev', registeredAt: new Date('2023-12-01'), lastActive: new Date('2024-03-15'), score: 850, level: 'expert', status: 'active', testType: 'sort_test' },
    { _id: 'user_02', username: 'bob_designer', registeredAt: new Date('2024-01-15'), lastActive: new Date('2024-03-14'), score: 720, level: 'intermediate', status: 'active', testType: 'sort_test' },
    { _id: 'user_03', username: 'charlie_newbie', registeredAt: new Date('2024-02-20'), lastActive: new Date('2024-03-13'), score: 300, level: 'beginner', status: 'active', testType: 'sort_test' },
    { _id: 'user_04', username: 'diana_admin', registeredAt: new Date('2023-11-10'), lastActive: new Date('2024-03-16'), score: 950, level: 'expert', status: 'active', testType: 'sort_test' },
    { _id: 'user_05', username: 'eve_consultant', registeredAt: new Date('2024-01-08'), lastActive: new Date('2024-03-12'), score: 680, level: 'intermediate', status: 'active', testType: 'sort_test' },
    
    // Limit test data - Ensure we have enough records to test pagination
    ...Array.from({ length: 25 }, (_, i) => ({
        _id: `limit_test_${String(i + 1).padStart(2, '0')}`,
        sequenceNumber: i + 1,
        batchId: Math.floor((i + 1) / 5) + 1, // Creates batches of 5
        category: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'][i % 5],
        priority: ['low', 'medium', 'high', 'urgent', 'critical'][i % 5],
        value: (i + 1) * 10,
        createdAt: new Date(`2024-03-${String((i % 28) + 1).padStart(2, '0')}`),
        status: 'active',
        testType: 'limit_test'
    })),
    
    // Mixed data for complex sort + limit testing
    { _id: 'mixed_01', name: 'Alpha Project', priority: 1, createdAt: new Date('2024-01-01'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_02', name: 'Beta Project', priority: 3, createdAt: new Date('2024-01-15'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_03', name: 'Gamma Project', priority: 2, createdAt: new Date('2024-02-01'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_04', name: 'Delta Project', priority: 1, createdAt: new Date('2024-02-15'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_05', name: 'Epsilon Project', priority: 3, createdAt: new Date('2024-03-01'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_06', name: 'Zeta Project', priority: 2, createdAt: new Date('2024-03-15'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_07', name: 'Eta Project', priority: 1, createdAt: new Date('2024-04-01'), status: 'active', testType: 'mixed_sort_limit' },
    { _id: 'mixed_08', name: 'Theta Project', priority: 2, createdAt: new Date('2024-04-15'), status: 'active', testType: 'mixed_sort_limit' }
];

async function setupTestData() {
    let client;
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        client = new MongoClient(config.connectionString);
        await client.connect();
        
        const db = client.db(config.database);
        const collection = db.collection(config.collection);
        
        console.log('✅ Connected to MongoDB');
        console.log(`Database: ${config.database}`);
        console.log(`Collection: ${config.collection}`);
        
        // Clear existing test data
        console.log('🧹 Clearing existing test data...');
        await collection.deleteMany({ testType: { $exists: true } });
        
        // Insert test documents
        console.log('📝 Inserting test documents...');
        const result = await collection.insertMany(testDocuments);
        
        console.log(`✅ Inserted ${result.insertedCount} test documents`);
        
        // Verify the data
        const count = await collection.countDocuments();
        console.log(`📊 Total documents in collection: ${count}`);
        
        // Show detailed breakdown of test data
        console.log('\n📋 Test Data Summary:');
        const sortTestCount = await collection.countDocuments({ testType: 'sort_test' });
        const limitTestCount = await collection.countDocuments({ testType: 'limit_test' });
        const mixedTestCount = await collection.countDocuments({ testType: 'mixed_sort_limit' });
        const originalTestCount = count - sortTestCount - limitTestCount - mixedTestCount;
        
        console.log(`   Original test documents: ${originalTestCount}`);
        console.log(`   Sort test documents: ${sortTestCount} (products, articles, users)`);
        console.log(`   Limit test documents: ${limitTestCount} (pagination test data)`);
        console.log(`   Mixed sort+limit documents: ${mixedTestCount} (complex scenarios)`);
        
        // Show sample documents from each category
        console.log('\n📋 Sample test documents:');
        
        // Original test samples
        const originalSamples = await collection.find({ testType: 'string_equality' }).toArray();
        originalSamples.forEach(doc => {
            console.log(`   ${doc._id}: ${JSON.stringify({ status: doc.status, testType: doc.testType })}`);
        });
        
        // Sort test samples
        const sortSamples = await collection.find({ testType: 'sort_test' }).limit(3).toArray();
        console.log('\n   Sort test samples:');
        sortSamples.forEach(doc => {
            const sampleFields = { _id: doc._id };
            if (doc.price) sampleFields.price = doc.price;
            if (doc.score) sampleFields.score = doc.score;
            if (doc.publishDate) sampleFields.publishDate = doc.publishDate.toISOString().split('T')[0];
            console.log(`   ${JSON.stringify(sampleFields)}`);
        });
        
        // Limit test samples  
        const limitSamples = await collection.find({ testType: 'limit_test' }).limit(3).toArray();
        console.log('\n   Limit test samples:');
        limitSamples.forEach(doc => {
            console.log(`   ${JSON.stringify({ _id: doc._id, sequenceNumber: doc.sequenceNumber, value: doc.value })}`);
        });
        
        console.log('\n🎯 Enhanced for sort and limit testing:');
        console.log('   • Products with varied prices (10 items, $29.99 - $1299.99)');
        console.log('   • Articles with different publish dates and scores (8 items)');
        console.log('   • Users with registration dates and score levels (5 items)');
        console.log('   • Pagination test data (25 sequential items)');
        console.log('   • Mixed priority and date combinations (8 items)');
        console.log('   • Multiple sortable fields: price, score, publishDate, createdAt, priority');
        console.log('   • Sufficient data volume for meaningful limit/skip testing');
        
        console.log('\n✅ Data is now optimal for testing:');
        console.log('   ✓ Sort operations (ascending/descending)');
        console.log('   ✓ Limit operations (various sizes)');
        console.log('   ✓ Skip operations (pagination)');
        console.log('   ✓ Multi-field sorting');
        console.log('   ✓ Sort + limit optimization');
        console.log('   ✓ Complex pipeline patterns');
        
        console.log('\n🎉 Test data setup complete!');
        console.log('\nNext steps:');
        console.log('1. Create Atlas Search index "testdocs_search" on this collection');
        console.log('2. Wait for index to sync (5-10 minutes)');
        console.log('3. Run tests:');
        console.log('   • npm run test              # Original MQL conversion tests');
        console.log('   • npm run test:pipeline     # New aggregation pipeline tests');
        console.log('   • npm run test:all          # All tests');
        console.log('4. Run demos:');
        console.log('   • npm run demo              # Basic demo');
        console.log('   • npm run demo:pipeline     # Pipeline optimization demo');
        
    } catch (error) {
        console.error('❌ Error setting up test data:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Disconnected from MongoDB');
        }
    }
}

// Run the setup
if (require.main === module) {
    setupTestData();
}

module.exports = { testDocuments, setupTestData };
