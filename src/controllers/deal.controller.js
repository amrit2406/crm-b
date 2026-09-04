const DealService = require('../services/dealService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List deals with pipeline filtering, pagination, and RBAC scoping
 */
const listDeals = asyncHandler(async (req, res) => {
  const result = await DealService.listDeals(req.query, req.user);
  return ApiResponse.success(res, 200, 'Deals retrieved successfully', result.data, result.meta);
});

/**
 * Create deal directly for a customer
 */
const createDeal = asyncHandler(async (req, res) => {
  const deal = await DealService.createDeal(req.body, req.user);
  return ApiResponse.success(res, 201, 'Deal created successfully', deal);
});

/**
 * Get deal details by ID
 */
const getDealById = asyncHandler(async (req, res) => {
  const deal = await DealService.getDealById(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Deal retrieved successfully', deal);
});

/**
 * Update deal editable fields (title, value, expectedClosingDate, probability)
 */
const updateDeal = asyncHandler(async (req, res) => {
  const deal = await DealService.updateDeal(req.params.id, req.body, req.user);
  return ApiResponse.success(res, 200, 'Deal updated successfully', deal);
});

/**
 * Advance or transition deal stage
 */
const updateDealStage = asyncHandler(async (req, res) => {
  const { stage, lostReason, probability } = req.body;
  const deal = await DealService.updateDealStage(req.params.id, stage, req.user, lostReason, probability);
  return ApiResponse.success(res, 200, 'Deal stage updated successfully', deal);
});

/**
 * Get deal activity timeline events
 */
const getDealTimeline = asyncHandler(async (req, res) => {
  const timeline = await DealService.getDealTimeline(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Deal timeline retrieved successfully', timeline);
});

module.exports = {
  listDeals,
  createDeal,
  getDealById,
  updateDeal,
  updateDealStage,
  getDealTimeline
};
