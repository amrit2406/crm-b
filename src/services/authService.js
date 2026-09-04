const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');

class AuthService {
  /**
   * Register a new user (for admin use)
   * @param {Object} userData 
   */
  static async register(userData) {
    const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const user = new User({
      name: userData.name,
      email: userData.email,
      passwordHash: userData.password,
      role: userData.role || 'sales_executive',
      managerId: userData.managerId || null
    });

    await user.save();

    const userObj = user.toObject();
    delete userObj.passwordHash;
    return userObj;
  }

  /**
   * Log in user and generate access & refresh tokens
   * @param {string} email 
   * @param {string} password 
   */
  static async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact an administrator.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const payload = { id: user._id.toString(), role: user.role };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return {
      user: userObj,
      accessToken,
      refreshToken
    };
  }

  /**
   * Verify refresh token and issue a new access token
   * @param {string} refreshToken 
   */
  static async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new AppError('User not found or account deactivated', 401);
    }

    const payload = { id: user._id.toString(), role: user.role };
    const newAccessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return {
      accessToken: newAccessToken,
      user: userObj
    };
  }

  /**
   * Logout user (stateless token clearing helper)
   */
  static async logout() {
    return { success: true };
  }
}

module.exports = AuthService;
