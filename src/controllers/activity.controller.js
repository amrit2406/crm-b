const ActivityService = require('../services/activityService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List activities with filters, overdue flag, date range, pagination, sorting
 */
const listActivities = asyncHandler(async (req, res) => {
  const result = await ActivityService.listActivities(req.query, req.user);
  return ApiResponse.success(res, 200, 'Activities retrieved successfully', result.data, result.meta);
});

/**
 * Create a new activity
 */
const createActivity = asyncHandler(async (req, res) => {
  const activity = await ActivityService.createActivity(req.body, req.user);
  return ApiResponse.success(res, 201, 'Activity created successfully', activity);
});

/**
 * Get single activity by ID
 */
const getActivityById = asyncHandler(async (req, res) => {
  const activity = await ActivityService.getActivityById(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'Activity retrieved successfully', activity);
});

/**
 * Update activity details
 */
const updateActivity = asyncHandler(async (req, res) => {
  const activity = await ActivityService.updateActivity(req.params.id, req.body, req.user);
  return ApiResponse.success(res, 200, 'Activity updated successfully', activity);
});

/**
 * Mark activity as completed
 */
const completeActivity = asyncHandler(async (req, res) => {
  const activity = await ActivityService.completeActivity(req.params.id, req.user, req.body.notes);
  return ApiResponse.success(res, 200, 'Activity marked as completed', activity);
});

module.exports = {
  listActivities,
  createActivity,
  getActivityById,
  updateActivity,
  completeActivity
};
