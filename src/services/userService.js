const User = require('../models/User');
const AppError = require('../utils/AppError');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const { getPaginationParams, buildSort } = require('../utils/pagination');

class UserService {
  /**
   * List assignable users scoped by the requesting user's role:
   * - admin: all active users
   * - sales_manager: themselves + their team members (managerId = self)
   * - sales_executive: only themselves
   * @param {Object} reqQuery
   * @param {Object} user
   */
  static async listUsers(reqQuery, user) {
    let filter = { isActive: true };

    if (user.role === 'sales_manager') {
      // Manager can see themselves + their team
      filter.$or = [
        { _id: user.id },
        { managerId: user.id }
      ];
    } else if (user.role === 'sales_executive') {
      // Executive can only see themselves
      filter._id = user.id;
    }
    // admin → no extra filter, sees all

    // Optional role filter from query
    if (reqQuery.role) {
      filter.role = reqQuery.role;
    }

    const { page, limit, skip } = getPaginationParams(reqQuery);
    const sort = buildSort(reqQuery, ['name', 'email', 'role', 'createdAt']);

    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('managerId', 'name email role')
        .lean(),
      User.countDocuments(filter)
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single user by ID
   * Admins can see anyone; managers can see team; executives can only see self
   * @param {string} id
   * @param {Object} user
   */
  static async getUserById(id, user) {
    const targetUser = await User.findById(id)
      .select('-passwordHash')
      .populate('managerId', 'name email role');

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Ownership / scope check
    if (user.role === 'sales_executive' && targetUser._id.toString() !== user.id) {
      throw new AppError('Access denied: You can only view your own profile', 403);
    }

    if (user.role === 'sales_manager') {
      const isOwnProfile = targetUser._id.toString() === user.id;
      const isTeamMember = targetUser.managerId && targetUser.managerId._id
        ? targetUser.managerId._id.toString() === user.id
        : targetUser.managerId?.toString() === user.id;

      if (!isOwnProfile && !isTeamMember) {
        throw new AppError('Access denied: User is not on your team', 403);
      }
    }

    return targetUser;
  }

  /**
   * Get currently authenticated user's profile
   * @param {string} userId
   */
  static async getMe(userId) {
    const user = await User.findById(userId)
      .select('-passwordHash')
      .populate('managerId', 'name email role');

    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }
}

module.exports = UserService;
