/**
 * Standardized API Response structure helper
 */
class ApiResponse {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {any} data - Response payload
   * @param {Object|null} meta - Pagination or extra metadata
   */
  static success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const responseBody = {
      success: true,
      message,
      data
    };
    if (meta !== null) {
      responseBody.meta = meta;
    }
    return res.status(statusCode).json(responseBody);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {any} errors - Additional error details
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const responseBody = {
      success: false,
      message,
      ...(errors && { errors })
    };
    return res.status(statusCode).json(responseBody);
  }
}

module.exports = ApiResponse;
