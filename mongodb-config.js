// Create a configuration file for MongoDB connection
module.exports = {
    // MongoDB connection string - reads from environment variable or falls back to local
    connectionString: process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI || 'mongodb://localhost:27017',
    
    // Database and collection names
    database: process.env.MONGODB_DATABASE || 'srchtest',
    collection: process.env.MONGODB_COLLECTION || 'testdocs',
    
    // Atlas Search index name
    searchIndex: process.env.ATLAS_SEARCH_INDEX || 'testdocs_search',
};
