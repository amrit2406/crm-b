const CustomerService = require('../services/customerService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List customers with filtering, search, pagination, and RBAC scoping
 */
const listCustomers = asyncHandler(async (req, res) => {
  const result = await CustomerService.listCustomers(req.query, req.user);
  return ApiResponse.success(res, 200, 'Customers retrieved successfully', result.data, result.meta);
});

/**
 * Get customer details by ID including original lead lineage and associated deals
 */
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await CustomerService.getCustomerById(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Customer retrieved successfully', customer);
});

/**
 * Get customer activity timeline events
 */
const getCustomerTimeline = asyncHandler(async (req, res) => {
  const timeline = await CustomerService.getCustomerTimeline(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Customer timeline retrieved successfully', timeline);
});

module.exports = {
  listCustomers,
  getCustomerById,
  getCustomerTimeline
};
