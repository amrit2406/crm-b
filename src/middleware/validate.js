const ApiResponse = require('../utils/apiResponse');

/**
 * Generic Zod Schema Validation Middleware
 * Supports Zod v3 (error.errors) and Zod v4 (error.issues)
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    // Zod v4 uses .issues, Zod v3 uses .errors
    const issues = error.issues || error.errors;
    if (issues && Array.isArray(issues)) {
      const formattedErrors = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message
      }));
      return ApiResponse.error(res, 400, 'Validation Error', formattedErrors);
    }
    next(error);
  }
};

module.exports = validate;
