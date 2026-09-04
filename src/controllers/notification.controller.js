const NotificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List notifications for logged in user
 */
const listNotifications = asyncHandler(async (req, res) => {
  const result = await NotificationService.listForUser(req.user.id, req.query);
  return ApiResponse.success(res, 200, 'Notifications retrieved successfully', result.data, result.meta);
});

/**
 * Mark a single notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
  return ApiResponse.success(res, 200, 'Notification marked as read', notification);
});

/**
 * Mark all notifications for logged in user as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await NotificationService.markAllAsRead(req.user.id);
  return ApiResponse.success(res, 200, 'All notifications marked as read', result);
});

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};
