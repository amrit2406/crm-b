const DashboardService = require('../services/dashboardService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get overall CRM summary metrics & KPIs (scoped by user role)
 */
const getSummary = asyncHandler(async (req, res) => {
  const summary = await DashboardService.getSummary(req.user);
  return ApiResponse.success(res, 200, 'Dashboard summary retrieved successfully', summary);
});

/**
 * Get team performance metrics (Manager / Admin only)
 */
const getTeamPerformance = asyncHandler(async (req, res) => {
  const teamStats = await DashboardService.getTeamPerformance(req.user);
  return ApiResponse.success(res, 200, 'Team performance metrics retrieved successfully', teamStats);
});

module.exports = {
  getSummary,
  getTeamPerformance
};
