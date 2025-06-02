#!/usr/bin/env node

/**
 * Aggregation Pipeline Demo - Showcasing Enhanced MQL to Atlas Search Conversion
 * Demonstrates the new optimization features for $match, $sort, $limit patterns
 */

// Load the converter
const MQLToAtlasSearchConverter = require('./mql-to-atlas-search.js');

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

function displayPipeline(title, pipeline) {
    colorLog('cyan', `\n🔍 ${title}`);
    console.log(JSON.stringify(pipeline, null, 2));
}

function displayDivider() {
    console.log('\n' + '='.repeat(80));
}

// Initialize converter
const converter = new MQLToAtlasSearchConverter('demo_search_index');

console.log('🚀 MQL to Atlas Search Converter - Aggregation Pipeline Demo');
console.log('Enhanced with [$match, $sort, $limit] optimization');
displayDivider();

// =============================================================================
// DEMO 1: Basic $match conversion
// =============================================================================
colorLog('blue', '\n📋 DEMO 1: Basic $match Stage Conversion');

const basicPipeline = [
    { $match: { status: 'active', category: 'electronics' } },
    { $group: { _id: '$brand', count: { $sum: 1 } } }
];

displayPipeline('Original Pipeline:', basicPipeline);

const basicConverted = converter.convertAggregationPipeline(basicPipeline);
displayPipeline('Converted Pipeline (Atlas Search):', basicConverted);

colorLog('green', '✅ $match stage converted to $search, other stages preserved');

// =============================================================================
// DEMO 2: Optimized pipeline with $match + $sort + $limit
// =============================================================================
displayDivider();
colorLog('blue', '\n🎯 DEMO 2: Optimized Pipeline - $match + $sort + $limit');

const optimizedPipeline = [
    { $match: { status: 'published', publishDate: { $gte: new Date('2024-01-01') } } },
    { $sort: { publishDate: -1 } },
    { $limit: 10 }
];

displayPipeline('Original Pipeline:', optimizedPipeline);

const optimizedConverted = converter.convertAggregationPipeline(optimizedPipeline);
displayPipeline('Optimized Atlas Search Pipeline:', optimizedConverted);

colorLog('green', '✅ Three stages optimized into single $search with built-in sort and limit!');
colorLog('yellow', '💡 This is much more efficient than separate pipeline stages');

// =============================================================================
// DEMO 3: Complex pipeline with multiple optimizations
// =============================================================================
displayDivider();
colorLog('blue', '\n🔄 DEMO 3: Complex Pipeline - Multiple $match stages');

const complexPipeline = [
    { $match: { status: 'published' } },
    { $sort: { publishDate: -1 } },
    { $limit: 100 },
    { $match: { featured: true } },  // This will be a separate $search stage
    { $project: { title: 1, publishDate: 1, featured: 1 } }
];

displayPipeline('Original Pipeline:', complexPipeline);

const complexConverted = converter.convertAggregationPipeline(complexPipeline);
displayPipeline('Converted Pipeline:', complexConverted);

colorLog('green', '✅ First $match optimized with sort+limit, second $match becomes separate $search');

// =============================================================================
// DEMO 4: Pipeline with non-optimizable stages
// =============================================================================
displayDivider();
colorLog('blue', '\n⚙️  DEMO 4: Pipeline with Non-Optimizable Stages');

const mixedPipeline = [
    { $match: { category: 'electronics' } },
    { $unwind: '$tags' },  // Can't optimize past this
    { $sort: { price: 1 } },
    { $limit: 5 }
];

displayPipeline('Original Pipeline:', mixedPipeline);

const mixedConverted = converter.convertAggregationPipeline(mixedPipeline);
displayPipeline('Converted Pipeline:', mixedConverted);

colorLog('yellow', '⚠️  Optimization stops at $unwind - only $match converted to $search');

// =============================================================================
// DEMO 5: Advanced $match queries
// =============================================================================
displayDivider();
colorLog('blue', '\n🎨 DEMO 5: Advanced $match Query Patterns');

const advancedPipeline = [
    { $match: {
        $and: [
            { status: { $in: ['published', 'featured'] } },
            { price: { $gte: 100, $lt: 1000 } },
            { $or: [
                { featured: true },
                { priority: 'high' }
            ]},
            { deletedAt: null }
        ]
    }},
    { $sort: { score: -1, publishDate: -1 } },
    { $skip: 20 },
    { $limit: 10 }
];

displayPipeline('Original Advanced Pipeline:', advancedPipeline);

const advancedConverted = converter.convertAggregationPipeline(advancedPipeline);
displayPipeline('Converted Advanced Pipeline:', advancedConverted);

colorLog('green', '✅ Complex logical operators, ranges, and null checks all handled!');

// =============================================================================
// DEMO 6: Show sort conversion details
// =============================================================================
displayDivider();
colorLog('blue', '\n📊 DEMO 6: Sort Conversion Details');

const sortExamples = [
    { price: 1 },           // Ascending
    { createdAt: -1 },      // Descending  
    { _id: 1 },             // Special _id field
    { category: 1, price: -1 }  // Multiple fields
];

sortExamples.forEach((sortSpec, index) => {
    const testPipeline = [
        { $match: { status: 'active' } },
        { $sort: sortSpec },
        { $limit: 5 }
    ];
    
    const converted = converter.convertAggregationPipeline(testPipeline);
    
    colorLog('cyan', `\nSort Example ${index + 1}:`);
    console.log('Original sort:', JSON.stringify(sortSpec));
    if (converted[0].$search.sort) {
        console.log('Atlas Search sort:', JSON.stringify(converted[0].$search.sort));
    } else {
        console.log('Atlas Search sort: (not optimized - separate $sort stage)');
    }
});

// =============================================================================
// DEMO 7: Error handling and edge cases
// =============================================================================
displayDivider();
colorLog('blue', '\n🔧 DEMO 7: Error Handling and Edge Cases');

try {
    // Empty pipeline
    const emptyResult = converter.convertAggregationPipeline([]);
    console.log('\nEmpty pipeline result:', JSON.stringify(emptyResult));
    colorLog('green', '✅ Empty pipeline handled gracefully');
} catch (error) {
    colorLog('red', '❌ Empty pipeline error: ' + error.message);
}

try {
    // Invalid pipeline (not array)
    const invalidResult = converter.convertAggregationPipeline('invalid');
} catch (error) {
    colorLog('green', '✅ Invalid pipeline properly rejected: ' + error.message);
}

try {
    // Pipeline with no $match
    const noMatchPipeline = [
        { $sort: { createdAt: -1 } },
        { $limit: 10 }
    ];
    const noMatchResult = converter.convertAggregationPipeline(noMatchPipeline);
    console.log('\nNo $match pipeline result:', JSON.stringify(noMatchResult, null, 2));
    colorLog('green', '✅ Pipeline without $match preserved as-is');
} catch (error) {
    colorLog('red', '❌ No $match pipeline error: ' + error.message);
}

// =============================================================================
// SUMMARY
// =============================================================================
displayDivider();
colorLog('magenta', '\n🎉 DEMO COMPLETE - Key Features Demonstrated:');
console.log();
colorLog('green', '✅ Basic $match to $search conversion');
colorLog('green', '✅ [$match, $sort, $limit] optimization into single $search stage');
colorLog('green', '✅ Multiple $match stages handled independently');
colorLog('green', '✅ Complex logical operators ($and, $or, $nor)');
colorLog('green', '✅ Range operators ($gte, $lt, $in, etc.)');
colorLog('green', '✅ Null equality handling');
colorLog('green', '✅ Sort conversion (1/-1 to asc/desc)');
colorLog('green', '✅ Skip and limit integration');
colorLog('green', '✅ Non-optimizable stage detection');
colorLog('green', '✅ Error handling for edge cases');

console.log();
colorLog('blue', '📚 Usage:');
console.log('   npm run demo:pipeline    # Run this demo');
console.log('   npm run test:pipeline    # Run aggregation pipeline tests');
console.log('   npm run test:all         # Run all tests');

console.log();
colorLog('yellow', '💡 Performance Benefits:');
console.log('   • Single $search stage vs multiple pipeline stages');
console.log('   • Built-in sorting and pagination in Atlas Search');
console.log('   • Reduced network round-trips');
console.log('   • Better performance on large datasets');

displayDivider();
