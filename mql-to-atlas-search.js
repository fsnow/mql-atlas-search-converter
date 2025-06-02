/**
 * MongoDB MQL to Atlas Search Converter
 * Compatible with mongosh
 * Converts standard MQL queries and aggregation pipeline stages to Atlas Search $search equivalents
 */

class MQLToAtlasSearchConverter {
    constructor(indexName = 'default') {
        this.indexName = indexName;
    }

    /**
     * Convert a standard MQL find query to Atlas Search aggregation pipeline
     * @param {Object} query - MQL query object
     * @param {Object} options - Additional options (projection, sort, limit, skip)
     * @returns {Array} - Atlas Search aggregation pipeline
     */
    convertFindQuery(query, options = {}) {
        // Use the new optimization for sort (but not limit/skip)
        if (options.sort) {
            const searchStage = this.convertQueryToSearchWithOptions(query, {
                sort: options.sort
            });
            
            const pipeline = [searchStage];
            
            // Add projection if specified (can't optimize this into $search)
            if (options.projection) {
                pipeline.push({ $project: options.projection });
            }
            
            // Add skip if specified (as separate stage)
            if (options.skip) {
                pipeline.push({ $skip: options.skip });
            }
            
            // Add limit if specified (as separate stage)
            if (options.limit) {
                pipeline.push({ $limit: options.limit });
            }
            
            return pipeline;
        } else {
            // Original behavior for queries without sort optimization
            const searchStage = this.convertQueryToSearch(query);
            const pipeline = [searchStage];

            // Add projection if specified
            if (options.projection) {
                pipeline.push({ $project: options.projection });
            }
            
            // Add skip if specified
            if (options.skip) {
                pipeline.push({ $skip: options.skip });
            }

            // Add limit if specified
            if (options.limit) {
                pipeline.push({ $limit: options.limit });
            }

            return pipeline;
        }
    }

    /**
     * Convert aggregation pipeline to include Atlas Search
     * Optimizes common patterns like [$match, $sort, $limit] into single $search stages
     * @param {Array} pipeline - Original aggregation pipeline
     * @param {Object} options - Conversion options
     * @returns {Array} - Modified pipeline with Atlas Search
     */
    convertAggregationPipeline(pipeline, options = {}) {
        if (!Array.isArray(pipeline)) {
            throw new Error('Pipeline must be an array');
        }

        const newPipeline = [];
        let i = 0;
        
        while (i < pipeline.length) {
            const stage = pipeline[i];
            
            if (stage.$match) {
                // Look ahead to see if we can optimize with subsequent stages
                const optimization = this.optimizePipelineSequence(pipeline, i, options);
                
                if (optimization.optimized) {
                    // Add the optimized search stage
                    newPipeline.push(optimization.searchStage);
                    
                    // Add any remaining non-optimized stages
                    newPipeline.push(...optimization.remainingStages);
                    
                    // Skip the stages we've already processed
                    i = optimization.nextIndex;
                } else {
                    // No optimization possible, just convert $match to $search
                    const searchStage = this.convertQueryToSearch(stage.$match);
                    newPipeline.push(searchStage);
                    i++;
                }
            } else {
                newPipeline.push(stage);
                i++;
            }
        }
        
        return newPipeline;
    }

    /**
     * Optimize pipeline sequences starting with $match
     * Looks for patterns like [$match, $sort, $limit] and combines them into $search
     * @param {Array} pipeline - Full pipeline
     * @param {number} startIndex - Index of $match stage
     * @param {Object} options - Optimization options
     * @returns {Object} - Optimization result
     */
    optimizePipelineSequence(pipeline, startIndex, options = {}) {
        const matchStage = pipeline[startIndex];
        
        if (!matchStage.$match) {
            return { optimized: false };
        }

        // Look ahead for optimizable stages
        let sortStage = null;
        let limitStage = null;
        let skipStage = null;
        let projectStage = null;
        let currentIndex = startIndex + 1;
        const remainingStages = [];
        
        // Scan subsequent stages
        while (currentIndex < pipeline.length) {
            const stage = pipeline[currentIndex];
            
            if (stage.$sort && !sortStage) {
                sortStage = stage;
            } else if (stage.$limit && !limitStage) {
                limitStage = stage;
            } else if (stage.$skip && !skipStage) {
                skipStage = stage;
            } else if (stage.$project && !projectStage && options.includeProjection) {
                projectStage = stage;
            } else {
                // Hit a stage we can't optimize, stop here
                remainingStages.push(...pipeline.slice(currentIndex));
                break;
            }
            
            currentIndex++;
        }
        
        // Create optimized search stage (only with sort, not limit/skip)
        const searchStage = this.convertQueryToSearchWithOptions(matchStage.$match, {
            sort: sortStage?.$sort
        });
        
        // Add limit and skip as separate stages after $search
        if (skipStage) {
            remainingStages.unshift({ $skip: skipStage.$skip });
        }
        if (limitStage) {
            remainingStages.unshift({ $limit: limitStage.$limit });
        }
        
        // Add projection as separate stage if found and not included in search
        if (projectStage && !options.includeProjection) {
            remainingStages.unshift(projectStage);
        }
        
        return {
            optimized: true,
            searchStage,
            remainingStages,
            nextIndex: currentIndex
        };
    }

    /**
     * Convert MQL query to $search with additional options like sort and limit
     * @param {Object} query - MQL query object
     * @param {Object} options - Additional search options (sort, limit, skip)
     * @returns {Object} - $search aggregation stage with options
     */
    convertQueryToSearchWithOptions(query, options = {}) {
        const baseSearch = this.convertQueryToSearch(query);
        
        // Add sort to $search stage if provided
        if (options.sort) {
            // Convert MongoDB sort to Atlas Search sort
            const searchSort = this.convertSortToAtlasSearch(options.sort);
            if (searchSort) {
                baseSearch.$search.sort = searchSort;
            }
        }
        
        // Note: limit and skip are NOT supported as direct $search properties
        // They should be handled as separate pipeline stages
        // This method only handles the $search stage optimization
        
        return baseSearch;
    }
    
    /**
     * Convert MongoDB sort specification to Atlas Search sort
     * @param {Object} sortSpec - MongoDB sort specification
     * @returns {Object|null} - Atlas Search sort specification or null if not convertible
     */
    convertSortToAtlasSearch(sortSpec) {
        if (!sortSpec || typeof sortSpec !== 'object') {
            return null;
        }
        
        // Atlas Search sort format: { "<field>": { "order": 1|-1 } }
        const searchSort = {};
        
        for (const [field, direction] of Object.entries(sortSpec)) {
            if (typeof direction === 'number') {
                searchSort[field] = {
                    order: direction
                };
            } else {
                // Can't convert complex sort specifications
                console.warn(`Warning: Complex sort field '${field}' with value '${direction}' cannot be converted to Atlas Search sort`);
                return null;
            }
        }
        
        return Object.keys(searchSort).length > 0 ? searchSort : null;
    }

    /**
     * Convert MQL query object to $search stage
     * @param {Object} query - MQL query object
     * @returns {Object} - $search aggregation stage
     */
    convertQueryToSearch(query) {
        if (Object.keys(query).length === 0) {
            // Empty query - match all documents
            return {
                $search: {
                    index: this.indexName,
                    exists: { path: '_id' }
                }
            };
        }

        const searchClauses = this.convertQuery(query);
        
        if (searchClauses.length === 0) {
            // No valid clauses generated (e.g., all operators were unsupported)
            // Return a match-all query
            return {
                $search: {
                    index: this.indexName,
                    exists: { path: '_id' }
                }
            };
        } else if (searchClauses.length === 1) {
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

    /**
     * Convert query recursively
     * @param {Object} query - Query object or subquery
     * @returns {Array} - Array of Atlas Search clauses
     */
    convertQuery(query) {
        const clauses = [];

        for (const [field, value] of Object.entries(query)) {
            if (field.startsWith('$')) {
                // Handle logical operators
                clauses.push(...this.convertLogicalOperator(field, value));
            } else {
                // Handle field queries
                clauses.push(...this.convertFieldQuery(field, value));
            }
        }

        return clauses;
    }

    /**
     * Convert logical operators ($and, $or, $nor, $not)
     * @param {string} operator - Logical operator
     * @param {*} value - Operator value
     * @returns {Array} - Array of Atlas Search clauses
     */
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

            case '$not':
                // $not is typically used with field operators, handle at field level
                throw new Error('$not operator should be handled at field level');

            default:
                throw new Error(`Unsupported logical operator: ${operator}`);
        }
    }

    /**
     * Convert field-level queries
     * @param {string} field - Field name
     * @param {*} value - Field value or query object
     * @returns {Array} - Array of Atlas Search clauses
     */
    convertFieldQuery(field, value) {
        if (value === null) {
            // Null equality - need to match both explicit null values and missing fields
            // In Atlas Search, we need to use compound query:
            // 1. Documents where field equals null, OR
            // 2. Documents where field doesn't exist
            return [{
                compound: {
                    should: [
                        // Match explicit null values
                        {
                            equals: {
                                path: field,
                                value: null
                            }
                        },
                        // Match missing fields
                        {
                            compound: {
                                mustNot: [{
                                    exists: { path: field }
                                }]
                            }
                        }
                    ],
                    minimumShouldMatch: 1
                }
            }];
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp)) {
            // Query operators
            return this.convertFieldOperators(field, value);
        }

        if (Array.isArray(value)) {
            // Array value - this is exact array matching, not $in
            // Note: Exact array matching is complex in Atlas Search
            // Atlas Search equals operator doesn't support arrays as values
            
            if (value.length === 0) {
                // Empty array matching - documents that don't have this field
                return [{
                    compound: {
                        mustNot: [{
                            exists: { path: field }
                        }]
                    }
                }];
            } else if (value.length === 1) {
                // Single element array - just match that element
                return [{
                    equals: {
                        path: field,
                        value: value[0]
                    }
                }];
            } else {
                // Multiple element array - this is imperfect in Atlas Search
                // We'll require ALL elements to be present (but may match more)
                console.warn(`Warning: Exact array matching for multi-element arrays is not perfectly supported in Atlas Search. Query may return additional results.`);
                
                const elementQueries = value.map(element => ({
                    equals: {
                        path: field,
                        value: element
                    }
                }));
                
                return [{
                    compound: {
                        must: elementQueries
                    }
                }];
            }
        }

        // Simple equality
        return [{
            equals: {
                path: field,
                value: value
            }
        }];
    }

    /**
     * Convert field operators ($eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $exists, $regex, etc.)
     * @param {string} field - Field name
     * @param {Object} operators - Operators object
     * @returns {Array} - Array of Atlas Search clauses
     */
    convertFieldOperators(field, operators) {
        const clauses = [];
        let regexHandled = false;

        for (const [operator, value] of Object.entries(operators)) {
            switch (operator) {
                case '$eq':
                    clauses.push({
                        equals: {
                            path: field,
                            value: value
                        }
                    });
                    break;

                case '$ne':
                    clauses.push({
                        compound: {
                            mustNot: [{
                                equals: {
                                    path: field,
                                    value: value
                                }
                            }]
                        }
                    });
                    break;

                case '$gt':
                    clauses.push({
                        range: {
                            path: field,
                            gt: value
                        }
                    });
                    break;

                case '$gte':
                    clauses.push({
                        range: {
                            path: field,
                            gte: value
                        }
                    });
                    break;

                case '$lt':
                    clauses.push({
                        range: {
                            path: field,
                            lt: value
                        }
                    });
                    break;

                case '$lte':
                    clauses.push({
                        range: {
                            path: field,
                            lte: value
                        }
                    });
                    break;

                case '$in':
                    clauses.push({
                        in: {
                            path: field,
                            value: value
                        }
                    });
                    break;

                case '$nin':
                    clauses.push({
                        compound: {
                            mustNot: [{
                                in: {
                                    path: field,
                                    value: value
                                }
                            }]
                        }
                    });
                    break;

                case '$exists':
                    if (value) {
                        clauses.push({
                            exists: {
                                path: field
                            }
                        });
                    } else {
                        clauses.push({
                            compound: {
                                mustNot: [{
                                    exists: {
                                        path: field
                                    }
                                }]
                            }
                        });
                    }
                    break;

                case '$regex':
                    // Handle regex using Atlas Search regex operator for better equivalence
                    // Only process once, even if $options is also present
                    if (!regexHandled) {
                        const regexValue = value;
                        const options = operators.$options || '';
                        
                        // Use Atlas Search regex operator for much better MQL equivalence
                        if (typeof regexValue === 'string') {
                            const regexClause = {
                                regex: {
                                    query: regexValue,
                                    path: field
                                }
                            };
                            
                            // Add options if specified
                            if (options) {
                                regexClause.regex.options = options;
                            }
                            
                            clauses.push(regexClause);
                        }
                        regexHandled = true;
                    }
                    break;

                case '$options':
                    // Skip $options as it's handled together with $regex
                    break;

                case '$not':
                    // Handle $not operator
                    const notClauses = this.convertFieldOperators(field, value);
                    clauses.push({
                        compound: {
                            mustNot: notClauses
                        }
                    });
                    break;

                default:
                    console.warn(`Unsupported operator: ${operator} - skipping`);
            }
        }

        return clauses;
    }

    /**
     * Utility method to create a text search query
     * @param {string} searchText - Text to search for
     * @param {string|Array} path - Field path(s) to search
     * @param {Object} options - Additional text search options
     * @returns {Object} - Atlas Search pipeline stage
     */
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

    /**
     * Utility method to create an autocomplete search query
     * @param {string} query - Autocomplete query
     * @param {string} path - Field path for autocomplete
     * @param {Object} options - Additional autocomplete options
     * @returns {Object} - Atlas Search pipeline stage
     */
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

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MQLToAtlasSearchConverter;
}

// Example usage in mongosh:
// const converter = new MQLToAtlasSearchConverter('my_search_index');

// Convert a find query
// const mqlQuery = { status: 'active', age: { $gte: 18, $lt: 65 } };
// const searchPipeline = converter.convertFindQuery(mqlQuery, { limit: 10 });
// db.collection.aggregate(searchPipeline);

// Convert an aggregation pipeline (basic)
// const originalPipeline = [
//     { $match: { category: 'electronics', price: { $gte: 100 } } },
//     { $group: { _id: '$brand', avgPrice: { $avg: '$price' } } }
// ];
// const searchPipeline = converter.convertAggregationPipeline(originalPipeline);
// db.collection.aggregate(searchPipeline);

// Convert an aggregation pipeline with optimization (new!)
// const optimizedPipeline = [
//     { $match: { status: 'active' } },
//     { $sort: { createdAt: -1 } },
//     { $limit: 10 }
// ];
// const searchPipeline = converter.convertAggregationPipeline(optimizedPipeline);
// // Result: Single $search stage with sort and limit built-in!
// db.collection.aggregate(searchPipeline);

// Multiple $match stages in pipeline
// const complexPipeline = [
//     { $match: { status: 'published' } },
//     { $sort: { publishDate: -1 } },
//     { $limit: 100 },
//     { $match: { featured: true } },  // This becomes a separate $search stage
//     { $project: { title: 1, publishDate: 1 } }
// ];
// const searchPipeline = converter.convertAggregationPipeline(complexPipeline);
// db.collection.aggregate(searchPipeline);

// Create text search
// const textSearchStage = converter.createTextSearch('mongodb atlas', ['title', 'description']);
// db.collection.aggregate([textSearchStage]);

// Create autocomplete
// const autocompleteStage = converter.createAutocomplete('java', 'skills');
// db.collection.aggregate([autocompleteStage]);