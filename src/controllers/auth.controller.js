const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * Register a new user (Admin only)
 */
const register = asyncHandler(async (req, res) => {
  const user = await AuthService.register(req.body);
  return ApiResponse.success(res, 201, 'User registered successfully', user);
});

/**
 * Log in user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);

  // Set httpOnly refresh cookie
  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

  return ApiResponse.success(res, 200, 'Login successful', {
    accessToken: result.accessToken,
    user: result.user
  });
});

/**
 * Refresh Access Token using Refresh Cookie
 */
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const result = await AuthService.refreshAccessToken(refreshToken);

  return ApiResponse.success(res, 200, 'Access token refreshed successfully', {
    accessToken: result.accessToken,
    user: result.user
  });
});

/**
 * Logout User (Clear refresh cookie)
 */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  await AuthService.logout();

  return ApiResponse.success(res, 200, 'Logout successful');
});

const UserService = require('../services/userService');

/**
 * Get own profile (authenticated user)
 */
const me = asyncHandler(async (req, res) => {
  const user = await UserService.getMe(req.user.id);
  return ApiResponse.success(res, 200, 'Profile retrieved successfully', user);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me
};
