const mongoose = require('mongoose');

/**
 * Safe filter query builder for Mongoose
 * @param {Object} reqQuery - Raw Express req.query
 * @param {Array<string>} allowedFilters - List of allowed filter keys (e.g., ['status', 'priority', 'source', 'assignedTo'])
 * @returns {Object} Mongo query filter object
 */
const buildFilterQuery = (reqQuery = {}, allowedFilters = []) => {
  const filter = {};

  allowedFilters.forEach((key) => {
    if (reqQuery[key] !== undefined && reqQuery[key] !== null && reqQuery[key] !== '') {
      const val = reqQuery[key];
      // Prevent operator injection if val is an object
      if (typeof val === 'string' || typeof val === 'boolean' || typeof val === 'number') {
        if (key === 'assignedTo' && mongoose.Types.ObjectId.isValid(val)) {
          filter[key] = new mongoose.Types.ObjectId(val);
        } else {
          filter[key] = val;
        }
      }
    }
  });

  // Date range filtering on createdAt
  if (reqQuery.from || reqQuery.to) {
    filter.createdAt = {};
    if (reqQuery.from) {
      const fromDate = new Date(reqQuery.from);
      if (!isNaN(fromDate.getTime())) {
        filter.createdAt.$gte = fromDate;
      }
    }
    if (reqQuery.to) {
      const toDate = new Date(reqQuery.to);
      if (!isNaN(toDate.getTime())) {
        filter.createdAt.$lte = toDate;
      }
    }
  }

  // Text search query
  if (reqQuery.search && typeof reqQuery.search === 'string' && reqQuery.search.trim() !== '') {
    const searchRegex = new RegExp(reqQuery.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { company: searchRegex }
    ];
  }

  return filter;
};

/**
 * Get sanitized pagination parameters
 * @param {Object} reqQuery 
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPaginationParams = (reqQuery = {}) => {
  let page = parseInt(reqQuery.page, 10);
  let limit = parseInt(reqQuery.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build safe Mongoose sort object
 * @param {Object} reqQuery 
 * @param {Array<string>} allowedFields 
 * @returns {Object}
 */
const buildSort = (reqQuery = {}, allowedFields = ['createdAt', 'updatedAt', 'name', 'priority', 'status']) => {
  const sortParam = reqQuery.sort;
  if (!sortParam || typeof sortParam !== 'string') {
    return { createdAt: -1 }; // Default sort
  }

  let field = sortParam;
  let order = 1;

  if (sortParam.startsWith('-')) {
    field = sortParam.substring(1);
    order = -1;
  }

  if (allowedFields.includes(field)) {
    return { [field]: order };
  }

  return { createdAt: -1 };
};

module.exports = {
  buildFilterQuery,
  getPaginationParams,
  buildSort
};
