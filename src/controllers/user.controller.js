const UserService = require('../services/userService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * List all users visible to the requesting user (scoped by role)
 */
const listUsers = asyncHandler(async (req, res) => {
  const result = await UserService.listUsers(req.query, req.user);
  return ApiResponse.success(res, 200, 'Users retrieved successfully', result.data, result.meta);
});

/**
 * Get a single user by ID
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.params.id, req.user);
  return ApiResponse.success(res, 200, 'User retrieved successfully', user);
});

/**
 * Get own profile (currently authenticated user)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await UserService.getMe(req.user.id);
  return ApiResponse.success(res, 200, 'Profile retrieved successfully', user);
});

module.exports = {
  listUsers,
  getUserById,
  getMe
};
